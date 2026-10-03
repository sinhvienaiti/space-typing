import type {
  DuelClientEvent,
  DuelClientMatchView,
  DuelClientRoomSnapshot,
} from "./authority";
import type { DuelRoomBotConfig, DuelRoomSettingsInput } from "./room";
import {
  DUEL_PROTOCOL_VERSION,
  type DuelClientMessage,
  type DuelWireIntent,
} from "./protocol";
import {
  duelOfferAnswerToken,
  matchingDuelOffers,
} from "./typing";
import { duelLiveActionMapForMap as duelActionMapForMap } from "./map-actions";
import { duelAutoActionBlock } from "./offer-availability";

export type DuelNetworkStatus =
  | "idle"
  | "connecting"
  | "authenticating"
  | "connected"
  | "reconnecting"
  | "closed";

export type DuelLocalPrediction = {
  roundId: string | null;
  targetInstanceId: string | null;
  acquisitionPrefix: string;
  pendingSequences: readonly number[];
};

export type DuelRankedQueueClientStatus = {
  status: "idle" | "queued";
  ticketId?: string;
  matchmakingRating?: number;
};

export type DuelRankedClientProfile = {
  typingRating: number;
  duelRating: number;
  matchmakingRating: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
};

export type DuelNetworkCallbacks = {
  onStatus?(status: DuelNetworkStatus): void;
  onRoomSnapshot?(room: DuelClientRoomSnapshot): void;
  onRoomClosed?(roomId: string, reason: string): void;
  onRankedQueueStatus?(
    status: DuelRankedQueueClientStatus,
  ): void;
  onRankedMatchFound?(matchId: string): void;
  onRankedProfile?(profile: DuelRankedClientProfile): void;
  onMatchUpdate?(
    view: DuelClientMatchView,
    events: readonly DuelClientEvent[],
  ): void;
  onPrediction?(prediction: DuelLocalPrediction): void;
  onError?(code: string, message: string): void;
};

export interface DuelSocketLike {
  readonly readyState: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent<string>) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export type DuelSocketFactory = (url: string) => DuelSocketLike;

export type DuelReconnectStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export type DuelNetworkClientConfig = {
  url: string;
  clientVersion: string;
  callbacks?: DuelNetworkCallbacks;
  socketFactory?: DuelSocketFactory;
  reconnectStorage?: DuelReconnectStorage;
  reconnectStorageKey?: string;
  autoReconnect?: boolean;
};

const SOCKET_OPEN = 1;
const RECONNECT_DELAYS_MS = [250, 500, 1000, 2000, 5000] as const;

function defaultSocketFactory(url: string): DuelSocketLike {
  return new WebSocket(url);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function clonePrediction(
  prediction: {
    roundId: string | null;
    targetInstanceId: string | null;
    acquisitionPrefix: string;
    pendingSequences: Set<number>;
  },
): DuelLocalPrediction {
  return {
    roundId: prediction.roundId,
    targetInstanceId: prediction.targetInstanceId,
    acquisitionPrefix: prediction.acquisitionPrefix,
    pendingSequences: [...prediction.pendingSequences].sort(
      (left, right) => left - right,
    ),
  };
}

export class DuelNetworkClient {
  private readonly url: string;
  private readonly clientVersion: string;
  private readonly callbacks: DuelNetworkCallbacks;
  private readonly socketFactory: DuelSocketFactory;
  private readonly reconnectStorage?: DuelReconnectStorage;
  private readonly reconnectStorageKey: string;
  private readonly autoReconnect: boolean;

  private socket: DuelSocketLike | null = null;
  private status: DuelNetworkStatus = "idle";
  private sessionToken: string | null = null;
  private reconnectToken: string | null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manualClose = false;
  private requestSequence = 0;
  private intentSequence = 0;
  private lastServerSequence = -1;
  private view: DuelClientMatchView | null = null;
  private prediction = {
    roundId: null as string | null,
    targetInstanceId: null as string | null,
    acquisitionPrefix: "",
    pendingSequences: new Set<number>(),
  };

  constructor(config: DuelNetworkClientConfig) {
    this.url = config.url;
    this.clientVersion = config.clientVersion;
    this.callbacks = config.callbacks ?? {};
    this.socketFactory =
      config.socketFactory ?? defaultSocketFactory;
    this.reconnectStorage = config.reconnectStorage;
    this.reconnectStorageKey =
      config.reconnectStorageKey ??
      "space-typing:duel-reconnect-token";
    this.autoReconnect = config.autoReconnect ?? true;
    this.reconnectToken =
      this.reconnectStorage?.getItem(
        this.reconnectStorageKey,
      ) ?? null;
  }

  connect(sessionToken: string): void {
    const token = sessionToken.trim();
    if (token.length === 0) {
      this.callbacks.onError?.(
        "AUTH_TOKEN_REQUIRED",
        "A Duel session token is required.",
      );
      return;
    }
    this.sessionToken = token;
    this.manualClose = false;
    this.openSocket(this.reconnectToken !== null);
  }

  close(): void {
    this.manualClose = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close(1000, "Client closed.");
    this.socket = null;
    this.setStatus("closed");
  }

  currentStatus(): DuelNetworkStatus {
    return this.status;
  }

  currentView(): DuelClientMatchView | null {
    return this.view;
  }

  currentPrediction(): DuelLocalPrediction {
    return clonePrediction(this.prediction);
  }

  createRoom(settings: DuelRoomSettingsInput): boolean {
    return this.sendMessage({
      type: "CREATE_ROOM",
      requestId: this.nextRequestId(),
      room: settings,
    });
  }

  joinRoom(input: {
    roomId: string;
    password?: string;
    displayName: string;
  }): boolean {
    return this.sendMessage({
      type: "JOIN_ROOM",
      requestId: this.nextRequestId(),
      roomId: input.roomId,
      displayName: input.displayName,
      ...(input.password === undefined
        ? {}
        : { password: input.password }),
    });
  }

  leaveRoom(roomId: string): boolean {
    return this.sendMessage({
      type: "LEAVE_ROOM",
      requestId: this.nextRequestId(),
      roomId,
    });
  }

  setReady(roomId: string, ready: boolean): boolean {
    return this.sendMessage({
      type: "SET_READY",
      requestId: this.nextRequestId(),
      roomId,
      ready,
    });
  }

  setLoadout(
    roomId: string,
    input: {
      shipId: string | null;
      characterId: string | null;
    },
  ): boolean {
    return this.sendMessage({
      type: "SET_LOADOUT",
      requestId: this.nextRequestId(),
      roomId,
      shipId: input.shipId,
      characterId: input.characterId,
    });
  }

  setBot(
    roomId: string,
    bot: DuelRoomBotConfig,
  ): boolean {
    return this.sendMessage({
      type: "SET_BOT",
      requestId: this.nextRequestId(),
      roomId,
      bot,
    });
  }

  removeBot(roomId: string): boolean {
    return this.sendMessage({
      type: "REMOVE_BOT",
      requestId: this.nextRequestId(),
      roomId,
    });
  }

  startMatch(roomId: string): boolean {
    return this.sendMessage({
      type: "START_MATCH",
      requestId: this.nextRequestId(),
      roomId,
    });
  }

  queueRanked(): boolean {
    return this.sendMessage({
      type: "QUEUE_RANKED",
      requestId: this.nextRequestId(),
    });
  }

  leaveRankedQueue(): boolean {
    return this.sendMessage({
      type: "LEAVE_RANKED_QUEUE",
      requestId: this.nextRequestId(),
    });
  }

  sendIntent(intent: DuelWireIntent): number | null {
    const view = this.view;
    if (
      view === null ||
      this.socket === null ||
      this.socket.readyState !== SOCKET_OPEN ||
      this.status !== "connected"
    ) {
      return null;
    }

    this.intentSequence = Math.max(
      this.intentSequence + 1,
      view.self.lastAcceptedSequence + 1,
    );
    const sequence = this.intentSequence;
    this.applyLocalPrediction(intent, sequence);
    const sent = this.sendMessage({
      type: "INTENT",
      matchId: view.matchId,
      roundId: view.roundId,
      sequence,
      intent,
    });
    return sent ? sequence : null;
  }

  private openSocket(reconnecting: boolean): void {
    if (
      this.socket !== null &&
      this.socket.readyState === SOCKET_OPEN
    ) {
      return;
    }

    this.setStatus(
      reconnecting ? "reconnecting" : "connecting",
    );
    const socket = this.socketFactory(this.url);
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.setStatus("authenticating");
      const reconnectToken =
        reconnecting ? this.reconnectToken : null;
      const sessionToken = this.sessionToken;
      if (sessionToken === null) {
        socket.close(4003, "Missing session token.");
        return;
      }
      socket.send(
        JSON.stringify({
          type: "HELLO",
          protocolVersion: DUEL_PROTOCOL_VERSION,
          clientVersion: this.clientVersion,
          sessionToken,
          ...(reconnectToken === null
            ? {}
            : { reconnectToken }),
        }),
      );
    };

    socket.onmessage = (event) => {
      if (this.socket !== socket) return;
      this.handleServerMessage(event.data);
    };

    socket.onerror = () => {
      if (this.socket !== socket) return;
      this.callbacks.onError?.(
        "SOCKET_ERROR",
        "Duel WebSocket transport error.",
      );
    };

    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      if (this.manualClose || !this.autoReconnect) {
        this.setStatus("closed");
        return;
      }
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (
      this.sessionToken === null ||
      this.reconnectTimer !== null
    ) {
      return;
    }
    const index = Math.min(
      this.reconnectAttempt,
      RECONNECT_DELAYS_MS.length - 1,
    );
    const delay = RECONNECT_DELAYS_MS[index]!;
    this.reconnectAttempt += 1;
    this.setStatus("reconnecting");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket(true);
    }, delay);
  }

  private handleServerMessage(raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.callbacks.onError?.(
        "BAD_SERVER_MESSAGE",
        "Duel server returned invalid JSON.",
      );
      return;
    }
    if (!isRecord(parsed) || typeof parsed.type !== "string") {
      return;
    }

    switch (parsed.type) {
      case "WELCOME": {
        if (
          typeof parsed.reconnectToken !== "string" ||
          typeof parsed.sessionId !== "string"
        ) {
          return;
        }
        this.reconnectToken = parsed.reconnectToken;
        this.reconnectStorage?.setItem(
          this.reconnectStorageKey,
          parsed.reconnectToken,
        );
        this.reconnectAttempt = 0;
        this.setStatus("connected");
        return;
      }

      case "ROOM_SNAPSHOT":
        if (isRecord(parsed.room)) {
          this.callbacks.onRoomSnapshot?.(
            parsed.room as unknown as DuelClientRoomSnapshot,
          );
        }
        return;

      case "ROOM_CLOSED":
        if (
          typeof parsed.roomId === "string" &&
          typeof parsed.reason === "string"
        ) {
          this.callbacks.onRoomClosed?.(
            parsed.roomId,
            parsed.reason,
          );
        }
        return;

      case "RANKED_QUEUE_STATUS": {
        if (
          (parsed.status !== "idle" &&
            parsed.status !== "queued") ||
          (parsed.ticketId !== undefined &&
            typeof parsed.ticketId !== "string") ||
          (parsed.matchmakingRating !== undefined &&
            typeof parsed.matchmakingRating !== "number")
        ) {
          return;
        }
        this.callbacks.onRankedQueueStatus?.({
          status: parsed.status,
          ...(typeof parsed.ticketId === "string"
            ? { ticketId: parsed.ticketId }
            : {}),
          ...(typeof parsed.matchmakingRating === "number"
            ? {
                matchmakingRating:
                  parsed.matchmakingRating,
              }
            : {}),
        });
        return;
      }

      case "RANKED_MATCH_FOUND":
        if (typeof parsed.matchId === "string") {
          this.callbacks.onRankedMatchFound?.(
            parsed.matchId,
          );
        }
        return;

      case "RANKED_PROFILE": {
        const keys = [
          "typingRating",
          "duelRating",
          "matchmakingRating",
          "matchesPlayed",
          "wins",
          "losses",
          "draws",
        ] as const;
        if (
          !keys.every(
            (key) =>
              typeof parsed[key] === "number" &&
              Number.isFinite(parsed[key] as number),
          )
        ) {
          return;
        }
        this.callbacks.onRankedProfile?.({
          typingRating: parsed.typingRating as number,
          duelRating: parsed.duelRating as number,
          matchmakingRating:
            parsed.matchmakingRating as number,
          matchesPlayed: parsed.matchesPlayed as number,
          wins: parsed.wins as number,
          losses: parsed.losses as number,
          draws: parsed.draws as number,
        });
        return;
      }

      case "MATCH_UPDATE": {
        if (
          !isRecord(parsed.snapshot) ||
          !Array.isArray(parsed.events) ||
          typeof parsed.serverSequence !== "number" ||
          !Number.isInteger(parsed.serverSequence)
        ) {
          return;
        }
        const nextView =
          parsed.snapshot as unknown as DuelClientMatchView;
        if (
          this.view?.matchId === nextView.matchId &&
          parsed.serverSequence < this.lastServerSequence
        ) {
          return;
        }
        this.lastServerSequence = parsed.serverSequence;
        this.reconcile(nextView);
        this.callbacks.onMatchUpdate?.(
          nextView,
          parsed.events as DuelClientEvent[],
        );
        return;
      }

      case "PING":
        if (typeof parsed.nonce === "string") {
          this.sendMessage({
            type: "PONG",
            nonce: parsed.nonce,
          });
        }
        return;

      case "ERROR":
        if (
          typeof parsed.code === "string" &&
          typeof parsed.message === "string"
        ) {
          if (
            parsed.code === "RECONNECT_EXPIRED" ||
            parsed.code === "AUTH_FAILED"
          ) {
            this.reconnectToken = null;
            this.reconnectStorage?.removeItem(
              this.reconnectStorageKey,
            );
          }
          if (
            parsed.code === "AUTH_FAILED" ||
            parsed.code === "PROTOCOL_MISMATCH"
          ) {
            this.manualClose = true;
          }
          this.callbacks.onError?.(
            parsed.code,
            parsed.message,
          );
        }
        return;
    }
  }

  private reconcile(view: DuelClientMatchView): void {
    const roundChanged =
      this.prediction.roundId !== null &&
      this.prediction.roundId !== view.roundId;
    this.view = view;
    if (roundChanged) {
      this.intentSequence = 0;
      this.prediction.pendingSequences.clear();
    }

    this.intentSequence = Math.max(
      this.intentSequence,
      view.self.lastAcceptedSequence,
    );
    for (const sequence of [
      ...this.prediction.pendingSequences,
    ]) {
      if (
        sequence <= view.self.lastAcceptedSequence ||
        roundChanged
      ) {
        this.prediction.pendingSequences.delete(sequence);
      }
    }

    this.prediction.roundId = view.roundId;
    this.prediction.targetInstanceId =
      view.self.targetInstanceId;
    this.prediction.acquisitionPrefix =
      view.self.acquisitionPrefix;
    this.emitPrediction();
  }

  private applyLocalPrediction(
    intent: DuelWireIntent,
    sequence: number,
  ): void {
    const view = this.view;
    if (view === null) return;

    this.prediction.pendingSequences.add(sequence);

    if (intent.type === "CANCEL_TARGET") {
      if (
        this.prediction.targetInstanceId ===
        intent.targetInstanceId
      ) {
        this.prediction.targetInstanceId = null;
        this.prediction.acquisitionPrefix = "";
      }
      this.emitPrediction();
      return;
    }

    if (intent.type === "SELECT_TARGET") {
      this.predictTarget(intent.targetInstanceId, view);
      this.emitPrediction();
      return;
    }

    if (intent.type !== "TYPE_CHAR") {
      this.emitPrediction();
      return;
    }

    if (
      this.prediction.targetInstanceId === null &&
      intent.targetInstanceId !== undefined
    ) {
      this.predictTarget(intent.targetInstanceId, view);
      if (this.prediction.targetInstanceId !== intent.targetInstanceId) {
        this.emitPrediction();
        return;
      }
    }

    const char = intent.char.toLocaleLowerCase("en-US");
    if (!/^[a-z]$/.test(char)) {
      this.emitPrediction();
      return;
    }

    if (this.prediction.targetInstanceId !== null) {
      const offer = view.self.offers.find(item => item.instanceId === this.prediction.targetInstanceId);
      if (offer && duelAutoActionBlock(duelActionMapForMap(view.map.id).get(offer.actionId), view.self.energy, view.self.cooldowns[offer.actionId])) {
        this.emitPrediction();
        return;
      }
      const token = this.targetToken(
        this.prediction.targetInstanceId,
        view,
      );
      const expected =
        token?.[this.prediction.acquisitionPrefix.length];
      if (expected === char) {
        this.prediction.acquisitionPrefix += char;
      }
      this.emitPrediction();
      return;
    }

    const nextPrefix =
      this.prediction.acquisitionPrefix + char;
    const matches = matchingDuelOffers(
      nextPrefix,
      view.self.offers.filter(offer => !duelAutoActionBlock(duelActionMapForMap(view.map.id).get(offer.actionId), view.self.energy, view.self.cooldowns[offer.actionId])),
      duelActionMapForMap(view.map.id),
    );
    if (matches.length > 0) {
      this.prediction.acquisitionPrefix = nextPrefix;
    }
    if (matches.length === 1) {
      this.prediction.targetInstanceId =
        matches[0]!.instanceId;
    }
    this.emitPrediction();
  }

  private predictTarget(
    targetInstanceId: string,
    view: DuelClientMatchView,
  ): void {
    const offer = view.self.offers.find(
      (candidate) =>
        candidate.instanceId === targetInstanceId,
    );
    if (offer !== undefined) {
      if (duelAutoActionBlock(duelActionMapForMap(view.map.id).get(offer.actionId), view.self.energy, view.self.cooldowns[offer.actionId])) return;
      this.prediction.targetInstanceId =
        targetInstanceId;
      this.prediction.acquisitionPrefix =
        offer.typedPrefix;
      return;
    }

    const threat = view.self.incomingThreats.find(
      (candidate) => candidate.id === targetInstanceId,
    );
    if (threat !== undefined) {
      this.prediction.targetInstanceId =
        targetInstanceId;
      this.prediction.acquisitionPrefix =
        threat.typedPrefix;
      return;
    }

    const objective = view.shared.neutralObjective;
    if (
      objective !== null &&
      objective.id === targetInstanceId &&
      objective.status === "active"
    ) {
      this.prediction.targetInstanceId =
        targetInstanceId;
      this.prediction.acquisitionPrefix =
        objective.progress[view.self.playerId];
    }
  }

  private targetToken(
    targetInstanceId: string,
    view: DuelClientMatchView,
  ): string | null {
    const offer = view.self.offers.find(
      (candidate) =>
        candidate.instanceId === targetInstanceId,
    );
    if (offer !== undefined) {
      return duelOfferAnswerToken(
        offer,
        duelActionMapForMap(view.map.id),
      );
    }

    const threat = view.self.incomingThreats.find(
      (candidate) => candidate.id === targetInstanceId,
    );
    if (threat !== undefined) return threat.answerToken;

    const objective = view.shared.neutralObjective;
    if (
      objective !== null &&
      objective.id === targetInstanceId
    ) {
      return objective.answerToken;
    }
    return null;
  }

  private sendMessage(
    message: DuelClientMessage,
  ): boolean {
    const socket = this.socket;
    if (
      socket === null ||
      socket.readyState !== SOCKET_OPEN
    ) {
      return false;
    }
    socket.send(JSON.stringify(message));
    return true;
  }

  private nextRequestId(): string {
    this.requestSequence += 1;
    return "req-" + String(this.requestSequence);
  }

  private setStatus(status: DuelNetworkStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.callbacks.onStatus?.(status);
  }

  private emitPrediction(): void {
    this.callbacks.onPrediction?.(
      clonePrediction(this.prediction),
    );
  }
}
