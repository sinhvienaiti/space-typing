import { describe, expect, it } from "vitest";
import { materializeShipRuntimeSession } from "../src/admin/ship-runtime-policy";
import { characterVisualProfile } from "../src/characters/visuals";

describe("Admin ship visual runtime authority", () => {
  it("feeds a published visual override into the canonical production renderer profile", () => {
    const session = materializeShipRuntimeSession({
      activeRevision: "rev-ship-visual",
      applyBoundary: "new-session",
      policy: {
        configRevision: "ships-admin-v2",
        ships: {
          vanguard: {
            visual: {
              silhouette: "blade",
              primary: "#123456",
              wingSpan: 1.4,
              engineCount: 3,
            },
          },
        },
      },
    });

    const profile = characterVisualProfile("vanguard", session);

    expect(session.source).toBe("published");
    expect(profile.silhouette).toBe("blade");
    expect(profile.primary).toBe("#123456");
    expect(profile.wingSpan).toBe(1.4);
    expect(profile.engineCount).toBe(3);
    expect(profile.secondary).toBe("#4d85ff");
    expect(profile.bodyLength).toBe(1);
  });

  it("fails closed to the bundled renderer profile when the published visual is invalid", () => {
    const invalidSession = materializeShipRuntimeSession({
      activeRevision: "rev-invalid-ship-visual",
      applyBoundary: "new-session",
      policy: {
        configRevision: "ships-admin-v2",
        ships: {
          vanguard: {
            visual: {
              wingSpan: 99,
              arbitraryPath: "/tmp/not-a-runtime-asset.png",
            },
          },
        },
      },
    });
    const bundledSession = materializeShipRuntimeSession({
      applyBoundary: "invalid-boundary",
    });

    expect(invalidSession.ships.vanguard).toBeUndefined();
    expect(characterVisualProfile("vanguard", invalidSession)).toEqual(
      characterVisualProfile("vanguard", bundledSession),
    );
  });

  it("caches the immutable resolved profile for the lifetime of a runtime session", () => {
    const session = materializeShipRuntimeSession({
      activeRevision: "rev-cached-ship-visual",
      applyBoundary: "new-session",
      policy: {
        configRevision: "ships-admin-v2",
        ships: {
          aegis: {
            visual: { glow: "#abcdef" },
          },
        },
      },
    });

    expect(characterVisualProfile("aegis", session)).toBe(
      characterVisualProfile("aegis", session),
    );
  });
});
