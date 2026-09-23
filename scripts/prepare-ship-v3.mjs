import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(root, "assets/ship-v3");
const output = join(
  root,
  "public/assets/space-typing/ships/player-ships-v3.avif",
);
const expectedSha256 =
  "338a4c46c0381f1637746144e04ef64ea179c5291a15fec22cc9b715ba54d24f";
const partCount = 6;
const parts = Array.from({ length: partCount }, (_, i) =>
  join(sourceDir, String(i).padStart(2, "0") + ".b64"),
);

if (!parts.every(existsSync)) {
  console.log("Ship V3 source unavailable; retaining V2 fallback.");
  process.exit(0);
}

const base64 = parts.map((path) => readFileSync(path, "utf8").trim()).join("");
if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
  throw new Error("Ship V3 source must contain only valid base64.");
}
const image = Buffer.from(base64, "base64");
const hash = createHash("sha256").update(image).digest("hex");
if (hash !== expectedSha256) {
  throw new Error("Ship V3 atlas source checksum mismatch.");
}

if (
  existsSync(output) &&
  createHash("sha256")
    .update(readFileSync(output))
    .digest("hex") === expectedSha256
) {
  console.log("Ship V3 atlas verified and unchanged.");
  process.exit(0);
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, image);
console.log(
  "Prepared Ship V3 atlas (" +
    String(image.length) +
    " bytes, checksum verified).",
);
