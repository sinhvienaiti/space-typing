import { defineConfig } from "vite";

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
  },
});
