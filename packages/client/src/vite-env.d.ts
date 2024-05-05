/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_TONCONNECT_MANIFEST_URL: string;
  VITE_BACKEND_URL: string;
  VITE_TON_MAINNET: string;
}

declare module "vue-wrap-balancer" {}
