import type { EnemyFamilyId } from "../../enemies/families";
import type { EnemyType, PadTrait, SpawnGroup, TowerType, WaveSpec } from "./data";

/**
 * The eight Rift Defense maps (docs/SPACE_TYPING_DEFENSE_PLAN_V4_2026-10-21.md
 * §8): one floating island per World, each with its own road layout, tower
 * pads, enemy family and waves. Ground plane: x right, z toward the default
 * camera, metres; the island is about 84 m across, centred on the origin.
 */

export type Pad = { x: number; z: number; trait: PadTrait };
/** An axis-aligned patch of ice road (Frost Veil): [x0, z0, x1, z1]. */
export type Rect = readonly [number, number, number, number];
export type MapPalette = {
  /** Ground: base, second tone, crack/vein glow; road: stones, edges, rune glow; pad stone and rim. */
  ground: string;
  ground2: string;
  vein: string;
  road: string;
  roadEdge: string;
  rune: string;
  pad: string;
  /** Glow of the island rim and the fog below it. */
  rim: string;
};

export type MapSpec = {
  id: string;
  number: number;
  name: string;
  /** Vietnamese name, for the owner's docs and the map card. */
  nameVi: string;
  blurb: string;
  family: EnemyFamilyId;
  /** The Campaign stage whose World paints the sky (src/scene3d/world.ts). */
  skyStage: number;
  /** One road per gate; roads that meet share their last points exactly. */
  paths: readonly (readonly (readonly [number, number])[])[];
  core: readonly [number, number];
  pads: readonly Pad[];
  ice?: readonly Rect[];
  towers: readonly TowerType[];
  branches: boolean;
  start: number;
  /** Enemy speed on this map: long roads run faster, short ones slower, so each road takes about as long to walk. */
  pace: number;
  bosses: { lieutenant: string; warden: string };
  waves: readonly WaveSpec[];
  palette: MapPalette;
  /** Default camera: target on the ground, yaw (radians, 0 = looking toward −z), distance. */
  camera: { target: readonly [number, number]; yaw: number; distance: number };
  /** The owner's painted ground (2048 px, top-down), when it exists; else the code paints one. */
  art?: string;
};

export const ROAD_HALF_WIDTH = 1.6;
export const ISLAND_RADIUS = 42;

const BASE_TOWERS: readonly TowerType[] = ["frost", "arc", "siphon"];

const group = (type: EnemyType, count: number, every: number, at: number, extra: Partial<SpawnGroup> = {}): SpawnGroup => ({ type, count, every, at, ...extra });

/**
 * Ten waves on the V4 rhythm (calm → pressure → storm → boss): `scale`
 * multiplies the counts, `specials` are the map's three role enemies in the
 * order they arrive. Every group comes in through all gates in turn.
 */
function rhythm(scale: number, specials: readonly [EnemyType, EnemyType, EnemyType]): WaveSpec[] {
  const n = (count: number): number => Math.max(1, Math.round(count * scale));
  const [first, second, third] = specials;
  const all = { gate: "all" as const };
  return [
    { name: "First light", groups: [group("scout", n(8), 1.6, 1, all)] },
    { name: "Sparks", groups: [group("scout", n(10), 1.4, 1, all), group("mine", n(2), 6, 6, all)] },
    { name: "Heavy steps", groups: [group("scout", n(12), 1.2, 1, all), group("tank", n(2), 10, 8, all), group(first, n(2), 8, 5, all)] },
    { name: "The swarm", groups: [group("swarm", n(2), 12, 3, { ...all, drones: 24 }), group("scout", n(10), 1.5, 2, all), group("mine", n(3), 6, 5, all), group(first, n(2), 9, 8, all)] },
    { name: "Lieutenant", groups: [group("lieutenant", 1, 1, 6), group("scout", n(14), 1.3, 1, all), group(second, n(2), 10, 10, all), group("tank", n(2), 12, 4, all)] },
    { name: "Storm", groups: [group("scout", n(40), 0.45, 1, all), group("mine", n(4), 4, 3, all), group("swarm", n(3), 7, 4, { ...all, drones: 36 }), group(first, n(3), 6, 6, all), group(second, n(2), 9, 9, all)] },
    { name: "Lull", groups: [group("scout", n(14), 1.2, 1, all), group("tank", n(3), 8, 5, all), group(third, n(3), 6, 3, all)] },
    { name: "Great storm", groups: [group("swarm", n(5), 0.8, 1, { ...all, drones: 60 }), group("scout", n(70), 0.21, 1, all), group("mine", n(8), 2.2, 2, all), group("tank", n(4), 5, 5, all), group(second, n(4), 4, 6, all)] },
    { name: "Iron tide", groups: [group("tank", n(8), 3.5, 2, all), group("scout", n(34), 0.55, 1, all), group(third, n(4), 5, 4, all), group(first, n(4), 5, 6, all), group("swarm", n(3), 8, 5, { ...all, drones: 48 })] },
    { name: "Warden", groups: [group("warden", 1, 1, 4), group("scout", n(30), 0.8, 1, all), group("mine", n(5), 5, 3, all), group("swarm", n(3), 10, 6, { ...all, drones: 48 }), group(second, n(3), 8, 8, all), group(third, n(3), 8, 12, all)] },
  ];
}

/** Points along a spiral from radius `r0` (angle `a0`, radians) inward to `r1` after `turns`, clockwise on screen. */
function spiral(r0: number, r1: number, a0: number, turns: number, steps: number): [number, number][] {
  const points: [number, number][] = [];
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const angle = a0 + t * turns * Math.PI * 2;
    const radius = r0 + (r1 - r0) * t;
    points.push([Math.round(Math.cos(angle) * radius * 10) / 10, Math.round(Math.sin(angle) * radius * 10) / 10]);
  }
  return points;
}

const pad = (x: number, z: number, trait: PadTrait = "normal"): Pad => ({ x, z, trait });

export const MAPS: readonly MapSpec[] = [
  {
    id: "rainbow-reach",
    number: 1,
    name: "Rainbow Reach",
    nameVi: "Cầu Vồng",
    blurb: "One road winding in an S. Learn where a tower earns its place.",
    family: "rainbow",
    skyStage: 1,
    paths: [[[0, -33], [-12.9, -27.6], [-19.3, -17.5], [-10.1, -10.1], [7.4, -11], [18.4, -4.6], [15.6, 5.5], [1.8, 5.5], [-11, 7.4], [-17.5, 14.7], [-8.3, 20.2], [0, 23.9]]],
    core: [0, 26.8],
    pads: [pad(-15.5, -33), pad(-13, -16.5), pad(-1, -14.5, "high"), pad(14.5, -13.5), pad(13, 1, "ley"), pad(3.5, 10), pad(-5.5, 11), pad(-11, 24)],
    towers: BASE_TOWERS,
    branches: false,
    start: 120,
    pace: 1.0,
    bosses: { lieutenant: "lieutenant-rainbow", warden: "warden-rainbow" },
    waves: rhythm(1.0, ["sniper", "sniper", "splitter"]),
    palette: { ground: "#2a2346", ground2: "#3b2f5c", vein: "#ff7ad9", road: "#6d6290", roadEdge: "#c9b8ff", rune: "#7fe8ff", pad: "#4a4170", rim: "#b48cff" },
    camera: { target: [0, 6], yaw: 0, distance: 78 },
  },
  {
    id: "halo-garden",
    number: 2,
    name: "Halo Garden",
    nameVi: "Vườn Hào Quang",
    blurb: "Two gates, two roads that meet in the middle. One pad can cover both.",
    family: "angel",
    skyStage: 21,
    paths: [
      [[-22.4,  -30.7],  [-27.9,  -22.4],  [-24.2,  -14],  [-14.9,  -16.8],  [-9.3,  -10.2],  [-2.8,  -5.6],  [0,  -0.9],  [7.5,  2.8],  [14.9,  7.5],  [13,  14.9],  [3.7,  14],  [-5.6,  16.8],  [-8.4,  22.4],  [0,  25.1]],
      [[22.4,  -30.7],  [27.9,  -22.4],  [24.2,  -14],  [14.9,  -16.8],  [9.3,  -10.2],  [2.8,  -5.6],  [0,  -0.9],  [7.5,  2.8],  [14.9,  7.5],  [13,  14.9],  [3.7,  14],  [-5.6,  16.8],  [-8.4,  22.4],  [0,  25.1]],
    ],
    core: [0, 27.8],
    pads: [pad(-18.5, -25), pad(18.5, -25), pad(-29, -11), pad(29, -11), pad(0, -8.5, "high"), pad(-4.5, 3, "ley"), pad(8.5, 9.5), pad(19.5, 12), pad(-1, 19.5), pad(-13, 19.5)],
    towers: [...BASE_TOWERS, "gravity"],
    branches: false,
    start: 130,
    pace: 0.9,
    bosses: { lieutenant: "lieutenant-angel", warden: "warden-angel" },
    waves: rhythm(0.86, ["shield", "healer", "sniper"]),
    palette: { ground: "#3c3a4c", ground2: "#4f4b60", vein: "#ffd36b", road: "#cfc6b0", roadEdge: "#d9a94a", rune: "#fff1b8", pad: "#6a6276", rim: "#ffe6a8" },
    camera: { target: [0, 6], yaw: 0, distance: 80 },
  },
  {
    id: "ember-hollow",
    number: 3,
    name: "Ember Hollow",
    nameVi: "Hố Dung Nham",
    blurb: "The road splits round a high island and joins again. The island sees both.",
    family: "devil",
    skyStage: 101,
    paths: [
      [[-30.6,  -13.4],  [-28.7,  -24.9],  [-17.2,  -30.6],  [-5.7,  -29.7],  [0,  -23],  [-4.8,  -16.3],  [-6.7,  -7.7],  [-6.7,  1],  [-5.7,  7.7],  [-2.9,  12.4],  [0,  15.3],  [0,  20.1],  [0,  23.9]],
      [[-30.6,  -13.4],  [-28.7,  -24.9],  [-17.2,  -30.6],  [-5.7,  -29.7],  [0,  -23],  [4.8,  -16.3],  [6.7,  -7.7],  [6.7,  1],  [5.7,  7.7],  [2.9,  12.4],  [0,  15.3],  [0,  20.1],  [0,  23.9]],
    ],
    core: [0, 26.8],
    pads: [pad(-24, -20), pad(-11.5, -25), pad(0, -9.5, "high"), pad(0, 3, "high"), pad(-11.5, -5.5), pad(11.5, -5.5), pad(-10.5, 8.5), pad(10.5, 8.5), pad(5, 20, "ley"), pad(-5, 20)],
    towers: [...BASE_TOWERS, "gravity", "beacon"],
    branches: false,
    start: 140,
    pace: 0.83,
    bosses: { lieutenant: "lieutenant-devil", warden: "warden-devil" },
    waves: rhythm(0.88, ["destroyer", "shield", "healer"]),
    palette: { ground: "#2a1712", ground2: "#3d211a", vein: "#ff5a1f", road: "#5a3a30", roadEdge: "#ff8a3d", rune: "#ffb347", pad: "#4a2a22", rim: "#ff6a3d" },
    camera: { target: [0, 6], yaw: 0, distance: 80 },
  },
  {
    id: "frost-veil",
    number: 4,
    name: "Frost Veil",
    nameVi: "Màn Sương Băng",
    blurb: "Long straights of ice: enemies slide faster on them, and Frost bites harder.",
    family: "frost",
    skyStage: 201,
    paths: [[[-30.2, -23.1], [17.8, -23.1], [22.2, -19.5], [22.2, -15.1], [17.8, -11.5], [-17.8, -11.5], [-22.2, -8], [-22.2, -3.6], [-17.8, 0], [17.8, 0], [22.2, 3.6], [22.2, 8], [17.8, 11.5], [-8.9, 11.5], [-13.3, 16], [-9.8, 21.3], [-2.5, 24.5]]],
    core: [0.5, 27.2],
    pads: [pad(-12.5, -17.5), pad(5.5, -17.5, "ley"), pad(-5.5, -6), pad(11.5, -6), pad(-11.5, 6), pad(7, 6, "ley"), pad(27.5, -12.5, "high"), pad(-27.5, -2, "high"), pad(-3.5, 18), pad(8, 16.5)],
    ice: [[-31, -25, 19, -21], [-19, -13.5, 19, -9.5], [-19, -2, 19, 2], [-10, 9.5, 19, 13.5]],
    towers: [...BASE_TOWERS, "gravity", "beacon", "sanctum"],
    branches: false,
    start: 150,
    pace: 1.27,
    bosses: { lieutenant: "lieutenant-frost", warden: "warden-frost" },
    waves: rhythm(1.3, ["cloaker", "splitter", "destroyer"]),
    palette: { ground: "#22344a", ground2: "#2f4760", vein: "#7fe8ff", road: "#a9c8de", roadEdge: "#5fb8ff", rune: "#bff4ff", pad: "#4b6680", rim: "#9fe3ff" },
    camera: { target: [0, 7], yaw: 0, distance: 82 },
  },
  {
    id: "prism-spire",
    number: 5,
    name: "Prism Spire",
    nameVi: "Tháp Lăng Kính",
    blurb: "The road crosses itself. Pads at the crossing reach both passes.",
    family: "prism",
    skyStage: 241,
    paths: [[[-25.1, -28.5], [-18.4, -18.4], [-8.4, -8.4], [0, 0], [8.4, 8.4], [17.6, 8.4], [22.6, 0], [18.4, -9.2], [8.4, -9.2], [0, 0], [-8.4, 9.2], [-16.8, 12.6], [-13.4, 20.1], [-3.5, 24]]],
    core: [0, 27],
    pads: [pad(0, -6, "high"), pad(0, 6, "ley"), pad(-6, 0), pad(6, 0), pad(-23.5, -17.5), pad(13.5, 4), pad(13.5, -15), pad(27.5, 1), pad(-18.5, 7.5), pad(-6.5, 17.5)],
    towers: [...BASE_TOWERS, "gravity", "beacon", "sanctum"],
    branches: true,
    start: 160,
    pace: 1.02,
    bosses: { lieutenant: "lieutenant-prism", warden: "warden-prism" },
    waves: rhythm(1.25, ["jammer", "shield", "cloaker"]),
    palette: { ground: "#1d1838", ground2: "#2c2454", vein: "#8f7bff", road: "#4c4380", roadEdge: "#b8a8ff", rune: "#f0b8ff", pad: "#3a3266", rim: "#a35cff" },
    camera: { target: [0, 6], yaw: 0, distance: 80 },
  },
  {
    id: "verdant-wild",
    number: 6,
    name: "Verdant Wild",
    nameVi: "Rừng Hoang",
    blurb: "Two gates, two roads that never meet before the Core. Split your Energy.",
    family: "nature",
    skyStage: 301,
    paths: [
      [[-37,  -8],  [-30,  -20],  [-20,  -24],  [-14,  -14],  [-22,  -6],  [-26,  4],  [-18,  10],  [-10,  9],  [-6,  16],  [-3,  23],  [0,  26.5]],
      [[37,  -8],  [30,  -20],  [20,  -24],  [14,  -14],  [22,  -6],  [26,  4],  [18,  10],  [10,  9],  [6,  16],  [3,  23],  [0,  26.5]],
    ],
    core: [0, 29.4],
    pads: [pad(-25, -17.5), pad(-29.5, -3.5), pad(-18.5, -2, "ley"), pad(-13, 16), pad(-10.5, -21, "rubble"), pad(-27.5, 10.5, "rubble"), pad(25, -17.5), pad(29.5, -3.5), pad(18.5, -2, "ley"), pad(13, 16), pad(10.5, -21, "rubble"), pad(27.5, 10.5, "rubble"), pad(-1.5, 13.5, "high")],
    towers: [...BASE_TOWERS, "gravity", "beacon", "sanctum"],
    branches: true,
    start: 170,
    pace: 0.86,
    bosses: { lieutenant: "lieutenant-nature", warden: "warden-nature" },
    waves: rhythm(0.92, ["carrier", "healer", "splitter"]),
    palette: { ground: "#1f3320", ground2: "#2e4a2a", vein: "#9dff6b", road: "#6b5a3e", roadEdge: "#c9b07a", rune: "#d6ff8a", pad: "#3a4a30", rim: "#7cff9a" },
    camera: { target: [0, 9], yaw: 0, distance: 82 },
  },
  {
    id: "shadow-rift",
    number: 7,
    name: "Shadow Rift",
    nameVi: "Khe Bóng Tối",
    blurb: "Three gates, three short roads. Phantoms hide in the dark.",
    family: "shadow",
    skyStage: 401,
    paths: [
      [[-25.9,  -27.8],  [-31.8,  -15.9],  [-23.9,  -8],  [-13.9,  -13.9],  [-8,  -6],  [-11.9,  2],  [-5,  6],  [0,  9],  [0,  16.9],  [0,  23.9]],
      [[0,  -34.8],  [8,  -27.8],  [2,  -20.9],  [-5,  -14.9],  [2,  -8],  [-3,  -2],  [0,  9],  [0,  16.9],  [0,  23.9]],
      [[25.9,  -27.8],  [31.8,  -15.9],  [23.9,  -8],  [13.9,  -13.9],  [8,  -6],  [11.9,  2],  [5,  6],  [0,  9],  [0,  16.9],  [0,  23.9]],
    ],
    core: [0, 26.8],
    pads: [pad(-25, -17), pad(-17, -1), pad(-6.5, -11, "high"), pad(25, -17), pad(17, -1), pad(7, -14.5, "high"), pad(-6, 15, "ley"), pad(6, 15), pad(-3.5, -31), pad(8, -20)],
    towers: [...BASE_TOWERS, "gravity", "beacon", "sanctum"],
    branches: true,
    start: 170,
    pace: 0.78,
    bosses: { lieutenant: "lieutenant-shadow", warden: "warden-shadow" },
    waves: rhythm(0.88, ["cloaker", "sniper", "jammer"]),
    palette: { ground: "#3b3742", ground2: "#4a4553", vein: "#c08bff", road: "#6a6078", roadEdge: "#9b7bff", rune: "#d8b8ff", pad: "#55506a", rim: "#9b6bff" },
    camera: { target: [0, 6], yaw: 0, distance: 82 },
  },
  {
    id: "cosmic-throne",
    number: 8,
    name: "Cosmic Throne",
    nameVi: "Ngai Vũ Trụ",
    blurb: "A spiral road around the Core. Pads in the middle reach several turns.",
    family: "cosmic",
    skyStage: 501,
    paths: [[...spiral(36, 9, -Math.PI / 2, 1.75, 42), [-4, 0]]],
    core: [0, 0],
    pads: [pad(0, -25, "high"), pad(22, 0), pad(0, 23.5), pad(-20, 1.5, "ley"), pad(17, -15.5), pad(14, 15), pad(-15, 14), pad(-12.5, -12.5, "ley"), pad(1, -15), pad(10, 6), pad(-13, 7.5, "high")],
    towers: [...BASE_TOWERS, "gravity", "beacon", "sanctum"],
    branches: true,
    start: 180,
    pace: 1.5,
    bosses: { lieutenant: "lieutenant-cosmic", warden: "warden-cosmic" },
    waves: rhythm(1.4, ["carrier", "destroyer", "shield"]),
    palette: { ground: "#141a33", ground2: "#1f2850", vein: "#6fc3ff", road: "#36406e", roadEdge: "#ffd36b", rune: "#9fd8ff", pad: "#2a3260", rim: "#6fc3ff" },
    camera: { target: [0, 5], yaw: 0, distance: 84 },
  },
];

export function mapById(id: string | null | undefined): MapSpec {
  return MAPS.find((map) => map.id === id) ?? MAPS[0]!;
}
