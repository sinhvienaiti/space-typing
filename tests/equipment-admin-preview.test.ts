import { describe, expect, it } from "vitest";
import {
  createEquipmentAdminPreview,
  validateEquipmentAdminPolicy,
} from "../src/admin/equipment-registry-preview";

describe("equipment admin preview", () => {
  it("returns the bundled registry when no policy is provided", () => {
    const preview = createEquipmentAdminPreview();
    expect(preview.configRevision).toBe("bundled-equipment-registry");
    expect(preview.equipment.length).toBe(42);
    expect(preview.equipment.every((item) => item.overridden === false)).toBe(true);
  });

  it("merges authorable fields without changing id, slot, tier or icon", () => {
    const preview = createEquipmentAdminPreview({
      configRevision: "equipment-admin-v1",
      equipment: {
        "arc-projector-mk2": {
          name: "Arc Projector Admin",
          description: "Runtime-authored description.",
          stats: { firepower: 20, focus: 5 },
          perk: null,
        },
      },
    });
    const item = preview.equipment.find((candidate) => candidate.id === "arc-projector-mk2");
    expect(item?.name).toBe("Arc Projector Admin");
    expect(item?.slot).toBe("weapon");
    expect(item?.tier).toBe(2);
    expect(item?.stats.firepower).toBe(20);
    expect(item?.stats.focus).toBe(5);
    expect(item?.perk).toBeUndefined();
    expect(item?.overridden).toBe(true);
  });

  it("rejects unknown ids, unknown stat keys and invalid perks", () => {
    expect(() => validateEquipmentAdminPolicy({
      configRevision: "equipment-admin-v1",
      equipment: { unknown: { name: "Nope" } } as never,
    })).toThrow(/Unknown equipment id/);

    expect(() => validateEquipmentAdminPolicy({
      configRevision: "equipment-admin-v1",
      equipment: {
        "pulse-laser-mk1": { stats: { speed: 10 } as never },
      },
    })).toThrow(/not a core stat/);

    expect(() => validateEquipmentAdminPolicy({
      configRevision: "equipment-admin-v1",
      equipment: {
        "arc-projector-mk2": { perk: "unknown-perk" as never },
      },
    })).toThrow(/perk is invalid/);
  });
});
