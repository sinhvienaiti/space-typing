import { describe, expect, it } from "vitest";
import {
  createSkillAdminPreview,
  SKILL_ADMIN_IDS,
  validateSkillAdminPolicy,
} from "../src/admin/skill-registry-preview";

describe("B06.3 Skill Admin preview", () => {
  it("publishes the canonical combat skill registry with stable categories", () => {
    const preview = createSkillAdminPreview();
    expect(preview.protocolVersion).toBe(1);
    expect(preview.skills.map((skill) => skill.id)).toEqual(SKILL_ADMIN_IDS);
    expect(preview.skills).toHaveLength(15);
    expect(preview.skills.find((skill) => skill.id === "emp-burst")).toMatchObject({ category: "offensive" });
    expect(preview.skills.find((skill) => skill.id === "barrier")).toMatchObject({ category: "defensive" });
    expect(preview.skills.find((skill) => skill.id === "meteor")).toMatchObject({ category: "support" });
  });

  it("merges only canonical authorable fields", () => {
    const preview = createSkillAdminPreview({
      configRevision: "skills-admin-test",
      skills: {
        "chain-lightning": {
          name: "Arc Lance Mk.II",
          energyCost: 30,
          cooldown: 8.5,
          charges: 5,
          perStageLimit: 5,
          typingCondition: { minStreak: 10, minAccuracy: 92 },
        },
      },
    });
    const skill = preview.skills.find((item) => item.id === "chain-lightning");
    expect(skill).toMatchObject({
      id: "chain-lightning",
      category: "offensive",
      name: "Arc Lance Mk.II",
      energyCost: 30,
      cooldown: 8.5,
      charges: 5,
      perStageLimit: 5,
      typingCondition: { minStreak: 10, minAccuracy: 92 },
      overridden: true,
    });
  });

  it("supports explicitly removing an optional typing condition", () => {
    const preview = createSkillAdminPreview({
      configRevision: "skills-admin-test",
      skills: { barrier: { typingCondition: null } },
    });
    expect(preview.skills.find((skill) => skill.id === "barrier")?.typingCondition).toBeUndefined();
  });

  it("rejects unknown IDs, immutable fields and unsafe numeric values", () => {
    expect(() => validateSkillAdminPolicy({
      configRevision: "skills-admin-test",
      skills: { unknown: { energyCost: 20 } },
    })).toThrow(/Unknown skill id/);
    expect(() => validateSkillAdminPolicy({
      configRevision: "skills-admin-test",
      skills: { barrier: { category: "support" } as never },
    })).toThrow(/not authorable/);
    expect(() => validateSkillAdminPolicy({
      configRevision: "skills-admin-test",
      skills: { barrier: { energyCost: -1 } },
    })).toThrow(/energyCost/);
    expect(() => validateSkillAdminPolicy({
      configRevision: "skills-admin-test",
      skills: { barrier: { typingCondition: { minAccuracy: 101 } } },
    })).toThrow(/minAccuracy/);
  });
});
