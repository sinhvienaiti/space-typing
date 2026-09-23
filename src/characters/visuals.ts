import type { CharacterId } from "./registry";

export type CharacterSilhouette =
  | "spear"
  | "fortress"
  | "arc"
  | "phantom"
  | "crown"
  | "blade";

export type CharacterVisualProfile = {
  silhouette: CharacterSilhouette;
  primary: string;
  secondary: string;
  accent: string;
  core: string;
  engine: string;
  glow: string;
  wingSpan: number;
  bodyLength: number;
  engineCount: 1 | 2 | 3;
};

const CHARACTER_VISUALS: Record<CharacterId, CharacterVisualProfile> = {
  vanguard: {
    silhouette: "spear",
    primary: "#84f6ff",
    secondary: "#4d85ff",
    accent: "#d9fbff",
    core: "#7af2ff",
    engine: "#74eaff",
    glow: "#49dfff",
    wingSpan: 1,
    bodyLength: 1,
    engineCount: 2,
  },
  aegis: {
    silhouette: "fortress",
    primary: "#8ff4da",
    secondary: "#4b8f84",
    accent: "#f1fff7",
    core: "#ffd77d",
    engine: "#77e6ce",
    glow: "#65e8c8",
    wingSpan: 1.12,
    bodyLength: 0.94,
    engineCount: 3,
  },
  volt: {
    silhouette: "arc",
    primary: "#65e8ff",
    secondary: "#536dff",
    accent: "#eefcff",
    core: "#fff174",
    engine: "#7cf5ff",
    glow: "#55dfff",
    wingSpan: 1.08,
    bodyLength: 1.02,
    engineCount: 2,
  },
  wraith: {
    silhouette: "phantom",
    primary: "#b89aff",
    secondary: "#4d416f",
    accent: "#eee8ff",
    core: "#8be7ff",
    engine: "#a77cff",
    glow: "#9e7aff",
    wingSpan: 1.16,
    bodyLength: 1.04,
    engineCount: 2,
  },
  fortune: {
    silhouette: "crown",
    primary: "#ffe37a",
    secondary: "#d58d42",
    accent: "#fff8d9",
    core: "#8ff7d5",
    engine: "#ffd868",
    glow: "#f4c94d",
    wingSpan: 1.08,
    bodyLength: 0.98,
    engineCount: 2,
  },
  arsenal: {
    silhouette: "blade",
    primary: "#ff9c71",
    secondary: "#9d3d47",
    accent: "#fff0e8",
    core: "#ffe06c",
    engine: "#ff8d62",
    glow: "#ff795d",
    wingSpan: 1.18,
    bodyLength: 1.08,
    engineCount: 3,
  },
  oracle: {
    silhouette: "crown",
    primary: "#f1a2ff",
    secondary: "#694b9e",
    accent: "#fff1ff",
    core: "#74ecff",
    engine: "#ce8dff",
    glow: "#df88ff",
    wingSpan: 1.02,
    bodyLength: 1.05,
    engineCount: 1,
  },
  bastion: {
    silhouette: "fortress",
    primary: "#78efc3",
    secondary: "#3d756e",
    accent: "#e7fff6",
    core: "#83dfff",
    engine: "#6fe3bf",
    glow: "#57d8b4",
    wingSpan: 1.2,
    bodyLength: 0.96,
    engineCount: 3,
  },
  reaper: {
    silhouette: "blade",
    primary: "#ff7894",
    secondary: "#6b2848",
    accent: "#ffe7ee",
    core: "#d9a0ff",
    engine: "#ff647f",
    glow: "#ff526f",
    wingSpan: 1.22,
    bodyLength: 1.12,
    engineCount: 2,
  },
  celestial: {
    silhouette: "arc",
    primary: "#91bfff",
    secondary: "#6658c9",
    accent: "#fff5dc",
    core: "#fff19b",
    engine: "#82c8ff",
    glow: "#749fff",
    wingSpan: 1.18,
    bodyLength: 1.08,
    engineCount: 2,
  },
  zenith: {
    silhouette: "spear",
    primary: "#8ffcff",
    secondary: "#956dff",
    accent: "#ffffff",
    core: "#fff3a0",
    engine: "#75efff",
    glow: "#75eaff",
    wingSpan: 1.26,
    bodyLength: 1.15,
    engineCount: 3,
  },
};

export function characterVisualProfile(
  id: CharacterId,
): Readonly<CharacterVisualProfile> {
  return CHARACTER_VISUALS[id];
}

export function characterShipAssetId(id: CharacterId): string {
  return "player-ship-" + id;
}
