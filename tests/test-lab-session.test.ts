import { describe, expect, it } from "vitest";
import {
  cloneTestLabSession,
  createTestLabSession,
  updateTestLabStage,
} from "../src/test-lab/session";

describe("M21 Test Lab session isolation", () => {
  it("creates an isolated in-memory run state with its own checkpoint", () => {
    const session = createTestLabSession(190, 181, "qa");

    expect(session.stage).toBe(190);
    expect(session.checkpointStage).toBe(181);
    expect(session.state.campaign.selectedStage).toBe(190);
    expect(session.checkpointSnapshot.campaign.selectedStage).toBe(181);
    expect(session.deathMode).toBe("immortal");
  });

  it("deep-clones sandbox state so presets cannot mutate the active session", () => {
    const active = createTestLabSession(190, 181, "qa");
    active.state.inventory = {
      "salvage-anchor": 3,
      "phoenix-core": 1,
    };
    active.state.credits = 20_000;

    const preset = cloneTestLabSession(active);
    preset.state.inventory["salvage-anchor"] = 99;
    preset.state.credits = 1;

    expect(active.state.inventory["salvage-anchor"]).toBe(3);
    expect(active.state.credits).toBe(20_000);
  });

  it("changes sandbox stage without carrying a production campaign reference", () => {
    const session = createTestLabSession(190, 181, "qa");
    session.state.inventory = { "repair-kit": 5 };
    const moved = updateTestLabStage(session, 220);

    expect(moved.stage).toBe(220);
    expect(moved.state.campaign.selectedStage).toBe(220);
    expect(moved.state.inventory).toEqual({ "repair-kit": 5 });
    expect(moved.state).not.toBe(session.state);
    expect(moved.state.campaign).not.toBe(session.state.campaign);
  });
});
