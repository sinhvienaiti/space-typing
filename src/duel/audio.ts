import {
  musicProfileForWorld,
  type MusicState,
  type WorldMusicProfile,
} from "../audio/music-profile";
import {
  duelMapProfile,
  type DuelMapId,
} from "./maps";
import type { DuelMatchPhase } from "./model";

export const DUEL_AUDIO_WORLD_SOURCE: Readonly<
  Record<DuelMapId, string>
> = Object.freeze({
  "frost-wastes": "world-03",
  "inferno-rift": "world-02",
  "tempest-prime": "world-08",
  "ocean-abyss": "world-07",
  "terra-core": "world-04",
  "celestial-void": "world-09",
});

export function duelMusicProfileForMap(
  mapId: DuelMapId,
): WorldMusicProfile {
  const source = musicProfileForWorld(
    DUEL_AUDIO_WORLD_SOURCE[mapId],
  );
  return {
    ...source,
    id: duelMapProfile(mapId).audioProfileId,
    ambientLayers: [...source.ambientLayers],
    preloadHints: [...source.preloadHints],
    duckingProfile: {
      ...source.duckingProfile,
    },
  };
}

export function duelMusicStateForPhase(
  phase: DuelMatchPhase,
): MusicState {
  switch (phase) {
    case "build":
    case "skirmish":
      return "WORLD_NORMAL";
    case "war":
    case "crisis":
    case "cataclysm":
      return "WORLD_INTENSE";
  }
}

export function duelAudioPresentationKey(
  mapId: DuelMapId,
  phase: DuelMatchPhase,
): string {
  return (
    duelMapProfile(mapId).audioProfileId +
    ":" +
    duelMusicStateForPhase(phase)
  );
}
