<script setup lang="ts">
import {
  connector,
  wallet,
  prettifyAddress,
  restoringConnection,
} from "../lib/ton";
import { type WalletConnectionSource } from "@tonconnect/sdk";
import { jwt } from "../store";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { CheckIcon, FlameIcon, PlugIcon, UserPlus2Icon } from "lucide-vue-next";
import { asyncComputed, watchImmediate } from "@vueuse/core";
import Countdown from "../components/Countdown.vue";
import confetti from "canvas-confetti";
import WrapBalancer from "vue-wrap-balancer";
import Turnstile from "vue-turnstile";
import { getJettonData } from "../lib/api";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const JSBRIDGE_KEY = "mytonwallet";

const { giveawayId } = defineProps<{ giveawayId: string }>();

const giveaway = ref<
  | {
      type: "instant" | "lottery";
      status: "pending" | "active" | "finished";
      endsAt: string | null;
      taskUrl: string | null;
      amount: string; // BigInt string.
      receiverCount: number;
      participantCount: number;
      giveawayLink: string;
      tokenAddress: string | null;
    }
  | null
  | undefined
>();

const participantStatus = ref<
  | "awaitingTask"
  | "awaitingLottery" // NOTE: Out-of-spec.
  | "awaitingPayment"
  | "paid"
  | "lost"
  | null
  | undefined
>();

const captchaToken = ref("");
const walletConnectionInProgress = ref(false);
const joinInProgress = ref(false);

// ADHOC: Ideally, the giveaway's status is updated as soon as it ends.
const isGiveawayActive = computed(
  () =>
    giveaway.value?.status === "active" &&
    (!giveaway.value.endsAt || new Date(giveaway.value.endsAt) > new Date()),
);

const jettonDataEvaluating = ref(false);
const jettonData = asyncComputed(
  () =>
    giveaway.value?.tokenAddress
      ? getJettonData(giveaway.value.tokenAddress)
      : null,
  null,
  { evaluating: jettonDataEvaluating },
);
/** Returns Jetton symbol, or "TON". */
const tokenSymbol = computed(() =>
  jettonDataEvaluating.value
    ? "…"
    : jettonData.value?.metadata.metadata.symbol ?? "TON",
);
/** Returns token decimals, or `undefined` if not loaded yet. */
const tokenDecimals = computed<number | undefined>(
  () =>
    jettonDataEvaluating.value
      ? undefined
      : jettonData.value
        ? Number(jettonData.value.metadata.metadata.decimals)
        : 9, // Nano for TON.
);
function formatAmount(amount: BigInt) {
  if (tokenDecimals.value === undefined) {
    return "…"; // Decimals not loaded yet.
  } else if (!tokenDecimals.value) {
    return amount.toString(); // No decimals.
  } else {
    return parseFloat(
      (Number(amount) / 10 ** tokenDecimals.value).toFixed(tokenDecimals.value),
    );
  }
}

let unsubscribeWalletConnector: (() => void) | undefined;

/**
 * Fetches the giveaway data from the backend.
 */
async function fetchGiveaway() {
  return await fetch(
    import.meta.env.VITE_BACKEND_URL + "/giveaways/" + giveawayId,
  ).then((res) => res.json());
}

/**
 * Connects the TON wallet.
 */
async function connectWallet() {
  const proofPayload = await fetch(
    import.meta.env.VITE_BACKEND_URL + "/tonconnect/auth-payload",
  ).then((res) => res.text());

  const walletConnectionSource: WalletConnectionSource = {
    jsBridgeKey: JSBRIDGE_KEY,
  };

  unsubscribeWalletConnector = connector.onStatusChange(async (walletInfo) => {
    walletConnectionInProgress.value = false;

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

      // Save the JWT locally.
      jwt.value = response.jwt;

      // Remove the self as the listener once connected.
      unsubscribeWalletConnector?.();
    }
  });

  // For UI feedback.
  walletConnectionInProgress.value = true;

  // Actually trigger the wallet connection.
  connector.connect(walletConnectionSource, {
    request: { tonProof: proofPayload },
  });
}

/**
 * Check if the user has joined the giveaway.
 */
async function checkJoined(jwt: string) {
  // TODO: Error handling.
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

/**
 * Joins the giveaway!
 */
async function join() {
  if (!captchaToken.value) {
    return alert("Please complete the captcha.");
  }

  if (!isGiveawayActive.value) {
    return alert("This giveaway has ended.");
  }

  joinInProgress.value = true;
  try {
    await fetch(
      import.meta.env.VITE_BACKEND_URL +
        "/giveaways/" +
        giveawayId +
        "/checkin",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + jwt.value,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          captchaToken: captchaToken.value,
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
  } finally {
    joinInProgress.value = false;
  }
}

// Watch the JWT storage for changes.
watchImmediate(
  () => jwt.value,
  (jwt) => {
    if (!jwt) {
      // If the JWT is removed, reset the participant status to none.
      participantStatus.value = null;
    } else {
      // Otherwise, check if the user has joined the giveaway.
      checkJoined(jwt);
    }
  },
);

// Watch the participant status for changes.
watchImmediate(
  () => participantStatus.value,
  (status) => {
    if (status === "awaitingPayment" || status === "paid") {
      // If the user has won the prize, launch the confetti!
      launchConfetti();
    }
  },
);

function launchConfetti() {
  // Left side.
  confetti({
    origin: { x: 0, y: 1 },
    angle: 60,
  });

  // Right side.
  confetti({
    origin: { x: 1, y: 1 },
    angle: 90 + 30,
  });
}

onMounted(async () => {
  // Fetch the giveaway data on mount.
  giveaway.value = await fetchGiveaway();
});

onUnmounted(() => {
  unsubscribeWalletConnector?.();
});
</script>

<template lang="pug">
.grid.place-items-center.h-screen
  .flex.flex-col.items-center.p-3.gap-2
    .flex.flex-col.items-center(v-if="giveaway")
      h1.mb-2.text-2xl.tracking-wider.font-bold.uppercase.italic
        span(v-if="giveaway.type === 'instant'")
          | ⚡️ Instant Giveaway ⚡️
        span(v-else) 🎲 Lottery 🎲

      .flex.p-3.gap-2.items-center.bg-base-200.rounded-xl.max-w-sm.w-full.flex-col
        span
          span Prize pool:&nbsp;
          b.text-accent {{ formatAmount(BigInt(giveaway.amount) * BigInt(giveaway.receiverCount)) }} {{ tokenSymbol }}
        span
          span Maximum winners:&nbsp;
          b {{ giveaway.receiverCount }}

    Countdown.gap-2(
      v-if="giveaway?.endsAt"
      :endsAt="new Date(giveaway.endsAt)"
    )

    template(v-if="restoringConnection || giveaway === undefined")
      span.dz-loading.dz-loading-spinner.dz-loading-lg

    template(v-else-if="giveaway && isGiveawayActive")
      //- Step 1: Connect wallet.
      .flex.flex-col.items-center.gap-2
        //- Step description.
        span(:class="{ 'line-through': wallet }")
          b Step 1:
          |
          | Connect
          |
          a.dz-link(href="https://mytonwallet.io/") MyTonWallet
          CheckIcon.inline-block.text-success.ml-1(v-if="wallet" :size="20")

        //- Button.
        button.dz-btn.dz-btn-primary.items-center.gap-1(
          @click="connectWallet"
          :disabled="!!wallet"
        )
          //- When in-progress.
          template(v-if="walletConnectionInProgress")
            .dz-loading.dz-loading-spinner

          //- When connected.
          template(v-else-if="wallet")
            | Already connected!

          //- When not connected.
          template(v-else)
            PlugIcon.inline-block(:size="24")
            span Connect

      //- Step 2: Check in.
      .flex.flex-col.items-center.gap-2(v-if="participantStatus || wallet")
        //- Step description.
        span(:class="{ 'line-through': participantStatus }")
          b Step 2:&nbsp;

          //- When instant giveaway.
          template(v-if="giveaway.type === 'instant'")
            span(v-if="giveaway.taskUrl") Register to the giveaway
            span(v-else) Claim your prize

          //- When lottery giveaway.
          span(v-else) Register to the lottery

          CheckIcon.inline-block.text-success.ml-1(
            v-if="participantStatus"
            :size="20"
          )

        //- Captcha.
        .bg-base-300.p-2.rounded-lg.min-w-64.min-h-16.relative.grid.place-items-center(
          v-if="!participantStatus"
        )
          .absolute.dz-loading-spinner.dz-loading
          Turnstile.z-10(:site-key="TURNSTILE_SITE_KEY" v-model="captchaToken")

        //- Button.
        button.dz-btn.dz-btn-primary(
          @click="join"
          :disabled="!captchaToken || !!participantStatus || joinInProgress"
        )
          //- When in progress.
          template(v-if="joinInProgress")
            .dz-loading.dz-loading-spinner

          //- When instant giveaway.
          template(v-else-if="giveaway.type === 'instant'")
            span(v-if="participantStatus") Already claimed!
            template(v-else-if="giveaway.taskUrl")
              UserPlus2Icon.inline-block(:size="24")
              span Register
            template(v-else)
              FlameIcon.inline-block(:size="24")
              span Claim

          //- When lottery giveaway.
          template(v-else)
            span(v-if="participantStatus") Already registered!
            template(v-else)
              UserPlus2Icon.inline-block(:size="24")
              span Register

      //- Step 3: Complete the task.
      .flex.flex-col.items-center.gap-2(
        v-if="participantStatus && giveaway.taskUrl"
      )
        span.text-center(
          :class="{ 'line-through': participantStatus && participantStatus !== 'awaitingTask' }"
        )
          b Step 3:&nbsp;
          | Complete the task
          CheckIcon.inline-block.text-success.ml-1(
            v-if="participantStatus !== 'awaitingTask'"
            :size="20"
          )
        a.pressable.transition-transform.text-primary.bg-base-300.px-4.py-3.rounded-lg.dz-link-hover.font-mono(
          v-if="participantStatus === 'awaitingTask'"
          :href="giveaway.taskUrl"
        ) {{ giveaway.taskUrl }}
        WrapBalancer.leading-snug.max-w-sm.text-center.text-sm(as="p")
          template(v-if="giveaway.type === 'instant'") You'll get your prize after completing the task.
          template(v-else)
            template(v-if="participantStatus === 'awaitingTask'") Once you have completed the task, you become eligible to win the prize.
            template(v-else) You have already completed the task, now wait for the lottery to end.

    template(v-else-if="giveaway?.status === 'pending'")
      p
        .inline-block.mr-1 ⏳
        | This giveaway has not started yet.

    template(v-else-if="giveaway && !isGiveawayActive")
      p.text-lg.text-accent.font-bold
        | This giveaway has ended. 🏁

    template(v-else)
      p.text-lg.text-error.font-bold
        | This giveaway does not exist. 💀💀💀

    //- Explanation text.
    p.text-secondary.leading-snug.text-center(
      v-if="participantStatus === 'awaitingPayment' || participantStatus === 'paid'"
    )
      b.text-lg You have won the prize! 🎉
      br
      | Please wait for the payment to arrive into your wallet.

//- The wallet connection status.
.flex.gap-2.p-2.items-center.absolute.bottom-0.w-full.bg-base-200.justify-center(
  v-if="wallet"
)
  span
    | Connected as
    |
    code.text-primary {{ prettifyAddress(wallet.account.address) }}
  button.dz-btn.dz-btn-sm.dz-btn-neutral(@click="connector.disconnect") Disconnect
</template>
