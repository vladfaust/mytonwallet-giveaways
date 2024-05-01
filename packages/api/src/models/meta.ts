import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../lib/sequelize.js";

export type Key = "latestTransactionLogicalTime" | "latestTransactionHash";

/**
 * A meta table storing application data in key-value format.
 */
export class Meta extends Model<
  InferAttributes<Meta>,
  InferCreationAttributes<Meta>
> {
  declare key: Key;
  declare value: string | null;

  // Handled by Sequelize.
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Meta.init(
  {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: true,
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
    modelName: "Meta",
  },
);
