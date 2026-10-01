#!/usr/bin/env node
import {
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import {
  basename,
  extname,
  join,
  relative,
} from "node:path";
import { spawnSync } from "node:child_process";
import { EXTENSIONS, ROOT } from "./art-common.mjs";

const extensionSet = new Set(EXTENSIONS);

function imageFiles(dir, recursive = false) {
  if (!existsSync(dir)) return [];
  const result = [];
  for (const name of readdirSync(dir)) {
    if (name === "_out") continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (recursive) result.push(...imageFiles(path, true));
      continue;
    }
    if (extensionSet.has(extname(name).toLowerCase())) result.push(path);
  }
  return result;
}

function isStale(source, outputs) {
  const sourceTime = statSync(source).mtimeMs;
  return outputs.some(
    (output) =>
      !existsSync(output) || statSync(output).mtimeMs < sourceTime,
  );
}

function anyNewerThanSentinel(dir, sentinel) {
  const files = imageFiles(dir);
  if (files.length === 0) return false;
  if (!existsSync(sentinel)) return true;
  const outputTime = statSync(sentinel).mtimeMs;
  return files.some((file) => statSync(file).mtimeMs > outputTime);
}

function run(script, args = []) {
  const label = relative(ROOT, script);
  console.log("→ " + label + (args.length > 0 ? " " + args.join(" ") : ""));
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const bgKits = {
  g01: "g01-celestial",
  g02: "g02-infernal",
  g03: "g03-frost-prism",
  g04: "g04-verdant",
  g05: "g05-shadow-nature",
  g06: "g06-cosmic-forge",
  g07: "g07-abyssal",
  g08: "g08-aurora-cosmic",
  g09: "g09-void-cathedral",
  g10: "g10-eternity",
};

let prepared = 0;

for (const [sourceId, kitId] of Object.entries(bgKits)) {
  const source = join(ROOT, "art-src", sourceId);
  const sentinel = join(
    ROOT,
    "public/assets/space-typing/backgrounds",
    kitId,
    "kit.json",
  );
  if (!anyNewerThanSentinel(source, sentinel)) continue;
  run(join(ROOT, "scripts/bg-art/prepare-kit.mjs"), [kitId]);
  prepared += 1;
}

const combatVfxRoot = join(ROOT, "art-src/combat-vfx");
if (
  anyNewerThanSentinel(
    combatVfxRoot,
    join(
      ROOT,
      "public/assets/space-typing/combat-vfx/vfx.json",
    ),
  )
) {
  run(
    join(
      ROOT,
      "scripts/bg-art/prepare-combat-vfx.mjs",
    ),
  );
  prepared += 1;
}

const fxRoot = join(ROOT, "art-src/fx");
if (existsSync(fxRoot)) {
  for (const ship of readdirSync(fxRoot).sort()) {
    const source = join(fxRoot, ship);
    if (!statSync(source).isDirectory()) continue;
    const sentinel = join(
      ROOT,
      "public/assets/space-typing/fx",
      ship,
      "fx.json",
    );
    if (!anyNewerThanSentinel(source, sentinel)) continue;
    run(join(ROOT, "scripts/bg-art/prepare-fx.mjs"), [ship]);
    prepared += 1;
  }
}

const staleSprites = new Set();
for (const [sourceDir, outputDir] of [
  ["art-src/enemies", "src/assets/enemies"],
  ["art-src/bosses", "src/assets/bosses"],
]) {
  for (const source of imageFiles(join(ROOT, sourceDir))) {
    const name = basename(source, extname(source));
    if (
      isStale(source, [
        join(ROOT, outputDir, name + ".webp"),
        join(ROOT, outputDir, name + "@2x.webp"),
      ])
    ) {
      staleSprites.add(name);
    }
  }
}
if (staleSprites.size > 0) {
  run(join(ROOT, "scripts/bg-art/prepare-sprites.mjs"), [
    ...[...staleSprites].sort(),
  ]);
  prepared += 1;
}

let staleIcons = false;
for (const [sourceDir, outputDir] of [
  ["art-src/icons/skills", "src/assets/icons/skills"],
  ["art-src/icons/equipment", "src/assets/icons/equipment"],
]) {
  for (const source of imageFiles(join(ROOT, sourceDir))) {
    const name = basename(source, extname(source));
    if (isStale(source, [join(ROOT, outputDir, name + ".webp")])) {
      staleIcons = true;
      break;
    }
  }
}
if (staleIcons) {
  run(join(ROOT, "scripts/bg-art/prepare-icons.mjs"));
  prepared += 1;
}

let staleExpansion = false;
const expansionRoot = join(ROOT, "art-src/expansion-v2");
for (const source of imageFiles(expansionRoot, true)) {
  const rel = relative(expansionRoot, source);
  const stem = rel.slice(0, -extname(rel).length);
  if (
    isStale(source, [
      join(ROOT, "src/assets/expansion-v2", stem + ".webp"),
      join(ROOT, "src/assets/expansion-v2", stem + "@2x.webp"),
    ])
  ) {
    staleExpansion = true;
    break;
  }
}
if (staleExpansion) {
  run(join(ROOT, "scripts/bg-art/prepare-expansion-v2.mjs"));
  prepared += 1;
}

let staleRewardArt = false;
for (const [sourceDir, outputDir, names] of [
  [
    "art-src/pickups/credits",
    "src/assets/pickups/credits",
    [
      "common",
      "refined",
      "high",
      "elite",
      "elite-golden",
      "mini-boss",
      "boss",
      "major-boss",
    ],
  ],
  [
    "art-src/puzzle",
    "src/assets/puzzle",
    [
      "puzzle-carrier",
      "puzzle-chest-closed",
      "puzzle-chest-open",
    ],
  ],
]) {
  for (const name of names) {
    const source = EXTENSIONS
      .map((extension) => join(ROOT, sourceDir, name + extension))
      .find((path) => existsSync(path));
    if (
      source !== undefined &&
      isStale(source, [
        join(ROOT, outputDir, name + ".webp"),
        join(ROOT, outputDir, name + "@2x.webp"),
      ])
    ) {
      staleRewardArt = true;
      break;
    }
  }
}
if (staleRewardArt) {
  run(join(ROOT, "scripts/bg-art/prepare-credit-puzzle.mjs"));
  prepared += 1;
}

console.log(
  prepared === 0
    ? "✓ Local Space Typing art is current."
    : "✓ Local Space Typing art refresh complete (" +
        prepared +
        " pipeline(s)).",
);
