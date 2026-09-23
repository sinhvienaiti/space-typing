import { describe, expect, it } from "vitest";
import {
  createHiddenTransitionSpec,
  createStageTransitionSpec,
} from "../src/ui/stage-transition";

describe("stage transition presentation", () => {
  it("keeps normal stage transitions short", () => {
    const spec = createStageTransitionSpec({
      stage: 38,
      galaxy: 1,
      stageInGalaxy: 38,
      stageInWorld: 18,
      worldName: "Halo Garden",
      role: "normal",
    });

    expect(spec.tone).toBe("regular");
    expect(spec.title).toBe("STAGE 038");
    expect(spec.durationMs).toBeLessThan(1000);
  });

  it("promotes World and Galaxy entry presentations", () => {
    const world = createStageTransitionSpec({
      stage: 21,
      galaxy: 1,
      stageInGalaxy: 21,
      stageInWorld: 1,
      worldName: "Halo Garden",
      role: "normal",
    });
    const galaxy = createStageTransitionSpec({
      stage: 101,
      galaxy: 2,
      stageInGalaxy: 1,
      stageInWorld: 1,
      worldName: "Ember Orchard",
      role: "normal",
    });

    expect(world.tone).toBe("world");
    expect(world.title).toBe("Halo Garden");
    expect(galaxy.tone).toBe("galaxy");
    expect(galaxy.eyebrow).toContain("NEW GALAXY");
    expect(galaxy.durationMs).toBeGreaterThan(world.durationMs);
  });

  it("escalates boss presentation duration", () => {
    const mini = createStageTransitionSpec({
      stage: 10,
      galaxy: 1,
      stageInGalaxy: 10,
      stageInWorld: 10,
      worldName: "Rainbow Reach",
      role: "mini-boss",
    });
    const boss = createStageTransitionSpec({
      stage: 20,
      galaxy: 1,
      stageInGalaxy: 20,
      stageInWorld: 20,
      worldName: "Rainbow Reach",
      role: "boss",
    });
    const major = createStageTransitionSpec({
      stage: 100,
      galaxy: 1,
      stageInGalaxy: 100,
      stageInWorld: 20,
      worldName: "Aurora Gate",
      role: "major-boss",
    });

    expect(mini.tone).toBe("mini-boss");
    expect(boss.tone).toBe("world-boss");
    expect(major.tone).toBe("galaxy-boss");
    expect(mini.durationMs).toBeLessThan(boss.durationMs);
    expect(boss.durationMs).toBeLessThan(major.durationMs);
  });

  it("gives elite-like roles a stronger but still fast briefing", () => {
    for (const role of ["elite", "special", "hazard", "gauntlet"] as const) {
      const spec = createStageTransitionSpec({
        stage: 15,
        galaxy: 1,
        stageInGalaxy: 15,
        stageInWorld: 15,
        worldName: "Rainbow Reach",
        role,
      });
      expect(spec.tone).toBe("elite");
      expect(spec.durationMs).toBeLessThan(1100);
    }
  });

  it("keeps hidden encounters optional in their copy", () => {
    const spec = createHiddenTransitionSpec(
      "Champion Hunt",
      250,
    );

    expect(spec.tone).toBe("hidden");
    expect(spec.eyebrow).toContain("OPTIONAL");
    expect(spec.subtitle).toContain("Stage 250");
  });
});
