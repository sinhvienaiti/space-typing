import { describe, expect, it } from "vitest";
import { materializeEnemyRuntimeSession } from "../src/admin/enemy-runtime-policy";

describe("B06.4 Enemy runtime policy", () => {
  it("materializes only validated published Enemy admission overrides", () => {
    const session = materializeEnemyRuntimeSession({
      activeRevision: "r-enemy-1",
      applyBoundary: "new-session",
      policy: {
        configRevision: "enemy-admin-v1",
        enemies: {
          "rainbow-dart": { minStage: 25 },
          unknown: { minStage: 10 },
        },
      },
    });
    expect(session.source).toBe("published");
    expect(session.activeRevision).toBe("r-enemy-1");
    expect(session.enemies).toEqual({ "rainbow-dart": { minStage: 25 } });
  });

  it("falls back to bundled values for malformed envelopes", () => {
    expect(materializeEnemyRuntimeSession({
      activeRevision: "r-enemy-2",
      applyBoundary: "live",
      policy: { configRevision: "enemy-admin-v1", enemies: {} },
    }).source).toBe("bundled");

    expect(materializeEnemyRuntimeSession({
      activeRevision: "r-enemy-3",
      applyBoundary: "new-session",
      policy: {
        configRevision: "enemy-admin-v1",
        enemies: { "rainbow-scout": { minStage: 0 } },
      },
    }).enemies).toEqual({});
  });
});
