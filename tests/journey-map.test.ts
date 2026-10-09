import { describe, expect, it } from "vitest";
import {
  journeyNodesForStage,
  journeyPath,
  journeySecretNodesForStage,
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
});
