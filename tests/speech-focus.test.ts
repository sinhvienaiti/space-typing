import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameSettings } from "../src/types";
import { prepareEnglishVoice, selectEnglishVoice, setSpeechGate, setSpeechNotice, SPEECH_VOICE_KEY, speakEnglish, stopSpeech } from "../src/speech";

type FakeUtterance = {
  lang: string;
  rate: number;
  volume: number;
  voice: SpeechSynthesisVoice | null;
  onend: (() => void) | null;
  onerror: ((event?: { error: string }) => void) | null;
};

const settings = {
  pronunciationEnabled: true,
  pronunciationRate: 0.9,
  pronunciationVolume: 1,
} as GameSettings;

let utterances: TestUtterance[];
let activity: boolean[];
let cancel: ReturnType<typeof vi.fn>;
let speak: ReturnType<typeof vi.fn>;
let voices: SpeechSynthesisVoice[];
let voiceEvents: EventTarget;
let storedVoice: Map<string, string>;

function voice(name: string): SpeechSynthesisVoice {
  return { name, voiceURI: name, lang: "en-US", localService: true, default: false } as SpeechSynthesisVoice;
}

class TestUtterance implements FakeUtterance {
  lang = "";
  rate = 1;
  volume = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: ((event?: { error: string }) => void) | null = null;

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
  voices = [voice("Microsoft David")];
  voiceEvents = new EventTarget();
  storedVoice = new Map();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storedVoice.get(key) ?? null, setItem: (key: string, value: string) => storedVoice.set(key, value), removeItem: (key: string) => storedVoice.delete(key) });
  setSpeechNotice(() => {});

  const synth = {
    cancel,
    speak,
    getVoices: () => voices,
    addEventListener: voiceEvents.addEventListener.bind(voiceEvents),
    removeEventListener: voiceEvents.removeEventListener.bind(voiceEvents),
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
  setSpeechGate(async (play) => play());
});

afterEach(() => {
  stopSpeech();
  setSpeechGate(async (play) => play());
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("pronunciation lifecycle hardening", () => {
  it("waits for a remembered cloud voice instead of replacing it with the initial OS list", async () => {
    storedVoice.set(SPEECH_VOICE_KEY,"Google US English");
    speakEnglish("remembered",settings);await vi.advanceTimersByTimeAsync(350);expect(speak).not.toHaveBeenCalled();
    voices.push(voice("Google US English"));voiceEvents.dispatchEvent(new Event("voiceschanged"));
    await vi.advanceTimersByTimeAsync(10);expect(utterances[0]?.voice?.voiceURI).toBe("Google US English");
  });
  it("warms an unused speech backend silently and warns only when pronunciation is requested", async () => {
    voices=[];const notice=vi.fn();setSpeechNotice(notice);
    void prepareEnglishVoice();await vi.advanceTimersByTimeAsync(2000);expect(notice).not.toHaveBeenCalled();
    speakEnglish("first request",settings);await vi.advanceTimersByTimeAsync(2000);expect(notice).toHaveBeenCalledTimes(1);
  });
  it("waits for a stable initial list, persists the chosen URI and reuses it next page", async () => {
    const warm = prepareEnglishVoice();
    await vi.advanceTimersByTimeAsync(100);
    voices.push(voice("Google US English"));
    voiceEvents.dispatchEvent(new Event("voiceschanged"));
    voiceEvents.dispatchEvent(new Event("voiceschanged"));
    expect((await warm)?.voiceURI).toBe("Google US English");
    expect(storedVoice.get(SPEECH_VOICE_KEY)).toBe("Google US English");
    vi.stubGlobal("speechSynthesis", { cancel, speak, getVoices: () => [voice("Microsoft David"), voice("Google US English")] });
    expect((await prepareEnglishVoice())?.voiceURI).toBe("Google US English");
  });
  it("discovers without holding the microphone gate and reports missing English only once", async () => {
    voices = [];
    const gate = vi.fn(async play => play());
    const notice = vi.fn();
    setSpeechGate(gate);
    setSpeechNotice(notice);
    speakEnglish("missing", settings);
    await vi.advanceTimersByTimeAsync(2000);
    speakEnglish("missing again", settings);
    await vi.advanceTimersByTimeAsync(2000);
    expect(gate).not.toHaveBeenCalled();
    expect(notice).toHaveBeenCalledTimes(1);
  });
  it("unpins failed backends but keeps a voice after ordinary cancellation", async () => {
    speakEnglish("first", settings);
    await vi.advanceTimersByTimeAsync(350);
    utterances[0]!.onerror?.({ error: "canceled" });
    expect(storedVoice.get(SPEECH_VOICE_KEY)).toBe("Microsoft David");
    speakEnglish("second", settings);
    await vi.advanceTimersByTimeAsync(350);
    utterances[1]!.onerror?.({ error: "voice-unavailable" });
    expect(storedVoice.has(SPEECH_VOICE_KEY)).toBe(false);
    voices = [voice("Google US English")];
    speakEnglish("third", settings);
    await vi.advanceTimersByTimeAsync(350);
    expect(utterances[2]!.voice?.voiceURI).toBe("Google US English");
  });
  it("keeps the first explicit English voice when a preferred voice arrives later", async () => {
    speakEnglish("alpha", settings);
    await vi.advanceTimersByTimeAsync(350);
    const first = utterances[0]!;
    first.onend?.();
    voices = [...voices, voice("Google US English")];
    voiceEvents.dispatchEvent(new Event("voiceschanged"));
    speakEnglish("beta", settings);
    await vi.advanceTimersByTimeAsync(350);
    expect(utterances[1]?.voice?.voiceURI).toBe(first.voice?.voiceURI);
    expect(first.voice?.name).toBe("Microsoft David");
  });

  it("waits for an explicit English voice instead of using the browser default first", async () => {
    voices = [];
    speakEnglish("alpha", settings);
    await vi.advanceTimersByTimeAsync(350);
    expect(speak).not.toHaveBeenCalled();
    voices = [voice("Google US English")];
    voiceEvents.dispatchEvent(new Event("voiceschanged"));
    await vi.advanceTimersByTimeAsync(350);
    expect(utterances[0]?.voice?.voiceURI).toBe("Google US English");
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it("never speaks with an unspecified voice when no English backend becomes available", async () => {
    voices = [];
    speakEnglish("alpha", settings);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(speak).not.toHaveBeenCalled();
    expect(activity.at(-1)).not.toBe(true);
  });

  it("cancels pending discovery on stop and keeps only the newest requested word", async () => {
    voices = [];
    speakEnglish("stale", settings);
    stopSpeech();
    speakEnglish("old", settings);
    speakEnglish("latest", settings);
    voices = [voice("Microsoft David")];
    voiceEvents.dispatchEvent(new Event("voiceschanged"));
    await vi.advanceTimersByTimeAsync(350);
    expect(utterances.map(u => u.text)).toEqual(["latest"]);
  });

  it("prefers a clear local English voice at the native volume ceiling", () => {
    const voices = [
      { name: "Cloud English", lang: "en-US", localService: false, default: true, voiceURI: "cloud" },
      { name: "Samantha", lang: "en-US", localService: true, default: false, voiceURI: "local" },
    ] as SpeechSynthesisVoice[];
    expect(selectEnglishVoice(voices)?.name).toBe("Samantha");
  });
  it("activates only for playback and releases on end", async () => {
    speakEnglish("orbit", settings);
    await vi.advanceTimersByTimeAsync(350);

    expect(speak).toHaveBeenCalledTimes(1);
    expect(activity.at(-1)).toBe(true);

    utterances[0]?.onend?.();
    await vi.advanceTimersByTimeAsync(350);

    expect(activity.at(-1)).toBe(false);
  });

  it("releases pronunciation if native speech throws synchronously", async () => {
    speak.mockImplementation(() => {
      throw new Error("speech unavailable");
    });

    speakEnglish("shield", settings);
    await vi.advanceTimersByTimeAsync(350);

    expect(activity).toEqual([true, false]);
  });

  it("watchdogs a missing browser terminal callback", async () => {
    speakEnglish("reactor", settings);
    await vi.advanceTimersByTimeAsync(350);
    expect(activity.at(-1)).toBe(true);

    await vi.advanceTimersByTimeAsync(20_000);

    expect(cancel).toHaveBeenCalled();
    expect(activity.at(-1)).toBe(false);
  });

  it("does not let an older terminal callback release a newer pronunciation", async () => {
    speakEnglish("alpha", settings);
    await vi.advanceTimersByTimeAsync(350);
    const first = utterances[0]!;

    speakEnglish("beta", settings);
    await vi.advanceTimersByTimeAsync(350);
    const second = utterances[1]!;

    first.onerror?.();
    expect(activity.at(-1)).toBe(true);

    second.onend?.();
    expect(activity.at(-1)).toBe(false);
  });

  it("clamps pronunciation volume to the native speech range", async () => {
    speakEnglish("volume", {
      ...settings,
      pronunciationVolume: 1.75,
    });
    await vi.advanceTimersByTimeAsync(350);

    expect(utterances[0]?.volume).toBe(1);
    utterances[0]?.onend?.();
  });
});
