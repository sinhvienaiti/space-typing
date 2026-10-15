import { describe, expect, it } from "vitest";
import {
  A6_SKILL_EQUIPMENT_CAPABILITIES,
  a6SkillEquipmentCapability,
} from "../src/admin/a6-skill-equipment-capabilities";

describe("A6 Skills / Equipment capability matrix", () => {
  it("keeps capability ids unique and fail-closed", () => {
    const ids = A6_SKILL_EQUIPMENT_CAPABILITIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const entry of A6_SKILL_EQUIPMENT_CAPABILITIES) {
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

  it("keeps canonical Skill gameplay authoring open without inventing media/VFX binding", () => {
    expect(a6SkillEquipmentCapability("skill.gameplay-policy")).toMatchObject({
      persistedField: expect.stringContaining("skills.<id>"),
      canonicalOwner: "src/admin/skill-runtime-policy.ts",
      runtimeResolver: "applySkillRuntimeOverride()",
      applyBoundary: "new-session",
      status: "SUPPORTED NOW",
    });

    expect(a6SkillEquipmentCapability("skill.media-vfx-binding")).toMatchObject({
      persistedField: null,
      runtimeResolver: null,
      previewConsumer: null,
      status: "REQUIRES CANONICAL MIGRATION",
    });
  });

  it("keeps canonical Equipment gameplay authoring open while registry glyph stays read-only", () => {
    expect(a6SkillEquipmentCapability("equipment.gameplay-policy")).toMatchObject({
      persistedField: expect.stringContaining("equipment.<id>"),
      canonicalOwner: "src/admin/equipment-runtime-policy.ts",
      applyBoundary: "new-session",
      status: "SUPPORTED NOW",
    });

    expect(a6SkillEquipmentCapability("equipment.registry-icon")).toMatchObject({
      persistedField: null,
      canonicalOwner: expect.stringContaining("EquipmentDefinition.icon"),
      status: "READ-ONLY REFERENCE",
    });
  });

  it("does not expose fake Equipment media or generic VFX/SFX authoring", () => {
    expect(a6SkillEquipmentCapability("equipment.media-binding")).toMatchObject({
      persistedField: null,
      productionConsumer: null,
      status: "REQUIRES CANONICAL MIGRATION",
    });

    expect(a6SkillEquipmentCapability("equipment.vfx-sfx-binding")).toMatchObject({
      persistedField: null,
      runtimeResolver: null,
      productionConsumer: null,
      previewConsumer: null,
      status: "DEFERRED / UNSUPPORTED",
    });
  });
});
