import { describe, expect, it } from "vitest";
import {
  secretRoutePresentation,
  secretRoutePresentationsForStage,
} from "../src/campaign/secret-route";
import {
  createHiddenDiscoveryState,
  sanitizeHiddenDiscoveryState,
} from "../src/discovery/hidden-content";

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
});
