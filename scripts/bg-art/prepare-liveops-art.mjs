#!/usr/bin/env node
/**
 * Daily Hub art (docs/art-requests/LIVEOPS_UI_2D_AUDIO_2026-10-16.md).
 *
 *   pnpm liveops-art:prepare            # every image in art-src/liveops
 *   pnpm liveops-art:prepare chest-daily-closed streak-flame   # only these
 *
 * Objects: real transparency, flat #00FF00 green or #FF00FF magenta → keyed,
 * despilled, trimmed, centred on a square, WebP with alpha.
 * The banner is opaque and only resized/cropped.
 *   art-src/liveops/<name>.png  ->  src/assets/liveops/<name>.webp
 * The game picks the files up at the next build (src/ui/liveops-art.ts).
 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";
import sharp from "sharp";
import { borderStats, EXTENSIONS, median, rawImage, readArt, ROOT } from "./art-common.mjs";

/** name → output size (square edge, or [width, height] for opaque art). */
const ASSETS = {
  "hub-banner": [1600, 400],
  "chest-daily-closed": 256,
  "chest-daily-open": 256,
  "chest-weekly-closed": 256,
  "chest-weekly-open": 256,
  "chest-milestone": 320,
  "streak-flame": 256,
  "streak-shield": 128,
  "calendar-gift": 160,
  "calendar-gift-big": 192,
  "mail-crate": 160,
  "supply-drop": 192,
  "playtime-gift": 160,
  "currency-credits": 96,
  "currency-alloy": 96,
  "currency-star-crystal": 96,
  "currency-quantum-core": 96,
  "currency-warp": 96,
};

const SRC = join(ROOT, "art-src/liveops");
const OUT = join(ROOT, "src/assets/liveops");

function keyBackground(image, label, notes) {
  const border = borderStats(image);
  if (border.filter((pixel) => pixel[3] < 16).length / border.length > 0.6) {
    notes.push("real transparency");
    return image;
  }
  const key = [0, 1, 2].map((channel) => median(border.map((pixel) => pixel[channel])));
  const green = key[1] > 150 && key[0] < 110 && key[2] < 110;
  const magenta = key[0] > 150 && key[2] > 150 && key[1] < 110;
  if (!green && !magenta) {
    throw new Error(label + ": background must be flat #00FF00 green, #FF00FF magenta or transparent; border is " + key.join(","));
  }
  const { data, width, height } = image;
  const out = Buffer.from(data);
  for (let p = 0; p < width * height; p += 1) {
    const o = p * 4;
    const amount = green ? data[o + 1] - Math.max(data[o], data[o + 2]) : Math.min(data[o], data[o + 2]) - data[o + 1];
    const alpha = Math.max(0, Math.min(1, 1 - (amount - 90) / 100));
    out[o + 3] = Math.round(alpha * data[o + 3]);
    // Despill: a tinted edge pixel loses the key colour.
    if (out[o + 3] > 0 && out[o + 3] < 250) {
      if (green) out[o + 1] = Math.min(out[o + 1], Math.max(out[o], out[o + 2]));
      else {
        const limit = out[o + 1] + 20;
        out[o] = Math.min(out[o], limit);
        out[o + 2] = Math.min(out[o + 2], limit);
      }
    }
  }
  notes.push("keyed " + (green ? "#00FF00" : "#FF00FF") + " background");
  return { data: out, width, height };
}

function subjectBox({ data, width, height }) {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= 12) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error("nothing left after removing the background");
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

const only = new Set(process.argv.slice(2).filter((argument) => !argument.startsWith("--")));
let written = 0;
let failed = 0;
if (existsSync(SRC)) {
  mkdirSync(OUT, { recursive: true });
  for (const entry of readdirSync(SRC).sort()) {
    if (!EXTENSIONS.includes(extname(entry).toLowerCase())) continue;
    const name = basename(entry, extname(entry));
    if (only.size > 0 && !only.has(name)) continue;
    const size = ASSETS[name];
    if (size === undefined) {
      console.log("skip " + entry + ": not a Daily Hub art name");
      continue;
    }
    const notes = [];
    try {
      const image = await readArt(join(SRC, entry), name, notes);
      const target = join(OUT, name + ".webp");
      if (Array.isArray(size)) {
        await rawImage(image).resize(size[0], size[1], { fit: "cover", kernel: sharp.kernel.lanczos3 }).webp({ quality: 88 }).toFile(target);
      } else {
        const keyed = keyBackground(image, name, notes);
        const box = subjectBox(keyed);
        const side = Math.ceil(Math.max(box.w, box.h) * 1.04);
        const trimmed = await rawImage(keyed).extract({ left: box.x, top: box.y, width: box.w, height: box.h }).png().toBuffer();
        await sharp({ create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
          .composite([{ input: trimmed, left: Math.floor((side - box.w) / 2), top: Math.floor((side - box.h) / 2) }])
          .png()
          .toBuffer()
          .then((square) =>
            sharp(square)
              .resize(size, size, { fit: "contain", kernel: sharp.kernel.lanczos3, background: { r: 0, g: 0, b: 0, alpha: 0 } })
              .webp({ quality: 94, alphaQuality: 100 })
              .toFile(target),
          );
      }
      written += 1;
      console.log("✓ liveops/" + name + " → " + (Array.isArray(size) ? size.join("×") : size + " px") + (notes.length ? " · " + notes.join(" · ") : ""));
    } catch (error) {
      failed += 1;
      console.log("✗ " + name + ": " + (error instanceof Error ? error.message : String(error)));
    }
  }
}
console.log(written + " Daily Hub image(s) prepared" + (failed > 0 ? ", " + failed + " failed" : "") + ".");
if (failed > 0) process.exitCode = 1;
