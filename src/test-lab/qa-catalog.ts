import {
  CHARACTER_IDS,
  getCharacter,
  type CharacterId,
} from "../characters/registry";
import { playerProjectileProfile } from "../characters/projectiles";
import { VANGUARD_ACTIVE_SKILL } from "../characters/vanguard";
import { AEGIS_ACTIVE_SKILL } from "../characters/aegis";
import { VOLT_ACTIVE_SKILL } from "../characters/volt";
import { WRAITH_ACTIVE_SKILL } from "../characters/wraith";
import { FORTUNE_ACTIVE_SKILL } from "../characters/fortune";
import { ARSENAL_ACTIVE_SKILL } from "../characters/arsenal";
import { ORACLE_ACTIVE_SKILL } from "../characters/oracle";
import { BASTION_ACTIVE_SKILL } from "../characters/bastion";
import { REAPER_ACTIVE_SKILL } from "../characters/reaper";
import { CELESTIAL_ACTIVE_SKILL } from "../characters/celestial";
import { ZENITH_ACTIVE_SKILL } from "../characters/zenith";
import {
  allBossIdentities,
  type BossIdentity,
} from "../boss/identity";
import {
  ENEMY_FAMILY_IDS,
  type EnemyFamilyId,
} from "../enemies/families";
import { FAMILY_STYLES } from "../enemies/identity";
import {
  hasPaintedEnemy,
  paintedSpriteNames,
} from "../enemies/painted-sprites";
import {
  DEFENSIVE_SKILLS,
} from "../skills/defensive";
import {
  OFFENSIVE_SKILLS,
} from "../skills/offensive";
import {
  SUPPORT_SPELLS,
} from "../skills/support";
import type { SkillDefinition } from "../skills/engine";
import {
  EQUIPMENT_IDS,
  EQUIPMENT_REGISTRY,
  type EquipmentId,
} from "../equipment/registry";
import {
  EQUIPMENT_PERKS,
  type EquipmentPerkId,
} from "../equipment/perks";
import {
  paintedEquipmentIcon,
  paintedSkillIcon,
} from "../ui/painted-icons";
import {
  GALAXY_PLAYLISTS,
  MOOD_LABELS,
  MUSIC_TRACKS,
  type MusicTrack,
} from "../audio/music-library";
import { WORLD_REGISTRY } from "../worlds/registry";
import type { EnemyKind } from "../types";

export const TEST_LAB_ENEMY_KINDS = [
  "scout",
  "mine",
  "tank",
  "destroyer",
  "oppressor",
  "shield",
  "carrier",
  "jammer",
  "cloaker",
  "healer",
  "splitter",
  "sniper",
  "leech",
  "commander",
] as const satisfies readonly EnemyKind[];

export const TEST_LAB_ENEMY_FAMILIES =
  ENEMY_FAMILY_IDS;

export type EnemyVisualQaEntry = {
  family: EnemyFamilyId;
  kind: EnemyKind;
  spriteName: string;
  painted: boolean;
  material: string;
  deathStyle: string;
  shotSkin: string;
};

export function enemyVisualQa(
  family: EnemyFamilyId,
  kind: EnemyKind,
): EnemyVisualQaEntry {
  const style = FAMILY_STYLES[family];
  return {
    family,
    kind,
    spriteName: family + "-" + kind + ".webp",
    painted: hasPaintedEnemy(family, kind),
    material: style.material,
    deathStyle: style.death,
    shotSkin: style.shot,
  };
}

function bossQaStage(identity: BossIdentity): number | null {
  if (identity.role === "major-boss") {
    const match = /^tyrant-g(\\d{2})$/.exec(identity.id);
    return match === null ? null : Number(match[1]) * 100;
  }

  const world = WORLD_REGISTRY.find(
    (candidate) => candidate.enemyFamilies[0] === identity.family,
  );
  if (world === undefined) return null;
  return identity.role === "boss"
    ? world.stageEnd
    : world.stageStart + 9;
}

export type BossQaEntry = BossIdentity & {
  spriteName: string;
  painted: boolean;
  qaStage: number | null;
};

export function bossQaEntries(): BossQaEntry[] {
  const painted = new Set(paintedSpriteNames().bosses);
  return allBossIdentities().map((identity) => ({
    ...identity,
    spriteName: identity.id + ".webp",
    painted: painted.has(identity.id),
    qaStage: bossQaStage(identity),
  }));
}

export type SkillQaCategory =
  | "character"
  | "defensive"
  | "offensive"
  | "tactical";

export type SkillQaEntry = SkillDefinition & {
  category: SkillQaCategory;
  characterId?: CharacterId;
  painted: boolean;
  iconName: string;
  scenarioHint: string;
};

const CHARACTER_SKILLS: ReadonlyArray<{
  characterId: CharacterId;
  definition: SkillDefinition;
}> = [
  { characterId: "vanguard", definition: VANGUARD_ACTIVE_SKILL },
  { characterId: "aegis", definition: AEGIS_ACTIVE_SKILL },
  { characterId: "volt", definition: VOLT_ACTIVE_SKILL },
  { characterId: "wraith", definition: WRAITH_ACTIVE_SKILL },
  { characterId: "fortune", definition: FORTUNE_ACTIVE_SKILL },
  { characterId: "arsenal", definition: ARSENAL_ACTIVE_SKILL },
  { characterId: "oracle", definition: ORACLE_ACTIVE_SKILL },
  { characterId: "bastion", definition: BASTION_ACTIVE_SKILL },
  { characterId: "reaper", definition: REAPER_ACTIVE_SKILL },
  { characterId: "celestial", definition: CELESTIAL_ACTIVE_SKILL },
  { characterId: "zenith", definition: ZENITH_ACTIVE_SKILL },
];

const SKILL_SCENARIO_HINTS: Readonly<Record<string, string>> = {
  "chain-lightning": "Spawn 4 enemies so the production arc can chain.",
  "mark-of-weakness": "Spawn 1 enemy or boss so the production target lock has a target.",
  meteor: "Spawn 3 enemies to see all orbital-strike target effects.",
  "missile-swarm": "Spawn 6 enemies to see the full homing missile fan.",
  railgun: "Spawn several enemies; production logic chooses the current target lane.",
  "tractor-beam": "Spawn 1 enemy so the beam can pull and slow it.",
  cleanse: "Apply a negative status first if you want to verify the gameplay result.",
  "emp-burst": "Spawn enemies or hostile projectiles to verify the clear/jam result.",
  "reflect-field": "Spawn a firing enemy or boss to verify projectile reflection.",
  "time-shell": "Spawn moving enemies/projectiles to verify the slowdown.",
  "guardian-drone": "Create incoming damage/projectiles to verify interception.",
};

export function skillQaEntries(): SkillQaEntry[] {
  const entries: SkillQaEntry[] = [];

  for (const { characterId, definition } of CHARACTER_SKILLS) {
    entries.push({
      ...definition,
      category: "character",
      characterId,
      painted: paintedSkillIcon(definition.id) !== null,
      iconName: definition.id + ".webp",
      scenarioHint:
        "Select " +
        getCharacter(characterId).name +
        " to run this active skill through the production Game runtime.",
    });
  }

  for (const definition of DEFENSIVE_SKILLS) {
    entries.push({
      ...definition,
      category: "defensive",
      painted: paintedSkillIcon(definition.id) !== null,
      iconName: definition.id + ".webp",
      scenarioHint:
        SKILL_SCENARIO_HINTS[definition.id] ??
        "Force-activate through the production skill runtime.",
    });
  }

  for (const definition of OFFENSIVE_SKILLS) {
    entries.push({
      ...definition,
      category: "offensive",
      painted: paintedSkillIcon(definition.id) !== null,
      iconName: definition.id + ".webp",
      scenarioHint:
        SKILL_SCENARIO_HINTS[definition.id] ??
        "Spawn a target, then force-activate through the production runtime.",
    });
  }

  for (const definition of Object.values(SUPPORT_SPELLS)) {
    entries.push({
      ...definition,
      category: "tactical",
      painted: paintedSkillIcon(definition.id) !== null,
      iconName: definition.id + ".webp",
      scenarioHint:
        SKILL_SCENARIO_HINTS[definition.id] ??
        "Force-activate through the production tactical-system runtime.",
    });
  }

  return entries;
}

export type EquipmentQaEntry = {
  id: EquipmentId;
  name: string;
  slot: string;
  tier: number;
  description: string;
  perkId: EquipmentPerkId | null;
  perkName: string | null;
  perkDescription: string | null;
  painted: boolean;
  iconName: string;
};

export function equipmentQaEntries(): EquipmentQaEntry[] {
  return EQUIPMENT_IDS.map((id) => {
    const definition = EQUIPMENT_REGISTRY[id];
    const perkId = definition.perk ?? null;
    const perk =
      perkId === null
        ? null
        : EQUIPMENT_PERKS[perkId];
    return {
      id,
      name: definition.name,
      slot: definition.slot,
      tier: definition.tier,
      description: definition.description,
      perkId,
      perkName: perk?.name ?? null,
      perkDescription: perk?.description ?? null,
      painted: paintedEquipmentIcon(id) !== null,
      iconName: id + ".webp",
    };
  });
}

export type ProjectileQaEntry = {
  characterId: CharacterId;
  characterName: string;
  archetype: string;
  impactVariant: string;
  primary: string;
  secondary: string;
  width: number;
  glow: number;
};

export function projectileQaEntries(): ProjectileQaEntry[] {
  return CHARACTER_IDS.map((characterId) => {
    const profile = playerProjectileProfile(characterId);
    return {
      characterId,
      characterName: getCharacter(characterId).name,
      archetype: profile.archetype,
      impactVariant: profile.impactVariant,
      primary: profile.primary,
      secondary: profile.secondary,
      width: profile.width,
      glow: profile.glow,
    };
  });
}

export type MusicTrackQaEntry = MusicTrack & {
  moodLabel: string;
  galaxies: number[];
};

export function musicTrackQaEntries(): MusicTrackQaEntry[] {
  return MUSIC_TRACKS.map((track) => ({
    ...track,
    moodLabel: MOOD_LABELS[track.mood],
    galaxies: Object.entries(GALAXY_PLAYLISTS)
      .filter(([, ids]) => ids.includes(track.id))
      .map(([galaxy]) => Number(galaxy)),
  }));
}
