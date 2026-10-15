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
import { extname, join, relative } from "node:path";
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

const IDS = [
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

const PROFILE = {
  "explosion-core": { blendMode: "screen", loop: false, lifetimeMs: 880 },
  "explosion-wide": { blendMode: "screen", loop: false, lifetimeMs: 880 },
  "shockwave-ring": { blendMode: "screen", loop: false, lifetimeMs: 880 },
  "fire-small": { blendMode: "screen", loop: true, lifetimeMs: 0 },
  "fire-medium": { blendMode: "screen", loop: true, lifetimeMs: 0 },
  "fire-critical": { blendMode: "screen", loop: true, lifetimeMs: 0 },
  "smoke-dark": { blendMode: "source-over", loop: true, lifetimeMs: 0 },
  "smoke-hot": { blendMode: "source-over", loop: true, lifetimeMs: 0 },
  "spark-burst": { blendMode: "screen", loop: false, lifetimeMs: 880 },
  "debris-burst": { blendMode: "source-over", loop: false, lifetimeMs: 880 },
  "missile-salvo": { blendMode: "source-over", loop: false, lifetimeMs: 880 },
  "bomb-impact": { blendMode: "screen", loop: false, lifetimeMs: 880 },
  "precision-burst": { blendMode: "screen", loop: false, lifetimeMs: 880 },
};

async function main() {
  if (!existsSync(SOURCE_ROOT)) {
    console.log("• Duel animated VFX source folder missing; static VFX kept");
    return;
  }

  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const sprites = {};
  const written = new Set(["vfx.json"]);

  for (const id of IDS) {
    const source = join(SOURCE_ROOT, id + ".webp");
    if (!existsSync(source)) {
      throw new Error(
        id + ": missing animated WebP in " +
          relative(ROOT, SOURCE_ROOT),
      );
    }

    const buffer = readFileSync(source);
    const metadata = await sharp(source, { animated: true }).metadata();
    const width = metadata.width ?? 0;
    const frameHeight =
      metadata.pageHeight ?? metadata.height ?? 0;
    const frameCount = metadata.pages ?? 1;
    if (width <= 0 || frameHeight <= 0 || frameCount < 2) {
      throw new Error(
        id + ": expected a multi-frame animated WebP",
      );
    }

    const file = id + ".webp";
    copyFileSync(source, join(OUTPUT_ROOT, file));
    written.add(file);
    const profile = PROFILE[id];
    sprites[id] = {
      url: file,
      sha256: sha256(buffer),
      width,
      height: frameHeight,
      frameCount,
      fps: 16,
      pivot: { x: 0.5, y: 0.5 },
      alphaConvention: "source-alpha",
      blendMode: profile.blendMode,
      loop: profile.loop,
      lifetimeMs: profile.lifetimeMs,
      estimatedDecodedBytes:
        width * frameHeight * 4 * frameCount,
    };
  }

  for (const file of readdirSync(OUTPUT_ROOT)) {
    if (file === "vfx.json") continue;
    const stem = file.slice(0, -extname(file).length);
    if (IDS.includes(stem) && !written.has(file)) {
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
      { id: "combat-vfx", version, sprites },
      null,
      2,
    ) + "\n",
  );

  console.log(
    "✓ Duel animated VFX: " +
      IDS.length +
      " sequences -> " +
      relative(ROOT, OUTPUT_ROOT),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
