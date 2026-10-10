import { describe, expect, it } from "vitest";
import {
  SPACE_TYPING_ADMIN_CONTRACT,
  SPACE_TYPING_ADMIN_CONTRACT_REVISION,
} from "../src/admin/contract";

describe("Space Typing Admin contract", () => {
  it("exports a stable versioned contract for parent Admin consumers", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT_REVISION).toBe("space-typing-admin-v2");
    expect(SPACE_TYPING_ADMIN_CONTRACT.schemaVersion).toBe(1);
    expect(SPACE_TYPING_ADMIN_CONTRACT.gameId).toBe("space-typing");
    expect(SPACE_TYPING_ADMIN_CONTRACT.configSchemaVersion).toBe(1);
    expect(SPACE_TYPING_ADMIN_CONTRACT.worldMusicCatalogSchemaVersion).toBe(1);
  });

  it("exposes the B3 routes plus the B4 QA session route", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT.routes).toEqual([
      { id: "overview", path: "/admin/space-typing", label: "Overview" },
      { id: "audio-mix", path: "/admin/space-typing/audio", label: "Audio & Mix" },
      {
        id: "world-music",
        path: "/admin/space-typing/world-music",
        label: "World Music",
      },
      {
        id: "history-publish",
        path: "/admin/space-typing/history",
        label: "History / Publish",
      },
      {
        id: "qa-session",
        path: "/admin/space-typing/qa",
        label: "QA Session",
      },
    ]);
  });

  it("locks the 10-Galaxy / 50-World topology and canonical validation badges", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT.worldMusic).toMatchObject({
      galaxyCount: 10,
      worldsPerGalaxy: 5,
      worldCount: 50,
      assignmentModes: ["inherit", "replace"],
      previewProtocol: {
        version: 1,
        command: "pnpm music:admin-preview",
      },
    });
    expect(SPACE_TYPING_ADMIN_CONTRACT.worldMusic.validationBadges).toContain(
      "BOSS FALLBACK TO WORLD",
    );
    expect(SPACE_TYPING_ADMIN_CONTRACT.worldMusic.validationBadges).toContain(
      "LEGACY FALLBACK",
    );
  });

  it("keeps QA scoped to non-production runtime sessions and disposable persistence", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT.capabilities).toEqual(
      expect.arrayContaining([
        "qa.session.read",
        "qa.session.issue",
        "qa.session.revoke",
      ]),
    );
    expect(SPACE_TYPING_ADMIN_CONTRACT.qa).toEqual({
      protocolVersion: 1,
      target: "runtime-session",
      environments: ["local", "development", "preview", "test"],
      productionAllowed: false,
      persistenceTarget: "qa-sandbox",
      rewardEligibility: "none",
      applyBoundary: "new-qa-run",
    });
  });

  it("keeps competitive and QA changes outside immediate client-side apply", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT.applyBoundaries).toMatchObject({
      playerVolume: "immediate",
      mixPolicy: "safe-boundary",
      playlistAssignment: "next-track-or-state",
      competitiveFeature: "new-session",
      qaCapability: "new-qa-run",
    });
  });
});
