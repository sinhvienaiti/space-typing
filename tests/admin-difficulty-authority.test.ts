import { describe, expect, it } from "vitest";
import { materializeStageRuntimeSession } from "../src/admin/stage-runtime-policy";
import { difficultyModeForAdminPreset } from "../src/campaign/difficulty-settings";

describe("Admin difficulty authority", () => {
  it("materializes a published Admin difficulty without changing the stage-policy contract", () => {
    const session = materializeStageRuntimeSession({
      activeRevision: "rev-42",
      applyBoundary: "new-session",
      gameDefaults: { difficulty: "hard" },
      policy: { configRevision: "stages-admin-v1", stages: [] },
    });

    expect(session.source).toBe("published");
    expect(session.activeRevision).toBe("rev-42");
    expect(session.difficultyPreset).toBe("hard");
  });

  it("preserves legacy/offline behaviour when an older runtime does not publish difficulty", () => {
    const session = materializeStageRuntimeSession({
      activeRevision: "rev-old",
      applyBoundary: "new-session",
      policy: { configRevision: "stages-admin-v1", stages: [] },
    });

    expect(session.source).toBe("published");
    expect(session.difficultyPreset).toBeNull();
  });

  it("maps Admin product presets onto the existing gameplay difficulty modes", () => {
    expect(difficultyModeForAdminPreset("easy")).toBe("relax");
    expect(difficultyModeForAdminPreset("normal")).toBe("balanced");
    expect(difficultyModeForAdminPreset("hard")).toBe("hard");
    expect(difficultyModeForAdminPreset(null)).toBeNull();
  });

  it("rejects unknown published difficulty values instead of changing current local behaviour", () => {
    const session = materializeStageRuntimeSession({
      activeRevision: "rev-bad",
      applyBoundary: "new-session",
      gameDefaults: { difficulty: "nightmare" },
      policy: { configRevision: "stages-admin-v1", stages: [] },
    });

    expect(session.source).toBe("published");
    expect(session.difficultyPreset).toBeNull();
  });
});
