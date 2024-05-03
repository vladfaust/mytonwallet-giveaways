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
  amount: 0,
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

<template>
  <div class="flex flex-col items-center gap-y-2">
    <h1>Create giveaway</h1>
    <form
      @submit.prevent="submit"
      class="grid gap-y-2 gap-x-2 p-3 bg-gray-800 rounded-lg"
      style="grid-template-columns: repeat(2, auto)"
    >
      <!-- Type. -->
      <div class="label-wrapper">
        <label for="type">Type</label>
      </div>
      <select id="type" v-model="model.type">
        <option value="instant">Instant</option>
        <option value="lottery">Lottery</option>
      </select>

      <!-- Ends at. -->
      <div class="label-wrapper">
        <label for="endsAt">Ends at</label>
      </div>
      <input
        id="endsAt"
        type="datetime-local"
        v-model="model.endsAt"
        :class="{ 'border-error-500': errors.endsAt }"
      />
      <!-- <div></div>
      <p class="info">ℹ️ When does the giveaway end?</p> -->
      <template v-if="errors.endsAt">
        <div></div>
        <p class="error">❌ {{ errors.endsAt }}</p>
      </template>

      <!-- Token address. -->
      <div class="label-wrapper">
        <label for="tokenAddress">Token address</label>
      </div>
      <!-- TODO: Enable custom addresses. -->
      <input
        id="tokenAddress"
        type="text"
        v-model="model.tokenAddress"
        placeholder="Leave empty for Toncoin"
        disabled
      />

      <!-- Amount. -->
      <div class="label-wrapper">
        <label for="amount">Token amount</label>
      </div>
      <input
        id="amount"
        type="number"
        min="0"
        step="any"
        v-model="model.amount"
        :class="{ 'border-error-500': errors.amount }"
        placeholder="Token amount (in wei)"
      />
      <!-- <div></div>
      <p class="info">ℹ️ How much tokens is given to a winner?</p> -->
      <template v-if="errors.amount">
        <div></div>
        <p class="error">❌ {{ errors.amount }}</p>
      </template>

      <!-- Receiver count. -->
      <div class="label-wrapper">
        <label for="receiverCount">Receiver count</label>
      </div>
      <input
        id="receiverCount"
        type="number"
        min="1"
        v-model="model.receiverCount"
        placeholder="Receiver count"
      />
      <!-- <div></div>
      <p class="info">ℹ️ What is the maximum number of winners?</p> -->

      <!-- Task URL. -->
      <div class="label-wrapper">
        <label for="taskUrl">Task URL</label>
      </div>
      <input
        id="taskUrl"
        type="url"
        v-model="model.taskUrl"
        placeholder="http://example.com/task"
      />
      <!-- <div></div>
      <p class="info">ℹ️ Is there a task to complete?</p> -->

      <!-- Secret. -->
      <div class="label-wrapper">
        <label for="secret">Secret</label>
      </div>
      <input
        id="secret"
        type="password"
        autocomplete="off"
        v-model="model.secret"
        :class="{ 'border-error-500': errors.secret }"
      />
      <template v-if="errors.secret">
        <div></div>
        <p class="error">❌ {{ errors.secret }}</p>
      </template>

      <button class="col-span-full btn-primary" :disabled="!isValid">
        Create
      </button>
    </form>
  </div>
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

  p.info {
    @apply -my-1 text-sm;
  }

  p.error {
    @apply -my-1 text-error-500 text-sm;
  }
}
</style>
