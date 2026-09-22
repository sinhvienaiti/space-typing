import { describe, expect, it } from "vitest";
import {
  bossVisualDefinitionId,
  bossVisualName,
} from "../src/boss/visual-profile";
import { enemyDefinition } from "../src/enemies/registry";

describe("first boss visual conversion", () => {
  it("alternates the first two boss families across galaxies", () => {
    expect(bossVisualDefinitionId(1)).toBe("archangel-core");
    expect(bossVisualDefinitionId(2)).toBe("demon-lord-orb");
    expect(bossVisualDefinitionId(3)).toBe("archangel-core");
  });

  it("uses the same registry art language as normal enemies", () => {
    expect(enemyDefinition(bossVisualDefinitionId(1))?.family).toBe("angel");
    expect(enemyDefinition(bossVisualDefinitionId(2))?.family).toBe("devil");
    expect(bossVisualName(1)).toBe("Archangel Core");
    expect(bossVisualName(2)).toBe("Demon Lord Orb");
  });
});
