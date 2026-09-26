import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const PNG_FILES = [
  "public/assets/space-typing/backgrounds/vendor/screaming-brain/nebula-purple-3-1024.png",
  "public/assets/space-typing/backgrounds/vendor/screaming-brain/planet-ocean-03-512.png",
  "public/assets/space-typing/backgrounds/vendor/screaming-brain/planet-blue-giant-04-512.png",
  "public/assets/space-typing/backgrounds/vendor/screaming-brain/planet-cratered-03-512.png",
  "public/assets/space-typing/backgrounds/vendor/screaming-brain/sun-blue-03-512.png",
  "public/assets/space-typing/backgrounds/vendor/luminousdragon/stars-dense.png",
  "public/assets/space-typing/backgrounds/vendor/luminousdragon/stars-sparse.png",
  "public/assets/space-typing/backgrounds/vendor/luminousdragon/stars-planets.png",
  "public/assets/space-typing/backgrounds/vendor/luminousdragon/asteroid-field.png",
  "public/assets/space-typing/backgrounds/vendor/ohjirochan/asteroid-small.png",
  "public/assets/space-typing/backgrounds/vendor/ohjirochan/asteroid-medium.png",
  "public/assets/space-typing/backgrounds/vendor/ohjirochan/asteroid-large.png",
];

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function assertPng(relative, data) {
  if (
    data.length < 24 ||
    PNG_SIGNATURE.some((byte, index) => data[index] !== byte)
  ) {
    throw new Error(relative + ": invalid PNG signature.");
  }

  const chunkType = data.subarray(12, 16).toString("ascii");
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  if (chunkType !== "IHDR" || width <= 0 || height <= 0) {
    throw new Error(relative + ": invalid PNG IHDR dimensions.");
  }
  return { width, height };
}

const dimensions = [];
for (const relative of PNG_FILES) {
  const absolute = resolve(process.cwd(), relative);
  const data = await readFile(absolute);
  dimensions.push({
    relative,
    ...assertPng(relative, data),
  });
}

console.log(
  "Background asset integrity PASS:",
  dimensions.length,
  "PNG files with valid headers/dimensions.",
);
