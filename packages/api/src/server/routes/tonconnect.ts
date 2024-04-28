import { Router } from "express";

import authPayload from "./tonconnect/authPayload.js";
import manifest from "./tonconnect/manifest.js";
import proof from "./tonconnect/proof.js";

export default Router().use(manifest).use(authPayload).use(proof);
