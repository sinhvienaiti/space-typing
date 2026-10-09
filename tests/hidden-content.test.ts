import { describe, expect, it } from "vitest";
import {
  createHiddenDiscoveryState,
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
});
