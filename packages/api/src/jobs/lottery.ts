import { Job } from "bullmq";
import { Op } from "sequelize";
import { sequelize } from "../lib/sequelize.js";
import { Giveaway } from "../models/giveaway.js";
import { Participant } from "../models/participant.js";

/**
 * SAFETY: The job is safe to run concurrently.
 * Lotteries are processed one-by-one,
 * and the DB is updated atomically.
 */
export class Lottery extends Job {
  static async perform(job: Lottery) {
    function log(args: any) {
      job.log(args);
      console.log(args);
    }

    let giveaway: Giveaway | null = null;
    do {
      await sequelize.transaction(async (transaction) => {
        // Find the next active lottery that has (just) ended.
        giveaway = await Giveaway.findOne({
          where: {
            type: "lottery",
            status: "active",
            endsAt: {
              [Op.lt]: new Date(),
            },
          },
          transaction,
          lock: true,
        });

        if (!giveaway) {
          log("No (more) active lotteries to draw.");
          return;
        } else {
          log(`Drawing lottery ${giveaway.id}.`);
        }

        // Find all participants that are awaiting for the lottery results.
        const participants = await Participant.findAll({
          where: {
            giveawayId: giveaway.id,
            status: "awaitingLottery",
          },
          attributes: ["id"],
          transaction,
          lock: true,
        });

        if (participants.length) {
          const maxWinners = giveaway.receiverCount;

          // Shuffle the participants.
          participants.sort(() => Math.random() - 0.5);

          // Select the winners.
          const winners = participants.slice(0, maxWinners);

          // Update the winners.
          await Participant.update(
            { status: "awaitingPayment" },
            {
              where: { id: winners.map((winner) => winner.id) },
              transaction,
            },
          );

          // Update the losers.
          await Participant.update(
            { status: "lost" },
            {
              where: {
                giveawayId: giveaway.id,
                status: "awaitingLottery",
                [Op.not]: { id: winners.map((winner) => winner.id) },
              },
              transaction,
            },
          );

          log(
            `Lottery ${giveaway.id} has ${winners.length} winners and ${
              participants.length - winners.length
            } losers.`,
          );
        } else {
          log(`No eligible participants for lottery ${giveaway.id}.`);
        }

        // Mark the giveaway as finished.
        await giveaway.update({ status: "finished" }, { transaction });
      });
    } while (giveaway);
  }
}
