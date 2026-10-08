import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DuelAuthorityService,
  type DuelAuthorityDependencies,
} from "../src/duel/authority";
import { defaultDuelRoomSettings, type DuelRoomSettingsInput } from "../src/duel/room";
import {
  DUEL_PROTOCOL_VERSION,
  DUEL_ROOM_LIST_MAX_ROOMS,
  type DuelRoomListing,
} from "../src/duel/protocol";
import { DUEL_ROUND_BREAK_SECONDS } from "../src/duel/presentation-timing";
import {
  DUEL_ROOM_LIST_MIN_PUSH_INTERVAL_MS,
  DuelRoomListWatchers,
} from "../server/duel/room-list-watchers";

function deps(): DuelAuthorityDependencies {
  let token = 0;
  let room = 0;
  let match = 0;
  let seed = 2000;
  return {
    authenticate(sessionToken) {
      if (!sessionToken.startsWith("auth:")) return null;
      const accountId = sessionToken.slice(5);
      return { accountId, displayName: "Pilot-" + accountId };
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

function open(authority: DuelAuthorityService, accountId: string): string {
  const result = authority.openSession({
    protocolVersion: DUEL_PROTOCOL_VERSION,
    sessionToken: "auth:" + accountId,
    now: 0,
  });
  if (!result.ok) throw new Error(result.message);
  return result.value.sessionId;
}

function settings(
  overrides: Partial<DuelRoomSettingsInput> = {},
): DuelRoomSettingsInput {
  return {
    ...defaultDuelRoomSettings(),
    roomName: "Open Duel",
    visibility: "public",
    password: undefined,
    ...overrides,
  };
}

function createRoom(
  authority: DuelAuthorityService,
  sessionId: string,
  now: number,
  overrides: Partial<DuelRoomSettingsInput> = {},
): string {
  const result = authority.createRoom(sessionId, settings(overrides), now);
  if (!result.ok) throw new Error(result.message);
  return result.value.roomId;
}

function startBotMatch(
  authority: DuelAuthorityService,
  host: string,
  roomId: string,
): string {
  authority.setBot(
    host,
    roomId,
    { wpm: 55, accuracy: 0.94, reactionMs: 320, personality: "balanced" },
    1,
  );
  authority.setReady(host, roomId, true, 2);
  const started = authority.startMatch(host, roomId, 3);
  if (!started.ok) throw new Error(started.message);
  return started.value.matchId;
}

/** Ends every round as a timeout draw until the series is over. */
function finishMatch(authority: DuelAuthorityService, matchId: string): void {
  for (let step = 0; step < 40; step += 1) {
    const ended = authority.tick(matchId, 400, 10 + step);
    if (!ended.ok) throw new Error(ended.message);
    if (ended.value.updates[0]!.view.series.status !== "active") return;
    authority.tick(matchId, DUEL_ROUND_BREAK_SECONDS, 10 + step);
  }
  throw new Error("Match did not finish.");
}

function ids(rooms: readonly DuelRoomListing[]): string[] {
  return rooms.map((room) => room.roomId);
}

describe("Duel public room list (authority)", () => {
  it("lists public and private Friend Rooms without leaking secrets", () => {
    const authority = new DuelAuthorityService(deps());
    const host = open(authority, "host");
    const other = open(authority, "other");
    const publicRoom = createRoom(authority, host, 100, {
      roomName: "Open Duel",
      mapSelection: { mode: "random", pool: ["terra-core", "ocean-abyss"] },
      roundFormat: 5,
      matchLengthSeconds: 180,
      hazardLevel: "high",
      modifier: "weapon-frenzy",
    });
    authority.setLoadout(host, publicRoom, { shipId: null, characterId: "zenith" }, 101);
    const privateRoom = createRoom(authority, other, 200, {
      roomName: "Locked Duel",
      visibility: "private",
      password: "secret-pass",
      seedMode: "fixed",
      fixedSeed: 777_111,
    });

    const rooms = authority.roomListings();
    expect(rooms).toEqual([
      {
        roomId: privateRoom,
        roomName: "Locked Duel",
        hostDisplayName: "Pilot-other",
        hostCharacterId: null,
        mapSelection: { mode: "fixed", mapId: "frost-wastes" },
        roundFormat: 3,
        matchLengthSeconds: 240,
        hazardLevel: "standard",
        modifier: "standard",
        playerCount: 1,
        capacity: 2,
        hasBot: false,
        hasPassword: true,
        status: "waiting",
        createdAt: 200,
      },
      {
        roomId: publicRoom,
        roomName: "Open Duel",
        hostDisplayName: "Pilot-host",
        hostCharacterId: "zenith",
        mapSelection: { mode: "random", pool: ["terra-core", "ocean-abyss"] },
        roundFormat: 5,
        matchLengthSeconds: 180,
        hazardLevel: "high",
        modifier: "weapon-frenzy",
        playerCount: 1,
        capacity: 2,
        hasBot: false,
        hasPassword: false,
        status: "waiting",
        createdAt: 100,
      },
    ]);
    const serialized = JSON.stringify(rooms);
    expect(serialized).not.toContain("secret-pass");
    expect(serialized).not.toContain("777111");
    expect(serialized).not.toContain(host);
    expect(serialized).not.toContain(other);
  });

  it("marks a running match in-match and drops the room once the match ends", () => {
    const authority = new DuelAuthorityService(deps());
    const host = open(authority, "host");
    const roomId = createRoom(authority, host, 0);
    const matchId = startBotMatch(authority, host, roomId);

    expect(authority.roomListings()).toEqual([
      expect.objectContaining({
        roomId,
        status: "in-match",
        playerCount: 2,
        hasBot: true,
      }),
    ]);

    finishMatch(authority, matchId);
    expect(authority.roomListings()).toEqual([]);
  });

  it("counts a joined guest and removes closed or expired rooms", () => {
    const authority = new DuelAuthorityService(deps(), {
      reconnectGraceMs: 1000,
      heartbeatTimeoutMs: 100_000,
    });
    const host = open(authority, "host");
    const guest = open(authority, "guest");
    const loner = open(authority, "loner");
    const roomId = createRoom(authority, host, 0);
    const lonerRoom = createRoom(authority, loner, 1);

    authority.joinRoom(guest, { roomId, displayName: "ignored" }, 2);
    expect(authority.roomListings().find((room) => room.roomId === roomId))
      .toEqual(expect.objectContaining({ playerCount: 2, hasBot: false }));

    authority.leaveRoom(guest, roomId, 3);
    expect(authority.roomListings().find((room) => room.roomId === roomId))
      .toEqual(expect.objectContaining({ playerCount: 1 }));

    // The owner leaving closes the room.
    authority.leaveRoom(host, roomId, 4);
    expect(ids(authority.roomListings())).toEqual([lonerRoom]);

    // A host gone past reconnect grace is cleaned up with the room.
    authority.disconnect(loner, 10);
    authority.cleanup(2000);
    expect(authority.roomListings()).toEqual([]);
  });

  it("never lists Ranked matches", () => {
    const authority = new DuelAuthorityService(deps());
    const left = open(authority, "left");
    const right = open(authority, "right");
    const started = authority.startRankedMatch(left, right, 0);
    expect(started.ok).toBe(true);
    expect(authority.roomListings()).toEqual([]);
  });

  it("puts waiting rooms first, newest first, and caps the list", () => {
    const authority = new DuelAuthorityService(deps());
    const busyHost = open(authority, "busy");
    const busyRoom = createRoom(authority, busyHost, 5000);
    startBotMatch(authority, busyHost, busyRoom);

    const created: string[] = [];
    for (let index = 0; index < DUEL_ROOM_LIST_MAX_ROOMS + 5; index += 1) {
      const host = open(authority, "host-" + String(index));
      created.push(createRoom(authority, host, 10 + index));
    }

    const rooms = authority.roomListings();
    expect(rooms).toHaveLength(DUEL_ROOM_LIST_MAX_ROOMS);
    expect(rooms.every((room) => room.status === "waiting")).toBe(true);
    expect(ids(rooms)).toEqual(
      [...created].reverse().slice(0, DUEL_ROOM_LIST_MAX_ROOMS),
    );

    // With room to spare the in-match room follows every waiting room.
    const small = new DuelAuthorityService(deps());
    const a = open(small, "a");
    const b = open(small, "b");
    const playing = createRoom(small, a, 900);
    startBotMatch(small, a, playing);
    const waiting = createRoom(small, b, 100);
    expect(ids(small.roomListings())).toEqual([waiting, playing]);
  });
});

describe("Duel public room list (watchers)", () => {
  type Socket = { id: string };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    const authority = new DuelAuthorityService(deps());
    const pushes: Array<{ socket: Socket; rooms: string[] }> = [];
    const watchers = new DuelRoomListWatchers<Socket>({
      listings: () => authority.roomListings(),
      push(socket, rooms) {
        pushes.push({ socket, rooms: ids(rooms) });
      },
    });
    return { authority, watchers, pushes };
  }

  it("replies at once, then pushes only real changes", () => {
    const { authority, watchers, pushes } = setup();
    const socket = { id: "s1" };
    const host = open(authority, "host");

    watchers.watch(socket);
    expect(pushes).toEqual([{ socket, rooms: [] }]);

    vi.advanceTimersByTime(DUEL_ROOM_LIST_MIN_PUSH_INTERVAL_MS);
    const roomId = createRoom(authority, host, 1);
    watchers.notifyChanged();
    expect(pushes.at(-1)).toEqual({ socket, rooms: [roomId] });

    // Ready does not change any listed field: no push.
    vi.advanceTimersByTime(DUEL_ROOM_LIST_MIN_PUSH_INTERVAL_MS);
    authority.setReady(host, roomId, true, 2);
    watchers.notifyChanged();
    expect(pushes).toHaveLength(2);
  });

  it("throttles bursts and always delivers the final state", () => {
    const { authority, watchers, pushes } = setup();
    const socket = { id: "s1" };
    watchers.watch(socket);
    expect(pushes).toHaveLength(1);

    const created: string[] = [];
    for (let index = 0; index < 10; index += 1) {
      const host = open(authority, "host-" + String(index));
      created.push(createRoom(authority, host, index));
      watchers.notifyChanged();
      vi.advanceTimersByTime(20);
    }
    // 200 ms of changes inside one window: nothing extra yet.
    expect(pushes).toHaveLength(1);

    vi.advanceTimersByTime(DUEL_ROOM_LIST_MIN_PUSH_INTERVAL_MS);
    expect(pushes).toHaveLength(2);
    expect(pushes[1]!.rooms).toEqual([...created].reverse());

    // Over a long burst the rate stays at about 4 pushes per second.
    for (let index = 0; index < 50; index += 1) {
      const host = open(authority, "burst-" + String(index));
      createRoom(authority, host, 100 + index);
      watchers.notifyChanged();
      vi.advanceTimersByTime(20);
    }
    vi.advanceTimersByTime(DUEL_ROOM_LIST_MIN_PUSH_INTERVAL_MS);
    const burstPushes = pushes.length - 2;
    expect(burstPushes).toBeGreaterThanOrEqual(4);
    expect(burstPushes).toBeLessThanOrEqual(5);
    expect(pushes.at(-1)!.rooms).toEqual(ids(authority.roomListings()));
  });

  it("stops after unwatch, cancelling a pending push", () => {
    const { authority, watchers, pushes } = setup();
    const socket = { id: "s1" };
    const host = open(authority, "host");
    watchers.watch(socket);

    createRoom(authority, host, 1);
    watchers.notifyChanged();
    watchers.unwatch(socket);
    expect(watchers.isWatching(socket)).toBe(false);
    vi.advanceTimersByTime(5000);
    createRoom(authority, open(authority, "later"), 2);
    watchers.notifyChanged();
    vi.advanceTimersByTime(5000);
    expect(pushes).toHaveLength(1);

    // Re-watching replies at once with the current list.
    watchers.watch(socket);
    expect(pushes).toHaveLength(2);
    expect(pushes[1]!.rooms).toEqual(ids(authority.roomListings()));
    expect(pushes[1]!.rooms).toHaveLength(2);
  });

  it("cannot beat the throttle by toggling WATCH_ROOMS", () => {
    const { watchers, pushes } = setup();
    const socket = { id: "s1" };
    for (let index = 0; index < 20; index += 1) {
      watchers.watch(socket);
      watchers.unwatch(socket);
    }
    watchers.watch(socket);
    vi.advanceTimersByTime(DUEL_ROOM_LIST_MIN_PUSH_INTERVAL_MS);
    expect(pushes).toHaveLength(2);
  });

  it("keeps watching independent of room membership and per socket", () => {
    const { authority, watchers, pushes } = setup();
    const hostSocket = { id: "host" };
    const browserSocket = { id: "browser" };
    const host = open(authority, "host");
    const guest = open(authority, "guest");

    watchers.watch(hostSocket);
    watchers.watch(browserSocket);
    vi.advanceTimersByTime(DUEL_ROOM_LIST_MIN_PUSH_INTERVAL_MS);

    // The watching host creates a room and still gets list pushes.
    const roomId = createRoom(authority, host, 1);
    watchers.notifyChanged();
    expect(pushes.filter((push) => push.socket === hostSocket).at(-1)!.rooms)
      .toEqual([roomId]);

    // A watcher can join from the list; its membership is untouched by watching.
    const joined = authority.joinRoom(guest, { roomId, displayName: "guest" }, 2);
    expect(joined.ok).toBe(true);
    watchers.unwatch(browserSocket);
    expect(authority.sessionBindings(guest)?.roomId).toBe(roomId);
    expect(watchers.watcherCount()).toBe(1);
  });
});
