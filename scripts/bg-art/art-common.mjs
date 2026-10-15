/**
 * Helpers shared by the owner-art pipelines: backgrounds (prepare-kit.mjs)
 * and ship shot effects (prepare-fx.mjs).
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg"];

// ---------------------------------------------------------------------------
// Image-tool watermark cleanup.
// ---------------------------------------------------------------------------

/**
 * Gemini app images carry a visible white "sparkle" (~30% opacity) centred
 * 120 px from the bottom-right corner, at any image size. The alpha template
 * (scripts/bg-art/gemini-sparkle-alpha.png, 64x64, centre at 32,32) was
 * measured from one black- and one green-background image. Blending is
 * inverted exactly: in = (out - 252 * a) / (1 - a). Images without the mark
 * are left untouched.
 */
const SPARKLE_TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), "gemini-sparkle-alpha.png");
const SPARKLE_WHITE = 252;
let sparkleAlpha = null;

export function findInput(srcDir, name) {
  for (const extension of EXTENSIONS) {
    const file = join(srcDir, name + extension);
    if (existsSync(file)) return file;
  }
  return null;
}

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function readRaw(input) {
  const { data, info } = await sharp(input)
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Reads one source image and removes a known image-tool watermark. */
export async function readArt(file, label, notes) {
  return removeSparkleWatermark(await readRaw(file), label, notes);
}

export function rawImage(image) {
  return sharp(image.data, {
    raw: { width: image.width, height: image.height, channels: 4 },
  });
}

export async function loadSparkle() {
  if (sparkleAlpha === null) {
    const { data } = await sharp(SPARKLE_TEMPLATE).extractChannel(0).raw().toBuffer({ resolveWithObject: true });
    sparkleAlpha = Float32Array.from(data, (value) => value / 255);
  }
  return sparkleAlpha;
}

export async function removeSparkleWatermark(image, label, notes) {
  const alpha = await loadSparkle();
  const { data, width, height } = image;
  const left = width - 152;
  const top = height - 152;
  if (left < 0 || top < 0) return image;
  // Detection: brightness lift inside the mark vs. a ring just outside it.
  let lift = 0;
  let expected = 0;
  let ring = 0;
  let ringCount = 0;
  for (let j = 0; j < 64; j += 1) {
    for (let i = 0; i < 64; i += 1) {
      const offset = ((top + j) * width + left + i) * 4;
      const luma = 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
      const a = alpha[j * 64 + i];
      const r = Math.hypot(i - 32, j - 32);
      if (a === 0 && r > 28 && r < 32) {
        ring += luma;
        ringCount += 1;
      }
      if (a > 0.2) {
        lift += luma;
        expected += a;
      }
    }
  }
  const pixels = [...alpha].filter((a) => a > 0.2).length;
  const ringLuma = ring / Math.max(1, ringCount);
  const insideLuma = lift / Math.max(1, pixels);
  const predictedLift = (SPARKLE_WHITE - ringLuma) * (expected / Math.max(1, pixels));
  const ratio = (insideLuma - ringLuma) / Math.max(1, predictedLift);
  if (!(ratio > 0.55 && ratio < 1.6)) return image;

  const out = Buffer.from(data);
  for (let j = 0; j < 64; j += 1) {
    for (let i = 0; i < 64; i += 1) {
      const a = alpha[j * 64 + i];
      if (a <= 0) continue;
      const offset = ((top + j) * width + left + i) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const value = (data[offset + channel] - SPARKLE_WHITE * a) / (1 - a);
        out[offset + channel] = Math.max(0, Math.min(255, Math.round(value)));
      }
    }
  }
  notes.push(label + ": removed the image tool's corner watermark (ratio " + ratio.toFixed(2) + ").");
  return { data: out, width, height };
}

export function borderStats(image) {
  const { data, width, height } = image;
  const samples = [];
  const push = (x, y) => {
    const offset = (y * width + x) * 4;
    samples.push([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]]);
  };
  for (let x = 0; x < width; x += 2) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 2) {
    push(0, y);
    push(width - 1, y);
  }
  return samples;
}

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export function crop(image, box) {
  const out = Buffer.alloc(box.w * box.h * 4);
  for (let y = 0; y < box.h; y += 1) {
    image.data.copy(
      out,
      y * box.w * 4,
      ((y + box.y) * image.width + box.x) * 4,
      ((y + box.y) * image.width + box.x + box.w) * 4,
    );
  }
  return { data: out, width: box.w, height: box.h };
}

export function option(name) {
  const prefix = "--" + name + "=";
  const match = process.argv.find((argument) => argument.startsWith(prefix));
  return match === undefined ? null : resolve(match.slice(prefix.length));
}
