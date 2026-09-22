import { describe, expect, it } from "vitest";
import {
  MAX_EQUIPPED_RELICS,
  compileRelicEffects,
  createRelicState,
  equipRelic,
  grantRelic,
  sanitizeRelicState,
  selectRelicReward,
} from "../src/relics/state";

function ownedState() {
  let state = createRelicState();
  for (const id of [
    "first-light-seed",
    "storm-script",
    "frost-rhythm",
    "giant-word-lens",
    "mirror-vow",
    "cosmic-conductor",
  ] as const) {
    state = grantRelic(state, id).state;
  }
  return state;
}

describe("M18 run relics", () => {
  it("sanitizes ownership and equipped slots without unknown or duplicate ids", () => {
    const state = sanitizeRelicState({
      version: 99,
      owned: [
        "storm-script",
        "storm-script",
        "unknown",
        "first-light-seed",
      ],
      equipped: [
        "storm-script",
        "unknown",
        "first-light-seed",
        "mirror-vow",
      ],
    });

    expect(state).toEqual({
      version: 1,
      owned: ["first-light-seed", "storm-script"],
      equipped: ["first-light-seed", "storm-script"],
    });
  });

  it("limits the active loadout to three owned relics", () => {
    let state = ownedState();
    for (const id of [
      "first-light-seed",
      "storm-script",
      "frost-rhythm",
      "giant-word-lens",
    ] as const) {
      state = equipRelic(state, id).state;
    }

    expect(state.equipped).toHaveLength(MAX_EQUIPPED_RELICS);
    expect(state.equipped).toEqual([
      "first-light-seed",
      "storm-script",
      "frost-rhythm",
    ]);
  });

  it("compiles equipped relics into bounded direct combat fields", () => {
    let state = ownedState();
    for (const id of [
      "storm-script",
      "giant-word-lens",
      "cosmic-conductor",
    ] as const) {
      state = equipRelic(state, id).state;
    }

    const effects = compileRelicEffects(state);

    expect(effects.perfectWordChainRatio).toBeCloseTo(0.34);
    expect(effects.perfectWordChainTargets).toBe(4);
    expect(effects.longBossWordMinLength).toBe(8);
    expect(effects.longBossWordDamageMultiplier).toBeCloseTo(1.4);
    expect(effects.mistakeGuardCharges).toBe(0);
  });

  it("selects deterministic unlocked unowned rewards", () => {
    const empty = createRelicState();
    const early = selectRelicReward(empty, 10, "sector:10");

    expect(early).toBe("first-light-seed");

    const owned = grantRelic(empty, "first-light-seed").state;
    expect(selectRelicReward(owned, 10, "sector:10")).toBeNull();

    const first = selectRelicReward(owned, 60, "sector:60");
    const second = selectRelicReward(owned, 60, "sector:60");
    expect(first).toBe(second);
    expect(["storm-script", "frost-rhythm"]).toContain(first);
  });
});
