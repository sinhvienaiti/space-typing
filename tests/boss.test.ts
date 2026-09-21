import { describe, expect, it } from "vitest";
import {
  bossActionInterval,
  bossKeyDamage,
  bossMaxHp,
  bossName,
  bossPhaseFor,
  bossProjectileCount,
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

  it("resolves boss phases and projectile pressure by role", () => {
    expect(bossPhaseFor(90, 100, "mini-boss")).toBe(1);
    expect(bossPhaseFor(49, 100, "boss")).toBe(2);
    expect(bossPhaseFor(65, 100, "major-boss")).toBe(2);
    expect(bossPhaseFor(32, 100, "major-boss")).toBe(3);

    expect(bossProjectileCount("major-boss", 3)).toBe(3);
    expect(bossProjectileCount("boss", 2)).toBe(2);
    expect(bossProjectileCount("mini-boss", 1)).toBe(1);
    expect(bossActionInterval("major-boss", 3)).toBeLessThan(
      bossActionInterval("major-boss", 1),
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
      phase: 1,
      shieldActive: false,
      staggered: false,
    });
  });
});
