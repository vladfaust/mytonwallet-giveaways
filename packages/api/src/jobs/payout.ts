import { Job } from "bullmq";
import {
  JettonMaster,
  MessageRelaxed,
  SendMode,
  fromNano,
  internal,
  toNano,
} from "ton";
import { GIVEAWAY_LINK_TEMPLATE } from "../env.js";
import { createTransferBody, readJettonMetadata } from "../lib/jetton.js";
import { sequelize } from "../lib/sequelize.js";
import {
  addressFromRawBuffer,
  client,
  contract,
  keyPair,
  wrapTonClientRequest,
} from "../lib/ton.js";
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
 * SAFETY: A DB transaction would not commit if the TON transaction fails,
 * but it may rollback or network-fail AFTER the TON transaction is made,
 * potentially leading to double payouts. It may be mitigated
 * with a robust outgoing transaction monitoring mechanism.
 */
export class Payout extends Job {
  static async perform(job: Payout) {
    // Output logs to both the job and the console.
    function log(args: any) {
      job.log(args);
      console.log(args);
    }

    let participants: Participant[] = [];
    do {
      participants = await Participant.findAll({
        where: { status: "awaitingPayment" },
        include: [{ model: Giveaway }],
        limit: 10,
      });

      if (!participants.length) {
        break;
      }

      log(`Found ${participants.length} participants awaiting payment.`);

      for (const participant of participants) {
        const giveaway = participant.Giveaway!;

        if (giveaway.tokenAddress) {
          // Send Jetton transfer with a comment.
          //
          // @see https://docs.ton.org/develop/dapps/asset-processing/jettons#how-to-send-jetton-transfers-with-comments-and-notifications
          //

          // First 4 bytes are tag of text comment.
          const comment = new Uint8Array([
            ...new Uint8Array(4),
            ...new TextEncoder().encode(
              GIVEAWAY_LINK_TEMPLATE.replace(":id", giveaway.id),
            ),
          ]);

          const jettonMaster = client.open(
            JettonMaster.create(addressFromRawBuffer(giveaway.tokenAddress)),
          );

          const jettonWalletAddress = await jettonMaster.getWalletAddress(
            contract.address,
          );

          const data = await jettonMaster.getJettonData();
          const metadata = await readJettonMetadata(data.content);

          await wrapTransfer(
            participant.id,
            BigInt(giveaway.amount),
            metadata.metadata.symbol || "jetton",
            [
              internal({
                to: jettonWalletAddress,
                value: toNano("0.05"), // Total amount of TONs attached to the transfer message.
                body: createTransferBody({
                  jettonAmount: BigInt(giveaway.amount), // Actual Jetton amount to send.
                  toAddress: addressFromRawBuffer(participant.receiverAddress), // Recipient user's wallet address.
                  responseAddress: contract.address, // Return the TONs after deducting commissions back to the sender's wallet address.
                  forwardAmount: toNano("0.01"), // Some amount of TONs sent to the receiver to invoke transfer notification message.
                  forwardPayload: comment, // Text comment for Transfer notification message.
                }),
              }),
            ],
            log,
          );
        } else {
          // Send a simple TON transfer with comment.
          await wrapTransfer(
            participant.id,
            BigInt(giveaway.amount),
            "TON",
            [
              internal({
                to: addressFromRawBuffer(participant.receiverAddress),
                value: BigInt(giveaway.amount),
                body: GIVEAWAY_LINK_TEMPLATE.replace(":id", giveaway.id),
              }),
            ],
            log,
          );
        }
      }
    } while (participants.length > 0);

    log("No (more) payouts to be done.");
  }
}

/**
 * Wraps a blockchain transfer with a database transaction.
 */
async function wrapTransfer(
  participantId: number,
  amount: bigint,
  symbol: string,
  messages: MessageRelaxed[],
  log = console.log,
) {
  return sequelize.transaction(async (transaction) => {
    const participant = await Participant.findByPk(participantId, {
      include: [{ model: Giveaway }],
      transaction,
    });

    if (participant?.status !== "awaitingPayment") {
      return log(`Participant ${participantId} is no longer awaiting payment.`);
    }

    // [Giveaway <id>] Sending <amount> <symbol> to <address>...
    log(
      `[Giveaway ${participant.giveawayId}] Sending ${fromNano(
        amount,
      )} ${symbol} to ${addressFromRawBuffer(participant.receiverAddress)}...`,
    );

    // Send the transfer to the blockchain.
    try {
      await wrapTonClientRequest(
        async () =>
          contract.sendTransfer({
            seqno: await contract.getSeqno(),
            secretKey: keyPair.secretKey,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            messages,
          }),
        log,
        { retries: 3 },
      );
    } catch (e) {
      // NOTE: The transaction will be rolled back if the transfer fails.
      // Would try again in the next job run.
      log(`Failed to send transfer: ${e}`);
      await transaction.rollback();
      return;
    }

    // Update the participant status in the database.
    // NOTE: Here the DB connection may be lost, leading to a double payout.
    await participant.update({ status: "paid" }, { transaction });
    log(`Updated participant ${participant.id} status to "paid".`);
  });
}
