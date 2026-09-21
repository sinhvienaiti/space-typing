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
} from "../src/characters/state";

describe("character registry and selection", () => {
  it("registers the eleven planned Campaign characters", () => {
    expect(CHARACTER_IDS).toHaveLength(11);
    expect(Object.keys(CHARACTER_REGISTRY)).toEqual([...CHARACTER_IDS]);

    expect(CHARACTER_REGISTRY.vanguard.unlockStage).toBe(1);
    expect(CHARACTER_REGISTRY.aegis.unlockStage).toBe(100);
    expect(CHARACTER_REGISTRY.zenith.unlockStage).toBe(1000);
  });

  it("starts with Vanguard selected and unlocked", () => {
    expect(createStarterCharacterState()).toEqual({
      selected: "vanguard",
      unlocked: ["vanguard"],
    });
  });

  it("does not select a locked character", () => {
    const state = createStarterCharacterState();
    expect(selectCharacter(state, "aegis")).toBe(state);
  });

  it("selects an unlocked character without mutating the previous state", () => {
    const state = {
      selected: "vanguard" as const,
      unlocked: ["vanguard", "aegis"] as const,
    };

    const changed = selectCharacter(
      {
        selected: state.selected,
        unlocked: [...state.unlocked],
      },
      "aegis",
    );

    expect(changed.selected).toBe("aegis");
    expect(state.selected).toBe("vanguard");
  });

  it("sanitizes unknown selection and always preserves Vanguard", () => {
    expect(
      sanitizeCharacterState({
        selected: "missing",
        unlocked: ["aegis", "missing"],
      }),
    ).toEqual({
      selected: "vanguard",
      unlocked: ["vanguard", "aegis"],
    });
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
