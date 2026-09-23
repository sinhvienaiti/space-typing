import { describe, expect, it } from "vitest";
import {
  createRouteGraph,
  createRouteState,
  isValidRouteGraph,
  routeChoicesForStage,
  routeNeedsChoice,
  routeProgress,
  sanitizeRouteState,
  selectRouteNode,
  selectedRouteNode,
  syncRouteStateForStage,
  type RouteState,
} from "../src/campaign/route";
import { sectorForStage } from "../src/campaign/expansion-state";
import { stageRole } from "../src/campaign/stage";

function savedLegacySector(stage: number): RouteState {
  const state = createRouteState(stage);
  const first = state.graph.steps[0]!;
  const original = first.nodes[0]!;
  const oldStation = {
    ...original,
    id: original.id.replace("-lane-0-combat", "-lane-1-station"),
    type: "station" as const,
    lane: 1,
  };
  return {
    ...state,
    graph: {
      ...state.graph,
      steps: [{ ...first, nodes: [original, oldStation] }, ...state.graph.steps.slice(1)],
    },
    selectedByStage: { [String(stage)]: oldStation.id },
    visitedNodeIds: [oldStation.id],
  };
}

describe("checkpoint-only combat routes and old-save compatibility", () => {
  it("creates a deterministic ten-stage combat-only sector", () => {
    const first = createRouteGraph(41);
    expect(first).toEqual(createRouteGraph(49));
    expect(first.steps).toHaveLength(10);
    expect(first.sectorStart).toBe(41);
    expect(first.sectorEnd).toBe(50);
    expect(first.steps.every((step) =>
      step.nodes.length === 1 && step.nodes[0]!.type === "combat",
    )).toBe(true);
    expect(isValidRouteGraph(first)).toBe(true);
    for (let index = 0; index < 9; index += 1) {
      expect(first.steps[index]!.nodes[0]!.nextIds).toEqual(
        first.steps[index + 1]!.nodes.map((node) => node.id),
      );
    }
    expect(first.steps[9]!.nodes[0]!.nextIds).toEqual([]);
    expect(routeNeedsChoice(createRouteState(41), 41)).toBe(false);
    expect(routeProgress(createRouteState(41))).toEqual({ chosen: 0, total: 0 });
  });

  it("keeps Mini/World/Galaxy bosses mandatory", () => {
    for (const stage of [10, 20, 100, 200, 1000]) {
      const node = routeChoicesForStage(createRouteState(stage), stage)[0]!;
      expect(node.type).toBe("combat");
      expect(node.mandatory).toBe(true);
      expect(["mini-boss", "boss", "major-boss"]).toContain(stageRole(stage));
    }
  });

  it("accepts a saved legacy Station choice and allows switching before encounter", () => {
    const saved = savedLegacySector(41);
    expect(isValidRouteGraph(saved.graph)).toBe(true);
    const loaded = sanitizeRouteState(JSON.parse(JSON.stringify(saved)), 41);
    expect(selectedRouteNode(loaded, 41)?.type).toBe("station");
    const [combat] = routeChoicesForStage(loaded, 41);
    const selected = selectRouteNode(loaded, 41, combat!.id, true);
    expect(selectedRouteNode(selected, 41)?.type).toBe("combat");
    expect(selected.visitedNodeIds).toEqual([combat!.id]);
    expect(routeProgress(selected).total).toBe(1);
    expect(selectRouteNode(loaded, 41, combat!.id)).toEqual(loaded);
  });

  it("migrates only untouched legacy sectors, not recorded purchases/routes", () => {
    const used = savedLegacySector(41);
    const untouched = {
      ...used,
      selectedByStage: {},
      visitedNodeIds: [],
    };
    const migrated = sanitizeRouteState(untouched, 41);
    expect(migrated.graph).toEqual(createRouteGraph(41));
    expect(sanitizeRouteState(used, 41).graph).toEqual(used.graph);
    expect(syncRouteStateForStage(used, 49).graph).toEqual(used.graph);
    const advanced = syncRouteStateForStage(used, 51);
    expect(advanced.graph).toEqual(createRouteGraph(51));
    expect(advanced.selectedByStage).toEqual({});
  });

  it("rejects invalid legacy node IDs and later-stage lane hijacking", () => {
    const saved = savedLegacySector(41);
    const first = selectedRouteNode(saved, 41)!;
    expect(selectedRouteNode(selectRouteNode(saved, 41, "bad", true), 41)).toEqual(first);
    const secondStage = routeChoicesForStage(saved, 42)[0]!;
    expect(selectRouteNode(saved, 41, secondStage.id, true)).toEqual(saved);
  });

  it("respects existing checkpoint sector boundaries", () => {
    for (const stage of [1, 10, 11, 100, 991, 1000]) {
      const graph = createRouteGraph(stage);
      const sector = sectorForStage(stage);
      expect(graph.sectorStart).toBe(sector.startStage);
      expect(graph.sectorEnd).toBe(sector.endStage);
    }
  });
});
