import { Sequelize } from "sequelize";
import { DATABASE_URL } from "../env.js";

export const sequelize = new Sequelize(DATABASE_URL);

sequelize.authenticate().then(async () => {
  console.log("Sequelize connection OK");
  // TODO: Replace sync with migrations.
  await sequelize.sync({ force: false, match: /_test$/ });
  console.log("Sequelize sync OK");
});
