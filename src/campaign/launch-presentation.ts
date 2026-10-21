import { stateLoops, type MusicState, type WorldMusicProfile } from "../audio/music-profile";
import type { GamePhase } from "../types";

/** The music a launch changes, as MusicController exposes it. */
export type LaunchMusic = {
  getState(): MusicState;
  getWorldProfile(): WorldMusicProfile;
  getBossPhase(): number;
  setWorldProfile(profile: WorldMusicProfile): void;
  setBossPhase(phase: number): void;
  transitionTo(state: MusicState, crossfadeSeconds?: number): void;
  setPaused(paused: boolean): void;
};

/** What a launch shows before its stage starts: the deck's launch animation and the stage music. */
export type LaunchScene = {
  /** The Command Deck; `th-launching` is its launch animation. */
  deck: { classList: Pick<DOMTokenList, "contains" | "remove"> };
  /** Slides the deck's ship and panels back in. */
  playDeckEntrance(): void;
  music: LaunchMusic;
  phase(): GamePhase;
  /** The deck's own music (world song of the selected stage). */
  restoreTitleMusic(): void;
  crossfade(state: MusicState): number;
};

/**
 * Undo for a launch's presentation; read before the music changes. On the
 * title the deck comes back with its own music. Elsewhere (a restart from
 * pause, Next or Replay on a result screen) the world, boss phase and music
 * state come back; a result stinger that already played is not replayed.
 */
export function captureLaunchPresentation(scene: LaunchScene): () => void {
  const state = scene.music.getState();
  const profile = scene.music.getWorldProfile();
  const bossPhase = scene.music.getBossPhase();
  return () => {
    if (scene.deck.classList.contains("th-launching")) {
      // The ship and panels come back instead of leaving a faded deck.
      scene.deck.classList.remove("th-launching");
      scene.playDeckEntrance();
    }
    const phase = scene.phase();
    if (phase === "title") {
      scene.restoreTitleMusic();
      return;
    }
    scene.music.setWorldProfile(profile);
    scene.music.setBossPhase(bossPhase);
    const restored: MusicState = stateLoops(state) ? state : "SILENT";
    scene.music.transitionTo(restored, scene.crossfade(restored));
    scene.music.setPaused(phase === "paused");
  };
}
