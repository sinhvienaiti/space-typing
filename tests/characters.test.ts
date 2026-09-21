import { describe, expect, it } from "vitest";
import {
  CHARACTER_IDS,
  CHARACTER_REGISTRY,
} from "../src/characters/registry";
import {
  createStarterCharacterState,
  isValidCharacterState,
  sanitizeCharacterState,
  selectCharacter,
  syncCharacterUnlocks,
  unlockCharactersForStage,
} from "../src/characters/state";

describe("character registry and selection", () => {
  it("registers the eleven planned Campaign characters", () => {
    expect(CHARACTER_IDS).toHaveLength(11);
    expect(Object.keys(CHARACTER_REGISTRY)).toEqual([...CHARACTER_IDS]);

    expect(CHARACTER_REGISTRY.vanguard.unlockStage).toBe(1);
    expect(CHARACTER_REGISTRY.aegis.unlockStage).toBe(100);
    expect(CHARACTER_REGISTRY.zenith.unlockStage).toBe(1000);
  });

  it("starts with Vanguard selected, unlocked and at base progression", () => {
    const state = createStarterCharacterState();
    expect(state).toMatchObject({
      selected: "vanguard",
      unlocked: ["vanguard"],
    });
    expect(state.progress.vanguard).toEqual({
      level: 1,
      xp: 0,
      mastery: 0,
      masteryXp: 0,
      talents: {
        assault: 0,
        bulwark: 0,
        reactor: 0,
      },
    });
  });

  it("does not select a locked character", () => {
    const state = createStarterCharacterState();
    expect(selectCharacter(state, "aegis")).toBe(state);
  });

  it("selects an unlocked character without mutating the previous state", () => {
    const state = sanitizeCharacterState({
      selected: "vanguard",
      unlocked: ["vanguard", "aegis"],
    });

    const changed = selectCharacter(state, "aegis");

    expect(changed.selected).toBe("aegis");
    expect(state.selected).toBe("vanguard");
    expect(changed.progress).toBe(state.progress);
  });

  it("sanitizes unknown selection and always preserves Vanguard", () => {
    expect(
      sanitizeCharacterState({
        selected: "missing",
        unlocked: ["aegis", "missing"],
      }),
    ).toMatchObject({
      selected: "vanguard",
      unlocked: ["vanguard", "aegis"],
    });
  });

  it("unlocks milestone characters permanently after their clear stage", () => {
    const starter = createStarterCharacterState();
    const beforeMilestone = unlockCharactersForStage(starter, 99);
    expect(beforeMilestone.state).toBe(starter);
    expect(beforeMilestone.unlocked).toEqual([]);

    const milestone = unlockCharactersForStage(starter, 100);
    expect(milestone.unlocked).toEqual(["aegis"]);
    expect(milestone.state.unlocked).toEqual(["vanguard", "aegis"]);

    const replayEarlier = unlockCharactersForStage(milestone.state, 20);
    expect(replayEarlier.state.unlocked).toEqual(["vanguard", "aegis"]);
    expect(replayEarlier.unlocked).toEqual([]);
  });

  it("synchronizes old saves from the highest cleared milestone", () => {
    const synced = syncCharacterUnlocks(
      createStarterCharacterState(),
      [1, 50, 100, 200],
    );

    expect(synced.unlocked).toEqual(["vanguard", "aegis", "volt"]);
  });

  it("strict validation rejects duplicate or locked selections", () => {
    expect(
      isValidCharacterState({
        selected: "aegis",
        unlocked: ["vanguard"],
      }),
    ).toBe(false);

    expect(
      isValidCharacterState({
        selected: "vanguard",
        unlocked: ["vanguard", "vanguard"],
      }),
    ).toBe(false);
  });
});
