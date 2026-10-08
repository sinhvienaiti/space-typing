import { describe, expect, it } from "vitest";
import { MusicController, type AudioLike } from "../src/audio/MusicController";
import { musicProfileForWorld } from "../src/audio/music-profile";
import type { WorldMusicCatalog, WorldMusicPolicy } from "../src/audio/world-music-model";

class FakeAudio implements AudioLike {
  src: string;
  volume = 0;
  loop = false;
  preload = "";
  currentTime = 0;
  paused = true;
  playCount = 0;
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
    this.paused = true;
  }

  addEventListener(type: string, listener: EventListener): void {
    const set = this.listeners.get(type) ?? new Set<EventListener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(new Event(type));
  }
}

const catalog: WorldMusicCatalog = {
  schemaVersion: 1,
  manifestRevision: "single-runtime-test",
  worldIds: ["world-01"],
  tracks: [
    {
      id: "single-normal",
      title: "Single Normal",
      playback: {
        kind: "single",
        sources: [
          { src: "/music/single.webm", codec: "opus" },
          { src: "/music/single.ogg", codec: "vorbis" },
        ],
      },
      durationSeconds: 90,
      mixOutSeconds: 82,
      loop: true,
      metadata: { mood: "climactic", bpm: 120, key: "D minor" },
    },
    {
      id: "single-boss",
      title: "Single Boss",
      playback: {
        kind: "single",
        sources: [{ src: "/music/boss.ogg" }],
      },
      durationSeconds: 75,
      mixOutSeconds: 68,
      loop: true,
      metadata: { mood: "fiery" },
    },
  ],
};

const policy: WorldMusicPolicy = {
  configRevision: "single-runtime-policy",
  worlds: {
    "world-01": {
      normal: { kind: "replace", trackIds: ["single-normal"], selectionMode: "ordered" },
      boss: {
        world: { kind: "replace", trackIds: ["single-boss"], selectionMode: "ordered" },
      },
    },
  },
};

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("B1 catalog playback", () => {
  it("plays catalog-only single files as one voice across calm/intense", () => {
    const created: FakeAudio[] = [];
    const controller = new MusicController(
      (src) => {
        const audio = new FakeAudio(src);
        created.push(audio);
        return audio;
      },
      { catalog, generatedPolicy: policy },
    );
    controller.setWorldProfile(musicProfileForWorld("world-01"));
    controller.transitionTo("WORLD_NORMAL", 0);

    expect(controller.getNowPlaying()).toMatchObject({ id: "single-normal", stem: "calm" });
    const singleVoices = () => created.filter((audio) => audio.src.startsWith("/music/single."));
    expect(singleVoices()).toHaveLength(1);
    expect(singleVoices()[0]?.src).toBe("/music/single.webm");
    expect(controller.getDebugSnapshot().activeMusic?.candidates).toEqual([
      "/music/single.webm",
      "/music/single.ogg",
    ]);
    expect(controller.getDebugSnapshot().song?.playlist).toEqual(["single-normal"]);

    singleVoices()[0]!.currentTime = 41.25;
    controller.transitionTo("WORLD_INTENSE", 0);

    expect(singleVoices()).toHaveLength(1);
    expect(singleVoices()[0]!.currentTime).toBeCloseTo(41.25);
    expect(controller.getNowPlaying()).toMatchObject({ id: "single-normal", stem: "intense" });
    controller.destroy();
  });

  it("falls through codec sources without creating a second shuffle identity", async () => {
    const created: FakeAudio[] = [];
    const controller = new MusicController(
      (src) => {
        const audio = new FakeAudio(src);
        created.push(audio);
        return audio;
      },
      { catalog, generatedPolicy: policy },
    );
    controller.transitionTo("WORLD_NORMAL", 0);
    created[0]!.emit("error");
    await flush();

    expect(created).toHaveLength(2);
    expect(created[1]?.src).toBe("/music/single.ogg");
    expect(controller.getNowPlaying()?.id).toBe("single-normal");
    expect(controller.getDebugSnapshot().song?.playlist).toEqual(["single-normal"]);
    expect(controller.getDebugSnapshot().activeMusic?.candidateIndex).toBe(1);
    controller.destroy();
  });

  it("plays a dedicated catalog-only boss and restarts its one-track playlist on end", () => {
    const created: FakeAudio[] = [];
    const controller = new MusicController(
      (src) => {
        const audio = new FakeAudio(src);
        created.push(audio);
        return audio;
      },
      { catalog, generatedPolicy: policy },
    );
    controller.transitionTo("WORLD_NORMAL", 0);
    controller.transitionTo("WORLD_BOSS", 0);

    expect(controller.getNowPlaying()?.id).toBe("single-boss");
    expect(created.at(-1)?.src).toBe("/music/boss.ogg");
    const count = created.length;
    created.at(-1)!.emit("ended");

    expect(created.length).toBe(count + 1);
    expect(controller.getNowPlaying()?.id).toBe("single-boss");
    controller.destroy();
  });
});
