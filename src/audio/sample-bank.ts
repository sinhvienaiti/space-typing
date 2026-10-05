import {
  mixedSfxGain,
  type AudioGroup,
} from "./mix";

export const SAMPLE_SFX = {
  "projectile-intercept": {
    path: "/assets/audio/sfx/kenney/laser-small.ogg",
    group: "combat",
    gain: 0.42,
    poolSize: 4,
  },
  "enemy-shot": {
    path: "/assets/audio/sfx/kenney/laser-large.ogg",
    group: "combat",
    gain: 0.24,
    poolSize: 3,
  },
  "shield-break": {
    path: "/assets/audio/sfx/kenney/force-field.ogg",
    group: "warnings",
    gain: 0.5,
    poolSize: 3,
  },
  "boss-entrance": {
    path: "/assets/audio/sfx/kenney/engine-large.ogg",
    group: "warnings",
    gain: 0.42,
    poolSize: 2,
  },
  "boss-thruster": {
    path: "/assets/audio/sfx/kenney/thruster.ogg",
    group: "combat",
    gain: 0.24,
    poolSize: 2,
  },
  "boss-death": {
    path: "/assets/audio/sfx/kenney/explosion-low.ogg",
    group: "combat",
    gain: 0.62,
    poolSize: 2,
  },
  "explosion-accent": {
    path: "/assets/audio/sfx/kenney/explosion-crunch.ogg",
    group: "combat",
    gain: 0.34,
    poolSize: 3,
  },
  confirm: {
    path: "/assets/audio/sfx/kenney/confirm.ogg",
    group: "ui",
    gain: 0.42,
    poolSize: 3,
  },
  warning: {
    path: "/assets/audio/sfx/kenney/error.ogg",
    group: "warnings",
    gain: 0.38,
    poolSize: 3,
  },
  "victory-stinger": {
    path: "/assets/audio/stingers/victory.ogg",
    group: "ui",
    gain: 0.52,
    poolSize: 1,
  },
  "credit-drop": {
    path: "/assets/audio/sfx/kenney/confirm.ogg",
    group: "combat",
    gain: 0.22,
    poolSize: 4,
  },
  "credit-pickup": {
    path: "/assets/audio/sfx/kenney/confirm.ogg",
    group: "combat",
    gain: 0.34,
    poolSize: 5,
  },

  // Duel FINAL V2 media pack. These files are installed under
  // public/assets/audio/duel/sfx by the media package.
  "duel-typing-miss": {
    path: "/assets/audio/duel/sfx/typing-miss.ogg",
    group: "typing",
    gain: 0.5,
    poolSize: 3,
  },
  "duel-laser-launch": {
    path: "/assets/audio/duel/sfx/laser-launch.ogg",
    group: "combat",
    gain: 0.55,
    poolSize: 4,
  },
  "duel-missile-launch": {
    path: "/assets/audio/duel/sfx/missile-launch.ogg",
    group: "combat",
    gain: 0.58,
    poolSize: 3,
  },
  "duel-heavy-launch": {
    path: "/assets/audio/duel/sfx/heavy-launch.ogg",
    group: "combat",
    gain: 0.62,
    poolSize: 3,
  },
  "duel-bomb-launch": {
    path: "/assets/audio/duel/sfx/bomb-launch.ogg",
    group: "combat",
    gain: 0.62,
    poolSize: 3,
  },
  "duel-energy-impact": {
    path: "/assets/audio/duel/sfx/energy-impact.ogg",
    group: "combat",
    gain: 0.58,
    poolSize: 4,
  },
  "duel-kinetic-impact": {
    path: "/assets/audio/duel/sfx/kinetic-impact.ogg",
    group: "combat",
    gain: 0.62,
    poolSize: 4,
  },
  "duel-missile-impact": {
    path: "/assets/audio/duel/sfx/missile-impact.ogg",
    group: "combat",
    gain: 0.66,
    poolSize: 4,
  },
  "duel-bomb-impact": {
    path: "/assets/audio/duel/sfx/bomb-impact.ogg",
    group: "combat",
    gain: 0.7,
    poolSize: 3,
  },
  "duel-shield-hit": {
    path: "/assets/audio/duel/sfx/shield-hit.ogg",
    group: "combat",
    gain: 0.55,
    poolSize: 4,
  },
  "duel-shield-break": {
    path: "/assets/audio/duel/sfx/shield-break.ogg",
    group: "warnings",
    gain: 0.7,
    poolSize: 3,
  },
  "duel-repair-energy": {
    path: "/assets/audio/duel/sfx/repair-energy.ogg",
    group: "combat",
    gain: 0.48,
    poolSize: 3,
  },
  "duel-lock-acquire": {
    path: "/assets/audio/duel/sfx/lock-acquire.ogg",
    group: "warnings",
    gain: 0.52,
    poolSize: 3,
  },
  "duel-scan-pulse": {
    path: "/assets/audio/duel/sfx/scan-pulse.ogg",
    group: "combat",
    gain: 0.45,
    poolSize: 3,
  },
  "duel-disrupt-emp": {
    path: "/assets/audio/duel/sfx/disrupt-emp.ogg",
    group: "combat",
    gain: 0.58,
    poolSize: 3,
  },
  "duel-intercept": {
    path: "/assets/audio/duel/sfx/intercept.ogg",
    group: "combat",
    gain: 0.56,
    poolSize: 4,
  },
  "duel-precision": {
    path: "/assets/audio/duel/sfx/precision.ogg",
    group: "combat",
    gain: 0.5,
    poolSize: 3,
  },
  "duel-ship-destruction": {
    path: "/assets/audio/duel/sfx/ship-destruction.ogg",
    group: "combat",
    gain: 0.72,
    poolSize: 2,
  },
  "duel-cataclysm": {
    path: "/assets/audio/duel/sfx/cataclysm.ogg",
    group: "warnings",
    gain: 0.72,
    poolSize: 2,
  },
  "duel-round-win": {
    path: "/assets/audio/duel/sfx/round-win.ogg",
    group: "ui",
    gain: 0.6,
    poolSize: 2,
  },
  "duel-round-loss": {
    path: "/assets/audio/duel/sfx/round-loss.ogg",
    group: "ui",
    gain: 0.58,
    poolSize: 2,
  },
  "duel-round-draw": {
    path: "/assets/audio/duel/sfx/round-draw.ogg",
    group: "ui",
    gain: 0.55,
    poolSize: 2,
  },
} as const satisfies Record<
  string,
  {
    path: string;
    group: AudioGroup;
    gain: number;
    poolSize: number;
  }
>;

export type SampleSfxId = keyof typeof SAMPLE_SFX;

type VoicePool = {
  voices: HTMLAudioElement[];
  cursor: number;
};

export type SampleAudioFactory = (
  src: string,
) => HTMLAudioElement | null;

function browserAudioFactory(
  src: string,
): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  return new Audio(src);
}

export class SampleSfxBank {
  private readonly pools = new Map<SampleSfxId, VoicePool>();
  private preloaded = false;

  private mixMaster = 1;
  private mixPronunciationActive = false;
  private mixCategories: Partial<Record<AudioGroup, number>> = {};

  constructor(
    private readonly audioFactory: SampleAudioFactory =
      browserAudioFactory,
  ) {}

  /** Re-levels pooled media immediately so already-playing tails follow focus/mute. */
  setMix(
    masterVolume: number,
    pronunciationActive: boolean,
    categories: Partial<Record<AudioGroup, number>> = this.mixCategories,
  ): void {
    this.mixMaster = Number.isFinite(masterVolume) ? Math.min(1, Math.max(0, masterVolume)) : 0;
    this.mixPronunciationActive = pronunciationActive;
    this.mixCategories = { ...categories };
    for (const [id, pool] of this.pools) {
      const definition = SAMPLE_SFX[id];
      const gain = mixedSfxGain(
        this.mixMaster,
        definition.group,
        definition.gain,
        this.mixPronunciationActive,
        this.mixCategories[definition.group] ?? 1,
      );
      for (const voice of pool.voices) {
        try { voice.volume = gain; } catch { /* media element may be tearing down */ }
      }
    }
  }

  preload(): void {
    if (this.preloaded) return;
    this.preloaded = true;

    for (const id of Object.keys(SAMPLE_SFX) as SampleSfxId[]) {
      this.ensurePool(id, SAMPLE_SFX[id].poolSize);
    }
  }

  play(
    id: SampleSfxId,
    masterVolume: number,
    pronunciationActive: boolean,
    playbackRate = 1,
    categories: Partial<Record<AudioGroup, number>> = this.mixCategories,
  ): boolean {
    this.mixMaster = Number.isFinite(masterVolume) ? Math.min(1, Math.max(0, masterVolume)) : 0;
    this.mixPronunciationActive = pronunciationActive;
    this.mixCategories = { ...categories };
    const definition = SAMPLE_SFX[id];
    const pool = this.ensurePool(id, definition.poolSize);
    if (pool === null || pool.voices.length === 0) return false;

    const voice = pool.voices[pool.cursor % pool.voices.length]!;
    pool.cursor = (pool.cursor + 1) % pool.voices.length;

    const gain = mixedSfxGain(
      masterVolume,
      definition.group,
      definition.gain,
      pronunciationActive,
      this.mixCategories[definition.group] ?? 1,
    );
    if (gain <= 0) return false;

    try {
      voice.pause();
      voice.currentTime = 0;
      voice.volume = gain;
      voice.playbackRate = Math.max(
        0.72,
        Math.min(1.35, playbackRate),
      );
      const result = voice.play();
      if (
        result !== undefined &&
        typeof result.catch === "function"
      ) {
        void result.catch(() => undefined);
      }
      return true;
    } catch {
      return false;
    }
  }

  destroy(): void {
    for (const pool of this.pools.values()) {
      for (const voice of pool.voices) {
        try {
          voice.pause();
          voice.currentTime = 0;
        } catch {
          // Fail-soft audio teardown.
        }
      }
    }
    this.pools.clear();
  }

  private ensurePool(
    id: SampleSfxId,
    desiredSize: number,
  ): VoicePool | null {
    const definition = SAMPLE_SFX[id];
    let pool = this.pools.get(id);
    if (pool === undefined) {
      pool = { voices: [], cursor: 0 };
      this.pools.set(id, pool);
    }

    while (pool.voices.length < desiredSize) {
      const voice = this.audioFactory(definition.path);
      if (voice === null) break;
      voice.preload = "auto";
      voice.load?.();
      pool.voices.push(voice);
    }

    return pool.voices.length > 0 ? pool : null;
  }
}
