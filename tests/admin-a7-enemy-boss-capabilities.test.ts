import { describe, expect, it } from "vitest";
import {
  A7_ENEMY_BOSS_CAPABILITIES,
  a7EnemyBossCapability,
} from "../src/admin/a7-enemy-boss-capabilities";

describe("A7 Enemies / Bosses capability matrix", () => {
  it("keeps capability ids unique and supported authoring production-backed", () => {
    const ids = A7_ENEMY_BOSS_CAPABILITIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const entry of A7_ENEMY_BOSS_CAPABILITIES) {
      expect(entry.canonicalOwner.length).toBeGreaterThan(0);
      expect(entry.note.length).toBeGreaterThan(0);
      if (entry.status === "SUPPORTED NOW") {
        expect(entry.persistedField).not.toBeNull();
        expect(entry.validator).not.toBeNull();
        expect(entry.runtimeResolver).not.toBeNull();
        expect(entry.productionConsumer).not.toBeNull();
        expect(entry.previewConsumer).not.toBeNull();
        expect(entry.applyBoundary).toBe("new-session");
      }
    }
  });

  it("keeps the global Enemy projectile policy open because it reaches production", () => {
    expect(a7EnemyBossCapability("enemy.projectile-mode")).toMatchObject({
      persistedField: "projectileMode",
      canonicalOwner: "src/admin/enemy-runtime-policy.ts",
      runtimeResolver: expect.stringContaining("resolveEnemyProjectileMode"),
      productionConsumer: expect.stringContaining("normalEnemyProjectilesEnabled"),
      applyBoundary: "new-session",
      status: "SUPPORTED NOW",
    });
  });

  it("does not claim Enemy minStage is production-backed just because preview can merge it", () => {
    expect(a7EnemyBossCapability("enemy.min-stage")).toMatchObject({
      persistedField: "enemies.<id>.minStage",
      validator: expect.stringContaining("validateEnemyAdminPolicy"),
      runtimeResolver: null,
      productionConsumer: null,
      previewConsumer: expect.stringContaining("createEnemyAdminPreview"),
      applyBoundary: "none",
      status: "REQUIRES CANONICAL MIGRATION",
    });
  });

  it("keeps bundled Enemy identity, reward and visual data read-only", () => {
    expect(a7EnemyBossCapability("enemy.registry-identity-reward-visual")).toMatchObject({
      persistedField: null,
      canonicalOwner: "src/enemies/registry.ts",
      runtimeResolver: expect.stringContaining("enemyDefinition"),
      status: "READ-ONLY REFERENCE",
    });

    expect(a7EnemyBossCapability("enemy.media-vfx-binding")).toMatchObject({
      persistedField: null,
      validator: null,
      runtimeResolver: null,
      status: "REQUIRES CANONICAL MIGRATION",
    });
  });

  it("keeps Boss name/title closed until the published override reaches bossIdentityForStage", () => {
    expect(a7EnemyBossCapability("boss.metadata-name-title")).toMatchObject({
      persistedField: "bosses.<id>.{name,title}",
      canonicalOwner: "src/admin/boss-runtime-policy.ts",
      runtimeResolver: null,
      productionConsumer: null,
      previewConsumer: expect.stringContaining("boss-registry-preview"),
      applyBoundary: "none",
      status: "REQUIRES CANONICAL MIGRATION",
    });
  });

  it("keeps Boss identity, stage usage and combat mechanics as read-only production references", () => {
    expect(a7EnemyBossCapability("boss.identity-stage-usage")).toMatchObject({
      persistedField: null,
      runtimeResolver: expect.stringContaining("bossIdentityForStage"),
      productionConsumer: expect.stringContaining("Game.ts"),
      status: "READ-ONLY REFERENCE",
    });

    expect(a7EnemyBossCapability("boss.phase-mechanics")).toMatchObject({
      persistedField: null,
      runtimeResolver: expect.stringContaining("bossPhaseFor"),
      productionConsumer: "Game.ts boss combat loop",
      status: "READ-ONLY REFERENCE",
    });
  });

  it("does not invent Boss Media/VFX/SFX or reward authoring seams", () => {
    expect(a7EnemyBossCapability("boss.media-vfx-sfx-binding")).toMatchObject({
      persistedField: null,
      validator: null,
      runtimeResolver: null,
      status: "REQUIRES CANONICAL MIGRATION",
    });

    expect(a7EnemyBossCapability("boss.reward-drop-binding")).toMatchObject({
      persistedField: null,
      runtimeResolver: null,
      productionConsumer: null,
      previewConsumer: null,
      status: "DEFERRED / UNSUPPORTED",
    });
  });
});
