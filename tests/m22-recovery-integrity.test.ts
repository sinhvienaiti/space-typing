import { describe, expect, it } from "vitest";
import {
  createTestLabSession,
} from "../src/test-lab/session";
import {
  captureCrashRecoverySnapshot,
  invalidateCrashRecoverySnapshot,
  resolveCrashRecovery,
} from "../src/persistence/crash-recovery";
import {
  consumePhoenixCore,
  createStageEntrySnapshot,
  resolveSalvageAnchor,
  resolveStageRevivalCore,
} from "../src/persistence/death-protection";
import { addItem } from "../src/items/inventory";

const STAGES = [10, 190, 500, 750, 1000];

describe("M22 checkpoint / death / recovery integrity audit", () => {
  it("rolls active economic gains back on ordinary death at sampled Campaign bands", () => {
    for (const stage of STAGES) {
      const session = createTestLabSession(
        stage,
        Math.floor((stage - 1) / 10) * 10 + 1,
        "m22",
      );
      session.state.credits = 20_000 + stage;
      session.state.expansionCurrencies.alloy = 100 + stage;
      session.state.inventory = addItem(
        session.state.inventory,
        "repair-kit",
        25,
      ).inventory;

      const invalidated = invalidateCrashRecoverySnapshot(
        session.crashRecoverySnapshot,
        session.state,
        session.campaignExpansion,
        session.checkpointSnapshot,
        "death-" + String(stage),
      );
      const result = resolveCrashRecovery(
        session.state,
        invalidated.campaignExpansion,
        session.checkpointSnapshot,
        invalidated.snapshot,
        "resolve-" + String(stage),
      );

      expect(result.mode, "Stage " + String(stage)).toBe(
        "death-rollback",
      );
      expect(result.state.credits, "Stage " + String(stage)).toBe(
        session.checkpointSnapshot.credits,
      );
      expect(
        result.state.expansionCurrencies,
        "Stage " + String(stage),
      ).toEqual(session.checkpointSnapshot.expansionCurrencies);
      expect(
        result.state.inventory,
        "Stage " + String(stage),
      ).toEqual(session.checkpointSnapshot.inventory);
    }
  });

  it("preserves active economic gains with Salvage Anchor but still rolls frontier", () => {
    for (const stage of STAGES) {
      const session = createTestLabSession(
        stage,
        Math.floor((stage - 1) / 10) * 10 + 1,
        "m22",
      );
      session.state.credits = 30_000 + stage;
      session.state.expansionCurrencies.starCrystal = 7;
      session.state.inventory = addItem(
        session.state.inventory,
        "salvage-anchor",
        1,
      ).inventory;

      const result = resolveSalvageAnchor(
        session.state,
        session.campaignExpansion,
        session.checkpointSnapshot,
        "salvage-" + String(stage),
      );

      expect(result.applied, "Stage " + String(stage)).toBe(true);
      expect(result.state.credits).toBe(30_000 + stage);
      expect(result.state.expansionCurrencies.starCrystal).toBe(7);
      expect(result.state.inventory["salvage-anchor"] ?? 0).toBe(0);
      expect(result.state.campaign.selectedStage).toBe(
        session.checkpointSnapshot.campaign.selectedStage,
      );
    }
  });

  it("restores stage-entry economy with Stage Revival Core and consumes exactly one item", () => {
    for (const stage of STAGES) {
      const session = createTestLabSession(
        stage,
        Math.floor((stage - 1) / 10) * 10 + 1,
        "m22",
      );
      session.state.inventory = addItem(
        session.state.inventory,
        "stage-revival-core",
        2,
      ).inventory;
      session.stageEntrySnapshot = createStageEntrySnapshot(
        session.state,
        session.campaignExpansion,
        session.checkpointSnapshot,
        "entry-" + String(stage),
      );

      session.state.credits = 50_000 + stage;
      session.state.expansionCurrencies.quantumCore = 9;
      session.state.inventory = addItem(
        session.state.inventory,
        "repair-kit",
        17,
      ).inventory;

      const result = resolveStageRevivalCore(
        session.state,
        session.stageEntrySnapshot,
      );

      expect(result, "Stage " + String(stage)).not.toBeNull();
      expect(result?.applied).toBe(true);
      expect(result?.state.credits).toBe(0);
      expect(result?.state.expansionCurrencies.quantumCore).toBe(0);
      expect(result?.state.inventory["repair-kit"] ?? 0).toBe(0);
      expect(result?.state.inventory["stage-revival-core"]).toBe(1);
    }
  });

  it("consumes Phoenix Core without committing or duplicating segment economy", () => {
    for (const stage of STAGES) {
      const session = createTestLabSession(
        stage,
        Math.floor((stage - 1) / 10) * 10 + 1,
        "m22",
      );
      session.state.credits = 40_000 + stage;
      session.state.inventory = addItem(
        session.state.inventory,
        "phoenix-core",
        2,
      ).inventory;

      const first = consumePhoenixCore(session.state);
      const second = consumePhoenixCore(first.state);

      expect(first.applied).toBe(true);
      expect(second.applied).toBe(true);
      expect(first.state.credits).toBe(40_000 + stage);
      expect(second.state.credits).toBe(40_000 + stage);
      expect(first.state.inventory["phoenix-core"]).toBe(1);
      expect(second.state.inventory["phoenix-core"] ?? 0).toBe(0);
    }
  });

  it("replaying the same technical crash snapshot is idempotent for rewards", () => {
    for (const stage of STAGES) {
      const session = createTestLabSession(
        stage,
        Math.floor((stage - 1) / 10) * 10 + 1,
        "m22",
      );
      session.state.credits = 12_345 + stage;
      session.state.expansionCurrencies.alloy = 77;

      const captured = captureCrashRecoverySnapshot(
        session.state,
        session.campaignExpansion,
        session.checkpointSnapshot,
        "manual",
        "capture-" + String(stage),
      );
      const first = resolveCrashRecovery(
        session.state,
        captured.campaignExpansion,
        session.checkpointSnapshot,
        captured.snapshot,
        "first-" + String(stage),
      );
      const second = resolveCrashRecovery(
        first.state,
        first.campaignExpansion,
        first.checkpointSnapshot,
        captured.snapshot,
        "second-" + String(stage),
      );

      expect(first.mode).toBe("crash");
      expect(second.mode).toBe("crash");
      expect(second.state.credits).toBe(first.state.credits);
      expect(second.state.expansionCurrencies).toEqual(
        first.state.expansionCurrencies,
      );
      expect(second.state.inventory).toEqual(first.state.inventory);
    }
  });
});
