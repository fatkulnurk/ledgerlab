/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LEDGER_API_URL?: string;
  readonly VITE_REPORTING_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
