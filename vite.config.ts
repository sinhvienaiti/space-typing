import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "/",
  server: {
    allowedHosts: ["space.typing-game.local"],
    proxy: {
      // Preserve the browser Host for the local session issuer's allowlist.
      "/api/duel/session": { target: "http://127.0.0.1:3014", changeOrigin: false },
      "/duel": { target: "ws://127.0.0.1:3014", ws: true, changeOrigin: false },
    },
  },
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        game: resolve(projectRoot, "index.html"),
        adminPreview: resolve(projectRoot, "admin-preview.html"),
      },
    },
  },
});
