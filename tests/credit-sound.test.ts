import { describe, expect, it } from "vitest";
import {
  CREDIT_LADDER_HZ,
  CREDIT_TICK_GAP,
  CREDIT_TICK_MAX_LAG,
  CreditSoundEngine,
  creditLadderIndex,
  creditOrderOffset,
  type CreditTickInput,
} from "../src/audio/credit-sound";

type Param = {
  value: number;
  setValueAtTime(v: number, t?: number): Param;
  linearRampToValueAtTime(v: number, t?: number): Param;
  exponentialRampToValueAtTime(v: number, t?: number): Param;
};

function fakeContext() {
  const oscillators: Array<{ type: string; frequency: number; start: number }> = [];
  const param = (value = 0, onSet?: (v: number) => void): Param => {
    const p: Param = {
      value,
      setValueAtTime(v) { onSet?.(v); return p; },
      linearRampToValueAtTime() { return p; },
      exponentialRampToValueAtTime() { return p; },
    };
    return p;
  };
  const node = () => ({ connect(target: unknown) { return target; } });
  const context = {
    currentTime: 0,
    sampleRate: 48000,
    destination: {},
    createGain: () => ({ ...node(), gain: param(1) }),
    createConvolver: () => ({ ...node(), buffer: null }),
    createStereoPanner: () => ({ ...node(), pan: param() }),
    createBiquadFilter: () => ({ ...node(), type: "lowpass", frequency: param(), Q: param() }),
    createBuffer: (channels: number, length: number) => {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { duration: length / 48000, getChannelData: (index: number) => data[index]! };
    },
    createBufferSource: () => ({ ...node(), buffer: null, loop: false, start() {}, stop() {} }),
    createOscillator: () => {
      const record = { type: "sine", frequency: 0, start: -1 };
      oscillators.push(record);
      return {
        ...node(),
        set type(value: string) { record.type = value; },
        frequency: param(0, (v) => { if (record.frequency === 0) record.frequency = v; }),
        start(when: number) { record.start = when; },
        stop() {},
      };
    },
  };
  return { context: context as unknown as BaseAudioContext & { currentTime: number }, oscillators };
}

function engine(level = 1) {
  const fake = fakeContext();
  const output = { connect() { return output; } } as unknown as AudioNode;
  const sound = new CreditSoundEngine({
    context: () => fake.context,
    output: () => output,
    level: (gain) => gain * level,
  });
  return { sound, ...fake };
}

const tick = (extra: Partial<CreditTickInput> = {}): CreditTickInput => ({
  tier: "common",
  variant: "standard",
  quality: "high",
  anchor: false,
  hero: false,
  step: 0,
  order: 0,
  chain: 1,
  pan: 0,
  ...extra,
});

/** Start times of the fundamentals (one per gem voice). */
function voiceStarts(oscillators: Array<{ type: string; frequency: number; start: number }>): number[] {
  return fundamentals(oscillators).map((o) => o.start);
}

/** Sine oscillators on a ladder note: the fundamental of each gem voice. */
function fundamentals<T extends { type: string; frequency: number }>(oscillators: T[]): T[] {
  const ladder = new Set<number>(CREDIT_LADDER_HZ);
  return oscillators.filter((o) => o.type === "sine" && ladder.has(o.frequency));
}

describe("Credit gem sound", () => {
  it("climbs the ladder with the chain and keeps cycling in the top octave", () => {
    const steps = Array.from({ length: 16 }, (_, step) => creditLadderIndex(step));
    expect(steps.slice(0, 9)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(steps.slice(9, 14)).toEqual([4, 5, 6, 7, 8]);
    for (let step = 0; step < 40; step += 1) {
      for (let offset = 0; offset < 12; offset += 1) {
        expect(creditLadderIndex(step, offset)).toBeLessThan(CREDIT_LADDER_HZ.length);
      }
    }
    expect(Array.from({ length: 9 }, (_, order) => creditOrderOffset(order))).toEqual([
      0, 2, 4, 1, 3, 5, 2, 4, 6,
    ]);
  });

  it("queues a fast stream of pickups as an even run instead of dropping any", () => {
    const { sound, oscillators } = engine();
    for (let order = 0; order < 3; order += 1) {
      expect(sound.tick(tick({ order }))).toBe(true);
    }
    const starts = voiceStarts(oscillators);
    expect(starts).toHaveLength(3);
    for (let i = 1; i < starts.length; i += 1) {
      expect(starts[i]! - starts[i - 1]!).toBeCloseTo(CREDIT_TICK_GAP, 5);
    }
  });

  it("overlaps softly once the queue would lag, still playing every crystal", () => {
    const { sound, oscillators, context } = engine();
    const count = 20;
    for (let order = 0; order < count; order += 1) sound.tick(tick({ order }));
    const starts = voiceStarts(oscillators);
    expect(starts).toHaveLength(count);
    expect(sound.voices).toBe(count);
    for (const start of starts) {
      expect(start - context.currentTime).toBeLessThanOrEqual(CREDIT_TICK_MAX_LAG + 1e-9);
    }
  });

  it("closes a burst with a chord on its anchor crystal", () => {
    const { sound, oscillators } = engine();
    sound.tick(tick({ anchor: true, step: 2 }));
    const notes = fundamentals(oscillators).map((o) => o.frequency);
    expect(notes).toEqual([CREDIT_LADDER_HZ[2], CREDIT_LADDER_HZ[4], CREDIT_LADDER_HZ[6]]);
  });

  it("merges kills landing together into one bigger shower", () => {
    const { sound, oscillators, context } = engine();
    sound.drop("common", "standard", "high");
    const pops = () => oscillators.filter((o) => o.frequency === 260).length;
    expect(pops()).toBe(1);
    context.currentTime = 0.02;
    sound.drop("common", "standard", "high");
    expect(pops()).toBe(1);
    context.currentTime = 0.2;
    sound.drop("common", "standard", "high");
    expect(pops()).toBe(2);
  });

  it("adds a deep landing thump only for boss tiers", () => {
    const thumps = (tier: "common" | "boss") => {
      const { sound, oscillators } = engine();
      sound.drop(tier, "standard", "ultra");
      return oscillators.filter((o) => o.frequency === 120).length;
    };
    expect(thumps("common")).toBe(0);
    expect(thumps("boss")).toBe(1);
  });

  it("plays a jackpot accent only for elite, golden and boss bursts", () => {
    const { sound } = engine();
    expect(sound.complete("common", "standard", "ultra")).toBe(false);
    expect(sound.complete("high", "standard", "ultra")).toBe(false);
    expect(sound.complete("elite", "standard", "ultra")).toBe(true);
    expect(sound.complete("common", "golden", "ultra")).toBe(true);
    expect(sound.complete("major-boss", "standard", "ultra")).toBe(true);
  });

  it("stays silent without Web Audio, when muted, or with a partial context", () => {
    const none = new CreditSoundEngine({ context: () => null, output: () => null, level: () => 1 });
    expect(none.tick(tick())).toBe(false);

    const muted = engine(0);
    muted.sound.tick(tick());
    expect(muted.oscillators).toHaveLength(0);

    const output = { connect() { return output; } } as unknown as AudioNode;
    const partial = new CreditSoundEngine({
      context: () => ({ currentTime: 0, sampleRate: 48000 }) as unknown as BaseAudioContext,
      output: () => output,
      level: () => 1,
    });
    expect(partial.drop("boss", "standard", "ultra")).toBe(false);
  });
});
