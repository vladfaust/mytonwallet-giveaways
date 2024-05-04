import { Job } from "bullmq";
import { SendMode, fromNano, internal } from "ton";
import { GIVEAWAY_LINK_TEMPLATE } from "../env.js";
import { sequelize } from "../lib/sequelize.js";
import {
  addressFromRawBuffer,
  contract,
  keyPair,
  wrapTonClientRequest,
} from "../lib/ton.js";
import { Giveaway } from "../models/giveaway.js";
import { Participant } from "../models/participant.js";
import { countParticipants } from "../web/routes/giveaways/_common.js";

/**
 * From the specification (_wording_):
 *
 * > Every 5 seconds, it is necessary to check participants with status
 * > `"awaitingPayment"`, make payments to their addresses,
 * > and update status to `"paid"`. The `TON_MAIN_ADDRESS_MNEMONICS`
 * > environment variable is used for signing transactions.
 *
 * SAFETY: It is not possible to make simultaneous database updates
 * and blockchain transactions, therefore we'd have to choose one
 * of the following: either to allow false-positive payouts (payed out in DB,
 * but not in real world), or to allow duplicate payouts.
 * The former is more acceptable for business reasons.
 *
 * SAFETY: This job can be run concurrently due to row-level participant locking.
 */
// TODO: Arbitrary token payouts, not only TON.
export class Payout extends Job {
  static async perform(job: Payout) {
    // Output logs to both the job and the console.
    function log(args: any) {
      job.log(args);
      console.log(args);
    }

    let participants: Participant[] = [];
    do {
      await sequelize.transaction(async (transaction) => {
        participants = await Participant.findAll({
          where: { status: "awaitingPayment" },
          limit: 10,
          lock: true,
          skipLocked: true,
          transaction,
        });

        if (!participants.length) {
          return;
        }

        log(`Found ${participants.length} participants awaiting payment.`);

        // NOTE: Can not lock for update with joins,
        // so giveaways shall be fetched separately.
        //
        const giveaways = await Giveaway.findAll({
          where: { id: participants.map((p) => p.giveawayId) },
          attributes: ["id", "amount", "tokenAddress", "receiverCount"],
          transaction,
        });

        function findParticipantGiveaway(participant: Participant): Giveaway {
          return giveaways.find(
            (giveaway) => giveaway.id === participant.giveawayId,
          )!;
        }

        // 1. Make blockchain transfers.
        //

        const seqno = await wrapTonClientRequest(
          () => contract.getSeqno(),
          log,
        );

        const transfer = contract.createTransfer({
          seqno,
          secretKey: keyPair.secretKey,
          sendMode: SendMode.PAY_GAS_SEPARATELY,
          messages: participants.map((participant) =>
            internal({
              to: addressFromRawBuffer(participant.receiverAddress),
              value: BigInt(findParticipantGiveaway(participant).amount),
              body: GIVEAWAY_LINK_TEMPLATE.replace(
                ":id",
                participant.giveawayId,
              ),
            }),
          ),
        });

        // (seqno 42) Sending 30.0 TON to 2 addresses: 10.0 TON -> 0:abc (giveaway 69), 20.0 TON -> 0:def (giveaway 420)...
        log(
          `(seqno ${seqno}) Sending ${fromNano(participants.reduce((sum, p) => sum + BigInt(findParticipantGiveaway(p).amount), BigInt(0)))} TON to ${participants.length} addresses: ${participants
            .map(
              (p) =>
                `${fromNano(findParticipantGiveaway(p).amount)} TON -> ${addressFromRawBuffer(
                  p.receiverAddress,
                ).toRawString()} (giveaway ${p.giveawayId})`,
            )
            .join(", ")}...`,
        );

        // TODO: Check transaction status, presumably by
        // comparing incoming transactions' message cells.
        await wrapTonClientRequest(() => contract.send(transfer), log);

        // 2. Update DB statuses.
        //

        await Participant.update(
          {
            status: "paid",
          },
          {
            where: {
              id: participants.map((p) => p.id),
            },
            transaction,
          },
        );

        log(`Updated ${participants.length} participants' statuses to "paid".`);

        // Update giveaway statuses to "finished" if all participants are paid.
        //
        // NOTE(perf.): Could've updated giveways one-by-one
        // in loop, but instead chose to do it in bulk.
        //
        // OPTIMIZE: It is possible to build a single query
        // to find and update all matching giveaways at once.
        const giveawayIdsToFinish = new Set<string>();
        for (const giveaway of giveaways) {
          const participantsCount = await countParticipants(giveaway.id);

          if (participantsCount >= giveaway.receiverCount) {
            giveawayIdsToFinish.add(giveaway.id);
          }
        }

        if (giveawayIdsToFinish.size) {
          await Giveaway.update(
            { status: "finished" },
            {
              where: { id: [...giveawayIdsToFinish] },
              transaction,
            },
          );

          log(
            `Updated giveaway statuses to "finished": ${[...giveawayIdsToFinish].join(", ")}.`,
          );
        }
      });
    } while (participants.length > 0);

    log("No (more) payouts to be done.");
  }
}
