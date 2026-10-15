import { describe, expect, it } from "vitest";
import {
  journeyNodesForStage,
  journeyPath,
  journeySecretNodesForStage,
  journeySectorDetailForStage,
} from "../src/campaign/journey-map";
import { createHiddenDiscoveryState } from "../src/discovery/hidden-content";

describe("world journey map", () => {
  it("shows exactly the selected World's 20 consecutive stages", () => {
    const worldOne = journeyNodesForStage(1);
    const worldTwo = journeyNodesForStage(35);
    const finalWorld = journeyNodesForStage(1000);
    expect(worldOne.map((node) => node.stage)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(worldTwo[0]?.stage).toBe(21);
    expect(worldTwo.at(-1)?.stage).toBe(40);
    expect(finalWorld[0]?.stage).toBe(981);
    expect(finalWorld.at(-1)?.stage).toBe(1000);
  });

  it("marks the authored Elite, mini boss, World boss and checkpoint milestones", () => {
    const nodes = journeyNodesForStage(1);
    expect(nodes[4]?.role).toBe("elite");
    expect(nodes[9]).toMatchObject({ stage: 10, role: "mini-boss", checkpoint: true });
    expect(nodes[19]).toMatchObject({ stage: 20, role: "boss", checkpoint: true });
    expect(journeyNodesForStage(1000).at(-1)?.role).toBe("major-boss");
  });

  it("makes a deterministic decorative path without changing route access", () => {
    const nodes = journeyNodesForStage(1);
    expect(journeyPath(nodes)).toBe(journeyPath(journeyNodesForStage(19)));
    expect(journeyPath(nodes)).toContain(" C ");
    expect(journeyPath([])).toBe("");
    expect(nodes.every((node) => node.x >= 0 && node.x <= 100)).toBe(true);
  });

  it("shows only persisted Hidden Shop and Hidden Station discoveries in their World", () => {
    const hidden = createHiddenDiscoveryState("campaign-secret-map");
    hidden.discovered = ["black-market-signal", "hidden-station-signal"];
    hidden.discoveryStages = {
      "black-market-signal": 25,
      "hidden-station-signal": 40,
    };

    expect(journeySecretNodesForStage(1, hidden)).toEqual([]);

    const secretNodes = journeySecretNodesForStage(35, hidden);
    expect(secretNodes).toHaveLength(2);
    expect(secretNodes.map((node) => node.id)).toEqual([
      "black-market-signal",
      "hidden-station-signal",
    ]);
    expect(secretNodes[0]).toMatchObject({
      stage: 25,
      kind: "hidden-shop",
      destinationId: "black-market",
      selectable: true,
    });
    expect(secretNodes[1]).toMatchObject({
      stage: 40,
      kind: "hidden-station",
      destinationId: "hidden-station",
      selectable: true,
    });
  });

  it("does not leak undiscovered secret destinations into the map", () => {
    const hidden = createHiddenDiscoveryState("campaign-undiscovered");
    hidden.discoveryStages = {
      "black-market-signal": 25,
      "hidden-station-signal": 40,
    };

    expect(journeySecretNodesForStage(35, hidden)).toEqual([]);
  });

  it("splits each World into deterministic ten-stage sector detail", () => {
    expect(journeySectorDetailForStage(1, null)).toMatchObject({
      startStage: 1,
      endStage: 10,
      checkpointStage: 10,
      hiddenStops: [],
    });
    expect(journeySectorDetailForStage(20, null)).toMatchObject({
      startStage: 11,
      endStage: 20,
      checkpointStage: 20,
    });
    expect(journeySectorDetailForStage(21, null)).toMatchObject({
      startStage: 21,
      endStage: 30,
      checkpointStage: 30,
    });
    expect(journeySectorDetailForStage(1000, null)).toMatchObject({
      startStage: 991,
      endStage: 1000,
      checkpointStage: 1000,
    });
  });

  it("merges the ten-stage combat path, milestone boss and guaranteed Rest Hub", () => {
  const first = journeySectorDetailForStage(1, null);
  expect(first.stages.map((node) => node.stage)).toEqual(
    Array.from({ length: 10 }, (_value, index) => index + 1),
  );
  expect(first.stages.filter((node) => node.checkpoint)).toEqual([
    { stage: 10, role: "mini-boss", checkpoint: true },
  ]);
  expect(first.milestone).toEqual({
    stage: 10,
    role: "mini-boss",
    checkpoint: true,
  });
  expect(first.restHub).toEqual({
    afterStage: 10,
    label: "Checkpoint Rest Hub",
  });
  expect(journeySectorDetailForStage(20, null).milestone).toMatchObject({
    stage: 20,
    role: "boss",
  });
  expect(journeySectorDetailForStage(1000, null).milestone).toMatchObject({
    stage: 1000,
    role: "major-boss",
  });
});

  it("merges only discovered hidden stops from the selected sector", () => {
    const hidden = createHiddenDiscoveryState("campaign-sector-detail");
    hidden.discovered = ["black-market-signal", "hidden-station-signal"];
    hidden.discoveryStages = {
      "black-market-signal": 25,
      "hidden-station-signal": 40,
    };

    expect(
      journeySectorDetailForStage(25, hidden).hiddenStops.map((node) => [
        node.id,
        node.stage,
      ]),
    ).toEqual([["black-market-signal", 25]]);
    expect(
      journeySectorDetailForStage(35, hidden).hiddenStops.map((node) => [
        node.id,
        node.stage,
      ]),
    ).toEqual([["hidden-station-signal", 40]]);
  });

  it("normalizes malformed sector stages without leaking hidden destinations", () => {
    const hidden = createHiddenDiscoveryState("campaign-sector-safe");
    hidden.discoveryStages = { "black-market-signal": 25 };

    expect(journeySectorDetailForStage(Number.NaN, hidden)).toMatchObject({
      startStage: 1,
      endStage: 10,
      hiddenStops: [],
    });
    expect(journeySectorDetailForStage(4000, hidden)).toMatchObject({
      startStage: 991,
      endStage: 1000,
      hiddenStops: [],
    });
  });
});
