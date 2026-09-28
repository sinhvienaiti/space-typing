import {
  announcerAsset,
  type AnnouncerEvent,
} from "./announcer";
import {
  mixedSfxGain,
  type AudioGroup,
} from "./mix";
import { SampleSfxBank } from "./sample-bank";

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
};

/**
 * Player hit sounds. `crystal`: Vanguard's plasma lance (glassy ring).
 * `energy`: ships still on the legacy laser (zap and crack, no ring).
 */
export type ImpactVariant = "crystal" | "energy";

/**
 * Pitches of the crystal ring: A minor pentatonic (G6 A6 C7 D7 E7), so a
 * stream of hits chimes in key with the World 01 theme instead of clashing.
 */
const IMPACT_RING_HZ = [1567.98, 1760, 2093, 2349.32, 2637.02] as const;

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
    // Level set by measurement (offline render at default volume): a hit
    // peaks about 5 dB under the sampled intercept zap (~-19 dBFS), a word
    // finisher about level with it.
    const weight = Math.max(0.8, Math.min(1.5, power)) * (variant === "crystal" ? 1.9 : 2.3);
    const heavy = power >= 1.3;
    const shape: VoiceShape = { pan: Math.max(-1, Math.min(1, pan)) };
    const drift = 0.97 + Math.random() * 0.06;

    // Crack: the moment of contact, bright but band-limited (never a hiss).
    this.noise(0.045, 0.28 * weight, "combat", {
      ...shape,
      filter: "bandpass",
      frequency: (variant === "crystal" ? 4200 : 2600) * drift,
      q: 0.8,
    });
    // Body and thud: the weight, audible on laptop speakers and headphones.
    this.tone(330 * drift, 0.1, "triangle", 0.16 * weight, 140, "combat", shape);
    this.tone(110, 0.14, "sine", 0.13 * weight, 55, "combat", shape);

    if (variant === "crystal") {
      // Struck glass: inharmonic partials on a pentatonic note, never the
      // same note twice in a row; finishers ring on the root, A6.
      let ring = heavy ? 1 : Math.floor(Math.random() * IMPACT_RING_HZ.length);
      if (!heavy && ring === this.lastRing) ring = (ring + 2) % IMPACT_RING_HZ.length;
      this.lastRing = ring;
      const f = IMPACT_RING_HZ[ring]! * (0.997 + Math.random() * 0.006);
      const ringShape: VoiceShape = { ...shape, attack: 0.002 };
      this.tone(f, heavy ? 0.4 : 0.28, "sine", 0.1 * weight, f * 0.985, "combat", ringShape);
      this.tone(f * 2.76, 0.16, "sine", 0.04 * weight, f * 2.73, "combat", ringShape);
      this.tone(f * 5.4, 0.08, "sine", 0.02 * weight, f * 5.3, "combat", ringShape);
    } else {
      // Energy: a quick falling zap instead of the ring.
      this.tone(900 * drift, 0.09, "sawtooth", 0.05 * weight, 240 * drift, "combat", shape);
    }
    if (heavy) {
      // Finisher shimmer: a short rising sparkle over the ring.
      this.tone(2600, 0.14, "sine", 0.06, 4400, "combat", { ...shape, attack: 0.01 });
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

  kill(pitch = 1): void {
    const safePitch = Math.max(0.5, Math.min(1.6, pitch));
    this.noise(0.1, 0.055, "combat");
    this.tone(240 * safePitch, 0.12, "sawtooth", 0.045, 90 * safePitch, "combat");
  }

  announcer(event: AnnouncerEvent): void {
    if (this.destroyed || typeof Audio === "undefined") return;

    if (this.announcerAudio !== null) {
      this.announcerAudio.pause();
      this.announcerAudio.currentTime = 0;
      this.notifyAnnouncer(false);
    }

    const audio = new Audio(announcerAsset(event));
    audio.preload = "auto";
    audio.volume = this.announcerVolume();
    this.announcerAudio = audio;

    const finish = (): void => {
      if (this.announcerAudio !== audio) return;
      this.announcerAudio = null;
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

  stageClear(): void {
    this.tone(420, 0.18, "triangle", 0.035, 760, "ui");
    this.schedule(
      () => this.tone(650, 0.2, "triangle", 0.03, 1040, "ui"),
      90,
    );
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
      gainValue,
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
      gainValue,
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
