import { describe, expect, it } from "vitest";
import {
  RELIC_IDS,
  RELIC_REGISTRY,
} from "../src/relics/registry";
import {
  compileRelicEffects,
  createRelicState,
  grantRelic,
  equipRelic,
  selectRelicReward,
} from "../src/relics/state";

describe("Expansion V2 relic roster", () => {
  it("keeps six campaign relics and adds six run-only build relics", () => {
    expect(RELIC_IDS).toHaveLength(12);
    const runOnly = RELIC_IDS.filter(
      (id) => RELIC_REGISTRY[id].runOnly === true,
    );
    expect(runOnly).toEqual([
      "precision-lens",
      "perfect-capacitor",
      "combo-coil",
      "heavy-core",
      "syllable-forge",
      "echo-core",
    ]);
  });

  it("does not leak run-only relics into campaign relic rewards", () => {
    const state = createRelicState();
    for (let stage = 1; stage <= 1000; stage += 37) {
      const reward = selectRelicReward(
        state,
        stage,
        "campaign:" + String(stage),
      );
      if (reward !== null) {
        expect(RELIC_REGISTRY[reward].runOnly).not.toBe(true);
      }
    }
  });

  it("compiles bounded run effects only from equipped relics", () => {
    let state = createRelicState();
    for (const id of [
      "precision-lens",
      "perfect-capacitor",
      "heavy-core",
    ] as const) {
      state = grantRelic(state, id).state;
      state = equipRelic(state, id).state;
    }
    const effects = compileRelicEffects(state);
    expect(effects.perfectWordEnergy).toBe(2);
    expect(effects.perfectWordPower).toBeCloseTo(1.2);
    expect(effects.longWordShield).toBe(4);
  });
});
