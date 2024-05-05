import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
} from "sequelize";
import { Address } from "ton";
import { sequelize } from "../lib/sequelize.js";
import { Giveaway } from "./giveaway.js";

/**
 * A significant transaction, such as an incoming
 * or outcoming transfer, always related to a giveaway.
 */
export class Transaction extends Model<
  InferAttributes<Transaction>,
  InferCreationAttributes<Transaction>
> {
  declare hash: Buffer;
  declare logicalTime: bigint;

  /** See {@link Address}. */
  declare fromAddress: Buffer;

  /** See {@link Address}. */
  declare toAddress: Buffer;

  /**
   * The token address, or `null` if it is a TON transfer.
   * See {@link Address}.
   */
  declare tokenAddress: Buffer | null;

  /**
   * The amount of tokens or TON transferred.
   */
  declare amount: bigint;

  declare giveawayId: ForeignKey<Giveaway["id"]>;
  declare giveaway: NonAttribute<Giveaway>;

  /**
   * The actual time of the transaction.
   */
  declare transactionCreatedAt: Date;

  /**
   * DB timestamp, handled by Sequelize.
   */
  declare databaseCreatedAt: CreationOptional<Date>;
}

Transaction.init(
  {
    hash: {
      type: DataTypes.BLOB,
      primaryKey: true,
    },
    logicalTime: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    fromAddress: {
      type: DataTypes.BLOB,
      allowNull: false,
    },
    toAddress: {
      type: DataTypes.BLOB,
      allowNull: false,
    },
    tokenAddress: {
      type: DataTypes.BLOB,
    },
    amount: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    giveawayId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    transactionCreatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    databaseCreatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "Transaction",
    updatedAt: false, // A transaction is final.
    createdAt: "databaseCreatedAt",
  },
);
