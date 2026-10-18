import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

type CssNode = { type: string; name?: string; params?: string; selectors?: string[]; parent?: CssNode; nodes?: CssNode[] };
type CssAtRule = CssNode & {
  walkRules(callback: (rule: CssNode & { selectors: string[] }) => void): void;
  replaceWith(...nodes: CssNode[]): void;
};

/**
 * `@media (prefers-reduced-motion: reduce) { … }` → `[data-motion="reduced"] …`.
 * The game decides reduced motion itself (src/ui/motion-preference.ts): Windows'
 * "Animation effects" switch is often off for speed, and it used to turn off
 * every menu animation. Only the plain query is rewritten.
 */
function reducedMotionAttribute() {
  const flag = '[data-motion="reduced"]';
  return {
    postcssPlugin: "space-typing-reduced-motion-attribute",
    AtRule: {
      // postcss types are not a direct dependency; the node is typed locally.
      media(node: unknown) {
        const atRule = node as CssAtRule;
        if (!/^\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)$/.test((atRule.params ?? "").trim())) return;
        atRule.walkRules((rule) => {
          if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name ?? "")) return;
          rule.selectors = rule.selectors.map((selector) => {
            const trimmed = selector.trim();
            if (trimmed.startsWith(":root")) return ":root" + flag + trimmed.slice(5);
            if (/^html\b/.test(trimmed)) return "html" + flag + trimmed.slice(4);
            return flag + " " + trimmed;
          });
        });
        atRule.replaceWith(...(atRule.nodes ?? []));
      },
    },
  };
}
reducedMotionAttribute.postcss = true;

export default defineConfig({
  base: "/",
  css: {
    postcss: { plugins: [reducedMotionAttribute()] },
  },
  server: {
    allowedHosts: ["space.typing-game.local"],
    proxy: {
      // Runtime Admin policy is read-only and same-origin in production; proxy
      // it in dev so local game sessions exercise the identical contract.
      "/api/runtime/space-typing": { target: "http://127.0.0.1:3199", changeOrigin: false },
      // Preserve the browser Host for the local session issuer's allowlist.
      "/api/duel/session": { target: "http://127.0.0.1:3014", changeOrigin: false },
      // Accounts, cloud save and server-side Daily Hub (server/account).
      "/api/account": { target: "http://127.0.0.1:3016", ws: true, changeOrigin: false },
      "/duel": { target: "ws://127.0.0.1:3014", ws: true, changeOrigin: false },
    },
  },
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        game: resolve(projectRoot, "index.html"),
        adminPreview: resolve(projectRoot, "admin-preview.html"),
        // Winged-character feasibility demo (docs/CHARACTER_DEMO_2026-10-17.md).
        characterDemo: resolve(projectRoot, "character-demo.html"),
        // Campaign 3D (beta): the Campaign flown by Draconis (docs/CAMPAIGN_3D_2026-10-17.md).
        campaign3d: resolve(projectRoot, "campaign-3d.html"),
        // Defense render bench: only when asked for (SPACE_BENCH=1), never in a normal build.
        ...(process.env.SPACE_BENCH === "1" ? { defenseBench: resolve(projectRoot, "defense-bench.html") } : {}),
      },
    },
  },
});