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
} from "../src/campaign/route";
import { sectorForStage } from "../src/campaign/expansion-state";
import { stageRole } from "../src/campaign/stage";

describe("M14 deterministic route graph", () => {
  it("generates the same graph for every reload of a sector", () => {
    const first = createRouteGraph(41);
    const second = createRouteGraph(49);

    expect(first).toEqual(second);
    expect(first.sectorStart).toBe(41);
    expect(first.sectorEnd).toBe(50);
    expect(isValidRouteGraph(first)).toBe(true);
  });

  it("covers every sequential stage and keeps every non-terminal node connected", () => {
    const graph = createRouteGraph(111);
    expect(graph.steps).toHaveLength(10);

    for (let index = 0; index < graph.steps.length; index += 1) {
      const step = graph.steps[index]!;
      expect(step.stage).toBe(graph.sectorStart + index);
      expect(step.nodes.length).toBeGreaterThan(0);

      if (index === graph.steps.length - 1) {
        expect(step.nodes.every((node) => node.nextIds.length === 0)).toBe(
          true,
        );
      } else {
        const nextIds = graph.steps[index + 1]!.nodes.map((node) => node.id);
        for (const node of step.nodes) {
          expect(node.nextIds).toEqual(nextIds);
        }
      }
    }
  });

  it("forces mandatory Mini/World/Galaxy boss stages to one combat route", () => {
    for (const stage of [10, 20, 100, 200, 1000]) {
      const graph = createRouteGraph(stage);
      const step = graph.steps.find((item) => item.stage === stage);
      expect(step, String(stage)).toBeDefined();
      expect(step!.nodes).toHaveLength(1);
      expect(step!.nodes[0]!.type).toBe("combat");
      expect(step!.nodes[0]!.mandatory).toBe(true);
      expect(["mini-boss", "boss", "major-boss"]).toContain(stageRole(stage));
    }
  });

  it("persists a route choice instead of rerolling on sanitize/reload", () => {
    const state = createRouteState(41);
    const choices = routeChoicesForStage(state, 41);
    expect(choices.length).toBeGreaterThan(1);

    const chosen = choices.at(-1)!;
    const selected = selectRouteNode(state, 41, chosen.id);
    const reloaded = sanitizeRouteState(
      JSON.parse(JSON.stringify(selected)),
      41,
    );

    expect(selectedRouteNode(reloaded, 41)?.id).toBe(chosen.id);
    expect(reloaded.graph).toEqual(state.graph);
    expect(routeNeedsChoice(reloaded, 41)).toBe(false);
  });

  it("locks a persisted choice so reload/reclick cannot reroll the path", () => {
    const state = createRouteState(41);
    const choices = routeChoicesForStage(state, 41);
    expect(choices.length).toBeGreaterThan(1);

    const first = selectRouteNode(state, 41, choices[0]!.id);
    const second = selectRouteNode(first, 41, choices[1]!.id);

    expect(selectedRouteNode(second, 41)?.id).toBe(choices[0]!.id);
    expect(second.selectedByStage).toEqual(first.selectedByStage);
  });

  it("rejects invalid node ids without mutating selection", () => {
    const state = createRouteState(71);
    const next = selectRouteNode(state, 71, "missing-node");

    expect(next.selectedByStage).toEqual({});
    expect(routeNeedsChoice(next, 71)).toBe(true);
  });

  it("creates a fresh deterministic graph only when crossing sectors", () => {
    const first = createRouteState(1);
    const sameSector = syncRouteStateForStage(first, 9);
    const nextSector = syncRouteStateForStage(first, 11);

    expect(sameSector.graph).toEqual(first.graph);
    expect(nextSector.graph.sectorStart).toBe(11);
    expect(nextSector.graph).not.toEqual(first.graph);
    expect(nextSector.selectedByStage).toEqual({});
  });

  it("introduces Hidden Signal only after the challenge system is eligible", () => {
    const early = createRouteGraph(21);
    expect(
      early.steps.flatMap((step) => step.nodes).some(
        (node) => node.type === "hidden-signal",
      ),
    ).toBe(false);

    const laterGraphs = Array.from({ length: 40 }, (_, index) =>
      createRouteGraph(41 + index * 10),
    );
    expect(
      laterGraphs.some((graph) =>
        graph.steps.flatMap((step) => step.nodes).some(
          (node) => node.type === "hidden-signal",
        ),
      ),
    ).toBe(true);
  });

  it("keeps route progress bounded to authored choice steps", () => {
    let state = createRouteState(201);
    const initial = routeProgress(state);
    expect(initial.chosen).toBe(0);
    expect(initial.total).toBeGreaterThan(0);
    expect(initial.total).toBeLessThanOrEqual(9);

    for (const step of state.graph.steps) {
      if (step.nodes.length <= 1) continue;
      state = selectRouteNode(state, step.stage, step.nodes[0]!.id);
    }

    const final = routeProgress(state);
    expect(final.chosen).toBe(final.total);
  });

  it("matches the ten-stage checkpoint sector boundaries", () => {
    for (const stage of [1, 10, 11, 100, 991, 1000]) {
      const graph = createRouteGraph(stage);
      const sector = sectorForStage(stage);
      expect(graph.sectorStart).toBe(sector.startStage);
      expect(graph.sectorEnd).toBe(sector.endStage);
    }
  });
});
