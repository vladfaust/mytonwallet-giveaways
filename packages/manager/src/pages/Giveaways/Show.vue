<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Countdown from "../../components/Countdown.vue";
import { RouterLink } from "vue-router";
import { routeLocation } from "../../router";
import { ChevronLeftCircleIcon, CurrencyIcon } from "lucide-vue-next";
import { asyncComputed, useClipboard } from "@vueuse/core";
import qrcode from "qrcode";
import { db } from "../../lib/db";
import CopyButton from "../../components/CopyButton.vue";
import { getJettonData } from "../../lib/api";
import { toUserFriendlyAddress } from "@tonconnect/sdk";

type Giveaway = {
  id: string;
  type: "instant" | "lottery";
  endsAt: Date | null;
  tokenAddress: string | null;
  amount: number;
  receiverCount: number;
  taskUrl: string | null;
  status: "pending" | "active" | "finished";
  participantCount: number;
  giveawayLink: string;
  topUpLink: string;
  taskCallbackPath: string | null;
};

const props = defineProps<{
  giveawayId: string;
}>();

const giveaway = ref<Giveaway | null>(null);
const giveawayLoading = ref(true);
const giveawayLinkClipboard = useClipboard();
const taskLinkClipboard = useClipboard();
const taskCallbackLinkClipboard = useClipboard();

const topUpQrCodeDataUrl = asyncComputed(() =>
  giveaway.value ? qrcode.toDataURL(giveaway.value.topUpLink) : undefined,
);

// Fetch giveaway task token from the database.
const taskToken = asyncComputed<string | null | undefined>(() =>
  giveaway.value
    ? db.giveaways.get(giveaway.value.id).then((g) => g?.taskToken ?? null)
    : undefined,
);

const taskCallbackUrl = computed(() =>
  giveaway.value && taskToken.value
    ? import.meta.env.VITE_API_URL +
      "/giveaways/" +
      giveaway.value.id +
      "/complete-task"
    : undefined,
);

const taskCallbackObject = computed(() =>
  taskToken.value
    ? {
        taskToken: taskToken.value,
        receiverAddress: "<Participant TON address>",
      }
    : undefined,
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
const tokenSymbol = computed(() =>
  jettonDataEvaluating.value
    ? "…"
    : jettonData.value?.metadata.metadata.symbol ?? "TON",
);

onMounted(async () => {
  giveaway.value = await fetch(
    import.meta.env.VITE_API_URL + `/giveaways/${props.giveawayId}`,
  ).then(async (res) => {
    const json = await res.json();

    if (json.error) {
      return null;
    } else {
      return json;
    }
  });
  giveawayLoading.value = false;
});
</script>

<template lang="pug">
.flex.flex-col.items-center.gap-3.p-3
  .flex.flex-col.items-center.gap-2.w-full
    h1.text-2xl.font-bold.tracking-wider.uppercase.italic Manage giveaway

    template(v-if="giveaway")
      //- Giveaway end-user link.
      .attribute-wrapper.w-full.gap-2.w-full.max-w-md.mb-1.shadow.shadow-secondary.border-primary.border
        span.attribute-label Giveaway link
        .flex.items-center.gap-2.w-full
          a.text-primary.pressable.transition-transform.bg-base-200.text-nowrap.font-mono.dz-link-hover.overflow-x-scroll.px-4.py-3.rounded-xl(
            :href="giveaway.giveawayLink"
            target="_blank"
          ) {{ giveaway.giveawayLink }}
          CopyButton.dz-btn.dz-btn-square(
            :clipboard="giveawayLinkClipboard"
            :value="giveaway.giveawayLink"
            :icon-size="20"
          )

      //- Giveaway data.
      .grid.p-3.gap-2.items-center.bg-base-200.w-full.flex-col.rounded-xl.max-w-md
        //- Type.
        .attribute-wrapper
          span.attribute-label Type
          span {{ giveaway.type === "instant" ? "⚡️ Instant" : "🎲 Lottery" }}

        //- Status.
        .attribute-wrapper
          span.attribute-label Status
          span(v-if="giveaway.status === 'active'") ✅ Active

          //- For "pending" status, show QR code and payment link.
          .flex.flex-col.gap-3.items-center(
            v-else-if="giveaway.status === 'pending'"
          )
            span
              .inline-block.animate-spin.mr-1 ⏳
              i Waiting for payment
            img.rounded-lg(:src="topUpQrCodeDataUrl")
            a.dz-btn.dz-btn-primary.w-max(:href="giveaway.topUpLink")
              CurrencyIcon(:size="20")
              | Pay {{ giveaway.amount * giveaway.receiverCount }}
              |
              span.dz-loading.dz-loading-spinner.dz-loading-sm(
                v-if="jettonDataEvaluating"
              )
              span(v-else-if="jettonData") {{ jettonData.metadata.metadata.symbol }}
              span(v-else) TON

          template(v-else) 🏁 Finished

        //- Ends in countdown, if any.
        .attribute-wrapper(
          v-if="giveaway.endsAt && giveaway.status !== 'finished'"
        )
          span.attribute-label Ends in
          Countdown(
            :endsAt="new Date(giveaway.endsAt)"
            :title="giveaway.endsAt"
          )

        //- Token address, if any.
        .attribute-wrapper(v-if="giveaway.tokenAddress")
          span.attribute-label Custom token
          template(v-if="jettonData")
            span.text-center
              b Address:&nbsp;
              code {{ toUserFriendlyAddress(giveaway.tokenAddress) }}
            span.text-center
              b Name:&nbsp;
              | {{ jettonData.metadata.metadata.name }} (
              b {{ jettonData.metadata.metadata.symbol }}
              | )
          .dz-loading-spinner.dz-loading(v-else)

        //- Task completion information.
        .attribute-wrapper(v-if="giveaway.taskUrl")
          //- Task URL.
          span.attribute-label Task URL
          .flex.items-center.gap-2
            a.font-mono.dz-link-hover.rounded-lg.w-full.overflow-x-scroll(
              :href="giveaway.taskUrl"
              target="_blank"
            ) {{ giveaway.taskUrl }}
            CopyButton.dz-btn.dz-btn-square.dz-btn-sm(
              :clipboard="taskLinkClipboard"
              :value="giveaway.taskUrl"
              :icon-size="18"
            )

          //- How to complete a task?
          details.w-full
            .flex.flex-col.bg-info-content.p-3.rounded-lg.mt-2.gap-2.items-center
              span.text-center
                | To complete a task, send a JSON callback to the following URL:

              //- Callback URL.
              .flex.items-center.gap-2.w-full(v-if="taskCallbackUrl")
                //- TODO: Select on click.
                span.text-sm.font-mono.w-full.overflow-x-scroll.text-nowrap.bg-base-100.px-2.rounded-lg(
                  class="py-1.5"
                  :href="taskCallbackUrl"
                ) {{ taskCallbackUrl }}

                //- Copy button.
                CopyButton.dz-btn.dz-btn-square.dz-btn-sm(
                  :clipboard="taskCallbackLinkClipboard"
                  :value="taskCallbackUrl"
                  :icon-size="18"
                )

              span.text-center
                | With the following payload:

              //- JSON payload.
              pre.w-full.text-sm.bg-base-100.rounded-lg.p-3.overflow-x-scroll(
                v-if="taskCallbackObject"
              )
                | {{ JSON.stringify(taskCallbackObject, null, 2) }}

            summary.font-semibold.text-info.text-center.italic.cursor-pointer.pressable.transition-transform.select-none How to complete a task?

        //- Prize.
        .attribute-wrapper
          span.attribute-label Prize
          span.leading-snug.text-lg {{ giveaway.amount * giveaway.receiverCount }} {{ tokenSymbol }} total
          span.leading-snug {{ giveaway.amount }} {{ tokenSymbol }} per participant

        //- Participants.
        .attribute-wrapper
          span.attribute-label Participants
          span {{ giveaway.participantCount }} / {{ giveaway.receiverCount }} ({{ ((giveaway.participantCount / giveaway.receiverCount) * 100).toFixed(0) }}%)

    template(v-else-if="giveawayLoading")
      span.dz-loading.dz-loading-spinner.dz-loading-lg

    template(v-else)
      p.alert-error Giveaway not found 💀💀💀

  RouterLink.dz-link-hover.opacity-50.pressable.transition-transform(
    :to="routeLocation({ name: 'Home' })"
    class="hover:opacity-100"
  )
    ChevronLeftCircleIcon.inline-block.mr-1.align-text-bottom(:size="18")
    | Manage other giveaways
</template>

<style lang="scss" scoped>
.attribute-wrapper {
  @apply flex flex-col items-center bg-base-300 w-full p-3 rounded-lg overflow-hidden;
}

.attribute-label {
  @apply text-lg font-bold tracking-wide uppercase text-center;
}
</style>
