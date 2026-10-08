import { describe, expect, it } from "vitest";
import contract from "../contracts/space-typing-admin-qa.v1.json";

describe("Admin QA Sandbox contract", () => {
  it("exposes the real Test Lab as an ephemeral executable sandbox", () => {
    expect(contract.contractRevision).toBe("space-typing-admin-qa-v1");
    expect(contract.capability).toBe("qa.execute");
    expect(contract.route).toEqual({
      id: "qa",
      path: "/admin/space-typing/qa",
      label: "QA Sandbox",
    });
    expect(contract.qa.mode).toBe("runtime-backed-ephemeral-sandbox");
    expect(contract.qa.applyBoundary).toBe("new-qa-run");
    expect(contract.qa.sandboxMutationCapability).toBe(true);
  });

  it("keeps Test Lab writes isolated from production persistence", () => {
    expect(contract.qa.persistence).toEqual({
      session: "isolated-in-memory",
      preset: "test-lab-only-browser-local-storage",
      presetKey: "spaceTypingTestLabPresetV1",
      productionCampaign: "no-write",
    });
    expect(contract.qa.presetWriteCapability).toBe(true);
    expect(contract.qa.productionPersistenceWriteCapability).toBe(false);
    expect(contract.qa.publishCapability).toBe(false);
    expect(contract.qa.safety.neverAutosavesCampaignProgression).toBe(true);
    expect(contract.qa.safety.productionSaveMutation).toBe(false);
  });

  it("documents lifecycle, inspection, and runtime ownership", () => {
    expect(contract.qa.lifecycleActions).toEqual([
      "start-or-restart-arena",
      "pause-or-resume",
      "reset-arena",
      "destroy-runtime",
    ]);
    expect(contract.qa.inspection).toContain("game-snapshot");
    expect(contract.qa.inspection).toContain("runtime-registry");
    expect(contract.qa.inspection).toContain("qa-catalog");
    expect(contract.qa.runtimeSources).toContain("src/test-lab/controller.ts");
    expect(contract.qa.runtimeSources).toContain("src/test-lab/session.ts");
    expect(contract.qa.runtimeSources).toContain("src/Game.ts");
    expect(contract.qa.runtimeSources).toContain("src/main.ts");
  });

  it("rejects fake production write semantics", () => {
    expect(contract.qa.unsupportedAdminOperations).toContain(
      "save sandbox state into Campaign progression",
    );
    expect(contract.qa.unsupportedAdminOperations).toContain(
      "publish sandbox state as production config",
    );
    expect(contract.qa.unsupportedAdminOperations).toContain("overwrite player saves");
    expect(contract.qa.unsupportedAdminOperations).toContain(
      "persist Test Lab rewards into production wallets",
    );
  });
});
