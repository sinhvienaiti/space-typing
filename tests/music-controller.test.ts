import { describe, expect, it } from "vitest";
import {
  MusicController,
  type AudioLike,
} from "../src/audio/MusicController";
import { musicProfileForWorld } from "../src/audio/music-profile";

class FakeAudio implements AudioLike {
  src: string;
  volume = 0;
  loop = false;
  preload = "";
  currentTime = 0;
  paused = true;
  playCount = 0;
  pauseCount = 0;
  rejectPlay = false;
  private listeners = new Map<string, Set<EventListener>>();

  constructor(src: string) {
    this.src = src;
  }

  play(): Promise<void> {
    this.playCount += 1;
    if (this.rejectPlay) {
      return Promise.reject(new Error("missing asset"));
    }
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

describe("M08 MusicController", () => {
  it("keeps one active track when the same state is requested again", () => {
    const created: FakeAudio[] = [];
    const controller = new MusicController((src) => {
      const audio = new FakeAudio(src);
      created.push(audio);
      return audio;
    });
    controller.setWorldProfile(musicProfileForWorld("world-01"));
    const afterAmbient = created.length;

    controller.transitionTo("WORLD_NORMAL", 0);
    const afterFirstMusic = created.length;
    controller.transitionTo("WORLD_NORMAL", 0);

    expect(afterFirstMusic).toBe(afterAmbient + 1);
    expect(created).toHaveLength(afterFirstMusic);
    expect(created.at(-1)?.playCount).toBe(2);
    controller.destroy();
  });

  it("uses separate music and ambient gain and applies/release ducking", () => {
    const created: FakeAudio[] = [];
    const controller = new MusicController((src) => {
      const audio = new FakeAudio(src);
      created.push(audio);
      return audio;
    });

    controller.setMusicVolume(0.8);
    controller.setAmbientVolume(0.4);
    controller.setWorldProfile(musicProfileForWorld("world-01"));
    controller.transitionTo("WORLD_NORMAL", 0);

    const music = created.find((audio) =>
      audio.src.includes("/local-assets/music/world-01.ogg"),
    );
    const ambient = created.find((audio) =>
      audio.src.includes("/local-assets/ambient/world-01.ogg"),
    );
    expect(music?.volume).toBeCloseTo(0.8);
    expect(ambient?.volume).toBeCloseTo(0.4);

    controller.duck("pronunciation");
    expect(music?.volume).toBeCloseTo(0.8 * 0.48);
    expect(ambient?.volume).toBeLessThan(0.4 * 0.48);

    controller.releaseDuck("pronunciation");
    expect(music?.volume).toBeCloseTo(0.8);
    controller.destroy();
  });

  it("exposes read-only debug state for Test Lab audio inspection", () => {
    const created: FakeAudio[] = [];
    const controller = new MusicController((src) => {
      const audio = new FakeAudio(src);
      created.push(audio);
      return audio;
    });

    controller.setMusicVolume(0.7);
    controller.setAmbientVolume(0.3);
    controller.setWorldProfile(musicProfileForWorld("world-01"));
    controller.transitionTo("WORLD_BOSS", 0);
    controller.setBossPhase(2);
    controller.duck("announcer");

    const snapshot = controller.getDebugSnapshot();
    expect(snapshot.state).toBe("WORLD_BOSS");
    expect(snapshot.worldId).toBe("world-01");
    expect(snapshot.bossPhase).toBe(2);
    expect(snapshot.duckReasons).toContain("announcer");
    expect(snapshot.duckMultiplier).toBeLessThan(1);
    expect(snapshot.activeMusic?.assetId).toBeTruthy();
    expect(snapshot.activeMusic?.candidates.length).toBeGreaterThan(0);
    expect(snapshot.activeAmbient.length).toBeGreaterThan(0);

    controller.destroy();
  });

  it("pauses and retries current tracks without recreating them", () => {
    const created: FakeAudio[] = [];
    const controller = new MusicController((src) => {
      const audio = new FakeAudio(src);
      created.push(audio);
      return audio;
    });
    controller.setWorldProfile(musicProfileForWorld("world-01"));
    controller.transitionTo("WORLD_NORMAL", 0);
    const count = created.length;
    const music = created.at(-1)!;
    const beforeResume = music.playCount;

    controller.setPaused(true);
    expect(music.paused).toBe(true);
    controller.setPaused(false);

    expect(created).toHaveLength(count);
    expect(music.playCount).toBe(beforeResume + 1);
    controller.destroy();
  });

  it("falls back from a missing local path to the repository default", async () => {
    const created: FakeAudio[] = [];
    const controller = new MusicController((src) => {
      const audio = new FakeAudio(src);
      if (
        src.includes("/local-assets/music/") &&
        src.includes("world-01.ogg")
      ) {
        audio.rejectPlay = true;
      }
      created.push(audio);
      return audio;
    });

    controller.transitionTo("WORLD_NORMAL", 0);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(
      created.some((audio) =>
        audio.src.includes("/assets/audio/music/mysterious-ambience.mp3"),
      ),
    ).toBe(true);
    controller.destroy();
  });

  it("switches state without leaving the retired track playing", () => {
    const created: FakeAudio[] = [];
    const controller = new MusicController((src) => {
      const audio = new FakeAudio(src);
      created.push(audio);
      return audio;
    });

    controller.transitionTo("WORLD_NORMAL", 0);
    const normal = created.at(-1)!;
    controller.transitionTo("WORLD_BOSS", 0);
    const boss = created.at(-1)!;

    expect(controller.getState()).toBe("WORLD_BOSS");
    expect(normal.pauseCount).toBeGreaterThan(0);
    expect(boss.loop).toBe(true);

    controller.destroy();
    expect(boss.pauseCount).toBeGreaterThan(0);
  });
});
