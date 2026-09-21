import { describe, expect, it } from "vitest";
import { createStageConfig } from "../src/campaign/stage";
import {
  combineStageEventEffects,
  scheduleStageRandomEvents,
  STAGE_RANDOM_EVENT_REGISTRY,
} from "../src/events/stage-scheduler";

describe("stage random-event scheduler", () => {
  it("does not schedule events before modifier slots unlock", () => {
    expect(
      scheduleStageRandomEvents(
        createStageConfig(20),
        100,
        () => 0,
      ),
    ).toEqual([]);
  });

  it("is deterministic from the stage seed when no RNG is injected", () => {
    const stage = createStageConfig(250);
    expect(scheduleStageRandomEvents(stage, 25)).toEqual(
      scheduleStageRandomEvents(stage, 25),
    );
  });

  it("never schedules duplicate events or more than modifier slots", () => {
    const stage = createStageConfig(600);
    const values = [0, 0.01, 0, 0.2, 0, 0.4];
    let index = 0;
    const events = scheduleStageRandomEvents(
      stage,
      0,
      () => values[index++ % values.length] ?? 0,
    );

    expect(events.length).toBeLessThanOrEqual(stage.modifierSlots);
    expect(new Set(events.map((event) => event.id)).size).toBe(
      events.length,
    );
  });

  it("gives Luck extra weight only to beneficial events", () => {
    const stage = createStageConfig(100);
    const sequence = [0, 0.69];
    let index = 0;
    const withoutLuck = scheduleStageRandomEvents(
      stage,
      0,
      () => sequence[index++ % sequence.length] ?? 0,
    );

    index = 0;
    const withLuck = scheduleStageRandomEvents(
      stage,
      100,
      () => sequence[index++ % sequence.length] ?? 0,
    );

    expect(withoutLuck).not.toEqual(withLuck);
  });

  it("combines scheduler effects without mutating definitions", () => {
    const events = [
      STAGE_RANDOM_EVENT_REGISTRY["fast-enemies"],
      STAGE_RANDOM_EVENT_REGISTRY["armored-enemies"],
      STAGE_RANDOM_EVENT_REGISTRY["double-supply"],
      STAGE_RANDOM_EVENT_REGISTRY["projectile-storm"],
    ];
    const modifiers = combineStageEventEffects(events);

    expect(modifiers.enemySpeedMultiplier).toBe(1.18);
    expect(modifiers.extraEnemyLayers).toBe(1);
    expect(modifiers.supplyMultiplier).toBe(2);
    expect(modifiers.projectilePressureMultiplier).toBe(1.25);
    expect(modifiers.startingShieldMultiplier).toBe(1);
  });
});
