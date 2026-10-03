import type {
  CreditCrystalTier,
  CreditCrystalVariant,
} from "../rewards/combat-credit-drops";
import type { VisualQuality } from "../types";

/**
 * Gem sounds for Credit crystals, scheduled on the audio clock so a fast
 * stream of pickups plays as one running arpeggio instead of being cut.
 *
 * - drop: a soft pop, a glass crack and a shower of tinkles (gems scattering).
 * - tick: one glassy clink per crystal reaching the ship. Its note comes from
 *   the chain ladder, so collecting kill after kill climbs the scale
 *   (Peggle / Vampire Survivors). Ticks queue at least TICK_GAP apart; when
 *   the queue would lag, they overlap softly instead of being dropped.
 * - complete: a "jackpot" accent when an elite or boss burst is fully home.
 * - milestone: a quick sparkle run every 5 bursts in a chain.
 */
export type CreditSoundDeps = {
  context: () => BaseAudioContext | null;
  output: () => AudioNode | null;
  /** Final gain for an event gain: master × group × pronunciation duck. */
  level: (gain: number) => number;
};

export type CreditTickInput = {
  tier: CreditCrystalTier;
  variant: CreditCrystalVariant;
  quality: VisualQuality;
  anchor: boolean;
  hero: boolean;
  step: number;
  order: number;
  chain: number;
  pan: number;
};

/** A minor pentatonic from E5 to A7: in key with the World 01 theme. */
export const CREDIT_LADDER_HZ = [
  659.26, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093,
  2349.32, 2637.02, 3135.96, 3520,
] as const;
const TOP = CREDIT_LADDER_HZ.length - 1;
/** Highest chain step before the ladder cycles in its top octave. */
const STEP_TOP = 8;
/** Minimum spacing of queued ticks (≈ 33 notes a second). */
export const CREDIT_TICK_GAP = 0.03;
/** A tick never waits longer than this; past it, it overlaps instead. */
export const CREDIT_TICK_MAX_LAG = 0.09;
const DROP_MERGE = 0.045;

const TIER_RANK: Readonly<Record<CreditCrystalTier, number>> = {
  common: 0,
  refined: 1,
  high: 2,
  elite: 3,
  "mini-boss": 4,
  boss: 5,
  "major-boss": 6,
};
const DROP_TINKLES: Readonly<Record<CreditCrystalTier, number>> = {
  common: 3,
  refined: 4,
  high: 5,
  elite: 6,
  "mini-boss": 7,
  boss: 8,
  "major-boss": 10,
};

/** Ladder note for a chain step, cycling in the top octave past STEP_TOP. */
export function creditLadderIndex(step: number, offset = 0): number {
  const s = Math.max(0, Math.floor(step));
  const base = s <= STEP_TOP ? s : STEP_TOP - 4 + ((s - STEP_TOP - 1) % 5);
  return Math.min(TOP, base + Math.max(0, Math.floor(offset)));
}

/** Arrival order → scale offset: 0, 2, 4, 1, 3, 5, 2, 4, 6 … */
export function creditOrderOffset(order: number): number {
  const o = Math.max(0, Math.floor(order));
  return (o % 3) * 2 + Math.floor(o / 3);
}

type ContextKit = {
  noise: AudioBuffer;
  reverb: ConvolverNode | null;
  reverbIn: GainNode | null;
};

const kits = new WeakMap<BaseAudioContext, ContextKit>();

export class CreditSoundEngine {
  private nextTick = 0;
  private lastDrop = -Infinity;
  private dropCluster = 0;
  private seed = 0x6d2b79f5;
  /** Voices started (for tests and budgets). */
  voices = 0;

  constructor(private readonly deps: CreditSoundDeps) {}

  drop(
    tier: CreditCrystalTier,
    variant: CreditCrystalVariant,
    quality: VisualQuality,
    pan = 0,
  ): boolean {
    const context = this.deps.context();
    const kit = context === null ? null : this.kit(context);
    if (context === null || kit === null) return false;
    const now = context.currentTime;
    const rank = TIER_RANK[tier];
    const hero = rank >= 4;
    const weight = 1 + rank * 0.1;

    // Kills landing together (Nova, multi-kills) become one bigger shower.
    if (now - this.lastDrop < DROP_MERGE && !hero) {
      if (this.dropCluster < 14) {
        for (let k = 0; k < 2; k += 1) {
          this.dropCluster += 1;
          this.gem(
            context,
            kit,
            now + 0.02 + this.random() * 0.12,
            CREDIT_LADDER_HZ[5 + Math.floor(this.random() * 7)]!,
            0.08,
            0.12,
            this.spread(pan, 0.5),
            0.2,
            0,
          );
        }
      }
      return true;
    }
    this.lastDrop = now;
    this.dropCluster = 0;

    const out = this.bus(context, kit, pan, hero ? 0.4 : 0.22);
    if (out === null) return false;

    // Pop: the crystal cracking free.
    this.sweep(context, out, now, "sine", 260, 72, 0.11, 0.36 * weight);
    // Glass crack and a short bright fizz.
    this.burst(context, kit, out, now, 0.05, 0.2 * weight, "bandpass", 3800, 0.9);
    if (quality !== "low") {
      this.burst(context, kit, out, now + 0.005, 0.16, 0.06, "highpass", 7000, 0.7);
    }

    // Gems scattering: tinkles bunched at the start, thinning out.
    const count = Math.max(2, DROP_TINKLES[tier] - (quality === "low" ? 2 : 0));
    for (let k = 0; k < count; k += 1) {
      const t = now + 0.015 + 0.17 * Math.pow(k / count, 1.5) + this.random() * 0.01;
      const index = 5 + Math.floor(this.random() * 7);
      this.gem(
        context,
        kit,
        t,
        CREDIT_LADDER_HZ[index]!,
        0.11 * (1 - (0.5 * k) / count),
        0.13,
        this.spread(pan, 0.5),
        0.25,
        0,
      );
    }

    if (hero) {
      // Deep landing thump and a rising shimmer: something big just dropped.
      this.sweep(context, out, now, "sine", 120, 40, 0.42, 0.5);
      this.burst(context, kit, out, now, 0.38, 0.16, "lowpass", 480, 0.7);
      this.shimmer(context, kit, out, now + 0.02, 0.55, 0.09);
    }
    if (variant === "golden") {
      this.gem(context, kit, now + 0.04, CREDIT_LADDER_HZ[10]!, 0.12, 0.3, pan, 0.4, 0.6);
      this.gem(context, kit, now + 0.075, CREDIT_LADDER_HZ[12]!, 0.1, 0.34, pan, 0.4, 0.6);
    }
    return true;
  }

  tick(input: CreditTickInput): boolean {
    const context = this.deps.context();
    const kit = context === null ? null : this.kit(context);
    if (context === null || kit === null) return false;
    const now = context.currentTime;

    let when = Math.max(now + 0.004, this.nextTick);
    let crowd = 1;
    if (when - now > CREDIT_TICK_MAX_LAG) {
      when = now + 0.004 + this.random() * 0.012;
      crowd = 0.6;
    } else {
      this.nextTick = when + CREDIT_TICK_GAP;
    }

    const rank = TIER_RANK[input.tier];
    const heat = Math.min(1, Math.max(0, input.chain - 1) / 10);
    const gain = (0.2 + rank * 0.01) * crowd;
    const index = creditLadderIndex(input.step, creditOrderOffset(input.order));
    const pan = this.spread(input.pan, 0.18);
    const wet = 0.2 + heat * 0.14;

    if (input.anchor) {
      // The big crystal closes its burst with a little chord.
      const root = creditLadderIndex(input.step);
      this.gem(context, kit, when, CREDIT_LADDER_HZ[root]!, gain * 1.05, 0.26, pan, wet, heat, true);
      this.gem(context, kit, when + 0.012, CREDIT_LADDER_HZ[Math.min(TOP, root + 2)]!, gain * 0.7, 0.24, pan, wet, heat);
      this.gem(context, kit, when + 0.024, CREDIT_LADDER_HZ[Math.min(TOP, root + 4)]!, gain * 0.6, 0.28, pan, wet, heat);
      return true;
    }
    this.gem(context, kit, when, CREDIT_LADDER_HZ[index]!, gain, 0.2, pan, wet, heat);
    return true;
  }

  complete(
    tier: CreditCrystalTier,
    variant: CreditCrystalVariant,
    quality: VisualQuality,
    step = 0,
    pan = 0,
  ): boolean {
    const rank = TIER_RANK[tier];
    if (rank < 3 && variant !== "golden") return false;
    const context = this.deps.context();
    const kit = context === null ? null : this.kit(context);
    if (context === null || kit === null) return false;
    const now = context.currentTime + 0.01;
    const root = creditLadderIndex(step);

    if (rank < 4) {
      // Elite / golden: a bright "shing" and a rising fifth.
      const out = this.bus(context, kit, pan, 0.3);
      if (out === null) return false;
      this.burst(context, kit, out, now, 0.07, 0.07, "highpass", 8000, 0.7);
      this.gem(context, kit, now, CREDIT_LADDER_HZ[Math.min(TOP, root + 3)]!, 0.14, 0.3, pan, 0.35, 0.5);
      this.gem(context, kit, now + 0.04, CREDIT_LADDER_HZ[Math.min(TOP, root + 5)]!, 0.14, 0.36, pan, 0.35, 0.5);
      return true;
    }

    // Boss tiers: low whoomp, rumble, a full arpeggio and a long shimmer.
    const out = this.bus(context, kit, pan, 0.45);
    if (out === null) return false;
    this.sweep(context, out, now, "sine", 110, 48, 0.46, 0.46);
    this.burst(context, kit, out, now, 0.4, 0.15, "lowpass", 380, 0.7);
    const notes = [5, 7, 9, 10, 12];
    const runs = quality === "low" ? 3 : notes.length;
    for (let k = 0; k < runs; k += 1) {
      this.gem(context, kit, now + k * 0.05, CREDIT_LADDER_HZ[notes[k]!]!, 0.16 * (1 - k * 0.08), 0.42, pan, 0.45, 1, k === 0);
    }
    if (quality !== "low") this.shimmer(context, kit, out, now + 0.03, 0.7, 0.08);
    return true;
  }

  milestone(step: number, quality: VisualQuality, pan = 0): boolean {
    const context = this.deps.context();
    const kit = context === null ? null : this.kit(context);
    if (context === null || kit === null) return false;
    const now = context.currentTime + 0.02;
    const root = creditLadderIndex(step);
    const notes = quality === "low" ? 3 : 4;
    for (let k = 0; k < notes; k += 1) {
      this.gem(
        context,
        kit,
        now + k * 0.028,
        CREDIT_LADDER_HZ[Math.min(TOP, root + 3 + k)]!,
        0.11 + k * 0.008,
        0.22,
        this.spread(pan, 0.3),
        0.4,
        1,
      );
    }
    const out = this.bus(context, kit, pan, 0.3);
    if (out !== null) this.burst(context, kit, out, now, 0.12, 0.04, "highpass", 9000, 0.7);
    return true;
  }

  /**
   * One glassy clink: a bright fundamental, inharmonic glass partials
   * (×2.76, ×5.4) for the "crystal" colour, a soft sub-octave for body and a
   * tiny contact click. `heat` (0–1) adds sparkle as the chain grows.
   */
  private gem(
    context: BaseAudioContext,
    kit: ContextKit,
    when: number,
    frequency: number,
    gain: number,
    decay: number,
    pan: number,
    wet: number,
    heat: number,
    body = false,
  ): void {
    const level = this.deps.level(gain);
    if (level <= 0) return;
    const out = this.bus(context, kit, pan, wet);
    if (out === null) return;
    const nyquist = context.sampleRate * 0.45;
    this.voices += 1;

    this.partial(context, out, when, "sine", frequency, level, decay);
    if (frequency * 2.76 < nyquist) {
      this.partial(context, out, when, "sine", frequency * 2.76, level * (0.3 + heat * 0.12), decay * 0.45);
    }
    if (frequency * 5.4 < nyquist) {
      this.partial(context, out, when, "sine", frequency * 5.4, level * 0.1, decay * 0.18);
    }
    if (heat > 0.4 && frequency * 2.004 < nyquist) {
      this.partial(context, out, when + 0.006, "sine", frequency * 2.004, level * 0.16 * heat, decay * 0.8);
    }
    this.partial(context, out, when, "triangle", frequency * 0.5, level * (body ? 0.42 : 0.22), body ? 0.11 : 0.06);
    this.click(context, kit, out, when, level * 0.5);
  }

  private partial(
    context: BaseAudioContext,
    out: AudioNode,
    when: number,
    type: OscillatorType,
    frequency: number,
    level: number,
    decay: number,
  ): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(level, when + 0.0015);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    oscillator.connect(gain).connect(out);
    oscillator.start(when);
    oscillator.stop(when + decay + 0.02);
  }

  private click(
    context: BaseAudioContext,
    kit: ContextKit,
    out: AudioNode,
    when: number,
    level: number,
  ): void {
    const source = context.createBufferSource();
    source.buffer = kit.noise;
    const filter = context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 5500;
    filter.Q.value = 0.7;
    const gain = context.createGain();
    gain.gain.setValueAtTime(level, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.008);
    source.connect(filter).connect(gain).connect(out);
    source.start(when, this.random() * 0.5, 0.012);
  }

  private sweep(
    context: BaseAudioContext,
    out: AudioNode,
    when: number,
    type: OscillatorType,
    from: number,
    to: number,
    duration: number,
    gain: number,
  ): void {
    const level = this.deps.level(gain);
    if (level <= 0) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, when);
    oscillator.frequency.exponentialRampToValueAtTime(to, when + duration);
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.linearRampToValueAtTime(level, when + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(envelope).connect(out);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.02);
  }

  private burst(
    context: BaseAudioContext,
    kit: ContextKit,
    out: AudioNode,
    when: number,
    duration: number,
    gain: number,
    type: BiquadFilterType,
    frequency: number,
    q: number,
  ): void {
    const level = this.deps.level(gain);
    if (level <= 0) return;
    const source = context.createBufferSource();
    source.buffer = kit.noise;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(level, when);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter).connect(envelope).connect(out);
    source.start(when, this.random() * 0.4, duration + 0.02);
  }

  /** Noise through a band that sweeps up: the "something rare" sparkle. */
  private shimmer(
    context: BaseAudioContext,
    kit: ContextKit,
    out: AudioNode,
    when: number,
    duration: number,
    gain: number,
  ): void {
    const level = this.deps.level(gain);
    if (level <= 0) return;
    const source = context.createBufferSource();
    source.buffer = kit.noise;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(1500, when);
    filter.frequency.exponentialRampToValueAtTime(9000, when + duration);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.linearRampToValueAtTime(level, when + duration * 0.3);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter).connect(envelope).connect(out);
    source.start(when);
    source.stop(when + duration + 0.05);
  }

  /** Per-voice output: stereo place plus a send into the shared sparkle tail. */
  private bus(
    context: BaseAudioContext,
    kit: ContextKit,
    pan: number,
    wet: number,
  ): AudioNode | null {
    const output = this.deps.output();
    if (output === null) return null;
    const bus = context.createGain();
    let head: AudioNode = bus;
    if (Math.abs(pan) > 0.01 && typeof context.createStereoPanner === "function") {
      const panner = context.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      head = bus.connect(panner);
    }
    head.connect(output);
    if (kit.reverbIn !== null && wet > 0) {
      const send = context.createGain();
      send.gain.value = wet;
      head.connect(send).connect(kit.reverbIn);
    }
    return bus;
  }

  private kit(context: BaseAudioContext): ContextKit | null {
    const cached = kits.get(context);
    if (cached !== undefined) return cached;
    const output = this.deps.output();
    if (output === null) return null;
    // Partial or stub contexts (tests, very old browsers) stay silent.
    if (
      typeof context.createBuffer !== "function" ||
      typeof context.createBufferSource !== "function" ||
      typeof context.createBiquadFilter !== "function" ||
      typeof context.createOscillator !== "function" ||
      typeof context.createGain !== "function"
    ) {
      return null;
    }

    const rate = context.sampleRate;
    const noise = context.createBuffer(1, Math.max(1, Math.floor(rate)), rate);
    const channel = noise.getChannelData(0);
    for (let i = 0; i < channel.length; i += 1) channel[i] = Math.random() * 2 - 1;

    let reverb: ConvolverNode | null = null;
    let reverbIn: GainNode | null = null;
    if (typeof context.createConvolver === "function") {
      // A short bright room: stereo noise, fast decay, lows removed.
      const length = Math.max(1, Math.floor(rate * 1.1));
      const impulse = context.createBuffer(2, length, rate);
      for (let c = 0; c < 2; c += 1) {
        const data = impulse.getChannelData(c);
        let previous = 0;
        for (let i = 0; i < length; i += 1) {
          const white = Math.random() * 2 - 1;
          const bright = white - previous * 0.85;
          previous = white;
          data[i] = bright * Math.exp((-5.2 * i) / length) * 0.5;
        }
      }
      reverb = context.createConvolver();
      reverb.buffer = impulse;
      reverbIn = context.createGain();
      reverbIn.gain.value = 0.55;
      reverbIn.connect(reverb).connect(output);
    }
    const kit = { noise, reverb, reverbIn };
    kits.set(context, kit);
    return kit;
  }

  private spread(pan: number, width: number): number {
    return Math.max(-0.8, Math.min(0.8, pan + (this.random() - 0.5) * width));
  }

  private random(): number {
    let value = this.seed | 0;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.seed = value >>> 0;
    return this.seed / 0x1_0000_0000;
  }
}
