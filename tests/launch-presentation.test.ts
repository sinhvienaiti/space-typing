import { describe, expect, it } from "vitest";
import {
  captureLaunchPresentation,
  type LaunchMusic,
  type LaunchScene,
} from "../src/campaign/launch-presentation";
import {
  musicProfileForWorld,
  type MusicState,
  type WorldMusicProfile,
} from "../src/audio/music-profile";
import type { GamePhase } from "../src/types";

/** A deck, a music controller and a game phase that record what the undo does. */
function scene(start: {
  phase: GamePhase;
  state: MusicState;
  bossPhase?: number;
  worldId?: string;
}) {
  const classes = new Set<string>();
  const calls: string[] = [];
  let phase = start.phase;
  const music: LaunchMusic & {
    state: MusicState;
    profile: WorldMusicProfile;
    bossPhase: number;
    paused: boolean;
  } = {
    state: start.state,
    profile: musicProfileForWorld(start.worldId ?? "world-03"),
    bossPhase: start.bossPhase ?? 1,
    paused: start.phase === "paused",
    getState() {
      return this.state;
    },
    getWorldProfile() {
      return this.profile;
    },
    getBossPhase() {
      return this.bossPhase;
    },
    setWorldProfile(profile) {
      this.profile = profile;
    },
    setBossPhase(value) {
      this.bossPhase = value;
    },
    transitionTo(state, crossfadeSeconds) {
      this.state = state;
      calls.push(`music ${state} ${crossfadeSeconds}`);
    },
    setPaused(paused) {
      this.paused = paused;
    },
  };
  const value: LaunchScene = {
    deck: {
      classList: {
        contains: (name: string) => classes.has(name),
        remove: (...names: string[]) => names.forEach((name) => classes.delete(name)),
      },
    },
    playDeckEntrance: () => calls.push("deck entrance"),
    music,
    phase: () => phase,
    restoreTitleMusic: () => calls.push("title music"),
    crossfade: (state) => (state === "WORLD_BOSS" ? 0.8 : 1.8),
  };
  /** What a launch shows: the deck's launch animation and the stage's music. */
  const launch = (state: MusicState, worldId = "world-07"): void => {
    if (phase === "title") classes.add("th-launching");
    music.profile = musicProfileForWorld(worldId);
    music.bossPhase = 1;
    music.state = state;
    music.paused = false;
  };
  return {
    value,
    music,
    calls,
    classes,
    launch,
    setPhase: (next: GamePhase) => {
      phase = next;
    },
  };
}

describe("launch presentation undo", () => {
  it("on the title, the deck slides back in with its own music", () => {
    const deck = scene({ phase: "title", state: "WORLD_NORMAL" });
    const undo = captureLaunchPresentation(deck.value);
    deck.launch("WORLD_BOSS");
    undo();
    expect(deck.classes.has("th-launching")).toBe(false);
    expect(deck.calls).toEqual(["deck entrance", "title music"]);
    expect(deck.music.paused).toBe(false);
  });

  it("a launch refused before its animation leaves the deck as it is", () => {
    const deck = scene({ phase: "title", state: "WORLD_NORMAL" });
    const undo = captureLaunchPresentation(deck.value);
    undo();
    expect(deck.calls).toEqual(["title music"]);
  });

  it("a restart from pause gets the paused stage's world, boss phase and music back", () => {
    const deck = scene({ phase: "paused", state: "WORLD_BOSS", bossPhase: 3, worldId: "world-03" });
    const undo = captureLaunchPresentation(deck.value);
    deck.launch("WORLD_NORMAL", "world-07");
    undo();
    expect(deck.music.profile.worldId).toBe("world-03");
    expect(deck.music.bossPhase).toBe(3);
    expect(deck.music.state).toBe("WORLD_BOSS");
    expect(deck.music.paused).toBe(true);
    expect(deck.calls).toEqual(["music WORLD_BOSS 0.8"]);
  });

  it("Next on a result screen does not replay the victory stinger", () => {
    const deck = scene({ phase: "stageclear", state: "VICTORY" });
    const undo = captureLaunchPresentation(deck.value);
    deck.launch("WORLD_NORMAL");
    undo();
    expect(deck.calls).toEqual(["music SILENT 1.8"]);
    expect(deck.music.paused).toBe(false);
  });

  it("reads the phase when it undoes, not when it was captured", () => {
    const deck = scene({ phase: "paused", state: "WORLD_NORMAL" });
    const undo = captureLaunchPresentation(deck.value);
    deck.setPhase("title");
    undo();
    expect(deck.calls).toEqual(["title music"]);
  });
});
