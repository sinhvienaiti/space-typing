import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const AUDIO_FILES = [
  "public/assets/audio/music/sector.ogg",
  "public/assets/audio/music/pulse.ogg",
  "public/assets/audio/music/urgent.ogg",
  "public/assets/audio/stingers/victory.ogg",
  "public/assets/audio/ambient/engine-loop.ogg",
  "public/assets/audio/ambient/computer-loop.ogg",
  "public/assets/audio/sfx/kenney/laser-small.ogg",
  "public/assets/audio/sfx/kenney/laser-large.ogg",
  "public/assets/audio/sfx/kenney/force-field.ogg",
  "public/assets/audio/sfx/kenney/explosion-crunch.ogg",
  "public/assets/audio/sfx/kenney/explosion-low.ogg",
  "public/assets/audio/sfx/kenney/engine-large.ogg",
  "public/assets/audio/sfx/kenney/thruster.ogg",
  "public/assets/audio/sfx/kenney/confirm.ogg",
  "public/assets/audio/sfx/kenney/error.ogg",
];

if (AUDIO_FILES.length > 16) {
  throw new Error(
    "Default audio pack is no longer curated: " +
      AUDIO_FILES.length +
      " files.",
  );
}

let totalBytes = 0;
for (const relative of AUDIO_FILES) {
  const absolute = resolve(process.cwd(), relative);
  const info = await stat(absolute);
  if (info.size <= 1_000) {
    throw new Error(relative + ": audio file is unexpectedly small.");
  }
  totalBytes += info.size;

  const data = await readFile(absolute);
  if (data.subarray(0, 4).toString("ascii") !== "OggS") {
    throw new Error(relative + ": expected OGG/OggS header.");
  }
}

const maxBytes = 6 * 1024 * 1024;
if (totalBytes > maxBytes) {
  throw new Error(
    "Default audio payload " +
      totalBytes +
      " exceeds " +
      maxBytes +
      " byte curated budget.",
  );
}

console.log(
  "Audio asset guard PASS:",
  AUDIO_FILES.length,
  "OGG files,",
  (totalBytes / 1024 / 1024).toFixed(2),
  "MiB total.",
);
