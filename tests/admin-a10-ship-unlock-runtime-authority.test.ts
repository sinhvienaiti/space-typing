import { beforeEach, describe, expect, it, vi } from "vitest";

const { runtimeOverrides } = vi.hoisted(() => ({
  runtimeOverrides: new Map<string, { unlockStage?: number }>(),
}));

vi.mock("../src/admin/ship-runtime-policy", () => ({
  activeShipRuntimeDefinitionOverride: (id: string) => runtimeOverrides.get(id),
}));

import {
  createStarterCharacterState,
  selectCharacter,
  unlockCharactersForStage,
} from "../src/characters/state";

describe("A10 Ship unlock runtime authority", () => {
  beforeEach(() => {
    runtimeOverrides.clear();
  });

  it("uses the active Ship runtime unlockStage instead of the bundled registry threshold", () => {
    runtimeOverrides.set("aegis", { unlockStage: 5 });

    const starter = createStarterCharacterState();
    expect(unlockCharactersForStage(starter, 4).unlocked).toEqual([]);

    const result = unlockCharactersForStage(starter, 5);
    expect(result.unlocked).toEqual(["aegis"]);
    expect(result.state.unlocked).toEqual(["vanguard", "aegis"]);
  });

  it("does not revoke a persisted unlock when a later runtime policy tightens the threshold", () => {
    runtimeOverrides.set("aegis", { unlockStage: 5 });
    const unlocked = unlockCharactersForStage(createStarterCharacterState(), 5).state;

    runtimeOverrides.set("aegis", { unlockStage: 500 });
    const result = unlockCharactersForStage(unlocked, 5);

    expect(result.unlocked).toEqual([]);
    expect(result.state.unlocked).toContain("aegis");
  });

  it("keeps ship selection independent from progression unlock metadata", () => {
    const starter = createStarterCharacterState();
    const selected = selectCharacter(starter, "zenith");

    expect(selected.selected).toBe("zenith");
    expect(selected.unlocked).toEqual(["vanguard"]);
  });
});
