import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
} from "sequelize";
import { sequelize } from "../lib/sequelize.js";
import { Giveaway } from "./giveaway.js";

export class Participant extends Model<
  InferAttributes<Participant>,
  InferCreationAttributes<Participant>
> {
  declare id: CreationOptional<number>;
  declare giveawayId: ForeignKey<Giveaway["id"]>;
  declare Giveaway?: NonAttribute<Giveaway>;
  declare receiverAddress: Buffer;
  declare status:
    | "awaitingTask"
    | "awaitingLottery" // NOTE: Out-of-spec.
    | "awaitingPayment"
    | "paid"
    | "lost";
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Participant.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    giveawayId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Giveaway,
        key: "id",
      },
    },
    receiverAddress: {
      type: DataTypes.BLOB,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "awaitingTask",
        "awaitingLottery",
        "awaitingPayment",
        "paid",
        "lost",
      ),
      allowNull: false,
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
    modelName: "Participant",
  },
);

Giveaway.hasMany(Participant);
Participant.belongsTo(Giveaway, { foreignKey: "giveawayId" });
