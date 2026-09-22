import { describe, expect, it } from "vitest";
import {
  ENEMY_SKILL_CATEGORIES,
  ENEMY_SKILL_IDS,
  enemySignatureSkill,
  enemySkillDefinition,
  worldEnemySkillPool,
} from "../src/enemies/skills";
import { worldForStage } from "../src/worlds/registry";

describe("M11 enemy skill contracts", () => {
  it("registers attack, defense, control and support skills", () => {
    const categories = new Set(
      ENEMY_SKILL_IDS.map(
        (id) => enemySkillDefinition(id).category,
      ),
    );
    expect([...categories].sort()).toEqual(
      [...ENEMY_SKILL_CATEGORIES].sort(),
    );

    for (const id of ENEMY_SKILL_IDS) {
      const skill = enemySkillDefinition(id);
      expect(skill.cooldown).toBeGreaterThan(0);
      expect(skill.telegraph).toBeGreaterThan(0);
      expect(skill.minRank).toBeGreaterThanOrEqual(1);
      expect(skill.minRank).toBeLessThanOrEqual(10);
    }
  });

  it("derives World-specific pools from canonical World families", () => {
    const rainbow = worldEnemySkillPool(worldForStage(1));
    const demon = worldEnemySkillPool(worldForStage(101));
    const shadow = worldEnemySkillPool(worldForStage(401));

    expect(rainbow.length).toBeGreaterThan(0);
    expect(demon.length).toBeGreaterThan(0);
    expect(shadow.length).toBeGreaterThan(0);
    expect(demon).not.toEqual(rainbow);
    expect(shadow).not.toEqual(rainbow);
  });

  it("preserves archetype signature behavior without a second skill engine", () => {
    expect(enemySignatureSkill("carrier")).toBe("summon-scout");
    expect(enemySignatureSkill("jammer")).toBe("signal-jam");
    expect(enemySignatureSkill("healer")).toBe("repair-wave");
    expect(enemySignatureSkill("sniper")).toBe("sniper-shot");
    expect(enemySignatureSkill("leech")).toBe("drain-pulse");
  });

  it("marks Freeze and Silence as telegraphed hard CC", () => {
    const freeze = enemySkillDefinition("frost-lock");
    const silence = enemySkillDefinition("silence-field");

    expect(freeze.effect.type).toBe("status");
    expect(silence.effect.type).toBe("status");
    if (freeze.effect.type !== "status") return;
    if (silence.effect.type !== "status") return;

    expect(freeze.effect.hardCc).toBe(true);
    expect(freeze.effect.immunityAfter).toBeGreaterThan(
      freeze.effect.duration,
    );
    expect(silence.effect.hardCc).toBe(true);
    expect(silence.effect.immunityAfter).toBeGreaterThan(
      silence.effect.duration,
    );
  });
});
