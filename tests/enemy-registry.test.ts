import { describe, expect, it } from "vitest";
import { ENEMY_FAMILY_IDS } from "../src/enemies/families";
import {
  ENEMY_REGISTRY,
  enemyDefinition,
  validateEnemyRegistry,
  type EnemyDefinition,
} from "../src/enemies/registry";
import { ENEMY_REWARD_IDS } from "../src/enemies/rewards";
import { ENEMY_ROLE_IDS } from "../src/enemies/roles";

describe("enemy visual/reward registry", () => {
  it("keeps the master-plan IDs stable", () => {
    expect(ENEMY_FAMILY_IDS).toEqual([
      "rainbow",
      "angel",
      "devil",
      "frost",
      "prism",
      "nature",
      "shadow",
      "cosmic",
    ]);

    expect(ENEMY_ROLE_IDS).toContain("reward");
    expect(ENEMY_ROLE_IDS).toContain("elite");
    expect(ENEMY_ROLE_IDS).toContain("boss");

    expect(ENEMY_REWARD_IDS).toContain("heal-burst");
    expect(ENEMY_REWARD_IDS).toContain("freeze-nearby");
    expect(ENEMY_REWARD_IDS).toContain("score-x2");
    expect(ENEMY_REWARD_IDS).toContain("overdrive-charge");
  });

  it("validates the first playable art slice", () => {
    expect(validateEnemyRegistry()).toEqual([]);

    expect(ENEMY_REGISTRY.map((definition) => definition.id)).toEqual(
      expect.arrayContaining([
        "rainbow-scout",
        "rainbow-dart",
        "rainbow-bubble",
        "lucky-rainbow",
        "angel-healer",
        "angel-guard",
        "angel-blesser",
        "bomb-imp",
        "freeze-burst-sprite",
        "seraph-elite",
        "berserk-devil",
        "archangel-core",
        "demon-lord-orb",
      ]),
    );
  });

  it("keeps reward identity visible without relying on color alone", () => {
    const rewardEnemies = ENEMY_REGISTRY.filter(
      (definition) => definition.reward !== undefined,
    );

    expect(rewardEnemies.length).toBeGreaterThan(0);
    for (const definition of rewardEnemies) {
      expect(definition.visual.rewardMarker).toBeTruthy();
    }
  });

  it("keeps bosses in the same family art language", () => {
    const angel = enemyDefinition("angel-healer");
    const archangel = enemyDefinition("archangel-core");
    const devil = enemyDefinition("bomb-imp");
    const demon = enemyDefinition("demon-lord-orb");

    expect(archangel?.family).toBe(angel?.family);
    expect(archangel?.visual.body).toContain("holy-orb");
    expect(demon?.family).toBe(devil?.family);
    expect(demon?.visual.body).toContain("infernal-orb");
  });

  it("rejects duplicate IDs and broken reward readability", () => {
    const base = ENEMY_REGISTRY[0] as EnemyDefinition;
    const broken: EnemyDefinition = {
      ...base,
      reward: "heal-burst",
      visual: {
        ...base.visual,
        rewardMarker: "",
      },
    };

    const errors = validateEnemyRegistry([base, base, broken]);

    expect(errors.some((error) => error.includes("Duplicate enemy id"))).toBe(
      true,
    );
    expect(
      errors.some((error) => error.includes("reward marker is required")),
    ).toBe(true);
  });
});
