import { describe, expect, it } from "vitest";
import {
  assignHotbarSlot,
  createDefaultHotbarState,
  hotbarSlotForKey,
  isValidHotbarState,
  sanitizeHotbarState,
} from "../src/hud/hotbar";

describe("RPG hotbar loadout", () => {
  it("creates the legacy-compatible 1-9 default layout", () => {
    const state = createDefaultHotbarState();
    expect(state.slots).toHaveLength(9);
    expect(state.slots[0]).toEqual({ kind: "item", id: "repair-kit" });
    expect(state.slots[2]).toEqual({ kind: "item", id: "energy-cell" });
    expect(state.slots[3]).toEqual({ kind: "skill", id: "barrier" });
    expect(state.slots[5]).toEqual({ kind: "skill", id: "emp-burst" });
    expect(state.slots[6]).toEqual({ kind: "character-skill" });
    expect(state.slots[8]).toBeNull();
    expect(isValidHotbarState(state)).toBe(true);
  });

  it("moves a unique action instead of duplicating it", () => {
    const state = createDefaultHotbarState();
    const next = assignHotbarSlot(state, 8, {
      kind: "item",
      id: "repair-kit",
    });

    expect(next.slots[0]).toBeNull();
    expect(next.slots[8]).toEqual({ kind: "item", id: "repair-kit" });
    expect(isValidHotbarState(next)).toBe(true);
  });

  it("keeps an old configured slot 9 unchanged during v27 loading", () => {
    const oldSlots = createDefaultHotbarState().slots;
    oldSlots[8] = { kind: "skill", id: "chain-lightning" };
    const loaded = sanitizeHotbarState({ version: 1, slots: oldSlots });
    expect(loaded.slots[8]).toEqual({ kind: "skill", id: "chain-lightning" });
  });

  it("supports support and selected-character actions", () => {
    let state = createDefaultHotbarState();
    state = assignHotbarSlot(state, 0, {
      kind: "skill",
      id: "sanctuary",
    });
    state = assignHotbarSlot(state, 1, { kind: "character-skill" });

    expect(state.slots[0]).toEqual({ kind: "skill", id: "sanctuary" });
    expect(state.slots[1]).toEqual({ kind: "character-skill" });
  });

  it("sanitizes invalid and duplicate slots without shifting slot numbers", () => {
    const state = sanitizeHotbarState({
      version: 1,
      slots: [
        { kind: "skill", id: "barrier" },
        { kind: "skill", id: "barrier" },
        { kind: "item", id: "invalid" },
        null,
      ],
    });

    expect(state.slots[0]).toEqual({ kind: "skill", id: "barrier" });
    expect(state.slots[1]).toBeNull();
    expect(state.slots[2]).toBeNull();
    expect(state.slots).toHaveLength(9);
  });

  it("maps only number keys 1-9", () => {
    expect(hotbarSlotForKey("1")).toBe(0);
    expect(hotbarSlotForKey("9")).toBe(8);
    expect(hotbarSlotForKey("0")).toBeNull();
    expect(hotbarSlotForKey("-")).toBeNull();
  });
});
