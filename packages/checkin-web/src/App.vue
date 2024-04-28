<script setup lang="ts">
import { useRoute } from "vue-router";
const route = useRoute();
</script>

<template>
  <RouterView v-slot="{ Component }">
    <component :is="Component" :key="route.path" />
  </RouterView>
</template>
