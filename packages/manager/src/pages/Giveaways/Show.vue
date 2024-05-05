<script setup lang="ts">
import { onMounted, ref } from "vue";
import Countdown from "../../components/Countdown.vue";
import { RouterLink } from "vue-router";
import { routeLocation } from "../../router";
import { CopyCheckIcon, CopyIcon, CurrencyIcon } from "lucide-vue-next";
import { asyncComputed, useClipboard } from "@vueuse/core";
import qrcode from "qrcode";

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
};

const props = defineProps<{
  giveawayId: string;
}>();

const giveaway = ref<Giveaway | null>(null);
const giveawayLinkClipboard = useClipboard();
const taskLinkClipboard = useClipboard();

const topUpQrCodeDataUrl = asyncComputed(() =>
  giveaway.value ? qrcode.toDataURL(giveaway.value.topUpLink) : undefined,
);

onMounted(async () => {
  giveaway.value = await fetch(
    import.meta.env.VITE_API_URL + `/giveaways/${props.giveawayId}`,
  ).then((res) => res.json());
});
</script>

<template lang="pug">
.flex.flex-col.items-center.gap-3.p-3
  .flex.flex-col.items-center.gap-2.w-full
    h1.text-2xl.font-bold.tracking-wider.uppercase.italic Manage giveaway

    //- Giveaway end-user link.
    .attribute-wrapper.w-full.gap-2.w-full.max-w-md.mb-1.shadow.shadow-secondary.border-primary.border(
      v-if="giveaway"
    )
      span.attribute-label Giveaway link
      .flex.items-center.gap-2.w-full
        a.text-primary.pressable.transition-transform.bg-base-200.text-nowrap.font-mono.dz-link-hover.overflow-x-scroll.px-4.py-3.rounded-xl(
          :href="giveaway.giveawayLink"
          target="_blank"
        ) {{ giveaway.giveawayLink }}
        button.dz-btn.dz-btn-square(
          @click="giveawayLinkClipboard.copy(giveaway.giveawayLink)"
        )
          CopyCheckIcon.text-success(
            v-if="giveawayLinkClipboard.copied.value"
            :size="20"
          )
          CopyIcon(v-else :size="20")

    .grid.p-3.gap-2.items-center.bg-base-200.w-full.flex-col.rounded-xl.max-w-md(
      v-if="giveaway"
    )
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
            | Pay {{ giveaway.amount * giveaway.receiverCount }} TON

        template(v-else) 🏁 Finished

      //- Ends in countdown, if any.
      .attribute-wrapper(
        v-if="giveaway.endsAt && giveaway.status !== 'finished'"
      )
        span.attribute-label Ends in
        Countdown(:endsAt="new Date(giveaway.endsAt)" :title="giveaway.endsAt")

      //- Token address, if any.
      .attribute-wrapper(v-if="giveaway.tokenAddress")
        span.attribute-label Token address
        span {{ giveaway.tokenAddress }}

      //- TODO: Task callback URL.
      //- Task URL.
      .attribute-wrapper(v-if="giveaway.taskUrl")
        span.attribute-label Task URL
        .flex.items-center.gap-2
          a.font-mono.dz-link-hover.rounded-lg.w-full.overflow-x-scroll(
            :href="giveaway.taskUrl"
            target="_blank"
          ) {{ giveaway.taskUrl }}
          button.dz-btn.dz-btn-square.dz-btn-sm(
            @click="taskLinkClipboard.copy(giveaway.taskUrl)"
          )
            CopyCheckIcon.text-success(
              v-if="taskLinkClipboard.copied.value"
              :size="18"
            )
            CopyIcon(v-else :size="20")

      //- Prize.
      .attribute-wrapper
        span.attribute-label Prize
        span.leading-snug.text-lg {{ giveaway.amount * giveaway.receiverCount }} {{ giveaway.tokenAddress ? "token" : "TON" }} total
        span.leading-snug {{ giveaway.amount }} {{ giveaway.tokenAddress ? "token" : "TON" }} per participant

      //- Participants.
      .attribute-wrapper
        span.attribute-label Participants
        span {{ giveaway.participantCount }} / {{ giveaway.receiverCount }} ({{ ((giveaway.participantCount / giveaway.receiverCount) * 100).toFixed(0) }}%)

  RouterLink.dz-link-hover.opacity-50(
    :to="routeLocation({ name: 'CreateGiveaway' })"
    class="hover:opacity-100"
  ) Create another giveaway
</template>

<style lang="scss" scoped>
.attribute-wrapper {
  @apply flex flex-col items-center text-center bg-base-300 w-full p-3 rounded-lg;
}

.attribute-label {
  @apply text-lg font-bold tracking-wide uppercase;
}
</style>
