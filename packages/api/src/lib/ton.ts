import { mnemonicToWalletKey } from "@ton/crypto";
import { Address, TonClient, WalletContractV4, fromNano } from "ton";
import {
  TON_CLIENT_ENDPOINT,
  TON_MAINNET,
  TON_MAIN_ADDRESS_MNEMONICS,
  TON_WORKCHAIN,
} from "../env.js";

export const client = new TonClient({ endpoint: TON_CLIENT_ENDPOINT });
const keyPair = await mnemonicToWalletKey(TON_MAIN_ADDRESS_MNEMONICS);

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

contract.getBalance().then((balance) => {
  console.log(
    `✅ TON address: ${prettifyAddress(contract.address, testOnly, bounceable)}, balance: ${fromNano(balance)} (${testOnly ? "test" : "main"}net)`,
  );
});
