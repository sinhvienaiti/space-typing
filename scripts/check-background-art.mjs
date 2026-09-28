#!/usr/bin/env node
/**
 * Build guard for BGV background kits (docs/BACKGROUND_VISUAL_REBOOT_PLAN.md)
 * and ship shot sprites (docs/PLAYER_SHOTS_HANDOFF.md). Every
 * public/assets/space-typing/backgrounds/<kit>/kit.json and
 * public/assets/space-typing/fx/<ship>/fx.json must reference existing WebP
 * files with matching SHA-256 and dimensions, and no folder may contain
 * unreferenced files. Sizes are reported, not capped.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BACKGROUNDS = join(ROOT, "public/assets/space-typing/backgrounds");

function webpSize(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (chunk === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8 ") {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  return null;
}

const errors = [];
let totalBytes = 0;
let kits = 0;

if (existsSync(BACKGROUNDS)) {
  for (const entry of readdirSync(BACKGROUNDS)) {
    const kitDir = join(BACKGROUNDS, entry);
    const manifestPath = join(kitDir, "kit.json");
    if (!statSync(kitDir).isDirectory() || !existsSync(manifestPath)) continue;
    kits += 1;
    let kit;
    try {
      kit = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch (error) {
      errors.push(entry + ": kit.json is not valid JSON (" + error.message + ").");
      continue;
    }
    if (kit.id !== entry) errors.push(entry + ": kit.json id " + kit.id + " does not match its folder.");
    const referenced = new Set(["kit.json"]);
    for (const [textureId, texture] of Object.entries(kit.textures ?? {})) {
      for (const variant of texture.variants ?? []) {
        referenced.add(variant.url);
        const file = join(kitDir, variant.url);
        if (!existsSync(file)) {
          errors.push(entry + "/" + variant.url + ": missing.");
          continue;
        }
        const buffer = readFileSync(file);
        totalBytes += buffer.length;
        const digest = createHash("sha256").update(buffer).digest("hex");
        if (digest !== variant.sha256) errors.push(entry + "/" + variant.url + ": SHA-256 mismatch.");
        const size = webpSize(buffer);
        if (size === null) {
          errors.push(entry + "/" + variant.url + ": not a WebP file.");
        } else if (Math.max(size.width, size.height) !== variant.maxSize) {
          errors.push(
            entry + "/" + variant.url + ": " + size.width + "x" + size.height +
              " does not match maxSize " + variant.maxSize + ".",
          );
        } else if (Math.abs(size.width / size.height - texture.aspect) > 0.02 * texture.aspect) {
          errors.push(entry + "/" + variant.url + ": aspect does not match " + textureId + ".");
        }
      }
    }
    for (const [atlasId, atlas] of Object.entries(kit.atlases ?? {})) {
      if (kit.textures?.[atlas.texture] === undefined) {
        errors.push(entry + ": atlas " + atlasId + " references missing texture " + atlas.texture + ".");
      }
    }
    for (const file of readdirSync(kitDir)) {
      if (!referenced.has(file)) errors.push(entry + "/" + file + ": not referenced by kit.json.");
    }
  }
}

// Ship shot sprites (scripts/bg-art/prepare-fx.mjs): fx/<ship>/fx.json.
const FX = join(ROOT, "public/assets/space-typing/fx");
let fxKits = 0;
let fxBytes = 0;
if (existsSync(FX)) {
  for (const entry of readdirSync(FX)) {
    const fxDir = join(FX, entry);
    const manifestPath = join(fxDir, "fx.json");
    if (!statSync(fxDir).isDirectory() || !existsSync(manifestPath)) continue;
    fxKits += 1;
    let fx;
    try {
      fx = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch (error) {
      errors.push("fx/" + entry + ": fx.json is not valid JSON (" + error.message + ").");
      continue;
    }
    if (fx.id !== entry) errors.push("fx/" + entry + ": fx.json id " + fx.id + " does not match its folder.");
    const referenced = new Set(["fx.json"]);
    for (const [spriteId, sprite] of Object.entries(fx.sprites ?? {})) {
      referenced.add(sprite.url);
      const where = "fx/" + entry + "/" + sprite.url;
      const file = join(fxDir, sprite.url);
      if (!existsSync(file)) {
        errors.push(where + ": missing.");
        continue;
      }
      const buffer = readFileSync(file);
      fxBytes += buffer.length;
      if (createHash("sha256").update(buffer).digest("hex") !== sprite.sha256) {
        errors.push(where + ": SHA-256 mismatch.");
      }
      const size = webpSize(buffer);
      if (size === null) {
        errors.push(where + ": not a WebP file.");
      } else if (size.width !== sprite.width || size.height !== sprite.height) {
        errors.push(where + ": " + size.width + "x" + size.height + " does not match " + spriteId + ".");
      }
      const anchor = sprite.anchor;
      if (
        !Array.isArray(anchor) ||
        anchor.length !== 2 ||
        anchor.some((value) => typeof value !== "number" || value < 0 || value > 1)
      ) {
        errors.push(where + ": anchor must be two fractions in 0..1.");
      }
    }
    for (const file of readdirSync(fxDir)) {
      if (!referenced.has(file)) errors.push("fx/" + entry + "/" + file + ": not referenced by fx.json.");
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error("✗ " + error);
  process.exit(1);
}
console.log(
  "Shot FX: " + fxKits + " kit(s), " + (fxBytes / 1024).toFixed(1) + " KiB of sprites (reported, not capped).",
);
console.log(
  "Background kits: " + kits + " kit(s), " + (totalBytes / (1024 * 1024)).toFixed(2) +
    " MiB of runtime textures (reported, not capped).",
);
