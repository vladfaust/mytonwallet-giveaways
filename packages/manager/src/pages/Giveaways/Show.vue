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
.flex.flex-col.items-center.gap-y-2
  h1 Giveaway
  .grid.gap-y-2.gap-x-2.p-3.bg-gray-800.overflow-hidden.rounded-lg.w-full.max-w-md(
    v-if="giveaway"
    style="grid-template-columns: repeat(2, auto)"
  )
    span.attribute ID
    span {{ giveaway.id }}

    span.attribute Type
    span {{ giveaway.type }}

    template(v-if="giveaway.endsAt")
      span.attribute Ends at
      span {{ giveaway.endsAt }}

    template(v-if="giveaway.tokenAddress")
      span.attribute Token address
      span {{ giveaway.tokenAddress }}

    span.attribute Amount
    span {{ giveaway.amount }}

    span.attribute Receiver count
    span {{ giveaway.receiverCount }}

    template(v-if="giveaway.taskUrl")
      span.attribute Task URL
      span {{ giveaway.taskUrl }}

    span.attribute Status
    span {{ giveaway.status }}

    span.attribute Participant count
    span {{ giveaway.participantCount }}

    span.attribute Giveaway link
    a.overflow-x-scroll.text-nowrap(:href="giveaway.giveawayLink") {{ giveaway.giveawayLink }}

    span.attribute Top-up link
    a.overflow-x-scroll.text-nowrap(:href="giveaway.topUpLink") {{ giveaway.topUpLink }}
</template>

<style lang="scss" scoped>
.attribute {
  @apply font-bold text-nowrap text-right;
}
</style>
