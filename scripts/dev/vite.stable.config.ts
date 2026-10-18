// Dev-only screenshot server: the polling config without HMR, so an edit made by
// someone else never reloads a page in the middle of a capture (changes apply on
// the next full page load).
//   pnpm exec vite --config scripts/dev/vite.stable.config.ts --host 127.0.0.1 --port 3097 --strictPort
import poll from "./vite.poll.config";

export default {
  ...poll,
  server: { ...poll.server, hmr: false },
};
