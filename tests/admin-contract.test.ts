import { describe, expect, it } from "vitest";
import {
  SPACE_TYPING_ADMIN_CONTRACT,
  SPACE_TYPING_ADMIN_CONTRACT_REVISION,
} from "../src/admin/contract";

describe("Space Typing Admin contract V1", () => {
  it("exports a stable versioned contract for parent Admin consumers", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT_REVISION).toBe("space-typing-admin-v1");
    expect(SPACE_TYPING_ADMIN_CONTRACT.schemaVersion).toBe(1);
    expect(SPACE_TYPING_ADMIN_CONTRACT.gameId).toBe("space-typing");
    expect(SPACE_TYPING_ADMIN_CONTRACT.configSchemaVersion).toBe(1);
    expect(SPACE_TYPING_ADMIN_CONTRACT.worldMusicCatalogSchemaVersion).toBe(1);
  });

  it("exposes only the four B3 Admin MVP routes", () => {
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
    ]);
  });

  it("locks the 10-Galaxy / 50-World topology and canonical validation badges", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT.worldMusic).toMatchObject({
      galaxyCount: 10,
      worldsPerGalaxy: 5,
      worldCount: 50,
      assignmentModes: ["inherit", "replace"],
    });
    expect(SPACE_TYPING_ADMIN_CONTRACT.worldMusic.validationBadges).toContain(
      "BOSS FALLBACK TO WORLD",
    );
    expect(SPACE_TYPING_ADMIN_CONTRACT.worldMusic.validationBadges).toContain(
      "LEGACY FALLBACK",
    );
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
