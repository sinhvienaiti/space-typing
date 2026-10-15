#!/usr/bin/env node
/**
 * Zoom into part of a screenshot to inspect detail (hard edges, colour
 * spill, word-label readability). Guide: docs/VISUAL_TESTING.md.
 *
 *   pnpm visual:crop <in.png> <out.jpg> --rect=x,y,w,h [--width=800]
 *
 * `--rect` is in screenshot pixels (CSS px × DPR; a 1642×799 @2 shot is
 * 3284×1598). `--width` is the output width (keeps the aspect ratio).
 */
import { resolve } from "node:path";
import sharp from "sharp";

function flag(name, fallback) {
  const prefix = "--" + name + "=";
  const match = process.argv.find((argument) => argument.startsWith(prefix));
  return match === undefined ? fallback : match.slice(prefix.length);
}

const [input, output] = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
const rect = (flag("rect", "") ?? "").split(",").map(Number);
if (input === undefined || output === undefined || rect.length !== 4 || rect.some((value) => !Number.isFinite(value))) {
  console.error("Usage: pnpm visual:crop <in.png> <out.jpg> --rect=x,y,w,h [--width=800]");
  process.exit(2);
}

const image = sharp(resolve(input));
const meta = await image.metadata();
const [x, y, w, h] = rect.map(Math.round);
const left = Math.max(0, Math.min(meta.width - 1, x));
const top = Math.max(0, Math.min(meta.height - 1, y));
const box = {
  left,
  top,
  width: Math.max(1, Math.min(meta.width - left, w)),
  height: Math.max(1, Math.min(meta.height - top, h)),
};
await image
  .extract(box)
  .resize({ width: Number(flag("width", "800")) })
  .jpeg({ quality: 88 })
  .toFile(resolve(output));
console.log(JSON.stringify({ out: output, from: meta.width + "x" + meta.height, rect: box }));
