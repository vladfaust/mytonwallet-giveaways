import { Job } from "bullmq";
import { Address, SendMode, fromNano, internal } from "ton";
import { GIVEAWAY_LINK_TEMPLATE, TON_WORKCHAIN } from "../env.js";
import { sequelize } from "../lib/sequelize.js";
import { contract, keyPair, wrapTonClientRequest } from "../lib/ton.js";
import { Giveaway } from "../models/giveaway.js";
import { Participant } from "../models/participant.js";

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

        // NOTE: Can not lock for update with joins,
        // so giveaways shall be fetched separately.
        //
        const giveaways = await Giveaway.findAll({
          where: { id: participants.map((p) => p.giveawayId) },
          attributes: ["id", "amount", "tokenAddress"],
          transaction,
        });
        function findParticipantGiveaway(participant: Participant): Giveaway {
          return giveaways.find(
            (giveaway) => giveaway.id === participant.giveawayId,
          )!;
        }

        // 1. Make blockchain transfers.
        //

        const seqno = await contract.getSeqno();

        const transfer = contract.createTransfer({
          seqno,
          secretKey: keyPair.secretKey,
          sendMode: SendMode.PAY_GAS_SEPARATELY,
          messages: participants.map((participant) =>
            internal({
              to: new Address(TON_WORKCHAIN, participant.receiverAddress),
              value: findParticipantGiveaway(participant).amount,
              body: GIVEAWAY_LINK_TEMPLATE.replace(
                ":id",
                participant.giveawayId,
              ),
            }),
          ),
        });

        // (seqno 42) Sending 30.0 TON to 2 addresses: 10.0 TON -> 0:abc (giveaway 69), 20.0 TON -> 0:def (giveaway 420)...
        log(
          `(seqno ${seqno}) Sending ${fromNano(participants.reduce((sum, p) => sum + BigInt(findParticipantGiveaway(p).amount), BigInt(0)))} TON to ${participants.length} addresses: ${participants.map((p) => `${fromNano(findParticipantGiveaway(p).amount)} TON -> ${new Address(TON_WORKCHAIN, p.receiverAddress)} (giveaway ${p.giveawayId})`).join(", ")}...`,
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
      });
    } while (participants.length > 0);

    log("No (more) payouts to be done.");
  }
}
