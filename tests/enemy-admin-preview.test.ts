import { describe, expect, it } from "vitest";
import {
  createEnemyAdminPreview,
  validateEnemyAdminPolicy,
} from "../src/admin/enemy-registry-preview";
import { ENEMY_DEFINITION_IDS } from "../src/enemies/registry";

describe("B06.4 Enemy Admin preview", () => {
  it("publishes the canonical Enemy registry without inventing unsupported combat fields", () => {
    const preview = createEnemyAdminPreview();
    expect(preview.protocolVersion).toBe(1);
    expect(preview.enemies.map((enemy) => enemy.id)).toEqual(ENEMY_DEFINITION_IDS);
    expect(preview.enemies).toHaveLength(ENEMY_DEFINITION_IDS.length);
    expect(preview.enemies.find((enemy) => enemy.id === "rainbow-scout")).toMatchObject({
      family: "rainbow",
      role: "normal",
      rarity: "common",
      minStage: 1,
      overridden: false,
    });
  });

  it("allows only the canonical stage-admission boundary", () => {
    const preview = createEnemyAdminPreview({
      configRevision: "enemy-admin-test",
      enemies: {
        "rainbow-dart": { minStage: 25 },
      },
    });
    expect(preview.enemies.find((enemy) => enemy.id === "rainbow-dart")).toMatchObject({
      id: "rainbow-dart",
      family: "rainbow",
      role: "swift",
      rarity: "uncommon",
      minStage: 25,
      overridden: true,
    });
  });

  it("rejects unknown IDs, immutable fields and unsafe stage values", () => {
    expect(() => validateEnemyAdminPolicy({
      configRevision: "enemy-admin-test",
      enemies: { unknown: { minStage: 20 } },
    })).toThrow(/Unknown enemy id/);
    expect(() => validateEnemyAdminPolicy({
      configRevision: "enemy-admin-test",
      enemies: { "rainbow-scout": { role: "elite" } as never },
    })).toThrow(/not authorable/);
    expect(() => validateEnemyAdminPolicy({
      configRevision: "enemy-admin-test",
      enemies: { "rainbow-scout": { minStage: 0 } },
    })).toThrow(/minStage/);
    expect(() => validateEnemyAdminPolicy({
      configRevision: "enemy-admin-test",
      enemies: { "rainbow-scout": { minStage: 1001 } },
    })).toThrow(/minStage/);
  });
});
