#!/usr/bin/env node
/**
 * Lists the painted Style Shop art that exists, so the game only requests
 * pictures that are really there (src/ui/cosmetic-look.ts).
 *   pnpm cosmetics:manifest
 * Reads public/assets/space-typing/cosmetics/{avatars,frames,banners}/<id>.webp
 * and writes public/assets/space-typing/cosmetics/manifest.json.
 */
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../public/assets/space-typing/cosmetics/", import.meta.url));
const ids = [];
for (const folder of ["avatars", "frames", "banners"]) {
  const dir = join(root, folder);
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir)) if (file.endsWith(".webp")) ids.push(file.slice(0, -5));
}
ids.sort();
writeFileSync(join(root, "manifest.json"), JSON.stringify({ version: 1, ids }, null, 2) + "\n");
console.log("cosmetics manifest: " + ids.length + " painted items");
