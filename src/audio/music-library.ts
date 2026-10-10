import tracksData from "./music-tracks.json";
import { WORLD_REGISTRY } from "../worlds/registry";

/**
 * The game's song library: generated songs (scripts/music/, see
 * docs/MUSIC_SYSTEM.md), each with a calm stem (WORLD_NORMAL) and an intense
 * stem (WORLD_INTENSE) of the same length, plus where to start handing over
 * to the next song (`mixOut`). `music-tracks.json` is written by
 * `pnpm music:render`; the playlists below are authored here.
 */

export type SongStem = "calm" | "intense";

export type MusicMood =
  | "suspense"
  | "gentle"
  | "fiery"
  | "blazing"
  | "lonely"
  | "contemplative"
  | "relaxing"
  | "happy"
  | "gloomy"
  | "climactic"
  | "romantic"
  | "sad"
  | "triumphant";

/** "map": each World plays its Galaxy's playlist. "random": shuffle everything. */
export type MusicPlaybackMode = "map" | "random";

export const MUSIC_PLAYBACK_MODES: readonly MusicPlaybackMode[] = ["map", "random"];

export type MusicTrack = {
  id: string;
  title: string;
  mood: MusicMood;
  key: string;
  bpm: number;
  meter: number;
  /** File length, seconds (music plus its fading tail). */
  seconds: number;
  /** Where the handover to the next song starts (the outro is thinning). */
  mixOut: number;
  stems: Readonly<Record<SongStem, string>>;
};

export const MOOD_LABELS: Readonly<Record<MusicMood, string>> = {
  suspense: "Suspense",
  gentle: "Gentle",
  fiery: "Fiery",
  blazing: "Blazing",
  lonely: "Lonely",
  contemplative: "Contemplative",
  relaxing: "Relaxing",
  happy: "Happy",
  gloomy: "Gloomy",
  climactic: "Climactic",
  romantic: "Romantic",
  sad: "Sad",
  triumphant: "Triumphant",
};

function isTrack(value: unknown): value is MusicTrack {
  if (typeof value !== "object" || value === null) return false;
  const track = value as Partial<MusicTrack>;
  return (
    typeof track.id === "string" &&
    typeof track.title === "string" &&
    typeof track.mood === "string" &&
    track.mood in MOOD_LABELS &&
    typeof track.seconds === "number" &&
    typeof track.mixOut === "number" &&
    track.mixOut > 0 &&
    track.mixOut < track.seconds &&
    typeof track.stems?.calm === "string" &&
    typeof track.stems?.intense === "string"
  );
}

export const MUSIC_TRACKS: readonly MusicTrack[] = (
  (tracksData as { tracks?: unknown[] }).tracks ?? []
).filter(isTrack);

const TRACKS_BY_ID = new Map(MUSIC_TRACKS.map((track) => [track.id, track]));

export function musicTrack(id: string): MusicTrack | undefined {
  return TRACKS_BY_ID.get(id);
}

/**
 * Three songs per Galaxy, in play order, chosen for its mood. Neighbouring
 * moods are shared so every playlist has variety without clashing.
 */
export const GALAXY_PLAYLISTS: Readonly<Record<number, readonly string[]>> = {
  1: ["signal-in-the-void", "starlit-lullaby", "sunseed-parade"], // Celestial: suspense, gentle, happy
  2: ["ember-rush", "molten-crown", "forge-of-stars"], // Infernal: fiery, blazing, climactic
  3: ["glass-solitude", "crystal-echoes", "aurora-serenade"], // Frost Prism: lonely, contemplative, romantic
  4: ["canopy-breeze", "sunseed-parade", "starlit-lullaby"], // Verdant: relaxing, happy, gentle
  5: ["hollow-roots", "glass-solitude", "signal-in-the-void"], // Shadow Nature: gloomy, lonely, suspense
  6: ["forge-of-stars", "molten-crown", "ember-rush"], // Cosmic Forge: climactic, blazing, fiery
  7: ["hollow-roots", "requiem-of-light", "glass-solitude"], // Abyssal: gloomy, sad, lonely
  8: ["aurora-serenade", "crystal-echoes", "starlit-lullaby"], // Aurora Cosmic: romantic, contemplative, gentle
  9: ["requiem-of-light", "crystal-echoes", "hollow-roots"], // Void Cathedral: sad, contemplative, gloomy
  10: ["eternity-gate", "forge-of-stars", "molten-crown"], // Eternity: triumphant, climactic, blazing
};

/**
 * A World's playlist: its Galaxy's songs, rotated by the World's place in
 * the Galaxy so that neighbouring Worlds open with different songs. Songs
 * missing from the library are skipped; an unknown World gets World 01's.
 */
export function worldPlaylist(worldId: string): string[] {
  const index = Math.max(0, WORLD_REGISTRY.findIndex((world) => world.id === worldId));
  const world = WORLD_REGISTRY[index];
  const galaxy = world?.galaxy ?? 1;
  const list = (GALAXY_PLAYLISTS[galaxy] ?? GALAXY_PLAYLISTS[1] ?? []).filter((id) => TRACKS_BY_ID.has(id));
  if (list.length === 0) return MUSIC_TRACKS.map((track) => track.id);
  const firstWorldOfGalaxy = WORLD_REGISTRY.findIndex((candidate) => candidate.galaxy === galaxy);
  const slot = Math.max(0, index - Math.max(0, firstWorldOfGalaxy));
  const shift = slot % list.length;
  return [...list.slice(shift), ...list.slice(0, shift)];
}

/**
 * Random mode: draws every song once before any repeats, and never plays
 * the same song twice in a row (also across refills).
 */
export class ShuffleBag {
  private bag: string[] = [];
  private reserved: string | null = null;

  constructor(
    private readonly ids: readonly string[],
    private readonly random: () => number = Math.random,
  ) {}

  private refill(): void {
    this.bag = [...this.ids];
    for (let index = this.bag.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(this.random() * (index + 1));
      [this.bag[index], this.bag[swap]] = [this.bag[swap]!, this.bag[index]!];
    }
  }

  /**
   * Reserves the next id without consuming it. Repeated peeks are stable, so
   * preload/warm-up can inspect the next song without advancing the shuffle.
   */
  peek(avoid: string | null): string | null {
    if (this.ids.length === 0) return null;

    if (this.reserved !== null) {
      if (this.reserved !== avoid || this.ids.length === 1) return this.reserved;
      this.reserved = null;
    }

    if (this.bag.length === 0) this.refill();

    // Drawn from the end; move the avoided song away from the top. This also
    // prevents an immediate repeat across bag refills.
    if (this.bag.length > 1 && this.bag[this.bag.length - 1] === avoid) {
      [this.bag[0], this.bag[this.bag.length - 1]] = [
        this.bag[this.bag.length - 1]!,
        this.bag[0]!,
      ];
    } else if (
      this.bag.length === 1 &&
      this.bag[0] === avoid &&
      this.ids.length > 1
    ) {
      // Defensive edge case when the caller's avoid id came from outside this
      // bag. Start a fresh cycle rather than returning an immediate repeat.
      this.refill();
      if (this.bag.length > 1 && this.bag[this.bag.length - 1] === avoid) {
        [this.bag[0], this.bag[this.bag.length - 1]] = [
          this.bag[this.bag.length - 1]!,
          this.bag[0]!,
        ];
      }
    }

    this.reserved = this.bag[this.bag.length - 1] ?? null;
    return this.reserved;
  }

  /** Consumes the current reservation only when the expected id still owns it. */
  commit(expectedId: string | null = null): string | null {
    const reserved = this.reserved;
    if (reserved === null) return null;
    if (expectedId !== null && expectedId !== reserved) return null;
    if (this.bag[this.bag.length - 1] !== reserved) {
      throw new Error("ShuffleBag reservation drifted from the queue.");
    }
    this.bag.pop();
    this.reserved = null;
    return reserved;
  }

  /** Releases a preload reservation without consuming the queued id. */
  cancelReservation(expectedId: string | null = null): void {
    if (
      this.reserved !== null &&
      (expectedId === null || expectedId === this.reserved)
    ) {
      this.reserved = null;
    }
  }

  /** Legacy draw API: reserve and commit in one operation. */
  next(avoid: string | null): string | null {
    const id = this.peek(avoid);
    return id === null ? null : this.commit(id);
  }
}
