import { describe, expect, it } from "vitest";
import {
  beginHardCc,
  canApplyHardCc,
  createHardCcState,
  tickHardCcState,
} from "../src/combat/cc-guard";

describe("M11 hard CC anti-chain", () => {
  it("prevents overlapping hard CC", () => {
    let state = createHardCcState();
    expect(canApplyHardCc(state, "freeze")).toBe(true);

    state = beginHardCc(state, "freeze", 1, 4);
    expect(canApplyHardCc(state, "silence")).toBe(false);
    expect(canApplyHardCc(state, "freeze")).toBe(false);
  });

  it("grants same-effect immunity after hard CC expires", () => {
    let state = beginHardCc(
      createHardCcState(),
      "freeze",
      1,
      4,
    );
    state = tickHardCcState(state, 1.1);

    expect(state.active).toBeNull();
    expect(state.immunity.freeze).toBeCloseTo(4);
    expect(canApplyHardCc(state, "freeze")).toBe(false);
    expect(canApplyHardCc(state, "silence")).toBe(true);

    state = tickHardCcState(state, 4.1);
    expect(canApplyHardCc(state, "freeze")).toBe(true);
  });

  it("never produces negative timers", () => {
    let state = beginHardCc(
      createHardCcState(),
      "silence",
      0.5,
      3,
    );
    state = tickHardCcState(state, 20);

    expect(state.active).toBeNull();
    expect(state.immunity.freeze).toBeGreaterThanOrEqual(0);
    expect(state.immunity.silence).toBeGreaterThanOrEqual(0);
  });
});
