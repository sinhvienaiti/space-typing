import { describe, expect, it } from "vitest";
import {
  materializeShipRuntimeSession,
} from "../src/admin/ship-runtime-policy";

describe("ship runtime policy", () => {
  it("falls back to bundled registry when the apply boundary is not new-session", () => {
    const session = materializeShipRuntimeSession({
      applyBoundary: "immediate",
      activeRevision: "rev-1",
      policy: {
        configRevision: "ships-admin-v1",
        ships: {
          vanguard: { name: "Admin Vanguard" },
        },
      },
    });

    expect(session.source).toBe("bundled");
    expect(session.ships).toEqual({});
  });

  it("materializes validated published ship overrides for the next session", () => {
    const session = materializeShipRuntimeSession({
      applyBoundary: "new-session",
      activeRevision: "rev-2",
      policy: {
        configRevision: "ships-admin-v2",
        ships: {
          vanguard: {
            name: "Admin Vanguard",
            unlockStage: 7,
            statBonus: { firepower: 9, shield: 4 },
            visual: { wingSpan: 1.2, engineCount: 3, glow: "#55eeff" },
          },
        },
      },
    });

    expect(session.source).toBe("published");
    expect(session.activeRevision).toBe("rev-2");
    expect(session.configRevision).toBe("ships-admin-v2");
    expect(session.ships.vanguard?.name).toBe("Admin Vanguard");
    expect(session.ships.vanguard?.unlockStage).toBe(7);
    expect(session.ships.vanguard?.statBonus).toEqual({ firepower: 9, shield: 4 });
    expect(session.ships.vanguard?.visual).toEqual({
      wingSpan: 1.2,
      engineCount: 3,
      glow: "#55eeff",
    });
  });

  it("ignores unknown or malformed ship overrides instead of corrupting bundled gameplay", () => {
    const session = materializeShipRuntimeSession({
      applyBoundary: "new-session",
      activeRevision: "rev-3",
      policy: {
        configRevision: "ships-admin-v3",
        ships: {
          unknown: { name: "Unknown" },
          aegis: { visual: { engineCount: 9 } },
          volt: { role: "Runtime role" },
        },
      },
    });

    expect(session.source).toBe("published");
    expect(session.ships.unknown).toBeUndefined();
    expect(session.ships.aegis).toBeUndefined();
    expect(session.ships.volt?.role).toBe("Runtime role");
  });
});
