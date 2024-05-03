import TonConnect, { Wallet, toUserFriendlyAddress } from "@tonconnect/sdk";
import { ref } from "vue";
import { jwt } from "../store";

export const testOnly = !["true", "1"].includes(
  import.meta.env.VITE_TON_MAINNET,
);

export const connector = new TonConnect({
  manifestUrl: import.meta.env.VITE_TONCONNECT_MANIFEST_URL,
});

export const restoringConnection = ref(true);
connector.restoreConnection().then(() => {
  restoringConnection.value = false;
});

export const wallet = ref<Wallet | null>(null);
connector.onStatusChange((walletInfo) => {
  console.log("Wallet status changed", walletInfo);
  wallet.value = walletInfo;

  if (!walletInfo) {
    // Clear JWT token on wallet disconnect.
    jwt.value = null;
  }
});

/**
 * Returns a pretty address for user display, e.g. `"0QBLT…ZuM6"`.
 */
export function prettifyAddress(address: string): string {
  console.debug(address, { testOnly });
  const userFriendlyAddress = toUserFriendlyAddress(address, testOnly);
  return `${userFriendlyAddress.slice(0, 4)}…${userFriendlyAddress.slice(-4)}`;
}
