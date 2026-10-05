import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sampleCalls = vi.hoisted(() => [] as Array<{
  id: string;
  masterVolume: number;
  pronunciationActive: boolean;
  playbackRate: number;
}>);

vi.mock("../src/audio/sample-bank", () => ({
  SampleSfxBank: class {
    setMix(): void {}
    preload(): void {}
    destroy(): void {}
    play(
      id: string,
      masterVolume: number,
      pronunciationActive: boolean,
      playbackRate = 1,
    ): boolean {
      sampleCalls.push({ id, masterVolume, pronunciationActive, playbackRate });
      return true;
    }
  },
}));

import { Sfx } from "../src/audio/Sfx";

function quietRuntime(sfx: Sfx): void {
  vi.spyOn(sfx, "unlock").mockImplementation(() => undefined);
}

describe("A4 production sampled SFX mix path", () => {
  beforeEach(() => {
    sampleCalls.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes representative sampled cues through Master × SFX", () => {
    const sfx = new Sfx();
    quietRuntime(sfx);
    sfx.setVolume(0.8);
    sfx.setMasterVolume(0.25);

    sfx.enemyShot();
    sfx.projectileIntercept();
    sfx.shieldBreak();
    sfx.supplyArrival();
    sfx.uiConfirm();
    sfx.stageFail();
    sfx.criticalHull();
    sfx.bossEntrance();
    sfx.bossDeath();
    sfx.bossShieldBreak();

    expect(sampleCalls.length).toBeGreaterThanOrEqual(12);
    for (const call of sampleCalls) {
      expect(call.masterVolume).toBeCloseTo(0.2);
    }

    sfx.destroy();
  });

  it("Master zero mutes every sampled cue at the sample bank boundary", () => {
    const sfx = new Sfx();
    quietRuntime(sfx);
    sfx.setVolume(1);
    sfx.setMasterVolume(0);

    sfx.enemyShot();
    sfx.stageClear();
    sfx.bossEntrance();

    expect(sampleCalls.length).toBeGreaterThanOrEqual(4);
    expect(sampleCalls.every((call) => call.masterVolume === 0)).toBe(true);

    sfx.destroy();
  });
});
