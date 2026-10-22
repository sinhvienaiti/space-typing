/**
 * Layouts on the sandbox field (BUILD_NOW §3.1, BUILD_1A6 §4): where the bots build and whom the helpers stand
 * by. Spots are checked by canPlace in the tests that use them; mines sit on the ore nodes' centres.
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
/** The farm by the Bastion (the sandbox preset's). */
export const FARM_KEEP: Spot = { id: "farm", x: -17, z: 40 };
/** The stream's east bank: five trees (map indices 17–21). */
export const EAST_BANK = [17, 18, 19, 20, 21] as const;

/**
 * The balanced bot's build (BUILD_1A6 §12 gate 4's "standard" policy, cut to 1A.6 R1): a farm first, the merge's
 * archer and barracks, the mine by the Bastion, then the roads' towers as gold and wood come; Chấm by the farm
 * (its passive), the Bastion at level 2 from night 2; the east bank's trees marked; up to 4 villagers.
 */
export const BALANCED: Layout = {
  name: "Cân bằng",
  builds: [FARM_KEEP, ARCHER_MERGE, BARRACKS, MINE_N2, ARCHER_EAST, CANNON, ARCHER_WEST],
  helpers: [0],
  keep: [[1, 1], [2, 2]],
  marks: EAST_BANK,
  villagers: 4,
  callAfterS: 45,
};
