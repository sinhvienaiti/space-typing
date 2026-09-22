import { describe, expect, it } from "vitest";
import {
  applyStatus,
  cleanseNegativeStatuses,
  createStatusState,
  hasCleanseableNegativeStatus,
  statusIncomingDamageMultiplier,
  statusRemaining,
  statusResistance,
  tickStatuses,
} from "../src/status/engine";

describe("status engine", () => {
  it("refreshes non-stacking statuses and keeps the latest source", () => {
    const first = applyStatus(
      createStatusState(),
      { id: "jammed", duration: 2, source: "jammer-a" },
      0,
      () => 1,
    );
    const refreshed = applyStatus(
      first.state,
      { id: "jammed", duration: 3, source: "jammer-b" },
      0,
      () => 1,
    );

    expect(refreshed.state).toEqual([
      {
        id: "jammed",
        remaining: 3,
        stacks: 1,
        source: "jammer-b",
      },
    ]);
  });

  it("stacks configured effects only up to their cap", () => {
    let state = createStatusState();
    for (let index = 0; index < 4; index += 1) {
      state = applyStatus(
        state,
        { id: "fortified", duration: 5, source: "barrier" },
      ).state;
    }

    expect(state[0]?.stacks).toBe(2);
    expect(statusIncomingDamageMultiplier(state)).toBeCloseTo(0.84);
  });

  it("ticks only when explicitly advanced, making pause behavior caller-controlled", () => {
    const state = applyStatus(
      createStatusState(),
      { id: "burning", duration: 4, source: "hazard" },
      0,
      () => 1,
    ).state;

    expect(statusRemaining(state, "burning")).toBe(4);
    expect(statusRemaining(tickStatuses(state, 1.5), "burning")).toBe(2.5);
    expect(statusRemaining(state, "burning")).toBe(4);
  });

  it("cleanses negative statuses while preserving buffs", () => {
    let state = applyStatus(
      createStatusState(),
      { id: "fortified", duration: 5, source: "barrier" },
    ).state;
    state = applyStatus(
      state,
      { id: "jammed", duration: 3, source: "jammer" },
      0,
      () => 1,
    ).state;

    expect(hasCleanseableNegativeStatus(state)).toBe(true);
    const cleansed = cleanseNegativeStatuses(state);
    expect(cleansed.map((status) => status.id)).toEqual(["fortified"]);
  });

  it("uses Ward as bounded resistance for negative statuses", () => {
    expect(statusResistance(0)).toBe(0);
    expect(statusResistance(1000)).toBe(0.65);

    const resisted = applyStatus(
      createStatusState(),
      { id: "jammed", duration: 2, source: "jammer" },
      50,
      () => 0.1,
    );
    expect(resisted.resisted).toBe(true);
    expect(resisted.state).toEqual([]);

    const applied = applyStatus(
      createStatusState(),
      { id: "jammed", duration: 2, source: "jammer" },
      50,
      () => 0.9,
    );
    expect(applied.applied).toBe(true);
  });
});
