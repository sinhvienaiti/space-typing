/**
 * The 1A content: the sandbox field `td-sandbox` (docs/td/BUILD_NOW.md §3,
 * TYPING_DEFENSE_DESIGN.md 22.9 cut down) with its trees (BUILD_1A6 §4.2),
 * six buildings (the farm from 1A.6), three enemies, Draconis, the three Thư
 * Đồng and the sandbox waves. Numbers come from the design (§11–14,
 * 22.2–22.6); this file is where they are retuned.
 */
import type { Content } from "./types";

const ATTACK = "#D9479B";
const MILITARY = "#3B7DDD";
const MINE = "#C98A2E";
const CORE = "#EDE6D6";
const FARM = "#9BC53D";

const SHARED_PATH_START = [[-10, -46], [-4, -40], [6, -34]] as const;
const SHARED_PATH_END = [[0, 12], [-6, 20], [6, 30], [0, 40]] as const;

export const SLICE_1A: Content = {
  id: "slice-1a",
  buildings: [
    {
      id: "keep", family: "core", footprint: "XL", placement: "fixed", costs: [0, 0, 0], hp: [0, 0, 0],
      attack: {
        damageType: "physical", critPct: 0, hits: ["ground", "low", "high"], projectileSpeed: 34,
        levels: [
          { damage: [10, 14], periodS: 1.2, rangeM: 9 },
          { damage: [14, 20], periodS: 1.2, rangeM: 9 },
          { damage: [20, 28], periodS: 1.2, rangeM: 9, targets: 2 },
          { damage: [26, 36], periodS: 1.2, rangeM: 9, targets: 2 },
        ],
      },
      keep: { levels: [{ slots: 1 }, { slots: 2 }, { slots: 3 }, { slots: 4 }] },
      power: { targets: 1 },
      view: { name: "Lũy Chữ", short: "Lũy", color: CORE },
    },
    {
      id: "archer", family: "attack", footprint: "S", placement: "free", costs: [70, 160, 290], hp: [300, 360, 440],
      attack: {
        damageType: "physical", critPct: 10, hits: ["ground", "low", "high"], projectileSpeed: 30,
        levels: [
          { damage: [6, 9], periodS: 0.9, rangeM: 10 },
          { damage: [9, 13], periodS: 0.8, rangeM: 11 },
          { damage: [13, 18], periodS: 0.7, rangeM: 12 },
        ],
      },
      shot: { dBar: [7.5, 11, 15.5], pierce: 1 },
      power: { dmgMul: 1.6, targets: 1 },
      view: { name: "Tháp Cung", short: "C", color: ATTACK },
    },
    {
      id: "cannon", family: "attack", footprint: "M", placement: "free", costs: [110, 230, 390], hp: [300, 360, 440],
      attack: {
        damageType: "physical", critPct: 0, edgePct: 50, hits: ["ground"], projectileSpeed: 18,
        levels: [
          { damage: [12, 20], periodS: 2.6, rangeM: 9, splashM: 2.2 },
          { damage: [20, 32], periodS: 2.4, rangeM: 9.5, splashM: 2.5 },
          { damage: [30, 48], periodS: 2.2, rangeM: 10, splashM: 2.8 },
        ],
      },
      shot: { dBar: [13, 21, 32], pierce: 0, splashMul: 1.15 },
      power: { dmgMul: 1.4, areaMul: 1.3 },
      view: { name: "Tháp Pháo", short: "P", color: ATTACK },
    },
    {
      id: "barracks", family: "military", footprint: "M", placement: "free", costs: [70, 150, 270], hp: [380, 450, 540],
      barracks: {
        soldiers: 3, respawnS: 10,
        levels: [
          { hp: 60, damage: [3, 5], periodS: 1.0, armorPct: 0 },
          { hp: 90, damage: [5, 8], periodS: 1.0, armorPct: 10 },
          { hp: 130, damage: [8, 12], periodS: 0.9, armorPct: 20 },
        ],
      },
      view: { name: "Trại Lính", short: "L", color: MILITARY },
    },
    {
      id: "gold-mine", family: "economy", footprint: "L", placement: "node", costs: [90, 190, 330], hp: [260, 310, 370],
      mine: { levels: [{ amount: 3, everyS: 8, pile: 60 }, { amount: 5, everyS: 8, pile: 90 }, { amount: 7, everyS: 8, pile: 120 }] },
      view: { name: "Mỏ Vàng", short: "M", color: MINE },
    },
    { id: "farm", family: "economy", footprint: "L", placement: "free", costs: [60, 130, 230], hp: [200, 240, 280], farm: true, view: { name: "Ruộng", short: "R", color: FARM } },
  ],
  enemies: [
    {
      id: "cuong-thi", tier: "swarm", hp: 35, armorPct: 0, resistPct: 0, speed: 3.8, altitude: "ground", leak: 1, gold: 4,
      blockWeight: 1, radiusM: 0.6, packSize: 5, melee: { damage: [2, 4], periodS: 1.0 },
      view: { name: "Cương Thi", short: "CT", color: "#5b3a8c" },
    },
    {
      id: "ma-troi", tier: "small", hp: 90, armorPct: 0, resistPct: 60, speed: 2.6, altitude: "low", leak: 2, gold: 8,
      blockWeight: 1, radiusM: 0.9, packSize: 1, splashTakenMul: 1.5,
      view: { name: "Đàn Ma Trơi", short: "MT", color: "#8a63d2" },
    },
    {
      id: "thuong-luong", tier: "medium", hp: 320, armorPct: 60, resistPct: 0, speed: 1.9, altitude: "ground", leak: 3, gold: 20,
      blockWeight: 2, radiusM: 1.4, packSize: 1, melee: { damage: [10, 14], periodS: 1.2 },
      view: { name: "Thuồng Luồng", short: "TL", color: "#3e2766" },
    },
  ],
  hero: {
    id: "draconis", flySpeed: 6, takeoffS: 0.6, landS: 0.6,
    attack: { damageType: "magic", critPct: 5, hits: ["ground", "low", "high"], projectileSpeed: 20, levels: [{ damage: [22, 34], periodS: 1.6, rangeM: 9, splashM: 1.8 }] },
    affinity: ["cannon"],
    burn: { dps: 3, durationS: 2 },
    view: { name: "Draconis", short: "D", color: "#F2994A" },
  },
  helpers: [
    { id: "helper-cham", speed: 4.0, view: { name: "Chấm", short: "C", color: "#9B5DE5" } },
    { id: "helper-phay", speed: 4.0, view: { name: "Phẩy", short: "P", color: "#FF8FB1" } },
    { id: "helper-gach", speed: 4.0, view: { name: "Gạch", short: "G", color: "#B07A4F" } },
  ],
  map: {
    id: "td-sandbox", halfM: 48, buildHalfM: 46, gate: [-10, -46], keep: [0, 40], roadHalfM: 1.9,
    routes: [
      [...SHARED_PATH_START, [-12, -20], [-10, 0], ...SHARED_PATH_END],
      [...SHARED_PATH_START, [16, -20], [12, 2], ...SHARED_PATH_END],
    ],
    flyRoute: [[-10, -46], [20, -20], [0, 40]],
    flyHeightM: 3,
    water: [{ x0: -25.5, x1: -22.5, z0: -48, z1: 48 }],
    bridges: [{ x0: -25.5, x1: -22.5, z0: -15.5, z1: -12.5 }, { x0: -25.5, x1: -22.5, z0: 24.5, z1: 27.5 }],
    nodes: [{ x: 26, z: -30, richness: 3 }, { x: -12, z: 32, richness: 1 }, { x: -34, z: 8, richness: 2 }],
    // Five clusters, off roads, water, bridges and nodes, 11 m and more from the Bastion: both sides of the gate,
    // both banks of the stream, the north-east corner, and 14–22 m from the Bastion in the south-east.
    trees: [
      [-21, -44], [-17.5, -44.5], [-14.5, -42.5], [-20, -40.5], [-16.5, -39.5], [-19, -37],
      [-1.5, -44], [2.5, -44.5], [6, -44], [9.5, -43], [5, -41], [12.5, -41],
      [-29, -35], [-28.5, -30.5], [-29.5, -26], [-28, -21.5], [-31.5, -32.5],
      [-19.5, -31], [-20, -27], [-18.5, -23], [-16.5, -29], [-19.5, -19],
      [33, -43], [37, -44], [41, -42], [35, -39], [39, -37.5], [43, -38], [42.5, -33.5],
      [15, 36], [18, 39.5], [16, 43.5], [20, 35], [19.5, 43], [22.5, 39.5], [13.5, 31.5],
    ],
    // §10: the tower at the merge, the cannon, the barracks, the mine on N1 (★★★) and a farm by the Bastion.
    preset: [["archer", -8, 12], ["cannon", 7, 12], ["barracks", 3, 18], ["gold-mine", 26, -30], ["farm", -17, 40]],
  },
  waves: {
    list: [
      [{ enemy: "cuong-thi", count: 8 }],
      [{ enemy: "cuong-thi", count: 10 }, { enemy: "ma-troi", count: 1 }],
      [{ enemy: "cuong-thi", count: 12 }, { enemy: "ma-troi", count: 2 }],
      [{ enemy: "thuong-luong", count: 2 }, { enemy: "cuong-thi", count: 10 }],
      [{ enemy: "thuong-luong", count: 3 }, { enemy: "cuong-thi", count: 12 }, { enemy: "ma-troi", count: 3 }],
      [{ enemy: "thuong-luong", count: 4 }, { enemy: "cuong-thi", count: 20 }, { enemy: "ma-troi", count: 4 }],
    ],
    endlessGrowth: 0.15,
    packGapS: 2.5,
    memberGapS: 0.45,
  },
};
