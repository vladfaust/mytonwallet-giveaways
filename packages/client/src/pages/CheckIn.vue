<script setup lang="ts">
import { connector, wallet } from "../lib/ton";
import { WalletConnectionSource, toUserFriendlyAddress } from "@tonconnect/sdk";
import { jwt } from "../store";
import { onUnmounted } from "vue";

const JSBRIDGE_KEY = "mytonwallet";

const { giveawayId } = defineProps<{ giveawayId: string }>();

let unsubscribe: (() => void) | undefined;
async function connect() {
  const proofPayload = await fetch(
    import.meta.env.VITE_BACKEND_URL + "/tonconnect/auth-payload",
  ).then((res) => res.text());

  const walletConnectionSource: WalletConnectionSource = {
    jsBridgeKey: JSBRIDGE_KEY,
  };

  unsubscribe = connector.onStatusChange(async (walletInfo) => {
    if (walletInfo) {
      if (!walletInfo.connectItems?.tonProof) {
        throw new Error("No proof provided");
      }

      if ("error" in walletInfo.connectItems.tonProof) {
        throw new Error(walletInfo.connectItems.tonProof.error.message);
      }

      const response = await fetch(
        import.meta.env.VITE_BACKEND_URL + "/tonconnect/proof",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address: walletInfo.account.address,
            chain: parseInt(walletInfo.account.chain),
            publicKey: walletInfo.account.publicKey,
            tonProof: {
              domain: {
                lengthBytes:
                  walletInfo.connectItems.tonProof.proof.domain.lengthBytes,
                value: walletInfo.connectItems.tonProof.proof.domain.value,
              },
              payload: walletInfo.connectItems.tonProof.proof.payload,
              signature: walletInfo.connectItems.tonProof.proof.signature,
              timestamp: walletInfo.connectItems.tonProof.proof.timestamp,
            },
          }),
        },
      ).then((res) => res.json());

      jwt.value = response.jwt;

      unsubscribe?.();
    }
  });

  connector.connect(walletConnectionSource, {
    request: { tonProof: proofPayload },
  });
}

async function join() {
  await fetch(
    import.meta.env.VITE_BACKEND_URL + "/giveaways/" + giveawayId + "/checkin",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + jwt.value,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        captchaToken: "42",
      }),
    },
  ).then(async (res) => {
    if (!res.ok) {
      throw new Error("Failed to check in");
    }
  });
}

onUnmounted(() => {
  unsubscribe?.();
});
</script>

<template>
  <div>
    <h1>Check In</h1>
    <p>Giveaway ID: {{ giveawayId }}</p>
    <template v-if="wallet">
      <p>Wallet address: {{ toUserFriendlyAddress(wallet.account.address) }}</p>
      <button @click="join" v-if="wallet">Join Giveaway</button>
    </template>
    <template v-else>
      <button @click="connect" v-if="!wallet">Connect</button>
    </template>
  </div>
</template>
