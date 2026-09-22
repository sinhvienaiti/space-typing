import { describe, expect, it } from "vitest";
import {
  bossVisualDefinitionId,
  bossVisualName,
} from "../src/boss/visual-profile";
import { enemyDefinition } from "../src/enemies/registry";

describe("boss visual conversion", () => {
  it("cycles V1 bosses before late Shadow/Cosmic bosses", () => {
    expect(bossVisualDefinitionId(1)).toBe("archangel-core");
    expect(bossVisualDefinitionId(2)).toBe("demon-lord-orb");
    expect(bossVisualDefinitionId(3)).toBe("glacier-queen");
    expect(bossVisualDefinitionId(4)).toBe("prism-archon");
    expect(bossVisualDefinitionId(5)).toBe("archangel-core");
    expect(bossVisualDefinitionId(9)).toBe("void-eye");
    expect(bossVisualDefinitionId(10)).toBe("cosmic-emperor");
  });

  it("uses the V1 mini-boss roster on mini-boss stages", () => {
    expect(bossVisualDefinitionId(1, "mini-boss")).toBe("halo-seraph");
    expect(bossVisualDefinitionId(2, "mini-boss")).toBe("crown-demon");
    expect(bossVisualDefinitionId(3, "mini-boss")).toBe("glacier-oracle");
    expect(bossVisualDefinitionId(4, "mini-boss")).toBe("prism-sentinel");
    expect(bossVisualName(1, "mini-boss")).toBe("Halo Seraph");
  });

  it("keeps all boss visuals inside the shared enemy art registry", () => {
    for (const galaxy of [1, 2, 3, 4, 9, 10]) {
      expect(enemyDefinition(bossVisualDefinitionId(galaxy))).toBeDefined();
    }
  });

  it("uses the visual identity as the boss HUD name", () => {
    expect(bossVisualName(1)).toBe("Archangel Core");
    expect(bossVisualName(4)).toBe("Prism Archon");
    expect(bossVisualName(9)).toBe("Void Eye");
    expect(bossVisualName(10)).toBe("Cosmic Emperor");
  });
});
