#!/usr/bin/env node
/**
 * Renders the game's songs (scripts/music/songs/) into calm and intense
 * stems, encodes them to Opus and writes the runtime metadata the game
 * imports (src/audio/music-tracks.json: titles, moods, lengths, mix-out
 * points and cache-busting ?v=<sha> URLs).
 *
 *   pnpm music:render                         # every song, 6 in parallel
 *   pnpm music:render --song=ember-rush       # one song (others keep their entries)
 *   node scripts/music/render-songs.mjs --song=ember-rush --stem=calm --bars=16 --preview=.visual/music
 *
 * --bars=N renders only the first N bars as a WAV preview (no Opus, no
 * metadata), for quick listening checks. Guide: docs/MUSIC_SYSTEM.md.
 */
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { wavBytes } from "./synth.mjs";
import { STEMS, mixStem, renderStem, timeline } from "./song-engine.mjs";
import { SONGS } from "./songs/index.mjs";

const SCRIPT = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SCRIPT), "../..");

function flag(name, fallback) {
  const prefix = "--" + name + "=";
  const match = process.argv.find((argument) => argument.startsWith(prefix));
  return match === undefined ? fallback : match.slice(prefix.length);
}

const outDir = resolve(ROOT, flag("out", "public/assets/audio/music/songs"));
const metaPath = resolve(ROOT, flag("meta", "src/audio/music-tracks.json"));
const bitrate = flag("bitrate", "64k");
const previewDir = flag("preview", null);
const fragment = flag("fragment", null);
const barsLimit = Number(flag("bars", "0"));
const jobs = Math.max(1, Number(flag("jobs", "6")));
const stemFlag = flag("stem", "both");
const stems = stemFlag === "both" ? STEMS : [stemFlag];
const wanted = flag("song", null)?.split(",") ?? null;
const songs = SONGS.filter((song) => wanted === null || wanted.includes(song.id));
if (songs.length === 0) {
  console.error("No song matches --song=" + wanted?.join(","));
  process.exit(2);
}

function sha16(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
}

/** First N bars only: a quick preview spec. */
function trimmed(spec, bars) {
  const sections = [];
  let left = bars;
  for (const section of spec.sections) {
    if (left <= 0) break;
    sections.push({ ...section, bars: Math.min(section.bars, left), ending: false });
    left -= section.bars;
  }
  return { ...spec, sections };
}

function renderSong(spec) {
  const tl = timeline(spec);
  const entry = {
    id: spec.id,
    title: spec.title,
    mood: spec.mood,
    key: spec.key,
    bpm: spec.bpm,
    meter: spec.meter ?? 4,
    seconds: Number(tl.totalSeconds.toFixed(3)),
    mixOut: Number(tl.mixOut.toFixed(3)),
    stems: {},
  };
  const work = mkdtempSync(join(tmpdir(), "space-typing-song-"));
  try {
    for (const stem of stems) {
      const started = Date.now();
      const source = barsLimit > 0 ? trimmed(spec, barsLimit) : spec;
      const rendered = renderStem(source, stem);
      const result = mixStem(source, stem, rendered);
      const wav = join(work, stem + ".wav");
      writeFileSync(wav, wavBytes(result.bus));
      if (previewDir !== null) {
        const dir = resolve(ROOT, previewDir);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, spec.id + "-" + stem + ".wav"), wavBytes(result.bus));
      }
      let kib = null;
      if (barsLimit === 0) {
        const songDir = join(outDir, spec.id);
        mkdirSync(songDir, { recursive: true });
        const ogg = join(songDir, stem + ".ogg");
        execFileSync("ffmpeg", [
          "-hide_banner", "-loglevel", "error", "-y", "-i", wav,
          "-c:a", "libopus", "-b:a", bitrate, "-vbr", "on", "-application", "audio",
          "-metadata", "title=" + spec.title + " (" + stem + ")",
          "-metadata", "artist=Space Typing (generated)",
          ogg,
        ]);
        entry.stems[stem] = "/assets/audio/music/songs/" + spec.id + "/" + stem + ".ogg?v=" + sha16(ogg);
        kib = Math.round(statSync(ogg).size / 1024);
      }
      console.log(JSON.stringify({
        song: spec.id,
        stem,
        seconds: entry.seconds,
        lufs: Number(result.lufs.toFixed(2)),
        peakDb: Number(result.peak.toFixed(2)),
        sections: result.sections.join(" | "),
        balance: result.balance,
        kib,
        renderSeconds: (Date.now() - started) / 1000,
      }));
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  return entry;
}

function readMeta() {
  if (!existsSync(metaPath)) return { tracks: [] };
  try {
    return JSON.parse(readFileSync(metaPath, "utf8"));
  } catch {
    return { tracks: [] };
  }
}

function writeMeta(entries) {
  const current = readMeta();
  const byId = new Map(current.tracks.map((track) => [track.id, track]));
  for (const entry of entries) {
    const previous = byId.get(entry.id);
    // A one-stem render keeps the other stem's URL.
    byId.set(entry.id, { ...entry, stems: { ...(previous?.stems ?? {}), ...entry.stems } });
  }
  // Library order, only songs that still exist.
  const tracks = SONGS.map((song) => byId.get(song.id)).filter((track) => track !== undefined);
  writeFileSync(
    metaPath,
    JSON.stringify({ generatedBy: "scripts/music/render-songs.mjs", tracks }, null, 2) + "\n",
  );
}

async function runParallel() {
  const temp = mkdtempSync(join(tmpdir(), "space-typing-songs-"));
  const queue = [...songs];
  const running = new Set();
  const failures = [];
  const launch = (song) =>
    new Promise((done) => {
      const args = [SCRIPT, "--song=" + song.id, "--stem=" + stemFlag, "--bitrate=" + bitrate, "--fragment=" + join(temp, song.id + ".json")];
      if (previewDir !== null) args.push("--preview=" + previewDir);
      const child = spawn(process.execPath, args, { stdio: ["ignore", "inherit", "inherit"] });
      child.on("exit", (code) => {
        if (code !== 0) failures.push(song.id);
        done();
      });
    });
  while (queue.length > 0 || running.size > 0) {
    while (queue.length > 0 && running.size < jobs) {
      const promise = launch(queue.shift()).then(() => running.delete(promise));
      running.add(promise);
    }
    await Promise.race(running);
  }
  const entries = readdirSync(temp).map((file) => JSON.parse(readFileSync(join(temp, file), "utf8")));
  rmSync(temp, { recursive: true, force: true });
  writeMeta(entries);
  if (failures.length > 0) {
    console.error("Failed: " + failures.join(", "));
    process.exit(1);
  }
}

if (fragment !== null || songs.length === 1 || jobs === 1 || barsLimit > 0) {
  const entries = songs.map(renderSong);
  if (barsLimit === 0) {
    if (fragment !== null) writeFileSync(fragment, JSON.stringify(entries[0]));
    else writeMeta(entries);
  }
} else {
  await runParallel();
}
