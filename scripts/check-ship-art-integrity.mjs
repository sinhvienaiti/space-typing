import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(join(root, "public/assets/space-typing/manifest.json"), "utf8"),
);

const entry = manifest.entries.find(
  (asset) => asset.id === "player-ship-sheet-v3",
);

if (entry === undefined) {
  const orphaned = [
    "player-ships-v3.webp",
    "player-ships-v3.png",
  ].filter((name) =>
    existsSync(join(root, "public/assets/space-typing/ships", name)),
  );
  if (orphaned.length > 0) {
    throw new Error(
      "Ship V3 raster file exists but is not in the art manifest. " +
        "Run node scripts/install-ship-v3.mjs <path-to-atlas> to register it.",
    );
  }
  console.log("Ship V3 atlas: not registered yet; existing V2 art remains active.");
  process.exit(0);
}

const allowedPaths = [
  "/assets/space-typing/ships/player-ships-v3.webp",
  "/assets/space-typing/ships/player-ships-v3.png",
];

if (
  entry.category !== "player" ||
  entry.sourceType !== "generated" ||
  !allowedPaths.includes(entry.url)
) {
  throw new Error("Ship V3 must be a project-original raster atlas at the approved asset path.");
}

const path = join(root, "public", entry.url.slice(1));
const buffer = readFileSync(path);
const EXPECTED_REVIEWED_SHA256 =
  "fb9434e002d6da650e34192eb425e62d1e2f3bec8804a9b33b7aa8733de10eb3";
const digest = createHash("sha256").update(buffer).digest("hex");
// This is the reviewed 11-ship V3 production atlas. If replacing the art,
// review it again, then deliberately update both installer and build guard.
if (digest !== EXPECTED_REVIEWED_SHA256) {
  throw new Error(
    "Ship V3 atlas differs from the reviewed artwork (SHA-256: " +
      digest +
      "). Do not silently ship unreviewed art.",
  );
}
let width = 0;
let height = 0;

if (entry.url.endsWith(".png")) {
  const signature = Buffer.from("89504e470d0a1a0a", "hex");
  if (!buffer.subarray(0, 8).equals(signature) || buffer.length < 24) {
    throw new Error("Ship V3 PNG has an invalid image header.");
  }
  width = buffer.readUInt32BE(16);
  height = buffer.readUInt32BE(20);
} else {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error("Ship V3 WebP has an invalid RIFF header.");
  }
  const type = buffer.toString("ascii", 12, 16);
  if (type === "VP8X") {
    if ((buffer[20] & 0x02) !== 0) {
      throw new Error("Ship V3 WebP must not be animated.");
    }
    width =
      1 + buffer[24] + (buffer[25] << 8) + (buffer[26] << 16);
    height =
      1 + buffer[27] + (buffer[28] << 8) + (buffer[29] << 16);
  } else if (type === "VP8L") {
    if (buffer[20] !== 0x2f) {
      throw new Error("Ship V3 lossless WebP has an invalid header.");
    }
    width =
      1 + (buffer[21] | ((buffer[22] & 0x3f) << 8));
    height =
      1 +
      (((buffer[22] & 0xc0) >> 6) |
        (buffer[23] << 2) |
        ((buffer[24] & 0x0f) << 10));
  } else {
    throw new Error("Ship V3 requires transparent VP8X/VP8L WebP or PNG.");
  }
}

if (width !== 1024 || height !== 768) {
  throw new Error(
    "Ship V3 atlas must be exactly 1024×768 pixels; got " +
      String(width) +
      "×" +
      String(height) +
      ".",
  );
}

console.log(
  "Ship V3 art integrity PASS: " +
    width +
    "×" +
    height +
    ", " +
    (buffer.length / 1024).toFixed(1) +
    " KiB transfer (reported, not size-gated).",
);
