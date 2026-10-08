import { describe, expect, it } from "vitest";
import contract from "../contracts/space-typing-admin-ui-assets.v1.json";

describe("Admin UI Assets contract", () => {
  it("exposes runtime-owned UI as read-only", () => {
    expect(contract.contractRevision).toBe("space-typing-admin-ui-assets-v1");
    expect(contract.capability).toBe("ui-assets.read");
    expect(contract.route).toEqual({
      id: "ui-assets",
      path: "/admin/space-typing/ui-assets",
      label: "UI Assets",
    });
    expect(contract.uiAssets.mode).toBe("runtime-derived-readonly");
    expect(contract.uiAssets.persistenceOwner).toBe("code-owned-runtime-ui");
    expect(contract.uiAssets.authorableFields).toEqual([]);
    expect(contract.uiAssets.writeCapability).toBe(false);
    expect(contract.uiAssets.previewWriteCapability).toBe(false);
    expect(contract.uiAssets.applyBoundary).toBe("none");
  });

  it("documents the canonical presentation ownership surfaces", () => {
    expect(contract.uiAssets.surfaces.map((surface) => surface.id)).toEqual([
      "shared-components",
      "game-hud",
      "duel-battle",
      "ranked",
    ]);
    expect(contract.uiAssets.runtimeSources).toContain("src/ui/components.ts");
    expect(contract.uiAssets.runtimeSources).toContain("src/hud/hotbar.ts");
    expect(contract.uiAssets.runtimeSources).toContain("src/duel/battle-ui.ts");
    expect(contract.uiAssets.runtimeSources).toContain("src/duel/ranked.ts");
    expect(contract.uiAssets.runtimeSources).toContain("src/styles.css");
  });

  it("does not advertise fake UI authoring controls", () => {
    expect(contract.uiAssets.unsupportedAdminMockFields).toContain("HUD asset upload");
    expect(contract.uiAssets.unsupportedAdminMockFields).toContain("duel widget asset CRUD");
    expect(contract.uiAssets.unsupportedAdminMockFields).toContain("ranked widget asset CRUD");
    expect(contract.uiAssets.unsupportedAdminMockFields).toContain("runtime CSS variable writer");
  });
});
