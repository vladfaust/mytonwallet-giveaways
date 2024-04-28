import { Router } from "express";
import {
  TONCONNECT_MANIFEST_ICON_URL,
  TONCONNECT_MANIFEST_URL,
} from "../../../env.js";

export default Router().get("/tonconnect-manifest.json", (req, res) => {
  res.json({
    url: TONCONNECT_MANIFEST_URL,
    name: "MyTonWallet Giveaways",
    iconUrl: TONCONNECT_MANIFEST_ICON_URL,
  });
});
