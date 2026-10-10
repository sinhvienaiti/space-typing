import { afterEach, describe, expect, it, vi } from "vitest";
import { DuelSoundEngine } from "../src/audio/duel-sound";
import type { DuelTimedAudioCue } from "../src/duel/audio";

type Param = { value: number; setValueAtTime(v: number): Param; linearRampToValueAtTime(v: number): Param; exponentialRampToValueAtTime(v: number): Param };

function fakeContext() {
  const oscillators: Array<{ type: string; frequencies: number[] }> = [];
  const sources: Array<{ buffer: unknown; rate: number }> = [];
  const filters: Array<{ type: string; q: number }> = [];
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
    createBiquadFilter: () => {
      const record = { type: "lowpass", q: 0 };
      filters.push(record);
      return {
        ...node(),
        set type(value: string) { record.type = value; },
        frequency: param(),
        Q: { set value(v: number) { record.q = v; }, get value() { return record.q; } },
      };
    },
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
      const record = { buffer: null as unknown, rate: 1 };
      sources.push(record);
      return {
        ...node(),
        set buffer(value: unknown) { record.buffer = value; },
        get buffer() { return record.buffer; },
        loop: false,
        playbackRate: { set value(v: number) { record.rate = v; }, get value() { return record.rate; } },
        start() {}, stop() {}, onended: null,
      };
    },
    decodeAudioData: (data: ArrayBuffer & { url?: string }) => Promise.resolve({ duration: 0.5, url: data.url }),
  };
  return { context: context as unknown as AudioContext, oscillators, sources, filters };
}

/** fetch stub: every weapon file exists; the announcer manifest lists two lines. */
function stubFetch() {
  const calls: string[] = [];
  vi.stubGlobal("fetch", (url: string) => {
    calls.push(url);
    if (url.endsWith("manifest.json")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ lines: ["double-kill", "first-blood"] }) });
    }
    const data = Object.assign(new ArrayBuffer(8), { url });
    return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(data) });
  });
  return calls;
}

async function engine() {
  const calls = stubFetch();
  const fake = fakeContext();
  const sound = new DuelSoundEngine({
    context: () => fake.context,
    volume: () => 0.5,
    categoryVolume: () => 1,
  });
  sound.preload();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { sound, calls, ...fake };
}

const cue = (name: DuelTimedAudioCue["cue"], extra: Partial<DuelTimedAudioCue> = {}): DuelTimedAudioCue => ({ cue: name, delayMs: 0, side: "self", ...extra });

afterEach(() => { vi.unstubAllGlobals(); });

describe("Duel firepower sound engine", () => {
  it("reports no Web Audio so the caller can fall back", () => {
    const sound = new DuelSoundEngine({
      context: () => null,
      volume: () => 0.5,
      categoryVolume: () => 1,
    });
    expect(sound.play(cue("laser-launch"))).toBe(false);
  });

  it("fires and lands the cannon with recorded weapon samples", async () => {
    const { sound, sources } = await engine();
    expect(sound.loadedSamples).toBeGreaterThanOrEqual(16);
    sound.play(cue("laser-launch"));
    sound.play(cue("energy-impact", { side: "opponent" }));
    const urls = sources.map((source) => (source.buffer as { url?: string } | null)?.url ?? "");
    expect(urls.some((url) => /\/duel\/war\/gun-[ab]\.ogg$/.test(url))).toBe(true);
    expect(urls.some((url) => /\/duel\/war\/hit-[ab]\.ogg$/.test(url))).toBe(true);
  });

  it("never plays sped-up gravel or resonant metal rings on gunfire and hits", async () => {
    for (const name of ["laser-launch", "energy-impact", "type-tick", "shield-hit", "missile-impact", "heavy-impact",
      "missile-launch", "bomb-impact", "beam-launch", "beam-impact", "rail-charge", "rail-impact", "lance-charge", "lance-impact", "lance-break"] as const) {
      const { sound, sources, filters, oscillators } = await engine();
      sound.play(cue(name, { tier: 4 }));
      // "Stones": no sample pitched up past +10 %.
      for (const source of sources) expect(source.rate).toBeLessThanOrEqual(1.1);
      // "Pan": no narrow resonant filters.
      for (const filter of filters) expect(filter.q).toBeLessThanOrEqual(2);
      // "Tinh tinh": no oscillator above 400 Hz.
      for (const oscillator of oscillators) expect(Math.max(...oscillator.frequencies)).toBeLessThanOrEqual(400);
    }
  });

  it("speaks only announcer lines the local manifest lists", async () => {
    const { sound, calls } = await engine();
    sound.play(cue("announce", { voice: "double-kill", priority: 3 }));
    sound.play(cue("announce", { voice: "holy-shit", priority: 2 }));
    expect(calls.some((url) => url.endsWith("/local-assets/announcer/double-kill.ogg"))).toBe(true);
    expect(calls.some((url) => url.endsWith("holy-shit.ogg"))).toBe(false);
  });

  it("handles every Duel cue", async () => {
    const cues: DuelTimedAudioCue["cue"][] = [
      "typing-miss", "laser-launch", "missile-launch", "heavy-launch", "bomb-launch", "energy-impact", "missile-impact",
      "heavy-impact", "bomb-impact", "support", "bank", "warning", "intercept", "precision", "cataclysm", "round-win",
      "round-loss", "round-draw", "type-tick", "streak-tier", "streak-break", "shield-hit", "shield-break", "ko-blast",
      "ko-final", "match-win", "match-loss", "round-ready", "fight", "phase-shift", "announce",
    ];
    const { sound } = await engine();
    for (const name of cues) expect(sound.play(cue(name, { tier: 4, voice: "first-blood" }))).toBe(true);
  });
});
