import { nanoid } from "nanoid";
import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../lib/sequelize.js";

export class Giveaway extends Model<
  InferAttributes<Giveaway>,
  InferCreationAttributes<Giveaway>
> {
  declare id: CreationOptional<string>;
  declare type: "instant" | "lottery";
  declare status: CreationOptional<"pending" | "active" | "finished">;
  declare endsAt: Date | null;
  declare tokenAddress: Buffer | null;

  /** Sequelize serializes BIGINT to strings. */
  declare amount: string;

  declare receiverCount: number;
  declare taskUrl: string | null;
  declare taskToken: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Giveaway.init(
  {
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: () => nanoid(),
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM("instant", "lottery"),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "active", "finished"),
      allowNull: false,
      defaultValue: "pending",
    },
    endsAt: {
      type: DataTypes.DATE,
    },
    tokenAddress: {
      type: DataTypes.BLOB,
      comment: "The Jetton address for the giveaway, or NULL for Toncoin",
    },
    amount: {
      type: DataTypes.BIGINT,
      comment: "The amount of the giveaway, per receiver",
      allowNull: false,
    },
    receiverCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    taskUrl: {
      type: DataTypes.STRING,
      validate: {
        isUrl: true,
      },
    },
    taskToken: {
      type: DataTypes.STRING,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "Giveaway",
  },
);
