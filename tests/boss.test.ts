import { describe, expect, it } from "vitest";
import {
  bossKeyDamage,
  bossMaxHp,
  bossName,
  bossWordDamage,
  createBossState,
  isBossStageRole,
  toBossHud,
} from "../src/boss/model";

const entry = {
  id: "boss-word",
  en: "reactor",
  vi: "lò phản ứng",
  ipa: "/riˈæktɚ/",
};

describe("boss foundation", () => {
  it("recognizes boss Campaign roles only", () => {
    expect(isBossStageRole("mini-boss")).toBe(true);
    expect(isBossStageRole("boss")).toBe(true);
    expect(isBossStageRole("major-boss")).toBe(true);
    expect(isBossStageRole("elite")).toBe(false);
    expect(isBossStageRole("normal")).toBe(false);
  });

  it("scales boss HP by stage and role", () => {
    expect(bossMaxHp(100, "major-boss")).toBeGreaterThan(
      bossMaxHp(50, "boss"),
    );
    expect(bossMaxHp(50, "boss")).toBeGreaterThan(
      bossMaxHp(20, "mini-boss"),
    );
  });

  it("gives both per-key and word-complete damage", () => {
    const hp = bossMaxHp(50, "boss");
    expect(bossKeyDamage(hp, "boss")).toBeGreaterThan(0);
    expect(bossWordDamage(hp, "boss")).toBeGreaterThan(
      bossKeyDamage(hp, "boss"),
    );
  });

  it("creates a valid HUD snapshot", () => {
    const state = createBossState(50, 1, "boss", entry);
    expect(state.name).toBe(bossName("boss", 1));
    expect(state.hp).toBe(state.maxHp);
    expect(toBossHud(state)).toEqual({
      name: state.name,
      hp: state.hp,
      maxHp: state.maxHp,
    });
  });
});
