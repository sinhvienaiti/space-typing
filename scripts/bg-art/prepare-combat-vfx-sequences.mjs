#!/usr/bin/env node
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import sharp from "sharp";
import { ROOT, sha256 } from "./art-common.mjs";

const SOURCE_ROOT = join(
  ROOT,
  "art-src/combat-vfx-sequences/animated_webp",
);
const OUTPUT_ROOT = join(
  ROOT,
  "public/assets/space-typing/combat-vfx",
);

const VFX_IDS = [
  "explosion-core",
  "explosion-wide",
  "shockwave-ring",
  "fire-small",
  "fire-medium",
  "fire-critical",
  "smoke-dark",
  "smoke-hot",
  "spark-burst",
  "debris-burst",
  "missile-salvo",
  "bomb-impact",
  "precision-burst",
];

const SOURCE_OVER = new Set([
  "smoke-dark",
  "smoke-hot",
  "debris-burst",
  "missile-salvo",
]);

const LOOPING = new Set([
  "fire-small",
  "fire-medium",
  "fire-critical",
  "smoke-dark",
  "smoke-hot",
]);

const LIFETIME_MS = {
  "explosion-core": 660,
  "explosion-wide": 880,
  "shockwave-ring": 900,
  "fire-small": 0,
  "fire-medium": 0,
  "fire-critical": 0,
  "smoke-dark": 0,
  "smoke-hot": 0,
  "spark-burst": 620,
  "debris-burst": 760,
  "missile-salvo": 760,
  "bomb-impact": 1050,
  "precision-burst": 720,
};

async function main() {
  if (!existsSync(SOURCE_ROOT)) {
    console.log("• Animated Duel VFX source folder missing; kept optional");
    return;
  }

  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const sprites = {};
  const written = new Set(["vfx.json"]);

  for (const id of VFX_IDS) {
    const source = join(SOURCE_ROOT, id + ".webp");
    if (!existsSync(source)) {
      console.log("• missing animated " + id);
      continue;
    }

    const buffer = readFileSync(source);
    const metadata = await sharp(buffer, { animated: true }).metadata();
    const width = metadata.width ?? 0;
    const rawHeight = metadata.height ?? 0;
    const frameCount = Math.max(1, metadata.pages ?? 1);
    const height =
      metadata.pageHeight ??
      Math.max(1, Math.round(rawHeight / frameCount));

    if (width <= 0 || height <= 0) {
      throw new Error(id + ": invalid animated WebP dimensions.");
    }

    const file = id + ".webp";
    copyFileSync(source, join(OUTPUT_ROOT, file));
    written.add(file);

    sprites[id] = {
      url: file,
      sha256: sha256(buffer),
      width,
      height,
      frameCount,
      fps: frameCount > 1 ? 16 : 0,
      pivot: { x: 0.5, y: 0.5 },
      alphaConvention: "source-alpha",
      blendMode: SOURCE_OVER.has(id)
        ? "source-over"
        : "screen",
      loop: LOOPING.has(id),
      lifetimeMs: LIFETIME_MS[id] ?? 0,
      estimatedDecodedBytes: width * height * 4 * frameCount,
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
    "✓ Animated Duel VFX: " +
      Object.keys(sprites).length +
      " assets -> " +
      relative(ROOT, OUTPUT_ROOT),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
