import { describe, expect, it } from "vitest";
import { createShipAssetPreviewCandidate, withShipAssetPreviewRuntime } from "../src/admin/ship-asset-preview";
import { materializeShipRuntimeSession } from "../src/admin/ship-runtime-policy";
import { playerProjectileProfile, withPlayerProjectileRuntimeSession } from "../src/characters/projectiles";
import { shotRecipeFor } from "../src/vfx/player-shots";
import { assetTuningRuntimeCapability } from "../src/admin/asset-tuning-capabilities";

describe("A5.3 Ship projectile recipe binding", () => {
  it("materializes only a known production projectile archetype", () => {
    const session = materializeShipRuntimeSession({
      activeRevision: "rev-projectile-recipe",
      applyBoundary: "new-session",
      policy: {
        configRevision: "ships-admin-a5-3",
        ships: { vanguard: { projectileArchetype: "cosmic" } },
      },
    });
    expect(session.source).toBe("published");
    expect(session.ships.vanguard?.projectileArchetype).toBe("cosmic");

    const invalid = materializeShipRuntimeSession({
      activeRevision: "rev-invalid",
      applyBoundary: "new-session",
      policy: {
        configRevision: "ships-admin-a5-3",
        ships: { vanguard: { projectileArchetype: "raw-path-or-invented" } },
      },
    });
    expect(invalid.ships.vanguard).toBeUndefined();
  });

  it("routes the published binding through the production projectile recipe and impact identity", () => {
    const session = materializeShipRuntimeSession({
      activeRevision: "rev-projectile-recipe",
      applyBoundary: "new-session",
      policy: {
        configRevision: "ships-admin-a5-3",
        ships: { vanguard: { projectileArchetype: "heavy" } },
      },
    });

    withPlayerProjectileRuntimeSession(session, () => {
      expect(playerProjectileProfile("vanguard")).toMatchObject({
        archetype: "heavy",
        impactVariant: "heavy",
      });
      expect(shotRecipeFor("vanguard")).toMatchObject({
        trailMode: "ribbon",
        fx: "aegis",
      });
    });
    expect(playerProjectileProfile("vanguard")).toMatchObject({
      archetype: "spear",
      impactVariant: "crystal",
    });
  });

  it("uses the same scoped production resolver in the Admin Fire preview candidate", () => {
    const candidate = createShipAssetPreviewCandidate(
      "vanguard",
      { primary: "#123456" },
      undefined,
      "electric",
    );
    expect(candidate.projectileArchetype).toBe("electric");
    withShipAssetPreviewRuntime(candidate, () => {
      expect(playerProjectileProfile("vanguard")).toMatchObject({
        archetype: "electric",
        impactVariant: "storm",
      });
      expect(shotRecipeFor("vanguard")).toMatchObject({
        trailMode: "zigzag",
        fx: "volt",
      });
    });
  });

  it("keeps recipe internals and miss behavior outside writable Admin fields while previewing production SFX", () => {
    expect(assetTuningRuntimeCapability("projectile.profile")).toMatchObject({
      persistedField: "ships.<id>.projectileArchetype",
      applyBoundary: "new-session",
      status: "SUPPORTED NOW",
    });
    expect(assetTuningRuntimeCapability("projectile.trail-impact-presentation")?.status).toBe("READ-ONLY REFERENCE");
    expect(assetTuningRuntimeCapability("projectile.impact-sfx-variant")).toMatchObject({
      persistedField: null,
      previewConsumer: expect.stringContaining("asset-preview-main.ts"),
      status: "READ-ONLY REFERENCE",
    });
    expect(assetTuningRuntimeCapability("projectile.launch-sfx")).toMatchObject({
      persistedField: null,
      previewConsumer: expect.stringContaining("asset-preview-main.ts"),
      status: "READ-ONLY REFERENCE",
    });
    expect(assetTuningRuntimeCapability("projectile.miss-presentation")?.status).toBe("DEFERRED / UNSUPPORTED");
    expect(assetTuningRuntimeCapability("weapon.admin-entity")?.status).toBe("DEFERRED / UNSUPPORTED");
  });
});
