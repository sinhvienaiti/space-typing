#!/usr/bin/env node
/**
 * Checks how smooth song handovers are, the way the game performs them
 * (MusicController: 7 s equal-power crossfade from the outgoing song's mixOut
 * into the next song's start, the outgoing one low-passed down to ~520 Hz,
 * the incoming one opening from ~1.1 kHz). Reports the momentary loudness
 * (400 ms, K-weighted) through each handover: the deepest dip and the
 * highest bump against the level just before and just after, and whether
 * any moment falls silent.
 *
 *   node scripts/music/transition-check.mjs                 # every playlist pair
 *   node scripts/music/transition-check.mjs --pair=ember-rush,requiem-of-light
 *   node scripts/music/transition-check.mjs --wav=.visual/music/handovers   # also write previews
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Bus, SAMPLE_RATE, Svf, wavBytes } from "./synth.mjs";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const CROSSFADE = Number(process.argv.find((a) => a.startsWith("--seconds="))?.slice(10) ?? 7);
// Curve shape (kept in step with MusicController: fadeCurves / handoverCutoffs).
const OUT_FLOOR = Number(process.argv.find((a) => a.startsWith("--out-floor="))?.slice(12) ?? 520);
const IN_START = Number(process.argv.find((a) => a.startsWith("--in-start="))?.slice(11) ?? 1100);
const IN_OPEN = Number(process.argv.find((a) => a.startsWith("--in-open="))?.slice(10) ?? 0.7);
const OUT_POW = Number(process.argv.find((a) => a.startsWith("--out-pow="))?.slice(10) ?? 1);
const IN_POW = Number(process.argv.find((a) => a.startsWith("--in-pow="))?.slice(9) ?? 1);
/** Seconds to start the handover before the recorded mixOut (what-if tuning). */
const EARLY = Number(process.argv.find((a) => a.startsWith("--early="))?.slice(8) ?? 0);
const library = JSON.parse(readFileSync(join(ROOT, "src/audio/music-tracks.json"), "utf8")).tracks;
const byId = new Map(library.map((track) => [track.id, track]));

function flag(name, fallback) {
  const prefix = "--" + name + "=";
  const match = process.argv.find((argument) => argument.startsWith(prefix));
  return match === undefined ? fallback : match.slice(prefix.length);
}

const cache = new Map();
function decode(track, stem) {
  const key = track.id + ":" + stem;
  if (cache.has(key)) return cache.get(key);
  const file = join(ROOT, "public", track.stems[stem].split("?")[0]);
  const raw = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", file, "-f", "f32le", "-ac", "2", "-ar", String(SAMPLE_RATE), "-"], {
    maxBuffer: 1 << 30,
  });
  const samples = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  const bus = new Bus(samples.length / 2);
  for (let index = 0; index < bus.frames; index += 1) {
    bus.l[index] = samples[index * 2];
    bus.r[index] = samples[index * 2 + 1];
  }
  cache.set(key, bus);
  return bus;
}

/** The handover as the game plays it, from 4 s before mixOut to 6 s after the fade. */
function handover(from, to, stem) {
  const a = decode(from, stem);
  const b = decode(to, stem);
  const lead = 4;
  const tail = 6;
  const frames = Math.round((lead + CROSSFADE + tail) * SAMPLE_RATE);
  const out = new Bus(frames);
  // --at-hold: start where the outgoing song reaches its held final chord.
  const bar = (60 / from.bpm) * (from.meter ?? 4);
  const holdStart = from.seconds - 4.5 - 2 * bar;
  const mixOut = process.argv.includes("--at-hold") ? holdStart - EARLY : from.mixOut - EARLY;
  const start = Math.round((mixOut - lead) * SAMPLE_RATE);
  const fadeFrames = CROSSFADE * SAMPLE_RATE;
  const leadFrames = lead * SAMPLE_RATE;
  const filters = { a: [new Svf("low", 0.707), new Svf("low", 0.707)], b: [new Svf("low", 0.707), new Svf("low", 0.707)] };
  for (let index = 0; index < frames; index += 1) {
    const p = Math.max(0, Math.min(1, (index - leadFrames) / fadeFrames));
    if ((index & 63) === 0) {
      const outCutoff = 18000 * (OUT_FLOOR / 18000) ** p;
      const inCutoff = p >= IN_OPEN ? 20000 : IN_START * (20000 / IN_START) ** (p / IN_OPEN);
      for (const filter of filters.a) filter.setCutoff(Math.min(20000, outCutoff));
      for (const filter of filters.b) filter.setCutoff(inCutoff);
    }
    const ga = Math.cos((p * Math.PI) / 2) ** OUT_POW;
    const gb = Math.sin((p * Math.PI) / 2) ** IN_POW;
    const ai = start + index;
    const bi = index - leadFrames;
    const al = ai < a.frames ? a.l[ai] : 0;
    const ar = ai < a.frames ? a.r[ai] : 0;
    const bl = bi >= 0 && bi < b.frames ? b.l[bi] : 0;
    const br = bi >= 0 && bi < b.frames ? b.r[bi] : 0;
    const fa = p > 0 ? [filters.a[0].process(al), filters.a[1].process(ar)] : [al, ar];
    const fb = [filters.b[0].process(bl), filters.b[1].process(br)];
    out.l[index] = fa[0] * ga + fb[0] * gb;
    out.r[index] = fa[1] * ga + fb[1] * gb;
  }
  return { out, lead };
}

/** Momentary loudness (400 ms windows, 100 ms hop), LUFS. */
function momentary(bus) {
  const biquad = (b0, b1, b2, a1, a2) => {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    return (x) => {
      const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      return y;
    };
  };
  const weigh = (data) => {
    const shelf = biquad(1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585);
    const high = biquad(1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621);
    return data.map((x) => high(shelf(x)));
  };
  const l = weigh(bus.l);
  const r = weigh(bus.r);
  const block = Math.round(0.4 * SAMPLE_RATE);
  const hop = Math.round(0.1 * SAMPLE_RATE);
  const values = [];
  for (let start = 0; start + block <= bus.frames; start += hop) {
    let sum = 0;
    for (let index = start; index < start + block; index += 1) sum += l[index] * l[index] + r[index] * r[index];
    values.push({ t: (start + block / 2) / SAMPLE_RATE, lufs: -0.691 + 10 * Math.log10(sum / block || 1e-12) });
  }
  return values;
}

function check(fromId, toId, stem, wavDir) {
  const from = byId.get(fromId);
  const to = byId.get(toId);
  const { out, lead } = handover(from, to, stem);
  const curve = momentary(out);
  const before = curve.filter((point) => point.t < lead - 0.5);
  const after = curve.filter((point) => point.t > lead + CROSSFADE + 1);
  const during = curve.filter((point) => point.t >= lead && point.t <= lead + CROSSFADE);
  const average = (points) => points.reduce((sum, point) => sum + point.lufs, 0) / points.length;
  const reference = Math.min(average(before), average(after));
  const ceiling = Math.max(average(before), average(after));
  const low = Math.min(...during.map((point) => point.lufs));
  const high = Math.max(...during.map((point) => point.lufs));
  if (wavDir !== null) {
    mkdirSync(wavDir, { recursive: true });
    writeFileSync(join(wavDir, fromId + "--" + toId + "-" + stem + ".wav"), wavBytes(out));
  }
  return {
    pair: fromId + " → " + toId,
    stem,
    before: Number(average(before).toFixed(1)),
    after: Number(average(after).toFixed(1)),
    dip: Number((low - reference).toFixed(1)),
    bump: Number((high - ceiling).toFixed(1)),
    silent: during.some((point) => point.lufs < -45),
  };
}

const pairFlag = flag("pair", null);
const wavDir = flag("wav", null) === null ? null : resolve(ROOT, flag("wav", null));
const stem = flag("stem", "calm");
const pairs = [];
if (pairFlag !== null) {
  const [a, b] = pairFlag.split(",");
  pairs.push([a, b]);
} else {
  // Consecutive songs of every Galaxy playlist (as authored in music-library.ts).
  const source = readFileSync(join(ROOT, "src/audio/music-library.ts"), "utf8");
  const lists = [...source.matchAll(/^\s*\d+: \[([^\]]+)\]/gm)].map((match) => [...match[1].matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]));
  const seen = new Set();
  for (const list of lists) {
    list.forEach((id, index) => {
      const next = list[(index + 1) % list.length];
      const key = id + ">" + next;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push([id, next]);
      }
    });
  }
}
let worstDip = 0;
let worstBump = 0;
for (const [a, b] of pairs) {
  const result = check(a, b, stem, wavDir);
  worstDip = Math.min(worstDip, result.dip);
  worstBump = Math.max(worstBump, result.bump);
  console.log(JSON.stringify(result));
}
console.log(JSON.stringify({ pairs: pairs.length, stem, worstDip, worstBump }));
