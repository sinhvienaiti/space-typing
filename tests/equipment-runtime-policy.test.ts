import { describe, expect, it } from "vitest";
import { materializeEquipmentRuntimeSession } from "../src/admin/equipment-runtime-policy";

describe("equipment runtime policy", () => {
  it("falls back to bundled registry outside the new-session boundary", () => {
    const session = materializeEquipmentRuntimeSession({
      applyBoundary: "immediate",
      activeRevision: "rev-1",
      policy: {
        configRevision: "equipment-admin-v1",
        equipment: {
          "pulse-laser-mk1": { name: "Admin Laser" },
        },
      },
    });

    expect(session.source).toBe("bundled");
    expect(session.equipment).toEqual({});
  });

  it("materializes validated equipment overrides for a new session", () => {
    const session = materializeEquipmentRuntimeSession({
      applyBoundary: "new-session",
      activeRevision: "rev-2",
      policy: {
        configRevision: "equipment-admin-v2",
        equipment: {
          "arc-projector-mk2": {
            name: "Admin Arc Projector",
            description: "Admin-authored runtime description",
            stats: { firepower: 20, focus: 5 },
            perk: null,
          },
        },
      },
    });

    expect(session.source).toBe("published");
    expect(session.activeRevision).toBe("rev-2");
    expect(session.configRevision).toBe("equipment-admin-v2");
    expect(session.equipment["arc-projector-mk2"]).toEqual({
      name: "Admin Arc Projector",
      description: "Admin-authored runtime description",
      stats: { firepower: 20, focus: 5 },
      perk: null,
    });
  });

  it("ignores unknown ids and malformed overrides instead of corrupting gameplay", () => {
    const session = materializeEquipmentRuntimeSession({
      applyBoundary: "new-session",
      activeRevision: "rev-3",
      policy: {
        configRevision: "equipment-admin-v3",
        equipment: {
          unknown: { name: "Unknown" },
          "pulse-laser-mk1": { stats: { speed: 5 } },
          "arc-projector-mk2": { perk: "arc-emitter" },
        },
      },
    });

    expect(session.source).toBe("published");
    expect(session.equipment.unknown).toBeUndefined();
    expect(session.equipment["pulse-laser-mk1"]).toBeUndefined();
    expect(session.equipment["arc-projector-mk2"]?.perk).toBe("arc-emitter");
  });
});
