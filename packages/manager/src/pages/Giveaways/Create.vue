<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { routeLocation } from "../../router";
import { OctagonAlertIcon } from "lucide-vue-next";

const router = useRouter();

const model = ref<{
  type: "instant" | "lottery";
  endsAt: string | null;
  tokenAddress: string | null;
  amount: number;
  receiverCount: number;
  taskUrl: string | null;
  secret: string;
}>({
  type: "instant",
  endsAt: null,
  tokenAddress: null,
  amount: 2.5,
  receiverCount: 1,
  taskUrl: null,
  secret: "",
});

const errors = computed<Record<keyof typeof model.value, string | null>>(() => {
  let endsAt: string | null = null;
  if (model.value.endsAt) {
    if (new Date(model.value.endsAt) < new Date()) {
      endsAt = "End date must be in the future.";
    }
  } else {
    if (model.value.type === "lottery") {
      endsAt = "End date is required for lottery giveaways.";
    }
  }

  let amount: string | null = null;
  if (model.value.amount <= 0) {
    amount = "Amount must be greater than 0.";
  }

  let secret: string | null = null;
  if (!model.value.secret) {
    secret = "Secret is required.";
  }

  return {
    type: null,
    endsAt,
    tokenAddress: null,
    amount,
    receiverCount: null,
    taskUrl: null,
    secret,
  };
});

const isValid = computed(() => {
  return Object.values(errors.value).every((error) => error === null);
});

async function submit() {
  if (!isValid.value) return;

  const { id } = await fetch(import.meta.env.VITE_API_URL + "/giveaways", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      giveaway: {
        type: model.value.type,
        endsAt: model.value.endsAt
          ? new Date(model.value.endsAt).toISOString()
          : null,
        tokenAddress: model.value.tokenAddress ?? null,
        amount: model.value.amount.toString(),
        receiverCount: model.value.receiverCount,
        taskUrl: model.value.taskUrl || null,
      },
      secret: model.value.secret,
    }),
  }).then((res) => res.json());

  router.push(
    routeLocation({ name: "ShowGiveaway", params: { giveawayId: id } }),
  );
}
</script>

<template lang="pug">
.flex.flex-col.items-center.gap-y-2.p-3
  h1.text-2xl.font-semibold.tracking-wide.uppercase Create giveaway
  form.grid.gap-y-3.gap-x-3.p-4.bg-base-200.rounded-xl.max-w-md(
    @submit.prevent="submit"
    style="grid-template-columns: repeat(2, auto)"
  )
    //-Type.
    .label-wrapper
      label(for="type") Type
    select#type.dz-select.dz-select-bordered(v-model="model.type")
      option(value="instant") Instant
      option(value="lottery") Lottery

    //-Ends at.
    .label-wrapper
      label(for="endsAt") Ends at
    input#endsAt.dz-input.dz-input-bordered(
      type="datetime-local"
      v-model="model.endsAt"
      :class="{ 'dz-input-error': errors.endsAt }"
    )
    template(v-if="errors.endsAt")
      div
      p.dz-alert.dz-alert-error
        OctagonAlertIcon(:size="24")
        p.font-medium {{ errors.endsAt }}

    //-Token address.
    .label-wrapper
      label(for="tokenAddress") Token address
    input#tokenAddress.dz-input.dz-input-bordered(
      type="text"
      v-model="model.tokenAddress"
      placeholder="Leave empty for Toncoin"
      disabled
    )

    //-Amount.
    .label-wrapper
      label(for="amount") Token amount
    input#amount.dz-input.dz-input-bordered(
      type="number"
      min="0"
      step="any"
      v-model="model.amount"
      :class="{ 'dz-input-error': errors.amount }"
      placeholder="Token amount (e.g. 1.0)"
    )
    template(v-if="errors.amount")
      div
      p.dz-alert.dz-alert-error
        OctagonAlertIcon(:size="24")
        p.font-medium {{ errors.amount }}

    //-Receiver count.
    .label-wrapper
      label(for="receiverCount") Receiver count
    input#receiverCount.dz-input.dz-input-bordered(
      type="number"
      min="1"
      v-model="model.receiverCount"
      placeholder="Receiver count"
    )

    //-Task URL.
    .label-wrapper
      label(for="taskUrl") Task URL
    input#taskUrl.dz-input.dz-input-bordered(
      type="url"
      v-model="model.taskUrl"
      placeholder="http://example.com/task"
    )

    //-Secret.
    .label-wrapper
      label(for="secret") Secret
    input#secret.dz-input.dz-input-bordered(
      type="password"
      autocomplete="off"
      v-model="model.secret"
      :class="{ 'dz-input-error': errors.secret }"
    )
    template(v-if="errors.secret")
      div
      p.dz-alert.dz-alert-error
        OctagonAlertIcon(:size="24")
        p.font-medium {{ errors.secret }}

    button.dz-btn-lg.dz-btn.dz-btn-primary.col-span-full(:disabled="!isValid") Create
</template>

<style lang="scss" scoped>
form {
  .label-wrapper {
    @apply flex items-center text-right justify-end font-semibold leading-tight;
  }
}
</style>
