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
  borderStats,
  crop,
  findInput,
  median,
  readArt,
  ROOT,
  sha256,
} from "./art-common.mjs";

const SOURCE_ROOT = join(ROOT, "art-src/combat-vfx");
const OUTPUT_ROOT = join(
  ROOT,
  "public/assets/space-typing/combat-vfx",
);

const ASSETS = {
  "explosion-core": 896,
  "explosion-wide": 1280,
  "shockwave-ring": 1024,
  "fire-small": 640,
  "fire-medium": 768,
  "fire-critical": 896,
  "smoke-dark": 768,
  "smoke-hot": 768,
  "spark-burst": 640,
  "debris-burst": 768,
  "missile-salvo": 768,
  "bomb-impact": 1024,
  "precision-burst": 896,
};

const MAX_BACKGROUND = 30;

function smoothstep(value) {
  const x = Math.max(0, Math.min(1, value));
  return x * x * (3 - 2 * x);
}

function brightness(image, x, y) {
  const offset = (y * image.width + x) * 4;
  return Math.max(
    image.data[offset],
    image.data[offset + 1],
    image.data[offset + 2],
  );
}

function blackenBackground(image, label, notes) {
  const border = borderStats(image);
  const key = [0, 1, 2].map((channel) =>
    median(border.map((pixel) => pixel[channel])),
  );
  if (Math.max(...key) > MAX_BACKGROUND) {
    throw new Error(
      label +
        ": source border is not near-black (" +
        key.join(",") +
        "). Generate on pure black #000000.",
    );
  }

  const levels = border
    .map((pixel) => Math.max(pixel[0], pixel[1], pixel[2]))
    .sort((a, b) => a - b);
  const black = Math.max(
    4,
    levels[Math.floor(levels.length * 0.985)] ?? 4,
  );
  const scale = 255 / Math.max(1, 255 - black);
  const feather = Math.max(
    8,
    Math.round(Math.min(image.width, image.height) * 0.035),
  );
  const out = Buffer.alloc(image.width * image.height * 4);

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const edge = smoothstep(
        Math.min(
          x,
          y,
          image.width - 1 - x,
          image.height - 1 - y,
        ) / feather,
      );
      const offset = (y * image.width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const value =
          Math.max(0, image.data[offset + channel] - black) *
          scale *
          edge;
        out[offset + channel] =
          value < 2 ? 0 : Math.min(255, Math.round(value));
      }
      out[offset + 3] = 255;
    }
  }

  notes.push(
    label +
      ": background forced to pure black (black point " +
      black +
      ").",
  );
  return {
    data: out,
    width: image.width,
    height: image.height,
  };
}

function trimToLight(image) {
  let x0 = image.width;
  let y0 = image.height;
  let x1 = -1;
  let y1 = -1;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (brightness(image, x, y) <= 5) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }

  if (x1 < 0) throw new Error("nothing but black found");
  const span = Math.max(x1 - x0 + 1, y1 - y0 + 1);
  const pad = Math.max(8, Math.round(span * 0.055));
  const left = Math.max(0, x0 - pad);
  const top = Math.max(0, y0 - pad);
  const right = Math.min(image.width, x1 + pad + 1);
  const bottom = Math.min(image.height, y1 + pad + 1);

  return crop(image, {
    x: left,
    y: top,
    w: right - left,
    h: bottom - top,
  });
}

async function main() {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const sprites = {};
  const notes = [];
  const written = new Set(["vfx.json"]);

  for (const [id, maxSize] of Object.entries(ASSETS)) {
    const source = findInput(SOURCE_ROOT, id);
    if (source === null) {
      console.log("• missing " + id + " (kept optional)");
      continue;
    }

    const raw = await readArt(source, id, notes);
    const cleaned = trimToLight(
      blackenBackground(raw, id, notes),
    );
    const scale = Math.min(
      1,
      maxSize / Math.max(cleaned.width, cleaned.height),
    );
    const width = Math.max(
      1,
      Math.round(cleaned.width * scale),
    );
    const height = Math.max(
      1,
      Math.round(cleaned.height * scale),
    );

    const buffer = await sharp(cleaned.data, {
      raw: {
        width: cleaned.width,
        height: cleaned.height,
        channels: 4,
      },
    })
      .removeAlpha()
      .resize({
        width,
        height,
        fit: "fill",
        kernel: "lanczos3",
      })
      .webp({
        quality: 92,
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
    };
    notes.push(
      id + ": " + width + "x" + height + ".",
    );
  }

  for (const file of readdirSync(OUTPUT_ROOT)) {
    if (!written.has(file)) rmSync(join(OUTPUT_ROOT, file));
  }

  const version = parseInt(
    sha256(Buffer.from(JSON.stringify(sprites))).slice(0, 8),
    16,
  );
  writeFileSync(
    join(OUTPUT_ROOT, "vfx.json"),
    JSON.stringify(
      {
        id: "combat-vfx",
        version,
        sprites,
      },
      null,
      2,
    ) + "\n",
  );

  console.log(
    "✓ Combat VFX: " +
      Object.keys(sprites).length +
      " painted assets -> " +
      relative(ROOT, OUTPUT_ROOT),
  );
  for (const note of notes) {
    console.log("  " + note);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
