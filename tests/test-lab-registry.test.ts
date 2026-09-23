import { describe, expect, it } from "vitest";
import { WORLD_COUNT, WORLD_REGISTRY } from "../src/worlds/registry";
import { ENEMY_DEFINITION_IDS } from "../src/enemies/registry";
import { ENEMY_SKILL_IDS } from "../src/enemies/skills";
import { STATUS_IDS } from "../src/status/engine";
import { ITEM_IDS } from "../src/items/registry";
import { EQUIPMENT_IDS } from "../src/equipment/registry";
import { CHARACTER_IDS } from "../src/characters/registry";
import { SHOP_TYPES } from "../src/shops/state";
import { MUSIC_STATES } from "../src/audio/music-profile";
import {
  createTestLabRegistry,
  validateTestLabRegistry,
} from "../src/test-lab/registry";

describe("M21 Test Lab production registry", () => {
  it("discovers every registered production entity required by the baseline audit", () => {
    const registry = createTestLabRegistry();

    expect(registry.worlds).toHaveLength(WORLD_COUNT);
    expect(registry.worlds.map((world) => world.id)).toEqual(
      WORLD_REGISTRY.map((world) => world.id),
    );
    expect(
      [...registry.enemies.map((enemy) => enemy.id)].sort(),
    ).toEqual([...ENEMY_DEFINITION_IDS].sort());
    expect(registry.enemySkills.map((skill) => skill.id)).toEqual(
      [...ENEMY_SKILL_IDS],
    );
    expect(registry.statuses.map((status) => status.id)).toEqual(
      [...STATUS_IDS],
    );
    expect(registry.items.map((item) => item.id)).toEqual(
      [...ITEM_IDS],
    );
    expect(registry.equipment.map((item) => item.id)).toEqual(
      [...EQUIPMENT_IDS],
    );
    expect(registry.characters).toEqual([...CHARACTER_IDS]);
    expect(registry.shopTypes).toEqual([...SHOP_TYPES]);
    expect(registry.musicStates).toEqual([...MUSIC_STATES]);
    const enemyIds = new Set(
      registry.enemies.map((enemy) => enemy.id),
    );
    for (const world of registry.worlds) {
      expect(enemyIds.has(world.miniBoss)).toBe(true);
      expect(enemyIds.has(world.worldBoss)).toBe(true);
    }
    expect(registry.musicProfileIds).toHaveLength(WORLD_COUNT);
    expect(validateTestLabRegistry(registry)).toEqual([]);
  });

  it("keeps registry arrays detached from production arrays", () => {
    const first = createTestLabRegistry();
    const second = createTestLabRegistry();

    expect(first.worlds).not.toBe(second.worlds);
    expect(first.enemies).not.toBe(second.enemies);
    expect(first.items).not.toBe(second.items);
  });
});
