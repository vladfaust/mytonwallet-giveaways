import express from "express";
import expressBasicAuth from "express-basic-auth";
import {
  BULL_DASHBOARD_PASSWORD,
  BULL_DASHBOARD_USERNAME,
  HOST,
  PORT,
} from "./env.js";
import * as bull from "./web/routes/bull.js";
import giveaways from "./web/routes/giveaways.js";
import jetton from "./web/routes/jetton.js";
import tonconnect from "./web/routes/tonconnect.js";

const app = express();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(
  bull.BASE_PATH,
  expressBasicAuth({
    users: { [BULL_DASHBOARD_USERNAME]: BULL_DASHBOARD_PASSWORD },
    challenge: true,
  }),
  bull.router,
);

app.use(tonconnect);
app.use(giveaways);
app.use(jetton);

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
