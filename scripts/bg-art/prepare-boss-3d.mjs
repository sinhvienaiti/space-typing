#!/usr/bin/env node
/**
 * Install and verify the authored Tyrant G01 GLB used by the runtime.
 *
 * Default source:
 *   art-src/3d/bosses/tyrant-g01.glb (art-src/3d mirrors the 2D art: art-src/bosses/tyrant-g01.png)
 *
 * Override for a local Blender/Meshy export:
 *   BOSS3D_SOURCE="/mnt/d/Meshy/tyrant-g01-boss10-v3-allinone-20261015.glb" \
 *     node scripts/bg-art/prepare-boss-3d.mjs
 */
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const source = process.env.BOSS3D_SOURCE
  ? resolve(process.env.BOSS3D_SOURCE)
  : resolve(ROOT, "art-src/3d/bosses/tyrant-g01.glb");
const output = resolve(ROOT, "public/assets/space-typing/bosses/3d/tyrant-g01.glb");

const REQUIRED_ANIMATIONS = [
  "__SPACE_TYPING_EXPORT__00_Boss_Idle_Hover_V3",
  "__SPACE_TYPING_EXPORT__01_Boss_Skill_Prismatic_Burst_V3",
];
const REQUIRED_NODES = ["FX_CORE", "FX_CAST_L", "FX_CAST_R", "FX_HALO"];

function readGlbJson(file) {
  const buffer = readFileSync(file);
  if (buffer.length < 20 || buffer.toString("ascii", 0, 4) !== "glTF") {
    throw new Error("Not a valid GLB: " + file);
  }
  const version = buffer.readUInt32LE(4);
  if (version !== 2) throw new Error("Expected GLB v2, got v" + String(version));
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) throw new Error("First GLB chunk is not JSON");
  return { buffer, json: JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim()) };
}

const { buffer, json } = readGlbJson(source);
const animations = new Set((json.animations ?? []).map((animation) => animation.name));
const nodes = new Set((json.nodes ?? []).map((node) => node.name));
const missingAnimations = REQUIRED_ANIMATIONS.filter((name) => !animations.has(name));
const missingNodes = REQUIRED_NODES.filter((name) => !nodes.has(name));
if (missingAnimations.length > 0 || missingNodes.length > 0) {
  throw new Error([
    "Boss 3D contract failed.",
    missingAnimations.length > 0 ? "Missing animations: " + missingAnimations.join(", ") : "",
    missingNodes.length > 0 ? "Missing nodes: " + missingNodes.join(", ") : "",
  ].filter(Boolean).join("\n"));
}

mkdirSync(dirname(output), { recursive: true });
copyFileSync(source, output);
console.log("[boss3d] installed", output);
console.log("[boss3d]", (buffer.length / 1024 / 1024).toFixed(2), "MiB ·", animations.size, "animations ·", REQUIRED_NODES.length, "VFX sockets OK");
