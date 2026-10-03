import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../src/characters/registry";
import { EQUIPMENT_IDS } from "../src/equipment/registry";
import {
  TEST_LAB_ENEMY_FAMILIES,
  TEST_LAB_ENEMY_KINDS,
  bossQaEntries,
  equipmentQaEntries,
  musicTrackQaEntries,
  projectileQaEntries,
  skillQaEntries,
} from "../src/test-lab/qa-catalog";
import { AUDIO_QA_SFX } from "../src/test-lab/audio-qa";

describe("Test Lab production QA catalog", () => {
  it("covers all 112 family/kind enemy art combinations", () => {
    expect(TEST_LAB_ENEMY_FAMILIES).toHaveLength(8);
    expect(TEST_LAB_ENEMY_KINDS).toHaveLength(14);
    expect(
      TEST_LAB_ENEMY_FAMILIES.length *
        TEST_LAB_ENEMY_KINDS.length,
    ).toBe(112);
  });

  it("covers all 26 authored boss identities", () => {
    const bosses = bossQaEntries();
    expect(bosses).toHaveLength(26);
    expect(new Set(bosses.map((boss) => boss.id)).size).toBe(26);
    expect(
      bosses.every((boss) => boss.qaStage !== null),
    ).toBe(true);
  });

  it("covers every production player skill without duplicates", () => {
    const skills = skillQaEntries();
    expect(skills).toHaveLength(26);
    expect(new Set(skills.map((skill) => skill.id)).size).toBe(26);
    expect(
      skills.filter((skill) => skill.category === "character"),
    ).toHaveLength(CHARACTER_IDS.length);
  });

  it("covers every equipment definition and projectile profile", () => {
    const equipment = equipmentQaEntries();
    const projectiles = projectileQaEntries();

    expect(equipment).toHaveLength(EQUIPMENT_IDS.length);
    expect(new Set(equipment.map((entry) => entry.id)).size)
      .toBe(EQUIPMENT_IDS.length);

    expect(projectiles).toHaveLength(CHARACTER_IDS.length);
    expect(
      new Set(projectiles.map((entry) => entry.characterId)).size,
    ).toBe(CHARACTER_IDS.length);
  });

  it("exposes generated music metadata and a documented SFX browser", () => {
    const tracks = musicTrackQaEntries();
    expect(tracks.length).toBeGreaterThanOrEqual(13);
    expect(new Set(tracks.map((track) => track.id)).size)
      .toBe(tracks.length);

    expect(AUDIO_QA_SFX.length).toBeGreaterThan(20);
    expect(new Set(AUDIO_QA_SFX.map((entry) => entry.id)).size)
      .toBe(AUDIO_QA_SFX.length);
    expect(
      AUDIO_QA_SFX.every((entry) => entry.usedWhen.length > 10),
    ).toBe(true);
  });
});
