#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readdirSync,
} from "node:fs";
import { basename, extname, join } from "node:path";
import sharp from "sharp";
import {
  EXTENSIONS,
  rawImage,
  readArt,
  ROOT,
} from "./art-common.mjs";

const GROUPS = [
  {
    src: join(ROOT, "art-src/icons/skills"),
    out: join(ROOT, "src/assets/icons/skills"),
  },
  {
    src: join(ROOT, "art-src/icons/equipment"),
    out: join(ROOT, "src/assets/icons/equipment"),
  },
];

let written = 0;
for (const group of GROUPS) {
  if (!existsSync(group.src)) continue;
  mkdirSync(group.out, { recursive: true });

  for (const entry of readdirSync(group.src).sort()) {
    const extension = extname(entry).toLowerCase();
    if (!EXTENSIONS.includes(extension)) continue;
    const name = basename(entry, extension);
    const notes = [];
    const image = await readArt(join(group.src, entry), name, notes);
    await rawImage(image)
      .resize(256, 256, {
        fit: "cover",
        kernel: sharp.kernel.lanczos3,
      })
      .webp({ quality: 94, alphaQuality: 100, effort: 5 })
      .toFile(join(group.out, name + ".webp"));
    written += 1;
    console.log("✓ icon/" + name + " → 256 px");
    for (const note of notes) console.log("  · " + note);
  }
}
console.log(written + " icon source asset(s) prepared.");
