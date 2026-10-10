import { clamp } from "../logic";
import {
  MOOD_LABELS,
  MUSIC_TRACKS,
  ShuffleBag,
  worldPlaylist,
  type MusicMood,
  type MusicPlaybackMode,
  type MusicTrack,
  type SongStem,
} from "./music-library";
import {
  assetCandidates,
  musicAssetForState,
  musicProfileForWorld,
  stateLoops,
  type AudioAssetRef,
  type MusicState,
  type WorldMusicProfile,
} from "./music-profile";

export type MusicDuckReason =
  | "pronunciation"
  | "announcer"
  | "warning"
  | string;

export type AudioLike = {
  src: string;
  volume: number;
  loop: boolean;
  preload: string;
  currentTime: number;
  paused?: boolean;
  play: () => Promise<void> | void;
  pause: () => void;
  load?: () => void;
  addEventListener?: (
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions | boolean,
  ) => void;
  removeEventListener?: (
    type: string,
    listener: EventListener,
  ) => void;
};

export type AudioFactory = (src: string) => AudioLike | null;

/** What the world music is playing right now (null: a special-state track). */
export type NowPlaying = {
  id: string;
  title: string;
  mood: MusicMood;
  moodLabel: string;
  stem: SongStem;
  mode: MusicPlaybackMode;
};

export type MusicControllerOptions = {
  /** Song library (defaults to the generated one). Tests pass their own. */
  tracks?: readonly MusicTrack[];
  random?: () => number;
};

/**
 * Where a track's level and tone are applied. `graph`: the element runs
 * through Web Audio (gain + low-pass), so fades are sample-smooth and song
 * handovers can filter. `element`: the element's own volume, the fallback
 * before the first user gesture, in tests and without Web Audio.
 */
type TrackOutput = {
  readonly mode: "graph" | "element";
  setGain(value: number): void;
  setCutoff(hz: number | null): void;
  dispose(): void;
};

type ManagedTrack = {
  assetId: string;
  candidates: string[];
  candidateIndex: number;
  audio: AudioLike;
  output: TrackOutput;
  mix: number;
  gain: number;
  loop: boolean;
  errorListener: EventListener | null;
  endedListener: EventListener | null;
  advancingFallback: boolean;
  /** Stems of one song (see AudioAssetRef.syncGroup). */
  syncGroup: string | null;
  /** The stem this one takes over from, until its position is matched. */
  syncSource: ManagedTrack | null;
  /** World song this track plays (null for special-state tracks). */
  songId: string | null;
  stem: SongStem | null;
};

/**
 * `stem`: calm ↔ intense of one song (partly correlated, so a curve between
 * linear and equal-power). `song`: a handover between two songs, equal-power
 * with a low-pass sweep. `state`: everything else, equal-power.
 */
type FadeStyle = "stem" | "song" | "state";

type FadeState = {
  timer: number;
  startedAt: number;
  durationMs: number;
  incoming: ManagedTrack[];
  outgoing: ManagedTrack[];
  incomingStart: number[];
  outgoingStart: number[];
  style: FadeStyle;
};

const DEFAULT_MUSIC_VOLUME = 0.26;
const DEFAULT_AMBIENT_VOLUME = 0.08;
const FADE_TICK_MS = 40;
/** Song handover lengths (seconds) by what triggered them. */
export const SONG_CROSSFADE_SECONDS = {
  auto: 7,
  world: 4.5,
  skip: 3,
  mode: 3.5,
  resume: 1.8,
} as const;
/** Calm ↔ intense switches never go faster than this (half a bar or so). */
export const STEM_MIN_CROSSFADE_SECONDS = 1.2;
const SONG_MONITOR_MS = 250;
/** Start loading the next song this long before the handover. */
const PRELOAD_LEAD_SECONDS = 20;
const FILTER_OPEN_HZ = 20000;

/**
 * Fade gains at progress p (0…1): [incoming, outgoing]. Equal-power keeps
 * the loudness steady through a blend of unrelated music; the stem curve
 * sits between linear and equal-power because both stems share parts.
 */
export function fadeCurves(style: FadeStyle, progress: number): [number, number] {
  const p = clamp(progress, 0, 1);
  const up = Math.sin((p * Math.PI) / 2);
  const down = Math.cos((p * Math.PI) / 2);
  if (style === "stem") return [0.5 * (p + up), 0.5 * (1 - p + down)];
  return [up, down];
}

/**
 * Song handover filters at progress p: the outgoing song darkens as if it
 * drifted away, the incoming one opens up over the first 70% of the fade.
 * null = fully open.
 */
export function handoverCutoffs(progress: number): [number | null, number] {
  const p = clamp(progress, 0, 1);
  const outgoing = 18000 * (520 / 18000) ** p;
  const incoming = p >= 0.7 ? null : 1100 * (FILTER_OPEN_HZ / 1100) ** (p / 0.7);
  return [incoming, outgoing];
}

function browserAudioFactory(src: string): AudioLike | null {
  if (typeof Audio === "undefined") return null;
  return new Audio(src);
}

function safePlay(audio: AudioLike): Promise<void> {
  try {
    const result = audio.play();
    if (
      result !== undefined &&
      typeof (result as Promise<void>).catch === "function"
    ) {
      return result as Promise<void>;
    }
    return Promise.resolve();
  } catch {
    return Promise.reject(new Error("Audio playback failed."));
  }
}

function detachListeners(track: ManagedTrack): void {
  if (track.audio.removeEventListener === undefined) return;
  if (track.errorListener !== null) track.audio.removeEventListener("error", track.errorListener);
  if (track.endedListener !== null) track.audio.removeEventListener("ended", track.endedListener);
}

function stopTrack(track: ManagedTrack): void {
  detachListeners(track);
  track.audio.pause();
  track.audio.currentTime = 0;
  track.output.dispose();
}

export type MusicDebugSnapshot = {
  state: MusicState;
  worldId: string;
  bossPhase: number;
  paused: boolean;
  musicVolume: number;
  ambientVolume: number;
  duckReasons: string[];
  duckMultiplier: number;
  playbackMode: MusicPlaybackMode;
  song: null | {
    id: string;
    title: string;
    stem: SongStem | null;
    position: number;
    mixOut: number;
    upcoming: string | null;
    playlist: string[];
  };
  activeMusic: null | {
    assetId: string;
    candidates: string[];
    candidateIndex: number;
    mix: number;
    loop: boolean;
    volume: number;
    output: "graph" | "element";
  };
  retiringMusic: Array<{
    assetId: string;
    mix: number;
    volume: number;
  }>;
  activeAmbient: Array<{
    assetId: string;
    candidates: string[];
    candidateIndex: number;
    mix: number;
    loop: boolean;
    volume: number;
  }>;
  retiringAmbient: Array<{
    assetId: string;
    mix: number;
    volume: number;
  }>;
};

export class MusicController {
  private profile: WorldMusicProfile =
    musicProfileForWorld("world-01");
  private state: MusicState = "SILENT";
  private activeMusic: ManagedTrack | null = null;
  private retiringMusic: ManagedTrack[] = [];
  private activeAmbient: ManagedTrack[] = [];
  private retiringAmbient: ManagedTrack[] = [];
  private musicFade: FadeState | null = null;
  private ambientFade: FadeState | null = null;
  private musicVolume = DEFAULT_MUSIC_VOLUME;
  private ambientVolume = DEFAULT_AMBIENT_VOLUME;
  private bossPhase = 1;
  private paused = false;
  private destroyed = false;
  private readonly duckReasons = new Set<MusicDuckReason>();
  private readonly warningTimers = new Map<string, number>();
  private readonly audioFactory: AudioFactory;

  // World songs.
  private readonly tracks: readonly MusicTrack[];
  private readonly random: () => number;
  private mode: MusicPlaybackMode = "map";
  private playlist: string[] = [];
  private playlistIndex = 0;
  private shuffle: ShuffleBag;
  private currentSong: MusicTrack | null = null;
  /** The next song, decided early so it can be preloaded. */
  private upcoming: MusicTrack | null = null;
  /** Next song's element, loading before the handover. */
  private warmNext: ManagedTrack | null = null;
  /** The current song's other stem, loaded and paused for instant switches. */
  private warmStem: ManagedTrack | null = null;
  private songMonitor: number | null = null;
  private nowPlayingListener: ((value: NowPlaying | null) => void) | null = null;

  // Web Audio output (after the first user gesture).
  private audioContext: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private gestureListening = false;

  private readonly onAnnouncer = (event: Event): void => {
    const active =
      (event as CustomEvent<{ active?: unknown }>).detail?.active === true;
    if (active) this.duck("announcer");
    else this.releaseDuck("announcer");
  };

  private readonly onWarning = (event: Event): void => {
    const duration =
      (event as CustomEvent<{ durationMs?: unknown }>).detail?.durationMs;
    this.duckFor(
      "warning",
      typeof duration === "number" && Number.isFinite(duration)
        ? duration
        : 350,
    );
  };

  private readonly onUserGesture = (): void => {
    this.unlockAudioGraph();
  };

  constructor(
    audioFactory: AudioFactory = browserAudioFactory,
    options: MusicControllerOptions = {},
  ) {
    this.audioFactory = audioFactory;
    this.tracks = options.tracks ?? MUSIC_TRACKS;
    this.random = options.random ?? Math.random;
    this.shuffle = new ShuffleBag(this.tracks.map((track) => track.id), this.random);
    this.rebuildPlaylist(this.profile.worldId);

    if (typeof window !== "undefined") {
      // Spoken vocabulary intentionally does not lower music. The voice mix is
      // already clear, while warnings and announcer cues still duck for safety.
      window.addEventListener(
        "space-typing:announcer",
        this.onAnnouncer,
      );
      window.addEventListener(
        "space-typing:warning",
        this.onWarning,
      );
      for (const type of ["pointerdown", "keydown", "touchstart"]) {
        window.addEventListener(type, this.onUserGesture, { capture: true, passive: true });
      }
      this.gestureListening = true;
    }
  }

  getState(): MusicState {
    return this.state;
  }

  getWorldProfile(): WorldMusicProfile {
    return this.profile;
  }

  getPlaybackMode(): MusicPlaybackMode {
    return this.mode;
  }

  /** The world song playing now, or null during boss, shop and other tracks. */
  getNowPlaying(): NowPlaying | null {
    const song = this.currentSong;
    const active = this.activeMusic;
    if (song === null || active === null || active.songId !== song.id) return null;
    return {
      id: song.id,
      title: song.title,
      mood: song.mood,
      moodLabel: MOOD_LABELS[song.mood],
      stem: active.stem ?? "calm",
      mode: this.mode,
    };
  }

  /** Called whenever the world song (or its stem, or the mode) changes. */
  onNowPlaying(listener: ((value: NowPlaying | null) => void) | null): void {
    this.nowPlayingListener = listener;
  }

  getDebugSnapshot(): MusicDebugSnapshot {
    const active = this.activeMusic;
    return {
      state: this.state,
      worldId: this.profile.worldId,
      bossPhase: this.bossPhase,
      paused: this.paused,
      musicVolume: this.musicVolume,
      ambientVolume: this.ambientVolume,
      duckReasons: [...this.duckReasons].map(String).sort(),
      duckMultiplier: this.duckMultiplier(),
      playbackMode: this.mode,
      song:
        this.currentSong === null
          ? null
          : {
              id: this.currentSong.id,
              title: this.currentSong.title,
              stem: active?.songId === this.currentSong.id ? active.stem : null,
              position: active?.songId === this.currentSong.id ? active.audio.currentTime : 0,
              mixOut: this.currentSong.mixOut,
              upcoming: this.upcoming?.id ?? null,
              playlist: [...this.playlist],
            },
      activeMusic:
        active === null
          ? null
          : {
              assetId: active.assetId,
              candidates: [...active.candidates],
              candidateIndex: active.candidateIndex,
              mix: active.mix,
              loop: active.loop,
              volume: active.gain,
              output: active.output.mode,
            },
      retiringMusic: this.retiringMusic.map((track) => ({
        assetId: track.assetId,
        mix: track.mix,
        volume: track.gain,
      })),
      activeAmbient: this.activeAmbient.map((track) => ({
        assetId: track.assetId,
        candidates: [...track.candidates],
        candidateIndex: track.candidateIndex,
        mix: track.mix,
        loop: track.loop,
        volume: track.gain,
      })),
      retiringAmbient: this.retiringAmbient.map((track) => ({
        assetId: track.assetId,
        mix: track.mix,
        volume: track.gain,
      })),
    };
  }

  setWorldProfile(profile: WorldMusicProfile): void {
    if (this.destroyed) return;
    const changed = profile.worldId !== this.profile.worldId;
    this.profile = profile;
    if (!changed) {
      if (this.activeAmbient.length === 0) {
        this.transitionAmbient(profile.ambientLayers);
      }
      this.applyVolumes();
      return;
    }

    this.transitionAmbient(profile.ambientLayers);
    if (this.hasSongs()) {
      this.rebuildPlaylist(profile.worldId);
      // A new map brings its own music (random mode keeps its shuffle going).
      if (this.mode === "map" && this.currentSong !== null) {
        const first = this.trackById(this.playlist[0]);
        if (first !== null && this.isWorldState(this.state)) {
          if (first.id !== this.currentSong.id) {
            this.startSong(first, this.stemFor(this.state), SONG_CROSSFADE_SECONDS.world, "song");
          }
        } else if (first !== null) {
          // Boss, shop or stinger now: the new World's first song comes next.
          this.upcoming = first;
        }
      }
      return;
    }
    if (this.isWorldState(this.state)) {
      this.transitionTo(this.state);
    }
  }

  /** Map playlists or shuffle; the current song keeps playing where it fits. */
  setPlaybackMode(mode: MusicPlaybackMode): void {
    if (this.destroyed || mode === this.mode) return;
    this.mode = mode;
    this.upcoming = null;
    this.releaseWarmNext();
    if (mode === "random") {
      this.shuffle = new ShuffleBag(this.tracks.map((track) => track.id), this.random);
    } else {
      this.rebuildPlaylist(this.profile.worldId);
      const song = this.currentSong;
      const position = song === null ? -1 : this.playlist.indexOf(song.id);
      if (position >= 0) {
        this.playlistIndex = position;
      } else if (song !== null && this.isWorldState(this.state) && this.hasSongs()) {
        const first = this.trackById(this.playlist[0]);
        if (first !== null) {
          this.playlistIndex = 0;
          this.startSong(first, this.stemFor(this.state), SONG_CROSSFADE_SECONDS.mode, "song");
          return;
        }
      }
    }
    this.notifyNowPlaying();
  }

  /** Hands over to the next song now. False when no world song is playing. */
  skipTrack(): boolean {
    return this.advanceSong(SONG_CROSSFADE_SECONDS.skip);
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = clamp(volume, 0, 1);
    this.applyVolumes();
  }

  setAmbientVolume(volume: number): void {
    this.ambientVolume = clamp(volume, 0, 1);
    this.applyVolumes();
  }

  setBossPhase(phase: number): void {
    this.bossPhase = Math.max(1, Math.floor(phase));
    this.applyVolumes();
  }

  transitionTo(
    state: MusicState,
    crossfadeSeconds = this.profile.crossfadeSeconds,
  ): void {
    if (this.destroyed) return;
    this.state = state;

    if (this.isWorldState(state) && this.hasSongs()) {
      this.playWorldSong(this.stemFor(state), crossfadeSeconds);
      return;
    }

    const asset = musicAssetForState(this.profile, state);
    if (asset === null) {
      this.fadeMusicTo(null, crossfadeSeconds, "state");
      this.notifyNowPlaying();
      return;
    }

    if (
      this.activeMusic !== null &&
      this.activeMusic.assetId === asset.id
    ) {
      this.activeMusic.loop = stateLoops(state);
      this.activeMusic.audio.loop = this.activeMusic.loop;
      this.applyVolumes();
      void this.playTrack(this.activeMusic);
      return;
    }

    const next = this.createTrack(
      asset,
      stateLoops(state),
      0,
    );
    if (next !== null) this.syncWithActive(next);
    this.fadeMusicTo(next, crossfadeSeconds, "state");
    this.notifyNowPlaying();
  }

  duck(reason: MusicDuckReason): void {
    if (this.destroyed) return;
    this.duckReasons.add(reason);
    this.applyVolumes();
  }

  releaseDuck(reason: MusicDuckReason): void {
    if (this.destroyed) return;
    this.duckReasons.delete(reason);
    this.applyVolumes();
  }

  duckFor(
    reason: MusicDuckReason,
    milliseconds: number,
  ): void {
    this.duck(reason);
    if (typeof window === "undefined") return;

    const key = String(reason);
    const existing = this.warningTimers.get(key);
    if (existing !== undefined) window.clearTimeout(existing);

    const timer = window.setTimeout(() => {
      this.warningTimers.delete(key);
      this.releaseDuck(reason);
    }, Math.max(0, milliseconds));
    this.warningTimers.set(key, timer);
  }

  setPaused(paused: boolean): void {
    if (this.destroyed) return;

    if (paused) {
      if (this.paused) return;
      this.paused = true;
      this.activeMusic?.audio.pause();
      for (const track of this.activeAmbient) {
        track.audio.pause();
      }
      return;
    }

    this.paused = false;
    if (this.activeMusic !== null) {
      void this.playTrack(this.activeMusic);
    }
    for (const track of this.activeAmbient) {
      void this.playTrack(track);
    }
  }

  preloadNext(profile: WorldMusicProfile): void {
    if (this.destroyed) return;
    // Songs preload themselves before each handover.
    if (this.hasSongs()) return;

    for (const assetRef of profile.preloadHints.slice(0, 3)) {
      const candidate = assetCandidates(assetRef)[0];
      if (candidate === undefined) continue;
      const audio = this.audioFactory(candidate);
      if (audio === null) continue;
      audio.preload = "metadata";
      audio.load?.();
    }
  }

  stop(crossfadeSeconds = 0.35): void {
    if (this.destroyed) return;
    this.state = "SILENT";
    this.fadeMusicTo(null, crossfadeSeconds, "state");
    this.fadeAmbientTo([], crossfadeSeconds);
    this.notifyNowPlaying();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (typeof window !== "undefined") {
      window.removeEventListener(
        "space-typing:announcer",
        this.onAnnouncer,
      );
      window.removeEventListener(
        "space-typing:warning",
        this.onWarning,
      );
      for (const timer of this.warningTimers.values()) {
        window.clearTimeout(timer);
      }
      if (this.songMonitor !== null) window.clearInterval(this.songMonitor);
    }
    this.removeGestureListeners();
    this.warningTimers.clear();
    this.songMonitor = null;

    this.cancelFade(this.musicFade);
    this.cancelFade(this.ambientFade);
    this.musicFade = null;
    this.ambientFade = null;

    const tracks = [
      ...(this.activeMusic === null ? [] : [this.activeMusic]),
      ...this.retiringMusic,
      ...this.activeAmbient,
      ...this.retiringAmbient,
      ...(this.warmNext === null ? [] : [this.warmNext]),
      ...(this.warmStem === null ? [] : [this.warmStem]),
    ];
    for (const track of tracks) stopTrack(track);

    this.activeMusic = null;
    this.retiringMusic = [];
    this.activeAmbient = [];
    this.retiringAmbient = [];
    this.warmNext = null;
    this.warmStem = null;
    this.duckReasons.clear();
    this.nowPlayingListener = null;
    if (this.audioContext !== null) {
      void this.audioContext.close().catch(() => undefined);
      this.audioContext = null;
      this.musicBus = null;
    }
  }

  // -------------------------------------------------------------------------
  // World songs.
  // -------------------------------------------------------------------------

  private hasSongs(): boolean {
    return this.tracks.length > 0;
  }

  private isWorldState(state: MusicState): boolean {
    return state === "WORLD_NORMAL" || state === "WORLD_INTENSE";
  }

  private stemFor(state: MusicState): SongStem {
    return state === "WORLD_INTENSE" ? "intense" : "calm";
  }

  private trackById(id: string | undefined): MusicTrack | null {
    if (id === undefined) return null;
    return this.tracks.find((track) => track.id === id) ?? null;
  }

  private rebuildPlaylist(worldId: string): void {
    const known = new Set(this.tracks.map((track) => track.id));
    const list = worldPlaylist(worldId).filter((id) => known.has(id));
    this.playlist = list.length > 0 ? list : this.tracks.map((track) => track.id);
    this.playlistIndex = 0;
    if (this.mode === "map") {
      this.upcoming = null;
      this.releaseWarmNext();
    }
  }

  /** World music requested: same song keeps going, otherwise a song starts. */
  private playWorldSong(stem: SongStem, seconds: number): void {
    const active = this.activeMusic;
    const song = this.currentSong;
    if (active !== null && song !== null && active.songId === song.id) {
      if (active.stem === stem) {
        this.applyVolumes();
        void this.playTrack(active);
        return;
      }
      this.switchStem(song, stem, seconds);
      return;
    }
    // Entering world music (start, or back from a boss, shop or stinger):
    // the playlist continues with a fresh song from its intro.
    const next = song === null ? this.firstSong() : this.takeNextSong();
    if (next === null) return;
    this.startSong(next, stem, Math.max(SONG_CROSSFADE_SECONDS.resume, seconds), "state");
  }

  private firstSong(): MusicTrack | null {
    if (this.mode === "random") return this.trackById(this.shuffle.next(null) ?? undefined);
    this.playlistIndex = 0;
    return this.trackById(this.playlist[0]);
  }

  /** The next song, without moving the queue (so it can be preloaded). */
  private peekNextSong(): MusicTrack | null {
    if (this.upcoming !== null) return this.upcoming;
    if (this.mode === "random") {
      this.upcoming = this.trackById(this.shuffle.next(this.currentSong?.id ?? null) ?? undefined);
    } else if (this.playlist.length > 0) {
      this.upcoming = this.trackById(this.playlist[(this.playlistIndex + 1) % this.playlist.length]);
    }
    return this.upcoming;
  }

  /** Moves the queue on and returns the song to play now. */
  private takeNextSong(): MusicTrack | null {
    const next = this.peekNextSong();
    this.upcoming = null;
    if (next !== null && this.mode === "map") {
      const index = this.playlist.indexOf(next.id);
      if (index >= 0) this.playlistIndex = index;
    }
    return next;
  }

  private advanceSong(seconds: number): boolean {
    if (this.destroyed || !this.isWorldState(this.state) || this.currentSong === null || !this.hasSongs()) {
      return false;
    }
    const next = this.takeNextSong();
    if (next === null) return false;
    this.startSong(next, this.stemFor(this.state), seconds, "song");
    return true;
  }

  private startSong(song: MusicTrack, stem: SongStem, seconds: number, style: FadeStyle): void {
    let next: ManagedTrack | null = null;
    if (this.warmNext !== null && this.warmNext.songId === song.id && this.warmNext.stem === stem) {
      next = this.warmNext;
      this.warmNext = null;
    }
    this.releaseWarmNext();
    if (next === null) next = this.createSongTrack(song, stem);
    if (next === null) return;
    this.currentSong = song;
    this.releaseWarmStem();
    this.fadeMusicTo(next, seconds, style);
    this.ensureSongMonitor();
    this.notifyNowPlaying();
  }

  /** Calm ↔ intense at the same position of the same song. */
  private switchStem(song: MusicTrack, stem: SongStem, seconds: number): void {
    const active = this.activeMusic;
    if (active === null) return;
    // Switching back mid-fade: reuse the stem that is still fading out.
    let next: ManagedTrack | null = null;
    const retiring = this.retiringMusic.findIndex((track) => track.songId === song.id && track.stem === stem);
    if (retiring >= 0) {
      next = this.retiringMusic[retiring]!;
      this.retiringMusic.splice(retiring, 1);
    } else if (this.warmStem !== null && this.warmStem.songId === song.id && this.warmStem.stem === stem) {
      next = this.warmStem;
      this.warmStem = null;
    }
    if (next === null) next = this.createSongTrack(song, stem);
    if (next === null) return;
    next.syncSource = active;
    this.attachSync(next);
    this.fadeMusicTo(next, Math.max(STEM_MIN_CROSSFADE_SECONDS, seconds), "stem");
    this.notifyNowPlaying();
  }

  private createSongTrack(song: MusicTrack, stem: SongStem): ManagedTrack | null {
    const track = this.createTrack(
      { id: song.id + ":" + stem, defaultPath: song.stems[stem], syncGroup: song.id },
      false,
      0,
    );
    if (track === null) return null;
    track.songId = song.id;
    track.stem = stem;
    this.attachEnded(track);
    return track;
  }

  private attachEnded(track: ManagedTrack): void {
    if (track.songId === null) return;
    const listener = (): void => {
      // Safety net when the monitor was throttled (background tab).
      if (this.activeMusic === track) this.advanceSong(SONG_CROSSFADE_SECONDS.skip);
    };
    track.endedListener = listener;
    track.audio.addEventListener?.("ended", listener);
  }

  private ensureSongMonitor(): void {
    if (this.songMonitor !== null || typeof window === "undefined") return;
    this.songMonitor = window.setInterval(() => this.checkSongProgress(), SONG_MONITOR_MS);
  }

  /**
   * Keeps the handover musical: preloads the other stem and the next song,
   * and starts the crossfade at the song's mix-out point.
   */
  private checkSongProgress(): void {
    const active = this.activeMusic;
    const song = this.currentSong;
    if (this.destroyed || this.paused || active === null || song === null || active.songId !== song.id) return;
    const position = active.audio.currentTime;
    if (!Number.isFinite(position)) return;
    if (this.warmStem === null && position > 3 && this.musicFade === null) {
      this.warmStem = this.createSongTrack(song, active.stem === "intense" ? "calm" : "intense");
    }
    if (this.warmNext === null && position >= song.mixOut - PRELOAD_LEAD_SECONDS) {
      const next = this.peekNextSong();
      if (next !== null) this.warmNext = this.createSongTrack(next, this.stemFor(this.state));
    }
    if (position >= song.mixOut) this.advanceSong(SONG_CROSSFADE_SECONDS.auto);
  }

  private releaseWarmNext(): void {
    if (this.warmNext !== null) stopTrack(this.warmNext);
    this.warmNext = null;
  }

  private releaseWarmStem(): void {
    if (this.warmStem !== null) stopTrack(this.warmStem);
    this.warmStem = null;
  }

  private notifyNowPlaying(): void {
    this.nowPlayingListener?.(this.getNowPlaying());
  }

  // -------------------------------------------------------------------------
  // Web Audio output.
  // -------------------------------------------------------------------------

  private unlockAudioGraph(): void {
    if (this.destroyed || typeof AudioContext === "undefined") return;
    try {
      if (this.audioContext === null) {
        this.audioContext = new AudioContext();
        this.musicBus = this.audioContext.createGain();
        this.musicBus.connect(this.audioContext.destination);
      }
      const context = this.audioContext;
      if (context.state === "running") {
        this.removeGestureListeners();
        return;
      }
      void context
        .resume()
        .then(() => {
          if (context.state === "running") this.removeGestureListeners();
        })
        .catch(() => undefined);
    } catch {
      this.audioContext = null;
      this.musicBus = null;
    }
  }

  private removeGestureListeners(): void {
    if (!this.gestureListening || typeof window === "undefined") return;
    for (const type of ["pointerdown", "keydown", "touchstart"]) {
      window.removeEventListener(type, this.onUserGesture, { capture: true });
    }
    this.gestureListening = false;
  }

  private createOutput(audio: AudioLike): TrackOutput {
    const context = this.audioContext;
    const bus = this.musicBus;
    if (
      context !== null &&
      bus !== null &&
      context.state === "running" &&
      typeof HTMLMediaElement !== "undefined" &&
      audio instanceof HTMLMediaElement
    ) {
      try {
        const source = context.createMediaElementSource(audio);
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = FILTER_OPEN_HZ;
        filter.Q.value = 0.5;
        const gain = context.createGain();
        gain.gain.value = 0;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(bus);
        audio.volume = 1;
        return {
          mode: "graph",
          setGain: (value) => gain.gain.setTargetAtTime(clamp(value, 0, 1), context.currentTime, 0.015),
          setCutoff: (hz) =>
            filter.frequency.setTargetAtTime(
              hz === null ? FILTER_OPEN_HZ : clamp(hz, 40, FILTER_OPEN_HZ),
              context.currentTime,
              0.04,
            ),
          dispose: () => {
            try {
              source.disconnect();
              filter.disconnect();
              gain.disconnect();
            } catch {
              // Already disconnected.
            }
          },
        };
      } catch {
        // Fall back to the element's own volume.
      }
    }
    return {
      mode: "element",
      setGain: (value) => {
        audio.volume = clamp(value, 0, 1);
      },
      setCutoff: () => undefined,
      dispose: () => undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Tracks and fades.
  // -------------------------------------------------------------------------

  private transitionAmbient(
    assets: readonly AudioAssetRef[],
  ): void {
    const next = assets
      .slice(0, 2)
      .map((asset) => this.createTrack(asset, true, 0))
      .filter((track): track is ManagedTrack => track !== null);

    const currentIds = this.activeAmbient
      .map((track) => track.assetId)
      .join("|");
    const nextIds = next.map((track) => track.assetId).join("|");

    if (currentIds === nextIds) {
      for (const track of next) stopTrack(track);
      return;
    }

    this.fadeAmbientTo(next, this.profile.crossfadeSeconds);
  }

  private fadeMusicTo(
    next: ManagedTrack | null,
    seconds: number,
    style: FadeStyle,
  ): void {
    this.cancelFade(this.musicFade);
    this.musicFade = null;

    for (const track of this.retiringMusic) this.retire(track);
    this.retiringMusic = [];

    const outgoing =
      this.activeMusic === null ? [] : [this.activeMusic];
    const incoming = next === null ? [] : [next];

    this.retiringMusic = outgoing;
    this.activeMusic = next;

    for (const track of incoming) {
      void this.playTrack(track);
    }

    this.musicFade = this.startFade(
      outgoing,
      incoming,
      seconds,
      style,
      () => {
        for (const track of outgoing) this.retire(track);
        this.retiringMusic = [];
        this.musicFade = null;
      },
    );
  }

  /**
   * A track that finished fading out. The current song's other stem is kept
   * paused (it becomes the warm stem); everything else is stopped.
   */
  private retire(track: ManagedTrack): void {
    const song = this.currentSong;
    const active = this.activeMusic;
    if (
      track !== active &&
      song !== null &&
      track.songId === song.id &&
      active !== null &&
      active.songId === song.id &&
      track.stem !== active.stem &&
      this.warmStem === null
    ) {
      track.audio.pause();
      track.mix = 0;
      track.syncSource = null;
      track.output.setCutoff(null);
      this.setTrackGain(track, 0);
      this.warmStem = track;
      return;
    }
    if (track === this.warmStem || track === this.warmNext || track === active) return;
    stopTrack(track);
  }

  private fadeAmbientTo(
    incoming: ManagedTrack[],
    seconds: number,
  ): void {
    this.cancelFade(this.ambientFade);
    this.ambientFade = null;

    for (const track of this.retiringAmbient) stopTrack(track);
    this.retiringAmbient = [];

    const outgoing = this.activeAmbient;
    this.retiringAmbient = outgoing;
    this.activeAmbient = incoming;

    for (const track of incoming) {
      void this.playTrack(track);
    }

    this.ambientFade = this.startFade(
      outgoing,
      incoming,
      seconds,
      "state",
      () => {
        for (const track of outgoing) stopTrack(track);
        this.retiringAmbient = [];
        this.ambientFade = null;
      },
    );
  }

  private startFade(
    outgoing: ManagedTrack[],
    incoming: ManagedTrack[],
    seconds: number,
    style: FadeStyle,
    onDone: () => void,
  ): FadeState | null {
    const durationMs = Math.max(0, seconds * 1000);
    if (
      durationMs === 0 ||
      typeof window === "undefined"
    ) {
      for (const track of outgoing) track.mix = 0;
      for (const track of incoming) {
        track.mix = 1;
        track.output.setCutoff(null);
      }
      this.applyVolumes();
      onDone();
      return null;
    }

    const fade: FadeState = {
      timer: 0,
      startedAt: performance.now(),
      durationMs,
      incoming,
      outgoing,
      incomingStart: incoming.map((track) => track.mix),
      outgoingStart: outgoing.map((track) => track.mix),
      style,
    };

    const tick = (): void => {
      const progress = clamp(
        (performance.now() - fade.startedAt) / fade.durationMs,
        0,
        1,
      );
      const [up, down] = fadeCurves(style, progress);
      fade.outgoing.forEach((track, index) => {
        track.mix = (fade.outgoingStart[index] ?? track.mix) * down;
      });
      fade.incoming.forEach((track, index) => {
        const start = fade.incomingStart[index] ?? track.mix;
        track.mix = start + (1 - start) * up;
      });
      if (style === "song") {
        const [incomingCutoff, outgoingCutoff] = handoverCutoffs(progress);
        for (const track of fade.outgoing) track.output.setCutoff(outgoingCutoff);
        for (const track of fade.incoming) track.output.setCutoff(progress >= 1 ? null : incomingCutoff);
      }
      this.applyVolumes();

      if (progress >= 1) {
        window.clearInterval(fade.timer);
        for (const track of fade.incoming) track.output.setCutoff(null);
        onDone();
      }
    };
    fade.timer = window.setInterval(tick, FADE_TICK_MS);
    tick();
    return fade;
  }

  private cancelFade(fade: FadeState | null): void {
    if (fade === null || typeof window === "undefined") return;
    window.clearInterval(fade.timer);
  }

  private createTrack(
    asset: AudioAssetRef,
    loop: boolean,
    mix: number,
  ): ManagedTrack | null {
    const candidates = assetCandidates(asset);
    if (candidates.length === 0) return null;

    const audio = this.audioFactory(candidates[0]!);
    if (audio === null) return null;

    const track: ManagedTrack = {
      assetId: asset.id,
      candidates,
      candidateIndex: 0,
      audio,
      output: this.createOutput(audio),
      mix,
      gain: 0,
      loop,
      errorListener: null,
      endedListener: null,
      advancingFallback: false,
      syncGroup: asset.syncGroup ?? null,
      syncSource: null,
      songId: null,
      stem: null,
    };

    this.configureAudio(track);
    return track;
  }

  private configureAudio(track: ManagedTrack): void {
    track.audio.loop = track.loop;
    track.audio.preload = "auto";
    this.setTrackGain(track, 0);

    const listener = (): void => {
      void this.tryNextCandidate(track);
    };
    track.errorListener = listener;
    track.audio.addEventListener?.("error", listener);
    // A fallback candidate of a synced stem keeps following its source.
    this.attachSync(track);
  }

  /**
   * Starts the stem where its sync source is; once playback really starts,
   * matches it again to absorb the loading delay (the fade is near silent
   * then, so the small seek is inaudible).
   */
  private attachSync(track: ManagedTrack): void {
    if (track.syncSource === null) return;
    this.matchSyncPosition(track);
    const audio = track.audio;
    const onPlaying = (): void => {
      audio.removeEventListener?.("playing", onPlaying);
      if (track.audio !== audio) return;
      this.matchSyncPosition(track);
      track.syncSource = null;
    };
    audio.addEventListener?.("playing", onPlaying);
  }

  /**
   * Stems of one song crossfade at the same position, so a calm ↔ intense
   * switch sounds like one track rising and falling, not a restart.
   */
  private syncWithActive(track: ManagedTrack): void {
    const active = this.activeMusic;
    if (
      active === null ||
      track.syncGroup === null ||
      active.syncGroup !== track.syncGroup
    ) {
      return;
    }
    track.syncSource = active;
    this.attachSync(track);
  }

  private matchSyncPosition(track: ManagedTrack): void {
    const source = track.syncSource;
    // A stopped source has been rewound to 0: nothing to match any more.
    if (source === null || source.audio.paused === true) return;
    const position = source.audio.currentTime;
    if (!Number.isFinite(position)) return;
    if (Math.abs(track.audio.currentTime - position) > 0.02) {
      track.audio.currentTime = position;
    }
  }

  private async playTrack(track: ManagedTrack): Promise<void> {
    if (this.paused || this.destroyed) return;

    try {
      await safePlay(track.audio);
    } catch {
      await this.tryNextCandidate(track);
    }
  }

  private async tryNextCandidate(
    track: ManagedTrack,
  ): Promise<void> {
    if (track.advancingFallback) return;
    if (
      this.destroyed ||
      track.candidateIndex + 1 >= track.candidates.length
    ) {
      track.audio.pause();
      return;
    }

    track.advancingFallback = true;
    detachListeners(track);
    track.audio.pause();
    track.output.dispose();

    track.candidateIndex += 1;
    const next = this.audioFactory(
      track.candidates[track.candidateIndex]!,
    );
    if (next === null) {
      track.advancingFallback = false;
      return;
    }

    track.audio = next;
    track.output = this.createOutput(next);
    track.errorListener = null;
    track.endedListener = null;
    this.configureAudio(track);
    this.attachEnded(track);
    this.applyVolumes();

    if (!this.paused) {
      try {
        await safePlay(track.audio);
      } catch {
        track.advancingFallback = false;
        await this.tryNextCandidate(track);
        return;
      }
    }
    track.advancingFallback = false;
  }

  private duckMultiplier(): number {
    let multiplier = 1;

    if (this.duckReasons.has("pronunciation")) {
      multiplier = Math.min(
        multiplier,
        this.profile.duckingProfile.pronunciation,
      );
    }
    if (this.duckReasons.has("announcer")) {
      multiplier = Math.min(
        multiplier,
        this.profile.duckingProfile.announcer,
      );
    }
    if (this.duckReasons.has("warning")) {
      multiplier = Math.min(
        multiplier,
        this.profile.duckingProfile.warning,
      );
    }

    return multiplier;
  }

  private setTrackGain(track: ManagedTrack, value: number): void {
    track.gain = clamp(value, 0, 1);
    track.output.setGain(track.gain);
  }

  private applyVolumes(): void {
    const duck = this.duckMultiplier();
    const phaseBoost =
      this.state === "MINI_BOSS" ||
      this.state === "WORLD_BOSS" ||
      this.state === "GALAXY_BOSS"
        ? Math.min(1.12, 1 + (this.bossPhase - 1) * 0.035)
        : 1;
    const ambientDuck = duck >= 1 ? 1 : duck * 0.7;

    if (this.activeMusic !== null) {
      this.setTrackGain(
        this.activeMusic,
        this.musicVolume * duck * phaseBoost * this.activeMusic.mix,
      );
    }
    for (const track of this.retiringMusic) {
      this.setTrackGain(track, this.musicVolume * duck * track.mix);
    }

    for (const track of this.activeAmbient) {
      this.setTrackGain(track, this.ambientVolume * ambientDuck * track.mix);
    }
    for (const track of this.retiringAmbient) {
      this.setTrackGain(track, this.ambientVolume * ambientDuck * track.mix);
    }
  }
}
