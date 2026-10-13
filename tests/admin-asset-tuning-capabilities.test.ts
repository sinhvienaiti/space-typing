import { describe, expect, it } from "vitest";
import {
  ASSET_TUNING_CAPABILITY_STATUSES,
  ASSET_TUNING_RUNTIME_CAPABILITIES,
  assetTuningRuntimeCapability,
} from "../src/admin/asset-tuning-capabilities";

describe("A5 asset tuning runtime capability matrix", () => {
  it("keeps every capability uniquely classified by an allowed A5.0 status", () => {
    const ids = ASSET_TUNING_RUNTIME_CAPABILITIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);

    const statuses = new Set(ASSET_TUNING_CAPABILITY_STATUSES);
    for (const entry of ASSET_TUNING_RUNTIME_CAPABILITIES) {
      expect(statuses.has(entry.status)).toBe(true);
      expect(entry.canonicalOwner.length).toBeGreaterThan(0);
      expect(entry.note.length).toBeGreaterThan(0);
    }
  });

  it("allows SUPPORTED NOW only when the complete canonical authoring chain is named", () => {
    for (const entry of ASSET_TUNING_RUNTIME_CAPABILITIES) {
      if (entry.status !== "SUPPORTED NOW") continue;
      expect(entry.persistedField).not.toBeNull();
      expect(entry.validator).not.toBeNull();
      expect(entry.runtimeResolver).not.toBeNull();
      expect(entry.productionConsumer).not.toBeNull();
      expect(entry.previewConsumer).not.toBeNull();
      expect(entry.applyBoundary).not.toBe("none");
    }
  });

  it("promotes Ship visual tuning only after the production preview harness closes the chain", () => {
    expect(assetTuningRuntimeCapability("ship.visual.procedural-profile")).toMatchObject({
      persistedField: expect.stringContaining("ships.<id>.visual"),
      runtimeResolver: expect.stringContaining("characterVisualProfile"),
      productionConsumer: expect.stringContaining("drawCharacterShip"),
      previewConsumer: expect.stringContaining("asset-preview-main.ts"),
      applyBoundary: "new-session",
      status: "SUPPORTED NOW",
    });
  });

  it("promotes exact-version per-Ship 2D image assignment only after Media V2 closes the runtime and preview chain", () => {
    expect(assetTuningRuntimeCapability("ship-2d.image-assignment")).toMatchObject({
      persistedField: "ships.<id>.imageAssetVersionId",
      canonicalOwner: expect.stringContaining("ship-runtime-policy.ts"),
      validator: expect.stringContaining("assetVersionId"),
      runtimeResolver: expect.stringContaining("resolveExactShipImageComponent"),
      productionConsumer: expect.stringContaining("drawCharacterShip"),
      previewConsumer: expect.stringContaining("asset-preview-main.ts"),
      applyBoundary: "new-session",
      status: "SUPPORTED NOW",
    });
  });

  it("does not promote draw-time motion arguments into persisted Admin fields", () => {
    expect(assetTuningRuntimeCapability("ship.motion.aim-recoil-boost")).toMatchObject({
      persistedField: null,
      status: "READ-ONLY REFERENCE",
    });
    expect(assetTuningRuntimeCapability("ship.presentation.uniform-scale")).toMatchObject({
      persistedField: null,
      status: "REQUIRES CANONICAL MIGRATION",
    });
    expect(assetTuningRuntimeCapability("ship.presentation.offset-x-y")).toMatchObject({
      persistedField: null,
      status: "REQUIRES CANONICAL MIGRATION",
    });
  });

  it("keeps current relief 3D real while arbitrary and animated GLB stay unsupported", () => {
    expect(assetTuningRuntimeCapability("ship-3d.relief-current-bundle")).toMatchObject({
      runtimeResolver: expect.stringContaining("loadReliefShip"),
      productionConsumer: expect.stringContaining("DuelShip3D.create"),
      status: "READ-ONLY REFERENCE",
    });
    expect(assetTuningRuntimeCapability("ship-3d.arbitrary-glb")).toMatchObject({
      persistedField: null,
      runtimeResolver: null,
      productionConsumer: null,
      status: "DEFERRED / UNSUPPORTED",
    });
    expect(assetTuningRuntimeCapability("ship-3d.animated-glb-semantic-clips")?.status).toBe(
      "DEFERRED / UNSUPPORTED",
    );
  });

  it("fails closed for generic VFX, mixed SFX and an unproven Weapon domain", () => {
    expect(assetTuningRuntimeCapability("vfx.current-production")?.status).toBe(
      "READ-ONLY REFERENCE",
    );
    expect(assetTuningRuntimeCapability("vfx.generic-authoring")?.status).toBe(
      "DEFERRED / UNSUPPORTED",
    );
    expect(assetTuningRuntimeCapability("sfx.sample-backed-cue")?.status).toBe(
      "READ-ONLY REFERENCE",
    );
    expect(assetTuningRuntimeCapability("sfx.synthesized-preset")?.status).toBe(
      "READ-ONLY REFERENCE",
    );
    expect(assetTuningRuntimeCapability("weapon.admin-entity")?.status).toBe(
      "DEFERRED / UNSUPPORTED",
    );
  });

  it("keeps relief Media assignment gated until its own exact-version migration exists", () => {
    expect(assetTuningRuntimeCapability("ship-3d.relief-asset-version-assignment")).toMatchObject({
      persistedField: null,
      status: "REQUIRES CANONICAL MIGRATION",
    });
  });
});
