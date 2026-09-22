import { describe, expect, it } from "vitest";
import {
  attributeUpgradeCost,
  createUpgradeState,
  isValidUpgradeState,
  maxAttributeLevel,
  permanentAttributeBonus,
  sanitizeUpgradeState,
  skillUpgradeCost,
  upgradeAttributeLevel,
  upgradeSkillLevel,
} from "../src/progression/upgrades";
import {
  resolveSkillDefinitionLevel,
  skillLevelProfile,
} from "../src/skills/progression";
import { DEFENSIVE_SKILLS } from "../src/skills/defensive";

describe("M17 persistent upgrade state", () => {
  it("starts core skills at Lv1 and attributes at zero", () => {
    const state = createUpgradeState();
    expect(state.skillLevels.barrier).toBe(1);
    expect(state.skillLevels["chain-lightning"]).toBe(1);
    expect(state.attributeLevels.hull).toBe(0);
    expect(state.attributeLevels.luck).toBe(0);
    expect(isValidUpgradeState(state)).toBe(true);
  });

  it("sanitizes skill and economy-sensitive attribute caps", () => {
    const state = sanitizeUpgradeState({
      skillLevels: {
        barrier: 99,
      },
      attributeLevels: {
        hull: 99,
        luck: 99,
        salvage: -3,
      },
    });

    expect(state.skillLevels.barrier).toBe(5);
    expect(state.attributeLevels.hull).toBe(20);
    expect(state.attributeLevels.luck).toBe(10);
    expect(state.attributeLevels.salvage).toBe(0);
    expect(maxAttributeLevel("luck")).toBeLessThan(
      maxAttributeLevel("hull"),
    );
  });

  it("upgrades skill levels one step and stops at Lv5", () => {
    let state = createUpgradeState();

    for (let level = 2; level <= 5; level += 1) {
      const result = upgradeSkillLevel(state, "barrier");
      expect(result.changed).toBe(true);
      state = result.state;
      expect(state.skillLevels.barrier).toBe(level);
    }

    expect(upgradeSkillLevel(state, "barrier").changed).toBe(false);
    expect(skillUpgradeCost(5)).toBeNull();
  });

  it("uses stricter caps and costs for Luck/Salvage", () => {
    const normal = attributeUpgradeCost("hull", 8)!;
    const economy = attributeUpgradeCost("luck", 8)!;

    expect(economy.credits).toBeGreaterThan(normal.credits);
    expect(economy.alloy).toBeGreaterThanOrEqual(normal.alloy);
    expect(economy.requiredStage).toBeGreaterThanOrEqual(
      normal.requiredStage,
    );

    let state = createUpgradeState();
    for (let index = 0; index < 10; index += 1) {
      state = upgradeAttributeLevel(state, "luck").state;
    }
    expect(state.attributeLevels.luck).toBe(10);
    expect(upgradeAttributeLevel(state, "luck").changed).toBe(false);
  });

  it("converts attribute levels into the existing effective-stat bonus lane", () => {
    const state = createUpgradeState();
    state.attributeLevels.hull = 3;
    state.attributeLevels.firepower = 2;
    state.attributeLevels.salvage = 1;

    expect(permanentAttributeBonus(state)).toMatchObject({
      hull: 15,
      firepower: 3,
      salvage: 0.6,
    });
  });
});

describe("M17 skill Lv1-Lv5 compiler", () => {
  const barrier = DEFENSIVE_SKILLS.find(
    (skill) => skill.id === "barrier",
  )!;

  it("keeps Lv1 behavior identical to the authored definition", () => {
    const resolved = resolveSkillDefinitionLevel(barrier, 1);
    expect(resolved.energyCost).toBe(barrier.energyCost);
    expect(resolved.cooldown).toBe(barrier.cooldown);
    expect(resolved.charges).toBe(barrier.charges);
    expect(resolved.effectScale).toBe(1);
    expect(resolved.masteryUnlocked).toBe(false);
  });

  it("improves efficiency/effect and unlocks mastery at Lv5", () => {
    const resolved = resolveSkillDefinitionLevel(barrier, 5);
    expect(resolved.energyCost).toBeLessThan(barrier.energyCost);
    expect(resolved.cooldown).toBeLessThan(barrier.cooldown);
    expect(resolved.effectScale).toBeGreaterThan(1);
    expect(resolved.masteryUnlocked).toBe(true);
    expect(resolved.charges).toBe((barrier.charges ?? 0) + 1);
  });

  it("keeps every resolved level inside explicit 1-5 bounds", () => {
    expect(skillLevelProfile(-100).level).toBe(1);
    expect(skillLevelProfile(100).level).toBe(5);
  });
});
