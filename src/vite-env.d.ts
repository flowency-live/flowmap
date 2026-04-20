/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '../amplify_outputs.json' {
  const outputs: Record<string, unknown>;
  export default outputs;
}
