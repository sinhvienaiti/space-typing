import { WORLD_REGISTRY } from "../worlds/registry";
import type { WorldProfile } from "../worlds/types";
import {
  ENEMY_REGISTRY,
  type EnemyDefinition,
} from "../enemies/registry";
import {
  ENEMY_SKILL_IDS,
  ENEMY_SKILL_REGISTRY,
  type EnemySkillDefinition,
} from "../enemies/skills";
import {
  STATUS_IDS,
  STATUS_REGISTRY,
  type StatusDefinition,
} from "../status/engine";
import {
  ITEM_IDS,
  ITEM_REGISTRY,
  type ItemDefinition,
} from "../items/registry";
import {
  EQUIPMENT_IDS,
  EQUIPMENT_REGISTRY,
  type EquipmentDefinition,
} from "../equipment/registry";
import {
  CHARACTER_IDS,
  getCharacter,
  type CharacterId,
} from "../characters/registry";
import { VANGUARD_ACTIVE_SKILL_ID } from "../characters/vanguard";
import { AEGIS_ACTIVE_SKILL_ID } from "../characters/aegis";
import { VOLT_ACTIVE_SKILL_ID } from "../characters/volt";
import { WRAITH_ACTIVE_SKILL_ID } from "../characters/wraith";
import { FORTUNE_ACTIVE_SKILL_ID } from "../characters/fortune";
import { ARSENAL_ACTIVE_SKILL_ID } from "../characters/arsenal";
import { ORACLE_ACTIVE_SKILL_ID } from "../characters/oracle";
import { BASTION_ACTIVE_SKILL_ID } from "../characters/bastion";
import { REAPER_ACTIVE_SKILL_ID } from "../characters/reaper";
import { CELESTIAL_ACTIVE_SKILL_ID } from "../characters/celestial";
import { ZENITH_ACTIVE_SKILL_ID } from "../characters/zenith";
import { DEFENSIVE_SKILL_IDS } from "../skills/defensive";
import { OFFENSIVE_SKILL_IDS } from "../skills/offensive";
import { SUPPORT_SPELL_IDS } from "../skills/support";
import { SHOP_TYPES } from "../shops/state";
import { EXPANSION_CURRENCY_IDS } from "../economy/currencies";
import { GRADE_IDS } from "../grades";
import { RELIC_IDS } from "../relics/registry";
import {
  MUSIC_STATES,
  WORLD_MUSIC_PROFILES,
  validateWorldMusicProfiles,
} from "../audio/music-profile";

export type TestLabCharacterSkill = {
  characterId: CharacterId;
  id: string;
  label: string;
};

export type TestLabRegistry = {
  worlds: readonly WorldProfile[];
  enemies: readonly EnemyDefinition[];
  enemySkills: readonly EnemySkillDefinition[];
  statuses: readonly StatusDefinition[];
  items: readonly ItemDefinition[];
  equipment: readonly EquipmentDefinition[];
  characters: readonly string[];
  characterSkills: readonly TestLabCharacterSkill[];
  playerSkills: readonly string[];
  supportSpells: readonly string[];
  shopTypes: readonly string[];
  currencies: readonly string[];
  grades: readonly string[];
  relics: readonly string[];
  musicStates: readonly string[];
  musicProfileIds: readonly string[];
};

export function createTestLabRegistry(): TestLabRegistry {
  return {
    worlds: [...WORLD_REGISTRY],
    enemies: [...ENEMY_REGISTRY],
    enemySkills: ENEMY_SKILL_IDS.map((id) => ENEMY_SKILL_REGISTRY[id]),
    statuses: STATUS_IDS.map((id) => STATUS_REGISTRY[id]),
    items: ITEM_IDS.map((id) => ITEM_REGISTRY[id]),
    equipment: EQUIPMENT_IDS.map((id) => EQUIPMENT_REGISTRY[id]),
    characters: [...CHARACTER_IDS],
    characterSkills: [
      {
        characterId: "vanguard",
        id: VANGUARD_ACTIVE_SKILL_ID,
        label: getCharacter("vanguard").activeName,
      },
      {
        characterId: "aegis",
        id: AEGIS_ACTIVE_SKILL_ID,
        label: getCharacter("aegis").activeName,
      },
      {
        characterId: "volt",
        id: VOLT_ACTIVE_SKILL_ID,
        label: getCharacter("volt").activeName,
      },
      {
        characterId: "wraith",
        id: WRAITH_ACTIVE_SKILL_ID,
        label: getCharacter("wraith").activeName,
      },
      {
        characterId: "fortune",
        id: FORTUNE_ACTIVE_SKILL_ID,
        label: getCharacter("fortune").activeName,
      },
      {
        characterId: "arsenal",
        id: ARSENAL_ACTIVE_SKILL_ID,
        label: getCharacter("arsenal").activeName,
      },
      {
        characterId: "oracle",
        id: ORACLE_ACTIVE_SKILL_ID,
        label: getCharacter("oracle").activeName,
      },
      {
        characterId: "bastion",
        id: BASTION_ACTIVE_SKILL_ID,
        label: getCharacter("bastion").activeName,
      },
      {
        characterId: "reaper",
        id: REAPER_ACTIVE_SKILL_ID,
        label: getCharacter("reaper").activeName,
      },
      {
        characterId: "celestial",
        id: CELESTIAL_ACTIVE_SKILL_ID,
        label: getCharacter("celestial").activeName,
      },
      {
        characterId: "zenith",
        id: ZENITH_ACTIVE_SKILL_ID,
        label: getCharacter("zenith").activeName,
      },
    ],
    playerSkills: [
      ...DEFENSIVE_SKILL_IDS,
      ...OFFENSIVE_SKILL_IDS,
    ],
    supportSpells: [...SUPPORT_SPELL_IDS],
    shopTypes: [...SHOP_TYPES],
    currencies: ["credits", ...EXPANSION_CURRENCY_IDS],
    grades: [...GRADE_IDS],
    relics: [...RELIC_IDS],
    musicStates: [...MUSIC_STATES],
    musicProfileIds: Object.keys(WORLD_MUSIC_PROFILES).sort(),
  };
}

export function validateTestLabRegistry(
  registry: TestLabRegistry = createTestLabRegistry(),
): string[] {
  const errors: string[] = [];

  if (registry.worlds.length !== WORLD_REGISTRY.length) {
    errors.push("Test Lab must expose every World.");
  }
  if (registry.enemies.length !== ENEMY_REGISTRY.length) {
    errors.push("Test Lab must expose every enemy definition.");
  }
  if (registry.enemySkills.length !== ENEMY_SKILL_IDS.length) {
    errors.push("Test Lab must expose every enemy skill.");
  }
  if (registry.statuses.length !== STATUS_IDS.length) {
    errors.push("Test Lab must expose every status.");
  }
  if (registry.items.length !== ITEM_IDS.length) {
    errors.push("Test Lab must expose every item.");
  }
  if (registry.equipment.length !== EQUIPMENT_IDS.length) {
    errors.push("Test Lab must expose every equipment definition.");
  }
  if (registry.characterSkills.length !== CHARACTER_IDS.length) {
    errors.push("Test Lab must expose every character active skill.");
  }
  const characterSkillIds = new Set(
    registry.characterSkills.map((entry) => entry.characterId),
  );
  for (const characterId of CHARACTER_IDS) {
    if (!characterSkillIds.has(characterId)) {
      errors.push(
        "Missing Test Lab character active skill: " + characterId,
      );
    }
  }
  if (registry.musicProfileIds.length !== WORLD_REGISTRY.length) {
    errors.push("Every World must resolve a Test Lab music profile.");
  }

  const enemyIds = new Set(
    registry.enemies.map((enemy) => enemy.id),
  );
  for (const world of registry.worlds) {
    if (!enemyIds.has(world.miniBoss)) {
      errors.push(world.id + ": Mini Boss missing from Test Lab registry.");
    }
    if (!enemyIds.has(world.worldBoss)) {
      errors.push(world.id + ": World Boss missing from Test Lab registry.");
    }
  }

  errors.push(...validateWorldMusicProfiles());

  const worldIds = new Set(registry.worlds.map((world) => world.id));
  for (const id of registry.musicProfileIds) {
    if (!worldIds.has(id)) {
      errors.push("Unknown music profile World id: " + id);
    }
  }

  return errors;
}
