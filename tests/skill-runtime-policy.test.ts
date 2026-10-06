import { describe, expect, it } from "vitest";
import { materializeSkillRuntimeSession } from "../src/admin/skill-runtime-policy";

describe("skill runtime policy", () => {
  it("materializes a valid published new-session policy", () => {
    const session = materializeSkillRuntimeSession({
      protocolVersion: 1,
      activeRevision: "r9",
      applyBoundary: "new-session",
      policy: {
        configRevision: "skills-admin-test",
        skills: {
          barrier: {
            name: "Hex Shield Mk.II",
            energyCost: 24,
            cooldown: 8.5,
            charges: 5,
            perStageLimit: 5,
            typingCondition: { minStreak: 10, minAccuracy: 95 },
          },
          meteor: { typingCondition: null },
        },
      },
    });
    expect(session.source).toBe("published");
    expect(session.activeRevision).toBe("r9");
    expect(session.skills.barrier).toMatchObject({
      name: "Hex Shield Mk.II",
      energyCost: 24,
      cooldown: 8.5,
      charges: 5,
      perStageLimit: 5,
      typingCondition: { minStreak: 10, minAccuracy: 95 },
    });
    expect(session.skills.meteor?.typingCondition).toBeNull();
  });

  it("rejects the entire envelope when the apply boundary is unsafe", () => {
    const session = materializeSkillRuntimeSession({
      activeRevision: "r10",
      applyBoundary: "immediate",
      policy: { configRevision: "skills-admin-test", skills: { barrier: { energyCost: 20 } } },
    });
    expect(session.source).toBe("bundled");
    expect(session.skills).toEqual({});
  });

  it("drops unknown or invalid per-skill overrides while retaining valid ones", () => {
    const session = materializeSkillRuntimeSession({
      activeRevision: "r11",
      applyBoundary: "new-session",
      policy: {
        configRevision: "skills-admin-test",
        skills: {
          unknown: { energyCost: 20 },
          barrier: { energyCost: 201 },
          railgun: { energyCost: 34 },
        },
      },
    });
    expect(session.source).toBe("published");
    expect(session.skills.unknown).toBeUndefined();
    expect(session.skills.barrier).toBeUndefined();
    expect(session.skills.railgun?.energyCost).toBe(34);
  });
});
