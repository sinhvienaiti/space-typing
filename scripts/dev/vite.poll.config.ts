// Dev-only (Windows + WSL): the repo lives on a Windows drive (/mnt/d) where WSL
// gets no file events for edits made from Windows, so Vite watches by polling —
// only the source; the 1+ GB art zips and assets are left out.
//   pnpm exec vite --config scripts/dev/vite.poll.config.ts --host 127.0.0.1 --port 3098 --strictPort
import base from "../../vite.config";

export default {
  ...base,
  server: {
    ...base.server,
    watch: {
      usePolling: true,
      interval: 400,
      binaryInterval: 3000,
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/art-src/**",
        "**/*.zip",
        "**/output/**",
        "**/dist/**",
        "**/.visual/**",
        "**/.account-local/**",
        "**/.duel-local/**",
        "**/docs/**",
        "**/public/**",
        "**/tests/**",
        "**/cloud/**",
        "**/server/**",
        "**/scripts/**",
      ],
    },
  },
};
