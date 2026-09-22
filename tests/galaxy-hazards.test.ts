import { describe, expect, it } from "vitest";
import { createStageConfig } from "../src/campaign/stage";
import { combineStageEventEffects } from "../src/events/stage-scheduler";
import { galaxyStageModifiers } from "../src/events/galaxy-hazards";

describe("Galaxy hazards and special stages", () => {
  it("assigns a deterministic beneficial modifier to Stage x30", () => {
    const stage = createStageConfig(30);
    const first = galaxyStageModifiers(stage);
    const second = galaxyStageModifiers(stage);

    expect(stage.role).toBe("special");
    expect(first).toEqual(second);
    expect(first).toHaveLength(1);
    expect(first[0]?.tone).toBe("benefit");
  });

  it("rotates Galaxy hazards at Stage x60", () => {
    const galaxyOne = galaxyStageModifiers(createStageConfig(60));
    const galaxyTwo = galaxyStageModifiers(createStageConfig(160));

    expect(galaxyOne[0]?.id).not.toBe(galaxyTwo[0]?.id);
    expect(galaxyOne[0]?.tone).not.toBe("benefit");
  });

  it("adds a fixed gauntlet modifier at Stage x90", () => {
    const events = galaxyStageModifiers(createStageConfig(90));
    const modifiers = combineStageEventEffects(events);

    expect(events.map((event) => event.id)).toEqual([
      "gauntlet-pressure",
    ]);
    expect(modifiers.extraEnemyLayers).toBe(1);
    expect(modifiers.enemySpeedMultiplier).toBeGreaterThan(1);
    expect(modifiers.supplyMultiplier).toBe(2);
  });

  it("does not add role modifiers to normal stages", () => {
    expect(galaxyStageModifiers(createStageConfig(41))).toEqual([]);
  });
});
