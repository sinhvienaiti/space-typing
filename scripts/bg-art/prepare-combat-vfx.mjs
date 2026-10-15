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
  "explosion-core": { maxSize: 896, kind: "emissive", lifetimeMs: 620 },
  "explosion-wide": { maxSize: 1280, kind: "emissive", lifetimeMs: 820 },
  "shockwave-ring": { maxSize: 1024, kind: "emissive", lifetimeMs: 920 },
  "fire-small": { maxSize: 640, kind: "emissive", loop: true, lifetimeMs: 0 },
  "fire-medium": { maxSize: 768, kind: "emissive", loop: true, lifetimeMs: 0 },
  "fire-critical": { maxSize: 896, kind: "emissive", loop: true, lifetimeMs: 0 },
  "smoke-dark": { maxSize: 768, kind: "occluding", loop: true, lifetimeMs: 0 },
  "smoke-hot": { maxSize: 768, kind: "occluding", loop: true, lifetimeMs: 0 },
  "spark-burst": { maxSize: 640, kind: "emissive", lifetimeMs: 520 },
  "debris-burst": { maxSize: 768, kind: "occluding", lifetimeMs: 720 },
  "missile-salvo": { maxSize: 768, kind: "world", lifetimeMs: 720 },
  "bomb-impact": { maxSize: 1024, kind: "emissive", lifetimeMs: 980 },
  "precision-burst": { maxSize: 896, kind: "emissive", lifetimeMs: 680 },
};

const MAX_BACKGROUND = 30;

function smoothstep(value) {
  const x = Math.max(0, Math.min(1, value));
  return x * x * (3 - 2 * x);
}

function hasMeaningfulAlpha(image) {
  for (let offset = 3; offset < image.data.length; offset += 4) {
    if (image.data[offset] < 250) return true;
  }
  return false;
}

function prepareAlpha(image, label, kind, notes) {
  if (hasMeaningfulAlpha(image)) {
    notes.push(label + ": preserved source alpha.");
    return {
      image,
      alphaConvention: "source-alpha",
    };
  }

  const border = borderStats(image);
  const key = [0, 1, 2].map((channel) =>
    median(border.map((pixel) => pixel[channel])),
  );
  if (Math.max(...key) > MAX_BACKGROUND) {
    throw new Error(
      label +
        ": opaque source has no usable alpha and border is not near-black (" +
        key.join(",") +
        "). Export true RGBA source art.",
    );
  }

  const levels = border
    .map((pixel) => Math.max(pixel[0], pixel[1], pixel[2]))
    .sort((a, b) => a - b);
  const black = Math.max(
    2,
    levels[Math.floor(levels.length * 0.985)] ?? 2,
  );
  const feather = Math.max(
    8,
    Math.round(Math.min(image.width, image.height) * 0.035),
  );
  const out = Buffer.alloc(image.width * image.height * 4);

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      const adjusted = [
        Math.max(0, image.data[offset] - black),
        Math.max(0, image.data[offset + 1] - black),
        Math.max(0, image.data[offset + 2] - black),
      ];
      const peak = Math.max(...adjusted);
      const edge = smoothstep(
        Math.min(
          x,
          y,
          image.width - 1 - x,
          image.height - 1 - y,
        ) / feather,
      );
      const alpha =
        Math.pow(Math.min(1, peak / 220), 0.72) * edge;
      out[offset + 3] = Math.round(alpha * 255);

      if (kind === "emissive" && peak > 0) {
        const scale = 255 / peak;
        out[offset] = Math.min(255, Math.round(adjusted[0] * scale));
        out[offset + 1] = Math.min(255, Math.round(adjusted[1] * scale));
        out[offset + 2] = Math.min(255, Math.round(adjusted[2] * scale));
      } else {
        out[offset] = adjusted[0];
        out[offset + 1] = adjusted[1];
        out[offset + 2] = adjusted[2];
      }
    }
  }

  notes.push(
    label +
      ": converted legacy near-black matte to RGBA fallback; replace with true-alpha source for final art.",
  );
  return {
    image: {
      data: out,
      width: image.width,
      height: image.height,
    },
    alphaConvention: "keyed-black-fallback",
  };
}

function trimToAlpha(image) {
  let x0 = image.width;
  let y0 = image.height;
  let x1 = -1;
  let y1 = -1;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.data[(y * image.width + x) * 4 + 3];
      if (alpha <= 4) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }

  if (x1 < 0) throw new Error("nothing visible after alpha preparation");
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
  if (!existsSync(SOURCE_ROOT)) {
    console.log("• combat VFX source folder missing; kept optional");
    return;
  }

  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const sprites = {};
  const notes = [];
  const written = new Set(["vfx.json"]);

  for (const [id, profile] of Object.entries(ASSETS)) {
    const source = findInput(SOURCE_ROOT, id);
    if (source === null) {
      console.log("• missing " + id + " (kept optional)");
      continue;
    }

    const raw = await readArt(source, id, notes);
    const prepared = prepareAlpha(
      raw,
      id,
      profile.kind,
      notes,
    );
    const cleaned = trimToAlpha(prepared.image);
    const scale = Math.min(
      1,
      profile.maxSize /
        Math.max(cleaned.width, cleaned.height),
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
      .resize({
        width,
        height,
        fit: "fill",
        kernel: "lanczos3",
      })
      .webp({
        quality: 92,
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
      frameCount: 1,
      fps: 0,
      pivot: { x: 0.5, y: 0.5 },
      alphaConvention: prepared.alphaConvention,
      blendMode:
        profile.kind === "emissive"
          ? "screen"
          : "source-over",
      loop: profile.loop === true,
      lifetimeMs: profile.lifetimeMs,
      estimatedDecodedBytes: width * height * 4,
    };
    notes.push(
      id +
        ": " +
        width +
        "x" +
        height +
        " RGBA · " +
        sprites[id].blendMode +
        ".",
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
      " alpha-aware assets -> " +
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
