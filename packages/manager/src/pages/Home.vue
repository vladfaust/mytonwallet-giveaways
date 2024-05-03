<script lang="ts" setup>
import { routeLocation } from "../router";
</script>

<template lang="pug">
.grid.place-items-center.h-screen.p-3
  .flex.flex-col.items-center.gap-2
    h1.text-xl.font-semibold.tracking-wide Welcome to Giveaways Manager!
    RouterLink.dz-btn.dz-btn-primary(
      :to="routeLocation({ name: 'CreateGiveaway' })"
    ) Create a giveaway
</template>
