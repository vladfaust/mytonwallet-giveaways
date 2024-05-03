import { Router } from "express";

import checkin from "./giveaways/checkin.js";
import completeTask from "./giveaways/completeTask.js";
import create from "./giveaways/create.js";
import get from "./giveaways/get.js";
import getCheckin from "./giveaways/getCheckin.js";

export default Router()
  .use(checkin)
  .use(completeTask)
  .use(create)
  .use(get)
  .use(getCheckin);
