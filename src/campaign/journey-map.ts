import { stageRole } from "./stage";
import { worldForStage } from "../worlds/registry";

export type JourneyNode = {
  stage: number;
  x: number;
  y: number;
  role: ReturnType<typeof stageRole>;
  checkpoint: boolean;
};

/** Twenty fixed DOM/SVG nodes per World; the map never runs a render loop. */
const LANE_X = [50, 69, 78, 63, 40, 22, 32, 53, 75, 55, 30, 20, 40, 62, 80, 65, 43, 23, 38, 51] as const;
const STEP_Y = 88;

export function journeyNodesForStage(stage: number): JourneyNode[] {
  const world = worldForStage(stage);
  return Array.from({ length: 20 }, (_, index) => {
    const current = world.stageStart + index;
    return {
      stage: current,
      x: LANE_X[index]!,
      y: 52 + index * STEP_Y,
      role: stageRole(current),
      checkpoint: current % 10 === 0,
    };
  });
}

export function journeyPath(nodes: readonly JourneyNode[]): string {
  if (nodes.length === 0) return "";
  // Smooth segments are purely decorative. All encounter access still goes
  // through canSelectCampaignStage in the existing Campaign persistence layer.
  return nodes.reduce((path, node, index) => {
    const x = node.x * 10;
    if (index === 0) return `M ${x} ${node.y}`;
    const previous = nodes[index - 1]!;
    const previousX = previous.x * 10;
    const midpoint = (previous.y + node.y) / 2;
    return `${path} C ${previousX} ${midpoint}, ${x} ${midpoint}, ${x} ${node.y}`;
  }, "");
}
