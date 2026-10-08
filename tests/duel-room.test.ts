import { describe, expect, it } from "vitest";
import {
  DuelRoom,
  createPracticeDuelRoom,
  defaultDuelRoomSettings,
  validateDuelMapCatalog,
  validateDuelRoomSettings,
} from "../src/duel/room";

describe("Duel M-DUEL-09 room model", () => {
  it("validates the production room settings contract", () => {
    const settings = defaultDuelRoomSettings();
    const result = validateDuelRoomSettings(settings);
    expect(result.ok).toBe(true);
    expect(validateDuelMapCatalog()).toEqual([]);
  });

  it("requires a real password for private rooms", () => {
    const settings = defaultDuelRoomSettings();
    settings.password = "";
    expect(validateDuelRoomSettings(settings)).toEqual(
      expect.objectContaining({
        ok: false,
        errors: expect.arrayContaining([
          "Private room password must be 4-64 characters.",
        ]),
      }),
    );
  });

  it("never exposes the room password in public snapshot", () => {
    const room = new DuelRoom({
      roomId: "ABCD12",
      ownerParticipantId: "host",
      ownerDisplayName: "Host",
      settings: {
        ...defaultDuelRoomSettings(),
        password: "secret-room",
      },
    });

    const snapshot = room.snapshot();
    expect(snapshot.settings.passwordRequired).toBe(true);
    expect("password" in snapshot.settings).toBe(false);
    expect(JSON.stringify(snapshot)).not.toContain("secret-room");
  });

  it("does not expose fixed authoritative seed in public snapshot", () => {
    const settings = defaultDuelRoomSettings();
    settings.seedMode = "fixed";
    settings.fixedSeed = 424242;
    const room = new DuelRoom({
      roomId: "SEED01",
      ownerParticipantId: "host",
      ownerDisplayName: "Host",
      settings,
    });

    const snapshot = room.snapshot();
    expect(snapshot.settings.fixedSeedConfigured).toBe(true);
    expect("fixedSeed" in snapshot.settings).toBe(false);
    expect(JSON.stringify(snapshot)).not.toContain("424242");
  });

  it("requires both occupied slots to be ready before start", () => {
    const room = new DuelRoom({
      roomId: "ROOM01",
      ownerParticipantId: "host",
      ownerDisplayName: "Host",
      settings: defaultDuelRoomSettings(),
    });
    expect(room.canStart()).toBe(false);
    expect(
      room.join({
        participantId: "guest",
        displayName: "Guest",
        password: "space",
      }),
    ).toBe(true);
    room.setReady("host", true);
    expect(room.canStart()).toBe(false);
    room.setReady("guest", true);
    expect(room.canStart()).toBe(true);
  });

  it("rejects incorrect private-room password", () => {
    const room = new DuelRoom({
      roomId: "ROOM02",
      ownerParticipantId: "host",
      ownerDisplayName: "Host",
      settings: defaultDuelRoomSettings(),
    });
    expect(
      room.join({
        participantId: "guest",
        displayName: "Guest",
        password: "wrong",
      }),
    ).toBe(false);
  });

  it("creates a ready Human-vs-Bot practice room", () => {
    const room = createPracticeDuelRoom({
      roomId: "LOCAL01",
      participantId: "local-player",
      displayName: "Pilot",
      bot: {
        wpm: 70,
        accuracy: 0.96,
        personality: "tactician",
      },
      mapId: "tempest-prime",
    });

    const snapshot = room.snapshot();
    expect(snapshot.canStart).toBe(true);
    expect(snapshot.slots[0]).toEqual(
      expect.objectContaining({
        kind: "human",
        ready: true,
      }),
    );
    expect(snapshot.slots[1]).toEqual(
      expect.objectContaining({
        kind: "bot",
        ready: true,
        bot: expect.objectContaining({
          wpm: 70,
          accuracy: 0.96,
          personality: "tactician",
        }),
      }),
    );
    expect(room.selectedMap()).toBe("tempest-prime");
  });

  it("does not let a guest mutate room settings", () => {
    const room = new DuelRoom({
      roomId: "ROOM03",
      ownerParticipantId: "host",
      ownerDisplayName: "Host",
      settings: defaultDuelRoomSettings(),
    });
    const result = room.updateSettings(
      "guest",
      defaultDuelRoomSettings(),
    );
    expect(result).toEqual({
      ok: false,
      errors: ["Only the room owner can change settings."],
    });
  });

  it("keeps competitive room combat profile normalized", () => {
    const room = new DuelRoom({
      roomId: "ROOM04",
      ownerParticipantId: "host",
      ownerDisplayName: "Host",
      settings: defaultDuelRoomSettings(),
    });
    expect(room.snapshot().settings.combatProfile).toBe(
      "normalized",
    );
  });
});
