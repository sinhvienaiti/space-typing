import type {
  DuelClientEvent,
  DuelClientMatchView,
  DuelClientRoomSnapshot,
} from "./authority";
import {
  DuelNetworkClient,
  type DuelLocalPrediction,
  type DuelNetworkStatus,
} from "./network-client";
import {
  installDuelRoomUi,
  type DuelRoomUiController,
} from "./room-ui";
import type { DuelRoomSnapshot } from "./room";
import type { DuelRoomListing } from "./protocol";

export type DuelOnlineRoomControllerConfig = {
  clientVersion: string;
  onMatchUpdate?(
    view: DuelClientMatchView,
    events: readonly DuelClientEvent[],
  ): void;
  onPrediction?(prediction: DuelLocalPrediction): void;
  onLocalPracticeReady?(snapshot: DuelRoomSnapshot): void;
  /**
   * The hull this player flies (their selected ship). Sent as the room
   * loadout and with the Ranked queue, so the other player sees it; without
   * it everyone showed up as Vanguard vs Reaper.
   */
  characterId?(): string;
  /** Room updates (e.g. to preload the opponent's 3D hull before the match). */
  onRoomSnapshot?(room: DuelClientRoomSnapshot): void;
  /**
   * The public room list while watchRoomList(true) is on: once right away,
   * then on every change (at most ~4 per second). Replace the whole list.
   */
  onRoomList?(rooms: readonly DuelRoomListing[]): void;
  /** Connection changes; the room list is only live while "connected". */
  onConnectionStatus?(status: DuelNetworkStatus): void;
  /** "Change ship" on the lobby pilot card. */
  onChangeShip?(): void;
};

export type DuelOnlineJoinRequest = {
  /** DuelRoomListing.roomId. */
  roomId: string;
  /** Needed when DuelRoomListing.hasPassword is true. */
  password?: string;
  /** Required by JOIN_ROOM; the server shows the signed-in pilot name instead. */
  displayName: string;
};

type SessionResponse = {
  token: string;
};

const DEV_SESSION_TOKEN_KEY =
  "space-typing:duel-session-token";

function metaContent(name: string): string | null {
  const node = document.querySelector<HTMLMetaElement>(
    'meta[name="' + name + '"]',
  );
  const content = node?.content.trim() ?? "";
  return content === "" ? null : content;
}

export function defaultDuelWebSocketUrl(): string {
  const configured = metaContent("duel-ws-url");
  if (configured !== null) return configured;

  const scheme =
    window.location.protocol === "https:"
      ? "wss:"
      : "ws:";
  return (
    scheme +
    "//" +
    window.location.host +
    "/duel"
  );
}

async function fetchSessionToken(): Promise<string> {
  const devToken =
    sessionStorage.getItem(
      DEV_SESSION_TOKEN_KEY,
    );
  if (
    devToken !== null &&
    devToken.trim() !== ""
  ) {
    return devToken.trim();
  }

  const endpoint =
    metaContent("duel-session-endpoint") ??
    "/api/duel/session";
  const response = await fetch(endpoint, {
    signal: AbortSignal.timeout(8000),
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  }).catch(() => {
    throw new Error("Cannot reach the Duel session API. Start the local Duel server (pnpm duel:local), check the proxy, then retry. Practice vs Bot works offline.");
  });
  if (!response.ok) {
    throw new Error(
      "Duel server unavailable (HTTP " +
        String(response.status) +
        "). Local setup: run pnpm duel:local and check the /api/duel/session proxy. Practice vs Bot works offline.",
    );
  }
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("Duel session API is serving a web page instead of JSON. Configure the /api/duel/session and /duel proxies, then start the local Duel server. Practice vs Bot works offline.");
  }
  const body = (await response.json()) as Partial<SessionResponse>;
  if (
    typeof body.token !== "string" ||
    body.token.trim() === ""
  ) {
    throw new Error(
      "Duel session endpoint did not return a signed token.",
    );
  }
  return body.token.trim();
}

function statusLabel(
  status: DuelNetworkStatus,
): string {
  switch (status) {
    case "idle":
      return "Friend Room · offline";
    case "connecting":
      return "Friend Room · connecting";
    case "authenticating":
      return "Friend Room · authenticating";
    case "connected":
      return "Friend Room · online";
    case "reconnecting":
      return "Friend Room · reconnecting";
    case "closed":
      return "Friend Room · disconnected";
  }
}

export function installDuelOnlineRoomController(
  config: DuelOnlineRoomControllerConfig,
): {
  client: DuelNetworkClient;
  ui: DuelRoomUiController;
  /**
   * Starts (true) or stops (false) the public room list. Connects if
   * needed; re-subscribes by itself after a reconnect while on.
   */
  watchRoomList(watch: boolean): void;
  /** Joins a room (e.g. from the list), connecting first if needed. */
  joinRoom(request: DuelOnlineJoinRequest): void;
} {
  let ui: DuelRoomUiController | null = null;
  let tokenPromise: Promise<string> | null = null;
  let obtainingSession = false;
  let sentLoadout: string | null = null;
  let roomListReceived = false;
  const pending: Array<() => void> = [];

  const client = new DuelNetworkClient({
    url: defaultDuelWebSocketUrl(),
    clientVersion: config.clientVersion,
    reconnectStorage: sessionStorage,
    callbacks: {
      onStatus(status) {
        ui?.setConnectionLabel(
          statusLabel(status),
        );
        ui?.setConnectionState(status);
        config.onConnectionStatus?.(status);
        if (status === "connected") {
          const queued = pending.splice(0);
          for (const action of queued) action();
        }
      },
      onRoomSnapshot(room) {
        // Tell the server which hull we fly, once per room and choice.
        const desired = config.characterId?.() ?? null;
        const own = room.selfSlotIndex === null ? null : room.slots[room.selfSlotIndex];
        if (desired !== null && own !== null && own.kind === "human" && own.characterId !== desired
          && sentLoadout !== room.roomId + ":" + desired) {
          sentLoadout = room.roomId + ":" + desired;
          client.setLoadout(room.roomId, { shipId: own.shipId, characterId: desired });
        }
        config.onRoomSnapshot?.(room);
        ui?.setRemoteRoom(room);
        ui?.setStatus(
          room.canStart
            ? "Friend Room ready."
            : "Friend Room synchronized with server.",
        );
      },
      onRoomClosed(_roomId, reason) {
        ui?.clearRemoteRoom(reason);
      },
      onRoomList(rooms) {
        roomListReceived = true;
        ui?.setRoomList(rooms);
        config.onRoomList?.(rooms);
      },
      onRankedQueueStatus(status) {
        ui?.setRankedQueueStatus(status);
      },
      onRankedMatchFound(matchId) {
        ui?.setRankedMatchFound(matchId);
      },
      onRankedProfile(profile) {
        ui?.setRankedProfile(profile);
      },
      onMatchUpdate(view, events) {
        ui?.setStatus(
          "Duel connected · " +
            view.map.displayName +
            " · " +
            view.phase.toUpperCase(),
        );
        config.onMatchUpdate?.(
          view,
          events,
        );
      },
      onPrediction(prediction) {
        config.onPrediction?.(prediction);
      },
      onError(code, message) {
        if (
          code === "BAD_MESSAGE" &&
          client.isWatchingRooms() &&
          !roomListReceived
        ) {
          // A server from before the room list rejects WATCH_ROOMS.
          ui?.setStatus(
            "This Duel server is older and has no room list yet. Restart it (pnpm duel:local:restart). Rooms by code, Ranked and Practice still work.",
            true,
          );
          return;
        }
        ui?.setStatus(
          code + " · " + message,
          true,
        );
        if (
          code === "AUTH_FAILED" ||
          code === "RECONNECT_EXPIRED"
        ) {
          tokenPromise = null;
        }
      },
    },
  });

  const ensureConnected = async (): Promise<void> => {
    if (obtainingSession) return;
    const status = client.currentStatus();
    if (
      status === "connected" ||
      status === "connecting" ||
      status === "authenticating" ||
      status === "reconnecting"
    ) {
      return;
    }

    obtainingSession = true;
    ui?.setConnectionLabel("Friend Room · requesting session");
    try {
      tokenPromise ??= fetchSessionToken();
      const token = await tokenPromise;
      client.connect(token);
    } catch (error) {
      tokenPromise = null;
      pending.length = 0;
      ui?.setConnectionLabel(
        "Friend Room · unavailable",
      );
      ui?.setStatus(
        error instanceof Error
          ? error.message
          : "Unable to obtain Duel session.",
        true,
      );
    } finally {
      obtainingSession = false;
    }
  };

  const runOnline = (
    action: () => void,
  ): void => {
    if (client.currentStatus() === "connected") {
      action();
      return;
    }
    pending.push(action);
    ui?.setStatus("Connecting to Duel server…");
    void ensureConnected();
  };

  const watchRoomList = (watch: boolean): void => {
    // Remembered by the client and sent after each WELCOME, so no queueing here.
    client.watchRooms(watch);
    if (watch) void ensureConnected();
  };

  const joinRoom = (request: DuelOnlineJoinRequest): void => {
    runOnline(() => {
      client.joinRoom({
        roomId: request.roomId,
        password: request.password,
        displayName: request.displayName,
      });
    });
  };

  ui = installDuelRoomUi({
    onOpen() {
      void ensureConnected();
    },
    onRoomListWatch(watch) {
      watchRoomList(watch);
    },
    selfShipId: config.characterId,
    onChangeShip: config.onChangeShip,
    onCreateRequest(request) {
      runOnline(() => {
        client.createRoom(request.settings);
      });
    },
    onJoinRequest(request) {
      joinRoom(request);
    },
    onReadyRequest(roomId, ready) {
      runOnline(() => {
        client.setReady(roomId, ready);
      });
    },
    onBotRequest(roomId, bot) {
      runOnline(() => {
        client.setBot(roomId, bot);
      });
    },
    onRemoveBotRequest(roomId) {
      runOnline(() => {
        client.removeBot(roomId);
      });
    },
    onStartMatchRequest(roomId) {
      runOnline(() => {
        client.startMatch(roomId);
      });
    },
    onLeaveRoomRequest(roomId) {
      runOnline(() => {
        client.leaveRoom(roomId);
      });
    },
    onQueueRankedRequest() {
      runOnline(() => {
        client.queueRanked(config.characterId?.() ?? null);
      });
    },
    onLeaveRankedQueueRequest() {
      runOnline(() => {
        client.leaveRankedQueue();
      });
    },
    onLocalPracticeReady(snapshot) {
      ui?.setStatus(
        snapshot.canStart
          ? "Local practice room ready."
          : "Local practice room is not ready.",
      );
      if (snapshot.canStart) {
        config.onLocalPracticeReady?.(snapshot);
      }
    },
  });

  ui.setConnectionLabel(
    statusLabel(client.currentStatus()),
  );
  ui.setConnectionState(client.currentStatus());

  return { client, ui, watchRoomList, joinRoom };
}
