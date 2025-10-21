/// <reference types="vite/client" />

interface Window {
  Buffer: typeof Buffer;
  process: any;
}

interface ImportMetaEnv {
  readonly VITE_PRIVY_APP_ID: string;
  readonly VITE_CONTRACT_ADDRESS: string;
  readonly VITE_CHAIN_ID: string;
  readonly VITE_RPC_URL: string;
  readonly VITE_GATEWAY_URL: string;
  readonly VITE_ACL_ADDRESS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}