import { Job } from "bullmq";
import { Transaction as SequelizeTransaction } from "sequelize";
import { fromNano, Transaction as TonTransaction } from "ton";
import { TON_HISTORY_CUTOFF } from "../env.js";
import { sequelize } from "../lib/sequelize.js";
import {
  client,
  contract,
  parseMessageBodyString,
  wrapTonClientRequest,
} from "../lib/ton.js";
import { Giveaway } from "../models/giveaway.js";
import { Meta, Key as MetaKey } from "../models/meta.js";
import { Transaction as AppTransaction } from "../models/transaction.js";

/**
 * Synchronise TON blockchain state, querying the main wallet
 * for incoming and outgoing transations.
 *
 * NOTE: Only significant transactions are saved to DB, but meta data
 * is updated in DB each time to keep track of the blockchain state.
 *
 * SAFETY: Database is updated atomically, therefore
 * the job is both fail- and concurrent-safe.
 */
// TODO: Arbitrary token (not just TON) transactions.
export class SyncBlockchain extends Job {
  static async perform(job: SyncBlockchain) {
    // Output logs to both the job and the console.
    function log(args: any) {
      job.log(args);
      console.log(args);
    }

    const balance = await contract.getBalance();
    log(`TON Balance: ${fromNano(balance)}`);

    // Stage 1: Fetch transactions until the last processed one,
    // put them into the `transactionsToProcess` array.
    //

    const tonTransactionsToProcess: TonTransaction[] = [];

    // Before fetching the transactions, get the latest meta data, if any.
    // SAFETY: Another job may update the meta to a later transaction,
    // which would result in excessive transactions being processed. However,
    // they would be rejected due to the meta data mismatch.
    const meta = await fetchMeta();

    let currentTonTransactions: TonTransaction[] = [];
    let parentTonTransaction: { lt: bigint; hash: Buffer } | undefined;
    log("Begin fetching historical TON transactions...");
    //
    fetchTransactionsLoop: do {
      // NOTE: It's either both `lt` & `hash` params, or neither.
      const getTransactionArgs = {
        limit: 10,
        lt: parentTonTransaction
          ? parentTonTransaction.lt.toString()
          : undefined,
        hash: parentTonTransaction
          ? parentTonTransaction.hash.toString("base64")
          : undefined,
        inclusive: parentTonTransaction ? false : undefined,
      };
      console.log("getTransactionArgs", getTransactionArgs);

      currentTonTransactions = await wrapTonClientRequest(() =>
        client.getTransactions(contract.address, getTransactionArgs),
      );

      if (!currentTonTransactions.length) {
        break fetchTransactionsLoop;
      }

      for (const currentTonTransaction of currentTonTransactions) {
        // Check if the transaction is too old.
        if (
          TON_HISTORY_CUTOFF &&
          new Date(currentTonTransaction.now * 1000) < TON_HISTORY_CUTOFF
        ) {
          log(
            `Reached a TON transaction ${currentTonTransaction.hash().toString("hex")} older than the cutoff time, stop fetching.`,
          );

          break fetchTransactionsLoop;
        }

        // Check if the transaction is already processed.
        if (currentTonTransaction.hash().equals(meta.latestTransaction.hash)) {
          log(
            `Reached an already processed TON transaction ${currentTonTransaction.hash().toString("hex")}, stop fetching.`,
          );

          break fetchTransactionsLoop;
        }

        tonTransactionsToProcess.push(currentTonTransaction);
      }

      parentTonTransaction = {
        lt: currentTonTransactions.at(-1)!.lt,
        hash: currentTonTransactions.at(-1)!.hash(),
      };
    } while (currentTonTransactions.length > 0);
    //
    if (!tonTransactionsToProcess.length) {
      log(`No new TON transactions to process, the job is done.`);
      return;
    }

    // Stage 2: Process incoming transactions in reverse order
    // (from earliest to latest).
    //

    log(
      `Got ${tonTransactionsToProcess.length} new TON transactions to process...`,
    );

    for (const tonTransaction of tonTransactionsToProcess.reverse()) {
      log(
        `Processing TON transaction ${tonTransaction.hash().toString("hex")}...`,
      );

      if (tonTransaction.inMessage?.info.type === "internal") {
        const from = tonTransaction.inMessage.info.src;
        const to = tonTransaction.inMessage.info.dest;
        const value = tonTransaction.inMessage.info.value;
        const bounced = tonTransaction.inMessage.info.bounced;
        const bounce = tonTransaction.inMessage.info.bounce;
        const body = tonTransaction.inMessage.body;

        if (bounced) {
          log(`TON transaction bounced, skip.`);

          // Would still update the meta data to avoid
          // processing the same transaction twice.
          await updateMeta(tonTransaction, undefined, log);

          continue;
        }

        if (to.equals(contract.address)) {
          let comment = parseMessageBodyString(body);

          if (typeof comment !== "string") {
            log(
              `Received ${fromNano(value.coins)} TON from ${from.toString()}, but the comment is not a string; skip.`,
            );

            await updateMeta(tonTransaction, undefined, log); // Ditto.
            continue;
          }

          log(
            `Received ${fromNano(value.coins)} TON from ${from.toString()} with comment "${comment}"...`,
          );

          await sequelize.transaction(async (dbTransaction) => {
            if (!(await updateMeta(tonTransaction, dbTransaction, log))) {
              log(`Meta update error, skip.`);
              return;
            }

            const giveaway = await Giveaway.findOne({
              where: { id: comment },
              attributes: ["id", "status", "amount", "receiverCount"],
              transaction: dbTransaction,
            });

            if (!giveaway) {
              log(`No giveaway found with ID ${comment}, skip.`);
              return;
            }

            await AppTransaction.create(
              {
                hash: tonTransaction.hash(),
                logicalTime: tonTransaction.lt,
                fromAddress: from.toRaw(),
                toAddress: to.toRaw(),
                tokenAddress: null,
                amount: value.coins,
                giveawayId: giveaway.id,
                transactionCreatedAt: new Date(tonTransaction.now * 1000),
              },
              {
                transaction: dbTransaction,
              },
            );

            // If the giveaway is still "pending", would update its status
            // to "active" if the total amount of its replenishments is enough.
            if (giveaway.status === "pending") {
              const totalAmount = await AppTransaction.sum("amount", {
                where: { giveawayId: giveaway.id },
                transaction: dbTransaction,
              });

              if (
                totalAmount >=
                BigInt(giveaway.amount) * BigInt(giveaway.receiverCount)
              ) {
                log(`Giveaway ${giveaway.id} is now active.`);

                await Giveaway.update(
                  { status: "active" },
                  {
                    where: { id: giveaway.id },
                    transaction: dbTransaction,
                  },
                );
              } else {
                log(
                  `Giveaway ${giveaway.id} is still pending, wait for more transactions.`,
                );
              }
            }

            log(`TON transaction saved to DB.`);
          });
        } else if (from.equals(contract.address)) {
          // TODO: Handle outgoing transactions.
          await updateMeta(tonTransaction, undefined, log);
        }
      } else {
        log(
          `Unhandled message type: ${tonTransaction.inMessage?.info.type}, skip.`,
        );

        await updateMeta(tonTransaction, undefined, log); // Ditto.
      }
    }
  }
}

async function fetchMeta(dbTransaction?: SequelizeTransaction): Promise<{
  latestTransaction: {
    hash: Buffer;
  };
}> {
  const parentHash = await Meta.findOne({
    where: { key: "latestProcessedTransactionHash" satisfies MetaKey },
    transaction: dbTransaction,
    attributes: ["value"],
  }).then((meta) => meta?.value || "");

  return {
    latestTransaction: {
      hash: Buffer.from(parentHash, "hex"),
    },
  };
}

/**
 * Upserts the latest TON transaction [hash] meta value,
 * comparing the stored value with the provided transaction's.
 * @param tonTransaction The TON transaction to update the meta with.
 * @param dbTransactionArg An optional database transaction to use.
 * If not provided, the update will be wrapped in a new transaction.
 * @returns `false` on parent transaction data mismatch, otherwise `true`.
 */
async function updateMeta(
  tonTransaction: TonTransaction,
  dbTransactionArg: SequelizeTransaction | undefined,
  log = console.log,
): Promise<boolean> {
  const dbTransaction = dbTransactionArg || (await sequelize.transaction());

  try {
    const meta = await fetchMeta(dbTransaction);

    const prevTransactionHashBuffer = Buffer.from(
      tonTransaction.prevTransactionHash.toString(16),
      "hex",
    );

    if (
      meta.latestTransaction.hash.length &&
      !meta.latestTransaction.hash.equals(prevTransactionHashBuffer)
    ) {
      console.log({
        metaLatestTxHash: meta.latestTransaction.hash,
        txHash: tonTransaction.hash(),
        txParentHash: prevTransactionHashBuffer,
      });

      log(`Parent TON transaction data mismatch, skip meta update.`);

      if (!dbTransactionArg) await dbTransaction.rollback();
      return false;
    }

    await Meta.upsert(
      {
        key: "latestProcessedTransactionHash" satisfies MetaKey,
        value: tonTransaction.hash().toString("hex"),
      },
      {
        conflictFields: ["key"],
        transaction: dbTransaction,
      },
    );

    if (!dbTransactionArg) {
      await dbTransaction.commit();
    }

    console.log("Updated meta", {
      latestProcessedTransactionHash: tonTransaction.hash().toString("hex"),
    } satisfies Record<MetaKey, string>);

    return true;
  } catch (e) {
    if (!dbTransactionArg) {
      await dbTransaction.rollback();
    }

    throw e;
  }
}
