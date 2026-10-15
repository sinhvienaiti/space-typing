import { describe, expect, it } from "vitest";
import { materializeEnemyRuntimeSession } from "../src/admin/enemy-runtime-policy";
import {
  normalEnemyProjectilesEnabled,
  resolveEnemyProjectileMode,
} from "../src/combat/enemy-projectile-policy";

describe("Admin enemy projectile authority", () => {
  it("materializes the published normal-enemy projectile policy", () => {
    const session = materializeEnemyRuntimeSession({
      activeRevision: "rev-projectiles",
      applyBoundary: "new-session",
      policy: {
        configRevision: "enemies-admin-v1",
        projectileMode: "off",
        enemies: {},
      },
    });

    expect(session.source).toBe("published");
    expect(session.projectileMode).toBe("off");
  });

  it("preserves legacy local behaviour when an older runtime omits the policy", () => {
    const session = materializeEnemyRuntimeSession({
      activeRevision: "rev-old",
      applyBoundary: "new-session",
      policy: { configRevision: "enemies-admin-v1", enemies: {} },
    });

    expect(session.source).toBe("published");
    expect(session.projectileMode).toBeNull();
    expect(resolveEnemyProjectileMode("on", session.projectileMode)).toBe("on");
  });

  it("makes Admin authoritative over a conflicting persisted player value", () => {
    expect(resolveEnemyProjectileMode("on", "off")).toBe("off");
    expect(resolveEnemyProjectileMode("off", "on")).toBe("on");
    expect(normalEnemyProjectilesEnabled("on", { normalEnemyProjectilesDefault: 1 }, "off")).toBe(false);
    expect(normalEnemyProjectilesEnabled("off", { normalEnemyProjectilesDefault: 0 }, "on")).toBe(true);
  });

  it("fails soft to legacy authority for an invalid published value", () => {
    const session = materializeEnemyRuntimeSession({
      activeRevision: "rev-invalid",
      applyBoundary: "new-session",
      policy: {
        configRevision: "enemies-admin-v1",
        projectileMode: "boss-only",
        enemies: {},
      },
    });

    expect(session.source).toBe("published");
    expect(session.projectileMode).toBeNull();
  });
});
