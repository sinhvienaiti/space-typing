import { describe, expect, it } from "vitest";
import { enemyAssetPreviewPaintedKind } from "../src/admin/enemy-asset-preview";

describe("enemyAssetPreviewPaintedKind", () => {
  it("maps canonical registry ids to painted runtime kinds when a painted family/kind asset can exist", () => {
    expect(enemyAssetPreviewPaintedKind("rainbow-scout")).toBe("scout");
    expect(enemyAssetPreviewPaintedKind("nature-leech")).toBe("leech");
    expect(enemyAssetPreviewPaintedKind("cosmic-commander")).toBe("commander");
  });

  it("keeps registry identities without a production kind on the modular fallback", () => {
    expect(enemyAssetPreviewPaintedKind("fortune-prism")).toBeNull();
    expect(enemyAssetPreviewPaintedKind("bomb-imp")).toBeNull();
  });
});
