import { describe, expect, it } from "vitest";
import { enemyAssetPreviewPaintedKind } from "../src/admin/enemy-asset-preview";

describe("enemyAssetPreviewPaintedKind", () => {
  it("preserves direct canonical family-kind mappings", () => {
    expect(enemyAssetPreviewPaintedKind("rainbow-scout", "normal")).toBe("scout");
    expect(enemyAssetPreviewPaintedKind("nature-leech", "normal")).toBe("leech");
    expect(enemyAssetPreviewPaintedKind("cosmic-commander", "elite")).toBe("commander");
  });

  it("uses explicit presentation mappings for registry identities whose ids do not encode a runtime kind", () => {
    expect(enemyAssetPreviewPaintedKind("freeze-burst-sprite", "control")).toBe("jammer");
    expect(enemyAssetPreviewPaintedKind("bomb-imp", "burst")).toBe("mine");
    expect(enemyAssetPreviewPaintedKind("angel-guard", "support")).toBe("shield");
    expect(enemyAssetPreviewPaintedKind("shade-wisp", "normal")).toBe("cloaker");
  });

  it("falls back to role-based painted presentation rather than the modular base renderer", () => {
    expect(enemyAssetPreviewPaintedKind("fortune-prism", "elite")).toBe("commander");
    expect(enemyAssetPreviewPaintedKind("treasure-prism", "reward")).toBe("scout");
    expect(enemyAssetPreviewPaintedKind("unknown-support-id", "support")).toBe("healer");
  });

  it("only returns null when no registry role context is available", () => {
    expect(enemyAssetPreviewPaintedKind("unmapped-id")).toBeNull();
  });
});
