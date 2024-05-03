<script setup lang="ts">
import { onMounted, ref } from "vue";

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

onMounted(async () => {
  giveaway.value = await fetch(
    import.meta.env.VITE_API_URL + `/giveaways/${props.giveawayId}`,
  ).then((res) => res.json());
});
</script>

<template lang="pug">
.flex.flex-col.items-center.gap-y-2.p-3
  h1.text-2xl.font-semibold.tracking-wide.uppercase Giveaway
  .flex.p-4.gap-3.items-center.bg-base-200.rounded-xl.max-w-md.w-full.flex-col(
    v-if="giveaway"
  )
    .attribute-wrapper
      span.attribute-label.font-mono ID
      span {{ giveaway.id }}

    .attribute-wrapper
      span.attribute-label Type
      span {{ giveaway.type }}

    .attribute-wrapper(v-if="giveaway.endsAt")
      span.attribute-label Ends at
      span {{ giveaway.endsAt }}

    .attribute-wrapper(v-if="giveaway.tokenAddress")
      span.attribute-label Token address
      span {{ giveaway.tokenAddress }}

    .attribute-wrapper
      span.attribute-label Amount
      span {{ giveaway.amount }}

    .attribute-wrapper
      span.attribute-label Receiver count
      span {{ giveaway.receiverCount }}

    .attribute-wrapper(v-if="giveaway.taskUrl")
      span.attribute-label Task URL
      span {{ giveaway.taskUrl }}

    .attribute-wrapper
      span.attribute-label Status
      span {{ giveaway.status }}

    .attribute-wrapper
      span.attribute-label Participant count
      span {{ giveaway.participantCount }}

    .attribute-wrapper
      span.attribute-label Giveaway link
      a.break-all.font-mono.dz-link-hover.w-full(:href="giveaway.giveawayLink") {{ giveaway.giveawayLink }}

    .attribute-wrapper
      span.attribute-label Top-up link
      a.break-all.font-mono.dz-link-hover.w-full(:href="giveaway.topUpLink") {{ giveaway.topUpLink }}
</template>

<style lang="scss" scoped>
.attribute-wrapper {
  @apply flex flex-col items-center text-center;
}

.attribute-label {
  @apply font-bold text-xl;
}
</style>
