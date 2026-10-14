import { describe, expect, it } from "vitest";
import {
  createShipAdminPreview,
  validateShipAdminPolicy,
} from "../src/admin/ship-registry-preview";

describe("A5.4 Ship registry relief preview materialization", () => {
  it("returns an exact relief bundle from the same validated Draft policy", () => {
    const exact = "media-version.ship-vanguard-relief-v10";
    const policy = {
      configRevision: "ships-a5-4-preview-v1",
      ships: {
        vanguard: { reliefAssetVersionId: exact },
      },
    } as const;

    expect(() => validateShipAdminPolicy(policy)).not.toThrow();
    const preview = createShipAdminPreview(policy);
    const vanguard = preview.ships.find((ship) => ship.id === "vanguard");
    expect(vanguard?.reliefAssetVersionId).toBe(exact);
    expect(vanguard?.overridden).toBe(true);
  });

  it.each([
    "latest",
    "media.ship-vanguard-relief",
    "/assets/space-typing/ships/vanguard.glb",
    "https://cdn.example.test/vanguard.glb",
  ])("rejects non-exact relief ownership before preview: %s", (reliefAssetVersionId) => {
    expect(() => validateShipAdminPolicy({
      configRevision: "ships-a5-4-preview-invalid",
      ships: { vanguard: { reliefAssetVersionId } },
    })).toThrow(/canonical Media V2 version id/);
  });

  it("omits relief ownership for bundled fallback instead of inventing an id", () => {
    const preview = createShipAdminPreview();
    const vanguard = preview.ships.find((ship) => ship.id === "vanguard");
    expect(vanguard?.reliefAssetVersionId).toBeUndefined();
  });
});