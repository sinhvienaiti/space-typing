import { afterEach, describe, expect, it, vi } from "vitest";
import { Sfx } from "../src/audio/Sfx";

describe("Sfx lifecycle", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not recreate AudioContext from delayed tones after destroy", () => {
    vi.useFakeTimers();

    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    vi.stubGlobal("window", {
      addEventListener,
      removeEventListener,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });

    let contextsCreated = 0;

    class FakeAudioContext {
      state = "running";
      currentTime = 0;
      sampleRate = 48_000;
      destination = {};
      constructor() {
        contextsCreated += 1;
      }
      resume(): Promise<void> {
        return Promise.resolve();
      }
      close(): Promise<void> {
        return Promise.resolve();
      }
      createOscillator() {
        return {
          type: "sine",
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: (node: unknown) => node,
          start: vi.fn(),
          stop: vi.fn(),
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: (node: unknown) => node,
        };
      }
    }

    vi.stubGlobal("AudioContext", FakeAudioContext);

    const sfx = new Sfx();
    sfx.power();
    expect(contextsCreated).toBe(1);

    sfx.destroy();
    vi.advanceTimersByTime(500);

    expect(contextsCreated).toBe(1);
    expect(removeEventListener).toHaveBeenCalledOnce();
  });
});
