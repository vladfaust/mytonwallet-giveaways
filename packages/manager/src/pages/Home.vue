<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { type Giveaway, db } from "../lib/db";
import { routeLocation } from "../router";
import { RouterLink } from "vue-router";
import { ChevronRightCircleIcon } from "lucide-vue-next";

const giveaways = ref<Giveaway[]>([]);

onMounted(() => {
  db.giveaways
    .orderBy("createdAt")
    .reverse()
    .toArray()
    .then((result) => {
      giveaways.value = result;
    });
});
</script>

<template lang="pug">
.flex.flex-col.p-3.items-center
  .flex.flex-col.items-center.gap-2.w-full.max-w-sm
    h1.text-2xl.font-bold.tracking-wider.uppercase.italic Giveaways Manager
    .flex.flex-col.items-center.gap-2.w-full.bg-base-200.p-3.rounded-lg
      RouterLink.normal-case.justify-between.dz-btn.dz-btn-neutral.w-full(
        v-for="giveaway of giveaways"
        :key="giveaway.id"
        :to="routeLocation({ name: 'ShowGiveaway', params: { giveawayId: giveaway.id } })"
      )
        //- TODO: For rich giveaway information, fetch API.
        .flex.flex-col.items-start
          span {{ giveaway.id }}
        ChevronRightCircleIcon(:size="24")
      RouterLink.dz-btn.dz-btn-primary.w-full(
        :to="routeLocation({ name: 'CreateGiveaway' })"
      ) Create a giveaway
</template>
