import type { PlayerImpactVariant } from "../characters/projectiles";
import {
  LOCAL_ANNOUNCER_ROOT,
  announcerAsset,
  announcerHasFallback,
  announcerPriority,
  localAnnouncerAsset,
  type AnnouncerEvent,
} from "./announcer";
import {
  mixedSfxGain,
  type AudioGroup,
} from "./mix";
import {
  SampleSfxBank,
  type SampleSfxId,
} from "./sample-bank";
import type { EnemyMaterial } from "../enemies/identity";
import {
  CreditSoundEngine,
  type CreditTickInput,
} from "./credit-sound";
import type {
  CreditCrystalTier,
  CreditCrystalVariant,
} from "../rewards/combat-credit-drops";
import type { VisualQuality } from "../types";

/** Boss skill ids (src/boss/skills.ts BossSkillKind) for the skill sounds. */
type BossSkillSoundKind = "volley" | "lance" | "quake" | "surge" | "tether" | "cataclysm";

/** Optional shaping for one synthesized voice. */
type VoiceShape = {
  /** Stereo position, -1 (left) … 1 (right). */
  pan?: number;
  /** Seconds to fade in (0 = instant start). */
  attack?: number;
  /** Band-pass / high-pass the noise (noise voices only). */
  filter?: BiquadFilterType;
  frequency?: number;
  q?: number;
  /** Level multiplier for a whole group of voices (1 = as written). */
  gain?: number;
};

/**
 * Level trims (amplitude) that put each material's hit layer 3–5 dB under a
 * ship bolt and its death layer level with a finisher (measured 29/09/2026).
 */
const MATERIAL_HIT_TRIM: Readonly<Record<EnemyMaterial, number>> = {
  bubble: 6,
  bell: 1.6,
  ember: 7,
  ice: 3.5,
  crystal: 2.6,
  wood: 7,
  void: 3.2,
  metal: 2.6,
};
const MATERIAL_DEATH_TRIM: Readonly<Record<EnemyMaterial, number>> = {
  bubble: 5,
  bell: 1.4,
  ember: 2.2,
  ice: 1.6,
  crystal: 4,
  wood: 2.6,
  void: 1.8,
  metal: 2.2,
};

/** Player hit identities. Energy remains the legacy/failsafe tracer sound. */
export type ImpactVariant = PlayerImpactVariant | "energy";

/**
 * Pitches of the crystal ring: A minor pentatonic (G6 A6 C7 D7 E7), so a
 * stream of hits chimes in key with the World 01 theme instead of clashing.
 */
const IMPACT_RING_HZ = [1567.98, 1760, 2093, 2349.32, 2637.02] as const;

type ImpactVoiceProfile = {
  weight: number;
  crackHz: number;
  bodyStart: number;
  bodyEnd: number;
  bodyType: OscillatorType;
  thudStart: number;
  thudEnd: number;
  accentStart: number;
  accentEnd: number;
  accentType: OscillatorType;
};

const IMPACT_VOICES: Readonly<Record<Exclude<ImpactVariant, "crystal">, ImpactVoiceProfile>> = {
  energy:  { weight: 2.3, crackHz: 2600, bodyStart: 330, bodyEnd: 140, bodyType: "triangle", thudStart: 110, thudEnd: 55, accentStart: 900, accentEnd: 240, accentType: "sawtooth" },
  heavy:   { weight: 2.6, crackHz: 1850, bodyStart: 250, bodyEnd: 82, bodyType: "square", thudStart: 92, thudEnd: 42, accentStart: 420, accentEnd: 120, accentType: "triangle" },
  storm:   { weight: 2.05, crackHz: 5200, bodyStart: 410, bodyEnd: 180, bodyType: "triangle", thudStart: 118, thudEnd: 62, accentStart: 1850, accentEnd: 360, accentType: "sawtooth" },
  void:    { weight: 2.1, crackHz: 1450, bodyStart: 185, bodyEnd: 58, bodyType: "sawtooth", thudStart: 72, thudEnd: 34, accentStart: 640, accentEnd: 115, accentType: "sine" },
  star:    { weight: 1.95, crackHz: 4650, bodyStart: 440, bodyEnd: 235, bodyType: "triangle", thudStart: 124, thudEnd: 70, accentStart: 2180, accentEnd: 3100, accentType: "sine" },
  missile: { weight: 2.55, crackHz: 2250, bodyStart: 205, bodyEnd: 68, bodyType: "sawtooth", thudStart: 82, thudEnd: 38, accentStart: 510, accentEnd: 95, accentType: "square" },
  mystic:  { weight: 2.0, crackHz: 3600, bodyStart: 320, bodyEnd: 190, bodyType: "sine", thudStart: 105, thudEnd: 56, accentStart: 880, accentEnd: 1380, accentType: "sine" },
  shield:  { weight: 2.35, crackHz: 2850, bodyStart: 285, bodyEnd: 135, bodyType: "triangle", thudStart: 98, thudEnd: 46, accentStart: 620, accentEnd: 250, accentType: "square" },
  slash:   { weight: 2.15, crackHz: 4950, bodyStart: 475, bodyEnd: 165, bodyType: "sawtooth", thudStart: 108, thudEnd: 52, accentStart: 1480, accentEnd: 480, accentType: "triangle" },
  radiant: { weight: 1.95, crackHz: 4800, bodyStart: 395, bodyEnd: 215, bodyType: "sine", thudStart: 120, thudEnd: 64, accentStart: 1920, accentEnd: 2820, accentType: "sine" },
  cosmic:  { weight: 2.2, crackHz: 3350, bodyStart: 235, bodyEnd: 92, bodyType: "triangle", thudStart: 84, thudEnd: 40, accentStart: 760, accentEnd: 1180, accentType: "sine" },
};

export class Sfx {
  private context: AudioContext | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private lastBoltImpact = -Infinity;
  private lastRing = -1;
  private announcerAudio: HTMLAudioElement | null = null;
  private readonly samples = new SampleSfxBank();
  private volume = 0.5;
  private pronunciationActive = false;
  private destroyed = false;
  private readonly timers = new Set<number>();
  private lastEnemyHit = -Infinity;
  private lastEnemyDeath = -Infinity;
  private lastBossImpact = -Infinity;
  private lastBellNote = -1;
  private creditEngine: CreditSoundEngine | null = null;
  /** Credit sound level on top of SFX volume (Settings, 0–2, 1 = default). */
  private creditVolume = 1;

  private readonly onPronunciation = (event: Event): void => {
    const detail = (event as CustomEvent<{ active?: unknown }>).detail;
    this.pronunciationActive = detail?.active === true;
  };

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener(
        "space-typing:pronunciation",
        this.onPronunciation,
      );
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (typeof window !== "undefined") {
      window.removeEventListener(
        "space-typing:pronunciation",
        this.onPronunciation,
      );
      for (const timer of this.timers) {
        window.clearTimeout(timer);
      }
    }
    this.timers.clear();

    if (this.limiter !== null) {
      this.limiter.disconnect();
      this.limiter = null;
    }
    this.noiseBuffer = null;
    this.samples.destroy();
    if (this.announcerAudio !== null) {
      this.announcerAudio.pause();
      this.announcerAudio = null;
      this.notifyAnnouncer(false);
    }
    if (this.context !== null) {
      void this.context.close();
      this.context = null;
    }
  }

  /** Credit crystal sounds, relative to SFX volume (0 = off, 2 = double). */
  setCreditVolume(volume: number): void {
    this.creditVolume = Number.isFinite(volume)
      ? Math.min(2, Math.max(0, volume))
      : 1;
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.announcerAudio !== null) {
      this.announcerAudio.volume = this.announcerVolume();
    }
  }

  unlock(): void {
    if (this.destroyed) return;
    if (this.context === null) {
      this.context = new AudioContext();
    }
    if (this.context.state === "suspended") {
      void this.context.resume();
    }
    this.samples.preload();
    this.loadLocalAnnouncer();
  }

  /** The unlocked AudioContext (null before unlock or after destroy). */
  audioContext(): AudioContext | null {
    if (this.destroyed) return null;
    this.unlock();
    return this.context;
  }

  masterVolume(): number {
    return this.volume;
  }

  isPronunciationActive(): boolean {
    return this.pronunciationActive;
  }

  playSample(
    id: SampleSfxId,
    playbackRate = 1,
  ): boolean {
    if (this.destroyed) return false;
    this.unlock();
    return this.samples.play(
      id,
      this.volume,
      this.pronunciationActive,
      playbackRate,
    );
  }

  shot(multiplier = 1): void {
    this.tone(
      520 + multiplier * 35,
      0.038,
      "square",
      0.04,
      760,
      "typing",
    );
  }

  hit(pitch = 1): void {
    const safePitch = Math.max(0.5, Math.min(1.6, pitch));
    this.tone(190 * safePitch, 0.065, "sawtooth", 0.045, 110 * safePitch, "combat");
  }

  /**
   * A player shot landing on its target: a bright crack, a punchy body and a
   * low thud for weight, plus (crystal) a glassy ring on a pentatonic note or
   * (energy) a short zap. `pan` places it where the target is. Hits closer
   * than 32 ms merge into one. Heavier hits (`power` >= 1.3: word finishers)
   * add a rising shimmer.
   *
   * Levels: the first version peaked near -41 dBFS at default volume, about
   * 25 dB under the music, and the owner could not hear it (28/9). This one
   * peaks near -23 dBFS (finishers near -20), close to the intercept zap.
   */
  boltImpact(power = 1, pan = 0, variant: ImpactVariant = "crystal"): void {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - this.lastBoltImpact < 32) return;
    this.lastBoltImpact = now;

    const profile = variant === "crystal" ? null : IMPACT_VOICES[variant];
    const weight =
      Math.max(0.8, Math.min(1.5, power)) *
      (variant === "crystal" ? 1.9 : profile!.weight);
    const heavy = power >= 1.3;
    const shape: VoiceShape = { pan: Math.max(-1, Math.min(1, pan)) };
    const drift = 0.97 + Math.random() * 0.06;

    this.noise(0.045, 0.28 * weight, "combat", {
      ...shape,
      filter: "bandpass",
      frequency: (variant === "crystal" ? 4200 : profile!.crackHz) * drift,
      q: 0.8,
    });
    this.tone(
      (variant === "crystal" ? 330 : profile!.bodyStart) * drift,
      0.1,
      variant === "crystal" ? "triangle" : profile!.bodyType,
      0.16 * weight,
      (variant === "crystal" ? 140 : profile!.bodyEnd) * drift,
      "combat",
      shape,
    );
    this.tone(
      variant === "crystal" ? 110 : profile!.thudStart,
      0.14,
      "sine",
      0.13 * weight,
      variant === "crystal" ? 55 : profile!.thudEnd,
      "combat",
      shape,
    );

    if (variant === "crystal") {
      let ring = heavy ? 1 : Math.floor(Math.random() * IMPACT_RING_HZ.length);
      if (!heavy && ring === this.lastRing) ring = (ring + 2) % IMPACT_RING_HZ.length;
      this.lastRing = ring;
      const frequency = IMPACT_RING_HZ[ring]! * (0.997 + Math.random() * 0.006);
      const ringShape: VoiceShape = { ...shape, attack: 0.002 };
      this.tone(frequency, heavy ? 0.4 : 0.28, "sine", 0.1 * weight, frequency * 0.985, "combat", ringShape);
      this.tone(frequency * 2.76, 0.16, "sine", 0.04 * weight, frequency * 2.73, "combat", ringShape);
      this.tone(frequency * 5.4, 0.08, "sine", 0.02 * weight, frequency * 5.3, "combat", ringShape);
    } else {
      this.tone(
        profile!.accentStart * drift,
        0.09,
        profile!.accentType,
        0.05 * weight,
        profile!.accentEnd * drift,
        "combat",
        shape,
      );
    }

    if (heavy) {
      this.tone(
        variant === "heavy" || variant === "missile" ? 1700 : 2600,
        0.14,
        "sine",
        0.06,
        variant === "void" ? 2300 : 4400,
        "combat",
        { ...shape, attack: 0.01 },
      );
    }
  }

  wordComplete(perfect: boolean): void {
    this.tone(
      perfect ? 410 : 330,
      perfect ? 0.11 : 0.085,
      "triangle",
      perfect ? 0.04 : 0.03,
      perfect ? 760 : 520,
      "typing",
    );
  }

  /**
   * An enemy is destroyed. With its material (src/enemies/identity.ts) it
   * breaks apart in that material (bubble pop, ice shatter…); without, the
   * generic blip.
   */
  kill(pitch = 1, material?: EnemyMaterial, weight = 1, pan = 0): void {
    if (material !== undefined) {
      this.enemyDeath(material, weight, pan);
      return;
    }
    const safePitch = Math.max(0.5, Math.min(1.6, pitch));
    this.noise(0.1, 0.055, "combat");
    this.tone(240 * safePitch, 0.12, "sawtooth", 0.045, 90 * safePitch, "combat");
  }

  private localAnnouncerLines: Set<string> | null = null;
  private localAnnouncerLoading = false;
  private announcerPriorityPlaying = 0;

  /** Reads the optional local announcer manifest once (one request). */
  private loadLocalAnnouncer(): void {
    if (this.localAnnouncerLoading || typeof fetch !== "function") return;
    this.localAnnouncerLoading = true;
    void fetch(LOCAL_ANNOUNCER_ROOT + "manifest.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((manifest: { lines?: unknown } | null) => {
        const lines = Array.isArray(manifest?.lines) ? manifest.lines.filter((line): line is string => typeof line === "string") : [];
        this.localAnnouncerLines = new Set(lines);
      })
      .catch(() => {
        this.localAnnouncerLines = new Set();
      });
  }

  announcer(event: AnnouncerEvent): void {
    if (this.destroyed || typeof Audio === "undefined") return;
    this.loadLocalAnnouncer();
    const local = this.localAnnouncerLines?.has(event) === true;
    // Spree/first-blood lines exist only as local files: no generic beep.
    if (!local && !announcerHasFallback(event)) return;
    const priority = announcerPriority(event);
    // A newer line of the same or higher rank cuts in (Triple Kill over
    // Double Kill); a lower one waits its turn.
    if (this.announcerAudio !== null && priority < this.announcerPriorityPlaying) return;

    if (this.announcerAudio !== null) {
      this.announcerAudio.pause();
      this.announcerAudio.currentTime = 0;
      this.notifyAnnouncer(false);
    }

    const audio = new Audio(local ? localAnnouncerAsset(event) : announcerAsset(event));
    audio.preload = "auto";
    audio.volume = this.announcerVolume();
    this.announcerAudio = audio;
    this.announcerPriorityPlaying = priority;

    const finish = (): void => {
      if (this.announcerAudio !== audio) return;
      this.announcerAudio = null;
      this.announcerPriorityPlaying = 0;
      this.notifyAnnouncer(false);
    };
    audio.addEventListener?.("ended", finish, { once: true });
    audio.addEventListener?.("error", finish, { once: true });

    void audio
      .play()
      .then(() => {
        if (this.announcerAudio === audio) {
          this.notifyAnnouncer(true);
        }
      })
      .catch(finish);
  }

  wrong(): void {
    this.tone(92, 0.085, "square", 0.042, 70, "typing");
  }

  power(): void {
    this.tone(420, 0.16, "sine", 0.045, 760, "combat");
    this.schedule(
      () => this.tone(700, 0.18, "sine", 0.035, 1050, "combat"),
      60,
    );
  }

  damage(): void {
    this.noise(0.11, 0.06, "combat");
    this.tone(75, 0.16, "sawtooth", 0.05, 45, "combat");
  }

  enemyShot(): void {
    this.samples.play(
      "enemy-shot",
      this.volume,
      this.pronunciationActive,
      0.96,
    );
    this.tone(310, 0.09, "triangle", 0.032, 190, "combat");
  }

  /** Bright, short player laser when a hostile letter projectile is typed. */
  projectileIntercept(): void {
    // Audible paired zap and shatter. Both remain in the COMBAT bus so spoken
    // English still takes priority when pronunciation is active.
    this.samples.play(
      "projectile-intercept",
      this.volume,
      this.pronunciationActive,
      1.08,
    );
    this.tone(1160, 0.11, "sawtooth", 0.09, 310, "combat");
    this.tone(630, 0.125, "triangle", 0.05, 170, "combat");
    this.noise(0.045, 0.027, "combat");
  }

  projectileWarning(): void {
    // Enemy skill telegraphs are frequent and already visible on-screen.
    // Keep mix ducking for readability, but do not synthesize the old
    // high-pitched warning beep on every telegraph.
    this.notifyWarning(180);
  }

  shieldBreak(): void {
    this.notifyWarning(260);
    this.samples.play(
      "shield-break",
      this.volume,
      this.pronunciationActive,
      1,
    );
    this.tone(820, 0.09, "triangle", 0.03, 220, "warnings");
    this.noise(0.055, 0.018, "combat");
  }

  support(): void {
    this.tone(440, 0.12, "sine", 0.026, 690, "combat");
    this.schedule(
      () => this.tone(620, 0.12, "sine", 0.02, 820, "combat"),
      45,
    );
  }

  drain(): void {
    this.tone(210, 0.16, "sawtooth", 0.035, 78, "combat");
  }

  command(): void {
    this.tone(260, 0.11, "square", 0.03, 520, "combat");
    this.schedule(
      () => this.tone(520, 0.1, "square", 0.024, 760, "combat"),
      55,
    );
  }

  eliteWarning(): void {
    this.notifyWarning(520);
    this.samples.play(
      "warning",
      this.volume,
      this.pronunciationActive,
      1.05,
    );
    this.tone(360, 0.11, "triangle", 0.028, 620, "warnings");
    this.schedule(
      () => this.tone(620, 0.14, "triangle", 0.025, 930, "warnings"),
      70,
    );
  }

  rareDrop(): void {
    this.tone(560, 0.13, "sine", 0.028, 920, "ui");
    this.schedule(
      () => this.tone(920, 0.16, "sine", 0.024, 1260, "ui"),
      70,
    );
  }

  supplyArrival(): void {
    this.samples.play(
      "confirm",
      this.volume,
      this.pronunciationActive,
      0.94,
    );
    this.tone(470, 0.1, "triangle", 0.025, 740, "ui");
  }

  uiConfirm(): void {
    this.samples.play(
      "confirm",
      this.volume,
      this.pronunciationActive,
      1.05,
    );
    this.tone(540, 0.06, "sine", 0.018, 700, "ui");
  }

  /** A Credit crystal burst breaking out of a kill (`pan` -1 … 1). */
  creditDrop(
    tier: CreditCrystalTier,
    quality: VisualQuality,
    variant: CreditCrystalVariant = "standard",
    pan = 0,
  ): void {
    this.creditSound()?.drop(tier, variant, quality, pan);
  }

  /** One crystal reaching the ship: a clink on the chain ladder. */
  creditTick(input: CreditTickInput): void {
    this.creditSound()?.tick(input);
  }

  /** A whole burst home: jackpot accent for elite, golden and boss tiers. */
  creditPickup(
    tier: CreditCrystalTier,
    quality: VisualQuality,
    variant: CreditCrystalVariant,
    _hero = false,
    step = 0,
    pan = 0,
  ): void {
    this.creditSound()?.complete(tier, variant, quality, step, pan);
  }

  /** Every 5th burst collected in a row. */
  creditMilestone(step: number, quality: VisualQuality, pan = 0): void {
    this.creditSound()?.milestone(step, quality, pan);
  }

  private creditSound(): CreditSoundEngine | null {
    if (this.destroyed) return null;
    if (this.creditEngine === null) {
      this.creditEngine = new CreditSoundEngine({
        context: () => {
          if (this.destroyed) return null;
          this.unlock();
          return this.context;
        },
        output: () =>
          this.context === null ? null : this.outputNode(this.context),
        level: (gain) =>
          Math.min(
            1,
            mixedSfxGain(
              this.volume,
              "rewards",
              gain,
              this.pronunciationActive,
            ) * this.creditVolume,
          ),
      });
    }
    return this.creditEngine;
  }

  stageClear(
    level: 1 | 2 | 3 | 4 | 5 = 1,
    accuracyTier: 0 | 1 | 2 = 0,
    speedTier: 0 | 1 | 2 = 0,
  ): void {
    const safeLevel = Math.max(1, Math.min(5, level));
    const rate = 0.94 + safeLevel * 0.035;
    this.samples.play(
      "victory-stinger",
      this.volume,
      this.pronunciationActive,
      rate,
    );

    const root = 523.25;
    const chord = [1, 1.25, 1.5, 2] as const;
    const voices = Math.min(chord.length, 1 + safeLevel);
    for (let index = 0; index < voices; index += 1) {
      const frequency = root * chord[index]!;
      this.schedule(
        () =>
          this.tone(
            frequency,
            0.2 + safeLevel * 0.018,
            index % 2 === 0 ? "triangle" : "sine",
            0.024 + safeLevel * 0.004,
            frequency * (1.04 + safeLevel * 0.008),
            "ui",
            { attack: 0.004 },
          ),
        index * 72,
      );
    }

    if (accuracyTier >= 1) {
      this.schedule(
        () =>
          this.tone(
            2093,
            0.18,
            "sine",
            0.022 + accuracyTier * 0.006,
            2637,
            "ui",
            { attack: 0.002 },
          ),
        180,
      );
    }
    if (speedTier >= 1) {
      this.schedule(
        () =>
          this.tone(
            1318,
            0.14,
            "triangle",
            0.018 + speedTier * 0.005,
            2093,
            "ui",
            { attack: 0.002 },
          ),
        236,
      );
    }
  }

  stageFail(): void {
    this.samples.play(
      "warning",
      this.volume,
      this.pronunciationActive,
      0.82,
    );
    this.tone(180, 0.2, "sawtooth", 0.03, 82, "ui");
  }

  criticalHull(): void {
    this.notifyWarning(720);
    this.samples.play(
      "warning",
      this.volume,
      this.pronunciationActive,
      0.9,
    );
    this.tone(235, 0.14, "square", 0.026, 155, "warnings");
    this.schedule(
      () => this.tone(190, 0.13, "square", 0.022, 130, "warnings"),
      120,
    );
  }

  bossEntrance(pitch = 1): void {
    this.notifyWarning(900);
    const safePitch = Math.max(0.5, Math.min(1.6, pitch));
    this.samples.play(
      "boss-entrance",
      this.volume,
      this.pronunciationActive,
      Math.min(1.2, safePitch),
    );
    this.samples.play(
      "boss-thruster",
      this.volume,
      this.pronunciationActive,
      0.92,
    );
    this.tone(95 * safePitch, 0.28, "sawtooth", 0.045, 58 * safePitch, "warnings");
    this.schedule(
      () => this.tone(220 * safePitch, 0.24, "triangle", 0.03, 420 * safePitch, "warnings"),
      110,
    );
  }

  bossHit(): void {
    this.tone(135, 0.075, "sawtooth", 0.04, 92, "combat");
  }

  bossDeath(pitch = 1): void {
    const safePitch = Math.max(0.5, Math.min(1.6, pitch));
    this.samples.play(
      "boss-death",
      this.volume,
      this.pronunciationActive,
      Math.max(0.78, Math.min(1.12, safePitch)),
    );
    this.samples.play(
      "explosion-accent",
      this.volume,
      this.pronunciationActive,
      0.9,
    );
    this.noise(0.24, 0.075, "combat");
    this.tone(110 * safePitch, 0.35, "sawtooth", 0.055, 42 * safePitch, "combat");
    this.schedule(
      () => this.tone(360 * safePitch, 0.32, "sine", 0.04, 760 * safePitch, "combat"),
      100,
    );
  }

  bossPhase(pitch = 1): void {
    this.notifyWarning(620);
    const safePitch = Math.max(0.5, Math.min(1.6, pitch));
    this.tone(180 * safePitch, 0.16, "sawtooth", 0.04, 320 * safePitch, "warnings");
    this.schedule(
      () => this.tone(420 * safePitch, 0.18, "triangle", 0.034, 720 * safePitch, "warnings"),
      70,
    );
  }

  bossShieldBreak(): void {
    this.samples.play(
      "shield-break",
      this.volume,
      this.pronunciationActive,
      0.86,
    );
    this.tone(760, 0.12, "triangle", 0.036, 240, "warnings");
    this.noise(0.08, 0.028, "combat");
  }

  bossStagger(): void {
    this.tone(250, 0.14, "sine", 0.03, 120, "combat");
  }

  // --- HUD cues -----------------------------------------------------------------

  private lastHudCue = 0;

  /** The score panels catch fire (level 1–3): an ignition whoosh, deeper each level. */
  heatUp(level: number): void {
    const now = this.clock();
    if (now - this.lastHudCue < 250) return;
    this.lastHudCue = now;
    const k = Math.max(1, Math.min(3, level));
    this.noise(0.42 + k * 0.1, 0.035 + k * 0.012, "combat", { filter: "bandpass", frequency: 520 + k * 180, q: 0.6, attack: 0.08 });
    this.tone(70 - k * 8, 0.32, "sine", 0.03 + k * 0.01, 46, "combat");
  }

  /**
   * A bonus reward reaches the ship. Items: a warm absorb (whoosh + low
   * rising pair). Treasure: the Credit gem pickup. Crates: a deeper swell.
   */
  rewardPickup(kind: "item" | "treasure" | "crate"): void {
    if (kind === "treasure" && this.playSample("credit-pickup", 1.05)) {
      this.noise(0.2, 0.02, "rewards", { filter: "bandpass", frequency: 3200, q: 0.9 });
      return;
    }
    const base = kind === "crate" ? 165 : 220;
    this.noise(0.26, 0.03, "rewards", { filter: "bandpass", frequency: kind === "crate" ? 900 : 1500, q: 0.7 });
    this.tone(base, 0.3, "triangle", 0.032, base * 1.5, "rewards", { attack: 0.02 });
    this.schedule(() => this.tone(base * 1.5, 0.34, "sine", 0.026, base * 2, "rewards"), 60);
  }

  /** A hotbar slot is ready again: a short low charge-up, not a chime. */
  hotbarReady(): void {
    const now = this.clock();
    if (now - this.lastHudCue < 400) return;
    this.lastHudCue = now;
    this.noise(0.06, 0.022, "ui", { filter: "bandpass", frequency: 1400, q: 1.1 });
    this.tone(150, 0.16, "triangle", 0.022, 230, "ui", { attack: 0.03 });
  }

  // --- Boss skills (Depth View, src/boss/skills.ts) ---------------------------
  //
  // War-film weight like the Duel: wind-ups are low rumbles and lock tones,
  // hits are heavy impacts, counters are clangs, whooshes and snaps. No bright
  // pitched chimes.

  /** A boss skill starts winding up. */
  bossSkillCharge(kind: BossSkillSoundKind, voice = 1): void {
    const v = Math.max(0.6, Math.min(1.3, voice));
    switch (kind) {
      case "lance":
        if (!this.playSample("duel-lock-acquire", 0.82)) this.projectileWarning();
        this.tone(62 * v, 1.6, "sawtooth", 0.034, 150 * v, "warnings", { attack: 1.1 });
        return;
      case "quake":
        this.playSample("boss-thruster", 0.62);
        this.noise(1.2, 0.05, "combat", { filter: "lowpass", frequency: 170, q: 0.7 });
        this.tone(44 * v, 1.5, "sine", 0.05, 70 * v, "combat", { attack: 0.9 });
        return;
      case "surge":
        this.playSample("boss-thruster", 0.86);
        this.tone(52 * v, 1.3, "sawtooth", 0.03, 118 * v, "warnings", { attack: 0.8 });
        return;
      case "tether":
        if (!this.playSample("duel-scan-pulse", 0.78)) this.tone(160 * v, 0.4, "square", 0.02, 90 * v, "warnings");
        this.tone(70 * v, 1.0, "sawtooth", 0.026, 96 * v, "warnings", { attack: 0.6 });
        return;
      case "cataclysm":
        if (!this.playSample("duel-cataclysm", 0.9)) this.bossEntrance(1.05);
        this.tone(38, 2.2, "sawtooth", 0.04, 76, "warnings", { attack: 1.2 });
        return;
      case "volley":
        return;
    }
  }

  /** The skill fires. */
  bossSkillRelease(kind: BossSkillSoundKind): void {
    switch (kind) {
      case "lance":
        if (!this.playSample("duel-heavy-launch", 0.78)) this.tone(150, 0.3, "sawtooth", 0.05, 50, "combat");
        this.noise(0.32, 0.05, "combat", { filter: "bandpass", frequency: 700, q: 0.6 });
        return;
      case "quake":
        if (!this.playSample("duel-bomb-impact", 0.66)) this.tone(70, 0.6, "sine", 0.06, 32, "combat");
        this.noise(0.7, 0.07, "combat", { filter: "lowpass", frequency: 260, q: 0.6 });
        return;
      case "surge":
        this.playSample("boss-thruster", 1.18);
        this.noise(0.45, 0.06, "combat", { filter: "bandpass", frequency: 420, q: 0.5 });
        return;
      case "tether":
        if (!this.playSample("duel-disrupt-emp", 0.8)) this.tone(240, 0.3, "square", 0.025, 110, "combat");
        return;
      case "cataclysm":
        if (!this.playSample("duel-bomb-launch", 0.74)) this.tone(110, 0.5, "sawtooth", 0.04, 40, "combat");
        return;
      case "volley":
        return;
    }
  }

  /** A boss skill lands on the ship (each meteor too). */
  bossSkillHit(kind: BossSkillSoundKind): void {
    if (kind === "lance") {
      if (!this.playSample("duel-energy-impact", 0.78)) this.bossHit();
    } else if (kind === "surge") {
      if (!this.playSample("duel-kinetic-impact", 0.8)) this.bossHit();
    } else if (kind === "quake" || kind === "cataclysm") {
      if (!this.playSample("duel-bomb-impact", kind === "quake" ? 0.86 : 1)) this.bossHit();
    }
  }

  /** One counter letter: a dry mechanical tick. */
  bossCounterKey(progress: number): void {
    const p = Math.max(0, Math.min(1, progress));
    this.noise(0.035, 0.034, "typing", { filter: "bandpass", frequency: 1600 + p * 900, q: 1.2 });
  }

  /** A counter word finished: parry clang, dodge whoosh, brace thud, chain snap. */
  bossCounter(counter: "parry" | "dodge" | "brace" | "break", perfect: boolean): void {
    switch (counter) {
      case "parry":
        if (!this.playSample("duel-shield-hit", 0.92)) this.bossShieldBreak();
        this.tone(110, 0.32, "sawtooth", 0.04, 60, "combat");
        break;
      case "dodge":
        this.noise(0.3, 0.06, "combat", { filter: "bandpass", frequency: 820, q: 0.6 });
        this.tone(180, 0.24, "sine", 0.024, 70, "combat");
        break;
      case "brace":
        if (!this.playSample("duel-shield-hit", 0.72)) this.bossStagger();
        this.tone(78, 0.36, "sine", 0.06, 50, "combat");
        break;
      case "break":
        if (!this.playSample("duel-shield-break", 1.04)) this.bossShieldBreak();
        break;
    }
    if (perfect) this.playSample("duel-precision", 0.94);
  }

  // --- Target materials -------------------------------------------------------
  //
  // What a shot sounds like depends on what it hits (src/enemies/identity.ts):
  // bubble, bell, ember, ice, crystal, wood, void or metal. These layer on top
  // of the ship's own bolt sound (boltImpact). `weight` is the enemy kind's
  // heft: a Juggernaut (1.55) sounds lower and heavier than a Dart (0.85).

  /** A shot lands on an enemy. */
  enemyHit(material: EnemyMaterial, weight = 1, pan = 0): void {
    const now = this.clock();
    if (now - this.lastEnemyHit < 30) return;
    this.lastEnemyHit = now;
    this.materialStrike(material, weight, pan, 1);
  }

  /** A shield layer is knocked off an enemy. */
  layerBreak(material: EnemyMaterial, pan = 0): void {
    const shape: VoiceShape = { pan };
    this.noise(0.12, 0.12, "combat", { ...shape, filter: "highpass", frequency: 2500, q: 0.7 });
    this.tone(900, 0.12, "triangle", 0.05, 300, "combat", shape);
    this.materialStrike(material, 1.2, pan, 1.1);
  }

  /** An enemy is destroyed: its material breaks apart. */
  enemyDeath(material: EnemyMaterial, weight = 1, pan = 0): void {
    const now = this.clock();
    if (now - this.lastEnemyDeath < 45) return;
    this.lastEnemyDeath = now;
    const shape: VoiceShape = { pan, gain: MATERIAL_DEATH_TRIM[material] };
    const pitch = 1.12 - Math.min(1.6, Math.max(0.7, weight)) * 0.12;
    const heavy = weight >= 1.35;
    switch (material) {
      case "bubble":
        [700, 930, 1240].forEach((hz, index) =>
          this.schedule(() => this.tone(hz * pitch, 0.07, "sine", 0.1, hz * 1.5 * pitch, "combat", shape), index * 38),
        );
        this.noise(0.04, 0.06, "combat", { ...shape, filter: "highpass", frequency: 3200 });
        break;
      case "bell": {
        const root = 660 * pitch;
        for (const [ratio, gain, length] of [[1, 0.09, 0.7], [1.5, 0.05, 0.55], [2, 0.04, 0.45], [2.76, 0.025, 0.3]] as const) {
          this.tone(root * ratio, length, "sine", gain, root * ratio * 0.995, "combat", { ...shape, attack: 0.003 });
        }
        break;
      }
      case "ember":
        this.noise(0.36, 0.18, "combat", { ...shape, filter: "bandpass", frequency: 620, q: 0.6 });
        this.tone(110 * pitch, 0.3, "sawtooth", 0.08, 40, "combat", shape);
        for (const delay of [40, 95, 160]) {
          this.schedule(() => this.noise(0.03, 0.07, "combat", { ...shape, filter: "bandpass", frequency: 2400, q: 1.2 }), delay);
        }
        break;
      case "ice":
        this.noise(0.25, 0.16, "combat", { ...shape, filter: "highpass", frequency: 4000, q: 0.7 });
        [2600, 3100, 3700].forEach((hz, index) =>
          this.schedule(() => this.tone(hz * pitch, 0.14, "sine", 0.05, hz * 0.97 * pitch, "combat", shape), index * 30),
        );
        break;
      case "crystal":
        [1320, 1760, 2350, 2640].forEach((hz, index) =>
          this.schedule(() => this.tone(hz * pitch, 0.22, "triangle", 0.05, hz * pitch, "combat", { ...shape, attack: 0.002 }), index * 35),
        );
        this.noise(0.1, 0.05, "combat", { ...shape, filter: "highpass", frequency: 6000 });
        break;
      case "wood":
        this.noise(0.18, 0.14, "combat", { ...shape, filter: "bandpass", frequency: 1400, q: 1 });
        this.tone(180 * pitch, 0.15, "sine", 0.08, 90, "combat", shape);
        this.noise(0.26, 0.04, "combat", { ...shape, filter: "highpass", frequency: 5000 });
        break;
      case "void":
        this.tone(60 * pitch, 0.4, "sine", 0.14, 30, "combat", shape);
        this.noise(0.35, 0.1, "combat", { ...shape, filter: "lowpass", frequency: 520, attack: 0.1 });
        this.tone(200, 0.25, "sine", 0.03, 900, "combat", { ...shape, attack: 0.05 });
        break;
      case "metal":
        this.noise(0.3, 0.16, "combat", { ...shape, filter: "bandpass", frequency: 900, q: 0.7 });
        this.tone(70 * pitch, 0.3, "sine", 0.1, 35, "combat", shape);
        this.schedule(() => this.tone(1510 * pitch, 0.25, "sine", 0.03, 1500 * pitch, "combat", shape), 40);
        this.schedule(() => this.tone(2490 * pitch, 0.18, "sine", 0.025, 2470 * pitch, "combat", shape), 90);
        break;
    }
    if (heavy) this.tone(75 * pitch, 0.26, "sine", 0.1, 38, "combat", shape);
  }

  /** A shot lands on a boss: its material, heavier, at the boss's voice. */
  bossImpact(material: EnemyMaterial, voice = 1, pan = 0): void {
    const now = this.clock();
    if (now - this.lastBossImpact < 45) return;
    this.lastBossImpact = now;
    const shape: VoiceShape = { pan };
    this.materialStrike(material, 1.6, pan, 0.75 * voice);
    this.tone(72 * voice, 0.2, "sine", 0.12, 40, "combat", shape);
    this.noise(0.1, 0.09, "combat", { ...shape, filter: "lowpass", frequency: 900 });
  }

  /** A boss roars (entrance, phase change): its voice plus its material. */
  bossRoar(voice = 1, material: EnemyMaterial = "void"): void {
    this.notifyWarning(700);
    const warm: VoiceShape = { attack: 0.12 };
    this.tone(70 * voice, 0.9, "sawtooth", 0.07, 48 * voice, "warnings", warm);
    this.tone(104 * voice, 0.8, "sawtooth", 0.05, 70 * voice, "warnings", { attack: 0.1 });
    this.noise(0.8, 0.08, "warnings", { filter: "bandpass", frequency: 700 * voice, q: 3, attack: 0.15 });
    this.schedule(() => this.materialStrike(material, 1.4, 0, 0.8 * voice), 120);
  }

  /** The material's own voice, shared by hits, layer breaks and bosses. */
  private materialStrike(material: EnemyMaterial, weight: number, pan: number, pitchScale: number): void {
    // Per-material trim: each layer sits 3–5 dB under the ship's bolt, loud
    // enough to tell the materials apart (scripts/visual/evals/sfx-levels.js).
    const shape: VoiceShape = { pan, gain: MATERIAL_HIT_TRIM[material] };
    const heft = Math.min(1.6, Math.max(0.7, weight));
    const pitch = (1.15 - heft * 0.15) * pitchScale * (0.97 + Math.random() * 0.06);
    const level = 0.8 + heft * 0.2;
    switch (material) {
      case "bubble":
        this.tone(620 * pitch, 0.07, "sine", 0.12 * level, 980 * pitch, "combat", shape);
        this.noise(0.02, 0.05 * level, "combat", { ...shape, filter: "highpass", frequency: 3000 });
        break;
      case "bell": {
        const notes = [1320, 1480, 1760, 1980, 2220];
        let note = Math.floor(Math.random() * notes.length);
        if (note === this.lastBellNote) note = (note + 2) % notes.length;
        this.lastBellNote = note;
        const hz = notes[note]! * pitch;
        const ring: VoiceShape = { ...shape, attack: 0.002 };
        this.tone(hz, 0.35, "sine", 0.08 * level, hz * 0.998, "combat", ring);
        this.tone(hz * 2.76, 0.18, "sine", 0.035 * level, hz * 2.75, "combat", ring);
        this.tone(hz * 5.4, 0.08, "sine", 0.02 * level, hz * 5.38, "combat", ring);
        break;
      }
      case "ember":
        this.noise(0.12, 0.14 * level, "combat", { ...shape, filter: "bandpass", frequency: 1200 * pitch, q: 0.6 });
        this.tone(140 * pitch, 0.1, "sawtooth", 0.06 * level, 70, "combat", shape);
        this.schedule(() => this.noise(0.025, 0.06 * level, "combat", { ...shape, filter: "bandpass", frequency: 2600, q: 1.4 }), 32);
        break;
      case "ice":
        this.noise(0.05, 0.12 * level, "combat", { ...shape, filter: "highpass", frequency: 5000 });
        this.tone(2600 * pitch, 0.12, "sine", 0.06 * level, 2400 * pitch, "combat", shape);
        this.tone(3900 * pitch, 0.06, "sine", 0.03 * level, 3800 * pitch, "combat", shape);
        break;
      case "crystal": {
        const hz = [1760, 2093, 2349, 2637][Math.floor(Math.random() * 4)]! * pitch;
        this.tone(hz, 0.2, "triangle", 0.08 * level, hz, "combat", { ...shape, attack: 0.002 });
        this.tone(hz * 2, 0.12, "sine", 0.04 * level, hz * 2, "combat", shape);
        this.tone(hz * 3, 0.06, "sine", 0.02 * level, hz * 3, "combat", shape);
        break;
      }
      case "wood":
        this.noise(0.05, 0.14 * level, "combat", { ...shape, filter: "bandpass", frequency: 800 * pitch, q: 2.5 });
        this.tone(220 * pitch, 0.09, "sine", 0.08 * level, 180 * pitch, "combat", shape);
        break;
      case "void":
        this.tone(90 * pitch, 0.18, "sine", 0.12 * level, 55, "combat", shape);
        this.noise(0.14, 0.07 * level, "combat", { ...shape, filter: "lowpass", frequency: 600, attack: 0.03 });
        this.tone(330 * pitch, 0.1, "sine", 0.03 * level, 180, "combat", shape);
        break;
      case "metal":
        this.noise(0.03, 0.08 * level, "combat", { ...shape, filter: "highpass", frequency: 3000 });
        this.tone(520 * pitch, 0.12, "square", 0.05 * level, 500 * pitch, "combat", shape);
        this.tone(1510 * pitch, 0.25, "sine", 0.05 * level, 1500 * pitch, "combat", shape);
        this.tone(2490 * pitch, 0.18, "sine", 0.03 * level, 2470 * pitch, "combat", shape);
        break;
    }
    if (heft >= 1.4) this.tone(80 * pitch, 0.12, "sine", 0.08, 45, "combat", shape);
  }

  private clock(): number {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }

  private notifyWarning(durationMs: number): void {
    this.dispatchMixEvent("space-typing:warning", { durationMs });
  }

  private notifyAnnouncer(active: boolean): void {
    this.dispatchMixEvent("space-typing:announcer", { active });
  }

  private dispatchMixEvent(
    name: string,
    detail: Record<string, number | boolean>,
  ): void {
    if (
      typeof window === "undefined" ||
      typeof window.dispatchEvent !== "function" ||
      typeof CustomEvent === "undefined"
    ) {
      return;
    }
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  private announcerVolume(): number {
    return Math.min(
      1,
      mixedSfxGain(
        this.volume,
        "warnings",
        1,
        this.pronunciationActive,
      ) * 1.08,
    );
  }

  private schedule(callback: () => void, delayMs: number): void {
    if (this.destroyed || typeof window === "undefined") return;

    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      if (!this.destroyed) callback();
    }, delayMs);
    this.timers.add(timer);
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
    endFrequency: number,
    group: AudioGroup,
    shape: VoiceShape = {},
  ): void {
    if (this.destroyed) return;
    const gainLevel = mixedSfxGain(
      this.volume,
      group,
      gainValue * (shape.gain ?? 1),
      this.pronunciationActive,
    );
    if (gainLevel <= 0) return;

    this.unlock();
    const context = this.context;
    if (context === null) return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFrequency),
      now + duration,
    );

    const attack = Math.max(0, Math.min(duration * 0.5, shape.attack ?? 0));
    if (attack > 0) {
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainLevel, now + attack);
    } else {
      gain.gain.setValueAtTime(gainLevel, now);
    }
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain).connect(this.voiceOutput(context, shape));
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  private noise(
    duration: number,
    gainValue: number,
    group: AudioGroup,
    shape: VoiceShape = {},
  ): void {
    if (this.destroyed) return;
    const gainLevel = mixedSfxGain(
      this.volume,
      group,
      gainValue * (shape.gain ?? 1),
      this.pronunciationActive,
    );
    if (gainLevel <= 0) return;

    this.unlock();
    const context = this.context;
    if (context === null) return;

    const minNoiseSeconds = 0.35;
    if (this.noiseBuffer === null) {
      const length = Math.max(
        1,
        Math.floor(context.sampleRate * Math.max(minNoiseSeconds, duration)),
      );
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < channel.length; index += 1) {
        channel[index] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = this.noiseBuffer;

    gain.gain.setValueAtTime(gainLevel, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + duration,
    );

    let head: AudioNode = source;
    if (shape.filter !== undefined && typeof context.createBiquadFilter === "function") {
      const filter = context.createBiquadFilter();
      filter.type = shape.filter;
      filter.frequency.value = shape.frequency ?? 3000;
      filter.Q.value = shape.q ?? 0.8;
      head = source.connect(filter);
    }
    head.connect(gain).connect(this.voiceOutput(context, shape));
    // Random offset into the shared noise, so repeated cracks never match.
    const room = Math.max(0, this.noiseBuffer.duration - duration);
    source.start(context.currentTime, Math.random() * room, duration);
    source.stop(context.currentTime + duration + 0.02);
  }

  /** The shared output, through a stereo panner when the voice is placed. */
  private voiceOutput(context: AudioContext, shape: VoiceShape): AudioNode {
    const output = this.outputNode(context);
    const pan = shape.pan ?? 0;
    if (Math.abs(pan) < 0.01 || typeof context.createStereoPanner !== "function") {
      return output;
    }
    const panner = context.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    panner.connect(output);
    return panner;
  }

  private outputNode(context: AudioContext): AudioNode {
    if (this.limiter !== null) return this.limiter;
    if (typeof context.createDynamicsCompressor !== "function") {
      return context.destination;
    }

    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 8;
    limiter.ratio.value = 10;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.12;
    limiter.connect(context.destination);
    this.limiter = limiter;
    return limiter;
  }
}
