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

  it("returns perspective-safe room identity without trusting client display name", () => {
    const authority = new DuelAuthorityService(deps());
    const host = open(authority, "host");
    const guest = open(authority, "guest");
    const room = createRoom(authority, host.sessionId);

    expect(room.selfSlotIndex).toBe(0);
    expect(room.isOwner).toBe(true);

    const joined = authority.joinRoom(
      guest.sessionId,
      {
        roomId: room.roomId,
        password: "secret-room",
        displayName: "Spoofed Host Name",
      },
      1,
    );
    if (!joined.ok) throw new Error(joined.message);

    expect(joined.value.selfSlotIndex).toBe(1);
    expect(joined.value.isOwner).toBe(false);
    expect(joined.value.slots[1].displayName).toBe(
      "Pilot-guest",
    );
    const serialized = JSON.stringify(joined.value);
    expect(serialized).not.toContain(host.sessionId);
    expect(serialized).not.toContain(guest.sessionId);
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
    expect(
      view.value.opponent.revealedInventory,
    ).toBeNull();
    expect("cooldowns" in view.value.opponent).toBe(false);
    expect(
      view.value.self.cooldowns,
    ).toEqual({});
    expect("pity" in view.value.opponent).toBe(false);
    expect(serialized).not.toContain("matchSeed");
    expect(serialized).not.toContain("fixedSeed");
    for (const mystery of view.value.shared.mysteries) {
      expect("outcomeId" in mystery).toBe(false);
      expect("category" in mystery).toBe(false);
    }
  });

  it("authoritatively refills expired private offers for online Practice/Friend matches", () => {
    const authority = new DuelAuthorityService(deps());
    const host = open(authority, "host");
    const room = createRoom(authority, host.sessionId);
    authority.setBot(
      host.sessionId,
      room.roomId,
      {
        wpm: 10,
        accuracy: 0.5,
        reactionMs: 3000,
        personality: "balanced",
      },
      1,
    );
    authority.setReady(
      host.sessionId,
      room.roomId,
      true,
      2,
    );
    const started = authority.startMatch(
      host.sessionId,
      room.roomId,
      3,
    );
    if (!started.ok) throw new Error(started.message);

    const first = started.value.updates.find(
      (update) => update.sessionId === host.sessionId,
    )!;
    const initialIds = new Set(
      first.view.self.offers.map(
        (offer) => offer.instanceId,
      ),
    );

    let lastView = first.view;
    let sawOwnExpiration = false;
    for (let second = 0; second < 25; second += 1) {
      const tick = authority.tick(
        started.value.matchId,
        1,
        10 + second,
      );
      if (!tick.ok) throw new Error(tick.message);
      const update = tick.value.updates.find(
        (candidate) =>
          candidate.sessionId === host.sessionId,
      )!;
      lastView = update.view;
      sawOwnExpiration =
        sawOwnExpiration ||
        update.events.some(
          (event) =>
            event.type === "offer-expired" &&
            event.playerId === "player-1",
        );
    }

    expect(sawOwnExpiration).toBe(true);
    expect(lastView.self.offers).toHaveLength(5);
    expect(
      lastView.self.offers.some((offer) =>
        initialIds.has(offer.instanceId),
      ),
    ).toBe(false);
    expect(lastView.self.wrongChars).toBe(0);
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
          type: "SELECT_TARGET",
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
        now: 1100,
      }).ok,
    ).toBe(true);
    expect(
      authority.submitIntent(host.sessionId, {
        matchId: started.value.matchId,
        roundId,
        sequence: 3,
        intent: { type: "TYPE_CHAR", char: "b" },
        now: 1101,
      }).ok,
    ).toBe(true);
    expect(
      authority.submitIntent(host.sessionId, {
        matchId: started.value.matchId,
        roundId,
        sequence: 4,
        intent: { type: "TYPE_CHAR", char: "c" },
        now: 1102,
      }),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: "INPUT_RATE_IMPOSSIBLE",
      }),
    );
  });

  it("publishes the ended round before advancing to the next round", () => {
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

    const firstRoundId = started.value.updates[0]!.view.roundId;
    const ended = authority.tick(
      started.value.matchId,
      400,
      4,
    );
    if (!ended.ok) throw new Error(ended.message);

    expect(ended.value.updates[0]!.view.roundId).toBe(
      firstRoundId,
    );
    expect(
      ended.value.updates[0]!.view.round.status,
    ).toBe("draw");
    expect(
      ended.value.updates[0]!.view.series.roundsPlayed,
    ).toBe(1);

    const next = authority.tick(
      started.value.matchId,
      0,
      5,
    );
    if (!next.ok) throw new Error(next.message);
    expect(next.value.updates[0]!.view.roundId).not.toBe(
      firstRoundId,
    );
    expect(next.value.updates[0]!.view.round.status).toBe(
      "active",
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
          displayLabel: "FROZEN RELIC",
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

  it("starts Ranked directly from two eligible sessions with normalized combat", () => {
    const authority = new DuelAuthorityService(deps());
    const left = open(authority, "left");
    const right = open(authority, "right");

    const started = authority.startRankedMatch(
      left.sessionId,
      right.sessionId,
      100,
    );
    if (!started.ok) throw new Error(started.message);

    expect(started.value.updates).toHaveLength(2);
    for (const update of started.value.updates) {
      expect(update.view.mode).toBe("ranked");
      expect(update.view.combatProfile).toBe("normalized");
      expect(
        update.view.appearance.selfCharacterId,
      ).toMatch(/^(vanguard|reaper)$/);
      expect(
        update.view.appearance.opponentCharacterId,
      ).toMatch(/^(vanguard|reaper)$/);
      expect(update.view.map.id).toMatch(
        /^(frost-wastes|inferno-rift|tempest-prime|ocean-abyss|terra-core|celestial-void)$/,
      );
      expect(update.view.series.format).toBe(3);
      expect(update.view.series.winsNeeded).toBe(2);
      expect(update.view.self.offers).toHaveLength(5);
    }

    expect(
      authority.rankedParticipant(left.sessionId),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RANKED_INELIGIBLE",
      }),
    );
  });

  it("rejects Ranked for duplicate account identity or active room membership", () => {
    const authority = new DuelAuthorityService(deps());
    const first = open(authority, "same");
    const second = open(authority, "same");
    expect(
      authority.startRankedMatch(
        first.sessionId,
        second.sessionId,
        0,
      ),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RANKED_INELIGIBLE",
      }),
    );

    const host = open(authority, "host-ranked");
    const guest = open(authority, "guest-ranked");
    createRoom(authority, host.sessionId, 1);
    expect(
      authority.startRankedMatch(
        host.sessionId,
        guest.sessionId,
        2,
      ),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RANKED_INELIGIBLE",
      }),
    );
  });

  it("settles Ranked forfeit authoritatively and releases both match bindings", () => {
    const authority = new DuelAuthorityService(deps());
    const left = open(authority, "ranked-left");
    const right = open(authority, "ranked-right");

    const started = authority.startRankedMatch(
      left.sessionId,
      right.sessionId,
      0,
    );
    if (!started.ok) throw new Error(started.message);

    const settled = authority.finishRankedForfeit(
      started.value.matchId,
      "player-1",
    );
    if (!settled.ok) throw new Error(settled.message);

    expect(
      settled.value.updates.every(
        (update) =>
          update.view.series.status === "won" &&
          update.view.series.winnerId === "player-2" &&
          update.view.series.wins["player-2"] >=
            update.view.series.winsNeeded,
      ),
    ).toBe(true);

    expect(
      authority.rankedParticipant(left.sessionId).ok,
    ).toBe(false);

    expect(
      authority.releaseFinishedRankedMatch(
        started.value.matchId,
      ),
    ).toEqual({ ok: true, value: true });

    expect(
      authority.rankedParticipant(left.sessionId).ok,
    ).toBe(true);
    expect(
      authority.rankedParticipant(right.sessionId).ok,
    ).toBe(true);
    expect(
      authority.clientMatchView(
        left.sessionId,
        started.value.matchId,
      ),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: "MATCH_NOT_FOUND",
      }),
    );
  });

  it("settles double Ranked disconnect as a draw rather than slot-order win", () => {
    const authority = new DuelAuthorityService(deps());
    const left = open(authority, "draw-left");
    const right = open(authority, "draw-right");
    const started = authority.startRankedMatch(
      left.sessionId,
      right.sessionId,
      0,
    );
    if (!started.ok) throw new Error(started.message);

    const settled = authority.finishRankedForfeit(
      started.value.matchId,
      null,
    );
    if (!settled.ok) throw new Error(settled.message);

    expect(
      settled.value.updates.every(
        (update) =>
          update.view.series.status === "draw" &&
          update.view.series.winnerId === null,
      ),
    ).toBe(true);
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
