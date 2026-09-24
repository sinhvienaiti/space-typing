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

  constructor(
    private readonly audioFactory: SampleAudioFactory =
      browserAudioFactory,
  ) {}

  preload(): void {
    if (this.preloaded) return;
    this.preloaded = true;

    for (const id of Object.keys(SAMPLE_SFX) as SampleSfxId[]) {
      this.ensurePool(id, 1);
    }
  }

  play(
    id: SampleSfxId,
    masterVolume: number,
    pronunciationActive: boolean,
    playbackRate = 1,
  ): boolean {
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
