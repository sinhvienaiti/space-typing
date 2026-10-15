import type { DuelRoomListing } from "../../src/duel/protocol";

/** At most about 4 ROOM_LIST pushes per second to one socket. */
export const DUEL_ROOM_LIST_MIN_PUSH_INTERVAL_MS = 250;

export type DuelRoomListWatchersConfig<Socket> = {
  /** The current list (DuelAuthorityService.roomListings). */
  listings(): readonly DuelRoomListing[];
  push(socket: Socket, rooms: readonly DuelRoomListing[]): void;
  minPushIntervalMs?: number;
  now?(): number;
};

type WatcherState = {
  /** The list this socket last received (JSON), or null to force a push. */
  sentJson: string | null;
  /** A trailing push waiting out the throttle window. */
  timer: ReturnType<typeof setTimeout> | null;
};

/**
 * Sockets that asked for the public room list (WATCH_ROOMS true). Pushes only
 * when the list really changed, throttled per socket; a change inside the
 * window is delivered by one trailing push that reads the newest list, so
 * the final state always arrives. Independent of room membership.
 */
export class DuelRoomListWatchers<Socket extends object> {
  private readonly listings: () => readonly DuelRoomListing[];
  private readonly push: (
    socket: Socket,
    rooms: readonly DuelRoomListing[],
  ) => void;
  private readonly minPushIntervalMs: number;
  private readonly now: () => number;
  private readonly watchers = new Map<Socket, WatcherState>();
  /** Kept across unwatch, so toggling WATCH_ROOMS cannot beat the throttle. */
  private readonly lastPushAt = new WeakMap<Socket, number>();
  private current: {
    rooms: readonly DuelRoomListing[];
    json: string;
  } | null = null;

  constructor(config: DuelRoomListWatchersConfig<Socket>) {
    this.listings = config.listings;
    this.push = config.push;
    this.minPushIntervalMs =
      config.minPushIntervalMs ?? DUEL_ROOM_LIST_MIN_PUSH_INTERVAL_MS;
    this.now = config.now ?? Date.now;
  }

  /** Subscribes (or re-requests) and sends the current list at once. */
  watch(socket: Socket): void {
    let state = this.watchers.get(socket);
    if (state === undefined) {
      state = { sentJson: null, timer: null };
      this.watchers.set(socket, state);
    }
    state.sentJson = null;
    this.current = null;
    this.deliver(socket, state);
  }

  unwatch(socket: Socket): void {
    const state = this.watchers.get(socket);
    if (state === undefined) return;
    if (state.timer !== null) clearTimeout(state.timer);
    this.watchers.delete(socket);
  }

  isWatching(socket: Socket): boolean {
    return this.watchers.has(socket);
  }

  watcherCount(): number {
    return this.watchers.size;
  }

  /** Call after anything that may change the list; unchanged lists are not resent. */
  notifyChanged(): void {
    this.current = null;
    for (const [socket, state] of this.watchers) {
      this.deliver(socket, state);
    }
  }

  dispose(): void {
    for (const state of this.watchers.values()) {
      if (state.timer !== null) clearTimeout(state.timer);
    }
    this.watchers.clear();
    this.current = null;
  }

  private list(): {
    rooms: readonly DuelRoomListing[];
    json: string;
  } {
    if (this.current === null) {
      const rooms = this.listings();
      this.current = { rooms, json: JSON.stringify(rooms) };
    }
    return this.current;
  }

  private deliver(socket: Socket, state: WatcherState): void {
    // A trailing push is pending; it reads the newest list when it fires.
    if (state.timer !== null) return;
    const list = this.list();
    if (list.json === state.sentJson) return;

    const now = this.now();
    const wait =
      (this.lastPushAt.get(socket) ?? -Infinity) +
      this.minPushIntervalMs -
      now;
    if (wait > 0) {
      state.timer = setTimeout(() => {
        state.timer = null;
        if (this.watchers.get(socket) !== state) return;
        this.deliver(socket, state);
      }, wait);
      return;
    }

    state.sentJson = list.json;
    this.lastPushAt.set(socket, now);
    this.push(socket, list.rooms);
  }
}
