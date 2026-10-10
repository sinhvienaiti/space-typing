import {
  HIDDEN_CONTENT_REGISTRY,
  sanitizeHiddenDiscoveryState,
  type HiddenContentId,
  type HiddenDiscoveryState,
} from "../discovery/hidden-content";
import { stageRole } from "./stage";
import { worldForStage } from "../worlds/registry";

export type JourneyNode = {
  stage: number;
  x: number;
  y: number;
  role: ReturnType<typeof stageRole>;
  checkpoint: boolean;
};

export type JourneySecretNodeKind = "hidden-shop" | "hidden-station";

export type JourneySecretNode = {
  id: Extract<HiddenContentId, "black-market-signal" | "hidden-station-signal">;
  stage: number;
  x: number;
  y: number;
  kind: JourneySecretNodeKind;
  name: string;
  description: string;
  destinationId: string;
  selectable: true;
};

export type JourneySectorDetail = {
  startStage: number;
  endStage: number;
  checkpointStage: number;
  hiddenStops: JourneySecretNode[];
};

/** Twenty fixed DOM/SVG nodes per World; the map never runs a render loop. */
const LANE_X = [50, 69, 78, 63, 40, 22, 32, 53, 75, 55, 30, 20, 40, 62, 80, 65, 43, 23, 38, 51] as const;
const STEP_Y = 88;

const SECRET_ROUTE_IDS = [
  "black-market-signal",
  "hidden-station-signal",
] as const;

function normalizeCampaignStage(stage: number): number {
  if (!Number.isFinite(stage)) return 1;
  return Math.max(1, Math.min(1000, Math.floor(stage)));
}

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

export function journeySecretNodesForStage(
  stage: number,
  discovery: HiddenDiscoveryState,
): JourneySecretNode[] {
  const world = worldForStage(stage);
  const state = sanitizeHiddenDiscoveryState(discovery);
  const discovered = new Set(state.discovered);

  return SECRET_ROUTE_IDS.flatMap((id) => {
    const discoveryStage = state.discoveryStages[id];
    if (
      !discovered.has(id) ||
      discoveryStage === undefined ||
      discoveryStage < world.stageStart ||
      discoveryStage > world.stageEnd
    ) {
      return [];
    }

    const index = discoveryStage - world.stageStart;
    const anchorX = LANE_X[index]!;
    const definition = HIDDEN_CONTENT_REGISTRY[id];
    const isShop = id === "black-market-signal";
    const x = Math.max(8, Math.min(92, anchorX + (isShop ? -17 : 17)));

    return [
      {
        id,
        stage: discoveryStage,
        x,
        y: 52 + index * STEP_Y + (isShop ? -26 : 26),
        kind: isShop ? "hidden-shop" : "hidden-station",
        name: definition.name,
        description: definition.description,
        destinationId: definition.unlock.id,
        selectable: true,
      },
    ];
  });
}

/**
 * Compact ten-stage sector summary for the Journey Map detail rail. Hidden
 * stops come only from persisted discovery state; undiscovered destinations
 * are deliberately absent so presentation cannot leak route information.
 */
export function journeySectorDetailForStage(
  stage: number,
  discovery: HiddenDiscoveryState | null,
): JourneySectorDetail {
  const safeStage = normalizeCampaignStage(stage);
  const startStage = Math.floor((safeStage - 1) / 10) * 10 + 1;
  const endStage = Math.min(1000, startStage + 9);
  const hiddenStops =
    discovery === null
      ? []
      : journeySecretNodesForStage(safeStage, discovery).filter(
          (node) => node.stage >= startStage && node.stage <= endStage,
        );

  return {
    startStage,
    endStage,
    checkpointStage: endStage,
    hiddenStops,
  };
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
