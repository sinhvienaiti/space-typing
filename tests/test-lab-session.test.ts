import { describe, expect, it } from "vitest";
import {
  cloneTestLabSession,
  createTestLabSession,
  updateTestLabStage,
} from "../src/test-lab/session";
import {
  invalidateCrashRecoverySnapshot,
  resolveCrashRecovery,
} from "../src/persistence/crash-recovery";

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

  it("keeps recovery snapshots inside the disposable sandbox graph", () => {
    const session = createTestLabSession(190, 181, "qa");

    expect(session.campaignExpansion.checkpoint.stage).toBe(181);
    expect(session.stageEntrySnapshot.stage).toBe(190);
    expect(session.crashRecoverySnapshot.state.campaign.selectedStage).toBe(190);

    const clone = cloneTestLabSession(session);
    clone.state.credits = 99_999;
    clone.checkpointSnapshot.credits = 123;
    clone.crashRecoverySnapshot.state.credits = 777;

    expect(session.state.credits).toBe(0);
    expect(session.checkpointSnapshot.credits).toBe(0);
    expect(session.crashRecoverySnapshot.state.credits).toBe(0);
  });

  it("runs no-item death rollback through the production crash/death resolver", () => {
    const session = createTestLabSession(190, 181, "qa");
    session.state.credits = 20_000;
    session.state.expansionCurrencies.alloy = 120;

    const invalidated = invalidateCrashRecoverySnapshot(
      session.crashRecoverySnapshot,
      session.state,
      session.campaignExpansion,
      session.checkpointSnapshot,
      "death",
    );
    const result = resolveCrashRecovery(
      session.state,
      invalidated.campaignExpansion,
      session.checkpointSnapshot,
      invalidated.snapshot,
      "resolve",
    );

    expect(result.mode).toBe("death-rollback");
    expect(result.state.campaign.selectedStage).toBe(181);
    expect(result.state.credits).toBe(0);
    expect(result.state.expansionCurrencies.alloy).toBe(0);
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
