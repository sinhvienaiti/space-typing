import {
  announcerAsset,
  type AnnouncerEvent,
} from "./announcer";
import {
  mixedSfxGain,
  type AudioGroup,
} from "./mix";

export class Sfx {
  private context: AudioContext | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private announcerAudio: HTMLAudioElement | null = null;
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
    this.tone(310, 0.09, "triangle", 0.032, 190, "combat");
  }

  /** Bright, short player laser when a hostile letter projectile is typed. */
  projectileIntercept(): void {
    // Audible paired zap and shatter. Both remain in the COMBAT bus so spoken
    // English still takes priority when pronunciation is active.
    this.tone(1160, 0.11, "sawtooth", 0.09, 310, "combat");
    this.tone(630, 0.125, "triangle", 0.05, 170, "combat");
    this.noise(0.045, 0.027, "combat");
  }

  projectileWarning(): void {
    this.notifyWarning(180);
    this.tone(680, 0.055, "triangle", 0.018, 520, "warnings");
  }

  shieldBreak(): void {
    this.notifyWarning(260);
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
    this.tone(470, 0.1, "triangle", 0.025, 740, "ui");
  }

  uiConfirm(): void {
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
    this.tone(180, 0.2, "sawtooth", 0.03, 82, "ui");
  }

  bossEntrance(pitch = 1): void {
    this.notifyWarning(900);
    const safePitch = Math.max(0.5, Math.min(1.6, pitch));
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
    this.tone(760, 0.12, "triangle", 0.036, 240, "warnings");
    this.noise(0.08, 0.028, "combat");
  }

  bossStagger(): void {
    this.tone(250, 0.14, "sine", 0.03, 120, "combat");
  }

  private notifyWarning(durationMs: number): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("space-typing:warning", {
        detail: { durationMs },
      }),
    );
  }

  private notifyAnnouncer(active: boolean): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("space-typing:announcer", {
        detail: { active },
      }),
    );
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

    gain.gain.setValueAtTime(gainLevel, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain).connect(this.outputNode(context));
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  private noise(
    duration: number,
    gainValue: number,
    group: AudioGroup,
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

    source.connect(gain).connect(this.outputNode(context));
    source.start(context.currentTime, 0, duration);
    source.stop(context.currentTime + duration + 0.02);
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
