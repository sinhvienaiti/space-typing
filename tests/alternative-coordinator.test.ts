import { describe, expect, it } from "vitest";
import type {
  DuelAuthorityResult,
  DuelClientRoomSnapshot,
} from "../src/duel/authority";
import {
  AlternativeDuelCoordinator,
  type AlternativeRoomAuthority,
} from "../server/duel/alternative-coordinator";
import { parseAlternativeTransportClientMessage } from "../src/duel/alternative-wire";
import type { AlternativeTransportDelivery } from "../server/duel/alternative-coordinator";

function roomSnapshot(input: {
  roomId: string;
  selfSlotIndex: 0 | 1;
  isOwner: boolean;
  canStart: boolean;
}): DuelClientRoomSnapshot {
  return {
    roomId: input.roomId,
    ownerSlotIndex: 0,
    selfSlotIndex: input.selfSlotIndex,
    isOwner: input.isOwner,
    settings: {
      roomName: "Alternative QA",
      visibility: "public",
      passwordRequired: false,
      fixedSeedConfigured: true,
      combatProfile: "normalized",
      matchLengthSeconds: 180,
      roundFormat: 1,
      mapSelection: { mode: "fixed", mapId: "frost-wastes" },
      hazardLevel: "standard",
      mysteryFrequency: "standard",
      fateFrequency: "standard",
      botAllowed: false,
      seedMode: "fixed",
      modifier: "standard",
    },
    slots: [
      {
        slotIndex: 0,
        kind: "human",
        displayName: "Left",
        ready: true,
        shipId: null,
        characterId: null,
        bot: null,
      },
      {
        slotIndex: 1,
        kind: "human",
        displayName: "Right",
        ready: true,
        shipId: null,
        characterId: null,
        bot: null,
      },
    ],
    canStart: input.canStart,
  };
}

function authority(): AlternativeRoomAuthority {
  return {
    roomSnapshot(sessionId, roomId): DuelAuthorityResult<DuelClientRoomSnapshot> {
      if (roomId !== "ROOM-1") {
        return {
          ok: false,
          code: "ROOM_NOT_FOUND",
          message: "missing",
        };
      }
      if (sessionId !== "left" && sessionId !== "right") {
        return {
          ok: false,
          code: "ROOM_FORBIDDEN",
          message: "forbidden",
        };
      }
      return {
        ok: true,
        value: roomSnapshot({
          roomId,
          selfSlotIndex: sessionId === "left" ? 0 : 1,
          isOwner: sessionId === "left",
          canStart: true,
        }),
      };
    },
    roomSessionIds(roomId) {
      return roomId === "ROOM-1" ? ["left", "right"] : [];
    },
  };
}

function leftReflexPrompt(deliveries: readonly AlternativeTransportDelivery[]): string {
  const message = deliveries.find((entry) =>
    entry.sessionId === "left" && entry.message.type === "ALTERNATIVE_MATCH_UPDATE"
  )?.message;
  if (message?.type !== "ALTERNATIVE_MATCH_UPDATE" || message.view.challenge.kind !== "reflex") {
    throw new Error("Expected left Reflex update");
  }
  return message.view.challenge.prompt;
}

describe("R03 alternative transport coordinator", () => {
  it("starts friend Reflex only from the room owner and returns personalized views", () => {
    const coordinator = new AlternativeDuelCoordinator(authority(), () => "alt-1", () => 7);
    expect(coordinator.handle("right", {
      type: "START_ALTERNATIVE_MATCH",
      requestId: "r0",
      roomId: "ROOM-1",
      mode: "reflex",
    }, 100)).toMatchObject({ ok: false, code: "ROOM_FORBIDDEN" });

    const started = coordinator.handle("left", {
      type: "START_ALTERNATIVE_MATCH",
      requestId: "r1",
      roomId: "ROOM-1",
      mode: "reflex",
    }, 100);
    expect(started).not.toBeNull();
    if (started === null || !started.ok) throw new Error("Expected match start");
    expect(started.deliveries).toHaveLength(2);
    expect(started.deliveries.map((entry) => entry.sessionId)).toEqual(["left", "right"]);
    expect(started.deliveries[0]?.message).toMatchObject({
      type: "ALTERNATIVE_MATCH_UPDATE",
      matchId: "alt-1",
      serverSequence: 0,
      view: { mode: "reflex", matchType: "friend" },
    });
  });

  it("uses canonical Word Chain lexicon and rejects non-canonical words", () => {
    const coordinator = new AlternativeDuelCoordinator(authority(), () => "chain-1", () => 11);
    const started = coordinator.handle("left", {
      type: "START_ALTERNATIVE_MATCH",
      requestId: "start",
      roomId: "ROOM-1",
      mode: "word-chain",
    }, 0);
    if (started === null || !started.ok) throw new Error("Expected match start");

    const invalid = coordinator.handle("left", {
      type: "MODE_INPUT",
      matchId: "chain-1",
      sequence: 1,
      mode: "word-chain",
      input: { word: "zzzz" },
    }, 10);
    if (invalid === null || !invalid.ok) throw new Error("Expected input result");
    expect(invalid.deliveries).toEqual([
      {
        sessionId: "left",
        message: {
          type: "ALTERNATIVE_INPUT_RESULT",
          matchId: "chain-1",
          sequence: 1,
          accepted: false,
          reason: "invalid-input",
        },
      },
    ]);

    const accepted = coordinator.handle("left", {
      type: "MODE_INPUT",
      matchId: "chain-1",
      sequence: 2,
      mode: "word-chain",
      input: { word: "good" },
    }, 20);
    if (accepted === null || !accepted.ok) throw new Error("Expected accepted input");
    expect(accepted.deliveries[0]?.message).toMatchObject({
      type: "ALTERNATIVE_INPUT_RESULT",
      accepted: true,
      reason: "accepted",
    });
    expect(accepted.deliveries.filter((entry) => entry.message.type === "ALTERNATIVE_MATCH_UPDATE")).toHaveLength(2);
  });

  it("applies impact-clock changes on advance and resends reconnect view", () => {
    const coordinator = new AlternativeDuelCoordinator(authority(), () => "alt-clock", () => 1);
    const started = coordinator.handle("left", {
      type: "START_ALTERNATIVE_MATCH",
      requestId: "start",
      roomId: "ROOM-1",
      mode: "reflex",
    }, 0);
    if (started === null || !started.ok) throw new Error("Expected match start");
    const update = started.deliveries[0]?.message;
    if (update?.type !== "ALTERNATIVE_MATCH_UPDATE" || update.view.challenge.kind !== "reflex") {
      throw new Error("Expected Reflex view");
    }

    const fired = coordinator.handle("left", {
      type: "MODE_INPUT",
      matchId: "alt-clock",
      sequence: 1,
      mode: "reflex",
      input: { text: update.view.challenge.prompt },
    }, 10);
    if (fired === null || !fired.ok) throw new Error("Expected Reflex input");
    expect(coordinator.advance(189)).toEqual([]);
    const impact = coordinator.advance(190);
    expect(impact).toHaveLength(2);
    const left = impact.find((entry) => entry.sessionId === "left")?.message;
    expect(left).toMatchObject({
      type: "ALTERNATIVE_MATCH_UPDATE",
      view: { opponent: { hull: 80 } },
    });

    const reconnect = coordinator.reconnect("right");
    expect(reconnect).toHaveLength(1);
    expect(reconnect[0]?.message).toMatchObject({
      type: "ALTERNATIVE_MATCH_UPDATE",
      matchId: "alt-clock",
    });
  });

  it("retains terminal state for reconnect, then releases it when the room starts again", () => {
    let matchCounter = 0;
    const coordinator = new AlternativeDuelCoordinator(
      authority(),
      () => `restart-${++matchCounter}`,
      () => 17,
    );
    const started = coordinator.handle("left", {
      type: "START_ALTERNATIVE_MATCH",
      requestId: "start-1",
      roomId: "ROOM-1",
      mode: "reflex",
    }, 0);
    if (started === null || !started.ok) throw new Error("Expected first match");
    let prompt = leftReflexPrompt(started.deliveries);

    for (let hit = 1; hit <= 5; hit += 1) {
      const at = 10 + (hit - 1) * 190;
      const result = coordinator.handle("left", {
        type: "MODE_INPUT",
        matchId: "restart-1",
        sequence: hit,
        mode: "reflex",
        input: { text: prompt },
      }, at);
      if (result === null || !result.ok) throw new Error("Expected accepted Reflex hit");
      prompt = leftReflexPrompt(result.deliveries);
      coordinator.advance(at + 180);
    }

    const terminal = coordinator.reconnect("left");
    expect(terminal).toHaveLength(1);
    expect(terminal[0]?.message).toMatchObject({
      type: "ALTERNATIVE_MATCH_UPDATE",
      matchId: "restart-1",
      view: { status: "won", opponent: { hull: 0 } },
    });

    const restarted = coordinator.handle("left", {
      type: "START_ALTERNATIVE_MATCH",
      requestId: "start-2",
      roomId: "ROOM-1",
      mode: "word-chain",
    }, 1000);
    expect(restarted).not.toBeNull();
    if (restarted === null || !restarted.ok) throw new Error("Expected restart");
    expect(restarted.deliveries[0]?.message).toMatchObject({
      type: "ALTERNATIVE_MATCH_UPDATE",
      matchId: "restart-2",
      view: { mode: "word-chain", status: "active" },
    });
    expect(coordinator.matchIdForSession("left")).toBe("restart-2");
  });

  it("keeps alternative Ranked fail-closed at the wire boundary", () => {
    expect(parseAlternativeTransportClientMessage({
      type: "START_ALTERNATIVE_MATCH",
      requestId: "ranked-attempt",
      roomId: "ROOM-1",
      mode: "reflex",
      matchType: "ranked",
    })).toBeNull();
  });

  it("does not claim unrelated Duel protocol messages", () => {
    const coordinator = new AlternativeDuelCoordinator(authority(), () => "unused", () => 1);
    expect(coordinator.handle("left", {
      type: "SET_READY",
      requestId: "x",
      roomId: "ROOM-1",
      ready: true,
    }, 0)).toBeNull();
  });
});
