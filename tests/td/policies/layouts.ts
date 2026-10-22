/**
 * Layouts on the sandbox field (BUILD_NOW §3.1, TK 19.4–19.5): where the bots
 * build and who assists what. Spots are checked by canPlace in the tests that
 * use them; mines sit on the ore nodes' centres.
 */
import type { Layout, Spot } from "./stand";

/** Tháp Cung at the merge: every ground enemy passes it. */
export const ARCHER_MERGE: Spot = { id: "archer", x: -8, z: 12 };
/** Trại Lính at the merge, the choke. */
export const BARRACKS: Spot = { id: "barracks", x: 3, z: 18 };
export const CANNON: Spot = { id: "cannon", x: 7, z: 12 };
/** Tháp Cung by the east road, under the flyers' line. */
export const ARCHER_EAST: Spot = { id: "archer", x: 10, z: -6 };
export const ARCHER_WEST: Spot = { id: "archer", x: -16, z: -4 };
/** N1 ★★★ on the front, N2 ★ by the Bastion, N3 ★★ across the stream. */
export const MINE_N1: Spot = { id: "gold-mine", x: 26, z: -30 };
export const MINE_N2: Spot = { id: "gold-mine", x: -12, z: 32 };
export const MINE_N3: Spot = { id: "gold-mine", x: -34, z: 8 };

/** Gold that puts any layout below down at once (the sandbox). */
export const LAYOUT_GOLD = 2000;

/**
 * The same five buildings for every slot count, so only the slots differ (TK 19.4): 1 the hero at the merge's
 * archer; 2 Chấm at the mine; 3 the hero at the cannon (his burn), Chấm at the archer (his shot), Phẩy at the mine;
 * 4 Phẩy at the barracks (his drum), Gạch at the mine (his craft).
 */
export function slotsLayout(slots: 1 | 2 | 3 | 4): Layout {
  const assign = [[0], [0, 4], [1, 0, 4], [1, 0, 2, 4]][slots - 1]!;
  return { name: slots + " ô", builds: [ARCHER_MERGE, CANNON, BARRACKS, ARCHER_EAST, MINE_N1], assign, keep: [[1, slots]], gold: LAYOUT_GOLD };
}

/**
 * The balanced bot's build (TK 19.5 "An toàn", 19.7): from 220 gold, the merge's archer and barracks, the rich mine,
 * then the roads' archers, the cannon and a second mine as gold comes; the Bastion at level 2 from wave 3, then
 * Chấm holds the mine and the hero the merge (TK 19.4 "Trực mỏ"; the hero swings between them before, by a rule).
 */
export const BALANCED: Layout = {
  name: "Cân bằng",
  builds: [ARCHER_MERGE, BARRACKS, MINE_N2, ARCHER_EAST, CANNON, ARCHER_WEST, MINE_N3],
  assign: [0, 2],
  keep: [[1, 1], [3, 2]],
};

/** As balanced, three slots from wave 3 (the fast typist of TK 19.7: 2–3 slots); Phẩy at the second mine. */
export const BALANCED_3: Layout = { ...BALANCED, name: "Cân bằng 3 ô", assign: [0, 2, 6], keep: [[1, 1], [3, 3]] };

/** Every slot on a mine, the fourth on the Bastion ("Đứng Mỏ", TK 19.6). */
export const MINES_ONLY: Layout = {
  name: "Đứng Mỏ",
  builds: [ARCHER_MERGE, BARRACKS, MINE_N2, MINE_N1, MINE_N3, ARCHER_EAST, CANNON],
  assign: [2, 3, 4, -1],
  keep: [[1, 1], [3, 2]],
};
