<script setup lang="ts">
import { useNow } from "@vueuse/core";
import { computed } from "vue";

const { endsAt } = defineProps<{
  endsAt: Date;
}>();

const now = useNow();

const days = computed(() => {
  const diff = endsAt.getTime() - now.value.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

const hours = computed(() => {
  const diff = endsAt.getTime() - now.value.getTime();
  return Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
});

const minutes = computed(() => {
  const diff = endsAt.getTime() - now.value.getTime();
  return Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
});

const seconds = computed(() => {
  const diff = endsAt.getTime() - now.value.getTime();
  return Math.floor((diff % (1000 * 60)) / 1000);
});
</script>

<template lang="pug">
span.flex.gap-1.p-2
  .flex.flex-col.items-center._countdown-element
    .dz-countdown.text-3xl
      span(:style="{ '--value': days }")
    span._label days
  .flex.flex-col.items-center._countdown-element
    .dz-countdown.text-3xl
      span(:style="{ '--value': hours }")
    span._label hours
  .flex.flex-col.items-center._countdown-element
    .dz-countdown.text-3xl
      span(:style="{ '--value': minutes }")
    span._label min
  .flex.flex-col.items-center._countdown-element
    .dz-countdown.text-3xl
      span(:style="{ '--value': seconds }")
    span._label sec
</template>

<style lang="scss" scoped>
._countdown-element {
  @apply flex flex-col items-center bg-base-200 px-3 py-2 rounded-lg;

  ._label {
    @apply select-none;
  }
}
</style>
