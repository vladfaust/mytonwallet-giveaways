<script setup lang="ts">
import { CopyCheckIcon, CopyIcon } from "lucide-vue-next";
import { type Ref } from "vue";

defineProps<{
  clipboard: {
    copy: (text: string) => void;
    copied: Ref<boolean>;
  };
  value: string;
  iconSize: number;
}>();
</script>

<template lang="pug">
button(@click="clipboard.copy(value)" role="button")
  CopyCheckIcon.text-success(v-if="clipboard.copied.value" :size="iconSize")
  CopyIcon(v-else :size="iconSize")
</template>
