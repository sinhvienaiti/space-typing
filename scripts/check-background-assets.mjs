import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const REGISTRY_FILE = "src/worlds/layered-background-registry.ts";
const BACKGROUND_PUBLIC_PREFIX = "/assets/space-typing/backgrounds/";

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
      "public/assets/space-typing/backgrounds/heaven/halo-garden-production-v2.avif",
    minWidth: 2560,
    minHeight: 1440,
  },
];

const registrySource = await readFile(
  resolve(process.cwd(), REGISTRY_FILE),
  "utf8",
);
const referencedBackgroundFiles = [
  ...new Set(
    [...registrySource.matchAll(/["']([^"']+\.(?:png|avif|svg))["']/g)]
      .map((match) => match[1])
      .filter((source) => !source.startsWith("/assets/space-typing/ships/"))
      .map((source) =>
        source.startsWith(BACKGROUND_PUBLIC_PREFIX)
          ? "public" + source
          : "public/assets/space-typing/backgrounds/" + source,
      ),
  ),
].sort();

for (const relative of referencedBackgroundFiles) {
  const data = await readFile(resolve(process.cwd(), relative));
  if (data.length === 0) {
    throw new Error(relative + ": referenced background asset is empty.");
  }
  if (relative.endsWith(".svg")) {
    const head = data.subarray(0, Math.min(data.length, 512)).toString("utf8");
    if (!head.includes("<svg")) {
      throw new Error(relative + ": referenced SVG has no <svg root.");
    }
  }
}

console.log(
  "Background reference integrity PASS:",
  referencedBackgroundFiles.length,
  "referenced local files exist and are non-empty.",
);

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
