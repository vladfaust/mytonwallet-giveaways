import { mnemonicToWalletKey } from "@ton/crypto";
import { AxiosError } from "axios";
import pRetry, { Options } from "p-retry";
import {
  Address,
  Cell,
  JettonMaster,
  TonClient,
  WalletContractV4,
  fromNano,
} from "ton";
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

        // NOTE: May return 500 even on user errors, e.g. exit code 33.
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
 * Parse a transaction message body cell.
 * Applicable both to TON and jetton transfers, with comments.
 */
export function parseTransactionMessageBody(body: Cell):
  | {
      comment?: string;

      /** When undefined, it is a simple TON transfer. */
      jetton?: {
        amount: bigint;
        /** When null, it is a mint transaction. */
        from: Address | null;
      };
    }
  | Buffer {
  const bs = body.beginParse();
  const head = bs.loadUint(32);

  // Text comment.
  if (head === 0) {
    const bytes = bs.loadBuffer(Math.floor(bs.remainingBits / 8));
    bs.endParse();
    return { comment: Buffer.from(bytes).toString("utf-8") };
  }

  // Jetton transfer notification.
  // @see https://docs.ton.org/develop/dapps/asset-processing/jettons#jetton-transfer-with-comment-parse
  else if (head === 0x7362d09c) {
    const queryId = bs.loadUint(64); // Not used.
    const amount = bs.loadCoins();

    let from: Address | null = null;
    try {
      from = bs.loadAddress();
    } catch (e: any) {
      // Address is zero when minting jettons.
      if (e.message === "Invalid address: 0") {
        return {
          jetton: { amount, from },
        };
      } else {
        throw e;
      }
    }

    const maybeRef = bs.loadBit();
    const payload = maybeRef ? bs.loadRef().beginParse() : bs;
    const payloadOp = payload.loadUint(32);

    let comment: string | undefined;
    if (payloadOp === 0) {
      comment = payload.loadStringTail();
    }

    // bs.endParse() // NOTE: Further processing may be required.

    return {
      comment,
      jetton: { amount, from },
    };
  }

  // Arbitrary buffer.
  else {
    const bytes = bs.loadBuffer(Math.floor(bs.remainingBits / 8));
    // bs.endParse(); // NOTE: Further processing may be required.
    return Buffer.from(bytes);
  }
}

/**
 * Get the jetton master address for a jetton wallet, ensuring that
 * the master would generate this `jettonWalletAddress`
 * for this jetton wallet owner address.
 *
 * @see https://docs.ton.org/develop/dapps/asset-processing/jettons
 */
export async function getJettonMasterAddress(
  jettonWalletAddress: Address,
): Promise<Address> {
  // storage#_ balance:Coins owner_address:MsgAddressInt jetton_master_address:MsgAddressInt jetton_wallet_code:^Cell = Storage;
  const jettonData = await client.runMethod(
    jettonWalletAddress,
    "get_wallet_data",
  );

  jettonData.stack.pop(); // Skip the balance.

  const jettonWalletOwnerAddress = jettonData.stack.readAddress();
  const jettonMasterAddress = jettonData.stack.readAddress();

  const jettonMasterWallet = JettonMaster.create(jettonMasterAddress);
  const expectedJettonWalletAddress = await client
    .open(jettonMasterWallet)
    .getWalletAddress(jettonWalletOwnerAddress);

  if (!expectedJettonWalletAddress.equals(jettonWalletAddress)) {
    throw new Error(
      `Invalid jetton wallet address (expected ${expectedJettonWalletAddress}, got ${jettonWalletAddress})`,
    );
  }

  return jettonMasterAddress;
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

/**
 * Try to parse an address string, returning `null` if it is invalid.
 */
export function tryParseAddress(address: string): Address | null {
  try {
    return Address.parse(address);
  } catch {
    return null;
  }
}

wrapTonClientRequest(() =>
  contract.getBalance().then((balance) => {
    console.log(
      `✅ TON address: ${prettifyAddress(contract.address, testOnly, bounceable)}, balance: ${fromNano(balance)} (${testOnly ? "test" : "main"}net)`,
    );
  }),
);
