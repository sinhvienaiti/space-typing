import { clamp } from "../logic";
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

type ManagedTrack = {
  assetId: string;
  candidates: string[];
  candidateIndex: number;
  audio: AudioLike;
  mix: number;
  loop: boolean;
  errorListener: EventListener | null;
};

type FadeState = {
  timer: number;
  startedAt: number;
  durationMs: number;
  incoming: ManagedTrack[];
  outgoing: ManagedTrack[];
};

const DEFAULT_MUSIC_VOLUME = 0.34;
const DEFAULT_AMBIENT_VOLUME = 0.14;
const FADE_TICK_MS = 40;

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

function stopTrack(track: ManagedTrack): void {
  if (
    track.errorListener !== null &&
    track.audio.removeEventListener !== undefined
  ) {
    track.audio.removeEventListener(
      "error",
      track.errorListener,
    );
  }
  track.audio.pause();
  track.audio.currentTime = 0;
}

function isOneShot(state: MusicState): boolean {
  return (
    state === "VICTORY" ||
    state === "DEFEAT" ||
    state === "TRANSITION"
  );
}

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

  private readonly onPronunciation = (event: Event): void => {
    const active =
      (event as CustomEvent<{ active?: unknown }>).detail?.active === true;
    if (active) this.duck("pronunciation");
    else this.releaseDuck("pronunciation");
  };

  private readonly onAnnouncer = (event: Event): void => {
    const active =
      (event as CustomEvent<{ active?: unknown }>).detail?.active === true;
    if (active) this.duck("announcer");
    else this.releaseDuck("announcer");
  };

  constructor(audioFactory: AudioFactory = browserAudioFactory) {
    this.audioFactory = audioFactory;

    if (typeof window !== "undefined") {
      window.addEventListener(
        "space-typing:pronunciation",
        this.onPronunciation,
      );
      window.addEventListener(
        "space-typing:announcer",
        this.onAnnouncer,
      );
    }
  }

  getState(): MusicState {
    return this.state;
  }

  getWorldProfile(): WorldMusicProfile {
    return this.profile;
  }

  setWorldProfile(profile: WorldMusicProfile): void {
    if (this.destroyed) return;
    const changed = profile.worldId !== this.profile.worldId;
    this.profile = profile;
    if (!changed) {
      this.applyVolumes();
      return;
    }

    this.transitionAmbient(profile.ambientLayers);
    if (
      this.state === "WORLD_NORMAL" ||
      this.state === "WORLD_INTENSE"
    ) {
      this.transitionTo(this.state);
    }
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

    const asset = musicAssetForState(this.profile, state);
    if (asset === null) {
      this.fadeMusicTo(null, crossfadeSeconds);
      return;
    }

    if (
      this.activeMusic !== null &&
      this.activeMusic.assetId === asset.id
    ) {
      this.activeMusic.loop = stateLoops(state);
      this.activeMusic.audio.loop = this.activeMusic.loop;
      this.applyVolumes();
      return;
    }

    const next = this.createTrack(
      asset,
      stateLoops(state),
      0,
    );
    this.fadeMusicTo(next, crossfadeSeconds);
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
    if (this.destroyed || this.paused === paused) return;
    this.paused = paused;

    if (paused) {
      this.activeMusic?.audio.pause();
      for (const track of this.activeAmbient) {
        track.audio.pause();
      }
      return;
    }

    if (this.activeMusic !== null) {
      void this.playTrack(this.activeMusic);
    }
    for (const track of this.activeAmbient) {
      void this.playTrack(track);
    }
  }

  preloadNext(profile: WorldMusicProfile): void {
    if (this.destroyed) return;

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
    this.fadeMusicTo(null, crossfadeSeconds);
    this.fadeAmbientTo([], crossfadeSeconds);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (typeof window !== "undefined") {
      window.removeEventListener(
        "space-typing:pronunciation",
        this.onPronunciation,
      );
      window.removeEventListener(
        "space-typing:announcer",
        this.onAnnouncer,
      );
      for (const timer of this.warningTimers.values()) {
        window.clearTimeout(timer);
      }
    }
    this.warningTimers.clear();

    this.cancelFade(this.musicFade);
    this.cancelFade(this.ambientFade);
    this.musicFade = null;
    this.ambientFade = null;

    const tracks = [
      ...(this.activeMusic === null ? [] : [this.activeMusic]),
      ...this.retiringMusic,
      ...this.activeAmbient,
      ...this.retiringAmbient,
    ];
    for (const track of tracks) stopTrack(track);

    this.activeMusic = null;
    this.retiringMusic = [];
    this.activeAmbient = [];
    this.retiringAmbient = [];
    this.duckReasons.clear();
  }

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
  ): void {
    this.cancelFade(this.musicFade);
    this.musicFade = null;

    for (const track of this.retiringMusic) stopTrack(track);
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
      () => {
        for (const track of outgoing) stopTrack(track);
        this.retiringMusic = [];
        this.musicFade = null;
      },
    );
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
    onDone: () => void,
  ): FadeState | null {
    const durationMs = Math.max(0, seconds * 1000);
    if (
      durationMs === 0 ||
      typeof window === "undefined"
    ) {
      for (const track of outgoing) track.mix = 0;
      for (const track of incoming) track.mix = 1;
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
    };

    fade.timer = window.setInterval(() => {
      const progress = clamp(
        (performance.now() - fade.startedAt) / fade.durationMs,
        0,
        1,
      );
      for (const track of fade.outgoing) {
        track.mix = 1 - progress;
      }
      for (const track of fade.incoming) {
        track.mix = progress;
      }
      this.applyVolumes();

      if (progress >= 1) {
        window.clearInterval(fade.timer);
        onDone();
      }
    }, FADE_TICK_MS);

    this.applyVolumes();
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
      mix,
      loop,
      errorListener: null,
    };

    this.configureAudio(track);
    return track;
  }

  private configureAudio(track: ManagedTrack): void {
    track.audio.loop = track.loop;
    track.audio.preload = "auto";
    track.audio.volume = 0;

    const listener = (): void => {
      void this.tryNextCandidate(track);
    };
    track.errorListener = listener;
    track.audio.addEventListener?.("error", listener);
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
    if (
      this.destroyed ||
      track.candidateIndex + 1 >= track.candidates.length
    ) {
      track.audio.pause();
      return;
    }

    if (
      track.errorListener !== null &&
      track.audio.removeEventListener !== undefined
    ) {
      track.audio.removeEventListener(
        "error",
        track.errorListener,
      );
    }
    track.audio.pause();

    track.candidateIndex += 1;
    const next = this.audioFactory(
      track.candidates[track.candidateIndex]!,
    );
    if (next === null) return;

    track.audio = next;
    track.errorListener = null;
    this.configureAudio(track);
    this.applyVolumes();

    if (!this.paused) {
      try {
        await safePlay(track.audio);
      } catch {
        await this.tryNextCandidate(track);
      }
    }
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
      this.activeMusic.audio.volume = clamp(
        this.musicVolume *
          duck *
          phaseBoost *
          this.activeMusic.mix,
        0,
        1,
      );
    }
    for (const track of this.retiringMusic) {
      track.audio.volume = clamp(
        this.musicVolume * duck * track.mix,
        0,
        1,
      );
    }

    for (const track of this.activeAmbient) {
      track.audio.volume = clamp(
        this.ambientVolume * ambientDuck * track.mix,
        0,
        1,
      );
    }
    for (const track of this.retiringAmbient) {
      track.audio.volume = clamp(
        this.ambientVolume * ambientDuck * track.mix,
        0,
        1,
      );
    }
  }
}
