import express from "express";
import { HOST, PORT } from "./env.js";
import giveaways from "./server/routes/giveaways.js";

const app = express();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(giveaways);

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
