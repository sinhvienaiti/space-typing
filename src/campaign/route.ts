import {
  stageRole,
  stageSeed,
} from "./stage";
import { sectorForStage } from "./expansion-state";
import { clamp } from "../logic";

export const ROUTE_NODE_TYPES = [
  "combat",
  "shop",
  "station",
  "hidden-signal",
] as const;

export type RouteNodeType =
  (typeof ROUTE_NODE_TYPES)[number];

export type RouteNode = {
  id: string;
  type: RouteNodeType;
  targetStage: number;
  lane: number;
  mandatory: boolean;
  nextIds: string[];
};

export type RouteStageStep = {
  stage: number;
  nodes: RouteNode[];
};

export type RouteGraph = {
  version: 1;
  seed: number;
  sectorStart: number;
  sectorEnd: number;
  steps: RouteStageStep[];
};

export type RouteState = {
  version: 1;
  graph: RouteGraph;
  selectedByStage: Record<string, string>;
  visitedNodeIds: string[];
};

function routeSeedForSector(sectorStart: number): number {
  return (
    stageSeed(sectorStart) ^
    Math.imul(sectorStart, 0x85ebca6b) ^
    0x726f7574
  ) >>> 0;
}

function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function isMandatoryCombatStage(stage: number): boolean {
  const role = stageRole(stage);
  return (
    role === "mini-boss" ||
    role === "boss" ||
    role === "major-boss"
  );
}

function optionalNodeType(
  random: () => number,
  lane: number,
  stage: number,
): RouteNodeType {
  if (lane === 0) return "combat";
  const roll = random();
  if (stage >= 35 && roll < 0.12) return "hidden-signal";
  if (roll < 0.38) return "station";
  if (roll < 0.68) return "shop";
  return "combat";
}

function routeNodeId(
  sectorStart: number,
  stage: number,
  lane: number,
  type: RouteNodeType,
): string {
  return (
    "route-" +
    String(sectorStart) +
    "-stage-" +
    String(stage) +
    "-lane-" +
    String(lane) +
    "-" +
    type
  );
}

function buildStep(
  sectorStart: number,
  stage: number,
  random: () => number,
): RouteStageStep {
  if (isMandatoryCombatStage(stage)) {
    return {
      stage,
      nodes: [
        {
          id: routeNodeId(
            sectorStart,
            stage,
            0,
            "combat",
          ),
          type: "combat",
          targetStage: stage,
          lane: 0,
          mandatory: true,
          nextIds: [],
        },
      ],
    };
  }

  const laneCount = random() < 0.36 ? 3 : 2;
  const nodes: RouteNode[] = [];

  for (let lane = 0; lane < laneCount; lane += 1) {
    let type = optionalNodeType(random, lane, stage);

    // Do not offer duplicate side-service choices in the same step.
    if (
      lane > 1 &&
      nodes.some((node) => node.type === type) &&
      type !== "combat"
    ) {
      const alternatives: RouteNodeType[] = [
        "station",
        "shop",
        ...(stage >= 35
          ? (["hidden-signal"] as RouteNodeType[])
          : []),
        "combat",
      ];
      type =
        alternatives.find(
          (candidate) =>
            candidate === "combat" ||
            !nodes.some((node) => node.type === candidate),
        ) ?? "combat";
    }

    nodes.push({
      id: routeNodeId(
        sectorStart,
        stage,
        lane,
        type,
      ),
      type,
      targetStage: stage,
      lane,
      mandatory: false,
      nextIds: [],
    });
  }

  return { stage, nodes };
}

export function createRouteGraph(
  stage: number,
): RouteGraph {
  const sector = sectorForStage(stage);
  const seed = routeSeedForSector(sector.startStage);
  const random = createSeededRandom(seed);
  const steps: RouteStageStep[] = [];

  for (
    let targetStage = sector.startStage;
    targetStage <= sector.endStage;
    targetStage += 1
  ) {
    steps.push(
      buildStep(
        sector.startStage,
        targetStage,
        random,
      ),
    );
  }

  for (let index = 0; index < steps.length - 1; index += 1) {
    const nextIds = steps[index + 1]!.nodes.map(
      (node) => node.id,
    );
    steps[index]!.nodes = steps[index]!.nodes.map(
      (node) => ({
        ...node,
        nextIds: [...nextIds],
      }),
    );
  }

  return {
    version: 1,
    seed,
    sectorStart: sector.startStage,
    sectorEnd: sector.endStage,
    steps,
  };
}

function routeNodeType(
  value: unknown,
): value is RouteNodeType {
  return (
    typeof value === "string" &&
    ROUTE_NODE_TYPES.includes(value as RouteNodeType)
  );
}

export function isValidRouteGraph(
  value: unknown,
): value is RouteGraph {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const raw = value as Record<string, unknown>;
  if (
    raw.version !== 1 ||
    !Number.isInteger(raw.seed) ||
    typeof raw.seed !== "number" ||
    raw.seed < 0 ||
    !Number.isInteger(raw.sectorStart) ||
    typeof raw.sectorStart !== "number" ||
    !Number.isInteger(raw.sectorEnd) ||
    typeof raw.sectorEnd !== "number" ||
    !Array.isArray(raw.steps)
  ) {
    return false;
  }

  const expectedSector = sectorForStage(raw.sectorStart);
  if (
    expectedSector.startStage !== raw.sectorStart ||
    expectedSector.endStage !== raw.sectorEnd ||
    raw.steps.length !==
      raw.sectorEnd - raw.sectorStart + 1
  ) {
    return false;
  }

  const nodeIds = new Set<string>();
  const steps = raw.steps as unknown[];

  for (let index = 0; index < steps.length; index += 1) {
    const candidate = steps[index];
    if (
      candidate === null ||
      typeof candidate !== "object" ||
      Array.isArray(candidate)
    ) {
      return false;
    }
    const step = candidate as Record<string, unknown>;
    const expectedStage = raw.sectorStart + index;
    if (
      step.stage !== expectedStage ||
      !Array.isArray(step.nodes) ||
      step.nodes.length < 1 ||
      step.nodes.length > 3
    ) {
      return false;
    }

    for (const nodeCandidate of step.nodes) {
      if (
        nodeCandidate === null ||
        typeof nodeCandidate !== "object" ||
        Array.isArray(nodeCandidate)
      ) {
        return false;
      }
      const node = nodeCandidate as Record<string, unknown>;
      if (
        typeof node.id !== "string" ||
        node.id.length === 0 ||
        nodeIds.has(node.id) ||
        !routeNodeType(node.type) ||
        node.targetStage !== expectedStage ||
        !Number.isInteger(node.lane) ||
        typeof node.lane !== "number" ||
        node.lane < 0 ||
        node.lane > 2 ||
        typeof node.mandatory !== "boolean" ||
        !Array.isArray(node.nextIds) ||
        !node.nextIds.every(
          (id) => typeof id === "string",
        )
      ) {
        return false;
      }
      nodeIds.add(node.id);
    }

    if (isMandatoryCombatStage(expectedStage)) {
      if (
        step.nodes.length !== 1 ||
        (step.nodes[0] as RouteNode).type !== "combat" ||
        (step.nodes[0] as RouteNode).mandatory !== true
      ) {
        return false;
      }
    }
  }

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index] as RouteStageStep;
    const expectedNext =
      index === steps.length - 1
        ? []
        : (steps[index + 1] as RouteStageStep).nodes.map(
            (node) => node.id,
          );

    for (const node of step.nodes) {
      if (
        node.nextIds.length !== expectedNext.length ||
        !node.nextIds.every(
          (id) => expectedNext.includes(id),
        )
      ) {
        return false;
      }
    }
  }

  return true;
}

export function isValidRouteState(
  value: unknown,
  stage: number,
): value is RouteState {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const raw = value as Record<string, unknown>;
  if (
    raw.version !== 1 ||
    !isValidRouteGraph(raw.graph) ||
    raw.selectedByStage === null ||
    typeof raw.selectedByStage !== "object" ||
    Array.isArray(raw.selectedByStage) ||
    !Array.isArray(raw.visitedNodeIds)
  ) {
    return false;
  }

  const sector = sectorForStage(stage);
  const graph = raw.graph;
  if (
    graph.sectorStart !== sector.startStage ||
    graph.sectorEnd !== sector.endStage
  ) {
    return false;
  }

  for (const [key, candidate] of Object.entries(
    raw.selectedByStage as Record<string, unknown>,
  )) {
    const targetStage = Number(key);
    if (
      !Number.isInteger(targetStage) ||
      typeof candidate !== "string"
    ) {
      return false;
    }
    const node = nodeById(graph, candidate);
    if (
      node === undefined ||
      node.targetStage !== targetStage
    ) {
      return false;
    }
  }

  const visited = raw.visitedNodeIds;
  if (
    new Set(visited).size !== visited.length ||
    !visited.every(
      (id) =>
        typeof id === "string" &&
        nodeById(graph, id) !== undefined,
    )
  ) {
    return false;
  }

  return true;
}

export function createRouteState(
  stage: number,
): RouteState {
  return {
    version: 1,
    graph: createRouteGraph(stage),
    selectedByStage: {},
    visitedNodeIds: [],
  };
}

function nodeById(
  graph: RouteGraph,
  id: string,
): RouteNode | undefined {
  for (const step of graph.steps) {
    const found = step.nodes.find((node) => node.id === id);
    if (found !== undefined) return found;
  }
  return undefined;
}

export function routeChoicesForStage(
  state: RouteState,
  stage: number,
): readonly RouteNode[] {
  const step = state.graph.steps.find(
    (candidate) => candidate.stage === stage,
  );
  return step?.nodes ?? [];
}

export function selectedRouteNode(
  state: RouteState,
  stage: number,
): RouteNode | null {
  const choices = routeChoicesForStage(state, stage);
  if (choices.length === 1) return choices[0] ?? null;

  const id = state.selectedByStage[String(stage)];
  if (id === undefined) return null;
  const node = nodeById(state.graph, id);
  return node?.targetStage === stage ? node : null;
}

export function selectRouteNode(
  stateInput: RouteState,
  stage: number,
  nodeId: string,
): RouteState {
  const state = sanitizeRouteState(stateInput, stage);
  const existing = selectedRouteNode(state, stage);
  if (
    existing !== null &&
    state.selectedByStage[String(stage)] !== undefined
  ) {
    return state;
  }

  const node = routeChoicesForStage(state, stage).find(
    (candidate) => candidate.id === nodeId,
  );
  if (node === undefined) return state;

  const visited = new Set(state.visitedNodeIds);
  visited.add(node.id);

  return {
    ...state,
    selectedByStage: {
      ...state.selectedByStage,
      [String(stage)]: node.id,
    },
    visitedNodeIds: [...visited],
  };
}

export function routeNeedsChoice(
  state: RouteState,
  stage: number,
): boolean {
  const choices = routeChoicesForStage(state, stage);
  return (
    choices.length > 1 &&
    selectedRouteNode(state, stage) === null
  );
}

export function sanitizeRouteState(
  value: unknown,
  stage: number,
): RouteState {
  const sector = sectorForStage(stage);
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return createRouteState(stage);
  }

  const raw = value as Record<string, unknown>;
  if (
    raw.version !== 1 ||
    !isValidRouteGraph(raw.graph)
  ) {
    return createRouteState(stage);
  }

  const graph = raw.graph;
  if (
    graph.sectorStart !== sector.startStage ||
    graph.sectorEnd !== sector.endStage
  ) {
    return createRouteState(stage);
  }

  const selectedByStage: Record<string, string> = {};
  if (
    raw.selectedByStage !== null &&
    typeof raw.selectedByStage === "object" &&
    !Array.isArray(raw.selectedByStage)
  ) {
    for (const [key, candidate] of Object.entries(
      raw.selectedByStage as Record<string, unknown>,
    )) {
      const targetStage = Number(key);
      if (
        !Number.isInteger(targetStage) ||
        typeof candidate !== "string"
      ) {
        continue;
      }
      const node = nodeById(graph, candidate);
      if (
        node !== undefined &&
        node.targetStage === targetStage
      ) {
        selectedByStage[key] = candidate;
      }
    }
  }

  const visitedNodeIds = Array.isArray(raw.visitedNodeIds)
    ? [
        ...new Set(
          raw.visitedNodeIds.filter(
            (id): id is string =>
              typeof id === "string" &&
              nodeById(graph, id) !== undefined,
          ),
        ),
      ]
    : [];

  return {
    version: 1,
    graph,
    selectedByStage,
    visitedNodeIds,
  };
}

export function syncRouteStateForStage(
  state: RouteState,
  stage: number,
): RouteState {
  return sanitizeRouteState(state, stage);
}

export function routeProgress(
  state: RouteState,
): {
  chosen: number;
  total: number;
} {
  return {
    chosen: Object.keys(state.selectedByStage).length,
    total: state.graph.steps.filter(
      (step) => step.nodes.length > 1,
    ).length,
  };
}

export function routeNodeLabel(
  type: RouteNodeType,
): string {
  if (type === "station") return "Station";
  if (type === "shop") return "Shop";
  if (type === "hidden-signal") return "Hidden Signal";
  return "Combat";
}

export function routeNodeRisk(
  type: RouteNodeType,
): number {
  return type === "combat"
    ? 1
    : type === "hidden-signal"
      ? 1.45
      : type === "shop"
        ? 0.35
        : 0.2;
}

export function clampRouteLane(
  lane: number,
): number {
  return Math.floor(clamp(lane, 0, 2));
}
