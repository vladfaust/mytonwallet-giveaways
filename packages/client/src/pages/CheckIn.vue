<script setup lang="ts">
import {
  connector,
  wallet,
  prettifyAddress,
  restoringConnection,
} from "../lib/ton";
import { type WalletConnectionSource } from "@tonconnect/sdk";
import { jwt } from "../store";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { CheckIcon } from "lucide-vue-next";
import { watchImmediate } from "@vueuse/core";

const JSBRIDGE_KEY = "mytonwallet";

const { giveawayId } = defineProps<{ giveawayId: string }>();

const giveaway = ref<
  | {
      taskUrl: string | null;
    }
  | undefined
>();
let unsubscribe: (() => void) | undefined;
const participantStatus = ref<
  | "awaitingTask"
  | "awaitingLottery" // NOTE: Out-of-spec.
  | "awaitingPayment"
  | "paid"
  | "lost"
  | null
  | undefined
>();

async function fetchGiveaway() {
  return await fetch(
    import.meta.env.VITE_BACKEND_URL + "/giveaways/" + giveawayId,
  ).then((res) => res.json());
}

async function connectWallet() {
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

async function checkJoined(jwt: string) {
  participantStatus.value = await fetch(
    import.meta.env.VITE_BACKEND_URL + "/giveaways/" + giveawayId + "/checkin",
    {
      headers: {
        Authorization: "Bearer " + jwt,
      },
    },
  )
    .then((res) => {
      return res.json();
    })
    .then((res) => {
      if (res.ok) {
        return res.participant.status;
      } else {
        return null;
      }
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
      const json = await res.json();
      alert(json.error);
      throw new Error(`Failed to check in: ${json.error}`);
    }

    participantStatus.value = (await res.json()).participant.status;
  });
}

watchImmediate(
  () => jwt.value,
  (jwt) => {
    if (!jwt) {
      participantStatus.value = null;
    } else {
      checkJoined(jwt);
    }
  },
);

onMounted(async () => {
  giveaway.value = await fetchGiveaway();
});

onUnmounted(() => {
  unsubscribe?.();
});
</script>

<template lang="pug">
.grid.place-items-center.h-screen
  .flex.flex-col.items-center.p-4.gap-2
    .flex.flex-col.items-center
      h1.text-xl.tracking-wide.font-semibold.uppercase Giveaway
      span
        b ID:&nbsp;
        span.font-mono {{ giveawayId }}
      code(v-if="participantStatus") {{ participantStatus }}

    template(v-if="restoringConnection")
      span.dz-loading.dz-loading-spinner.dz-loading-lg

    template(v-else)
      .flex.flex-col.items-center.gap-1
        span(:class="{ 'line-through': wallet }")
          b Step 1:
          |
          | Connect MyTonWallet
          CheckIcon.inline-block.text-success.ml-1(v-if="wallet" :size="20")
        button.dz-btn.dz-btn-primary(@click="connectWallet" :disabled="wallet")
          span(v-if="wallet") Already connected
          span(v-else) Connect

      .flex.flex-col.items-center.gap-1(v-if="participantStatus || wallet")
        span(:class="{ 'line-through': participantStatus }")
          b Step 2:
          |
          | Join the giveaway
          CheckIcon.inline-block.text-success.ml-1(
            v-if="participantStatus"
            :size="20"
          )
        button.dz-btn.dz-btn-primary(
          @click="join"
          :disabled="participantStatus"
        )
          span(v-if="participantStatus") Already joined
          span(v-else) Join

      .flex.flex-col.items-center.gap-1(v-if="participantStatus")
        template(v-if="participantStatus === 'awaitingTask'")
          p Complete the task: {{ giveaway?.taskUrl }}

.flex.gap-2.p-2.items-center.absolute.bottom-0.w-full.bg-base-200.justify-center(
  v-if="wallet"
)
  span
    | Connected as
    |
    code.text-primary {{ prettifyAddress(wallet.account.address) }}
  button.dz-btn.dz-btn-sm.dz-btn-neutral(@click="connector.disconnect") Disconnect
</template>
