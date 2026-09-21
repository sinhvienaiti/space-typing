import { describe, expect, it } from "vitest";
import {
  SkillEngine,
  type SkillDefinition,
} from "../src/skills/engine";

const barrier: SkillDefinition = {
  id: "barrier",
  name: "Barrier",
  energyCost: 30,
  cooldown: 5,
  charges: 2,
  perStageLimit: 3,
  typingCondition: {
    minStreak: 10,
    minAccuracy: 90,
  },
};

function context(
  energy = 100,
  streak = 10,
  hits = 90,
  misses = 10,
) {
  return { energy, streak, hits, misses };
}

describe("skill engine", () => {
  it("consumes Energy, starts cooldown and spends one charge", () => {
    const engine = new SkillEngine();
    engine.setDefinitions([barrier]);

    const result = engine.activate("barrier", context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.energy).toBe(70);
    expect(result.state.cooldownRemaining).toBe(5);
    expect(result.state.chargesRemaining).toBe(1);
    expect(result.state.usesThisStage).toBe(1);
  });

  it("ticks cooldown using caller-provided stage time", () => {
    const engine = new SkillEngine();
    engine.setDefinitions([barrier]);
    engine.activate("barrier", context());

    engine.tick(2);
    expect(engine.getState("barrier")?.cooldownRemaining).toBe(3);

    engine.tick(10);
    expect(engine.getState("barrier")?.cooldownRemaining).toBe(0);
  });

  it("blocks activation for cooldown, Energy, charges and typing conditions", () => {
    const engine = new SkillEngine();
    engine.setDefinitions([barrier]);

    expect(engine.canActivate("barrier", context(20))).toBe("energy");
    expect(engine.canActivate("barrier", context(100, 9))).toBe(
      "typing-condition",
    );
    expect(engine.canActivate("barrier", context(100, 10, 89, 11))).toBe(
      "typing-condition",
    );

    expect(engine.activate("barrier", context()).ok).toBe(true);
    expect(engine.canActivate("barrier", context())).toBe("cooldown");

    engine.tick(5);
    expect(engine.activate("barrier", context()).ok).toBe(true);
    engine.tick(5);
    expect(engine.canActivate("barrier", context())).toBe("no-charges");
  });

  it("enforces per-stage limit separately from unlimited charges", () => {
    const engine = new SkillEngine();
    engine.setDefinitions([
      {
        id: "pulse",
        name: "Pulse",
        energyCost: 0,
        cooldown: 0,
        charges: null,
        perStageLimit: 2,
      },
    ]);

    expect(engine.activate("pulse", context()).ok).toBe(true);
    expect(engine.activate("pulse", context()).ok).toBe(true);
    expect(engine.canActivate("pulse", context())).toBe("stage-limit");
  });

  it("resets cooldown, charges and stage uses at a new stage", () => {
    const engine = new SkillEngine();
    engine.setDefinitions([barrier]);
    engine.activate("barrier", context());

    engine.resetStage();

    expect(engine.getState("barrier")).toEqual({
      cooldownRemaining: 0,
      chargesRemaining: 2,
      usesThisStage: 0,
    });
  });

  it("rejects unknown skills without mutating Energy", () => {
    const engine = new SkillEngine();
    engine.setDefinitions([]);

    expect(engine.activate("missing", context())).toEqual({
      ok: false,
      reason: "unknown-skill",
      energy: 100,
      state: null,
    });
  });
});
