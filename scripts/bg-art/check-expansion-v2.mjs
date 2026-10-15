#!/usr/bin/env node
import {
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import {
  extname,
  join,
  relative,
} from "node:path";
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

function expectedSizes(relativePath) {
  if (relativePath.startsWith("bosses/")) return [640, 1024];
  return [256, 512];
}

const sources = walk(sourceRoot);
if (sources.length === 0) {
  console.log("Expansion V2 art check: no source art present; skipping.");
  process.exit(0);
}

const failures = [];
for (const source of sources) {
  const rel = relative(sourceRoot, source).replaceAll("\\", "/");
  const stem = rel.slice(0, -extname(rel).length);
  const standardPath = join(outputRoot, stem + ".webp");
  const detailPath = join(outputRoot, stem + "@2x.webp");
  const [standardSize, detailSize] = expectedSizes(rel);

  for (const [path, size, label] of [
    [standardPath, standardSize, "standard"],
    [detailPath, detailSize, "detail"],
  ]) {
    if (!existsSync(path)) {
      failures.push(rel + ": missing " + label + " runtime asset " + path);
      continue;
    }

    const metadata = await sharp(path).metadata();
    if (metadata.width !== size || metadata.height !== size) {
      failures.push(
        rel +
          ": " +
          label +
          " runtime asset must be " +
          String(size) +
          "x" +
          String(size) +
          ", got " +
          String(metadata.width ?? 0) +
          "x" +
          String(metadata.height ?? 0),
      );
    }
    if (metadata.format !== "webp") {
      failures.push(rel + ": " + label + " runtime asset is not WebP");
    }
  }
}

if (failures.length > 0) {
  console.error("Expansion V2 art check failed:");
  for (const failure of failures) console.error("- " + failure);
  console.error(
    "Run `pnpm expansion:prepare` after adding or changing art-src/expansion-v2 files.",
  );
  process.exit(1);
}

console.log(
  "Expansion V2 art check: " +
    String(sources.length) +
    " source asset(s) have valid standard + @2x runtime outputs.",
);
