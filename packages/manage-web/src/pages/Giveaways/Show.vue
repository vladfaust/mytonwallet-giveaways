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

<template>
  <code>{{ giveaway }}</code>
</template>
