import { afterEach, describe, expect, it, vi } from "vitest";
import { Sfx } from "../src/audio/Sfx";
import { DEFAULT_ANNOUNCER_ASSET } from "../src/audio/announcer";

describe("announcer SFX playback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("queues an equal-priority milestone and plays it after the current call ends", async () => {
    const instances: FakeAudio[] = [];

    class FakeAudio {
      preload = "";
      volume = 1;
      currentTime = 0;
      readonly pause = vi.fn();
      readonly play = vi.fn(() => Promise.resolve());
      private readonly listeners = new Map<string, Set<EventListener>>();

      constructor(readonly src: string) {
        instances.push(this);
      }

      addEventListener(type: string, listener: EventListener): void {
        const set = this.listeners.get(type) ?? new Set<EventListener>();
        set.add(listener);
        this.listeners.set(type, set);
      }

      emit(type: string): void {
        for (const listener of [...(this.listeners.get(type) ?? [])]) {
          listener(new Event(type));
        }
      }
    }

    vi.stubGlobal("Audio", FakeAudio);

    const sfx = new Sfx();
    sfx.setVolume(0.5);
    sfx.announcer("double-kill");
    sfx.announcer("triple-kill");

    expect(instances).toHaveLength(1);
    expect(instances[0]!.src).toBe(DEFAULT_ANNOUNCER_ASSET);
    expect(instances[0]!.pause).not.toHaveBeenCalled();

    instances[0]!.emit("ended");
    await Promise.resolve();

    expect(instances).toHaveLength(2);
    expect(instances[1]!.src).toBe(DEFAULT_ANNOUNCER_ASSET);
    expect(instances[1]!.play).toHaveBeenCalledOnce();
    expect(instances[1]!.volume).toBeGreaterThan(0);

    sfx.destroy();
    expect(instances[1]!.pause).toHaveBeenCalledOnce();
  });
});
