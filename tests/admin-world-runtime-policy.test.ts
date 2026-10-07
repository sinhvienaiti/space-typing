import { describe, expect, it } from "vitest";
import {
  materializeWorldRuntimeSession,
  resolveWorldProfileForRuntime,
} from "../src/admin/world-runtime-policy";
import { worldById } from "../src/worlds/registry";
import { worldRuntimeEnemyDefinitionIdForWorld } from "../src/worlds/roster";

describe("Admin World runtime policy", () => {
  it("materializes a valid enemyRoster override and rejects malformed policy", () => {
    const session = materializeWorldRuntimeSession({
      protocolVersion: 1,
      activeRevision: "rev-world-2",
      applyBoundary: "new-session",
      policy: {
        configRevision: "worlds-admin-test",
        worlds: { "world-01": { enemyRoster: ["rainbow-dart"] } },
      },
    });
    expect(session.source).toBe("published");
    expect(session.worlds["world-01"]?.enemyRoster).toEqual(["rainbow-dart"]);

    const invalid = materializeWorldRuntimeSession({
      activeRevision: "rev-bad",
      applyBoundary: "new-session",
      policy: {
        configRevision: "worlds-bad",
        worlds: { "world-01": { enemyRoster: ["imp-spark"] } },
      },
    });
    expect(invalid.source).toBe("bundled");
    expect(invalid.worlds).toEqual({});
  });

  it("preserves structural World fields while changing the gameplay roster", () => {
    const bundled = worldById("world-01");
    expect(bundled).toBeDefined();
    const effective = resolveWorldProfileForRuntime(bundled!, { enemyRoster: ["rainbow-dart"] });
    expect(effective.id).toBe(bundled!.id);
    expect(effective.galaxy).toBe(bundled!.galaxy);
    expect(effective.stageStart).toBe(bundled!.stageStart);
    expect(effective.stageEnd).toBe(bundled!.stageEnd);
    expect(effective.enemyFamilies).toBe(bundled!.enemyFamilies);
    expect(effective.enemyRoster).toEqual(["rainbow-dart"]);
    expect(effective.elitePool).toEqual([]);
    expect(worldRuntimeEnemyDefinitionIdForWorld(effective, "scout", false, 0)).toBe("rainbow-dart");
  });
});
