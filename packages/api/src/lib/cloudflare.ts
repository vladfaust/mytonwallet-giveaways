import pRetry from "p-retry";
import { TURNSTILE_SECRET_KEY } from "../env.js";
import { ResponseError } from "./errors.js";

/**
 * Verify a captcha token.
 */
export async function verifyCaptcha(token: string): Promise<{
  success: boolean;
  "challenge-ts": Date;
  hostname: string;
  "error-codes": string[];
  action?: string;
  cdata?: string;
}> {
  let formData = new FormData();

  formData.append("secret", TURNSTILE_SECRET_KEY);
  formData.append("response", token);

  const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const result = await pRetry(
    () =>
      fetch(url, {
        body: formData,
        method: "POST",
      }).then((res) => {
        if (res.ok) return res;
        else throw new ResponseError(res);
      }),
    {
      onFailedAttempt: (e) => {
        if (e instanceof ResponseError) {
          if (
            e.response.status === 429 ||
            (e.response.status >= 500 && e.response.status < 600)
          ) {
            console.debug(
              `Retrying captcha verification due to ${e.response.status} (${e.retriesLeft} retries left)`,
            );

            return;
          }
        }

        throw e;
      },
    },
  );

  return result.json();
}
