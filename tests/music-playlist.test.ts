import { describe, expect, it } from "vitest";
import {
  MusicController,
  fadeCurves,
  handoverCutoffs,
  type AudioLike,
  type NowPlaying,
} from "../src/audio/MusicController";
import {
  GALAXY_PLAYLISTS,
  MOOD_LABELS,
  MUSIC_TRACKS,
  ShuffleBag,
  musicTrack,
  worldPlaylist,
} from "../src/audio/music-library";
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

  emit(type: string): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(new Event(type));
  }

  addEventListener(type: string, listener: EventListener): void {
    const set = this.listeners.get(type) ?? new Set<EventListener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }
}

type Internals = {
  activeMusic: { audio: FakeAudio; songId: string | null; stem: string | null } | null;
  checkSongProgress: () => void;
};

function setup(world = "world-01") {
  const created: FakeAudio[] = [];
  const controller = new MusicController((src) => {
    const audio = new FakeAudio(src);
    created.push(audio);
    return audio;
  });
  controller.setWorldProfile(musicProfileForWorld(world));
  const internals = controller as unknown as Internals;
  const playing = (): string | null => controller.getNowPlaying()?.id ?? null;
  const active = (): FakeAudio => internals.activeMusic!.audio;
  return { controller, created, internals, playing, active };
}

describe("song library", () => {
  it("covers every mood the owner asked for, each song with two ready stems", () => {
    expect(MUSIC_TRACKS.length).toBeGreaterThanOrEqual(13);
    const moods = new Set(MUSIC_TRACKS.map((track) => track.mood));
    for (const mood of ["sad", "happy", "relaxing", "romantic", "contemplative", "climactic", "lonely", "gloomy", "fiery", "blazing", "gentle"]) {
      expect(moods.has(mood as never)).toBe(true);
    }
    for (const track of MUSIC_TRACKS) {
      expect(MOOD_LABELS[track.mood]).toBeTruthy();
      expect(track.mixOut).toBeLessThan(track.seconds);
      expect(track.seconds - track.mixOut).toBeGreaterThan(6);
      for (const url of Object.values(track.stems)) {
        // Files and hashes are checked at build time (scripts/check-audio-assets.mjs).
        expect(url).toMatch(/^\/assets\/audio\/music\/songs\/[a-z0-9-]+\/(calm|intense)\.ogg\?v=[0-9a-f]{16}$/);
      }
    }
  });

  it("gives every Galaxy three songs and plays every song somewhere", () => {
    const used = new Set<string>();
    for (let galaxy = 1; galaxy <= 10; galaxy += 1) {
      const list = GALAXY_PLAYLISTS[galaxy]!;
      expect(list).toHaveLength(3);
      for (const id of list) {
        expect(musicTrack(id)).toBeDefined();
        used.add(id);
      }
    }
    expect([...used].sort()).toEqual(MUSIC_TRACKS.map((track) => track.id).sort());
  });

  it("rotates a Galaxy's playlist so neighbouring Worlds open with different songs", () => {
    expect(worldPlaylist("world-01")).toEqual(["signal-in-the-void", "starlit-lullaby", "sunseed-parade"]);
    expect(worldPlaylist("world-02")[0]).toBe("starlit-lullaby");
    expect(worldPlaylist("world-06")[0]).toBe("ember-rush");
    expect(worldPlaylist("world-07")[0]).toBe("molten-crown");
    expect(worldPlaylist("world-50")).toHaveLength(3);
    expect(worldPlaylist("nowhere")).toEqual(worldPlaylist("world-01"));
  });

  it("shuffles without playing a song twice in a row, and plays all before repeating", () => {
    const ids = ["a", "b", "c", "d", "e"];
    let seed = 7;
    const bag = new ShuffleBag(ids, () => {
      seed = (seed * 48271) % 2147483647;
      return seed / 2147483647;
    });
    let last: string | null = null;
    const drawn: string[] = [];
    for (let draw = 0; draw < 200; draw += 1) {
      const id: string = bag.next(last)!;
      expect(id).not.toBe(last);
      drawn.push(id);
      last = id;
    }
    expect(new Set(drawn.slice(0, 5)).size).toBe(5);
  });
});

describe("handover curves", () => {
  it("keeps loudness steady: equal power for songs, a blend for stems", () => {
    for (let step = 0; step <= 10; step += 1) {
      const p = step / 10;
      const [up, down] = fadeCurves("song", p);
      expect(up * up + down * down).toBeCloseTo(1, 6);
      const [stemUp, stemDown] = fadeCurves("stem", p);
      // Within 2 dB whether the two stems add like related or unrelated sound.
      expect(20 * Math.log10(stemUp + stemDown)).toBeLessThan(2);
      expect(10 * Math.log10(stemUp * stemUp + stemDown * stemDown)).toBeGreaterThan(-2);
    }
  });

  it("darkens the outgoing song and opens the incoming one", () => {
    const [inStart, outStart] = handoverCutoffs(0);
    const [inMid, outMid] = handoverCutoffs(0.5);
    const [inEnd, outEnd] = handoverCutoffs(1);
    expect(outStart).toBeGreaterThan(outMid);
    expect(outMid).toBeGreaterThan(outEnd);
    expect(outEnd).toBeLessThan(600);
    expect(inStart).toBeLessThan(inMid!);
    expect(inEnd).toBeNull();
  });
});

describe("world music playlists", () => {
  it("opens the World's first song and reports it", () => {
    const { controller, playing } = setup("world-01");
    const heard: Array<NowPlaying | null> = [];
    controller.onNowPlaying((value) => heard.push(value));
    controller.transitionTo("WORLD_NORMAL", 0);
    expect(playing()).toBe("signal-in-the-void");
    expect(heard.at(-1)).toMatchObject({ title: "Signal in the Void", moodLabel: "Suspense", stem: "calm", mode: "map" });
    controller.destroy();
  });

  it("preloads the next song, then hands over to it at the mix-out point", () => {
    const { controller, created, internals, playing, active } = setup("world-01");
    controller.transitionTo("WORLD_NORMAL", 0);
    const first = active();
    const song = musicTrack("signal-in-the-void")!;

    first.currentTime = song.mixOut - 10;
    internals.checkSongProgress();
    const preloaded = created.filter((audio) => audio.src.includes("/starlit-lullaby/calm.ogg"));
    expect(preloaded).toHaveLength(1);
    expect(preloaded[0]!.playCount).toBe(0);

    first.currentTime = song.mixOut;
    internals.checkSongProgress();
    expect(playing()).toBe("starlit-lullaby");
    // The preloaded element is the one that plays: no second download.
    expect(active()).toBe(preloaded[0]);
    expect(active().playCount).toBe(1);
    expect(first.paused).toBe(true);
    controller.destroy();
  });

  it("keeps the calm and intense stems of a song in step, and cycles the World's playlist", () => {
    const { controller, playing, active } = setup("world-01");
    controller.transitionTo("WORLD_NORMAL", 0);
    active().currentTime = 64;
    controller.transitionTo("WORLD_INTENSE", 0.55);
    expect(playing()).toBe("signal-in-the-void");
    expect(controller.getNowPlaying()?.stem).toBe("intense");
    expect(active().src).toContain("/signal-in-the-void/intense.ogg");
    expect(active().currentTime).toBeCloseTo(64);

    expect(controller.skipTrack()).toBe(true);
    expect(playing()).toBe("starlit-lullaby");
    expect(active().src).toContain("/intense.ogg");
    controller.skipTrack();
    expect(playing()).toBe("sunseed-parade");
    controller.skipTrack();
    expect(playing()).toBe("signal-in-the-void");
    controller.destroy();
  });

  it("brings the new map's music when the World changes", () => {
    const { controller, playing } = setup("world-01");
    controller.transitionTo("WORLD_NORMAL", 0);
    controller.setWorldProfile(musicProfileForWorld("world-06"));
    expect(playing()).toBe("ember-rush");
    controller.destroy();
  });

  it("keeps same-World normal music through boss fallback and follows a new World's identity", () => {
    const { controller, playing } = setup("world-01");
    controller.transitionTo("WORLD_NORMAL", 0);
    expect(playing()).toBe("signal-in-the-void");

    controller.transitionTo("WORLD_BOSS", 0);
    expect(playing()).toBe("signal-in-the-void");
    expect(controller.getDebugSnapshot().playlistResolvedFrom).toContain("normal");

    controller.transitionTo("WORLD_NORMAL", 0);
    expect(playing()).toBe("signal-in-the-void");

    controller.transitionTo("WORLD_BOSS", 0);
    controller.setWorldProfile(musicProfileForWorld("world-06"));
    expect(playing()).toBe("ember-rush");
    controller.transitionTo("WORLD_NORMAL", 0);
    expect(playing()).toBe("ember-rush");
    controller.destroy();
  });

  it("random mode keeps the current song, then never repeats a song back to back", () => {
    const { controller, playing } = setup("world-01");
    controller.transitionTo("WORLD_NORMAL", 0);
    controller.setPlaybackMode("random");
    expect(playing()).toBe("signal-in-the-void");
    expect(controller.getNowPlaying()?.mode).toBe("random");

    const heard = new Set<string>();
    let last = playing();
    for (let skip = 0; skip < 60; skip += 1) {
      controller.skipTrack();
      const now = playing()!;
      expect(now).not.toBe(last);
      heard.add(now);
      last = now;
    }
    expect(heard.size).toBe(MUSIC_TRACKS.length);
    // A World change does not interrupt the shuffle.
    const before = playing();
    controller.setWorldProfile(musicProfileForWorld("world-21"));
    expect(playing()).toBe(before);
    controller.destroy();
  });

  it("switching back to map mode returns to the map's music", () => {
    const { controller, playing } = setup("world-21");
    controller.transitionTo("WORLD_NORMAL", 0);
    expect(playing()).toBe("hollow-roots");
    controller.setPlaybackMode("random");
    let guard = 0;
    while (worldPlaylist("world-21").includes(playing()!) && guard < 40) {
      controller.skipTrack();
      guard += 1;
    }
    controller.setPlaybackMode("map");
    expect(playing()).toBe("hollow-roots");
    controller.destroy();
  });

  it("moves on when a song ends even if the progress check missed it", () => {
    const { controller, playing, active } = setup("world-01");
    controller.transitionTo("WORLD_NORMAL", 0);
    active().emit("ended");
    expect(playing()).toBe("starlit-lullaby");
    controller.destroy();
  });

  it("does not skip during boss music", () => {
    const { controller } = setup("world-01");
    controller.transitionTo("WORLD_BOSS", 0);
    expect(controller.skipTrack()).toBe(false);
    controller.destroy();
  });
});
