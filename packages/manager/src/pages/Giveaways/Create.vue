<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { routeLocation } from "../../router";

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
.flex.flex-col.items-center.gap-y-2
  h1 Create giveaway
  form.grid.gap-y-2.gap-x-2.p-3.bg-gray-800.rounded-lg(
    @submit.prevent="submit"
    style="grid-template-columns: repeat(2, auto)"
  )
    //-Type.
    .label-wrapper
      label(for="type") Type
    select#type(v-model="model.type")
      option(value="instant") Instant
      option(value="lottery") Lottery

    //-Ends at.
    .label-wrapper
      label(for="endsAt") Ends at
    input#endsAt(
      type="datetime-local"
      v-model="model.endsAt"
      :class="{ 'border-error-500': errors.endsAt }"
    )
    template(v-if="errors.endsAt")
      div
      p.error ❌ {{ errors.endsAt }}

    //-Token address.
    .label-wrapper
      label(for="tokenAddress") Token address
    input#tokenAddress(
      type="text"
      v-model="model.tokenAddress"
      placeholder="Leave empty for Toncoin"
      disabled
    )

    //-Amount.
    .label-wrapper
      label(for="amount") Token amount
    input#amount(
      type="number"
      min="0"
      step="any"
      v-model="model.amount"
      :class="{ 'border-error-500': errors.amount }"
      placeholder="Token amount (e.g. 1.0)"
    )
    template(v-if="errors.amount")
      div
      p.error ❌ {{ errors.amount }}

    //-Receiver count.
    .label-wrapper
      label(for="receiverCount") Receiver count
    input#receiverCount(
      type="number"
      min="1"
      v-model="model.receiverCount"
      placeholder="Receiver count"
    )

    //-Task URL.
    .label-wrapper
      label(for="taskUrl") Task URL
    input#taskUrl(
      type="url"
      v-model="model.taskUrl"
      placeholder="http://example.com/task"
    )

    //-Secret.
    .label-wrapper
      label(for="secret") Secret
    input#secret(
      type="password"
      autocomplete="off"
      v-model="model.secret"
      :class="{ 'border-error-500': errors.secret }"
    )
    template(v-if="errors.secret")
      div
      p.error ❌ {{ errors.secret }}

    button.btn-primary.col-span-full(:disabled="!isValid") Create
</template>

<style lang="scss" scoped>
form {
  input,
  select {
    @apply border w-full rounded px-2 py-1;
  }

  .label-wrapper {
    @apply flex items-center justify-end font-semibold;
  }

  p.error {
    @apply -my-1 text-error-500 text-sm;
  }
}
</style>
