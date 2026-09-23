import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2];

if (source === undefined) {
  throw new Error(
    "Usage: node scripts/install-ship-v3.mjs <path-to-player-ships-v3.webp>",
  );
}

const EXPECTED_SHA256 =
  "fb9434e002d6da650e34192eb425e62d1e2f3bec8804a9b33b7aa8733de10eb3";
const EXPECTED_BYTES = 800054;
const raw = readFileSync(resolve(source));
const digest = createHash("sha256").update(raw).digest("hex");

if (digest !== EXPECTED_SHA256 || raw.length !== EXPECTED_BYTES) {
  throw new Error(
    "Ship V3 atlas does not match the reviewed generated art package. " +
      "Do not install or register an unknown/modified image without reviewing it.",
  );
}

const manifestPath = join(
  root,
  "public/assets/space-typing/manifest.json",
);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const id = "player-ship-sheet-v3";
const url = "/assets/space-typing/ships/player-ships-v3.webp";
const entry = {
  id,
  category: "player",
  sourceType: "generated",
  source: "Eleven generated premium ship sprites, reviewed 4x3 256px atlas",
  author: "Space Typing project",
  license: "Project-original generated asset; review provenance before public distribution",
  attributionRequired: false,
  url,
};

const target = join(root, "public", url.slice(1));
mkdirSync(dirname(target), { recursive: true });
if (resolve(source) !== target) copyFileSync(resolve(source), target);

const position = manifest.entries.findIndex(
  (candidate) => candidate.id === "player-ship-sheet-v2",
);
if (position < 0) {
  throw new Error("Cannot register V3: the existing V2 fallback asset is missing.");
}
const already = manifest.entries.findIndex((candidate) => candidate.id === id);
if (already >= 0) {
  manifest.entries[already] = entry;
} else {
  manifest.entries.splice(position + 1, 0, entry);
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

console.log(
  "Ship V3 installed: 11 generated ships, 1024x768, " +
    String(EXPECTED_BYTES) +
    " bytes. Run pnpm build to enforce the atlas and bundle budgets.",
);
