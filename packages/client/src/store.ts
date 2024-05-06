import { useLocalStorage } from "@vueuse/core";

/**
 * JWT is stored in the local storage, reactively.
 */
export const jwt = useLocalStorage<string | undefined>(
  // NOTE: I use the prefix because I have many projects on the same, local host.
  "mytonwallet-giveaways:jwt",
  undefined,
);
