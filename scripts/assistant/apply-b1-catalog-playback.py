from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file = Path(path)
    text = file.read_text()
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: anchor count={count}")
    file.write_text(text.replace(old, new, 1))


# ---------------------------------------------------------------------------
# AudioAssetRef: a catalog recording can expose multiple transport sources.
# They remain candidates of one identity, never separate playlist entries.
# ---------------------------------------------------------------------------
replace_once(
    "src/audio/music-profile.ts",
    '''export type AudioAssetRef = {\n  id: string;\n  localPath?: string;\n  defaultPath?: string;\n''',
    '''export type AudioAssetRef = {\n  id: string;\n  localPath?: string;\n  defaultPath?: string;\n  /** Ordered transport fallbacks for one recording (for example webm/ogg). */\n  sources?: readonly string[];\n''',
    "AudioAssetRef sources",
)
replace_once(
    "src/audio/music-profile.ts",
    '''  return [\n    assetRef.localPath,\n    assetRef.defaultPath,\n  ].filter(\n    (value): value is string =>\n      typeof value === "string" && value.length > 0,\n  );\n''',
    '''  return [...new Set([\n    ...(assetRef.sources ?? []),\n    assetRef.localPath,\n    assetRef.defaultPath,\n  ].filter(\n    (value): value is string =>\n      typeof value === "string" && value.length > 0,\n  ))];\n''',
    "assetCandidates source chain",
)


# ---------------------------------------------------------------------------
# Canonical catalog -> playable runtime track materialization.
# ---------------------------------------------------------------------------
runtime_path = Path("src/audio/world-music-runtime.ts")
runtime = runtime_path.read_text()
runtime = runtime.replace(
    'import type { MusicTrack } from "./music-library";\n',
    '''import {\n  MOOD_LABELS,\n  type MusicMood,\n  type MusicTrack,\n  type SongStem,\n} from "./music-library";\n''',
    1,
)
runtime = runtime.replace(
    '''  resolveWorldMusicPlaylist,\n  type ResolvedPlaylist,\n''',
    '''  resolveWorldMusicPlaylist,\n  type CatalogTrack,\n  type ResolvedPlaylist,\n''',
    1,
)
marker = 'export type ResolveRuntimeWorldPlaylistInput = {'
if 'export function materializeRuntimeMusicTracks' not in runtime:
    if marker not in runtime:
        raise SystemExit("runtime materializer insertion anchor missing")
    addition = r'''export type RuntimeMusicTrack = MusicTrack & {
  playbackKind: "single" | "stems";
  sourceCandidates: Readonly<Record<SongStem, readonly string[]>>;
  syncGroup: string | null;
};

function sourceUrls(values: readonly { src: string }[]): string[] {
  return [...new Set(values.map((value) => value.src).filter((src) => src.length > 0))];
}

function catalogMood(value: string | undefined, fallback: MusicTrack | undefined): MusicMood {
  if (value !== undefined && value in MOOD_LABELS) return value as MusicMood;
  return fallback?.mood ?? "suspense";
}

function catalogMixOut(track: CatalogTrack, fallback: MusicTrack | undefined): number {
  const duration = Math.max(0.1, track.durationSeconds);
  const requested = track.mixOutSeconds ?? fallback?.mixOut;
  if (requested !== undefined && Number.isFinite(requested) && requested > 0 && requested < duration) {
    return requested;
  }
  const tail = Math.min(8, Math.max(0.25, duration * 0.1));
  return Math.max(0.05, duration - tail);
}

function materializeCatalogTrack(
  track: CatalogTrack,
  fallback: MusicTrack | undefined,
): RuntimeMusicTrack | null {
  const playback = track.playback;
  const calm = playback.kind === "single"
    ? sourceUrls(playback.sources)
    : sourceUrls(playback.calm);
  const intense = playback.kind === "single"
    ? calm
    : sourceUrls(playback.intense);
  if (calm.length === 0 || intense.length === 0) return null;

  return {
    id: track.id,
    title: track.title,
    mood: catalogMood(track.metadata?.mood, fallback),
    key: track.metadata?.key ?? fallback?.key ?? "Unknown",
    bpm: track.metadata?.bpm ?? fallback?.bpm ?? 0,
    meter: fallback?.meter ?? 4,
    seconds: Math.max(0.1, track.durationSeconds),
    mixOut: catalogMixOut(track, fallback),
    stems: {
      calm: calm[0]!,
      intense: intense[0]!,
    },
    playbackKind: playback.kind,
    sourceCandidates: { calm, intense },
    syncGroup: playback.kind === "stems" ? playback.syncGroup : null,
  };
}

/**
 * Materializes the authoritative catalog into the legacy MusicTrack-shaped
 * runtime metadata used by MusicController. Codec URLs stay attached to one
 * track identity, and catalog-only tracks are therefore fully playable.
 */
export function materializeRuntimeMusicTracks(
  catalog: WorldMusicCatalog,
  legacyTracks: readonly MusicTrack[] = [],
): readonly RuntimeMusicTrack[] {
  const legacyById = new Map(legacyTracks.map((track) => [track.id, track]));
  return catalog.tracks.flatMap((track) => {
    const materialized = materializeCatalogTrack(track, legacyById.get(track.id));
    return materialized === null ? [] : [materialized];
  });
}

'''
    runtime = runtime.replace(marker, addition + marker, 1)
runtime_path.write_text(runtime)


# ---------------------------------------------------------------------------
# MusicController consumes runtime catalog tracks rather than only the legacy
# generated MusicTrack array. Single-file intensity keeps one playback voice.
# ---------------------------------------------------------------------------
replace_once(
    "src/audio/MusicController.ts",
    '''  catalogFromMusicTracks,\n  BUNDLED_WORLD_MUSIC_CATALOG,\n  resolveRuntimeWorldPlaylist,\n  stageRoleForMusicState,\n} from "./world-music-runtime";\n''',
    '''  catalogFromMusicTracks,\n  BUNDLED_WORLD_MUSIC_CATALOG,\n  materializeRuntimeMusicTracks,\n  resolveRuntimeWorldPlaylist,\n  stageRoleForMusicState,\n  type RuntimeMusicTrack,\n} from "./world-music-runtime";\n''',
    "runtime track imports",
)
replace_once(
    "src/audio/MusicController.ts",
    '''  private readonly tracks: readonly MusicTrack[];\n''',
    '''  private readonly tracks: readonly RuntimeMusicTrack[];\n''',
    "runtime tracks field",
)
replace_once(
    "src/audio/MusicController.ts",
    '''  private currentSong: MusicTrack | null = null;\n  /** The next song, decided early so it can be preloaded. */\n  private upcoming: MusicTrack | null = null;\n''',
    '''  private currentSong: RuntimeMusicTrack | null = null;\n  /** The next song, decided early so it can be preloaded. */\n  private upcoming: RuntimeMusicTrack | null = null;\n''',
    "runtime current/upcoming types",
)
replace_once(
    "src/audio/MusicController.ts",
    '''    this.audioFactory = audioFactory;\n    this.tracks = options.tracks ?? MUSIC_TRACKS;\n    this.random = options.random ?? Math.random;\n    this.catalog = options.catalog ?? (\n      options.tracks === undefined\n        ? BUNDLED_WORLD_MUSIC_CATALOG\n        : catalogFromMusicTracks(this.tracks)\n    );\n''',
    '''    this.audioFactory = audioFactory;\n    const legacyTracks = options.tracks ?? MUSIC_TRACKS;\n    this.random = options.random ?? Math.random;\n    this.catalog = options.catalog ?? (\n      options.tracks === undefined\n        ? BUNDLED_WORLD_MUSIC_CATALOG\n        : catalogFromMusicTracks(legacyTracks)\n    );\n    this.tracks = materializeRuntimeMusicTracks(this.catalog, legacyTracks);\n''',
    "constructor catalog materialization",
)
replace_once(
    "src/audio/MusicController.ts",
    '''  private trackById(id: string | undefined): MusicTrack | null {\n''',
    '''  private trackById(id: string | undefined): RuntimeMusicTrack | null {\n''',
    "trackById runtime type",
)
replace_once(
    "src/audio/MusicController.ts",
    '''  private firstSong(): MusicTrack | null {\n''',
    '''  private firstSong(): RuntimeMusicTrack | null {\n''',
    "firstSong runtime type",
)
replace_once(
    "src/audio/MusicController.ts",
    '''  private peekNextSong(): MusicTrack | null {\n''',
    '''  private peekNextSong(): RuntimeMusicTrack | null {\n''',
    "peekNextSong runtime type",
)
replace_once(
    "src/audio/MusicController.ts",
    '''  private takeNextSong(): MusicTrack | null {\n''',
    '''  private takeNextSong(): RuntimeMusicTrack | null {\n''',
    "takeNextSong runtime type",
)
replace_once(
    "src/audio/MusicController.ts",
    '''    if (this.destroyed || !this.isWorldState(this.state) || this.currentSong === null || !this.hasSongs()) {\n''',
    '''    if (this.destroyed || !this.isCampaignPlaylistState(this.state) || this.currentSong === null || !this.hasSongs()) {\n''',
    "campaign playlist advance",
)
replace_once(
    "src/audio/MusicController.ts",
    '''  private startSong(song: MusicTrack, stem: SongStem, seconds: number, style: FadeStyle): void {\n    let next: ManagedTrack | null = null;\n    if (this.warmNext !== null && this.warmNext.songId === song.id && this.warmNext.stem === stem) {\n      next = this.warmNext;\n      this.warmNext = null;\n    }\n''',
    '''  private startSong(song: RuntimeMusicTrack, stem: SongStem, seconds: number, style: FadeStyle): void {\n    let next: ManagedTrack | null = null;\n    if (\n      this.warmNext !== null &&\n      this.warmNext.songId === song.id &&\n      (song.playbackKind === "single" || this.warmNext.stem === stem)\n    ) {\n      next = this.warmNext;\n      next.stem = stem;\n      this.warmNext = null;\n    }\n''',
    "startSong single warm reuse",
)
replace_once(
    "src/audio/MusicController.ts",
    '''  private switchStem(song: MusicTrack, stem: SongStem, seconds: number): void {\n    const active = this.activeMusic;\n    if (active === null) return;\n    // Switching back mid-fade: reuse the stem that is still fading out.\n''',
    '''  private switchStem(song: RuntimeMusicTrack, stem: SongStem, seconds: number): void {\n    const active = this.activeMusic;\n    if (active === null) return;\n    if (song.playbackKind === "single") {\n      // V2 contract: intensity is semantic for a single-file recording. Keep\n      // the existing voice and position instead of playing a duplicate copy.\n      active.stem = stem;\n      this.releaseWarmStem();\n      this.applyVolumes();\n      void this.playTrack(active);\n      this.notifyNowPlaying();\n      return;\n    }\n    // Switching back mid-fade: reuse the stem that is still fading out.\n''',
    "single file intensity",
)
replace_once(
    "src/audio/MusicController.ts",
    '''  private createSongTrack(song: MusicTrack, stem: SongStem): ManagedTrack | null {\n    const track = this.createTrack(\n      { id: song.id + ":" + stem, defaultPath: song.stems[stem], syncGroup: song.id },\n      false,\n      0,\n    );\n''',
    '''  private createSongTrack(song: RuntimeMusicTrack, stem: SongStem): ManagedTrack | null {\n    const track = this.createTrack(\n      {\n        id: song.id + ":" + (song.playbackKind === "single" ? "single" : stem),\n        sources: song.sourceCandidates[stem],\n        syncGroup: song.playbackKind === "stems" ? (song.syncGroup ?? song.id) : undefined,\n      },\n      false,\n      0,\n    );\n''',
    "catalog song source candidates",
)
replace_once(
    "src/audio/MusicController.ts",
    '''    if (this.warmStem === null && position > 3 && this.musicFade === null) {\n      this.warmStem = this.createSongTrack(song, active.stem === "intense" ? "calm" : "intense");\n    }\n''',
    '''    if (\n      song.playbackKind === "stems" &&\n      this.warmStem === null &&\n      position > 3 &&\n      this.musicFade === null\n    ) {\n      this.warmStem = this.createSongTrack(song, active.stem === "intense" ? "calm" : "intense");\n    }\n''',
    "single file warm stem guard",
)
Path("src/audio/MusicController.ts").write_text(Path("src/audio/MusicController.ts").read_text())


# ---------------------------------------------------------------------------
# Regression coverage: catalog-only playback, single intensity, codec fallback.
# ---------------------------------------------------------------------------
runtime_test = Path("tests/world-music-runtime.test.ts")
runtime_text = runtime_test.read_text()
runtime_text = runtime_text.replace(
    '''  catalogFromMusicTracks,\n  resolveRuntimeWorldPlaylist,\n''',
    '''  catalogFromMusicTracks,\n  materializeRuntimeMusicTracks,\n  resolveRuntimeWorldPlaylist,\n''',
    1,
)
if 'materializes single-file and stem source chains without duplicating identities' not in runtime_text:
    insert = r'''

  it("materializes single-file and stem source chains without duplicating identities", () => {
    const runtime = materializeRuntimeMusicTracks({
      schemaVersion: 1,
      manifestRevision: "runtime-materialize",
      worldIds: ["world-01"],
      tracks: [
        {
          id: "single-boss",
          title: "Single Boss",
          playback: {
            kind: "single",
            sources: [
              { src: "/music/boss.webm", codec: "opus" },
              { src: "/music/boss.ogg", codec: "vorbis" },
            ],
          },
          durationSeconds: 90,
          mixOutSeconds: 82,
          loop: true,
          metadata: { mood: "climactic" },
        },
        {
          id: "stem-normal",
          title: "Stem Normal",
          playback: {
            kind: "stems",
            calm: [{ src: "/music/calm.webm" }, { src: "/music/calm.ogg" }],
            intense: [{ src: "/music/intense.webm" }, { src: "/music/intense.ogg" }],
            syncGroup: "stem-normal-sync",
          },
          durationSeconds: 100,
          mixOutSeconds: 92,
          loop: true,
        },
      ],
    });

    expect(runtime).toHaveLength(2);
    expect(runtime[0]?.playbackKind).toBe("single");
    expect(runtime[0]?.sourceCandidates.calm).toEqual(["/music/boss.webm", "/music/boss.ogg"]);
    expect(runtime[0]?.sourceCandidates.intense).toEqual(runtime[0]?.sourceCandidates.calm);
    expect(runtime[0]?.stems.intense).toBe("/music/boss.webm");
    expect(runtime[1]?.playbackKind).toBe("stems");
    expect(runtime[1]?.sourceCandidates.intense).toEqual(["/music/intense.webm", "/music/intense.ogg"]);
    expect(runtime[1]?.syncGroup).toBe("stem-normal-sync");
  });
'''
    runtime_text = runtime_text.replace('\n});\n', insert + '\n});\n', 1)
runtime_test.write_text(runtime_text)

playback_test = Path("tests/music-catalog-playback.test.ts")
playback_content = r'''import { describe, expect, it } from "vitest";
import { MusicController, type AudioLike } from "../src/audio/MusicController";
import { musicProfileForWorld } from "../src/audio/music-profile";
import type { WorldMusicCatalog, WorldMusicPolicy } from "../src/audio/world-music-model";

class FakeAudio implements AudioLike {
  src: string;
  volume = 0;
  loop = false;
  preload = "";
  currentTime = 0;
  paused = true;
  playCount = 0;
  private listeners = new Map<string, Set<EventListener>>();

  constructor(src: string) {
    this.src = src;
  }

  play(): Promise<void> {
    this.playCount += 1;
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }

  addEventListener(type: string, listener: EventListener): void {
    const set = this.listeners.get(type) ?? new Set<EventListener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(new Event(type));
  }
}

const catalog: WorldMusicCatalog = {
  schemaVersion: 1,
  manifestRevision: "single-runtime-test",
  worldIds: ["world-01"],
  tracks: [
    {
      id: "single-normal",
      title: "Single Normal",
      playback: {
        kind: "single",
        sources: [
          { src: "/music/single.webm", codec: "opus" },
          { src: "/music/single.ogg", codec: "vorbis" },
        ],
      },
      durationSeconds: 90,
      mixOutSeconds: 82,
      loop: true,
      metadata: { mood: "climactic", bpm: 120, key: "D minor" },
    },
    {
      id: "single-boss",
      title: "Single Boss",
      playback: {
        kind: "single",
        sources: [{ src: "/music/boss.ogg" }],
      },
      durationSeconds: 75,
      mixOutSeconds: 68,
      loop: true,
      metadata: { mood: "fiery" },
    },
  ],
};

const policy: WorldMusicPolicy = {
  configRevision: "single-runtime-policy",
  worlds: {
    "world-01": {
      normal: { kind: "replace", trackIds: ["single-normal"], selectionMode: "ordered" },
      boss: {
        world: { kind: "replace", trackIds: ["single-boss"], selectionMode: "ordered" },
      },
    },
  },
};

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("B1 catalog playback", () => {
  it("plays catalog-only single files as one voice across calm/intense", () => {
    const created: FakeAudio[] = [];
    const controller = new MusicController(
      (src) => {
        const audio = new FakeAudio(src);
        created.push(audio);
        return audio;
      },
      { catalog, generatedPolicy: policy },
    );
    controller.setWorldProfile(musicProfileForWorld("world-01"));
    controller.transitionTo("WORLD_NORMAL", 0);

    expect(controller.getNowPlaying()).toMatchObject({ id: "single-normal", stem: "calm" });
    expect(created).toHaveLength(1);
    expect(created[0]?.src).toBe("/music/single.webm");
    expect(controller.getDebugSnapshot().activeMusic?.candidates).toEqual([
      "/music/single.webm",
      "/music/single.ogg",
    ]);
    expect(controller.getDebugSnapshot().song?.playlist).toEqual(["single-normal"]);

    created[0]!.currentTime = 41.25;
    controller.transitionTo("WORLD_INTENSE", 0);

    expect(created).toHaveLength(1);
    expect(created[0]!.currentTime).toBeCloseTo(41.25);
    expect(controller.getNowPlaying()).toMatchObject({ id: "single-normal", stem: "intense" });
    controller.destroy();
  });

  it("falls through codec sources without creating a second shuffle identity", async () => {
    const created: FakeAudio[] = [];
    const controller = new MusicController(
      (src) => {
        const audio = new FakeAudio(src);
        created.push(audio);
        return audio;
      },
      { catalog, generatedPolicy: policy },
    );
    controller.transitionTo("WORLD_NORMAL", 0);
    created[0]!.emit("error");
    await flush();

    expect(created).toHaveLength(2);
    expect(created[1]?.src).toBe("/music/single.ogg");
    expect(controller.getNowPlaying()?.id).toBe("single-normal");
    expect(controller.getDebugSnapshot().song?.playlist).toEqual(["single-normal"]);
    expect(controller.getDebugSnapshot().activeMusic?.candidateIndex).toBe(1);
    controller.destroy();
  });

  it("plays a dedicated catalog-only boss and restarts its one-track playlist on end", () => {
    const created: FakeAudio[] = [];
    const controller = new MusicController(
      (src) => {
        const audio = new FakeAudio(src);
        created.push(audio);
        return audio;
      },
      { catalog, generatedPolicy: policy },
    );
    controller.transitionTo("WORLD_NORMAL", 0);
    controller.transitionTo("WORLD_BOSS", 0);

    expect(controller.getNowPlaying()?.id).toBe("single-boss");
    expect(created.at(-1)?.src).toBe("/music/boss.ogg");
    const count = created.length;
    created.at(-1)!.emit("ended");

    expect(created.length).toBe(count + 1);
    expect(controller.getNowPlaying()?.id).toBe("single-boss");
    controller.destroy();
  });
});
'''
if playback_test.exists() and playback_test.read_text() != playback_content:
    raise SystemExit("unexpected existing tests/music-catalog-playback.test.ts")
playback_test.write_text(playback_content)
