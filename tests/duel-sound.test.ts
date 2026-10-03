import { describe, expect, it } from "vitest";
import { DuelSoundEngine } from "../src/audio/duel-sound";
import type { DuelTimedAudioCue } from "../src/duel/audio";

type Param = { value: number; setValueAtTime(v: number): Param; linearRampToValueAtTime(v: number): Param; exponentialRampToValueAtTime(v: number): Param };

function fakeContext() {
  const oscillators: Array<{ type: string; frequencies: number[] }> = [];
  let noiseSources = 0;
  const param = (value = 0, log?: number[]): Param => {
    const p: Param = {
      value,
      setValueAtTime(v) { log?.push(v); return p; },
      linearRampToValueAtTime() { return p; },
      exponentialRampToValueAtTime(v) { log?.push(v); return p; },
    };
    return p;
  };
  const node = () => ({ connect(target: unknown) { return target; } });
  const context = {
    currentTime: 0,
    sampleRate: 4000,
    destination: {},
    createGain: () => ({ ...node(), gain: param(1) }),
    createDynamicsCompressor: () => ({ ...node(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }),
    createConvolver: () => ({ ...node(), buffer: null }),
    createStereoPanner: () => ({ ...node(), pan: param() }),
    createBiquadFilter: () => ({ ...node(), type: "lowpass", frequency: param(), Q: param() }),
    createWaveShaper: () => ({ ...node(), curve: null, oversample: "none" }),
    createBuffer: (channels: number, length: number) => {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { duration: length / 4000, getChannelData: (index: number) => data[index]! };
    },
    createOscillator: () => {
      const record = { type: "sine", frequencies: [] as number[] };
      oscillators.push(record);
      return {
        ...node(),
        set type(value: string) { record.type = value; },
        frequency: param(0, record.frequencies),
        start() {}, stop() {}, onended: null,
      };
    },
    createBufferSource: () => {
      noiseSources += 1;
      return { ...node(), buffer: null, loop: false, playbackRate: param(1), start() {}, stop() {}, onended: null };
    },
    decodeAudioData: () => Promise.reject(new Error("no media in tests")),
  };
  return { context: context as unknown as AudioContext, oscillators, noiseCount: () => noiseSources };
}

function engine() {
  const fake = fakeContext();
  const sound = new DuelSoundEngine({ context: () => fake.context, volume: () => 0.5, pronunciationActive: () => false });
  return { sound, ...fake };
}

const cue = (name: DuelTimedAudioCue["cue"], extra: Partial<DuelTimedAudioCue> = {}): DuelTimedAudioCue => ({ cue: name, delayMs: 0, side: "self", ...extra });

describe("Duel war sound engine", () => {
  it("reports no Web Audio so the caller can fall back", () => {
    const sound = new DuelSoundEngine({ context: () => null, volume: () => 0.5, pronunciationActive: () => false });
    expect(sound.play(cue("laser-launch"))).toBe(false);
  });

  it("voices typing and gunfire as noise transients and low thumps, never as pitched chimes", () => {
    for (const name of ["type-tick", "laser-launch", "energy-impact", "streak-break"] as const) {
      for (const tier of [0, 3, 6]) {
        const { sound, oscillators, noiseCount } = engine();
        sound.play(cue(name, { step: 17, tier }));
        expect(noiseCount()).toBeGreaterThan(0);
        // No oscillator starts above 400 Hz: that is the "tinh tinh" toy ping.
        for (const oscillator of oscillators) expect(Math.max(...oscillator.frequencies)).toBeLessThanOrEqual(400);
      }
    }
  });

  it("builds explosions from layered noise with a sub thump", () => {
    const { sound, oscillators, noiseCount } = engine();
    sound.play(cue("ko-final", { side: "opponent" }));
    expect(noiseCount()).toBeGreaterThanOrEqual(8);
    expect(oscillators.some((oscillator) => oscillator.type === "sine" && Math.min(...oscillator.frequencies) < 80)).toBe(true);
  });

  it("handles every Duel cue", () => {
    const cues: DuelTimedAudioCue["cue"][] = [
      "typing-miss", "laser-launch", "missile-launch", "heavy-launch", "bomb-launch", "energy-impact", "missile-impact",
      "heavy-impact", "bomb-impact", "support", "bank", "warning", "intercept", "precision", "cataclysm", "round-win",
      "round-loss", "round-draw", "type-tick", "streak-tier", "streak-break", "shield-hit", "shield-break", "ko-blast",
      "ko-final", "match-win", "match-loss", "round-ready", "fight", "phase-shift",
    ];
    for (const name of cues) {
      const { sound } = engine();
      expect(sound.play(cue(name, { tier: 4 }))).toBe(true);
    }
  });
});
