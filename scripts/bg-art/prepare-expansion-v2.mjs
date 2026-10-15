#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
import sharp from "sharp";
import { ROOT } from "./art-common.mjs";

const sourceRoot = join(ROOT, "art-src/expansion-v2");
const outputRoot = join(ROOT, "src/assets/expansion-v2");
const extensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function walk(dir) {
  if (!existsSync(dir)) return [];
  const result = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) result.push(...walk(path));
    else if (extensions.has(extname(path).toLowerCase())) result.push(path);
  }
  return result;
}

function sizesFor(relativePath) {
  if (relativePath.startsWith("icons/")) return [256, 512];
  if (relativePath.startsWith("bosses/")) return [640, 1024];
  if (relativePath.startsWith("enemies/")) return [256, 512];
  return [256, 512];
}

const only = new Set(process.argv.slice(2).filter((arg) => !arg.startsWith("--")));
let written = 0;

for (const source of walk(sourceRoot)) {
  const rel = relative(sourceRoot, source).replaceAll("\\", "/");
  const stem = basename(source, extname(source));
  if (only.size > 0 && !only.has(stem) && !only.has(rel)) continue;

  const [standardSize, detailSize] = sizesFor(rel);
  const outBase = join(outputRoot, rel.replace(extname(rel), ""));
  mkdirSync(dirname(outBase), { recursive: true });

  const metadata = await sharp(source).metadata();
  if ((metadata.width ?? 0) <= 0 || (metadata.height ?? 0) <= 0) {
    throw new Error(rel + ": invalid image dimensions");
  }

  await sharp(source)
    .resize(standardSize, standardSize, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 92, alphaQuality: 98 })
    .toFile(outBase + ".webp");

  await sharp(source)
    .resize(detailSize, detailSize, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 96, alphaQuality: 100 })
    .toFile(outBase + "@2x.webp");

  written += 1;
  console.log("✓ " + rel + " → " + standardSize + "/" + detailSize + " px");
}

console.log(written + " Expansion V2 source asset(s) prepared.");
