import { DUEL_ACTIONS } from "./actions";
import {
  DuelBot,
  duelBotObservation,
  type DuelBotConfig,
} from "./bots";
import { DuelOfferDraft } from "./draft";
import {
  DuelEngine,
  type DuelEngineEvent,
  type DuelEngineSnapshot,
} from "./engine";
import {
  duelMapProfile,
  type DuelMapId,
} from "./maps";
import type {
  DuelActionCategory,
  DuelActionOffer,
  DuelPlayerId,
} from "./model";
import {
  DUEL_PROTOCOL_VERSION,
  toEngineIntent,
  type DuelWireIntent,
} from "./protocol";
import {
  DuelRoom,
  validateDuelRoomSettings,
  type DuelRoomBotConfig,
  type DuelRoomMapSelection,
  type DuelRoomPublicSettings,
  type DuelRoomSettingsInput,
} from "./room";

const ALL_CATEGORIES: readonly DuelActionCategory[] = [
  "attack",
  "defense",
  "support",
  "tactical",
  "fate",
  "mystery",
];

const MAP_IDS: readonly DuelMapId[] = [
  "frost-wastes",
  "inferno-rift",
  "tempest-prime",
  "ocean-abyss",
  "terra-core",
  "celestial-void",
];

const ROOM_SETTING_KEYS = [
  "roomName",
  "visibility",
  "password",
  "matchLengthSeconds",
  "roundFormat",
  "mapSelection",
  "hazardLevel",
  "mysteryFrequency",
  "fateFrequency",
  "botAllowed",
  "seedMode",
  "fixedSeed",
  "modifier",
] as const;

export type DuelAuthenticatedIdentity = {
  accountId: string;
  displayName: string;
};

export type DuelAuthorityDependencies = {
  authenticate(sessionToken: string): DuelAuthenticatedIdentity | null;
  token(): string;
  roomId(): string;
  matchId(): string;
  seed(): number;
};

export type DuelAuthorityConfig = {
  roomTtlMs: number;
  reconnectGraceMs: number;
  heartbeatTimeoutMs: number;
  maxMessagesPerSecond: number;
  maxTypeCharsPerSecond: number;
};

export const DEFAULT_DUEL_AUTHORITY_CONFIG: DuelAuthorityConfig = {
  roomTtlMs: 30 * 60_000,
  reconnectGraceMs: 30_000,
  heartbeatTimeoutMs: 20_000,
  maxMessagesPerSecond: 120,
  maxTypeCharsPerSecond: 40,
};

export type DuelAuthorityErrorCode =
  | "AUTH_FAILED"
  | "PROTOCOL_MISMATCH"
  | "RECONNECT_EXPIRED"
  | "SESSION_NOT_FOUND"
  | "RATE_LIMITED"
  | "ROOM_INVALID"
  | "ROOM_NOT_FOUND"
  | "ROOM_FORBIDDEN"
  | "ROOM_FULL_OR_PASSWORD"
  | "ROOM_NOT_READY"
  | "MATCH_NOT_FOUND"
  | "MATCH_FORBIDDEN"
  | "ROUND_MISMATCH"
  | "STALE_SEQUENCE"
  | "INPUT_RATE_IMPOSSIBLE";

export type DuelAuthorityResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      code: DuelAuthorityErrorCode;
      message: string;
    };

export type DuelSessionWelcome = {
  sessionId: string;
  reconnectToken: string;
  displayName: string;
  reconnected: boolean;
};

export type DuelClientRoomSlot = {
  slotIndex: 0 | 1;
  kind: "empty" | "human" | "bot";
  displayName: string;
  ready: boolean;
  shipId: string | null;
  characterId: string | null;
  bot: DuelRoomBotConfig | null;
};

export type DuelClientRoomSnapshot = {
  roomId: string;
  ownerSlotIndex: 0;
  selfSlotIndex: 0 | 1 | null;
  isOwner: boolean;
  settings: DuelRoomPublicSettings;
  slots: readonly [DuelClientRoomSlot, DuelClientRoomSlot];
  canStart: boolean;
};

export type DuelSeriesState = {
  format: 1 | 3 | 5;
  winsNeeded: number;
  roundsPlayed: number;
  maxRounds: number;
  wins: Readonly<Record<DuelPlayerId, number>>;
  draws: number;
  status: "active" | "won" | "draw";
  winnerId: DuelPlayerId | null;
};

export type DuelClientMatchView = {
  matchId: string;
  roundId: string;
  serverSequence: number;
  phase: DuelEngineSnapshot["phase"];
  round: DuelEngineSnapshot["round"];
  series: DuelSeriesState;
  map: DuelEngineSnapshot["map"];
  self: {
    playerId: DuelPlayerId;
    hull: number;
    maxHull: number;
    shield: number;
    maxShield: number;
    energy: number;
    maxEnergy: number;
    correctChars: number;
    wrongChars: number;
    lastAcceptedSequence: number;
    targetInstanceId: string | null;
    acquisitionPrefix: string;
    offers: readonly DuelActionOffer[];
    inventory: DuelEngineSnapshot["inventories"][DuelPlayerId];
    incomingThreats:
      DuelEngineSnapshot["incomingThreats"][DuelPlayerId];
    initiative: number;
    strategyPath: string;
    readyCombos: readonly {
      id: string;
      createdAtTick: number;
    }[];
    ownPity: number;
  };
  opponent: {
    hull: number;
    maxHull: number;
    shield: number;
    maxShield: number;
    energy: number;
    maxEnergy: number;
    initiative: number;
    strategyPath: string;
  };
  shared: {
    tactical: DuelEngineSnapshot["tactical"];
    mysteries: DuelEngineSnapshot["chance"]["mysteries"];
    neutralObjective: DuelEngineSnapshot["neutralObjective"];
    opponentTrapHints: readonly string[];
  };
};

export type DuelClientEvent =
  | DuelEngineEvent
  | {
      type: "opponent-trap-hint";
      publicHint: string;
    };

export type DuelClientMatchUpdate = {
  sessionId: string;
  playerId: DuelPlayerId;
  serverSequence: number;
  events: readonly DuelClientEvent[];
  view: DuelClientMatchView;
};

type AuthoritySession = {
  sessionId: string;
  accountId: string;
  displayName: string;
  reconnectToken: string;
  connected: boolean;
  disconnectedAt: number | null;
  lastHeartbeatAt: number;
  messageTimes: number[];
  typeCharTimes: number[];
  roomId: string | null;
  matchId: string | null;
};

type RoomRecord = {
  room: DuelRoom;
  settings: DuelRoomSettingsInput;
  ownerSessionId: string;
  lastActivityAt: number;
  matchId: string | null;
};

type MatchRecord = {
  matchId: string;
  roomId: string;
  roundId: string;
  roundSequence: number;
  engine: DuelEngine;
  draft: Record<DuelPlayerId, DuelOfferDraft>;
  players: Record<DuelPlayerId, string | null>;
  bot: DuelBot | null;
  botPlayerId: DuelPlayerId | null;
  matchSeed: number;
  mapId: DuelMapId;
  settings: DuelRoomSettingsInput;
  series: {
    format: 1 | 3 | 5;
    winsNeeded: number;
    roundsPlayed: number;
    maxRounds: number;
    wins: Record<DuelPlayerId, number>;
    draws: number;
    status: "active" | "won" | "draw";
    winnerId: DuelPlayerId | null;
  };
  serverSequence: number;
  needsRoundReset: boolean;
};

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
    ? (value as JsonObject)
    : null;
}

function exactKeys(
  object: JsonObject,
  allowed: readonly string[],
): boolean {
  const set = new Set(allowed);
  return Object.keys(object).every((key) => set.has(key));
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  return typeof value === "string" &&
    allowed.includes(value as T)
    ? (value as T)
    : null;
}

function parseMapSelection(
  value: unknown,
): DuelRoomMapSelection | null {
  const source = asObject(value);
  if (source === null) return null;
  if (!exactKeys(source, ["mode", "mapId", "pool"])) return null;

  if (source.mode === "fixed") {
    const mapId = oneOf(source.mapId, MAP_IDS);
    return mapId === null ? null : { mode: "fixed", mapId };
  }
  if (source.mode === "random" || source.mode === "vote") {
    if (!Array.isArray(source.pool)) return null;
    const pool: DuelMapId[] = [];
    for (const value of source.pool) {
      const mapId = oneOf(value, MAP_IDS);
      if (mapId === null) return null;
      pool.push(mapId);
    }
    return { mode: source.mode, pool };
  }
  return null;
}

export function parseDuelRoomSettingsPayload(
  value: unknown,
): DuelAuthorityResult<DuelRoomSettingsInput> {
  const source = asObject(value);
  if (
    source === null ||
    !exactKeys(source, ROOM_SETTING_KEYS)
  ) {
    return {
      ok: false,
      code: "ROOM_INVALID",
      message: "Room settings schema is invalid.",
    };
  }

  const mapSelection = parseMapSelection(source.mapSelection);
  const hazardLevel = oneOf(source.hazardLevel, [
    "low",
    "standard",
    "high",
  ] as const);
  const mysteryFrequency = oneOf(source.mysteryFrequency, [
    "off",
    "low",
    "standard",
    "high",
  ] as const);
  const fateFrequency = oneOf(source.fateFrequency, [
    "off",
    "low",
    "standard",
    "high",
  ] as const);
  const seedMode = oneOf(source.seedMode, [
    "random",
    "fixed",
  ] as const);
  const modifier = oneOf(source.modifier, [
    "standard",
    "high-hazard",
    "mystery-storm",
    "weapon-frenzy",
    "support-rich",
    "sudden-death",
    "cataclysm-rush",
  ] as const);

  if (
    typeof source.roomName !== "string" ||
    (source.visibility !== "public" &&
      source.visibility !== "private") ||
    (source.password !== undefined &&
      typeof source.password !== "string") ||
    ![180, 240, 300].includes(source.matchLengthSeconds as number) ||
    ![1, 3, 5].includes(source.roundFormat as number) ||
    mapSelection === null ||
    hazardLevel === null ||
    mysteryFrequency === null ||
    fateFrequency === null ||
    typeof source.botAllowed !== "boolean" ||
    seedMode === null ||
    modifier === null ||
    (source.fixedSeed !== undefined &&
      typeof source.fixedSeed !== "number")
  ) {
    return {
      ok: false,
      code: "ROOM_INVALID",
      message: "Room settings schema is invalid.",
    };
  }

  const candidate: DuelRoomSettingsInput = {
    roomName: source.roomName,
    visibility: source.visibility,
    ...(typeof source.password === "string"
      ? { password: source.password }
      : {}),
    matchLengthSeconds:
      source.matchLengthSeconds as 180 | 240 | 300,
    roundFormat: source.roundFormat as 1 | 3 | 5,
    mapSelection,
    hazardLevel,
    mysteryFrequency,
    fateFrequency,
    botAllowed: source.botAllowed,
    seedMode,
    ...(typeof source.fixedSeed === "number"
      ? { fixedSeed: source.fixedSeed }
      : {}),
    modifier,
  };
  const validation = validateDuelRoomSettings(candidate);
  if (!validation.ok) {
    return {
      ok: false,
      code: "ROOM_INVALID",
      message: validation.errors.join(" "),
    };
  }
  return { ok: true, value: validation.settings };
}

function clientRoomSnapshot(
  room: DuelRoom,
  viewerSessionId: string,
): DuelClientRoomSnapshot {
  const snapshot = room.snapshot();
  const slot = (
    index: 0 | 1,
  ): DuelClientRoomSlot => {
    const source = snapshot.slots[index];
    return {
      slotIndex: index,
      kind: source.kind,
      displayName: source.displayName,
      ready: source.ready,
      shipId: source.shipId,
      characterId: source.characterId,
      bot:
        source.bot === null ? null : { ...source.bot },
    };
  };

  const selfSlot = snapshot.slots.find(
    (candidate) =>
      candidate.participantId === viewerSessionId,
  );
  return {
    roomId: snapshot.roomId,
    ownerSlotIndex: 0,
    selfSlotIndex: selfSlot?.slotIndex ?? null,
    isOwner:
      snapshot.ownerParticipantId === viewerSessionId,
    settings: snapshot.settings,
    slots: [slot(0), slot(1)],
    canStart: snapshot.canStart,
  };
}

function deriveSeed(base: number, suffix: number): number {
  let value =
    (base ^ Math.imul(suffix + 1, 0x9e3779b1)) >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

function isPrivatePlayerEvent(
  event: DuelEngineEvent,
): event is Extract<
  DuelEngineEvent,
  {
    playerId: DuelPlayerId;
  }
> {
  return "playerId" in event;
}

export function projectDuelEventsForPlayer(
  events: readonly DuelEngineEvent[],
  viewerId: DuelPlayerId,
): DuelClientEvent[] {
  const projected: DuelClientEvent[] = [];
  const privateTypes = new Set([
    "intent-rejected",
    "target-locked",
    "target-cancelled",
    "typing-miss",
    "action-blocked",
    "action-completed",
    "action-banked",
    "mystery-revealed",
    "combo-ready",
  ]);

  for (const event of events) {
    if (
      privateTypes.has(event.type) &&
      isPrivatePlayerEvent(event)
    ) {
      if (event.playerId === viewerId) projected.push(event);
      continue;
    }

    if (event.type === "trap-armed") {
      if (event.playerId === viewerId) {
        projected.push(event);
      } else {
        projected.push({
          type: "opponent-trap-hint",
          publicHint: event.publicHint,
        });
      }
      continue;
    }

    projected.push(event);
  }
  return projected;
}

export class DuelAuthorityService {
  private readonly config: DuelAuthorityConfig;
  private readonly sessions = new Map<
    string,
    AuthoritySession
  >();
  private readonly reconnectIndex = new Map<string, string>();
  private readonly rooms = new Map<string, RoomRecord>();
  private readonly matches = new Map<string, MatchRecord>();

  constructor(
    private readonly deps: DuelAuthorityDependencies,
    config: Partial<DuelAuthorityConfig> = {},
  ) {
    this.config = {
      ...DEFAULT_DUEL_AUTHORITY_CONFIG,
      ...config,
    };
  }

  openSession(input: {
    protocolVersion: number;
    sessionToken: string;
    reconnectToken?: string;
    now: number;
  }): DuelAuthorityResult<DuelSessionWelcome> {
    if (input.protocolVersion !== DUEL_PROTOCOL_VERSION) {
      return {
        ok: false,
        code: "PROTOCOL_MISMATCH",
        message: "Duel protocol version mismatch.",
      };
    }
    const identity = this.deps.authenticate(input.sessionToken);
    if (identity === null) {
      return {
        ok: false,
        code: "AUTH_FAILED",
        message: "Duel session authentication failed.",
      };
    }

    if (input.reconnectToken !== undefined) {
      const sessionId =
        this.reconnectIndex.get(input.reconnectToken);
      const session =
        sessionId === undefined
          ? undefined
          : this.sessions.get(sessionId);
      if (
        session === undefined ||
        session.accountId !== identity.accountId ||
        session.disconnectedAt === null ||
        input.now - session.disconnectedAt >
          this.config.reconnectGraceMs
      ) {
        return {
          ok: false,
          code: "RECONNECT_EXPIRED",
          message: "Reconnect identity is no longer valid.",
        };
      }
      session.connected = true;
      session.disconnectedAt = null;
      session.lastHeartbeatAt = input.now;
      session.displayName = identity.displayName;
      return {
        ok: true,
        value: {
          sessionId: session.sessionId,
          reconnectToken: session.reconnectToken,
          displayName: session.displayName,
          reconnected: true,
        },
      };
    }

    const sessionId = this.deps.token();
    const reconnectToken = this.deps.token();
    const session: AuthoritySession = {
      sessionId,
      accountId: identity.accountId,
      displayName: identity.displayName,
      reconnectToken,
      connected: true,
      disconnectedAt: null,
      lastHeartbeatAt: input.now,
      messageTimes: [],
      typeCharTimes: [],
      roomId: null,
      matchId: null,
    };
    this.sessions.set(sessionId, session);
    this.reconnectIndex.set(reconnectToken, sessionId);
    return {
      ok: true,
      value: {
        sessionId,
        reconnectToken,
        displayName: session.displayName,
        reconnected: false,
      },
    };
  }

  disconnect(sessionId: string, now: number): void {
    const session = this.sessions.get(sessionId);
    if (session === undefined) return;
    session.connected = false;
    session.disconnectedAt = now;
  }

  heartbeat(sessionId: string, now: number): boolean {
    const session = this.sessions.get(sessionId);
    if (session === undefined) return false;
    session.lastHeartbeatAt = now;
    return true;
  }

  sessionBindings(
    sessionId: string,
  ): { roomId: string | null; matchId: string | null } | null {
    const session = this.sessions.get(sessionId);
    if (session === undefined) return null;
    return {
      roomId: session.roomId,
      matchId: session.matchId,
    };
  }

  roomSessionIds(roomId: string): readonly string[] {
    const record = this.rooms.get(roomId);
    if (record === undefined) return [];
    return record.room
      .snapshot()
      .slots
      .map((slot) => slot.participantId)
      .filter(
        (participantId): participantId is string =>
          participantId !== null &&
          !participantId.startsWith("bot:"),
      );
  }

  acceptMessage(
    sessionId: string,
    now: number,
  ): DuelAuthorityResult<true> {
    const session = this.sessions.get(sessionId);
    if (session === undefined) {
      return {
        ok: false,
        code: "SESSION_NOT_FOUND",
        message: "Duel session does not exist.",
      };
    }

    session.messageTimes = session.messageTimes.filter(
      (time) => now - time < 1000,
    );
    if (
      session.messageTimes.length >=
      this.config.maxMessagesPerSecond
    ) {
      return {
        ok: false,
        code: "RATE_LIMITED",
        message: "Duel message rate exceeded.",
      };
    }
    session.messageTimes.push(now);

    return { ok: true, value: true };
  }

  private acceptTypeChar(
    sessionId: string,
    now: number,
  ): DuelAuthorityResult<true> {
    const session = this.sessions.get(sessionId);
    if (session === undefined) {
      return {
        ok: false,
        code: "SESSION_NOT_FOUND",
        message: "Duel session does not exist.",
      };
    }
    session.typeCharTimes = session.typeCharTimes.filter(
      (time) => now - time < 1000,
    );
    if (
      session.typeCharTimes.length >=
      this.config.maxTypeCharsPerSecond
    ) {
      return {
        ok: false,
        code: "INPUT_RATE_IMPOSSIBLE",
        message:
          "Typing rate exceeded the competitive ceiling.",
      };
    }
    session.typeCharTimes.push(now);
    return { ok: true, value: true };
  }

  createRoom(
    sessionId: string,
    settingsPayload: unknown,
    now: number,
  ): DuelAuthorityResult<DuelClientRoomSnapshot> {
    const session = this.sessions.get(sessionId);
    if (session === undefined) {
      return this.error(
        "SESSION_NOT_FOUND",
        "Duel session does not exist.",
      );
    }
    const parsed = parseDuelRoomSettingsPayload(
      settingsPayload,
    );
    if (!parsed.ok) return parsed;

    if (session.roomId !== null) {
      const left = this.leaveRoom(
        sessionId,
        session.roomId,
        now,
      );
      if (!left.ok) return left;
    }

    const roomId = this.uniqueRoomId();
    const room = new DuelRoom({
      roomId,
      ownerParticipantId: sessionId,
      ownerDisplayName: session.displayName,
      settings: parsed.value,
    });
    this.rooms.set(roomId, {
      room,
      settings: parsed.value,
      ownerSessionId: sessionId,
      lastActivityAt: now,
      matchId: null,
    });
    session.roomId = roomId;
    return {
      ok: true,
      value: clientRoomSnapshot(room, sessionId),
    };
  }

  joinRoom(
    sessionId: string,
    input: {
      roomId: string;
      password?: string;
      displayName?: string;
    },
    now: number,
  ): DuelAuthorityResult<DuelClientRoomSnapshot> {
    const session = this.sessions.get(sessionId);
    const record = this.rooms.get(input.roomId);
    if (session === undefined) {
      return this.error(
        "SESSION_NOT_FOUND",
        "Duel session does not exist.",
      );
    }
    if (record === undefined) {
      return this.error(
        "ROOM_NOT_FOUND",
        "Duel room was not found.",
      );
    }

    if (
      session.roomId !== null &&
      session.roomId !== input.roomId
    ) {
      const left = this.leaveRoom(
        sessionId,
        session.roomId,
        now,
      );
      if (!left.ok) return left;
    }

    const duplicateAccount = record.room
      .snapshot()
      .slots.some((slot) => {
        if (slot.participantId === null) return false;
        const existing = this.sessions.get(slot.participantId);
        return (
          existing !== undefined &&
          existing.accountId === session.accountId &&
          existing.sessionId !== sessionId
        );
      });
    if (duplicateAccount) {
      return this.error(
        "ROOM_FORBIDDEN",
        "This account already occupies a room slot.",
      );
    }

    if (
      !record.room.join({
        participantId: sessionId,
        displayName: session.displayName,
        password: input.password,
      })
    ) {
      return this.error(
        "ROOM_FULL_OR_PASSWORD",
        "Room is full or the password is invalid.",
      );
    }

    session.roomId = input.roomId;
    record.lastActivityAt = now;
    return {
      ok: true,
      value: clientRoomSnapshot(record.room, sessionId),
    };
  }

  setReady(
    sessionId: string,
    roomId: string,
    ready: boolean,
    now: number,
  ): DuelAuthorityResult<DuelClientRoomSnapshot> {
    const record = this.rooms.get(roomId);
    if (record === undefined) {
      return this.error(
        "ROOM_NOT_FOUND",
        "Duel room was not found.",
      );
    }
    if (!record.room.setReady(sessionId, ready)) {
      return this.error(
        "ROOM_FORBIDDEN",
        "Session is not a human participant in this room.",
      );
    }
    record.lastActivityAt = now;
    return {
      ok: true,
      value: clientRoomSnapshot(record.room, sessionId),
    };
  }

  setLoadout(
    sessionId: string,
    roomId: string,
    input: {
      shipId: string | null;
      characterId: string | null;
    },
    now: number,
  ): DuelAuthorityResult<DuelClientRoomSnapshot> {
    const record = this.rooms.get(roomId);
    if (record === undefined) {
      return this.error(
        "ROOM_NOT_FOUND",
        "Duel room was not found.",
      );
    }
    if (!record.room.setLoadout(sessionId, input)) {
      return this.error(
        "ROOM_FORBIDDEN",
        "Session is not a participant in this room.",
      );
    }
    record.lastActivityAt = now;
    return {
      ok: true,
      value: clientRoomSnapshot(record.room, sessionId),
    };
  }

  setBot(
    sessionId: string,
    roomId: string,
    config: DuelRoomBotConfig,
    now: number,
  ): DuelAuthorityResult<DuelClientRoomSnapshot> {
    const record = this.rooms.get(roomId);
    if (record === undefined) {
      return this.error(
        "ROOM_NOT_FOUND",
        "Duel room was not found.",
      );
    }
    if (
      !record.room.setBot({
        requesterId: sessionId,
        config,
      })
    ) {
      return this.error(
        "ROOM_FORBIDDEN",
        "Bot cannot be added to this room.",
      );
    }
    record.lastActivityAt = now;
    return {
      ok: true,
      value: clientRoomSnapshot(record.room, sessionId),
    };
  }

  removeBot(
    sessionId: string,
    roomId: string,
    now: number,
  ): DuelAuthorityResult<DuelClientRoomSnapshot> {
    const record = this.rooms.get(roomId);
    if (record === undefined) {
      return this.error(
        "ROOM_NOT_FOUND",
        "Duel room was not found.",
      );
    }
    if (!record.room.removeSecondSlot(sessionId)) {
      return this.error(
        "ROOM_FORBIDDEN",
        "Only the room owner can remove the second slot.",
      );
    }
    record.lastActivityAt = now;
    return {
      ok: true,
      value: clientRoomSnapshot(record.room, sessionId),
    };
  }

  leaveRoom(
    sessionId: string,
    roomId: string,
    now: number,
  ): DuelAuthorityResult<true> {
    const session = this.sessions.get(sessionId);
    const record = this.rooms.get(roomId);
    if (session === undefined) {
      return this.error(
        "SESSION_NOT_FOUND",
        "Duel session does not exist.",
      );
    }
    if (record === undefined) {
      return this.error(
        "ROOM_NOT_FOUND",
        "Duel room was not found.",
      );
    }

    const result = record.room.leave(sessionId);
    if (result === "missing") {
      return this.error(
        "ROOM_FORBIDDEN",
        "Session is not in this room.",
      );
    }

    if (result === "owner") {
      this.deleteRoom(roomId);
    } else {
      session.roomId = null;
      session.matchId = null;
      record.lastActivityAt = now;
    }
    return { ok: true, value: true };
  }

  roomSnapshot(
    sessionId: string,
    roomId: string,
  ): DuelAuthorityResult<DuelClientRoomSnapshot> {
    const record = this.rooms.get(roomId);
    if (record === undefined) {
      return this.error(
        "ROOM_NOT_FOUND",
        "Duel room was not found.",
      );
    }
    if (!record.room.hasParticipant(sessionId)) {
      return this.error(
        "ROOM_FORBIDDEN",
        "Session is not in this room.",
      );
    }
    return {
      ok: true,
      value: clientRoomSnapshot(record.room, sessionId),
    };
  }

  startMatch(
    requesterSessionId: string,
    roomId: string,
    now: number,
  ): DuelAuthorityResult<{
    matchId: string;
    updates: readonly DuelClientMatchUpdate[];
  }> {
    const record = this.rooms.get(roomId);
    if (record === undefined) {
      return this.error(
        "ROOM_NOT_FOUND",
        "Duel room was not found.",
      );
    }
    if (record.ownerSessionId !== requesterSessionId) {
      return this.error(
        "ROOM_FORBIDDEN",
        "Only the room owner can start the match.",
      );
    }
    if (!record.room.canStart()) {
      return this.error(
        "ROOM_NOT_READY",
        "Both Duel slots must be occupied and ready.",
      );
    }

    const roomSnapshot = record.room.snapshot();
    const seed =
      record.settings.seedMode === "fixed"
        ? record.settings.fixedSeed ?? this.deps.seed()
        : this.deps.seed();
    const mapId = record.room.selectedMap(seed);
    const matchId = this.deps.matchId();
    const players: Record<DuelPlayerId, string | null> = {
      "player-1":
        roomSnapshot.slots[0].kind === "human"
          ? roomSnapshot.slots[0].participantId
          : null,
      "player-2":
        roomSnapshot.slots[1].kind === "human"
          ? roomSnapshot.slots[1].participantId
          : null,
    };
    const botPlayerId: DuelPlayerId | null =
      roomSnapshot.slots[1].kind === "bot"
        ? "player-2"
        : null;

    const match: MatchRecord = {
      matchId,
      roomId,
      roundId: matchId + ":round:1",
      roundSequence: 1,
      engine: new DuelEngine({
        regulationSeconds:
          record.settings.matchLengthSeconds,
        matchSeed: seed,
        mapId,
      }),
      draft: {
        "player-1": this.createDraft(seed, mapId, 1),
        "player-2": this.createDraft(seed, mapId, 2),
      },
      players,
      bot:
        botPlayerId === null ||
        roomSnapshot.slots[1].bot === null
          ? null
          : this.createBot(
              botPlayerId,
              roomSnapshot.slots[1].bot,
              seed,
            ),
      botPlayerId,
      matchSeed: seed,
      mapId,
      settings: record.settings,
      series: {
        format: record.settings.roundFormat,
        winsNeeded:
          Math.floor(record.settings.roundFormat / 2) + 1,
        roundsPlayed: 0,
        maxRounds: record.settings.roundFormat + 2,
        wins: {
          "player-1": 0,
          "player-2": 0,
        },
        draws: 0,
        status: "active",
        winnerId: null,
      },
      serverSequence: 0,
      needsRoundReset: false,
    };

    this.dealRoundOffers(match);
    this.matches.set(matchId, match);
    record.matchId = matchId;
    record.lastActivityAt = now;

    for (const playerId of [
      "player-1",
      "player-2",
    ] as const) {
      const playerSessionId = players[playerId];
      if (playerSessionId === null) continue;
      const session = this.sessions.get(playerSessionId);
      if (session !== undefined) {
        session.matchId = matchId;
      }
    }

    return {
      ok: true,
      value: {
        matchId,
        updates: this.updatesForMatch(match, []),
      },
    };
  }

  submitIntent(
    sessionId: string,
    input: {
      matchId: string;
      roundId: string;
      sequence: number;
      intent: DuelWireIntent;
      now: number;
    },
  ): DuelAuthorityResult<true> {
    const session = this.sessions.get(sessionId);
    const match = this.matches.get(input.matchId);
    if (session === undefined) {
      return this.error(
        "SESSION_NOT_FOUND",
        "Duel session does not exist.",
      );
    }
    if (match === undefined) {
      return this.error(
        "MATCH_NOT_FOUND",
        "Duel match does not exist.",
      );
    }

    const playerId = this.playerIdForSession(
      match,
      sessionId,
    );
    if (playerId === null) {
      return this.error(
        "MATCH_FORBIDDEN",
        "Session does not own a player in this match.",
      );
    }
    if (
      input.roundId !== match.roundId ||
      match.needsRoundReset
    ) {
      return this.error(
        "ROUND_MISMATCH",
        "Intent targets a stale or transitioning Duel round.",
      );
    }

    const rate = this.acceptMessage(
      sessionId,
      input.now,
    );
    if (!rate.ok) return rate;

    const accepted =
      match.engine.snapshot().players[playerId]
        .lastAcceptedSequence;
    if (input.sequence <= accepted) {
      return this.error(
        "STALE_SEQUENCE",
        "Intent sequence is stale or duplicated.",
      );
    }

    if (input.intent.type === "TYPE_CHAR") {
      const typingRate = this.acceptTypeChar(
        sessionId,
        input.now,
      );
      if (!typingRate.ok) return typingRate;
    }

    match.engine.enqueueIntent(
      toEngineIntent({
        playerId,
        sequence: input.sequence,
        intent: input.intent,
      }),
    );
    return { ok: true, value: true };
  }

  tick(
    matchId: string,
    dtSeconds: number,
    now: number,
  ): DuelAuthorityResult<{
    serverSequence: number;
    updates: readonly DuelClientMatchUpdate[];
  }> {
    const match = this.matches.get(matchId);
    if (match === undefined) {
      return this.error(
        "MATCH_NOT_FOUND",
        "Duel match does not exist.",
      );
    }
    if (match.series.status !== "active") {
      return {
        ok: true,
        value: {
          serverSequence: match.serverSequence,
          updates: this.updatesForMatch(match, []),
        },
      };
    }

    if (match.needsRoundReset) {
      this.beginNextRound(match);
      match.needsRoundReset = false;
    }

    this.enqueueBotIntents(match, dtSeconds);
    const events = match.engine.step(dtSeconds);
    this.refillCompletedOffers(match, events);
    match.serverSequence += 1;
    const room = this.rooms.get(match.roomId);
    if (room !== undefined) room.lastActivityAt = now;

    const ended = events.find(
      (event) => event.type === "round-ended",
    );
    if (ended?.type === "round-ended") {
      this.finishRound(match, ended.result);
    }

    return {
      ok: true,
      value: {
        serverSequence: match.serverSequence,
        updates: this.updatesForMatch(match, events),
      },
    };
  }

  clientMatchView(
    sessionId: string,
    matchId: string,
  ): DuelAuthorityResult<DuelClientMatchView> {
    const match = this.matches.get(matchId);
    if (match === undefined) {
      return this.error(
        "MATCH_NOT_FOUND",
        "Duel match does not exist.",
      );
    }
    const playerId = this.playerIdForSession(
      match,
      sessionId,
    );
    if (playerId === null) {
      return this.error(
        "MATCH_FORBIDDEN",
        "Session does not own a player in this match.",
      );
    }
    return {
      ok: true,
      value: this.viewForPlayer(match, playerId),
    };
  }

  cleanup(now: number): {
    expiredRooms: readonly string[];
    expiredSessions: readonly string[];
  } {
    const expiredRooms: string[] = [];
    for (const [roomId, record] of this.rooms) {
      if (
        now - record.lastActivityAt <=
        this.config.roomTtlMs
      ) {
        continue;
      }
      expiredRooms.push(roomId);
      this.deleteRoom(roomId);
    }

    const expiredSessions: string[] = [];
    for (const [sessionId, session] of [
      ...this.sessions.entries(),
    ]) {
      const disconnectedTooLong =
        session.disconnectedAt !== null &&
        now - session.disconnectedAt >
          this.config.reconnectGraceMs;
      const heartbeatStale =
        session.connected &&
        now - session.lastHeartbeatAt >
          this.config.heartbeatTimeoutMs;

      if (!disconnectedTooLong && !heartbeatStale) {
        continue;
      }

      expiredSessions.push(sessionId);
      if (session.roomId !== null) {
        const record = this.rooms.get(session.roomId);
        if (record !== undefined) {
          const result = record.room.leave(sessionId);
          if (result === "owner") {
            this.deleteRoom(session.roomId);
          }
        }
      }
      this.reconnectIndex.delete(session.reconnectToken);
      this.sessions.delete(sessionId);
    }

    return { expiredRooms, expiredSessions };
  }

  private createDraft(
    seed: number,
    mapId: DuelMapId,
    offset: number,
  ): DuelOfferDraft {
    return new DuelOfferDraft({
      seed: deriveSeed(seed, offset),
      actions: DUEL_ACTIONS,
      enabledCategories: ALL_CATEGORIES,
      categoryMultiplier:
        duelMapProfile(mapId).categoryMultiplier,
    });
  }

  private createBot(
    playerId: DuelPlayerId,
    config: DuelRoomBotConfig,
    seed: number,
  ): DuelBot {
    const botConfig: DuelBotConfig = {
      playerId,
      wpm: config.wpm,
      accuracy: config.accuracy,
      reactionMs: config.reactionMs,
      personality: config.personality,
      seed: deriveSeed(seed, 29),
    };
    return new DuelBot(botConfig);
  }

  private dealRoundOffers(match: MatchRecord): void {
    const phase = match.engine.phase();
    match.engine.setPrivateOffers(
      "player-1",
      match.draft["player-1"].dealPrivateOffers(
        "player-1",
        phase,
      ),
    );
    match.engine.setPrivateOffers(
      "player-2",
      match.draft["player-2"].dealPrivateOffers(
        "player-2",
        phase,
      ),
    );
  }

  private refillCompletedOffers(
    match: MatchRecord,
    events: readonly DuelEngineEvent[],
  ): void {
    const snapshot = match.engine.snapshot();

    for (const playerId of [
      "player-1",
      "player-2",
    ] as const) {
      const slots = new Set<number>();
      for (const event of events) {
        if (
          event.type !== "action-completed" ||
          event.playerId !== playerId
        ) {
          continue;
        }
        const offer =
          snapshot.players[playerId].offers.find(
            (candidate) =>
              candidate.instanceId ===
              event.targetInstanceId,
          );
        if (offer !== undefined) slots.add(offer.slotIndex);
      }
      if (slots.size === 0) continue;

      const nextOffers =
        snapshot.players[playerId].offers.map(
          (offer) => ({ ...offer }),
        );
      for (const slotIndex of slots) {
        const refill =
          match.draft[playerId].refillPrivateOffer(
            playerId,
            slotIndex,
            snapshot.phase,
            nextOffers.filter(
              (offer) =>
                offer.slotIndex !== slotIndex &&
                offer.status !== "completed",
            ),
          );
        if (refill === null) continue;
        const index = nextOffers.findIndex(
          (offer) => offer.slotIndex === slotIndex,
        );
        if (index >= 0) nextOffers[index] = refill;
        else nextOffers.push(refill);
      }
      match.engine.setPrivateOffers(
        playerId,
        nextOffers,
      );
    }
  }

  private enqueueBotIntents(
    match: MatchRecord,
    dtSeconds: number,
  ): void {
    if (
      match.bot === null ||
      match.botPlayerId === null
    ) {
      return;
    }
    const snapshot = match.engine.snapshot();
    const playerId = match.botPlayerId;
    const opponentId =
      playerId === "player-1"
        ? "player-2"
        : "player-1";
    const observation = duelBotObservation({
      phase: snapshot.phase,
      self: snapshot.players[playerId],
      opponent: snapshot.players[opponentId],
    });
    for (const intent of match.bot.update(
      dtSeconds,
      observation,
    )) {
      match.engine.enqueueIntent(intent);
    }
  }

  private finishRound(
    match: MatchRecord,
    result: DuelEngineSnapshot["round"],
  ): void {
    match.series.roundsPlayed += 1;
    if (result.status === "won") {
      match.series.wins[result.winnerId] += 1;
    } else if (result.status === "draw") {
      match.series.draws += 1;
    }

    const winner = ([
      "player-1",
      "player-2",
    ] as const).find(
      (playerId) =>
        match.series.wins[playerId] >=
        match.series.winsNeeded,
    );
    if (winner !== undefined) {
      match.series.status = "won";
      match.series.winnerId = winner;
      return;
    }

    if (
      match.series.roundsPlayed >=
      match.series.maxRounds
    ) {
      const left = match.series.wins["player-1"];
      const right = match.series.wins["player-2"];
      if (left === right) {
        match.series.status = "draw";
        match.series.winnerId = null;
      } else {
        match.series.status = "won";
        match.series.winnerId =
          left > right ? "player-1" : "player-2";
      }
      return;
    }

    match.needsRoundReset = true;
  }

  private beginNextRound(match: MatchRecord): void {
    match.roundSequence += 1;
    match.roundId =
      match.matchId +
      ":round:" +
      String(match.roundSequence);
    const roundSeed = deriveSeed(
      match.matchSeed,
      match.roundSequence,
    );
    match.engine = new DuelEngine({
      regulationSeconds:
        match.settings.matchLengthSeconds,
      matchSeed: roundSeed,
      mapId: match.mapId,
    });
    match.draft = {
      "player-1": this.createDraft(
        roundSeed,
        match.mapId,
        1,
      ),
      "player-2": this.createDraft(
        roundSeed,
        match.mapId,
        2,
      ),
    };

    const room = this.rooms.get(match.roomId);
    const botConfig =
      match.botPlayerId === "player-2"
        ? room?.room.snapshot().slots[1].bot
        : null;
    if (
      match.botPlayerId !== null &&
      botConfig !== null &&
      botConfig !== undefined
    ) {
      match.bot = this.createBot(
        match.botPlayerId,
        botConfig,
        roundSeed,
      );
    }
    this.dealRoundOffers(match);
  }

  private playerIdForSession(
    match: MatchRecord,
    sessionId: string,
  ): DuelPlayerId | null {
    if (match.players["player-1"] === sessionId) {
      return "player-1";
    }
    if (match.players["player-2"] === sessionId) {
      return "player-2";
    }
    return null;
  }

  private updatesForMatch(
    match: MatchRecord,
    events: readonly DuelEngineEvent[],
  ): DuelClientMatchUpdate[] {
    const updates: DuelClientMatchUpdate[] = [];
    for (const playerId of [
      "player-1",
      "player-2",
    ] as const) {
      const sessionId = match.players[playerId];
      if (sessionId === null) continue;
      updates.push({
        sessionId,
        playerId,
        serverSequence: match.serverSequence,
        events: projectDuelEventsForPlayer(
          events,
          playerId,
        ),
        view: this.viewForPlayer(match, playerId),
      });
    }
    return updates;
  }

  private viewForPlayer(
    match: MatchRecord,
    playerId: DuelPlayerId,
  ): DuelClientMatchView {
    const snapshot = match.engine.snapshot();
    const opponentId =
      playerId === "player-1"
        ? "player-2"
        : "player-1";
    const self = snapshot.players[playerId];
    const opponent = snapshot.players[opponentId];
    const selfStrategy = snapshot.strategy[playerId];
    const opponentStrategy =
      snapshot.strategy[opponentId];

    return {
      matchId: match.matchId,
      roundId: match.roundId,
      serverSequence: match.serverSequence,
      phase: snapshot.phase,
      round: snapshot.round,
      series: {
        format: match.series.format,
        winsNeeded: match.series.winsNeeded,
        roundsPlayed: match.series.roundsPlayed,
        maxRounds: match.series.maxRounds,
        wins: { ...match.series.wins },
        draws: match.series.draws,
        status: match.series.status,
        winnerId: match.series.winnerId,
      },
      map: snapshot.map,
      self: {
        playerId,
        hull: self.hull,
        maxHull: self.maxHull,
        shield: self.shield,
        maxShield: self.maxShield,
        energy: self.energy,
        maxEnergy: self.maxEnergy,
        correctChars: self.correctChars,
        wrongChars: self.wrongChars,
        lastAcceptedSequence: self.lastAcceptedSequence,
        targetInstanceId: self.targetInstanceId,
        acquisitionPrefix: self.acquisitionPrefix,
        offers: self.offers.map((offer) => ({
          ...offer,
        })),
        inventory: snapshot.inventories[playerId],
        incomingThreats:
          snapshot.incomingThreats[playerId],
        initiative: selfStrategy.initiative,
        strategyPath: selfStrategy.path,
        readyCombos:
          selfStrategy.readyCombos.map((combo) => ({
            id: combo.id,
            createdAtTick: combo.createdAtTick,
          })),
        ownPity: snapshot.chance.pity[playerId],
      },
      opponent: {
        hull: opponent.hull,
        maxHull: opponent.maxHull,
        shield: opponent.shield,
        maxShield: opponent.maxShield,
        energy: opponent.energy,
        maxEnergy: opponent.maxEnergy,
        initiative: opponentStrategy.initiative,
        strategyPath: opponentStrategy.path,
      },
      shared: {
        tactical: snapshot.tactical,
        mysteries: snapshot.chance.mysteries,
        neutralObjective: snapshot.neutralObjective,
        opponentTrapHints:
          snapshot.publicTrapHints[playerId],
      },
    };
  }

  private deleteRoom(roomId: string): void {
    const record = this.rooms.get(roomId);
    if (record === undefined) return;
    if (record.matchId !== null) {
      this.matches.delete(record.matchId);
    }
    this.rooms.delete(roomId);
    for (const session of this.sessions.values()) {
      if (session.roomId === roomId) {
        session.roomId = null;
        session.matchId = null;
      }
    }
  }

  private uniqueRoomId(): string {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const roomId = this.deps.roomId();
      if (!this.rooms.has(roomId)) return roomId;
    }
    throw new Error("Unable to allocate unique Duel room id.");
  }

  private error<T>(
    code: DuelAuthorityErrorCode,
    message: string,
  ): DuelAuthorityResult<T> {
    return { ok: false, code, message };
  }
}
