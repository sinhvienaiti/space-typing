import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameSettings } from "../src/types";
import { setSpeechGate, speakEnglish, stopSpeech } from "../src/speech";

type FakeUtterance = {
  lang: string;
  rate: number;
  volume: number;
  voice: SpeechSynthesisVoice | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

const settings = {
  pronunciationEnabled: true,
  pronunciationRate: 0.9,
  pronunciationVolume: 1,
} as GameSettings;

let utterances: FakeUtterance[];
let activity: boolean[];
let cancel: ReturnType<typeof vi.fn>;
let speak: ReturnType<typeof vi.fn>;

class TestUtterance implements FakeUtterance {
  lang = "";
  rate = 1;
  volume = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public readonly text: string) {
    utterances.push(this);
  }
}

class TestCustomEvent<T> {
  constructor(
    public readonly type: string,
    public readonly init: { detail: T },
  ) {}

  get detail(): T {
    return this.init.detail;
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  utterances = [];
  activity = [];
  cancel = vi.fn();
  speak = vi.fn();

  const synth = {
    cancel,
    speak,
    getVoices: () => [],
  };
  const windowStub = {
    speechSynthesis: synth,
    dispatchEvent: (event: TestCustomEvent<{ active?: boolean }>) => {
      if (event.type === "space-typing:pronunciation") {
        activity.push(event.detail.active === true);
      }
      return true;
    },
  };

  vi.stubGlobal("window", windowStub);
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", TestUtterance);
  vi.stubGlobal("CustomEvent", TestCustomEvent);
  setSpeechGate(async play => play());
});

afterEach(() => {
  stopSpeech();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("pronunciation focus lifecycle", () => {
  it("activates only for playback and releases on end", async () => {
    speakEnglish("orbit", settings);
    await Promise.resolve();

    expect(speak).toHaveBeenCalledTimes(1);
    expect(activity.at(-1)).toBe(true);

    utterances[0]?.onend?.();
    await Promise.resolve();

    expect(activity.at(-1)).toBe(false);
  });

  it("releases focus if native speech throws synchronously", async () => {
    speak.mockImplementation(() => {
      throw new Error("speech unavailable");
    });

    speakEnglish("shield", settings);
    await Promise.resolve();

    expect(activity).toEqual([true, false]);
  });

  it("watchdogs a missing browser terminal callback", async () => {
    speakEnglish("reactor", settings);
    await Promise.resolve();
    expect(activity.at(-1)).toBe(true);

    await vi.advanceTimersByTimeAsync(20_000);

    expect(cancel).toHaveBeenCalled();
    expect(activity.at(-1)).toBe(false);
  });

  it("does not let an older terminal callback release a newer pronunciation", async () => {
    speakEnglish("alpha", settings);
    await Promise.resolve();
    const first = utterances[0]!;

    speakEnglish("beta", settings);
    await Promise.resolve();
    const second = utterances[1]!;

    first.onerror?.();
    expect(activity.at(-1)).toBe(true);

    second.onend?.();
    expect(activity.at(-1)).toBe(false);
  });
});
