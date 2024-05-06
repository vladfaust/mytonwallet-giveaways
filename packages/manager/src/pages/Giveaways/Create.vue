<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { routeLocation } from "../../router";
import { RocketIcon } from "lucide-vue-next";
import CustomInput from "./Create/CustomInput.vue";
import { db } from "../../lib/db";
import { asyncComputed } from "@vueuse/core";
import { getJettonData } from "../../lib/api";

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
  amount: 1,
  receiverCount: 1,
  taskUrl: null,
  secret: "",
});

const jettonDataEvaluting = ref(false);
const jettonData = asyncComputed(
  () =>
    model.value.tokenAddress ? getJettonData(model.value.tokenAddress) : null,
  null,
  { evaluating: jettonDataEvaluting },
);

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

  let receiverCount: string | null = null;
  if (model.value.receiverCount <= 0) {
    receiverCount = "Receiver count must be greater than 0.";
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
    receiverCount,
    taskUrl: null,
    secret,
  };
});

const isValid = computed(() => {
  return Object.values(errors.value).every((error) => error === null);
});

async function submit() {
  if (!isValid.value) return;

  const { id, taskToken } = await fetch(
    import.meta.env.VITE_API_URL + "/giveaways",
    {
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
    },
  ).then((res) => res.json());

  await db.giveaways.add({
    id,
    taskToken,
    createdAt: new Date(),
  });

  router.push(
    routeLocation({ name: "ShowGiveaway", params: { giveawayId: id } }),
  );
}
</script>

<template lang="pug">
.flex.flex-col.items-center.gap-2.py-3.w-full(class="sm:px-3")
  h1.text-2xl.font-bold.tracking-wider.uppercase.italic Create giveaway
  form.grid.gap-y-3.gap-x-2.p-3.bg-base-200.rounded-xl.max-w-md.w-full.overflow-hidden(
    @submit.prevent="submit"
    style="grid-template-columns: minmax(min-content, 10rem) auto"
  )
    //- Type.
    CustomInput#type(
      label="Type"
      :error="errors.type"
      tip="Instant giveaways are distributed instantly, while lottery giveaways are distributed at the end of the giveaway."
    )
      select#type.dz-select.dz-select-bordered(v-model="model.type")
        option(value="instant") ⚡️ Instant
        option(value="lottery") 🎲 Lottery

    //- Ends at.
    CustomInput#endsAt(label="Ends at" :error="errors.endsAt")
      input#endsAt.dz-input.dz-input-bordered(
        type="datetime-local"
        v-model="model.endsAt"
        :class="{ 'dz-input-error': errors.endsAt }"
      )

    //- Token address.
    CustomInput#tokenAddress(
      label="Token address"
      :error="errors.tokenAddress"
    )
      input#tokenAddress.dz-input.dz-input-bordered(
        type="text"
        v-model="model.tokenAddress"
        placeholder="Leave empty for Toncoin"
      )

    //- Receiver count.
    CustomInput#receiverCount(
      label="Max. winners"
      :error="errors.receiverCount"
    )
      input#receiverCount.dz-input.dz-input-bordered(
        type="number"
        min="1"
        v-model="model.receiverCount"
        :class="{ 'dz-input-error': errors.receiverCount }"
        placeholder="Receiver count"
      )

    //- Amount.
    CustomInput#amount(label="Prize per winner" :error="errors.amount")
      .dz-join
        input#amount.dz-input.dz-input-bordered.dz-join-item.w-full(
          type="number"
          min="0"
          step="any"
          v-model="model.amount"
          :class="{ 'dz-input-error': errors.amount }"
          placeholder="Token amount (e.g. 1.0)"
        )
        .shrink-0.rounded-l-none.dz-input.dz-input-bordered.items-center.flex
          b(v-if="!jettonDataEvaluting") {{ jettonData?.metadata.metadata.symbol || "TON" }}
          .dz-loading.dz-loading-spinner.dz-loading-sm(v-else)

    //- Task URL.
    CustomInput#taskUrl(
      label="Task URL"
      :error="errors.taskUrl"
      tip="For giveaways with tasks, a participant must complete the task to receive the prize."
    )
      input#taskUrl.dz-input.dz-input-bordered(
        type="url"
        v-model="model.taskUrl"
        placeholder="http://example.com/task"
        class="placeholder:opacity-50"
      )

    //- Secret.
    CustomInput#secret(label="Secret" :error="errors.secret")
      input#secret.dz-input.dz-input-bordered(
        type="password"
        autocomplete="off"
        v-model="model.secret"
        :class="{ 'dz-input-error': errors.secret }"
      )

    button.dz-btn.dz-btn-primary.col-span-full(:disabled="!isValid")
      RocketIcon(:size="20")
      | Create
</template>
