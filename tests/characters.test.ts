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

  it("starts with Vanguard selected and the full ship roster available", () => {
    const state = createStarterCharacterState();
    expect(state.selected).toBe("vanguard");
    expect(state.unlocked).toEqual([...CHARACTER_IDS]);
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

  it("selects any registered ship without Campaign gating", () => {
    const state = createStarterCharacterState();
    const changed = selectCharacter(state, "zenith");

    expect(changed.selected).toBe("zenith");
    expect(changed.unlocked).toEqual([...CHARACTER_IDS]);
    expect(state.selected).toBe("vanguard");
    expect(changed.progress).toBe(state.progress);
  });

  it("sanitizes old/imported saves to the full ship roster", () => {
    expect(
      sanitizeCharacterState({
        selected: "missing",
        unlocked: ["aegis", "missing"],
      }),
    ).toMatchObject({
      selected: "vanguard",
      unlocked: [...CHARACTER_IDS],
    });

    expect(
      sanitizeCharacterState({
        selected: "reaper",
        unlocked: ["vanguard"],
      }),
    ).toMatchObject({
      selected: "reaper",
      unlocked: [...CHARACTER_IDS],
    });
  });

  it("keeps stage-clear unlock API compatible without milestone gating", () => {
    const legacyLocked = {
      ...createStarterCharacterState(),
      unlocked: ["vanguard"] as typeof CHARACTER_IDS[number][],
    };
    const result = unlockCharactersForStage(legacyLocked, 1);

    expect(result.state.unlocked).toEqual([...CHARACTER_IDS]);
    expect(result.unlocked).toEqual([]);
  });

  it("synchronizes old saves to the full ship roster regardless of cleared stage", () => {
    const legacyLocked = {
      ...createStarterCharacterState(),
      unlocked: ["vanguard"] as typeof CHARACTER_IDS[number][],
    };
    const synced = syncCharacterUnlocks(legacyLocked, []);

    expect(synced.unlocked).toEqual([...CHARACTER_IDS]);
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
