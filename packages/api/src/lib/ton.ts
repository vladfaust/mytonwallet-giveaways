import { mnemonicToWalletKey } from "@ton/crypto";
import { AxiosError } from "axios";
import pRetry, { Options } from "p-retry";
import { Address, Cell, TonClient, WalletContractV4, fromNano } from "ton";
import {
  TON_CLIENT_API_KEY,
  TON_CLIENT_ENDPOINT,
  TON_MAINNET,
  TON_MAIN_ADDRESS_MNEMONICS,
  TON_WORKCHAIN,
} from "../env.js";

export const client = new TonClient({
  endpoint: TON_CLIENT_ENDPOINT,
  apiKey: TON_CLIENT_API_KEY,
});

export const keyPair = await mnemonicToWalletKey(TON_MAIN_ADDRESS_MNEMONICS);

const walletContract = WalletContractV4.create({
  workchain: TON_WORKCHAIN,
  publicKey: keyPair.publicKey,
});

export const contract = client.open(walletContract);
export const testOnly = !TON_MAINNET;
export const bounceable = false; // NOTE: May be true when the wallet is a real contract.

/**
 * Returns a pretty address for user display, e.g. `"0QBLT…ZuM6"`.
 */
export function prettifyAddress(
  address: Address,
  testOnly?: boolean,
  bounceable?: boolean,
): string {
  const userFriendlyAddress = address.toString({ bounceable, testOnly });
  return `${userFriendlyAddress.slice(0, 5)}…${userFriendlyAddress.slice(-4)}`;
}

/**
 * Wrap a {@link TonClient} request with retries and error handling.
 */
export async function wrapTonClientRequest<T>(
  callable: () => Promise<T>,
  log = console.log,
  pRetryOptions?: Options,
) {
  return pRetry(callable, {
    ...pRetryOptions,
    onFailedAttempt: (error) => {
      // NOTE: {@link AxiosError} (`ton` client uses `axios` under the hood)
      // is an interface, so we can't use `instanceof`.
      if ("isAxiosError" in error) {
        const err = error as unknown as AxiosError;
        if (!err.response) throw error; // No response, abort.

        log(
          `Ton client request failed (${err.response.status} ${err.response.statusText}), ${error.retriesLeft} retries left: ${JSON.stringify(err.response.data)}`,
        );

        if (
          err.response.status === 429 ||
          (err.response.status >= 500 && err.response.status < 600)
        ) {
          return; // Retry.
        }
      }

      throw error; // Otherwise, abort.
    },
  });
}

/**
 * Parse the message body string from a cell.
 * If body begins with `0:uint32`, it is parsed as a UTF-8 string.
 * Otherwise, it is parsed as a {@link Buffer}.
 */
export function parseMessageBodyString(body: Cell): string | Buffer {
  const bs = body.beginParse();
  const head = bs.loadUint(32);

  if (head === 0) {
    const bytes = bs.loadBuffer(bs.remainingBits / 8);
    bs.endParse();
    return Buffer.from(bytes).toString("utf-8");
  } else {
    const bytes = bs.loadBuffer(bs.remainingBits / 8);
    bs.endParse();
    return Buffer.from(bytes);
  }
}

/**
 * Construct a new `Address` from an `Address.toRaw()` buffer.
 */
export function addressFromRawBuffer(buffer: Buffer): Address {
  // `Address.toRaw()` appends workchain to the address hash.
  const hash = buffer.subarray(0, 32);
  const workchain = buffer.readUint32BE(32);

  return new Address(workchain, hash);
}

wrapTonClientRequest(() =>
  contract.getBalance().then((balance) => {
    console.log(
      `✅ TON address: ${prettifyAddress(contract.address, testOnly, bounceable)}, balance: ${fromNano(balance)} (${testOnly ? "test" : "main"}net)`,
    );
  }),
);
