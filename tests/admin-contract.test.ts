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

  it("exposes the B06 Admin routes including canonical Ships and Equipment editors", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT.routes).toEqual([
      { id: "overview", path: "/admin/space-typing", label: "Overview" },
      { id: "audio-mix", path: "/admin/space-typing/audio", label: "Audio & Mix" },
      {
        id: "world-music",
        path: "/admin/space-typing/world-music",
        label: "World Music",
      },
      { id: "ships", path: "/admin/space-typing/ships", label: "Ships" },
      { id: "equipment", path: "/admin/space-typing/equipment", label: "Equipment" },
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

  it("publishes the runtime-backed B06.1 Ships contract without player-state fields", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT.capabilities).toEqual(
      expect.arrayContaining(["ships.read", "ships.write", "ships.preview"]),
    );
    expect(SPACE_TYPING_ADMIN_CONTRACT.ships).toMatchObject({
      ids: [
        "vanguard",
        "aegis",
        "volt",
        "wraith",
        "fortune",
        "arsenal",
        "oracle",
        "bastion",
        "reaper",
        "celestial",
        "zenith",
      ],
      authorableFields: [
        "name",
        "unlockStage",
        "role",
        "summary",
        "passiveName",
        "activeName",
        "ultimateName",
        "statBonus",
        "visual",
      ],
      coreStatKeys: [
        "hull",
        "shield",
        "firepower",
        "armor",
        "energy",
        "reactor",
        "focus",
        "ward",
        "luck",
        "salvage",
      ],
      constraints: {
        unlockStage: { min: 1, max: 1000, integer: true },
        statBonus: { min: -100, max: 100 },
        visual: {
          silhouettes: ["spear", "fortress", "arc", "phantom", "crown", "blade"],
          wingSpan: { min: 0.5, max: 2 },
          bodyLength: { min: 0.5, max: 2 },
          engineCounts: [1, 2, 3],
        },
      },
      previewProtocol: { version: 1, command: "pnpm ships:admin-preview" },
    });
    expect(SPACE_TYPING_ADMIN_CONTRACT.ships.authorableFields).not.toContain("selected");
    expect(SPACE_TYPING_ADMIN_CONTRACT.ships.authorableFields).not.toContain("progress");
  });

  it("publishes the runtime-backed B06.2 Equipment contract with immutable identity fields", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT.capabilities).toEqual(
      expect.arrayContaining(["equipment.read", "equipment.write", "equipment.preview"]),
    );
    expect(SPACE_TYPING_ADMIN_CONTRACT.equipment).toMatchObject({
      authorableFields: ["name", "description", "stats", "perk"],
      coreStatKeys: [
        "hull",
        "shield",
        "firepower",
        "armor",
        "energy",
        "reactor",
        "focus",
        "ward",
        "luck",
        "salvage",
      ],
      constraints: {
        nameMax: 100,
        descriptionMax: 320,
        statBonus: { min: -100, max: 100 },
      },
      previewProtocol: { version: 1, command: "pnpm equipment:admin-preview" },
    });
    expect(SPACE_TYPING_ADMIN_CONTRACT.equipment.ids.length).toBeGreaterThan(40);
    expect(SPACE_TYPING_ADMIN_CONTRACT.equipment.authorableFields).not.toContain("id");
    expect(SPACE_TYPING_ADMIN_CONTRACT.equipment.authorableFields).not.toContain("slot");
    expect(SPACE_TYPING_ADMIN_CONTRACT.equipment.authorableFields).not.toContain("tier");
    expect(SPACE_TYPING_ADMIN_CONTRACT.equipment.authorableFields).not.toContain("icon");
  });

  it("keeps ship, equipment, competitive and QA changes outside immediate client-side apply", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT.applyBoundaries).toMatchObject({
      playerVolume: "immediate",
      mixPolicy: "safe-boundary",
      playlistAssignment: "next-track-or-state",
      shipPolicy: "new-session",
      equipmentPolicy: "new-session",
      competitiveFeature: "new-session",
      qaCapability: "new-qa-run",
    });
  });
});
