import { describe, expect, it, vi } from "vitest";
import {
  DuelNetworkClient,
  type DuelLocalPrediction,
  type DuelReconnectStorage,
  type DuelSocketLike,
} from "../src/duel/network-client";
import type { DuelClientMatchView } from "../src/duel/authority";
import type { DuelRoomSettingsInput } from "../src/duel/room";

class FakeSocket implements DuelSocketLike {
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage:
    | ((event: MessageEvent<string>) => void)
    | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readonly sent: string[] = [];
  readonly closes: Array<{ code?: number; reason?: string }> = [];

  send(data: string): void {
    this.sent.push(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = 3;
    this.closes.push({ code, reason });
    this.onclose?.({} as CloseEvent);
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.({} as Event);
  }

  message(value: unknown): void {
    this.onmessage?.({
      data: JSON.stringify(value),
    } as MessageEvent<string>);
  }

  drop(): void {
    this.readyState = 3;
    this.onclose?.({} as CloseEvent);
  }
}

class MemoryStorage implements DuelReconnectStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function roomSettings(): DuelRoomSettingsInput {
  return {
    roomName: "Duel Room",
    visibility: "private",
    password: "space",
    matchLengthSeconds: 240,
    roundFormat: 3,
    mapSelection: {
      mode: "fixed",
      mapId: "frost-wastes",
    },
    hazardLevel: "standard",
    mysteryFrequency: "standard",
    fateFrequency: "standard",
    botAllowed: true,
    seedMode: "random",
    modifier: "standard",
  };
}

function matchView(input?: {
  serverSequence?: number;
  lastAcceptedSequence?: number;
  prefix?: string;
  targetId?: string | null;
}): DuelClientMatchView {
  return {
    matchId: "match-1",
    roundId: "round-1",
    mode: "friend",
    combatProfile: "normalized",
    appearance: {
      selfCharacterId: "vanguard",
      opponentCharacterId: "reaper",
      selfShipId: null,
      opponentShipId: null,
    },
    serverSequence: input?.serverSequence ?? 0,
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
      shield: 20,
      maxShield: 40,
      energy: 25,
      maxEnergy: 100,
      correctChars: 0,
      wrongChars: 0,
      lastAcceptedSequence:
        input?.lastAcceptedSequence ?? -1,
      targetInstanceId: input?.targetId ?? null,
      acquisitionPrefix: input?.prefix ?? "",
      offers: [
        {
          instanceId: "offer:player-1:1",
          actionId: "laser",
          ownerId: "player-1",
          status: "available",
          typedPrefix: "",
          slotIndex: 0,
          shared: false,
        },
      ],
      inventory: {
        attack: [],
        defense: [],
        tactical: [],
      },
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
      shield: 20,
      maxShield: 40,
      energy: 25,
      maxEnergy: 100,
      initiative: 0,
      strategyPath: "balanced",
    },
    shared: {
      tactical: {
        controlPressure: {
          "player-1": 0,
          "player-2": 0,
        },
        scanSeconds: {
          "player-1": 0,
          "player-2": 0,
        },
        disruptSeconds: {
          "player-1": 0,
          "player-2": 0,
        },
      },
      mysteries: [],
      neutralObjective: null,
      opponentTrapHints: [],
    },
  } as unknown as DuelClientMatchView;
}

function welcome(socket: FakeSocket): void {
  socket.message({
    type: "WELCOME",
    protocolVersion: 3,
    sessionId: "session-1",
    reconnectToken: "reconnect-1",
  });
}

describe("Duel Friend Room browser transport", () => {
  it("sends auth in HELLO body, never in the WebSocket URL", () => {
    const socket = new FakeSocket();
    let openedUrl = "";
    const client = new DuelNetworkClient({
      url: "wss://example.test/duel",
      clientVersion: "0.1.0",
      socketFactory(url) {
        openedUrl = url;
        return socket;
      },
    });

    client.connect("signed-secret-token");
    socket.open();

    expect(openedUrl).toBe("wss://example.test/duel");
    expect(openedUrl).not.toContain("signed-secret-token");
    expect(JSON.parse(socket.sent[0]!)).toEqual(
      expect.objectContaining({
        type: "HELLO",
        sessionToken: "signed-secret-token",
      }),
    );
  });

  it("uses a stored reconnect token on the next socket handshake", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "space-typing:duel-reconnect-token",
      "reconnect-stored",
    );
    const socket = new FakeSocket();
    const client = new DuelNetworkClient({
      url: "wss://example.test/duel",
      clientVersion: "0.1.0",
      reconnectStorage: storage,
      socketFactory: () => socket,
    });

    client.connect("signed-token");
    socket.open();

    expect(JSON.parse(socket.sent[0]!)).toEqual(
      expect.objectContaining({
        reconnectToken: "reconnect-stored",
      }),
    );
  });

  it("answers server heartbeat PING with semantic PONG", () => {
    const socket = new FakeSocket();
    const client = new DuelNetworkClient({
      url: "wss://example.test/duel",
      clientVersion: "0.1.0",
      socketFactory: () => socket,
    });
    client.connect("signed-token");
    socket.open();
    welcome(socket);

    socket.message({
      type: "PING",
      nonce: "heartbeat-42",
    });

    expect(JSON.parse(socket.sent.at(-1)!)).toEqual({
      type: "PONG",
      nonce: "heartbeat-42",
    });
  });

  it("predicts only local typing prefix before authority responds", () => {
    const socket = new FakeSocket();
    const predictions: DuelLocalPrediction[] = [];
    const client = new DuelNetworkClient({
      url: "wss://example.test/duel",
      clientVersion: "0.1.0",
      socketFactory: () => socket,
      callbacks: {
        onPrediction(prediction) {
          predictions.push(prediction);
        },
      },
    });
    client.connect("signed-token");
    socket.open();
    welcome(socket);
    socket.message({
      type: "MATCH_UPDATE",
      matchId: "match-1",
      roundId: "round-1",
      serverSequence: 0,
      events: [],
      snapshot: matchView(),
    });

    const sequence = client.sendIntent({
      type: "TYPE_CHAR",
      char: "l",
    });

    expect(sequence).toBe(1);
    expect(predictions.at(-1)).toEqual({
      roundId: "round-1",
      targetInstanceId: "offer:player-1:1",
      acquisitionPrefix: "l",
      pendingSequences: [1],
    });
    expect(client.currentView()?.self.hull).toBe(100);
    expect(JSON.parse(socket.sent.at(-1)!)).toEqual(
      expect.objectContaining({
        type: "INTENT",
        sequence: 1,
        intent: {
          type: "TYPE_CHAR",
          char: "l",
        },
      }),
    );
  });

  it("blocks auto-use prediction for insufficient energy, preserves prefix, then resumes after recharge", () => {
    const socket = new FakeSocket();
    const predictions: DuelLocalPrediction[] = [];
    const client = new DuelNetworkClient({ url: "wss://example.test/duel", clientVersion: "0.1.0", socketFactory: () => socket,
      callbacks: { onPrediction: prediction => predictions.push(prediction) } });
    client.connect("signed-token"); socket.open(); welcome(socket);
    const view = matchView();
    view.self.offers[0]!.actionId = "shield";
    view.self.offers[0]!.typingPrompt = { promptId: "p", wordId: "provide", answerToken: "provide", lexiconVersion: "test", difficultyClass: "core" };
    view.self.inventory = { attack: [], tactical: [], defense: [1, 2].map(i => ({ instanceId: "stored:" + i, actionId: "reflect", storedAtTick: i, qualityScale: 1 })) };
    view.self.energy = 0;
    const update = () => socket.message({ type: "MATCH_UPDATE", matchId: "match-1", roundId: "round-1", serverSequence: view.serverSequence, events: [], snapshot: view });
    update();
    client.sendIntent({ type: "SELECT_TARGET", targetInstanceId: "offer:player-1:1" });
    client.sendIntent({ type: "TYPE_CHAR", char: "p" });
    expect(predictions.at(-1)?.targetInstanceId).toBeNull();
    expect(predictions.at(-1)?.acquisitionPrefix).toBe("");
    // An already-locked prefix from authority is not erased or advanced.
    view.serverSequence = 1;
    view.self.lastAcceptedSequence = 2;
    view.self.targetInstanceId = "offer:player-1:1";
    view.self.acquisitionPrefix = "provid";
    view.self.offers[0]!.typedPrefix = "provid";
    view.self.offers[0]!.status = "locked";
    update();
    client.sendIntent({ type: "TYPE_CHAR", char: "e" });
    expect(predictions.at(-1)?.acquisitionPrefix).toBe("provid");
    view.serverSequence = 2;
    view.self.lastAcceptedSequence = 3;
    view.self.energy = 20; // Legacy bank contents must not block immediate activation.
    update();
    client.sendIntent({ type: "TYPE_CHAR", char: "e" });
    expect(predictions.at(-1)?.acquisitionPrefix).toBe("provide");
  });

  it("reconciles prediction from authority and ignores older snapshots", () => {
    const socket = new FakeSocket();
    const client = new DuelNetworkClient({
      url: "wss://example.test/duel",
      clientVersion: "0.1.0",
      socketFactory: () => socket,
    });
    client.connect("signed-token");
    socket.open();
    welcome(socket);
    socket.message({
      type: "MATCH_UPDATE",
      matchId: "match-1",
      roundId: "round-1",
      serverSequence: 1,
      events: [],
      snapshot: matchView({
        serverSequence: 1,
        lastAcceptedSequence: 1,
        targetId: "offer:player-1:1",
        prefix: "l",
      }),
    });

    socket.message({
      type: "MATCH_UPDATE",
      matchId: "match-1",
      roundId: "round-1",
      serverSequence: 0,
      events: [],
      snapshot: matchView({
        serverSequence: 0,
        lastAcceptedSequence: -1,
        targetId: null,
        prefix: "",
      }),
    });

    expect(client.currentPrediction()).toEqual({
      roundId: "round-1",
      targetInstanceId: "offer:player-1:1",
      acquisitionPrefix: "l",
      pendingSequences: [],
    });
  });

  it("sends room-control commands separately from combat intent grammar", () => {
    const socket = new FakeSocket();
    const client = new DuelNetworkClient({
      url: "wss://example.test/duel",
      clientVersion: "0.1.0",
      socketFactory: () => socket,
    });
    client.connect("signed-token");
    socket.open();
    welcome(socket);

    expect(client.createRoom(roomSettings())).toBe(true);
    expect(JSON.parse(socket.sent.at(-1)!)).toEqual(
      expect.objectContaining({
        type: "CREATE_ROOM",
        requestId: "req-1",
      }),
    );

    expect(client.startMatch("ROOM-1")).toBe(true);
    expect(JSON.parse(socket.sent.at(-1)!)).toEqual({
      type: "START_MATCH",
      requestId: "req-2",
      roomId: "ROOM-1",
    });
  });

  it("sends Ranked queue control outside combat intent grammar", () => {
    const socket = new FakeSocket();
    const statuses: unknown[] = [];
    const found: string[] = [];
    const profiles: unknown[] = [];
    const client = new DuelNetworkClient({
      url: "wss://example.test/duel",
      clientVersion: "0.1.0",
      socketFactory: () => socket,
      callbacks: {
        onRankedQueueStatus(status) {
          statuses.push(status);
        },
        onRankedMatchFound(matchId) {
          found.push(matchId);
        },
        onRankedProfile(profile) {
          profiles.push(profile);
        },
      },
    });
    client.connect("signed-token");
    socket.open();
    welcome(socket);

    expect(client.queueRanked()).toBe(true);
    expect(JSON.parse(socket.sent.at(-1)!)).toEqual({
      type: "QUEUE_RANKED",
      requestId: "req-1",
    });

    socket.message({
      type: "RANKED_QUEUE_STATUS",
      status: "queued",
      ticketId: "ticket-1",
      matchmakingRating: 1042,
    });
    socket.message({
      type: "RANKED_MATCH_FOUND",
      matchId: "ranked-1",
    });
    socket.message({
      type: "RANKED_PROFILE",
      typingRating: 1020,
      duelRating: 1055,
      matchmakingRating: 1041,
      matchesPlayed: 12,
      wins: 7,
      losses: 4,
      draws: 1,
    });

    expect(statuses).toEqual([
      {
        status: "queued",
        ticketId: "ticket-1",
        matchmakingRating: 1042,
      },
    ]);
    expect(found).toEqual(["ranked-1"]);
    expect(profiles).toEqual([
      {
        typingRating: 1020,
        duelRating: 1055,
        matchmakingRating: 1041,
        matchesPlayed: 12,
        wins: 7,
        losses: 4,
        draws: 1,
      },
    ]);

    expect(client.leaveRankedQueue()).toBe(true);
    expect(JSON.parse(socket.sent.at(-1)!)).toEqual({
      type: "LEAVE_RANKED_QUEUE",
      requestId: "req-2",
    });
  });

  it("does not loop reconnect after a fatal authentication failure", () => {
    vi.useFakeTimers();
    try {
      const created: FakeSocket[] = [];
      const client = new DuelNetworkClient({
        url: "wss://example.test/duel",
        clientVersion: "0.1.0",
        socketFactory() {
          const socket = new FakeSocket();
          created.push(socket);
          return socket;
        },
      });

      client.connect("bad-token");
      created[0]!.open();
      created[0]!.message({
        type: "ERROR",
        code: "AUTH_FAILED",
        message: "Bad token",
      });
      created[0]!.drop();

      vi.advanceTimersByTime(10_000);
      expect(created).toHaveLength(1);
      expect(client.currentStatus()).toBe("closed");
    } finally {
      vi.useRealTimers();
    }
  });

  it("auto-reconnects after an unexpected close without putting tokens in URL", () => {
    vi.useFakeTimers();
    try {
      const created: FakeSocket[] = [];
      const urls: string[] = [];
      const storage = new MemoryStorage();
      const client = new DuelNetworkClient({
        url: "wss://example.test/duel",
        clientVersion: "0.1.0",
        reconnectStorage: storage,
        socketFactory(url) {
          urls.push(url);
          const socket = new FakeSocket();
          created.push(socket);
          return socket;
        },
      });

      client.connect("signed-token");
      created[0]!.open();
      welcome(created[0]!);
      created[0]!.drop();

      vi.advanceTimersByTime(250);
      expect(created).toHaveLength(2);
      created[1]!.open();

      expect(JSON.parse(created[1]!.sent[0]!)).toEqual(
        expect.objectContaining({
          type: "HELLO",
          sessionToken: "signed-token",
          reconnectToken: "reconnect-1",
        }),
      );
      expect(urls).toEqual([
        "wss://example.test/duel",
        "wss://example.test/duel",
      ]);
      expect(urls.join(" ")).not.toContain("signed-token");
      expect(urls.join(" ")).not.toContain("reconnect-1");
    } finally {
      vi.useRealTimers();
    }
  });
});
