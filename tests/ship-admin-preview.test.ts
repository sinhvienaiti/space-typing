import { describe, expect, it } from "vitest";
import {
  createShipAdminPreview,
  SHIP_ADMIN_PREVIEW_PROTOCOL_VERSION,
  validateShipAdminPolicy,
  type ShipAdminPolicy,
} from "../src/admin/ship-registry-preview";

describe("B06.1 Ship Admin registry", () => {
  it("exports the runtime-backed 11-ship catalog in canonical order", () => {
    const preview = createShipAdminPreview();
    expect(preview.protocolVersion).toBe(SHIP_ADMIN_PREVIEW_PROTOCOL_VERSION);
    expect(preview.configRevision).toBe("bundled-character-registry");
    expect(preview.ships).toHaveLength(11);
    expect(preview.ships[0]).toMatchObject({
      id: "vanguard",
      unlockStage: 1,
      assetId: "player-ship-vanguard",
      overridden: false,
    });
    expect(preview.ships.at(-1)).toMatchObject({ id: "zenith", unlockStage: 1000 });
  });

  it("merges authorable metadata, stat and visual overrides without changing identity", () => {
    const policy: ShipAdminPolicy = {
      configRevision: "admin-ships-test-v1",
      ships: {
        aegis: {
          name: "Aegis Mk II",
          unlockStage: 120,
          statBonus: { shield: 16 },
          visual: { wingSpan: 1.2, engineCount: 2 },
        },
      },
    };
    const aegis = createShipAdminPreview(policy).ships.find((ship) => ship.id === "aegis");
    expect(aegis).toMatchObject({
      id: "aegis",
      name: "Aegis Mk II",
      unlockStage: 120,
      assetId: "player-ship-aegis",
      overridden: true,
      statBonus: { shield: 16, armor: 8 },
      visual: { wingSpan: 1.2, engineCount: 2 },
    });
  });

  it("rejects unknown ship ids and non-authorable/player-state fields", () => {
    expect(() => validateShipAdminPolicy({
      configRevision: "bad-id",
      ships: { unknown: { name: "Nope" } } as never,
    })).toThrow(/Unknown ship id/);
    expect(() => validateShipAdminPolicy({
      configRevision: "bad-state",
      ships: { vanguard: { selected: true } as never },
    })).toThrow(/not authorable/);
  });

  it("validates authored ranges using the child runtime contract", () => {
    expect(() => validateShipAdminPolicy({
      configRevision: "bad-stage",
      ships: { aegis: { unlockStage: 1001 } },
    })).toThrow(/unlockStage/);
    expect(() => validateShipAdminPolicy({
      configRevision: "bad-stat",
      ships: { aegis: { statBonus: { shield: 999 } } },
    })).toThrow(/shield/);
    expect(() => validateShipAdminPolicy({
      configRevision: "bad-visual",
      ships: { aegis: { visual: { engineCount: 4 as never } } },
    })).toThrow(/engineCount/);
  });
});
