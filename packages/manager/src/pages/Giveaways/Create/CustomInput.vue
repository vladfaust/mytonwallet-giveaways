<script setup lang="ts">
import { CircleHelpIcon, OctagonAlertIcon } from "lucide-vue-next";
import { ref } from "vue";

defineProps<{
  id: string;
  label: string;
  tip?: string;
  error: string | null;
}>();

const showTooltip = ref(false);
</script>

<template lang="pug">
label.label(
  :for="id"
  :class="{ 'text-error': error }"
  @click="showTooltip = !showTooltip"
)
  | {{ label }}
  CircleHelpIcon.-mb-px.ml-1.inline-block.align-top(
    :size="20"
    :stroke-width="2.5"
    v-if="tip"
    :class="{ 'text-info': showTooltip }"
  )

.input-wrapper
  slot
  .flex.items-center.error.gap-3(v-if="error")
    OctagonAlertIcon(:size="22")
    p {{ error }}

p.info.col-span-full(v-if="tip && showTooltip") {{ tip }}
</template>

<style lang="scss" scoped>
.label {
  @apply cursor-pointer pressable transition-transform select-none flex bg-base-300 px-3 py-2 rounded-lg items-center text-center justify-center font-bold leading-tight;
}

.input-wrapper {
  @apply flex flex-col gap-2 justify-center;
}

.alert {
  @apply font-semibold px-3 py-3 rounded-r-lg rounded-bl-lg leading-tight;
}

.error {
  @apply alert text-error bg-base-300;
}

.info {
  @apply alert text-info bg-base-300;
}
</style>
