import { describe, expect, it } from "vitest";
import {
  A8_WORLD_STAGE_CAPABILITIES,
  a8WorldStageCapability,
} from "../src/admin/a8-world-stage-content-capabilities";

describe("A8 Worlds / Stages / adjacent content capability matrix", () => {
  it("keeps capability ids unique and supported authoring production-backed", () => {
    const ids = A8_WORLD_STAGE_CAPABILITIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const entry of A8_WORLD_STAGE_CAPABILITIES) {
      expect(entry.canonicalOwner.length).toBeGreaterThan(0);
      expect(entry.note.length).toBeGreaterThan(0);
      if (entry.status === "SUPPORTED NOW") {
        expect(entry.persistedField).not.toBeNull();
        expect(entry.validator).not.toBeNull();
        expect(entry.runtimeResolver).not.toBeNull();
        expect(entry.productionConsumer).not.toBeNull();
        expect(entry.applyBoundary).toBe("new-session");
      }
    }
  });

  it("opens World enemyRoster only after production roster selection consumes it", () => {
    expect(a8WorldStageCapability("world.enemy-roster")).toMatchObject({
      persistedField: "worlds.<id>.enemyRoster",
      canonicalOwner: "src/admin/world-runtime-policy.ts",
      runtimeResolver: expect.stringContaining("worldProfileForRuntimeStage"),
      productionConsumer: expect.stringContaining("src/worlds/roster.ts"),
      applyBoundary: "new-session",
      status: "SUPPORTED NOW",
    });
  });

  it("opens only the three proven Stage gameplay tuning fields", () => {
    expect(a8WorldStageCapability("stage.gameplay-tuning")).toMatchObject({
      persistedField: "stages[].{enemyBudget,eliteChance,modifierSlots}",
      canonicalOwner: "src/admin/stage-runtime-policy.ts",
      runtimeResolver: expect.stringContaining("createStageConfig"),
      productionConsumer: expect.stringContaining("src/main.ts"),
      applyBoundary: "new-session",
      status: "SUPPORTED NOW",
    });
  });

  it("keeps structural World data and deterministic campaign systems read-only", () => {
    for (const id of [
      "world.structure-presentation-rewards",
      "route.graph",
      "objective.definition",
      "challenge.daily-weekly-identity",
      "typing.catalog-reference",
    ]) {
      expect(a8WorldStageCapability(id)?.status).toBe("READ-ONLY REFERENCE");
    }
  });

  it("does not invent Stage typing assignment or generic World relationship foreign keys", () => {
    expect(a8WorldStageCapability("typing.stage-assignment")).toMatchObject({
      persistedField: null,
      validator: null,
      runtimeResolver: null,
      productionConsumer: null,
      status: "DEFERRED / UNSUPPORTED",
    });
    expect(a8WorldStageCapability("world.media-reward-relationship-authoring")).toMatchObject({
      persistedField: null,
      runtimeResolver: null,
      productionConsumer: null,
      status: "DEFERRED / UNSUPPORTED",
    });
  });
});
