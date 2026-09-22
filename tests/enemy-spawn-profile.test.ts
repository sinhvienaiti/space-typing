import { describe, expect, it } from "vitest";
import { runtimeEnemyDefinitionId } from "../src/enemies/spawn-profile";

describe("core four enemy visual mapping", () => {
  it("maps legacy combat kinds into the new visual families", () => {
    expect(runtimeEnemyDefinitionId("scout", false)).toBe("rainbow-scout");
    expect(runtimeEnemyDefinitionId("mine", false)).toBe("rainbow-dart");
    expect(runtimeEnemyDefinitionId("tank", false)).toBe("rainbow-bubble");
    expect(runtimeEnemyDefinitionId("healer", false)).toBe("angel-healer");
    expect(runtimeEnemyDefinitionId("destroyer", false)).toBe("imp-spark");
    expect(runtimeEnemyDefinitionId("jammer", false)).toBe("snow-wisp");
  });

  it("reuses the existing elite flag for elite visual evolution", () => {
    expect(runtimeEnemyDefinitionId("healer", true)).toBe("seraph-elite");
    expect(runtimeEnemyDefinitionId("destroyer", true)).toBe("berserk-devil");
  });
});
