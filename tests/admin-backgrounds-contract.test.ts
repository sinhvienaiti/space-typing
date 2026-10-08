import { describe, expect, it } from "vitest";
import backgroundsContract from "../contracts/space-typing-admin-backgrounds.v1.json";
import { BACKGROUND_COMPOSITIONS, validateComposition } from "../src/background/compositions";
import { backgroundBudget } from "../src/background/budget";
import type { BackgroundTier } from "../src/background/types";

const BACKGROUND_QUALITY_TIERS: readonly BackgroundTier[] = ["low", "medium", "high", "ultra"];

describe("Space Typing Admin Backgrounds contract", () => {
  it("tracks the canonical world composition catalog", () => {
    expect(backgroundsContract.capability).toBe("backgrounds.read");
    expect(backgroundsContract.backgrounds.compositionCount).toBe(BACKGROUND_COMPOSITIONS.length);
    expect(backgroundsContract.backgrounds.galaxyKitCount).toBe(
      new Set(BACKGROUND_COMPOSITIONS.map((entry) => entry.kitId)).size,
    );
    expect(BACKGROUND_COMPOSITIONS.every((entry) => validateComposition(entry).length === 0)).toBe(true);
  });

  it("keeps quality budgets aligned with runtime", () => {
    expect(backgroundsContract.backgrounds.qualityTiers).toEqual([...BACKGROUND_QUALITY_TIERS]);
    for (const tier of BACKGROUND_QUALITY_TIERS) {
      expect(backgroundsContract.backgrounds.qualityBudgets[tier]).toEqual(backgroundBudget(tier));
    }
  });

  it("exposes real preview but no Admin authoring", () => {
    expect(backgroundsContract.backgrounds.preview).toMatchObject({
      available: true,
      path: "/bg-gallery.html",
      renderer: "BackgroundStage",
      productionRenderer: true,
    });
    expect(backgroundsContract.backgrounds.authorableFields).toEqual([]);
    expect(backgroundsContract.backgrounds.writeCapability).toBe(false);
    expect(backgroundsContract.backgrounds.adminPreviewWriteCapability).toBe(false);
  });
});