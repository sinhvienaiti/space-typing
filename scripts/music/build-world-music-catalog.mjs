import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const legacyPath = path.join(root, "src/audio/music-tracks.json");
const outputPath = path.join(root, "src/audio/world-music-catalog.json");
const authoredRoot = path.join(root, "public/assets/audio/music");
const worldRoot = path.join(authoredRoot, "worlds");
const specialRoot = path.join(authoredRoot, "special");
const WORLD_IDS = Array.from(
  { length: 50 },
  (_, index) => `world-${String(index + 1).padStart(2, "0")}`,
);
const WORLD_ID_SET = new Set(WORLD_IDS);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizedSource(source, owner) {
  assert(source && typeof source.src === "string" && source.src.trim(), `${owner}: source src required`);
  assert(!source.src.includes(".."), `${owner}: source path escape is not allowed`);
  return {
    src: source.src,
    ...(typeof source.codec === "string" && source.codec.trim()
      ? { codec: source.codec.trim() }
      : {}),
  };
}

function normalizeTrack(track, owner) {
  assert(track && typeof track === "object", `${owner}: track must be an object`);
  assert(typeof track.id === "string" && track.id.trim(), `${owner}: stable track id required`);
  assert(typeof track.title === "string" && track.title.trim(), `${owner}: title required`);
  assert(Number.isFinite(track.durationSeconds) && track.durationSeconds > 0, `${owner}: durationSeconds must be > 0`);
  if (track.mixOutSeconds !== undefined) {
    assert(
      Number.isFinite(track.mixOutSeconds) &&
        track.mixOutSeconds > 0 &&
        track.mixOutSeconds < track.durationSeconds,
      `${owner}: mixOutSeconds must be within duration`,
    );
  }
  assert(track.playback && typeof track.playback === "object", `${owner}: playback required`);

  let playback;
  if (track.playback.kind === "single") {
    assert(Array.isArray(track.playback.sources) && track.playback.sources.length > 0, `${owner}: single sources required`);
    playback = {
      kind: "single",
      sources: track.playback.sources.map((source) => normalizedSource(source, owner)),
    };
  } else {
    assert(track.playback.kind === "stems", `${owner}: playback kind must be single or stems`);
    assert(Array.isArray(track.playback.calm) && track.playback.calm.length > 0, `${owner}: calm stem sources required`);
    assert(Array.isArray(track.playback.intense) && track.playback.intense.length > 0, `${owner}: intense stem sources required`);
    assert(typeof track.playback.syncGroup === "string" && track.playback.syncGroup.trim(), `${owner}: syncGroup required`);
    playback = {
      kind: "stems",
      calm: track.playback.calm.map((source) => normalizedSource(source, owner)),
      intense: track.playback.intense.map((source) => normalizedSource(source, owner)),
      syncGroup: track.playback.syncGroup,
    };
  }

  const metadata = track.metadata && typeof track.metadata === "object"
    ? Object.fromEntries(
        Object.entries(track.metadata)
          .filter(([, value]) => value !== undefined && value !== null && value !== "")
          .sort(([a], [b]) => a.localeCompare(b)),
      )
    : undefined;

  return {
    id: track.id,
    title: track.title,
    playback,
    durationSeconds: track.durationSeconds,
    ...(track.mixOutSeconds !== undefined ? { mixOutSeconds: track.mixOutSeconds } : {}),
    loop: track.loop !== false,
    ...(Number.isFinite(track.trimGain) ? { trimGain: track.trimGain } : {}),
    ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
}

function legacyTrack(track) {
  return normalizeTrack(
    {
      id: track.id,
      title: track.title,
      playback: {
        kind: "stems",
        calm: [{ src: track.stems.calm }],
        intense: [{ src: track.stems.intense }],
        syncGroup: track.id,
      },
      durationSeconds: track.seconds,
      mixOutSeconds: track.mixOut,
      loop: true,
      metadata: {
        bpm: track.bpm,
        key: track.key,
        mood: track.mood,
        provenance: "legacy-generated-music-library",
      },
    },
    `legacy:${track.id ?? "unknown"}`,
  );
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function authoredManifestFiles(base) {
  if (!(await exists(base))) return [];
  const rootReal = await fs.realpath(base);
  const result = [];

  async function walk(directory) {
    const directoryReal = await fs.realpath(directory);
    assert(
      directoryReal === rootReal || directoryReal.startsWith(rootReal + path.sep),
      `path/symlink escape outside ${base}: ${directory}`,
    );
    const entries = await fs.readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const candidate = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        const real = await fs.realpath(candidate);
        assert(real.startsWith(rootReal + path.sep), `symlink escape outside ${base}: ${candidate}`);
      }
      if (entry.isDirectory()) await walk(candidate);
      if (entry.isFile() && entry.name === "track.json") result.push(candidate);
    }
  }

  await walk(base);
  return result;
}

async function loadAuthoredTracks() {
  const tracks = [];
  const files = [
    ...(await authoredManifestFiles(worldRoot)),
    ...(await authoredManifestFiles(specialRoot)),
  ].sort();

  for (const file of files) {
    const relative = path.relative(authoredRoot, file).split(path.sep).join("/");
    if (relative.startsWith("worlds/")) {
      const worldId = relative.split("/")[1];
      assert(WORLD_ID_SET.has(worldId), `${relative}: unknown World ${worldId}`);
    }
    const parsed = JSON.parse(await fs.readFile(file, "utf8"));
    const list = Array.isArray(parsed) ? parsed : [parsed];
    for (const entry of list) tracks.push(normalizeTrack(entry, relative));
  }
  return tracks;
}

function stablePayload(payload) {
  return JSON.stringify(payload, null, 2) + "\n";
}

async function build() {
  const legacy = JSON.parse(await fs.readFile(legacyPath, "utf8"));
  const tracks = [
    ...(legacy.tracks ?? []).map(legacyTrack),
    ...(await loadAuthoredTracks()),
  ].sort((a, b) => a.id.localeCompare(b.id));

  const ids = new Set();
  for (const track of tracks) {
    assert(!ids.has(track.id), `duplicate track id: ${track.id}`);
    ids.add(track.id);
  }

  const revisionInput = {
    schemaVersion: 1,
    worldIds: WORLD_IDS,
    tracks,
  };
  const digest = createHash("sha256")
    .update(stablePayload(revisionInput))
    .digest("hex");
  return {
    schemaVersion: 1,
    manifestRevision: `sha256:${digest}`,
    worldIds: WORLD_IDS,
    tracks,
  };
}

const output = stablePayload(await build());
if (process.argv.includes("--check")) {
  const current = await fs.readFile(outputPath, "utf8").catch(() => "");
  if (current !== output) {
    console.error("world-music-catalog.json is stale; run pnpm music:catalog");
    process.exitCode = 1;
  } else {
    console.log("world music catalog is deterministic and up to date");
  }
} else {
  await fs.writeFile(outputPath, output);
  console.log(`wrote ${path.relative(root, outputPath)}`);
}
