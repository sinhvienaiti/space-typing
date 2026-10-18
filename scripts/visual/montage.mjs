#!/usr/bin/env node
/**
 * Puts several screenshots side by side in one JPEG, to compare frames or
 * before/after at a glance (sharp; run where node_modules was installed — in
 * WSL on the owner's machine).
 *   node scripts/visual/montage.mjs <out.jpg> <columns> <tile width> <files…>
 */
import sharp from "sharp";

const [outPath, columns, tileWidth, ...files] = process.argv.slice(2);
if (!outPath || !files.length) {
  console.error("Usage: node scripts/visual/montage.mjs <out.jpg> <columns> <tile width> <files…>");
  process.exit(2);
}
const width = Number(tileWidth);
const cols = Number(columns);
const first = await sharp(files[0]).metadata();
const height = Math.round((width * first.height) / first.width);
const rows = Math.ceil(files.length / cols);
const tiles = await Promise.all(files.map((file) => sharp(file).resize(width, height).toBuffer()));
await sharp({ create: { width: cols * width, height: rows * height, channels: 3, background: "#000" } })
  .composite(tiles.map((input, index) => ({ input, left: (index % cols) * width, top: Math.floor(index / cols) * height })))
  .jpeg({ quality: 80 })
  .toFile(outPath);
console.log(outPath);
