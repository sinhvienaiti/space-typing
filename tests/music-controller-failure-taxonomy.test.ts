import { describe, expect, it } from "vitest";
import {
  MusicController,
  type AudioLike,
} from "../src/audio/MusicController";

class FailureAudio implements AudioLike {
  volume = 0;
  loop = false;
  preload = "";
  currentTime = 0;
  paused = true;
  playCount = 0;
  pauseCount = 0;
  error: unknown = null;
  deferredReject: ((reason?: unknown) => void) | null = null;
  private listeners = new Map<string, Set<EventListener>>();

  constructor(public src: string) {}

  play(): Promise<void> {
    this.playCount += 1;
    if (this.error !== null) return Promise.reject(this.error);
    if (this.deferredReject !== null) {
      return new Promise<void>((_resolve, reject) => {
        this.deferredReject = reject;
      });
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

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("MusicController playback failure taxonomy", () => {
  it("does not advance an autoplay-denied track to another candidate", async () => {
    const created: FailureAudio[] = [];
    const controller = new MusicController((src) => {
      const audio = new FailureAudio(src);
      if (src.includes("/local-assets/music/world-01.ogg")) {
        audio.error = { name: "NotAllowedError", message: "autoplay not allowed" };
      }
      created.push(audio);
      return audio;
    }, { tracks: [] });

    controller.transitionTo("WORLD_NORMAL", 0);
    await flush();

    expect(created.some((audio) =>
      audio.src.includes("/assets/audio/music/mysterious-ambience.mp3"),
    )).toBe(false);
    expect(controller.getDebugSnapshot().lastPlaybackFailure?.kind).toBe("autoplay-permission");
    controller.destroy();
  });

  it("ignores a stale rejection from a track already retired by a newer transition", async () => {
    const created: FailureAudio[] = [];
    let old: FailureAudio | null = null;
    const controller = new MusicController((src) => {
      const audio = new FailureAudio(src);
      if (src.includes("/local-assets/music/world-01.ogg")) {
        audio.deferredReject = () => undefined;
        old = audio;
      }
      created.push(audio);
      return audio;
    }, { tracks: [] });

    controller.transitionTo("WORLD_NORMAL", 0);
    expect(old).not.toBeNull();
    const rejectOld = old!.deferredReject;
    controller.transitionTo("WORLD_BOSS", 0);
    rejectOld?.(new Error("missing asset"));
    await flush();

    expect(created.some((audio) =>
      audio.src.includes("/assets/audio/music/mysterious-ambience.mp3"),
    )).toBe(false);
    expect(controller.getState()).toBe("WORLD_BOSS");
    controller.destroy();
  });
});
