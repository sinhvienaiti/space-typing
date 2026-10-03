import { describe, expect, it } from "vitest";
import { DuelCooldownState } from "../src/duel/cooldowns";

describe("Duel cooldown state", () => {
  it("ticks independently per player and removes expired entries", () => {
    const state = new DuelCooldownState();
    state.activate("player-1", "repair", 6);
    state.activate("player-2", "scan", 8);

    state.update(2.5);

    expect(
      state.snapshotFor("player-1").repair,
    ).toBeCloseTo(3.5, 8);
    expect(
      state.snapshotFor("player-2").scan,
    ).toBeCloseTo(5.5, 8);

    state.update(6);
    expect(state.snapshotFor("player-1")).toEqual({});
    expect(state.snapshotFor("player-2")).toEqual({});
  });

  it("keeps the stronger active cooldown when the same action is reactivated", () => {
    const state = new DuelCooldownState();
    state.activate("player-1", "repair", 6);
    state.update(1);
    state.activate("player-1", "repair", 3);

    expect(
      state.remaining("player-1", "repair"),
    ).toBeCloseTo(5, 8);
  });

  it("supports bounded cooldown reduction without going negative", () => {
    const state = new DuelCooldownState();
    state.activate("player-1", "repair", 6);
    state.activate("player-1", "scan", 8);

    state.reduce("player-1", 3);
    expect(
      state.snapshotFor("player-1").repair,
    ).toBeCloseTo(3, 8);
    expect(
      state.snapshotFor("player-1").scan,
    ).toBeCloseTo(5, 8);

    state.reduce("player-1", 99);
    expect(state.snapshotFor("player-1")).toEqual({});
  });

  it("clears all round-local cooldowns", () => {
    const state = new DuelCooldownState();
    state.activate("player-1", "repair", 6);
    state.activate("player-2", "scan", 8);
    state.clear();

    expect(state.snapshotFor("player-1")).toEqual({});
    expect(state.snapshotFor("player-2")).toEqual({});
  });
});
