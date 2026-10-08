import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DuelRoomListing } from "../src/duel/protocol";
import type { DuelNetworkStatus } from "../src/duel/network-client";

// The lobby UI is a DOM module; the controller only needs its handle.
const fakeUi = vi.hoisted(() => ({
  currentLocalRoom: () => null,
  currentRemoteRoom: () => null,
  setRemoteRoom: () => {},
  clearRemoteRoom: () => {},
  setStatus: () => {},
  setConnectionLabel: () => {},
  setRankedQueueStatus: () => {},
  setRankedProfile: () => {},
  setRankedMatchFound: () => {},
  setRoomList: vi.fn(),
  setConnectionState: vi.fn(),
  refreshSelf: () => {},
}));
vi.mock("../src/duel/room-ui", () => ({
  installDuelRoomUi: () => fakeUi,
}));

import { installDuelOnlineRoomController } from "../src/duel/online-room-controller";

class FakeWebSocket {
  static readonly created: FakeWebSocket[] = [];
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readonly sent: string[] = [];

  constructor(readonly url: string) {
    FakeWebSocket.created.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
    this.onclose?.({} as CloseEvent);
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.({} as Event);
  }

  message(value: unknown): void {
    this.onmessage?.({ data: JSON.stringify(value) } as MessageEvent<string>);
  }

  welcome(): void {
    this.message({
      type: "WELCOME",
      protocolVersion: 7,
      sessionId: "session-1",
      reconnectToken: "reconnect-1",
    });
  }

  sentOfType(type: string): unknown[] {
    return this.sent
      .map((raw) => JSON.parse(raw) as { type: string })
      .filter((message) => message.type === type);
  }
}

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index += 1) await Promise.resolve();
}

const listing: DuelRoomListing = {
  roomId: "A1B2C3D4E5",
  roomName: "Open Duel",
  hostDisplayName: "Pilot-host",
  hostCharacterId: "vanguard",
  mapSelection: { mode: "fixed", mapId: "terra-core" },
  roundFormat: 3,
  matchLengthSeconds: 240,
  hazardLevel: "standard",
  modifier: "standard",
  playerCount: 1,
  capacity: 2,
  hasBot: false,
  hasPassword: true,
  status: "waiting",
  createdAt: 42,
};

describe("Duel online room controller · public room list", () => {
  beforeEach(() => {
    FakeWebSocket.created.length = 0;
    const storage = memoryStorage();
    // A dev session token skips the session fetch.
    storage.setItem("space-typing:duel-session-token", "dev-token");
    vi.stubGlobal("sessionStorage", storage);
    vi.stubGlobal("document", { querySelector: () => null });
    vi.stubGlobal("window", {
      location: { protocol: "http:", host: "127.0.0.1:3004" },
    });
    vi.stubGlobal("WebSocket", FakeWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("watchRoomList connects, sends WATCH_ROOMS and fires onRoomList", async () => {
    const lists: Array<readonly DuelRoomListing[]> = [];
    const statuses: DuelNetworkStatus[] = [];
    const controller = installDuelOnlineRoomController({
      clientVersion: "test",
      onRoomList: (rooms) => lists.push(rooms),
      onConnectionStatus: (status) => statuses.push(status),
    });

    controller.watchRoomList(true);
    await flush();
    const socket = FakeWebSocket.created[0]!;
    expect(socket.url).toBe("ws://127.0.0.1:3004/duel");
    socket.open();
    socket.welcome();
    expect(socket.sentOfType("WATCH_ROOMS")).toEqual([
      expect.objectContaining({ watch: true }),
    ]);
    expect(statuses.at(-1)).toBe("connected");

    socket.message({ type: "ROOM_LIST", rooms: [listing] });
    expect(lists).toEqual([[listing]]);
    // The lobby shows the same list and knows the connection is live.
    expect(fakeUi.setRoomList).toHaveBeenLastCalledWith([listing]);
    expect(fakeUi.setConnectionState).toHaveBeenLastCalledWith("connected");

    controller.joinRoom({
      roomId: listing.roomId,
      password: "secret",
      displayName: "Pilot",
    });
    expect(socket.sentOfType("JOIN_ROOM")).toEqual([
      expect.objectContaining({
        roomId: listing.roomId,
        password: "secret",
        displayName: "Pilot",
      }),
    ]);

    controller.watchRoomList(false);
    expect(socket.sentOfType("WATCH_ROOMS").at(-1)).toEqual(
      expect.objectContaining({ watch: false }),
    );
  });

  it("re-subscribes after a reconnect while watching", async () => {
    vi.useFakeTimers();
    const controller = installDuelOnlineRoomController({
      clientVersion: "test",
    });
    controller.watchRoomList(true);
    await flush();
    const first = FakeWebSocket.created[0]!;
    first.open();
    first.welcome();

    first.close();
    vi.advanceTimersByTime(250);
    const second = FakeWebSocket.created[1]!;
    second.open();
    second.welcome();
    expect(second.sentOfType("WATCH_ROOMS")).toEqual([
      expect.objectContaining({ watch: true }),
    ]);
  });
});
