import { TOWER_TUNING, TOWERS, type TowerType } from "./data";
import type { Pad } from "./maps";
import type { RoadPath } from "./path";

/**
 * How well a tower suits a pad (V4 §5.5), 1–3 stars and one short reason,
 * from the shape of the road in its reach: Frost wants many metres of road,
 * Gravity bends and roads that meet, Arc and Beacon crowded stretches,
 * Sanctum other towers and the Core, a Siphon a spot off the road.
 */
export type Fit = { stars: 1 | 2 | 3; reason: string };

type Built = { pad: number; type: TowerType }[];

/** Metres of road within `range`, the roads it covers, and how much they turn there (radians). */
export function coverage(pad: Pad, range: number, paths: readonly RoadPath[]): { metres: number; roads: number; turn: number } {
  let metres = 0;
  let roads = 0;
  let turn = 0;
  // Roads that share their end (meeting roads) count once there.
  const seen = new Set<string>();
  for (const path of paths) {
    let inside = 0;
    let last: number | null = null;
    for (let distance = 0; distance <= path.length; distance += 0.5) {
      const point = path.point(distance, 0, { x: 0, z: 0 });
      if (Math.hypot(point.x - pad.x, point.z - pad.z) > range) {
        last = null;
        continue;
      }
      const key = Math.round(point.x * 2) + ":" + Math.round(point.z * 2);
      if (!seen.has(key)) {
        seen.add(key);
        metres += 0.5;
      }
      inside += 0.5;
      const heading = path.heading(distance);
      if (last !== null) {
        let delta = Math.abs(heading - last);
        if (delta > Math.PI) delta = Math.PI * 2 - delta;
        turn += delta;
      }
      last = heading;
    }
    if (inside > 2) roads += 1;
  }
  return { metres, roads, turn };
}

export function towerFit(type: TowerType, padIndex: number, pads: readonly Pad[], paths: readonly RoadPath[], core: readonly [number, number], built: Built): Fit {
  const pad = pads[padIndex]!;
  const range = TOWERS[type].levels[0].range * (pad.trait === "high" ? 1 + TOWER_TUNING.highRange : 1);
  const { metres, roads, turn } = coverage(pad, range, paths);
  const nearby = (kind: TowerType, reach: number): boolean =>
    built.some((item) => item.type === kind && item.pad !== padIndex && Math.hypot(pads[item.pad]!.x - pad.x, pads[item.pad]!.z - pad.z) <= reach);
  switch (type) {
    case "frost":
      if (metres >= 20) return { stars: 3, reason: Math.round(metres) + " m of road in reach: Frost waves hit a lot here" };
      if (metres >= 12) return { stars: 2, reason: Math.round(metres) + " m of road in reach" };
      return { stars: 1, reason: "Only " + Math.round(metres) + " m of road in reach" };
    case "gravity":
      if (roads >= 2 || turn >= 2.2) return { stars: 3, reason: roads >= 2 ? "Roads meet here: one well pulls both" : "A sharp bend: enemies bunch up here" };
      if (turn >= 1.1) return { stars: 2, reason: "A bend in reach" };
      return { stars: 1, reason: "A straight road: little to bunch up" };
    case "arc":
      if (roads >= 2 || metres >= 22) return { stars: 3, reason: roads >= 2 ? "Covers " + roads + " roads: plenty to chain" : "A crowded stretch: chains reach far" };
      if (metres >= 13) return { stars: 2, reason: Math.round(metres) + " m of road in reach" };
      return { stars: 1, reason: "Few enemies pass in reach" };
    case "beacon":
      if (nearby("gravity", 9)) return { stars: 3, reason: "Next to a Gravity Well: it marks the cluster" };
      if (roads >= 2 || turn >= 1.6) return { stars: 2, reason: "Enemies crowd here" };
      return { stars: 1, reason: "Better beside a Gravity Well" };
    case "sanctum": {
      const towers = built.filter((item) => item.pad !== padIndex && Math.hypot(pads[item.pad]!.x - pad.x, pads[item.pad]!.z - pad.z) <= range).length;
      const coreGap = Math.hypot(core[0] - pad.x, core[1] - pad.z);
      if (towers >= 2) return { stars: 3, reason: towers + " towers in reach to repair" };
      if (towers === 1 || coreGap <= 14) return { stars: 2, reason: towers === 1 ? "One tower in reach to repair" : "Close to the Core" };
      return { stars: 1, reason: "It heals the Core from anywhere, but repairs nothing here" };
    }
    case "siphon": {
      const gap = Math.min(...paths.map((path) => path.nearest(pad.x, pad.z).gap));
      if (gap >= 5) return { stars: 3, reason: "Off the road: harder for Saboteurs to reach" };
      return { stars: 2, reason: "Close to the road: Saboteurs will shoot it" };
    }
  }
}
