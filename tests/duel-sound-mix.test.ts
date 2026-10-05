import { afterEach, describe, expect, it } from "vitest";
import { DuelSoundEngine } from "../src/audio/duel-sound";
import { sharedAudioFocus } from "../src/audio/focus-manager";
import type { AudioGroup } from "../src/audio/mix";

class FakeParam {
  value = 0;
  setTargetAtTime(value: number): void { this.value = value; }
}

class FakeNode {
  connect<T>(node: T): T { return node; }
  disconnect(): void {}
}

class FakeGain extends FakeNode {
  readonly gain = new FakeParam();
}

class FakeCompressor extends FakeNode {
  threshold = { value: 0 };
  knee = { value: 0 };
  ratio = { value: 0 };
  attack = { value: 0 };
  release = { value: 0 };
}

function fakeContext(gains: FakeGain[]): AudioContext {
  const sampleRate = 10;
  return {
    currentTime: 0,
    sampleRate,
    destination: new FakeNode(),
    createGain() {
      const gain = new FakeGain();
      gains.push(gain);
      return gain;
    },
    createDynamicsCompressor() { return new FakeCompressor(); },
    createBuffer(_channels: number, length: number) {
      return {
        duration: length / sampleRate,
        getChannelData: () => new Float32Array(length),
      };
    },
  } as unknown as AudioContext;
}

describe("Duel sound player/category/focus mix", () => {
  const owner = "duel-sound-mix-test";

  afterEach(() => {
    sharedAudioFocus.clearOwner(owner);
  });

  it("applies category and group-specific pronunciation focus on stable buses", () => {
    const gains: FakeGain[] = [];
    const context = fakeContext(gains);
    let volume = 0.8;
    const categories: Record<AudioGroup, number> = {
      typing: 1,
      combat: 0.25,
      warnings: 0.75,
      ui: 1,
      rewards: 1,
    };
    const engine = new DuelSoundEngine({
      context: () => context,
      volume: () => volume,
      categoryVolume: (group) => categories[group],
    });
    const internals = engine as unknown as {
      ensureGraph(context: AudioContext): GainNode | null;
      output(context: AudioContext, level: number, voice: { group?: AudioGroup }): AudioNode;
    };

    expect(internals.ensureGraph(context)).not.toBeNull();
    internals.output(context, 1, { group: "warnings" });
    const warningBus = gains.at(-1)!;
    expect(warningBus.gain.value).toBeCloseTo(0.8 * 0.75);

    const pronunciation = sharedAudioFocus.acquire("pronunciation", owner);
    expect(warningBus.gain.value).toBeCloseTo(0.8 * 0.75 * 0.68);

    categories.warnings = 0.5;
    volume = 0.6;
    engine.refreshMix();
    expect(warningBus.gain.value).toBeCloseTo(0.6 * 0.5 * 0.68);

    internals.output(context, 1, { group: "combat" });
    const combatBus = gains.at(-1)!;
    expect(combatBus.gain.value).toBeCloseTo(0.6 * 0.25 * 0.38);

    sharedAudioFocus.release(pronunciation);
    expect(warningBus.gain.value).toBeCloseTo(0.6 * 0.5);
    expect(combatBus.gain.value).toBeCloseTo(0.6 * 0.25);
    engine.destroy();
  });
});
