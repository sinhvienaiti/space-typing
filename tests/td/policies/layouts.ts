/**
 * Layouts on the sandbox field (BUILD_NOW §3.1, BUILD_1A6 §4, §12 gate 4): where the bots build and whom the
 * helpers stand by. Spots are checked by canPlace in the tests that use them; mines sit on the ore nodes' centres.
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
/** The farm by the south-east trees, the cluster nearest the Bastion (14–22 m): fields and wood in one ring. */
export const FARM_EAST: Spot = { id: "farm", x: 18, z: 30 };
/** A second farm south of it, its fields 6.5 m off: the hero's ring holds both. */
export const FARM_SOUTH: Spot = { id: "farm", x: 18, z: 23.5 };
/** Where marks go, cluster by cluster: the south-east trees, the stream's east bank, its west bank, the gate's west side, the gate, the north-east corner. */
export const WOOD = [[17, 38], [-18.5, -26], [-29, -29], [-18, -41], [6, -43], [38, -40]] as const;

/**
 * The standard build (BUILD_1A6 §12 gate 4: a farm, trees chopped, towers, barracks, a mine, the Bastion raised with
 * gold): the farm by the south-east trees, the merge's archer and barracks, the rich mine on N1, the Bastion to
 * level 2 (Chấm out, by the farm), the east road's archer and the cannon, a second farm, the Bastion to level 3
 * (Phẩy out, by the mine), then level 2 for the merge's archer, the west archer, level 2 for the cannon, the mine
 * and the barracks. Marked
 * trees: the villagers' count and 2 more, cluster by cluster from the south-east trees; up to 4 villagers, 20 gold
 * kept back; food past 20 sold; the days run out (no early night).
 */
export const STANDARD: Layout = {
  name: "Chuẩn",
  builds: [
    FARM_EAST, ARCHER_MERGE, BARRACKS, MINE_N1, { keep: 2 }, ARCHER_EAST, CANNON, { keep: 3 },
    { upgrade: 1, level: 2 }, ARCHER_WEST, { upgrade: 6, level: 2 }, { upgrade: 3, level: 2 }, { upgrade: 2, level: 2 },
  ],
  helpers: [0, 3],
  marks: { spare: 2, woodAt: WOOD },
  villagers: 4,
  hireReserve: 20,
  foodKeep: 20,
};
