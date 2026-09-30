import { describe, expect, it } from "vitest";
import {
  DuelAuthorityService,
  parseDuelRoomSettingsPayload,
  projectDuelEventsForPlayer,
  type DuelAuthorityDependencies,
} from "../src/duel/authority";
import { defaultDuelRoomSettings } from "../src/duel/room";
import type { DuelEngineEvent } from "../src/duel/engine";
import { DUEL_PROTOCOL_VERSION } from "../src/duel/protocol";

function deps(): DuelAuthorityDependencies {
  let token = 0;
  let room = 0;
  let match = 0;
  let seed = 1000;
  return {
    authenticate(sessionToken) {
      if (!sessionToken.startsWith("auth:")) return null;
      const accountId = sessionToken.slice(5);
      return {
        accountId,
        displayName: "Pilot-" + accountId,
      };
    },
    token() {
      token += 1;
      return "token-" + String(token);
    },
    roomId() {
      room += 1;
      return "ROOM-" + String(room);
    },
    matchId() {
      match += 1;
      return "MATCH-" + String(match);
    },
    seed() {
      seed += 1;
      return seed;
    },
  };
}

function open(
  authority: DuelAuthorityService,
  accountId: string,
  now = 0,
) {
  const result = authority.openSession({
    protocolVersion: DUEL_PROTOCOL_VERSION,
    sessionToken: "auth:" + accountId,
    now,
  });
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

function createRoom(
  authority: DuelAuthorityService,
  sessionId: string,
  now = 0,
) {
  const settings = defaultDuelRoomSettings();
  settings.seedMode = "fixed";
  settings.fixedSeed = 424242;
  settings.password = "secret-room";
  const result = authority.createRoom(
    sessionId,
    settings,
    now,
  );
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

describe("Duel M-DUEL-11 authority core", () => {
  it("requires authenticated protocol-compatible sessions", () => {
    const authority = new DuelAuthorityService(deps());

    expect(
      authority.openSession({
        protocolVersion: DUEL_PROTOCOL_VERSION + 1,
        sessionToken: "auth:a",
        now: 0,
      }),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: "PROTOCOL_MISMATCH",
      }),
    );

    expect(
      authority.openSession({
        protocolVersion: DUEL_PROTOCOL_VERSION,
        sessionToken: "bad-token",
        now: 0,
      }),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: "AUTH_FAILED",
      }),
    );
  });

  it("reconnects only the same authenticated identity inside grace", () => {
    const authority = new DuelAuthorityService(deps(), {
      reconnectGraceMs: 5000,
    });
    const welcome = open(authority, "alpha");
    authority.disconnect(welcome.sessionId, 1000);

    const reconnected = authority.openSession({
      protocolVersion: DUEL_PROTOCOL_VERSION,
      sessionToken: "auth:alpha",
      reconnectToken: welcome.reconnectToken,
      now: 4000,
    });
    expect(reconnected).toEqual({
      ok: true,
      value: expect.objectContaining({
        sessionId: welcome.sessionId,
        reconnectToken: welcome.reconnectToken,
        reconnected: true,
      }),
    });

    authority.disconnect(welcome.sessionId, 5000);
    expect(
      authority.openSession({
        protocolVersion: DUEL_PROTOCOL_VERSION,
        sessionToken: "auth:other",
        reconnectToken: welcome.reconnectToken,
        now: 6000,
      }),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RECONNECT_EXPIRED",
      }),
    );
  });

  it("strictly rejects unknown room settings fields", () => {
    const settings = {
      ...defaultDuelRoomSettings(),
      authoritativeSeedLeak: 999,
    };
    expect(parseDuelRoomSettingsPayload(settings)).toEqual(
      expect.objectContaining({
        ok: false,
        code: "ROOM_INVALID",
      }),
    );
  });

  it("never exposes password, fixed seed or participant ids in client room snapshot", () => {
    const authority = new DuelAuthorityService(deps());
    const host = open(authority, "host");
    const room = createRoom(authority, host.sessionId);

    const serialized = JSON.stringify(room);
    expect(serialized).not.toContain("secret-room");
    expect(serialized).not.toContain("424242");
    expect(serialized).not.toContain(host.sessionId);
    expect(room.settings.passwordRequired).toBe(true);
    expect(room.settings.fixedSeedConfigured).toBe(true);
  });

  it("supports authoritative bot, ready and match-start flow", () => {
    const authority = new DuelAuthorityService(deps());
    const host = open(authority, "host");
    const room = createRoom(authority, host.sessionId);

    expect(
      authority.setBot(
        host.sessionId,
        room.roomId,
        {
          wpm: 70,
          accuracy: 0.96,
          reactionMs: 240,
          personality: "tactician",
        },
        1,
      ),
    ).toEqual(
      expect.objectContaining({ ok: true }),
    );
    expect(
      authority.setReady(
        host.sessionId,
        room.roomId,
        true,
        2,
      ),
    ).toEqual(
      expect.objectContaining({ ok: true }),
    );

    const started = authority.startMatch(
      host.sessionId,
      room.roomId,
      3,
    );
    expect(started).toEqual(
      expect.objectContaining({
        ok: true,
        value: expect.objectContaining({
          matchId: "MATCH-1",
          updates: expect.arrayContaining([
            expect.objectContaining({
              playerId: "player-1",
            }),
          ]),
        }),
      }),
    );
  });

  it("filters hidden opponent match state from the client view", () => {
    const authority = new DuelAuthorityService(deps());
    const host = open(authority, "host");
    const room = createRoom(authority, host.sessionId);
    authority.setBot(
      host.sessionId,
      room.roomId,
      {
        wpm: 55,
        accuracy: 0.94,
        reactionMs: 320,
        personality: "balanced",
      },
      1,
    );
    authority.setReady(host.sessionId, room.roomId, true, 2);
    const started = authority.startMatch(
      host.sessionId,
      room.roomId,
      3,
    );
    if (!started.ok) throw new Error(started.message);

    const view = authority.clientMatchView(
      host.sessionId,
      started.value.matchId,
    );
    if (!view.ok) throw new Error(view.message);

    const serialized = JSON.stringify(view.value);
    expect("offers" in view.value.opponent).toBe(false);
    expect("inventory" in view.value.opponent).toBe(false);
    expect("pity" in view.value.opponent).toBe(false);
    expect(serialized).not.toContain("matchSeed");
    expect(serialized).not.toContain("fixedSeed");
    for (const mystery of view.value.shared.mysteries) {
      expect("outcomeId" in mystery).toBe(false);
      expect("category" in mystery).toBe(false);
    }
  });

  it("rejects stale sequence and impossible input-rate bursts", () => {
    const authority = new DuelAuthorityService(deps(), {
      maxTypeCharsPerSecond: 2,
    });
    const host = open(authority, "host");
    const room = createRoom(authority, host.sessionId);
    authority.setBot(
      host.sessionId,
      room.roomId,
      {
        wpm: 55,
        accuracy: 0.94,
        reactionMs: 320,
        personality: "balanced",
      },
      1,
    );
    authority.setReady(host.sessionId, room.roomId, true, 2);
    const started = authority.startMatch(
      host.sessionId,
      room.roomId,
      3,
    );
    if (!started.ok) throw new Error(started.message);
    const first = started.value.updates[0]!;
    const target = first.view.self.offers[0]!;
    const roundId = first.view.roundId;

    const select = authority.submitIntent(host.sessionId, {
      matchId: started.value.matchId,
      roundId,
      sequence: 1,
      intent: {
        type: "SELECT_TARGET",
        targetInstanceId: target.instanceId,
      },
      now: 10,
    });
    expect(select.ok).toBe(true);
    authority.tick(started.value.matchId, 0, 11);

    expect(
      authority.submitIntent(host.sessionId, {
        matchId: started.value.matchId,
        roundId,
        sequence: 1,
        intent: {
          type: "TYPE_CHAR",
          char: "a",
          targetInstanceId: target.instanceId,
        },
        now: 12,
      }),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: "STALE_SEQUENCE",
      }),
    );

    expect(
      authority.submitIntent(host.sessionId, {
        matchId: started.value.matchId,
        roundId,
        sequence: 2,
        intent: { type: "TYPE_CHAR", char: "a" },
        now: 20,
      }).ok,
    ).toBe(true);
    expect(
      authority.submitIntent(host.sessionId, {
        matchId: started.value.matchId,
        roundId,
        sequence: 3,
        intent: { type: "TYPE_CHAR", char: "b" },
        now: 21,
      }).ok,
    ).toBe(true);
    expect(
      authority.submitIntent(host.sessionId, {
        matchId: started.value.matchId,
        roundId,
        sequence: 4,
        intent: { type: "TYPE_CHAR", char: "c" },
        now: 22,
      }),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: "INPUT_RATE_IMPOSSIBLE",
      }),
    );
  });

  it("projects banked, combo and reveal information only to its owner", () => {
    const events: DuelEngineEvent[] = [
      {
        type: "action-banked",
        playerId: "player-1",
        actionId: "missile",
        storedInstanceId: "stored:1",
        bucket: "attack",
      },
      {
        type: "combo-ready",
        playerId: "player-1",
        comboId: "homing-barrage",
      },
      {
        type: "mystery-revealed",
        playerId: "player-1",
        reveal: {
          id: "mystery:1",
          rarity: "minor",
          riskTag: "support",
          category: "beneficial",
          outcomeId: "energy-cache",
        },
      },
      {
        type: "trap-armed",
        playerId: "player-1",
        trapId: "minefield",
        publicHint: "TRAP ARMED",
      },
    ];

    const owner = JSON.stringify(
      projectDuelEventsForPlayer(events, "player-1"),
    );
    const opponent = JSON.stringify(
      projectDuelEventsForPlayer(events, "player-2"),
    );

    expect(owner).toContain("missile");
    expect(owner).toContain("homing-barrage");
    expect(owner).toContain("energy-cache");
    expect(owner).toContain("minefield");

    expect(opponent).not.toContain("missile");
    expect(opponent).not.toContain("homing-barrage");
    expect(opponent).not.toContain("energy-cache");
    expect(opponent).not.toContain("minefield");
    expect(opponent).toContain("TRAP ARMED");
  });

  it("cleans ghost session membership after reconnect grace", () => {
    const authority = new DuelAuthorityService(deps(), {
      reconnectGraceMs: 1000,
      heartbeatTimeoutMs: 100_000,
    });
    const host = open(authority, "host");
    const room = createRoom(authority, host.sessionId);
    authority.disconnect(host.sessionId, 100);

    const cleaned = authority.cleanup(1200);
    expect(cleaned.expiredSessions).toContain(host.sessionId);
    expect(
      authority.roomSnapshot(host.sessionId, room.roomId),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: "ROOM_NOT_FOUND",
      }),
    );
  });
});
