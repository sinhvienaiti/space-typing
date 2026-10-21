/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** An internal QA build that keeps the Developer Test Lab (SPACE_TEST_LAB=1, vite.config.ts). */
  readonly SPACE_TEST_LAB: boolean;
  /** A build that may play the owner's private public/local-assets audio (SPACE_LOCAL_ASSETS=1, vite.config.ts). */
  readonly SPACE_LOCAL_ASSETS: boolean;
}
