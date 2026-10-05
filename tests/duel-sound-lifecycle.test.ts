import { afterEach, describe, expect, it, vi } from "vitest";
import { DuelSoundEngine } from "../src/audio/duel-sound";
import { sharedAudioFocus } from "../src/audio/focus-manager";

describe("DuelSoundEngine lifecycle", () => {
  afterEach(() => {
    sharedAudioFocus.clearOwner("duel-sound-lifecycle-test");
    vi.restoreAllMocks();
  });

  it("unsubscribes from shared audio focus and refuses playback after destroy", () => {
    const engine = new DuelSoundEngine({
      context: () => null,
      volume: () => 1,
      categoryVolume: () => 1,
    });
    const internals = engine as unknown as { applyMixGains: () => void };
    const original = internals.applyMixGains.bind(engine);
    const focusSpy = vi.fn(original);
    internals.applyMixGains = focusSpy;

    const token = sharedAudioFocus.acquire(
      "pronunciation",
      "duel-sound-lifecycle-test",
      1,
    );
    expect(focusSpy).toHaveBeenCalledTimes(1);

    engine.destroy();
    sharedAudioFocus.release(token);
    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(engine.play({ cue: "typing-miss", side: "self", atMs: 0 })).toBe(false);

    expect(() => engine.destroy()).not.toThrow();
  });
});
