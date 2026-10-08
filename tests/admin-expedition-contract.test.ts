import { describe, expect, it } from "vitest";
import contract from "../contracts/space-typing-admin-expedition.v1.json";

describe("Admin Expedition contract", () => {
  it("maps the production Expedition runtime read-only", () => {
    expect(contract.contractRevision).toBe("space-typing-admin-expedition-v1");
    expect(contract.capability).toBe("expedition.read");
    expect(contract.route.path).toBe("/admin/space-typing/expedition");
    expect(contract.expedition.mode).toBe("runtime-backed-browser-persisted-run-readonly");
    expect(contract.expedition.encounterCount).toBe(8);
    expect(contract.expedition.draftBeforeEncounterIndexes).toEqual([0, 2, 4, 6]);
    expect(contract.expedition.restAfterEncounterIndex).toBe(3);
  });

  it("preserves browser-local ownership and remote Admin isolation", () => {
    expect(contract.expedition.persistence.owner).toBe("browser-local-storage");
    expect(contract.expedition.persistence.storageKey).toBe("spaceTypingExpeditionRunV1");
    expect(contract.expedition.persistence.revisionedEnvelope).toBe(true);
    expect(contract.expedition.persistence.writerOwnership).toBe(true);
    expect(contract.expedition.safety.adminWriteCapability).toBe(false);
    expect(contract.expedition.safety.adminPublishCapability).toBe(false);
    expect(contract.expedition.safety.adminRunMutationCapability).toBe(false);
    expect(contract.expedition.safety.adminStorageMutationCapability).toBe(false);
  });

  it("does not invent a centralized Expedition backend", () => {
    expect(contract.expedition.challengeKinds).toEqual(["prototype", "daily", "qa"]);
    expect(contract.expedition.unsupportedAdminOperations).toContain(
      "read a player's browser-local Expedition save remotely",
    );
    expect(contract.expedition.unsupportedAdminOperations).toContain(
      "claim a centralized Expedition backend exists",
    );
  });
});
