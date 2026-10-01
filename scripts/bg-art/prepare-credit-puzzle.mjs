#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import {
  borderStats,
  findInput,
  rawImage,
  readArt,
  ROOT,
} from "./art-common.mjs";

const GROUPS = {
  credits: {
    src: join(ROOT, "art-src/pickups/credits"),
    out: join(ROOT, "src/assets/pickups/credits"),
    names: [
      "common",
      "refined",
      "high",
      "elite",
      "elite-golden",
      "mini-boss",
      "boss",
      "major-boss",
    ],
    standardSize: 256,
    detailSize: 512,
  },
  puzzle: {
    src: join(ROOT, "art-src/puzzle"),
    out: join(ROOT, "src/assets/puzzle"),
    names: [
      "puzzle-carrier",
      "puzzle-chest-closed",
      "puzzle-chest-open",
    ],
    standardSize: 512,
    detailSize: 1024,
  },
};

const target = process.argv[2] ?? "all";
if (target !== "all" && !(target in GROUPS)) {
  console.error("Usage: pnpm reward-art:prepare [all|credits|puzzle]");
  process.exit(2);
}

function hasAnySource(group) {
  if (!existsSync(group.src)) return false;
  return group.names.some((name) => findInput(group.src, name) !== null);
}

function validateTransparency(image, label) {
  const border = borderStats(image);
  const transparentShare =
    border.filter((pixel) => pixel[3] < 32).length /
    Math.max(1, border.length);
  if (transparentShare < 0.35) {
    throw new Error(
      label +
        ": source art must have a real transparent background; only " +
        Math.round(transparentShare * 100) +
        "% of border samples are transparent.",
    );
  }
}

async function writeVariant(image, size, targetPath, quality) {
  await rawImage(image)
    .resize(size, size, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality, alphaQuality: 100, effort: 5 })
    .toFile(targetPath);
}

async function prepareGroup(id, group) {
  if (!hasAnySource(group)) {
    console.log("• " + id + ": no source art found; skipped.");
    return 0;
  }

  const missing = group.names.filter(
    (name) => findInput(group.src, name) === null,
  );
  if (missing.length > 0) {
    throw new Error(
      id +
        ": source set is incomplete. Missing: " +
        missing.join(", "),
    );
  }

  mkdirSync(group.out, { recursive: true });
  const expected = new Set();

  for (const name of group.names) {
    const file = findInput(group.src, name);
    const notes = [];
    const image = await readArt(file, name, notes);
    validateTransparency(image, name);

    const standard = name + ".webp";
    const detailed = name + "@2x.webp";
    await writeVariant(
      image,
      group.standardSize,
      join(group.out, standard),
      92,
    );
    await writeVariant(
      image,
      group.detailSize,
      join(group.out, detailed),
      96,
    );
    expected.add(standard);
    expected.add(detailed);

    console.log(
      "✓ " +
        id +
        "/" +
        name +
        " → " +
        group.standardSize +
        "/" +
        group.detailSize +
        " px",
    );
    for (const note of notes) console.log("  · " + note);
  }

  for (const file of readdirSync(group.out)) {
    if (file.endsWith(".webp") && !expected.has(file)) {
      rmSync(join(group.out, file));
    }
  }
  return group.names.length;
}

let written = 0;
for (const [id, group] of Object.entries(GROUPS)) {
  if (target !== "all" && target !== id) continue;
  written += await prepareGroup(id, group);
}
console.log("Reward art prepare complete: " + written + " source asset(s).");
