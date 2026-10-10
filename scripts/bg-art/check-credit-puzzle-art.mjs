#!/usr/bin/env node
import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { findInput, ROOT } from "./art-common.mjs";

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
    sizes: [256, 512],
  },
  puzzle: {
    src: join(ROOT, "art-src/puzzle"),
    out: join(ROOT, "src/assets/puzzle"),
    names: [
      "puzzle-carrier",
      "puzzle-chest-closed",
      "puzzle-chest-open",
    ],
    sizes: [512, 1024],
  },
};

const failures = [];
let checked = 0;

for (const [id, group] of Object.entries(GROUPS)) {
  const present = group.names.filter(
    (name) => findInput(group.src, name) !== null,
  );
  if (present.length === 0) continue;

  const missing = group.names.filter(
    (name) => findInput(group.src, name) === null,
  );
  if (missing.length > 0) {
    failures.push(
      id + ": incomplete source set; missing " + missing.join(", "),
    );
    continue;
  }

  for (const name of group.names) {
    const outputs = [
      [join(group.out, name + ".webp"), group.sizes[0]],
      [join(group.out, name + "@2x.webp"), group.sizes[1]],
    ];
    for (const [path, size] of outputs) {
      if (!existsSync(path)) {
        failures.push(name + ": missing runtime asset " + path);
        continue;
      }
      const metadata = await sharp(path).metadata();
      if (
        metadata.format !== "webp" ||
        metadata.width !== size ||
        metadata.height !== size
      ) {
        failures.push(
          name +
            ": invalid runtime asset " +
            path +
            " (expected " +
            size +
            "x" +
            size +
            " WebP)",
        );
      }
    }
    checked += 1;
  }
}

if (failures.length > 0) {
  console.error("Credit/Puzzle art check failed:");
  for (const failure of failures) console.error("- " + failure);
  console.error(
    "Run `pnpm art:prepare` after adding or replacing source art.",
  );
  process.exit(1);
}

console.log(
  checked === 0
    ? "Credit/Puzzle art check: no local source art; skipped."
    : "Credit/Puzzle art check: " +
        checked +
        " source asset(s) have valid runtime outputs.",
);
