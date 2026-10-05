import { describe, expect, it } from "vitest";
import type { DuelClientMatchView } from "../src/duel/authority";
import {
  DuelNetworkClient,
  type DuelSocketLike,
} from "../src/duel/network-client";

class FakeSocket implements DuelSocketLike {
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readonly sent: string[] = [];

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.({} as Event);
  }

  message(value: unknown): void {
    this.onmessage?.({ data: JSON.stringify(value) } as MessageEvent<string>);
  }
}

function connect(socket: FakeSocket, client: DuelNetworkClient): void {
  client.connect("signed-token");
  socket.open();
  socket.message({
    type: "WELCOME",
    protocolVersion: 8,
    sessionId: "session-1",
    reconnectToken: "reconnect-1",
  });
}

function matchView(
  gameMode: "standard" | "reflex" | "word-chain",
  roundId = "round-1",
): DuelClientMatchView {
  return {
    matchId: "match-1",
    roundId,
    mode: "friend",
    gameMode,
    combatProfile: "normalized",
    appearance: {
      selfCharacterId: "vanguard",
      opponentCharacterId: "reaper",
      selfShipId: null,
      opponentShipId: null,
    },
    serverSequence: 1,
    elapsedSeconds: 0,
    phase: "build",
    round: { status: "active", winnerId: null },
    series: {
      format: 3,
      winsNeeded: 2,
      roundsPlayed: 0,
      maxRounds: 5,
      wins: { "player-1": 0, "player-2": 0 },
      draws: 0,
      status: "active",
      winnerId: null,
    },
    map: {
      id: "frost-wastes",
      displayName: "Frost Wastes",
      visualIdentityId: "duel-frost",
      audioProfileId: "duel-frost",
      ambientFxId: "frost-whiteout",
      categoryMultiplier: {
        attack: 1,
        defense: 1,
        support: 1,
        tactical: 1,
        fate: 1,
        mystery: 1,
      },
      wordAffinity: [],
      hazards: [],
      mysteryLabels: [],
      fatePoolId: "frost-fate",
      controlObjective: {
        id: "heat-generator",
        displayLabel: "HEAT GENERATOR",
        answerToken: "heatgenerator",
      },
      escalationProfileId: "frost-escalation",
      cataclysm: {
        id: "absolute-zero",
        displayLabel: "ABSOLUTE ZERO",
        pressureMultiplier: 1.5,
      },
    },
    self: {
      playerId: "player-1",
      hull: 100,
      maxHull: 100,
      shield: 0,
      maxShield: 0,
      energy: 0,
      maxEnergy: 100,
      correctChars: 0,
      wrongChars: 0,
      lastAcceptedSequence: -1,
      targetInstanceId: null,
      acquisitionPrefix: "",
      offers: [],
      inventory: { attack: [], defense: [], tactical: [] },
      incomingThreats: [],
      initiative: 0,
      strategyPath: "balanced",
      readyCombos: [],
      cooldowns: {},
      ownPity: 0,
    },
    opponent: {
      hull: 100,
      maxHull: 100,
      shield: 0,
      maxShield: 0,
      energy: 0,
      maxEnergy: 100,
      initiative: 0,
      strategyPath: "balanced",
    },
    shared: {
      tactical: {
        controlPressure: { "player-1": 0, "player-2": 0 },
        scanSeconds: { "player-1": 0, "player-2": 0 },
        disruptSeconds: { "player-1": 0, "player-2": 0 },
      },
      mysteries: [],
      neutralObjective: null,
      opponentTrapHints: [],
    },
  } as unknown as DuelClientMatchView;
}

function reflexState(
  roundId = "round-1",
  lastAcceptedSequence = -1,
) {
  return {
    type: "MODE_STATE",
    matchId: "match-1",
    roundId,
    view: {
      gameMode: "reflex",
      modeEpoch: 3,
      challenge: {
        challengeId: "vn-en-001:e3:q1",
        modeEpoch: 3,
        kind: "translation-vn-en",
        prompt: "con mèo",
        candidates: [
          { candidateId: "alpha", token: "cat" },
          { candidateId: "bravo", token: "dog" },
          { candidateId: "charlie", token: "sun" },
        ],
        issuedAtMs: 1_000,
        deadlineAtMs: 9_000,
      },
      player: {
        buffer: "",
        physicalTypingMistakes: 0,
        semanticMistakes: 0,
        retries: 0,
        completed: false,
        lastAcceptedSequence,
      },
    },
  } as const;
}

describe("Duel alternative browser transport", () => {
  it("requests an alternative Friend/Practice match without changing Standard default", () => {
    const socket = new FakeSocket();
    const client = new DuelNetworkClient({
      url: "wss://example.test/duel",
      clientVersion: "0.1.0",
      socketFactory: () => socket,
    });
    connect(socket, client);

    expect(client.startMatch("ROOM-1")).toBe(true);
    expect(JSON.parse(socket.sent.at(-1)!)).toEqual({
      type: "START_MATCH",
      requestId: "req-1",
      roomId: "ROOM-1",
    });

    expect(client.startMatch("ROOM-2", "reflex")).toBe(true);
    expect(JSON.parse(socket.sent.at(-1)!)).toEqual({
      type: "START_MATCH",
      requestId: "req-2",
      roomId: "ROOM-2",
      gameMode: "reflex",
    });
  });

  it("routes Reflex typing only through MODE_INPUT with reconnect-safe sequence", () => {
    const socket = new FakeSocket();
    const states: unknown[] = [];
    const client = new DuelNetworkClient({
      url: "wss://example.test/duel",
      clientVersion: "0.1.0",
      socketFactory: () => socket,
      callbacks: {
        onAlternativeModeState(view) {
          states.push(view);
        },
      },
    });
    connect(socket, client);
    socket.message({
      type: "MATCH_UPDATE",
      matchId: "match-1",
      roundId: "round-1",
      serverSequence: 1,
      events: [],
      snapshot: matchView("reflex"),
    });
    socket.message(reflexState("round-1", 7));

    expect(client.sendIntent({ type: "TYPE_CHAR", char: "c" })).toBeNull();
    expect(client.sendModeInput({ type: "TYPE_CHAR", char: "c" })).toBe(8);
    expect(JSON.parse(socket.sent.at(-1)!)).toEqual({
      type: "MODE_INPUT",
      matchId: "match-1",
      roundId: "round-1",
      envelope: {
        gameMode: "reflex",
        modeEpoch: 3,
        inputId: "mode:round-1:8",
        clientSequence: 8,
        kind: "mode-input",
        payload: { type: "TYPE_CHAR", char: "c" },
      },
    });
    expect(states).toHaveLength(1);
  });

  it("ignores stale player-scoped MODE_STATE from an old round", () => {
    const socket = new FakeSocket();
    const client = new DuelNetworkClient({
      url: "wss://example.test/duel",
      clientVersion: "0.1.0",
      socketFactory: () => socket,
    });
    connect(socket, client);
    socket.message({
      type: "MATCH_UPDATE",
      matchId: "match-1",
      roundId: "round-2",
      serverSequence: 2,
      events: [],
      snapshot: matchView("reflex", "round-2"),
    });
    socket.message(reflexState("round-1", 99));

    expect(client.currentAlternativeModeView()).toBeNull();
    expect(client.sendModeInput({ type: "TYPE_CHAR", char: "x" })).toBeNull();
  });

  it("clears alternative input state when authority returns to Standard", () => {
    const socket = new FakeSocket();
    const states: unknown[] = [];
    const client = new DuelNetworkClient({
      url: "wss://example.test/duel",
      clientVersion: "0.1.0",
      socketFactory: () => socket,
      callbacks: { onAlternativeModeState: (view) => states.push(view) },
    });
    connect(socket, client);
    socket.message({
      type: "MATCH_UPDATE",
      matchId: "match-1",
      roundId: "round-1",
      serverSequence: 1,
      events: [],
      snapshot: matchView("reflex"),
    });
    socket.message(reflexState());
    expect(client.currentAlternativeModeView()?.gameMode).toBe("reflex");

    socket.message({
      type: "MATCH_UPDATE",
      matchId: "match-1",
      roundId: "round-2",
      serverSequence: 2,
      events: [],
      snapshot: matchView("standard", "round-2"),
    });
    expect(client.currentAlternativeModeView()).toBeNull();
    expect(states.at(-1)).toBeNull();
  });
});