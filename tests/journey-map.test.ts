import { describe, expect, it } from "vitest";
import { journeyNodesForStage, journeyPath } from "../src/campaign/journey-map";

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
});
