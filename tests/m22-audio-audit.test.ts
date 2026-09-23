import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MusicController,
  type AudioLike,
} from "../src/audio/MusicController";
import {
  MUSIC_STATES,
  assetCandidates,
  musicAssetForState,
  musicProfileForWorld,
  stateLoops,
  validateWorldMusicProfiles,
} from "../src/audio/music-profile";
import { WORLD_REGISTRY } from "../src/worlds/registry";

class FakeAudio implements AudioLike {
  src: string;
  volume = 0;
  loop = false;
  preload = "";
  currentTime = 0;
  paused = true;
  playCount = 0;
  pauseCount = 0;
  private listeners = new Map<string, Set<EventListener>>();

  constructor(src: string) {
    this.src = src;
  }

  play(): Promise<void> {
    this.playCount += 1;
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.pauseCount += 1;
    this.paused = true;
  }

  load(): void {}

  addEventListener(type: string, listener: EventListener): void {
    const set = this.listeners.get(type) ?? new Set<EventListener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }
}

describe("M22 full World audio mapping and lifecycle audit", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("maps every music state for all 50 Worlds to explicit local/default candidates", () => {
    expect(validateWorldMusicProfiles()).toEqual([]);

    for (const world of WORLD_REGISTRY) {
      const profile = musicProfileForWorld(world);
      expect(profile.worldId).toBe(world.id);
      expect(profile.ambientLayers.length).toBeGreaterThan(0);
      expect(profile.ambientLayers.length).toBeLessThanOrEqual(2);

      for (const state of MUSIC_STATES) {
        const asset = musicAssetForState(profile, state);
        if (state === "SILENT") {
          expect(asset, world.id).toBeNull();
          continue;
        }

        expect(asset, world.id + "/" + state).not.toBeNull();
        const candidates = assetCandidates(asset);
        expect(candidates.length, world.id + "/" + state).toBe(2);
        expect(candidates[0], world.id + "/" + state).toContain(
          "/local-assets/",
        );
        expect(candidates[1], world.id + "/" + state).toContain(
          "/assets/audio/",
        );
      }
    }
  });

  it("transitions every World through every music state without leaking active tracks", () => {
    for (const world of WORLD_REGISTRY) {
      const created: FakeAudio[] = [];
      const controller = new MusicController((src) => {
        const audio = new FakeAudio(src);
        created.push(audio);
        return audio;
      });
      controller.setWorldProfile(musicProfileForWorld(world));

      for (const state of MUSIC_STATES) {
        controller.transitionTo(state, 0);
        const snapshot = controller.getDebugSnapshot();

        expect(snapshot.state).toBe(state);
        expect(snapshot.worldId).toBe(world.id);
        expect(snapshot.retiringMusic).toHaveLength(0);
        expect(snapshot.retiringAmbient).toHaveLength(0);
        expect(snapshot.activeAmbient.length).toBeLessThanOrEqual(2);

        if (state === "SILENT") {
          expect(snapshot.activeMusic).toBeNull();
        } else {
          expect(snapshot.activeMusic).not.toBeNull();
          expect(snapshot.activeMusic?.loop).toBe(stateLoops(state));
          expect(snapshot.activeMusic?.candidates.length).toBe(2);
        }
      }

      controller.destroy();
      expect(created.every((audio) => audio.paused)).toBe(true);
    }
  });

  it("uses the strongest simultaneous duck reason and restores the mix deterministically", () => {
    const created: FakeAudio[] = [];
    const controller = new MusicController((src) => {
      const audio = new FakeAudio(src);
      created.push(audio);
      return audio;
    });

    const profile = musicProfileForWorld("world-25");
    controller.setWorldProfile(profile);
    controller.setMusicVolume(0.8);
    controller.setAmbientVolume(0.4);
    controller.transitionTo("WORLD_BOSS", 0);

    controller.duck("pronunciation");
    controller.duck("warning");
    controller.duck("announcer");

    const ducked = controller.getDebugSnapshot();
    expect(ducked.duckReasons).toEqual([
      "announcer",
      "pronunciation",
      "warning",
    ]);
    expect(ducked.duckMultiplier).toBe(
      Math.min(
        profile.duckingProfile.pronunciation,
        profile.duckingProfile.announcer,
        profile.duckingProfile.warning,
      ),
    );
    expect(ducked.activeMusic?.volume).toBeLessThan(0.8);
    expect(
      ducked.activeAmbient.every((track) => track.volume < 0.4),
    ).toBe(true);

    controller.releaseDuck("announcer");
    controller.releaseDuck("warning");
    controller.releaseDuck("pronunciation");

    const restored = controller.getDebugSnapshot();
    expect(restored.duckReasons).toEqual([]);
    expect(restored.duckMultiplier).toBe(1);
    expect(restored.activeMusic?.volume).toBeCloseTo(0.8);

    controller.destroy();
  });

  it("completes real crossfades and retires outgoing music/ambient tracks", () => {
    vi.useFakeTimers();
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    vi.stubGlobal("window", {
      addEventListener,
      removeEventListener,
      setInterval: globalThis.setInterval,
      clearInterval: globalThis.clearInterval,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });

    const created: FakeAudio[] = [];
    const controller = new MusicController((src) => {
      const audio = new FakeAudio(src);
      created.push(audio);
      return audio;
    });

    controller.setWorldProfile(musicProfileForWorld("world-01"));
    controller.transitionTo("WORLD_NORMAL", 0);
    controller.transitionTo("WORLD_INTENSE", 0.2);

    expect(
      controller.getDebugSnapshot().retiringMusic.length,
    ).toBeGreaterThan(0);

    vi.advanceTimersByTime(250);

    const afterMusicFade = controller.getDebugSnapshot();
    expect(afterMusicFade.retiringMusic).toHaveLength(0);
    expect(afterMusicFade.activeMusic?.mix).toBe(1);

    controller.setWorldProfile(musicProfileForWorld("world-02"));
    expect(
      controller.getDebugSnapshot().retiringAmbient.length,
    ).toBeGreaterThan(0);

    vi.advanceTimersByTime(2_000);

    const afterAmbientFade = controller.getDebugSnapshot();
    expect(afterAmbientFade.retiringAmbient).toHaveLength(0);
    expect(
      afterAmbientFade.activeAmbient.every(
        (track) => track.mix === 1,
      ),
    ).toBe(true);

    controller.destroy();
    expect(created.every((audio) => audio.paused)).toBe(true);
    expect(removeEventListener).toHaveBeenCalledTimes(3);
  });
});
