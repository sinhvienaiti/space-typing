import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

function runPreview(input: unknown): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync("pnpm", ["exec", "tsx", "scripts/admin/stage-config-preview.ts"], {
    cwd: rootDir,
    input: JSON.stringify(input),
    encoding: "utf8",
    timeout: 15000,
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe("Stage Admin preview protocol", () => {
  it("returns all 1000 bundled stages when no policy is supplied", () => {
    const result = runPreview({});
    expect(result.status, result.stderr).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      protocolVersion: number;
      configRevision: string;
      authorableFields: string[];
      stages: Array<{ stage: number; overridden: boolean; pacingBudget: number }>;
    };

    expect(payload.protocolVersion).toBe(1);
    expect(payload.configRevision).toBe("bundled-stage-config");
    expect(payload.authorableFields).toEqual(["enemyBudget", "eliteChance", "modifierSlots"]);
    expect(payload.stages).toHaveLength(1000);
    expect(payload.stages.every((stage) => stage.overridden === false)).toBe(true);
  });

  it("applies gameplay-backed overrides without mutating structural fields", () => {
    const baseResult = runPreview({});
    expect(baseResult.status, baseResult.stderr).toBe(0);
    const basePayload = JSON.parse(baseResult.stdout) as {
      stages: Array<Record<string, unknown> & { stage: number }>;
    };
    const bundled = basePayload.stages.find((entry) => entry.stage === 37);
    expect(bundled).toBeTruthy();

    const result = runPreview({
      policy: {
        configRevision: "stages-admin-test",
        stages: [{ stage: 37, enemyBudget: 88, eliteChance: 0.33, modifierSlots: 3 }],
      },
    });
    expect(result.status, result.stderr).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      configRevision: string;
      stages: Array<Record<string, unknown> & {
        stage: number;
        enemyBudget: number;
        eliteChance: number;
        modifierSlots: number;
        pacingBudget: number;
        overridden: boolean;
      }>;
    };

    const stage = payload.stages.find((entry) => entry.stage === 37);
    expect(payload.configRevision).toBe("stages-admin-test");
    expect(stage).toMatchObject({
      stage: 37,
      enemyBudget: 88,
      eliteChance: 0.33,
      modifierSlots: 3,
      pacingBudget: 88,
      overridden: true,
    });
    for (const key of ["galaxy", "stageInGalaxy", "role", "seed"]) {
      expect(stage?.[key]).toEqual(bundled?.[key]);
    }
  });

  it("rejects malformed and duplicate stage policies", () => {
    const invalidPolicies = [
      { configRevision: "bad-stage", stages: [{ stage: 1001, enemyBudget: 40 }] },
      { configRevision: "bad-field", stages: [{ stage: 12, seed: 9 }] },
      {
        configRevision: "duplicate-stage",
        stages: [{ stage: 12, enemyBudget: 40 }, { stage: 12, enemyBudget: 41 }],
      },
    ];

    for (const policy of invalidPolicies) {
      const result = runPreview({ policy });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Stage Admin preview policy is malformed or incompatible");
    }
  });
});
