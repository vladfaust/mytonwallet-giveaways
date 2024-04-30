import express from "express";
import { HOST, PORT } from "./env.js";
import giveaways from "./web/routes/giveaways.js";
import tonconnect from "./web/routes/tonconnect.js";

const app = express();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(tonconnect);
app.use(giveaways);

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
