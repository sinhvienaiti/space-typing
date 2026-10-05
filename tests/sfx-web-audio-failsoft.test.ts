import { afterEach, describe, expect, it, vi } from "vitest";

const samplePlay = vi.hoisted(() => vi.fn(() => true));
const samplePreload = vi.hoisted(() => vi.fn());

vi.mock("../src/audio/sample-bank", () => ({
  SampleSfxBank: class {
    setMix(): void {}
    preload(): void { samplePreload(); }
    destroy(): void {}
    play(...args: unknown[]): boolean { return samplePlay(...args); }
  },
}));

import { Sfx } from "../src/audio/Sfx";

describe("sample playback without Web Audio", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    samplePlay.mockClear();
    samplePreload.mockClear();
  });

  it("keeps HTMLAudio sample cues fail-soft when AudioContext is unavailable", () => {
    vi.stubGlobal("AudioContext", undefined);
    const sfx = new Sfx();

    expect(() => sfx.projectileIntercept()).not.toThrow();
    expect(samplePreload).toHaveBeenCalled();
    expect(samplePlay).toHaveBeenCalled();

    sfx.destroy();
  });
});
