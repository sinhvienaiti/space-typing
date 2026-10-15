#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import sharp from "sharp";
import {
  crop,
  findInput,
  readArt,
  ROOT,
  sha256,
} from "./art-common.mjs";

const SOURCE_ROOT = join(ROOT, "art-src/duel-targets");
const OUTPUT_ROOT = join(
  ROOT,
  "public/assets/space-typing/duel-targets",
);

const TARGET_IDS = [
  "laser",
  "missile",
  "railgun",
  "bomb",
  "siege-lance",
  "shield",
  "reflect",
  "barrier",
  "repair",
  "energy",
  "amplify",
  "drone",
  "lock-on",
  "gravity",
  "disrupt",
  "scan",
  "fate-crystal",
  "black-hole",
];

const MAX_SIZE = 512;

function alphaBounds(image) {
  let x0 = image.width;
  let y0 = image.height;
  let x1 = -1;
  let y1 = -1;
  let alphaPixels = 0;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.data[(y * image.width + x) * 4 + 3];
      if (alpha <= 4) continue;
      alphaPixels += 1;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }

  if (x1 < 0) return null;
  return {
    x0,
    y0,
    x1,
    y1,
    alphaCoverage:
      alphaPixels / Math.max(1, image.width * image.height),
  };
}

function hasRealTransparency(image) {
  let transparent = 0;
  let opaque = 0;
  for (let offset = 3; offset < image.data.length; offset += 4) {
    const alpha = image.data[offset];
    if (alpha <= 8) transparent += 1;
    if (alpha >= 247) opaque += 1;
  }
  const pixels = image.width * image.height;
  return (
    transparent / Math.max(1, pixels) >= 0.02 &&
    opaque / Math.max(1, pixels) >= 0.02
  );
}

function trim(image, bounds) {
  const span = Math.max(
    bounds.x1 - bounds.x0 + 1,
    bounds.y1 - bounds.y0 + 1,
  );
  const pad = Math.max(10, Math.round(span * 0.08));
  const left = Math.max(0, bounds.x0 - pad);
  const top = Math.max(0, bounds.y0 - pad);
  const right = Math.min(image.width, bounds.x1 + pad + 1);
  const bottom = Math.min(image.height, bounds.y1 + pad + 1);
  return crop(image, {
    x: left,
    y: top,
    w: right - left,
    h: bottom - top,
  });
}

async function main() {
  if (!existsSync(SOURCE_ROOT)) {
    console.log("• Duel target source folder missing; kept optional");
    return;
  }

  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const sprites = {};
  const written = new Set(["targets.json"]);
  const notes = [];

  for (const id of TARGET_IDS) {
    const source = findInput(SOURCE_ROOT, id);
    if (source === null) {
      console.log("• missing " + id + " (CSS fallback kept)");
      continue;
    }

    const raw = await readArt(source, id, notes);
    if (!hasRealTransparency(raw)) {
      throw new Error(
        id +
          ": Duel world target must contain real transparent alpha. " +
          "Do not submit a black/white matte image.",
      );
    }
    const bounds = alphaBounds(raw);
    if (bounds === null) {
      throw new Error(id + ": source contains no visible pixels.");
    }
    if (bounds.alphaCoverage > 0.82) {
      throw new Error(
        id +
          ": visible pixels cover too much of the source canvas; " +
          "check for an opaque matte/background.",
      );
    }

    const cleaned = trim(raw, bounds);
    const scale = Math.min(
      1,
      MAX_SIZE / Math.max(cleaned.width, cleaned.height),
    );
    const width = Math.max(1, Math.round(cleaned.width * scale));
    const height = Math.max(1, Math.round(cleaned.height * scale));
    const buffer = await sharp(cleaned.data, {
      raw: {
        width: cleaned.width,
        height: cleaned.height,
        channels: 4,
      },
    })
      .resize({
        width,
        height,
        fit: "fill",
        kernel: "lanczos3",
      })
      .webp({
        quality: 94,
        alphaQuality: 100,
        effort: 5,
      })
      .toBuffer();

    const file = id + ".webp";
    writeFileSync(join(OUTPUT_ROOT, file), buffer);
    written.add(file);
    sprites[id] = {
      url: file,
      sha256: sha256(buffer),
      width,
      height,
      pivot: { x: 0.5, y: 0.5 },
      alphaConvention: "source-alpha",
      blendMode: "source-over",
      estimatedDecodedBytes: width * height * 4,
    };
  }

  for (const file of readdirSync(OUTPUT_ROOT)) {
    if (!written.has(file)) {
      rmSync(join(OUTPUT_ROOT, file));
    }
  }

  const version = parseInt(
    sha256(Buffer.from(JSON.stringify(sprites))).slice(0, 8),
    16,
  );
  writeFileSync(
    join(OUTPUT_ROOT, "targets.json"),
    JSON.stringify(
      {
        id: "duel-targets",
        version,
        sprites,
      },
      null,
      2,
    ) + "\n",
  );

  console.log(
    "✓ Duel targets: " +
      Object.keys(sprites).length +
      " source-alpha sprites -> " +
      relative(ROOT, OUTPUT_ROOT),
  );
  for (const note of notes) console.log("  " + note);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
