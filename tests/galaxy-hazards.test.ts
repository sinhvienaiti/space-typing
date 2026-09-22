import { describe, expect, it } from "vitest";
import { createStageConfig } from "../src/campaign/stage";
import { combineStageEventEffects } from "../src/events/stage-scheduler";
import { galaxyStageModifiers } from "../src/events/galaxy-hazards";

describe("Galaxy hazards and special stages", () => {
  it("assigns a deterministic beneficial modifier to World-slot special stages", () => {
    const stage = createStageConfig(15);
    const first = galaxyStageModifiers(stage);
    const second = galaxyStageModifiers(stage);

    expect(stage.role).toBe("special");
    expect(first).toEqual(second);
    expect(first).toHaveLength(1);
    expect(first[0]?.tone).toBe("benefit");
  });

  it("rotates Galaxy hazards at World-slot hazard stages", () => {
    const galaxyOne = galaxyStageModifiers(createStageConfig(55));
    const galaxyTwo = galaxyStageModifiers(createStageConfig(155));

    expect(galaxyOne[0]?.id).not.toBe(galaxyTwo[0]?.id);
    expect(galaxyOne[0]?.tone).not.toBe("benefit");
  });

  it("adds a fixed gauntlet modifier before the Galaxy Major Boss", () => {
    const events = galaxyStageModifiers(createStageConfig(95));
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
