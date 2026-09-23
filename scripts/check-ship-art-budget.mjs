import { readFileSync, statSync } from "node:fs";
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
  console.log("Ship V3 atlas: not registered yet; existing V2 art remains active.");
  process.exit(0);
}

const allowedPaths = [
  "/assets/space-typing/ships/player-ships-v3.webp",
  "/assets/space-typing/ships/player-ships-v3.png",
  "/assets/space-typing/ships/player-ships-v3.avif",
];

if (
  entry.category !== "player" ||
  entry.sourceType !== "generated" ||
  !allowedPaths.includes(entry.url)
) {
  throw new Error("Ship V3 must be a project-original raster atlas at the approved asset path.");
}

const path = join(root, "public", entry.url.slice(1));
const bytes = statSync(path).size;
const MAX_FILE_BYTES = Math.floor(1.2 * 1024 * 1024);

if (bytes > MAX_FILE_BYTES) {
  throw new Error(
    "Ship V3 atlas exceeds hard 1.2 MiB budget: " +
      String(bytes) +
      " bytes.",
  );
}

const buffer = readFileSync(path);
let width = 0;
let height = 0;

if (entry.url.endsWith(".avif")) {
  if (buffer.length < 36 || buffer.toString("ascii", 4, 8) !== "ftyp") {
    throw new Error("Ship V3 AVIF has an invalid ftyp box.");
  }
  const brand = buffer.toString("ascii", 8, 12);
  if (brand !== "avif") {
    throw new Error("Ship V3 requires a still-picture AVIF, not animation.");
  }
  // AVIF's ispe image spatial extents describe decoded canvas dimensions.
  const ispe = buffer.indexOf(Buffer.from("ispe"));
  if (ispe < 0 || ispe + 16 > buffer.length) {
    throw new Error("Ship V3 AVIF has no ispe image dimensions.");
  }
  width = buffer.readUInt32BE(ispe + 8);
  height = buffer.readUInt32BE(ispe + 12);
} else if (entry.url.endsWith(".png")) {
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
  "Ship V3 art budget PASS: " +
    width +
    "×" +
    height +
    ", " +
    (bytes / 1024).toFixed(1) +
    " KiB transfer, 3.0 MiB maximum decoded RGBA.",
);
