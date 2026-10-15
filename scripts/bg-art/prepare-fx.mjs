#!/usr/bin/env node
/**
 * Ship shot FX pipeline (docs/PLAYER_SHOTS_HANDOFF.md).
 *
 *   pnpm fx:prepare vanguard [--tool="Google Gemini"]
 *
 * Reads the owner's Gemini sprites from art-src/fx/<ship>/<ship>-<id>.<ext>:
 * additive light painted on pure black, projectiles and muzzle flashes
 * pointing RIGHT. Writes public/assets/space-typing/fx/<ship>/<id>.webp and
 * fx.json (size, SHA-256 and the anchor point the game pins to the bolt head,
 * the muzzle or the impact). Also records provenance in manifest.json.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, relative } from "node:path";
import sharp from "sharp";
import {
  borderStats,
  crop,
  findInput,
  median,
  option,
  readArt,
  ROOT,
  sha256,
} from "./art-common.mjs";

const PUBLIC_ROOT = join(ROOT, "public/assets/space-typing/fx");

/** Every playable ship owns a four-sprite shot kit. */
const SHIPS = [
  "vanguard",
  "aegis",
  "volt",
  "wraith",
  "fortune",
  "arsenal",
  "oracle",
  "bastion",
  "reaper",
  "celestial",
  "zenith",
];

/**
 * anchor: "tip" = right-most bright point (bolt head), "origin" = left-most
 * bright point (where a muzzle flash leaves the barrel), "centre" = the
 * brightness centroid (impact burst).
 */
const SPRITES = {
  bolt: { anchor: "tip", maxSize: 768 },
  finisher: { anchor: "tip", maxSize: 768 },
  impact: { anchor: "centre", maxSize: 640 },
  muzzle: { anchor: "origin", maxSize: 512 },
};

/** Border brighter than this is not "light on black" (green screen, nebula…). */
const MAX_BACKGROUND = 28;

function fail(message) {
  console.error("✗ " + message);
  process.exitCode = 1;
}

function smoothstep(t) {
  const x = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

/**
 * Pure-black background for additive blending: JPEG noise and a tool's
 * "almost black" would otherwise add a faint box around every sprite.
 */
function blackenBackground(image, label, notes) {
  const border = borderStats(image);
  const key = [0, 1, 2].map((channel) => median(border.map((pixel) => pixel[channel])));
  if (Math.max(...key) > MAX_BACKGROUND) {
    throw new Error(
      label + ": the background is not black (border colour " + key.join(",") +
        "). Regenerate it on a pure black #000000 background, or check that this is the right file.",
    );
  }
  const levels = border.map((pixel) => Math.max(pixel[0], pixel[1], pixel[2])).sort((a, b) => a - b);
  const black = Math.max(4, levels[Math.floor(levels.length * 0.98)]);
  const scale = 255 / (255 - black);
  const { data, width, height } = image;
  const feather = Math.max(6, Math.round(Math.min(width, height) * 0.04));
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edge = smoothstep(Math.min(x, y, width - 1 - x, height - 1 - y) / feather);
      const offset = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const value = Math.max(0, data[offset + channel] - black) * scale * edge;
        out[offset + channel] = value < 2 ? 0 : Math.min(255, Math.round(value));
      }
      out[offset + 3] = 255;
    }
  }
  notes.push(label + ": background forced to pure black (black point " + black + ").");
  return { data: out, width, height };
}

function brightness(image, x, y) {
  const offset = (y * image.width + x) * 4;
  return Math.max(image.data[offset], image.data[offset + 1], image.data[offset + 2]);
}

/** Crops to the glowing content plus a small margin. */
function trimToLight(image) {
  let x0 = image.width;
  let y0 = image.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (brightness(image, x, y) <= 6) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error("nothing but black found");
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.03) + 2;
  const box = {
    x: Math.max(0, x0 - pad),
    y: Math.max(0, y0 - pad),
    w: Math.min(image.width, x1 + pad + 1) - Math.max(0, x0 - pad),
    h: Math.min(image.height, y1 + pad + 1) - Math.max(0, y0 - pad),
  };
  return crop(image, box);
}

/** Anchor as fractions of the trimmed sprite, see SPRITES. */
function findAnchor(image, kind) {
  let peak = 0;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) peak = Math.max(peak, brightness(image, x, y));
  }
  const threshold = peak * 0.55;
  if (kind === "centre") {
    let sum = 0;
    let sx = 0;
    let sy = 0;
    for (let y = 0; y < image.height; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        const b = brightness(image, x, y);
        if (b < threshold) continue;
        sum += b;
        sx += x * b;
        sy += y * b;
      }
    }
    return [sx / sum / image.width, sy / sum / image.height];
  }
  // Extreme bright column, then the brightness-weighted row around it.
  let edgeX = kind === "tip" ? -1 : image.width;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (brightness(image, x, y) < threshold) continue;
      if (kind === "tip" ? x > edgeX : x < edgeX) edgeX = x;
    }
  }
  const band = Math.max(2, Math.round(image.width * 0.06));
  let sum = 0;
  let sy = 0;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = Math.max(0, edgeX - band); x <= Math.min(image.width - 1, edgeX + band); x += 1) {
      const b = brightness(image, x, y);
      if (b < threshold) continue;
      sum += b;
      sy += y * b;
    }
  }
  return [edgeX / image.width, sum > 0 ? sy / sum / image.height : 0.5];
}

async function main() {
  const ship = process.argv[2];
  if (ship === "all") {
    if (option("src") !== null || option("out") !== null) {
      throw new Error("--src/--out can only be used with one ship, not fx:prepare all.");
    }

    let failed = false;
    for (const id of SHIPS) {
      const sourceDir = join(ROOT, "art-src/fx", id);
      const hasSource =
        existsSync(sourceDir) &&
        readdirSync(sourceDir).some((file) =>
          Object.keys(SPRITES).some((spriteId) =>
            file.startsWith(id + "-" + spriteId + "."),
          ),
        );
      if (!hasSource) {
        console.log("• " + id + ": no source art found; existing runtime kit kept.");
        continue;
      }

      const result = spawnSync(
        process.execPath,
        [process.argv[1], id, ...process.argv.slice(3)],
        { stdio: "inherit" },
      );
      if (result.status !== 0) failed = true;
    }
    if (failed) process.exitCode = 1;
    return;
  }

  if (!SHIPS.includes(ship)) {
    console.error(
      "Usage: pnpm fx:prepare <all|" +
        SHIPS.join("|") +
        "> [--tool=<name>] [--src=<dir>] [--out=<dir>]",
    );
    process.exit(2);
  }
  // --src / --out exist for pipeline tests; normal runs use the ship folders.
  const srcDir = option("src") ?? join(ROOT, "art-src/fx", ship);
  const outDir = option("out") ?? join(PUBLIC_ROOT, ship);
  mkdirSync(outDir, { recursive: true });
  const notes = [];
  const sprites = {};
  const written = new Set(["fx.json"]);

  for (const [id, spec] of Object.entries(SPRITES)) {
    const file = findInput(srcDir, ship + "-" + id);
    if (file === null) {
      console.warn("• missing " + ship + "-" + id + " (skipped)");
      continue;
    }
    try {
      const image = trimToLight(blackenBackground(await readArt(file, id, notes), id, notes));
      const [anchorX, anchorY] = findAnchor(image, spec.anchor);
      const scale = Math.min(1, spec.maxSize / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const buffer = await sharp(image.data, { raw: { width: image.width, height: image.height, channels: 4 } })
        .removeAlpha()
        .resize({ width, height, fit: "fill", kernel: "lanczos3" })
        .webp({ quality: 90, effort: 5 })
        .toBuffer();
      const url = id + ".webp";
      writeFileSync(join(outDir, url), buffer);
      written.add(url);
      sprites[id] = {
        url,
        sha256: sha256(buffer),
        width,
        height,
        anchor: [Number(anchorX.toFixed(4)), Number(anchorY.toFixed(4))],
      };
      notes.push(id + ": " + width + "x" + height + ", " + spec.anchor + " anchor at " + sprites[id].anchor.join(", ") + ".");
    } catch (error) {
      fail(ship + "-" + id + ": " + error.message);
    }
  }

  for (const file of readdirSync(outDir)) {
    if (!written.has(file)) rmSync(join(outDir, file));
  }
  const version = parseInt(sha256(Buffer.from(JSON.stringify(sprites))).slice(0, 8), 16);
  writeFileSync(join(outDir, "fx.json"), JSON.stringify({ id: ship, version, sprites }, null, 2) + "\n");

  if (option("out") === null) {
    const manifestPath = join(ROOT, "public/assets/space-typing/manifest.json");
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      const tool = process.argv.find((argument) => argument.startsWith("--tool="))?.slice(7) ?? "Google Gemini";
      // Must be one of ART_CATEGORIES (src/assets/pipeline.ts): one unknown
      // category makes the game reject the whole manifest, ship art included.
      const entry = {
        id: "shot-fx-" + ship,
        category: "projectile",
        sourceType: "generated",
        source:
          "Owner-generated " + tool + " art from art-src/fx/" + ship + ", processed by scripts/bg-art/prepare-fx.mjs on " +
          new Date().toISOString().slice(0, 10) + "; runtime sprites /assets/space-typing/fx/" + ship + "/fx.json",
        author: "Space Typing project owner",
        license: "Personal use only; review the image tool's terms before any public distribution",
        attributionRequired: false,
      };
      const index = manifest.entries.findIndex((candidate) => candidate.id === entry.id);
      if (index >= 0) manifest.entries[index] = entry;
      else manifest.entries.push(entry);
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    }
  }

  console.log("✓ " + ship + ": " + Object.keys(sprites).length + " sprites → " + relative(ROOT, outDir));
  for (const note of notes) console.log("  " + note);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
