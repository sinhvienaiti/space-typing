import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const AUDIO_FILES = [
  "public/assets/audio/music/sector.ogg",
  "public/assets/audio/music/pulse.ogg",
  "public/assets/audio/music/urgent.ogg",
  "public/assets/audio/music/mysterious-ambience.mp3",
  "public/assets/audio/music/battle-theme-b.mp3",
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

function hasMp3Header(data) {
  const id3 =
    data.length >= 3 &&
    data[0] === 0x49 &&
    data[1] === 0x44 &&
    data[2] === 0x33;
  const frameSync =
    data.length >= 2 &&
    data[0] === 0xff &&
    (data[1] & 0xe0) === 0xe0;
  return id3 || frameSync;
}

let totalBytes = 0;
for (const relative of AUDIO_FILES) {
  const absolute = resolve(process.cwd(), relative);
  const data = await readFile(absolute);
  totalBytes += data.length;

  const extension = extname(relative).toLowerCase();
  if (
    extension === ".ogg" &&
    data.subarray(0, 4).toString("ascii") !== "OggS"
  ) {
    throw new Error(relative + ": expected OGG/OggS header.");
  }
  if (extension === ".mp3" && !hasMp3Header(data)) {
    throw new Error(relative + ": expected MP3 ID3/frame header.");
  }
}

// Generated songs (pnpm music:render): every stem the game will request must
// exist, be Ogg, and match the ?v=<sha256 prefix> the runtime uses to bust
// the Play-mode cache.
const library = JSON.parse(
  await readFile(resolve(process.cwd(), "src/audio/music-tracks.json"), "utf8"),
);
let songStems = 0;
for (const track of library.tracks ?? []) {
  for (const stem of ["calm", "intense"]) {
    const url = track.stems?.[stem];
    if (typeof url !== "string") {
      throw new Error("music-tracks.json: " + track.id + " has no " + stem + " stem.");
    }
    const [path, query] = url.split("?v=");
    const data = await readFile(resolve(process.cwd(), "public" + path));
    if (data.subarray(0, 4).toString("ascii") !== "OggS") {
      throw new Error(path + ": expected OGG/OggS header.");
    }
    const sha = createHash("sha256").update(data).digest("hex").slice(0, 16);
    if (sha !== query) {
      throw new Error(path + ": content changed since music-tracks.json (re-run pnpm music:render).");
    }
    totalBytes += data.length;
    songStems += 1;
  }
}

console.log(
  "Songs:",
  (library.tracks ?? []).length,
  "songs,",
  songStems,
  "stems.",
);
console.log(
  "Audio asset integrity PASS:",
  AUDIO_FILES.length,
  "audio files,",
  (totalBytes / 1024 / 1024).toFixed(2),
  "MiB total (report-only).",
);
