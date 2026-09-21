import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  server: {
    allowedHosts: ["space.typing-game.local"],
  },
  build: {
    target: "es2022",
  },
});
