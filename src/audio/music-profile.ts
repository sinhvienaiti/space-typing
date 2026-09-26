import type { StageRole } from "../campaign/types";
import type { WorldProfile } from "../worlds/types";
import { WORLD_REGISTRY } from "../worlds/registry";

export const MUSIC_STATES = [
  "SILENT",
  "WORLD_NORMAL",
  "WORLD_INTENSE",
  "MINI_BOSS",
  "WORLD_BOSS",
  "GALAXY_BOSS",
  "CHAMPION_HUNT",
  "HIDDEN_CHALLENGE",
  "HIDDEN_WORLD",
  "SHOP",
  "STATION",
  "VICTORY",
  "DEFEAT",
  "TRANSITION",
] as const;

export type MusicState = (typeof MUSIC_STATES)[number];

export type AudioAssetRef = {
  id: string;
  localPath?: string;
  defaultPath?: string;
};

export type DuckingProfile = {
  pronunciation: number;
  announcer: number;
  warning: number;
};

export type WorldMusicProfile = {
  id: string;
  worldId: string;
  baseTrack: AudioAssetRef;
  ambientLayers: readonly AudioAssetRef[];
  intenseTrackOrLayer: AudioAssetRef;
  miniBossTrack: AudioAssetRef;
  worldBossTrack: AudioAssetRef;
  galaxyBossTrack: AudioAssetRef;
  championHuntTrack: AudioAssetRef;
  hiddenChallengeTrack: AudioAssetRef;
  hiddenWorldTrack: AudioAssetRef;
  shopTrack: AudioAssetRef;
  stationTrack: AudioAssetRef;
  victoryStinger: AudioAssetRef;
  defeatStinger: AudioAssetRef;
  transitionStinger: AudioAssetRef;
  crossfadeSeconds: number;
  duckingProfile: DuckingProfile;
  preloadHints: readonly AudioAssetRef[];
};

export type MusicResolveContext = {
  active: boolean;
  intense?: boolean;
  miniBoss?: boolean;
  worldBoss?: boolean;
  galaxyBoss?: boolean;
  championHunt?: boolean;
  hiddenChallenge?: boolean;
  hiddenWorld?: boolean;
  shop?: boolean;
  station?: boolean;
  victory?: boolean;
  defeat?: boolean;
  transition?: boolean;
};

const SHARED = {
  calm: fallbackAsset(
    "modern-space-calm",
    "sector.ogg",
    "mysterious-ambience.mp3",
    "music",
  ),
  intense: fallbackAsset(
    "modern-space-intense",
    "pulse.ogg",
    "battle-theme-b.mp3",
    "music",
  ),
  miniBoss: fallbackAsset(
    "mini-boss",
    "pulse.ogg",
    "battle-theme-b.mp3",
    "music",
  ),
  worldBoss: asset("world-boss", "urgent.ogg", "music"),
  galaxyBoss: asset("galaxy-boss", "urgent.ogg", "music"),
  championHunt: asset("champion-hunt", "urgent.ogg", "music"),
  hiddenChallenge: fallbackAsset(
    "hidden-challenge",
    "pulse.ogg",
    "battle-theme-b.mp3",
    "music",
  ),
  hiddenWorld: fallbackAsset(
    "hidden-world",
    "sector.ogg",
    "mysterious-ambience.mp3",
    "music",
  ),
  shop: fallbackAsset(
    "shop",
    "sector.ogg",
    "mysterious-ambience.mp3",
    "music",
  ),
  station: fallbackAsset(
    "station",
    "sector.ogg",
    "mysterious-ambience.mp3",
    "music",
  ),
  victory: asset("victory", "victory.ogg", "stingers"),
  defeat: asset("defeat", "urgent.ogg", "music"),
  transition: fallbackAsset(
    "transition",
    "pulse.ogg",
    "battle-theme-b.mp3",
    "music",
  ),
} as const;

function asset(
  id: string,
  file: string,
  folder: "music" | "ambient" | "stingers",
): AudioAssetRef {
  return {
    id,
    localPath:
      folder === "stingers"
        ? "/local-assets/music/" + file
        : "/local-assets/" + folder + "/" + file,
    defaultPath: "/assets/audio/" + folder + "/" + file,
  };
}

function fallbackAsset(
  id: string,
  localFile: string,
  defaultFile: string,
  folder: "music" | "ambient",
): AudioAssetRef {
  return {
    id,
    localPath: "/local-assets/" + folder + "/" + localFile,
    defaultPath: "/assets/audio/" + folder + "/" + defaultFile,
  };
}

function worldProfile(world: WorldProfile): WorldMusicProfile {
  const worldFile = world.id + ".ogg";
  const baseTrack = {
    ...SHARED.calm,
    id: world.id + "-base",
    localPath: "/local-assets/music/" + worldFile,
  };
  const ambient = fallbackAsset(
    world.id + "-ambient",
    worldFile,
    "engine-loop.ogg",
    "ambient",
  );
  return {
    id: world.musicProfile,
    worldId: world.id,
    baseTrack,
    // Keep one neutral engine bed only. The former computer-loop layer
    // produced the repetitive high-pitched "beep" heard throughout normal
    // gameplay and stacked on top of the newer music mix.
    ambientLayers: [ambient],
    intenseTrackOrLayer: {
      ...SHARED.intense,
      id: world.id + "-intense",
    },
    miniBossTrack: SHARED.miniBoss,
    worldBossTrack: SHARED.worldBoss,
    galaxyBossTrack: SHARED.galaxyBoss,
    championHuntTrack: SHARED.championHunt,
    hiddenChallengeTrack: SHARED.hiddenChallenge,
    hiddenWorldTrack: SHARED.hiddenWorld,
    shopTrack: SHARED.shop,
    stationTrack: SHARED.station,
    victoryStinger: SHARED.victory,
    defeatStinger: SHARED.defeat,
    transitionStinger: SHARED.transition,
    crossfadeSeconds: 1.8,
    duckingProfile: {
      pronunciation: 0.48,
      announcer: 0.3,
      warning: 0.56,
    },
    preloadHints: [
      baseTrack,
      SHARED.intense,
      SHARED.miniBoss,
      SHARED.worldBoss,
    ],
  };
}

export const WORLD_MUSIC_PROFILES: Readonly<
  Record<string, WorldMusicProfile>
> = Object.fromEntries(
  WORLD_REGISTRY.map((world) => [
    world.id,
    worldProfile(world),
  ]),
);

export function musicProfileForWorld(
  worldOrId: WorldProfile | string,
): WorldMusicProfile {
  const id =
    typeof worldOrId === "string"
      ? worldOrId
      : worldOrId.id;
  return (
    WORLD_MUSIC_PROFILES[id] ??
    WORLD_MUSIC_PROFILES["world-01"]!
  );
}

export function resolveMusicState(
  context: MusicResolveContext,
): MusicState {
  if (!context.active) return "SILENT";
  if (context.defeat) return "DEFEAT";
  if (context.victory) return "VICTORY";
  if (context.transition) return "TRANSITION";
  if (context.galaxyBoss) return "GALAXY_BOSS";
  if (context.worldBoss) return "WORLD_BOSS";
  if (context.miniBoss) return "MINI_BOSS";
  if (context.championHunt) return "CHAMPION_HUNT";
  if (context.hiddenChallenge) return "HIDDEN_CHALLENGE";
  if (context.hiddenWorld) return "HIDDEN_WORLD";
  if (context.station) return "STATION";
  if (context.shop) return "SHOP";
  return context.intense ? "WORLD_INTENSE" : "WORLD_NORMAL";
}

export function musicStateForStageRole(
  role: StageRole,
): MusicState {
  if (role === "major-boss") return "GALAXY_BOSS";
  if (role === "boss") return "WORLD_BOSS";
  if (role === "mini-boss") return "MINI_BOSS";
  if (
    role === "elite" ||
    role === "gauntlet" ||
    role === "hazard"
  ) {
    return "WORLD_INTENSE";
  }
  return "WORLD_NORMAL";
}


export function musicStateForStagePhase(
  role: StageRole,
  phaseKind: "opening" | "pressure" | "mixed" | "recovery" | "finale",
): MusicState | null {
  if (role !== "normal") return null;
  if (phaseKind === "opening" || phaseKind === "recovery") {
    return "WORLD_NORMAL";
  }
  return "WORLD_INTENSE";
}

export function musicAssetForState(
  profile: WorldMusicProfile,
  state: MusicState,
): AudioAssetRef | null {
  switch (state) {
    case "SILENT":
      return null;
    case "WORLD_NORMAL":
      return profile.baseTrack;
    case "WORLD_INTENSE":
      return profile.intenseTrackOrLayer;
    case "MINI_BOSS":
      return profile.miniBossTrack;
    case "WORLD_BOSS":
      return profile.worldBossTrack;
    case "GALAXY_BOSS":
      return profile.galaxyBossTrack;
    case "CHAMPION_HUNT":
      return profile.championHuntTrack;
    case "HIDDEN_CHALLENGE":
      return profile.hiddenChallengeTrack;
    case "HIDDEN_WORLD":
      return profile.hiddenWorldTrack;
    case "SHOP":
      return profile.shopTrack;
    case "STATION":
      return profile.stationTrack;
    case "VICTORY":
      return profile.victoryStinger;
    case "DEFEAT":
      return profile.defeatStinger;
    case "TRANSITION":
      return profile.transitionStinger;
  }
}

export function assetCandidates(
  assetRef: AudioAssetRef | null,
): string[] {
  if (assetRef === null) return [];
  return [
    assetRef.localPath,
    assetRef.defaultPath,
  ].filter(
    (value): value is string =>
      typeof value === "string" && value.length > 0,
  );
}

export function stateLoops(state: MusicState): boolean {
  return (
    state !== "SILENT" &&
    state !== "VICTORY" &&
    state !== "DEFEAT" &&
    state !== "TRANSITION"
  );
}

export function validateWorldMusicProfiles(): string[] {
  const errors: string[] = [];

  for (const world of WORLD_REGISTRY) {
    const profile = WORLD_MUSIC_PROFILES[world.id];
    if (profile === undefined) {
      errors.push(world.id + ": missing music profile.");
      continue;
    }
    if (
      profile.id !== world.musicProfile ||
      profile.worldId !== world.id
    ) {
      errors.push(world.id + ": music identity mismatch.");
    }
    if (
      profile.ambientLayers.length === 0 ||
      profile.crossfadeSeconds <= 0 ||
      !Number.isFinite(profile.crossfadeSeconds)
    ) {
      errors.push(world.id + ": invalid music/ambient runtime contract.");
    }
    if (
      profile.duckingProfile.pronunciation <= 0 ||
      profile.duckingProfile.pronunciation > 1 ||
      profile.duckingProfile.announcer <= 0 ||
      profile.duckingProfile.announcer > 1 ||
      profile.duckingProfile.warning <= 0 ||
      profile.duckingProfile.warning > 1
    ) {
      errors.push(world.id + ": invalid ducking profile.");
    }

    const required = [
      profile.baseTrack,
      profile.intenseTrackOrLayer,
      profile.miniBossTrack,
      profile.worldBossTrack,
      profile.galaxyBossTrack,
      profile.shopTrack,
      profile.stationTrack,
      profile.victoryStinger,
      profile.defeatStinger,
    ];
    if (
      required.some(
        (entry) => assetCandidates(entry).length === 0,
      )
    ) {
      errors.push(world.id + ": unresolved audio asset contract.");
    }
  }

  return errors;
}
