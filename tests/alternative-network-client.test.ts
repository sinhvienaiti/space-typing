import { describe, expect, it, vi } from "vitest";
import {
  DuelNetworkClient,
  type DuelSocketLike,
} from "../src/duel/network-client";
import type { AlternativeMatchView } from "../src/duel/alternative-presentation";

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

function view(input: { sequence?: number; score?: number } = {}): AlternativeMatchView {
  return {
    matchId: "alt-1",
    mode: "reflex",
    matchType: "friend",
    status: "active",
    winner: null,
    self: {
      playerId: "player-1",
      hull: 100,
      score: input.score ?? 0,
      lastAcceptedSequence: input.sequence ?? 0,
    },
    opponent: { hull: 100, score: 0 },
    challenge: {
      kind: "reflex",
      prompt: "good",
      round: 1,
      deadlineAtMs: 2500,
      claimedBy: null,
    },
    projectiles: [],
  };
}

describe("R03 alternative mode network client", () => {
  it("reuses the Duel socket for start, MODE_INPUT and authoritative updates", () => {
    const socket = new FakeSocket();
    const updates = vi.fn();
    const results = vi.fn();
    const client = new DuelNetworkClient({
      url: "ws://duel.test/duel",
      clientVersion: "test",
      autoReconnect: false,
      socketFactory: () => socket,
      callbacks: {
        onAlternativeMatchUpdate: updates,
        onAlternativeInputResult: results,
      },
    });

    client.connect("session-token");
    socket.open();
    socket.message({
      type: "WELCOME",
      protocolVersion: 7,
      sessionId: "session-1",
      reconnectToken: "reconnect-1",
    });

    expect(client.startAlternativeMatch("ROOM-1", "reflex")).toBe(true);
    expect(JSON.parse(socket.sent.at(-1)!)).toMatchObject({
      type: "START_ALTERNATIVE_MATCH",
      roomId: "ROOM-1",
      mode: "reflex",
    });

    socket.message({
      type: "ALTERNATIVE_MATCH_UPDATE",
      matchId: "alt-1",
      serverSequence: 3,
      view: view(),
    });
    expect(updates).toHaveBeenCalledWith(view(), 3);
    expect(client.currentAlternativeView()).toEqual(view());

    expect(client.sendAlternativeModeInput("good")).toBe(1);
    expect(JSON.parse(socket.sent.at(-1)!)).toEqual({
      type: "MODE_INPUT",
      matchId: "alt-1",
      sequence: 1,
      mode: "reflex",
      input: { text: "good" },
    });

    socket.message({
      type: "ALTERNATIVE_INPUT_RESULT",
      matchId: "alt-1",
      sequence: 1,
      accepted: true,
      reason: "accepted",
    });
    expect(results).toHaveBeenCalledWith({
      matchId: "alt-1",
      sequence: 1,
      accepted: true,
      reason: "accepted",
    });
  });

  it("ignores out-of-order alternative snapshots", () => {
    const socket = new FakeSocket();
    const updates = vi.fn();
    const client = new DuelNetworkClient({
      url: "ws://duel.test/duel",
      clientVersion: "test",
      autoReconnect: false,
      socketFactory: () => socket,
      callbacks: { onAlternativeMatchUpdate: updates },
    });
    client.connect("token");
    socket.open();
    socket.message({
      type: "WELCOME",
      protocolVersion: 7,
      sessionId: "session-1",
      reconnectToken: "reconnect-1",
    });
    socket.message({
      type: "ALTERNATIVE_MATCH_UPDATE",
      matchId: "alt-1",
      serverSequence: 5,
      view: view({ sequence: 2, score: 2 }),
    });
    socket.message({
      type: "ALTERNATIVE_MATCH_UPDATE",
      matchId: "alt-1",
      serverSequence: 4,
      view: view({ sequence: 1, score: 1 }),
    });
    expect(updates).toHaveBeenCalledTimes(1);
    expect(client.currentAlternativeView()?.self.score).toBe(2);
  });
});
