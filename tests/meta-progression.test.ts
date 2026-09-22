import { describe, expect, it } from "vitest";
import { createDefaultCampaignProgress } from "../src/campaign/progress";
import { createStarterCharacterState } from "../src/characters/state";
import { createStarterEquipmentState } from "../src/equipment/loadout";
import { createHiddenDiscoveryState } from "../src/discovery/hidden-content";
import { createProgressionState } from "../src/progression/missions";
import {
  collectionEntries,
  resolveMetaProgression,
} from "../src/progression/meta";

describe("Codex collection and meta progression", () => {
  it("derives meta progression from durable collection facts", () => {
    const campaign = createDefaultCampaignProgress();
    campaign.clearedStages = Array.from({ length: 100 }, (_, index) => index + 1);
    campaign.highestUnlockedStage = 101;
    const characters = createStarterCharacterState();
    characters.unlocked = ["vanguard", "aegis"];
    const hidden = createHiddenDiscoveryState();
    hidden.discovered = ["ghost-contract"];
    const progression = createProgressionState();
    progression.unlockedAchievements = ["first-clear", "galaxy-one"];

    const meta = resolveMetaProgression({
      campaign,
      characters,
      equipment: createStarterEquipmentState(),
      hidden,
      progression,
    });

    expect(meta.points).toBeGreaterThan(100);
    expect(meta.level).toBeGreaterThan(1);
    expect(meta.collectionFound).toBeGreaterThan(0);
    expect(meta.collectionTotal).toBeGreaterThan(meta.collectionFound);
  });

  it("counts equipment definitions once even when multiple instances exist", () => {
    const equipment = createStarterEquipmentState();
    equipment.items.push({
      ...equipment.items[0]!,
      instanceId: "duplicate-pulse",
      rarity: "rare",
    });

    const meta = resolveMetaProgression({
      campaign: createDefaultCampaignProgress(),
      characters: createStarterCharacterState(),
      equipment,
      hidden: createHiddenDiscoveryState(),
      progression: createProgressionState(),
    });

    expect(meta.equipmentTypesOwned).toBe(8);
  });

  it("conceals collection identities that are not discovered", () => {
    const entries = collectionEntries({
      characters: createStarterCharacterState(),
      equipment: createStarterEquipmentState(),
      hidden: createHiddenDiscoveryState(),
      progression: createProgressionState(),
    });

    const lockedCharacter = entries.find(
      (entry) => entry.id === "character:aegis",
    );
    const lockedHidden = entries.find(
      (entry) => entry.id === "hidden:ghost-contract",
    );

    expect(lockedCharacter?.title).toBe("???");
    expect(lockedHidden?.title).toBe("???");
  });
});
