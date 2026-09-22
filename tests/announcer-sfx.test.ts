import { afterEach, describe, expect, it, vi } from "vitest";
import { Sfx } from "../src/audio/Sfx";
import { DEFAULT_ANNOUNCER_ASSET } from "../src/audio/announcer";

describe("announcer SFX playback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("plays the mapped announcer asset and interrupts the previous call", async () => {
    const instances: FakeAudio[] = [];

    class FakeAudio {
      preload = "";
      volume = 1;
      currentTime = 0;
      readonly pause = vi.fn();
      readonly play = vi.fn(() => Promise.resolve());

      constructor(readonly src: string) {
        instances.push(this);
      }
    }

    vi.stubGlobal("Audio", FakeAudio);

    const sfx = new Sfx();
    sfx.setVolume(0.5);
    sfx.announcer("double-kill");
    sfx.announcer("triple-kill");

    expect(instances).toHaveLength(2);
    expect(instances[0]!.src).toBe(DEFAULT_ANNOUNCER_ASSET);
    expect(instances[1]!.src).toBe(DEFAULT_ANNOUNCER_ASSET);
    expect(instances[0]!.pause).toHaveBeenCalledOnce();
    expect(instances[1]!.play).toHaveBeenCalledOnce();
    expect(instances[1]!.volume).toBeGreaterThan(0);

    sfx.destroy();
    expect(instances[1]!.pause).toHaveBeenCalledOnce();
  });
});
