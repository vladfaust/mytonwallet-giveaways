import TonConnect, { Wallet } from "@tonconnect/sdk";
import { ref } from "vue";

export const connector = new TonConnect({
  manifestUrl: import.meta.env.VITE_TONCONNECT_MANIFEST_URL,
});

connector.restoreConnection();

export const wallet = ref<Wallet | null>(null);
connector.onStatusChange((walletInfo) => {
  console.log("Wallet status changed", walletInfo);
  wallet.value = walletInfo;
});
