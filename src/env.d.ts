/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_AUTH_API_URL?: string;
  readonly VITE_PUJA_API_URL?: string;
  readonly VITE_CALLING_API_URL?: string;
  readonly VITE_ENABLE_DEV_LAUNCHER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
