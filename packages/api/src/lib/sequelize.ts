import { Sequelize } from "sequelize";
import { DATABASE_URL, NODE_ENV } from "../env.js";

export const sequelize = new Sequelize(DATABASE_URL, {
  logging: false,
});

sequelize.authenticate().then(async () => {
  console.log("Sequelize connection OK");

  // TODO: Replace sync with migrations.
  await sequelize.sync({
    force: false,
    match: NODE_ENV === "production" ? undefined : /_test$/,
  });

  console.log("Sequelize sync OK");
});
