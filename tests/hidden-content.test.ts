import { describe, expect, it } from "vitest";
import {
  HIDDEN_CONTENT_REGISTRY,
  createHiddenDiscoveryState,
  isValidHiddenDiscoveryState,
  rollDeterministicHiddenDiscovery,
  rollHiddenDiscovery,
  sanitizeHiddenDiscoveryState,
} from "../src/discovery/hidden-content";

describe("hidden discovery", () => {
  it("uses the deterministic stage seed when runtime callers omit an RNG", () => {
    const state = createHiddenDiscoveryState();

    expect(rollHiddenDiscovery(state, 55, 17)).toEqual(
      rollDeterministicHiddenDiscovery(state, 55, 17),
    );
    expect(rollHiddenDiscovery(state, 55, 17)).toEqual(
      rollHiddenDiscovery(state, 55, 17),
    );
  });

  it("persists a no-result roll so retrying or reopening cannot reroll it", () => {
    const first = rollHiddenDiscovery(
      createHiddenDiscoveryState(),
      25,
      0,
      () => 0.999999,
    );

    expect(first.rolled).toBe(true);
    expect(first.discovery).toBeNull();
    expect(first.state.lastRollStage).toBe(25);

    const restored = sanitizeHiddenDiscoveryState(
      JSON.parse(JSON.stringify(first.state)),
    );
    const retry = rollHiddenDiscovery(restored, 25, 0, () => 0);

    expect(retry.rolled).toBe(false);
    expect(retry.discovery).toBeNull();
    expect(retry.state).toEqual(first.state);
  });

  it("does not reroll a resolved winner or unlock the same content twice", () => {
    const first = rollHiddenDiscovery(
      createHiddenDiscoveryState(),
      25,
      0,
      () => 0,
    );

    expect(first.discovery?.id).toBe("black-market-signal");
    expect(first.state.discovered).toEqual(["black-market-signal"]);

    const retry = rollHiddenDiscovery(first.state, 25, 0, () => 0);
    expect(retry.rolled).toBe(false);
    expect(retry.state.discovered).toEqual(["black-market-signal"]);

    const later = rollHiddenDiscovery(first.state, 40, 0, () => 0);
    expect(later.discovery?.id).not.toBe("black-market-signal");
    expect(later.state.discovered.filter((id) => id === "black-market-signal"))
      .toHaveLength(1);
    expect(new Set(later.state.discovered).size).toBe(
      later.state.discovered.length,
    );
  });

  it("keeps Hidden Station in the canonical discovery registry and pity path", () => {
    const station = HIDDEN_CONTENT_REGISTRY["hidden-station-signal"];
    const state = createHiddenDiscoveryState();
    state.discovered = [
      "black-market-signal",
      "echo-rift",
      "ghost-contract",
    ];
    state.drought[station.id] = station.guaranteeAfter;

    const result = rollHiddenDiscovery(state, station.minStage, 0, () => 0.999999);

    expect(station.kind).toBe("station");
    expect(result.discovery?.id).toBe("hidden-station-signal");
    expect(result.state.discovered).toContain("hidden-station-signal");
    expect(result.state.drought["hidden-station-signal"]).toBe(0);
  });

  it("increments drought on a miss and safely sanitizes legacy discovery state", () => {
    const state = createHiddenDiscoveryState();
    state.discovered = [
      "black-market-signal",
      "echo-rift",
      "ghost-contract",
    ];

    const miss = rollHiddenDiscovery(state, 40, 0, () => 0.999999);
    expect(miss.discovery).toBeNull();
    expect(miss.state.drought["hidden-station-signal"]).toBe(1);

    const legacy = sanitizeHiddenDiscoveryState({
      discovered: [
        "black-market-signal",
        "black-market-signal",
        "invalid-hidden-content",
      ],
      drought: {
        "black-market-signal": -10,
        "hidden-station-signal": 999,
      },
      lastRollStage: 5000,
      encounter: {
        active: null,
        resolvedOfferIds: [],
      },
    });

    expect(legacy.discovered).toEqual(["black-market-signal"]);
    expect(legacy.drought["black-market-signal"]).toBe(0);
    expect(legacy.drought["hidden-station-signal"]).toBe(60);
    expect(legacy.lastRollStage).toBe(1000);
    expect(isValidHiddenDiscoveryState(legacy)).toBe(true);
  });
});
