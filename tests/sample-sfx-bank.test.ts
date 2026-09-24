import { describe, expect, it, vi } from "vitest";
import {
  SAMPLE_SFX,
  SampleSfxBank,
} from "../src/audio/sample-bank";

function voice() {
  return {
    preload: "",
    currentTime: 0,
    volume: 0,
    playbackRate: 1,
    pause: vi.fn(),
    load: vi.fn(),
    play: vi.fn(() => Promise.resolve()),
  } as unknown as HTMLAudioElement;
}

describe("sampled sci-fi SFX bank", () => {
  it("preloads one bounded voice per curated sample and expands only to the event pool limit", () => {
    const created: Array<{ src: string; voice: HTMLAudioElement }> = [];
    const bank = new SampleSfxBank((src) => {
      const next = voice();
      created.push({ src, voice: next });
      return next;
    });

    bank.preload();
    expect(created).toHaveLength(Object.keys(SAMPLE_SFX).length);

    for (let index = 0; index < 12; index += 1) {
      expect(
        bank.play("projectile-intercept", 0.8, false),
      ).toBe(true);
    }

    const projectileVoices = created.filter(
      (item) =>
        item.src === SAMPLE_SFX["projectile-intercept"].path,
    );
    expect(projectileVoices).toHaveLength(
      SAMPLE_SFX["projectile-intercept"].poolSize,
    );

    bank.destroy();
    expect(
      projectileVoices.every(
        (item) =>
          (item.voice.pause as unknown as ReturnType<typeof vi.fn>).mock
            .calls.length > 0,
      ),
    ).toBe(true);
  });

  it("keeps pronunciation ducking authoritative for sampled effects", () => {
    const normalVoices: HTMLAudioElement[] = [];
    const duckedVoices: HTMLAudioElement[] = [];
    const normal = new SampleSfxBank(() => {
      const next = voice();
      normalVoices.push(next);
      return next;
    });
    const ducked = new SampleSfxBank(() => {
      const next = voice();
      duckedVoices.push(next);
      return next;
    });

    expect(normal.play("shield-break", 1, false)).toBe(true);
    expect(ducked.play("shield-break", 1, true)).toBe(true);

    expect(duckedVoices[0]!.volume).toBeLessThan(
      normalVoices[0]!.volume,
    );
  });

  it("uses only committed local asset paths and fails soft without browser Audio", () => {
    for (const definition of Object.values(SAMPLE_SFX)) {
      expect(definition.path).toMatch(
        /^\/assets\/audio\/sfx\/kenney\/.+\.ogg$/,
      );
    }

    const bank = new SampleSfxBank(() => null);
    expect(bank.play("warning", 1, false)).toBe(false);
    expect(() => bank.destroy()).not.toThrow();
  });
});
