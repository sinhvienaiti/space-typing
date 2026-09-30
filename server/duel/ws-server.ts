import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server as HttpServer,
} from "node:http";
import {
  createServer as createHttpsServer,
} from "node:https";
import { readFileSync } from "node:fs";
import {
  randomBytes,
  randomUUID,
} from "node:crypto";
import {
  WebSocket,
  WebSocketServer,
  type RawData,
} from "ws";
import {
  DuelAuthorityService,
  type DuelAuthorityResult,
  type DuelClientMatchUpdate,
} from "../../src/duel/authority";
import {
  DUEL_PROTOCOL_MAX_MESSAGE_BYTES,
  DUEL_PROTOCOL_VERSION,
  parseDuelClientMessage,
  type DuelClientMessage,
  type DuelServerMessage,
} from "../../src/duel/protocol";
import {
  verifyDuelSessionToken,
} from "./auth";

type ConnectionState = {
  sessionId: string | null;
  authenticated: boolean;
  lastPongAt: number;
  helloTimer: ReturnType<typeof setTimeout>;
};

const PORT = Number(process.env.DUEL_PORT ?? "3014");
const HOST = process.env.DUEL_HOST ?? "127.0.0.1";
const WS_PATH = process.env.DUEL_WS_PATH ?? "/duel";
const AUTH_SECRET = process.env.DUEL_AUTH_SECRET ?? "";
const NODE_ENV = process.env.NODE_ENV ?? "development";
const TLS_KEY_PATH = process.env.DUEL_TLS_KEY_PATH;
const TLS_CERT_PATH = process.env.DUEL_TLS_CERT_PATH;
const TLS_AT_PROXY =
  process.env.DUEL_TLS_TERMINATED_AT_PROXY === "1";
const ALLOW_NO_ORIGIN =
  process.env.DUEL_ALLOW_NO_ORIGIN === "1";
const HELLO_TIMEOUT_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 10_000;
const HEARTBEAT_TIMEOUT_MS = 20_000;
const TICK_MS = 50;

const defaultDevOrigins = [
  "http://127.0.0.1:3004",
  "http://localhost:3004",
  "https://typing-game.local",
];

function envOrigins(): Set<string> {
  const raw = process.env.DUEL_ALLOWED_ORIGINS;
  const values =
    raw === undefined || raw.trim() === ""
      ? NODE_ENV === "production"
        ? []
        : defaultDevOrigins
      : raw
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
  return new Set(values);
}

const allowedOrigins = envOrigins();

if (AUTH_SECRET.length < 32) {
  throw new Error(
    "DUEL_AUTH_SECRET is required and must contain at least 32 characters.",
  );
}
if (
  NODE_ENV === "production" &&
  allowedOrigins.size === 0
) {
  throw new Error(
    "DUEL_ALLOWED_ORIGINS is required in production.",
  );
}
if (
  (TLS_KEY_PATH === undefined) !==
  (TLS_CERT_PATH === undefined)
) {
  throw new Error(
    "DUEL_TLS_KEY_PATH and DUEL_TLS_CERT_PATH must be configured together.",
  );
}
if (
  NODE_ENV === "production" &&
  TLS_KEY_PATH === undefined &&
  !TLS_AT_PROXY
) {
  throw new Error(
    "Production Duel transport requires TLS or DUEL_TLS_TERMINATED_AT_PROXY=1.",
  );
}

function randomSeed(): number {
  return randomBytes(4).readUInt32BE(0);
}

const authority = new DuelAuthorityService(
  {
    authenticate(sessionToken) {
      return verifyDuelSessionToken(
        sessionToken,
        AUTH_SECRET,
      );
    },
    token() {
      return randomBytes(24).toString("base64url");
    },
    roomId() {
      return randomBytes(5)
        .toString("hex")
        .toUpperCase();
    },
    matchId() {
      return randomUUID();
    },
    seed() {
      return randomSeed();
    },
  },
  {
    heartbeatTimeoutMs: HEARTBEAT_TIMEOUT_MS,
  },
);

const socketsBySession = new Map<string, WebSocket>();
const states = new Map<WebSocket, ConnectionState>();
const activeMatches = new Set<string>();

function isOriginAllowed(origin: string | undefined): boolean {
  if (origin === undefined) return ALLOW_NO_ORIGIN;
  return allowedOrigins.has(origin);
}

function requestUsesSecureTransport(
  request: IncomingMessage,
): boolean {
  if (TLS_KEY_PATH !== undefined) return true;
  if (!TLS_AT_PROXY) return false;
  const forwarded =
    request.headers["x-forwarded-proto"];
  const value = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded;
  return (
    typeof value === "string" &&
    value
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .includes("https")
  );
}

function rejectUpgrade(
  socket: import("node:stream").Duplex,
  status: number,
  message: string,
): void {
  const body = message + "\n";
  socket.write(
    "HTTP/1.1 " +
      String(status) +
      " " +
      message +
      "\r\n" +
      "Connection: close\r\n" +
      "Content-Type: text/plain; charset=utf-8\r\n" +
      "Content-Length: " +
      String(Buffer.byteLength(body)) +
      "\r\n\r\n" +
      body,
  );
  socket.destroy();
}

function createHttpListener(): HttpServer {
  const requestHandler = (
    request: IncomingMessage,
    response: import("node:http").ServerResponse,
  ): void => {
    if (request.url === "/healthz") {
      response.writeHead(200, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      response.end(
        JSON.stringify({
          ok: true,
          service: "space-typing-duel",
          protocolVersion: DUEL_PROTOCOL_VERSION,
        }),
      );
      return;
    }
    response.writeHead(404, {
      "content-type": "text/plain; charset=utf-8",
    });
    response.end("Not found\n");
  };

  if (
    TLS_KEY_PATH !== undefined &&
    TLS_CERT_PATH !== undefined
  ) {
    return createHttpsServer(
      {
        key: readFileSync(TLS_KEY_PATH),
        cert: readFileSync(TLS_CERT_PATH),
        minVersion: "TLSv1.2",
      },
      requestHandler,
    );
  }
  return createHttpServer(requestHandler);
}

const httpServer = createHttpListener();
const wss = new WebSocketServer({
  noServer: true,
  maxPayload: DUEL_PROTOCOL_MAX_MESSAGE_BYTES,
  perMessageDeflate: false,
  clientTracking: false,
});

function send(
  socket: WebSocket,
  message: DuelServerMessage,
): void {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(message));
}

function sendError(
  socket: WebSocket,
  result: Extract<
    DuelAuthorityResult<unknown>,
    { ok: false }
  >,
  requestId?: string,
): void {
  send(socket, {
    type: "ERROR",
    code: result.code,
    message: result.message,
    ...(requestId === undefined
      ? {}
      : { requestId }),
  });
}

function socketForSession(
  sessionId: string,
): WebSocket | null {
  const socket = socketsBySession.get(sessionId);
  return socket?.readyState === WebSocket.OPEN
    ? socket
    : null;
}

function broadcastRoom(roomId: string): void {
  for (const sessionId of authority.roomSessionIds(roomId)) {
    const snapshot =
      authority.roomSnapshot(sessionId, roomId);
    if (!snapshot.ok) continue;
    const socket = socketForSession(sessionId);
    if (socket === null) continue;
    send(socket, {
      type: "ROOM_SNAPSHOT",
      room: snapshot.value,
    });
  }
}

function sendMatchUpdate(
  update: DuelClientMatchUpdate,
): void {
  const socket = socketForSession(update.sessionId);
  if (socket === null) return;
  send(socket, {
    type: "MATCH_UPDATE",
    matchId: update.view.matchId,
    roundId: update.view.roundId,
    serverSequence: update.serverSequence,
    events: update.events,
    snapshot: update.view,
  });
}

function sendUpdates(
  updates: readonly DuelClientMatchUpdate[],
): void {
  for (const update of updates) {
    sendMatchUpdate(update);
  }
}

function closeDuplicateSession(
  sessionId: string,
  keep: WebSocket,
): void {
  const previous = socketsBySession.get(sessionId);
  if (
    previous !== undefined &&
    previous !== keep &&
    previous.readyState === WebSocket.OPEN
  ) {
    previous.close(
      4001,
      "Session reconnected from another socket.",
    );
  }
  socketsBySession.set(sessionId, keep);
}

function handleHello(
  socket: WebSocket,
  state: ConnectionState,
  message: Extract<DuelClientMessage, { type: "HELLO" }>,
): void {
  const opened = authority.openSession({
    protocolVersion: message.protocolVersion,
    sessionToken: message.sessionToken,
    reconnectToken: message.reconnectToken,
    now: Date.now(),
  });
  if (!opened.ok) {
    sendError(socket, opened);
    socket.close(4003, opened.code);
    return;
  }

  state.authenticated = true;
  state.sessionId = opened.value.sessionId;
  state.lastPongAt = Date.now();
  clearTimeout(state.helloTimer);
  closeDuplicateSession(
    opened.value.sessionId,
    socket,
  );

  send(socket, {
    type: "WELCOME",
    protocolVersion: DUEL_PROTOCOL_VERSION,
    sessionId: opened.value.sessionId,
    reconnectToken: opened.value.reconnectToken,
  });

  if (!opened.value.reconnected) return;
  const bindings = authority.sessionBindings(
    opened.value.sessionId,
  );
  if (bindings?.roomId !== null && bindings?.roomId !== undefined) {
    const room = authority.roomSnapshot(
      opened.value.sessionId,
      bindings.roomId,
    );
    if (room.ok) {
      send(socket, {
        type: "ROOM_SNAPSHOT",
        room: room.value,
      });
    }
  }
  if (
    bindings?.matchId !== null &&
    bindings?.matchId !== undefined
  ) {
    const view = authority.clientMatchView(
      opened.value.sessionId,
      bindings.matchId,
    );
    if (view.ok) {
      send(socket, {
        type: "MATCH_UPDATE",
        matchId: view.value.matchId,
        roundId: view.value.roundId,
        serverSequence: view.value.serverSequence,
        events: [],
        snapshot: view.value,
      });
      if (view.value.series.status === "active") {
        activeMatches.add(view.value.matchId);
      }
    }
  }
}

function roomMutation<T>(
  socket: WebSocket,
  roomId: string,
  requestId: string,
  result: DuelAuthorityResult<T>,
): boolean {
  if (!result.ok) {
    sendError(socket, result, requestId);
    return false;
  }
  broadcastRoom(roomId);
  return true;
}

function handleAuthenticatedMessage(
  socket: WebSocket,
  state: ConnectionState,
  message: DuelClientMessage,
): void {
  const sessionId = state.sessionId;
  if (sessionId === null) return;
  const now = Date.now();

  if (message.type === "PONG") {
    authority.heartbeat(sessionId, now);
    state.lastPongAt = now;
    return;
  }

  if (message.type !== "INTENT") {
    const rate = authority.acceptMessage(
      sessionId,
      now,
      false,
    );
    if (!rate.ok) {
      sendError(socket, rate);
      return;
    }
  }

  switch (message.type) {
    case "HELLO":
      send(socket, {
        type: "ERROR",
        code: "ALREADY_AUTHENTICATED",
        message: "HELLO is only valid once per socket.",
      });
      return;

    case "CREATE_ROOM": {
      const result = authority.createRoom(
        sessionId,
        message.room,
        now,
      );
      if (!result.ok) {
        sendError(socket, result, message.requestId);
        return;
      }
      send(socket, {
        type: "ROOM_SNAPSHOT",
        room: result.value,
      });
      return;
    }

    case "JOIN_ROOM": {
      const result = authority.joinRoom(
        sessionId,
        {
          roomId: message.roomId,
          password: message.password,
          displayName: message.displayName,
        },
        now,
      );
      roomMutation(
        socket,
        message.roomId,
        message.requestId,
        result,
      );
      return;
    }

    case "LEAVE_ROOM": {
      const recipients = [
        ...authority.roomSessionIds(message.roomId),
      ];
      const result = authority.leaveRoom(
        sessionId,
        message.roomId,
        now,
      );
      if (!result.ok) {
        sendError(socket, result, message.requestId);
        return;
      }

      for (const recipientId of recipients) {
        const recipient = socketForSession(recipientId);
        if (recipient === null) continue;
        const snapshot = authority.roomSnapshot(
          recipientId,
          message.roomId,
        );
        if (snapshot.ok) {
          send(recipient, {
            type: "ROOM_SNAPSHOT",
            room: snapshot.value,
          });
        } else {
          send(recipient, {
            type: "ROOM_CLOSED",
            roomId: message.roomId,
            reason:
              recipientId === sessionId
                ? "You left the room."
                : "The room was closed.",
          });
        }
      }
      return;
    }

    case "SET_READY":
      roomMutation(
        socket,
        message.roomId,
        message.requestId,
        authority.setReady(
          sessionId,
          message.roomId,
          message.ready,
          now,
        ),
      );
      return;

    case "SET_LOADOUT":
      roomMutation(
        socket,
        message.roomId,
        message.requestId,
        authority.setLoadout(
          sessionId,
          message.roomId,
          {
            shipId: message.shipId,
            characterId: message.characterId,
          },
          now,
        ),
      );
      return;

    case "SET_BOT":
      roomMutation(
        socket,
        message.roomId,
        message.requestId,
        authority.setBot(
          sessionId,
          message.roomId,
          message.bot,
          now,
        ),
      );
      return;

    case "REMOVE_BOT":
      roomMutation(
        socket,
        message.roomId,
        message.requestId,
        authority.removeBot(
          sessionId,
          message.roomId,
          now,
        ),
      );
      return;

    case "START_MATCH": {
      const result = authority.startMatch(
        sessionId,
        message.roomId,
        now,
      );
      if (!result.ok) {
        sendError(socket, result, message.requestId);
        return;
      }
      activeMatches.add(result.value.matchId);
      sendUpdates(result.value.updates);
      return;
    }

    case "INTENT": {
      const result = authority.submitIntent(
        sessionId,
        {
          matchId: message.matchId,
          roundId: message.roundId,
          sequence: message.sequence,
          intent: message.intent,
          now,
        },
      );
      if (!result.ok) {
        sendError(socket, result);
      }
      return;
    }

  }
}

function handleRawMessage(
  socket: WebSocket,
  data: RawData,
  isBinary: boolean,
): void {
  const state = states.get(socket);
  if (state === undefined) return;
  if (isBinary) {
    send(socket, {
      type: "ERROR",
      code: "TEXT_ONLY",
      message: "Duel protocol accepts text JSON only.",
    });
    socket.close(1003, "Text JSON required.");
    return;
  }

  const parsed = parseDuelClientMessage(data.toString());
  if (!parsed.ok) {
    send(socket, {
      type: "ERROR",
      code: "BAD_MESSAGE",
      message: parsed.error,
    });
    return;
  }

  if (!state.authenticated) {
    if (parsed.message.type !== "HELLO") {
      send(socket, {
        type: "ERROR",
        code: "HELLO_REQUIRED",
        message: "HELLO must be the first Duel message.",
      });
      socket.close(4003, "HELLO required.");
      return;
    }
    handleHello(socket, state, parsed.message);
    return;
  }

  handleAuthenticatedMessage(
    socket,
    state,
    parsed.message,
  );
}

wss.on("connection", (socket) => {
  const helloTimer = setTimeout(() => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.close(4003, "HELLO timeout.");
    }
  }, HELLO_TIMEOUT_MS);

  const state: ConnectionState = {
    sessionId: null,
    authenticated: false,
    lastPongAt: Date.now(),
    helloTimer,
  };
  states.set(socket, state);

  socket.on("message", (data, isBinary) => {
    handleRawMessage(socket, data, isBinary);
  });

  socket.on("pong", () => {
    const current = states.get(socket);
    if (current === undefined) return;
    current.lastPongAt = Date.now();
    if (current.sessionId !== null) {
      authority.heartbeat(
        current.sessionId,
        current.lastPongAt,
      );
    }
  });

  socket.on("close", () => {
    clearTimeout(helloTimer);
    const current = states.get(socket);
    states.delete(socket);
    if (current?.sessionId === null || current === undefined) {
      return;
    }
    if (
      socketsBySession.get(current.sessionId) === socket
    ) {
      socketsBySession.delete(current.sessionId);
      authority.disconnect(
        current.sessionId,
        Date.now(),
      );
    }
  });

  socket.on("error", () => {
    // Close handler owns session cleanup.
  });
});

httpServer.on("upgrade", (request, socket, head) => {
  let path: string;
  try {
    path = new URL(
      request.url ?? "/",
      "http://localhost",
    ).pathname;
  } catch {
    rejectUpgrade(socket, 400, "Bad Request");
    return;
  }

  if (path !== WS_PATH) {
    rejectUpgrade(socket, 404, "Not Found");
    return;
  }
  if (!isOriginAllowed(request.headers.origin)) {
    rejectUpgrade(socket, 403, "Forbidden");
    return;
  }
  if (
    NODE_ENV === "production" &&
    !requestUsesSecureTransport(request)
  ) {
    rejectUpgrade(socket, 426, "Upgrade Required");
    return;
  }

  wss.handleUpgrade(
    request,
    socket,
    head,
    (webSocket) => {
      wss.emit("connection", webSocket, request);
    },
  );
});

let lastLoopAt = performance.now();
let accumulatorMs = 0;

const tickTimer = setInterval(() => {
  const current = performance.now();
  accumulatorMs += Math.min(
    250,
    Math.max(0, current - lastLoopAt),
  );
  lastLoopAt = current;

  let guard = 0;
  while (accumulatorMs >= TICK_MS && guard < 5) {
    guard += 1;
    accumulatorMs -= TICK_MS;
    const now = Date.now();

    for (const matchId of [...activeMatches]) {
      const result = authority.tick(
        matchId,
        TICK_MS / 1000,
        now,
      );
      if (!result.ok) {
        activeMatches.delete(matchId);
        continue;
      }
      sendUpdates(result.value.updates);
      const active = result.value.updates.some(
        (update) =>
          update.view.series.status === "active",
      );
      if (!active) activeMatches.delete(matchId);
    }
  }
}, 25);

const heartbeatTimer = setInterval(() => {
  const now = Date.now();
  for (const [socket, state] of states) {
    if (
      now - state.lastPongAt >
      HEARTBEAT_TIMEOUT_MS
    ) {
      socket.terminate();
      continue;
    }
    if (socket.readyState === WebSocket.OPEN) {
      socket.ping();
      if (state.sessionId !== null) {
        send(socket, {
          type: "PING",
          nonce: String(now),
        });
      }
    }
  }
}, HEARTBEAT_INTERVAL_MS);

const cleanupTimer = setInterval(() => {
  authority.cleanup(Date.now());
}, 5000);

function shutdown(): void {
  clearInterval(tickTimer);
  clearInterval(heartbeatTimer);
  clearInterval(cleanupTimer);
  for (const socket of states.keys()) {
    socket.close(1001, "Server shutting down.");
  }
  wss.close();
  httpServer.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

httpServer.listen(PORT, HOST, () => {
  const scheme =
    TLS_KEY_PATH === undefined ? "ws" : "wss";
  process.stdout.write(
    "[duel] " +
      scheme +
      "://" +
      HOST +
      ":" +
      String(PORT) +
      WS_PATH +
      " · origins=" +
      String(allowedOrigins.size) +
      "\n",
  );
});
