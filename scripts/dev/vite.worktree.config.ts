// Dev-only: the dev server for a Git worktree whose node_modules is a symlink
// to the main checkout (docs/td/BUILD_NOTES.md §2). With the plain config, Vite
// answers 403 for files under the symlink's real path (the Be Vietnam Pro
// fonts), keeps its dependency cache in the main checkout's node_modules/.vite,
// and has none of the media that is never committed (models, ship art), so
// Rift Defense cannot load a map. This config allows the real node_modules
// path, keeps the cache in the system temp folder, and serves a public file
// the worktree lacks from the main checkout's public/, read-only. The
// worktree's own public files still win; vite.config.ts is unchanged. It also
// serves /vocabulary/ from the repository's shared/vocabulary, read-only, as
// the nginx dev config does (infra/nginx/typing-game.local.dev.conf), so pages
// that load the shared word lists (td.html) get real words on 127.0.0.1.
//   npx vite --config scripts/dev/vite.worktree.config.ts --host 127.0.0.1 --port 3110 --strictPort
import { createReadStream, existsSync, realpathSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, UserConfig } from "vite";
import base from "../../vite.config";

const root = fileURLToPath(new URL("../..", import.meta.url)).replace(/[\\/]$/, "");
const modules = realpathSync(join(root, "node_modules"));
const mainPublic = join(dirname(modules), "public");
const vocabulary = join(root, "..", "..", "shared", "vocabulary");

const TYPES: Record<string, string> = {
  ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".bin": "application/octet-stream", ".ktx2": "image/ktx2",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml",
  ".json": "application/json", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".mp4": "video/mp4", ".webm": "video/webm",
};

function mainCheckoutPublic(): Plugin {
  return {
    name: "worktree-main-checkout-public",
    apply: "serve",
    configureServer(server) {
      const linked = modules !== join(root, "node_modules");
      server.middlewares.use((req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") return next();
        let path: string;
        try {
          path = decodeURIComponent((req.url ?? "/").split("?")[0]!);
        } catch {
          return next();
        }
        const shared = path.startsWith("/vocabulary/");
        const folder = shared ? vocabulary : mainPublic;
        const file = normalize(shared ? join(vocabulary, path.slice("/vocabulary/".length)) : join(mainPublic, path));
        if (!shared && (!linked || existsSync(join(root, "public", path)))) return next();
        if (!file.startsWith(folder + sep) || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader("Content-Type", TYPES[extname(file).toLowerCase()] ?? "application/octet-stream");
        res.setHeader("Cache-Control", "no-cache");
        if (req.method === "HEAD") return void res.end();
        createReadStream(file).pipe(res);
      });
    },
  };
}

const config: UserConfig = {
  ...base,
  cacheDir: join(tmpdir(), "vite-worktree-" + basename(root)),
  plugins: [...(base.plugins ?? []), mainCheckoutPublic()],
  server: { ...base.server, fs: { ...base.server?.fs, allow: [root, modules] } },
};

export default config;
