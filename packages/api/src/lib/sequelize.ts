import { Sequelize } from "sequelize";
import { DATABASE_URL } from "../env.js";

export const sequelize = new Sequelize(DATABASE_URL);

sequelize.authenticate().then(async () => {
  console.log("Sequelize connection OK");
  await sequelize.sync({ force: true, match: /_test$/ });
  console.log("Sequelize sync OK");
});
