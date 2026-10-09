import { describe, expect, it, vi } from "vitest";
import {
  secretRoutePresentation,
  secretRoutePresentationsForStage,
} from "../src/campaign/secret-route";
import {
  createHiddenDiscoveryState,
  hiddenCodexEntries,
  rollHiddenDiscovery,
  sanitizeHiddenDiscoveryState,
} from "../src/discovery/hidden-content";
import { currentHiddenDiscoveryPresentation } from "../src/discovery/hidden-discovery-presentation";
import { activateSecretRoutePresentation } from "../src/ui/secret-route-map";

describe("secret Campaign route", () => {
  it("restores the same secret nodes after a serialized save/load round trip", () => {
    const state = createHiddenDiscoveryState("campaign-secret-restore");
    state.discovered = ["black-market-signal", "hidden-station-signal"];
    state.discoveryStages = {
      "black-market-signal": 25,
      "hidden-station-signal": 40,
    };

    const before = secretRoutePresentationsForStage(35, state);
    const restored = sanitizeHiddenDiscoveryState(
      JSON.parse(JSON.stringify(state)),
    );
    const after = secretRoutePresentationsForStage(35, restored);

    expect(after).toEqual(before);
    expect(after.map((entry) => entry.action)).toEqual([
      "open-black-market",
      "open-hidden-station",
    ]);
  });

  it("publishes a cloned presentation snapshot from the canonical Codex/load path", () => {
    const state = createHiddenDiscoveryState("campaign-secret-bridge");
    state.discovered = ["black-market-signal", "hidden-station-signal"];
    state.discoveryStages = {
      "black-market-signal": 25,
      "hidden-station-signal": 40,
    };

    hiddenCodexEntries(state);
    const first = currentHiddenDiscoveryPresentation();
    expect(first?.seedIdentity).toBe("campaign-secret-bridge");
    expect(first?.discovered).toEqual([
      "black-market-signal",
      "hidden-station-signal",
    ]);

    first?.discovered.pop();
    expect(currentHiddenDiscoveryPresentation()?.discovered).toEqual([
      "black-market-signal",
      "hidden-station-signal",
    ]);
  });

  it("publishes the resolved roll instead of the pre-roll state", () => {
    const state = createHiddenDiscoveryState("campaign-secret-roll-bridge");
    const result = rollHiddenDiscovery(state, 25, 0, () => 0);

    expect(result.discovery?.id).toBe("black-market-signal");
    expect(currentHiddenDiscoveryPresentation()?.discovered).toEqual([
      "black-market-signal",
    ]);
    expect(
      currentHiddenDiscoveryPresentation()?.discoveryStages[
        "black-market-signal"
      ],
    ).toBe(25);
  });

  it("does not expose or select a secret location before it is discovered", () => {
    const state = createHiddenDiscoveryState("campaign-secret-locked");
    state.discoveryStages = {
      "black-market-signal": 25,
      "hidden-station-signal": 40,
    };

    expect(secretRoutePresentationsForStage(35, state)).toEqual([]);
    expect(
      secretRoutePresentation(35, state, "black-market-signal"),
    ).toBeNull();
    expect(
      secretRoutePresentation(35, state, "hidden-station-signal"),
    ).toBeNull();
  });

  it("rejects stale selection IDs outside the displayed World", () => {
    const state = createHiddenDiscoveryState("campaign-secret-world");
    state.discovered = ["black-market-signal", "hidden-station-signal"];
    state.discoveryStages = {
      "black-market-signal": 25,
      "hidden-station-signal": 40,
    };

    expect(
      secretRoutePresentation(1, state, "black-market-signal"),
    ).toBeNull();
    expect(
      secretRoutePresentation(41, state, "hidden-station-signal"),
    ).toBeNull();
  });

  it("is read-only: repeated rendering/selection cannot reroll or mutate discovery", () => {
    const state = createHiddenDiscoveryState("campaign-secret-readonly");
    state.discovered = ["black-market-signal", "hidden-station-signal"];
    state.discoveryStages = {
      "black-market-signal": 25,
      "hidden-station-signal": 40,
    };
    state.lastRollStage = 40;
    state.lastRollIdentity = "campaign-secret-readonly:stage-40";
    const snapshot = JSON.stringify(state);

    const first = secretRoutePresentationsForStage(35, state);
    const second = secretRoutePresentationsForStage(35, state);
    const shop = secretRoutePresentation(35, state, "black-market-signal");
    const station = secretRoutePresentation(
      35,
      state,
      "hidden-station-signal",
    );

    expect(first).toEqual(second);
    expect(shop?.actionLabel).toBe("Enter Black Market");
    expect(station?.actionLabel).toBe("Dock at Hidden Station");
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it("keeps malformed duplicate discovery input from producing duplicate route nodes", () => {
    const state = sanitizeHiddenDiscoveryState({
      discovered: [
        "black-market-signal",
        "black-market-signal",
        "hidden-station-signal",
        "hidden-station-signal",
      ],
      discoveryStages: {
        "black-market-signal": 25,
        "hidden-station-signal": 40,
      },
      drought: {},
      seedIdentity: "campaign-secret-dedupe",
      lastRollStage: 40,
      encounter: null,
    });

    const nodes = secretRoutePresentationsForStage(35, state);
    expect(nodes.map((entry) => entry.node.id)).toEqual([
      "black-market-signal",
      "hidden-station-signal",
    ]);
  });

  it("routes a discovered Rest Stop directly to the station flow exactly once", () => {
    const state = createHiddenDiscoveryState("campaign-rest-stop-activation");
    state.discovered = ["hidden-station-signal"];
    state.discoveryStages = { "hidden-station-signal": 40 };
    const station = secretRoutePresentation(
      35,
      state,
      "hidden-station-signal",
    );
    expect(station?.node.kind).toBe("hidden-station");
    expect(station?.action).toBe("open-hidden-station");

    const onOpenStation = vi.fn();
    const onPreviewRoute = vi.fn();
    expect(
      activateSecretRoutePresentation(station!, {
        onOpenStation,
        onPreviewRoute,
      }),
    ).toBe("station");
    expect(onOpenStation).toHaveBeenCalledTimes(1);
    expect(onPreviewRoute).not.toHaveBeenCalled();
  });

  it("keeps the secret-shop preview path separate from Rest Stop activation", () => {
    const state = createHiddenDiscoveryState("campaign-secret-shop-activation");
    state.discovered = ["black-market-signal"];
    state.discoveryStages = { "black-market-signal": 25 };
    const shop = secretRoutePresentation(35, state, "black-market-signal");
    expect(shop?.node.kind).toBe("hidden-shop");

    const onOpenStation = vi.fn();
    const onPreviewRoute = vi.fn();
    expect(
      activateSecretRoutePresentation(shop!, {
        onOpenStation,
        onPreviewRoute,
      }),
    ).toBe("preview");
    expect(onOpenStation).not.toHaveBeenCalled();
    expect(onPreviewRoute).toHaveBeenCalledTimes(1);
    expect(onPreviewRoute).toHaveBeenCalledWith(shop);
  });
});
