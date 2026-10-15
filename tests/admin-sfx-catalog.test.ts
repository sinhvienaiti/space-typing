import { describe, expect, it } from "vitest";
import contract from "../contracts/space-typing-admin-sfx.v1.json" with { type: "json" };
import {
  createAdminSfxCatalog,
  resolveAdminSfxPreview,
} from "../src/audio/admin-sfx-catalog";
import { SAMPLE_SFX } from "../src/audio/sample-bank";

describe("Admin SFX runtime catalog", () => {
  it("mirrors every production SAMPLE_SFX definition without authoring drift", () => {
    const catalog = createAdminSfxCatalog();
    expect(catalog.contractRevision).toBe(contract.contractRevision);
    expect(catalog.mode).toBe("runtime-backed-readonly");
    expect(catalog.entries).toHaveLength(Object.keys(SAMPLE_SFX).length);
    expect(catalog.entries.map((entry) => entry.id)).toEqual(
      [...Object.keys(SAMPLE_SFX)].sort(),
    );

    for (const entry of catalog.entries) {
      const production = SAMPLE_SFX[entry.id];
      expect(entry.eventBinding).toBe(entry.id);
      expect(entry.source).toBe(production.path);
      expect(entry.group).toBe(production.group);
      expect(entry.runtimeGain).toBe(production.gain);
      expect(entry.poolSize).toBe(production.poolSize);
      expect(entry.authorable).toBe(false);
      expect(entry.preview).toEqual({
        kind: "production-sample-asset",
        source: production.path,
        playbackRate: { min: 0.72, max: 1.35, default: 1 },
        mutation: false,
      });
    }
  });

  it("resolves preview metadata only for real SampleSfxId values", () => {
    expect(resolveAdminSfxPreview("warning")).toMatchObject({
      id: "warning",
      eventBinding: "warning",
      source: SAMPLE_SFX.warning.path,
      runtimeGain: SAMPLE_SFX.warning.gain,
      authorable: false,
    });
    expect(resolveAdminSfxPreview("not-a-real-sfx")).toBeNull();
  });

  it("declares preview-only Admin semantics and no fake published SFX policy", () => {
    expect(contract.sfx.previewCapability).toBe(true);
    expect(contract.sfx.previewMutation).toBe(false);
    expect(contract.sfx.writeCapability).toBe(false);
    expect(contract.sfx.adminPreviewWriteCapability).toBe(false);
    expect(contract.sfx.authorableFields).toEqual([]);
    expect(contract.sfx.applyBoundary).toBe("none");
    expect(contract.sfx.unsupportedAdminMockFields).toEqual(
      expect.arrayContaining(["cooldown", "priority", "enabled", "gain override", "source override"]),
    );
  });
});
