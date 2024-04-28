import bodyParser from "body-parser";
import { Router } from "express";
import * as jose from "jose";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { JWT_SECRET } from "../../../env.js";
import {
  NewGiveawaySchema,
  SuccessResponseSchema as SuccessResponseSchemaBase,
  sendError,
} from "./_common.js";

const RequestBodySchema = z.object({
  captchaToken: z.string(),
});

const SuccessResponseSchema = SuccessResponseSchemaBase.extend({
  giveaway: NewGiveawaySchema,
});

export default Router()
  .use(bodyParser.json())
  .post("/giveaways/:giveawayId/checkin", async (req, res) => {
    const body = RequestBodySchema.safeParse(req.body);
    if (!body.success) {
      return sendError(res, 400, fromZodError(body.error).toString());
    }

    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      return sendError(res, 401, "Unauthorized");
    }

    let jwt;
    try {
      jwt = await jose.jwtVerify(token, JWT_SECRET);
    } catch (e) {
      if (e instanceof jose.errors.JOSEError) {
        return sendError(res, 401, "Unauthorized");
      } else {
        throw e;
      }
    }

    const { address } = jwt.payload;
    console.debug(
      `User ${address} is checking in to giveaway ${req.params.giveawayId}`,
    );

    res.json({
      success: true,
      giveaway: {
        id: req.params.giveawayId,
        checkedIn: true,
      },
    });
  });
