import { describe, expect, it } from "vitest";
import type { DuelClientRoomSnapshot } from "../src/duel/authority";
import type { AlternativeMatchView } from "../src/duel/alternative-presentation";
import {
  alternativeMatchUiState,
  alternativeRoomStartState,
} from "../src/duel/alternative-room-ui";

function room(input: {
  isOwner?: boolean;
  canStart?: boolean;
  secondKind?: "human" | "empty";
} = {}): DuelClientRoomSnapshot {
  return {
    roomId: "ROOM-ALT",
    ownerSlotIndex: 0,
    selfSlotIndex: 0,
    isOwner: input.isOwner ?? true,
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
      input.secondKind === "empty"
        ? {
            slotIndex: 1,
            kind: "empty",
            displayName: "",
            ready: false,
            shipId: null,
            characterId: null,
            bot: null,
          }
        : {
            slotIndex: 1,
            kind: "human",
            displayName: "Right",
            ready: true,
            shipId: null,
            characterId: null,
            bot: null,
          },
    ],
    canStart: input.canStart ?? true,
  };
}

function reflexView(): AlternativeMatchView {
  return {
    matchId: "alt-reflex",
    mode: "reflex",
    matchType: "friend",
    status: "active",
    winner: null,
    self: {
      playerId: "player-1",
      hull: 80,
      score: 2,
      lastAcceptedSequence: 2,
    },
    opponent: { hull: 60, score: 1 },
    challenge: {
      kind: "reflex",
      prompt: "nova",
      round: 4,
      deadlineAtMs: 2500,
      claimedBy: null,
    },
    projectiles: [
      {
        id: "impact-1",
        direction: "outgoing",
        damage: 20,
        impactAtMs: 1200,
        remainingMs: 75,
      },
    ],
  };
}

describe("R03 alternative lobby presentation", () => {
  it("starts only from an owner-ready room with two human pilots", () => {
    expect(alternativeRoomStartState(room())).toEqual({
      canStart: true,
      reason: "Authoritative Friend runtime ready.",
    });
    expect(alternativeRoomStartState(room({ isOwner: false })).canStart).toBe(false);
    expect(alternativeRoomStartState(room({ canStart: false })).canStart).toBe(false);
    expect(alternativeRoomStartState(room({ secondKind: "empty" })).canStart).toBe(false);
  });

  it("renders only authoritative Reflex state including impact-clock data", () => {
    expect(alternativeMatchUiState(reflexView())).toEqual({
      title: "Reflex · FRIEND",
      score: "Score 2 — 1",
      hull: "Hull 80 — 60",
      challenge: "Round 4 · TYPE NOVA",
      projectiles: "OUT 20 · 75ms",
      terminal: false,
      inputEnabled: true,
      inputPlaceholder: "Type the reflex prompt",
    });
  });

  it("blocks Word Chain input while authority says it is the opponent turn", () => {
    const state = alternativeMatchUiState({
      ...reflexView(),
      matchId: "alt-chain",
      mode: "word-chain",
      challenge: {
        kind: "word-chain",
        chain: ["nova", "aster"],
        nextTurn: "opponent",
      },
      projectiles: [],
    });
    expect(state.challenge).toBe("Chain nova → aster · Opponent turn");
    expect(state.inputEnabled).toBe(false);
    expect(state.inputPlaceholder).toBe("Enter next chain word");
  });
});
