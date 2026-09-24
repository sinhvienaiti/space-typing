import { describe, expect, it } from "vitest";
import {
  achievementImportance,
  collectionImportance,
  missionImportance,
  objectiveImportance,
} from "../src/ui/importance";
import {
  ACHIEVEMENT_IDS,
  MISSION_IDS,
} from "../src/progression/missions";
import { STAGE_OBJECTIVE_TYPES } from "../src/events/objectives";

describe("Batch E importance presentation", () => {
  it("gives every mission semantic icon/state without inventing persisted rarity", () => {
    expect(missionImportance("clear-5", "active")).toMatchObject({
      icon: "◎",
      label: "Campaign",
      stateLabel: "In progress",
    });
    expect(missionImportance("accuracy-98x3", "claimable").stateLabel)
      .toBe("Reward ready");
    expect(missionImportance("drops-10", "claimed").stateLabel)
      .toBe("Claimed");
  });

  it("covers every real mission, achievement and objective type with readable icon/state text", () => {
    for (const id of MISSION_IDS) {
      const presentation = missionImportance(id, "active");
      expect(presentation.icon.length, id).toBeGreaterThan(0);
      expect(presentation.label.length, id).toBeGreaterThan(0);
      expect(presentation.stateLabel, id).toBe("In progress");
    }

    for (const id of ACHIEVEMENT_IDS) {
      const unlocked = achievementImportance(id, true);
      expect(unlocked.icon.length, id).toBeGreaterThan(0);
      expect(unlocked.label.length, id).toBeGreaterThan(0);
      expect(unlocked.stateLabel, id).toBe("Unlocked");
    }

    for (const type of STAGE_OBJECTIVE_TYPES) {
      const presentation = objectiveImportance(type, false, "active");
      expect(presentation.icon.length, type).toBeGreaterThan(0);
      expect(presentation.label.length, type).toBeGreaterThan(0);
      expect(presentation.stateLabel, type).toBe("Bonus");
    }
  });

  it("does not expose locked achievement identity through presentation", () => {
    expect(achievementImportance("hidden-signal", false)).toEqual({
      icon: "?",
      label: "Achievement",
      accent: "#667985",
      stateLabel: "Locked",
    });
    expect(achievementImportance("hidden-signal", true)).toMatchObject({
      icon: "✧",
      label: "Discovery",
      stateLabel: "Unlocked",
    });
  });

  it("hides category identity for every undiscovered collection entry", () => {
    for (const category of [
      "character",
      "equipment",
      "hidden",
      "achievement",
      "world",
      "enemy",
      "boss",
      "reward",
    ] as const) {
      expect(collectionImportance(category, false)).toEqual({
        icon: "?",
        label: "Undiscovered",
        accent: "#667985",
        stateLabel: "Locked entry",
      });
    }
    expect(collectionImportance("boss", true)).toMatchObject({
      icon: "♛",
      label: "Boss",
      stateLabel: "Discovered",
    });
  });

  it("makes required/bonus and complete/failed objective states explicit beyond color", () => {
    expect(objectiveImportance("accuracy", true, "active")).toMatchObject({
      icon: "⌖",
      label: "Accuracy",
      stateLabel: "Required",
    });
    expect(objectiveImportance("elite-hunt", false, "active").stateLabel)
      .toBe("Bonus");
    expect(objectiveImportance("speed-clear", false, "complete").stateLabel)
      .toBe("Complete");
    expect(objectiveImportance("protect", true, "failed").stateLabel)
      .toBe("Failed");
  });
});
