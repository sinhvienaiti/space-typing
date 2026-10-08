import { describe, expect, it } from "vitest";
import duelContract from "../contracts/space-typing-admin-duel.v1.json";
import { defaultDuelRoomSettings, validateDuelRoomSettings } from "../src/duel/room";
import {
  DUEL_CONTENT_VERSION,
  DUEL_DEFAULT_REGULATION_SECONDS,
  DUEL_HARD_OVERTIME_SECONDS,
} from "../src/duel/model";
import {
  DUEL_CANNON_TRAVEL_MS,
  DUEL_PROJECTILE_BASE_TRAVEL_MS,
  DUEL_ROUND_BREAK_SECONDS,
} from "../src/duel/presentation-timing";

describe("Space Typing Admin Duel contract", () => {
  it("exposes Duel as runtime-backed and Admin read-only", () => {
    expect(duelContract.capability).toBe("duel.read");
    expect(duelContract.route).toEqual({
      id: "duel",
      path: "/admin/space-typing/duel",
      label: "Duel Settings",
    });
    expect(duelContract.duel).toMatchObject({
      mode: "runtime-derived-readonly",
      authorableFields: [],
      persistenceOwner: "duel-room-session-runtime",
      roomOwnerWriteCapability: true,
      writeCapability: false,
      previewCapability: false,
    });
  });

  it("matches the canonical room defaults and validators", () => {
    const defaults = defaultDuelRoomSettings();
    expect(duelContract.duel.safeDefaults).toEqual({
      visibility: defaults.visibility,
      matchLengthSeconds: defaults.matchLengthSeconds,
      roundFormat: defaults.roundFormat,
      mapSelection: defaults.mapSelection,
      hazardLevel: defaults.hazardLevel,
      mysteryFrequency: defaults.mysteryFrequency,
      fateFrequency: defaults.fateFrequency,
      botAllowed: defaults.botAllowed,
      seedMode: defaults.seedMode,
      modifier: defaults.modifier,
    });
    for (const seconds of duelContract.duel.roomSettings.matchLengthSeconds) {
      expect(validateDuelRoomSettings({ ...defaults, matchLengthSeconds: seconds as 180 | 240 | 300 }).ok).toBe(true);
    }
    for (const roundFormat of duelContract.duel.roomSettings.roundFormats) {
      expect(validateDuelRoomSettings({ ...defaults, roundFormat: roundFormat as 1 | 3 | 5 }).ok).toBe(true);
    }
  });

  it("pins combat timing to the authority-owned runtime constants", () => {
    expect(duelContract.duel.combat).toMatchObject({
      contentVersion: DUEL_CONTENT_VERSION,
      defaultRegulationSeconds: DUEL_DEFAULT_REGULATION_SECONDS,
      hardOvertimeSeconds: DUEL_HARD_OVERTIME_SECONDS,
      projectileBaseTravelMs: DUEL_PROJECTILE_BASE_TRAVEL_MS,
      typingCannonTravelMs: DUEL_CANNON_TRAVEL_MS,
      roundBreakSeconds: DUEL_ROUND_BREAK_SECONDS,
      damageResolvesOnAuthorityClock: true,
    });
  });

  it("does not expose synthetic Admin controls from the old mock screen", () => {
    expect(duelContract.duel.unsupportedAdminMockFields).toEqual(
      expect.arrayContaining([
        "lives",
        "globalMatchTimeMinutes",
        "roundWindowSeconds",
        "manualProjectileImpactDelayMs",
        "burnFxToggle",
        "largeKoExplosionToggle",
        "announcerMilestonesToggle",
      ]),
    );
  });
});
