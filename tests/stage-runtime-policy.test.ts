import { describe, expect, it } from "vitest";
import { materializeStageRuntimeSession } from "../src/admin/stage-runtime-policy";
import {
  createBundledStageConfig,
  resolveStageConfig,
} from "../src/campaign/stage";
import { createStagePacingPlan } from "../src/campaign/stage-pacing";

describe("Stage Admin runtime policy", () => {
  it("materializes supported stage overrides", () => {
    const session = materializeStageRuntimeSession({
      applyBoundary: "new-session",
      activeRevision: "rev-17",
      policy: {
        configRevision: "stages-admin-test",
        stages: [
          { stage: 17, enemyBudget: 73, eliteChance: 0.31, modifierSlots: 2 },
        ],
      },
    });

    expect(session).toMatchObject({
      source: "published",
      activeRevision: "rev-17",
      configRevision: "stages-admin-test",
    });
    expect(session.stages[17]).toEqual({
      enemyBudget: 73,
      eliteChance: 0.31,
      modifierSlots: 2,
    });
  });

  it("falls back defensively for malformed, duplicate or structural overrides", () => {
    const badPolicies = [
      { configRevision: "bad-stage", stages: [{ stage: 0, enemyBudget: 10 }] },
      { configRevision: "bad-budget", stages: [{ stage: 2, enemyBudget: 0 }] },
      { configRevision: "bad-chance", stages: [{ stage: 2, eliteChance: 1.01 }] },
      { configRevision: "bad-slots", stages: [{ stage: 2, modifierSlots: 5 }] },
      {
        configRevision: "duplicate",
        stages: [{ stage: 8, enemyBudget: 40 }, { stage: 8, enemyBudget: 41 }],
      },
      { configRevision: "structural", stages: [{ stage: 8, role: "boss" }] },
    ];

    for (const policy of badPolicies) {
      const session = materializeStageRuntimeSession({
        applyBoundary: "new-session",
        activeRevision: "rev-current",
        policy,
      });
      expect(session.source).toBe("bundled");
      expect(session.stages).toEqual({});
    }
  });

  it("changes real pacing inputs while preserving structural stage invariants", () => {
    const bundled = createBundledStageConfig(37);
    const resolved = resolveStageConfig(bundled, {
      enemyBudget: bundled.enemyBudget + 11,
      eliteChance: 0.27,
      modifierSlots: 3,
    });

    expect(resolved).toMatchObject({
      stage: bundled.stage,
      galaxy: bundled.galaxy,
      stageInGalaxy: bundled.stageInGalaxy,
      role: bundled.role,
      seed: bundled.seed,
      enemyBudget: bundled.enemyBudget + 11,
      eliteChance: 0.27,
      modifierSlots: 3,
    });
    expect(createStagePacingPlan(resolved).totalBudget).toBe(
      Math.floor(bundled.enemyBudget + 11),
    );
  });
});
