import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const PNG_FILES = [
  "public/assets/space-typing/backgrounds/vendor/screaming-brain/nebula-purple-3-1024.png",
  "public/assets/space-typing/backgrounds/vendor/screaming-brain/nebula-blue-6-1024.png",
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

const AVIF_FILES = [
  {
    relative:
      "public/assets/space-typing/backgrounds/heaven/halo-garden-production-v1.avif",
    minWidth: 896,
    minHeight: 504,
  },
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


function assertAvif(relative, data, minWidth, minHeight) {
  if (
    data.length < 24 ||
    data.subarray(4, 8).toString("ascii") !== "ftyp" ||
    data.subarray(8, 12).toString("ascii") !== "avif"
  ) {
    throw new Error(relative + ": invalid AVIF ftyp signature.");
  }

  const ispeOffset = data.indexOf(Buffer.from("ispe", "ascii"));
  if (ispeOffset < 0 || ispeOffset + 16 > data.length) {
    throw new Error(relative + ": missing AVIF ispe dimensions.");
  }

  const width = data.readUInt32BE(ispeOffset + 8);
  const height = data.readUInt32BE(ispeOffset + 12);
  if (width < minWidth || height < minHeight) {
    throw new Error(
      relative +
        ": production artwork is unexpectedly small (" +
        width +
        "x" +
        height +
        ").",
    );
  }

  return { width, height };
}

const avifDimensions = [];
for (const asset of AVIF_FILES) {
  const absolute = resolve(process.cwd(), asset.relative);
  const data = await readFile(absolute);
  avifDimensions.push({
    relative: asset.relative,
    ...assertAvif(
      asset.relative,
      data,
      asset.minWidth,
      asset.minHeight,
    ),
  });
}

console.log(
  "Background AVIF integrity PASS:",
  avifDimensions.map((asset) => asset.relative + " " + asset.width + "x" + asset.height).join(", "),
);
