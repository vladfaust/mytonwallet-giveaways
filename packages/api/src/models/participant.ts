import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  Model,
  NonAttribute,
} from "sequelize";
import { sequelize } from "../lib/sequelize.js";
import { Giveaway } from "./giveaway.js";

export class Participant extends Model {
  declare id: CreationOptional<number>;
  declare giveawayId: ForeignKey<Giveaway["id"]>;
  declare giveaway?: NonAttribute<Giveaway>;
  declare receiverAddress: string;
  declare status: "awaitingTask" | "awaitingPayment" | "paid" | "lost";
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Participant.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrementIdentity: true,
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
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("awaitingTask", "awaitingPayment", "paid", "lost"),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Participant",
  },
);

Giveaway.hasMany(Participant);
Participant.belongsTo(Giveaway);
