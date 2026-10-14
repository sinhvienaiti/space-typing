import { describe, expect, it } from "vitest";
import {
  isShipReliefAssetVersionId,
  materializeShipRuntimeSession,
} from "../src/admin/ship-runtime-policy";

function sessionFor(reliefAssetVersionId: unknown, revision = "ship-revision-1") {
  return materializeShipRuntimeSession({
    activeRevision: revision,
    applyBoundary: "new-session",
    policy: {
      configRevision: revision,
      ships: {
        vanguard: { reliefAssetVersionId },
      },
    },
  });
}

describe("A5.4 exact Ship relief bundle policy", () => {
  it("persists only exact immutable Media version ids", () => {
    const exact = "media-version.ship-vanguard-relief-v7";
    expect(isShipReliefAssetVersionId(exact)).toBe(true);
    const session = sessionFor(exact);
    expect(session.source).toBe("published");
    expect(session.ships.vanguard?.reliefAssetVersionId).toBe(exact);
  });

  it.each([
    "latest",
    "media.ship-vanguard-relief",
    "/assets/models/vanguard/model.json",
    "https://cdn.example.test/vanguard.glb",
    "media-version.",
  ])("rejects mutable, logical, path or URL relief bindings: %s", (value) => {
    expect(isShipReliefAssetVersionId(value)).toBe(false);
    expect(sessionFor(value).ships.vanguard).toBeUndefined();
  });

  it("materializes historical revisions independently for rollback", () => {
    const oldSession = sessionFor("media-version.ship-vanguard-relief-v6", "ship-revision-6");
    const newSession = sessionFor("media-version.ship-vanguard-relief-v7", "ship-revision-7");

    expect(oldSession.activeRevision).toBe("ship-revision-6");
    expect(oldSession.ships.vanguard?.reliefAssetVersionId).toBe(
      "media-version.ship-vanguard-relief-v6",
    );
    expect(newSession.activeRevision).toBe("ship-revision-7");
    expect(newSession.ships.vanguard?.reliefAssetVersionId).toBe(
      "media-version.ship-vanguard-relief-v7",
    );
  });
});