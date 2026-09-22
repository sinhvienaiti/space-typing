import { describe, expect, it } from "vitest";
import {
  bossVisualDefinitionId,
  bossVisualName,
} from "../src/boss/visual-profile";
import { enemyDefinition } from "../src/enemies/registry";

describe("V1 boss visual conversion", () => {
  it("cycles the four V1 boss families across galaxies", () => {
    expect(bossVisualDefinitionId(1)).toBe("archangel-core");
    expect(bossVisualDefinitionId(2)).toBe("demon-lord-orb");
    expect(bossVisualDefinitionId(3)).toBe("glacier-queen");
    expect(bossVisualDefinitionId(4)).toBe("prism-archon");
    expect(bossVisualDefinitionId(5)).toBe("archangel-core");
  });

  it("keeps all bosses inside the shared enemy art registry", () => {
    expect(enemyDefinition(bossVisualDefinitionId(1))?.family).toBe("angel");
    expect(enemyDefinition(bossVisualDefinitionId(2))?.family).toBe("devil");
    expect(enemyDefinition(bossVisualDefinitionId(3))?.family).toBe("frost");
    expect(enemyDefinition(bossVisualDefinitionId(4))?.family).toBe("prism");
  });

  it("uses the visual identity as the boss HUD name", () => {
    expect(bossVisualName(1)).toBe("Archangel Core");
    expect(bossVisualName(2)).toBe("Demon Lord Orb");
    expect(bossVisualName(3)).toBe("Glacier Queen");
    expect(bossVisualName(4)).toBe("Prism Archon");
  });
});
