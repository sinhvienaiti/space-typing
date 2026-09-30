import {
  duelMapProfile,
  type DuelMapId,
} from "./maps";
import type { DuelBotPersonality } from "./bots";

export type DuelRoomVisibility = "public" | "private";
export type DuelRoundFormat = 1 | 3 | 5;
export type DuelMatchLengthSeconds = 180 | 240 | 300;
export type DuelHazardLevel = "low" | "standard" | "high";
export type DuelSpecialFrequency =
  | "off"
  | "low"
  | "standard"
  | "high";
export type DuelSeedMode = "random" | "fixed";
export type DuelRoomModifier =
  | "standard"
  | "high-hazard"
  | "mystery-storm"
  | "weapon-frenzy"
  | "support-rich"
  | "sudden-death"
  | "cataclysm-rush";

export type DuelRoomMapSelection =
  | {
      mode: "fixed";
      mapId: DuelMapId;
    }
  | {
      mode: "random";
      pool: readonly DuelMapId[];
    }
  | {
      mode: "vote";
      pool: readonly DuelMapId[];
    };

export type DuelRoomSettingsInput = {
  roomName: string;
  visibility: DuelRoomVisibility;
  password?: string;
  matchLengthSeconds: DuelMatchLengthSeconds;
  roundFormat: DuelRoundFormat;
  mapSelection: DuelRoomMapSelection;
  hazardLevel: DuelHazardLevel;
  mysteryFrequency: DuelSpecialFrequency;
  fateFrequency: DuelSpecialFrequency;
  botAllowed: boolean;
  seedMode: DuelSeedMode;
  fixedSeed?: number;
  modifier: DuelRoomModifier;
};

export type DuelRoomPublicSettings = Omit<
  DuelRoomSettingsInput,
  "password" | "fixedSeed"
> & {
  passwordRequired: boolean;
  fixedSeedConfigured: boolean;
  combatProfile: "normalized";
};

export type DuelRoomSlotKind = "empty" | "human" | "bot";

export type DuelRoomBotConfig = {
  wpm: number;
  accuracy: number;
  reactionMs: number;
  personality: DuelBotPersonality;
};

export type DuelRoomSlot = {
  slotIndex: 0 | 1;
  kind: DuelRoomSlotKind;
  participantId: string | null;
  displayName: string;
  ready: boolean;
  shipId: string | null;
  characterId: string | null;
  bot: DuelRoomBotConfig | null;
};

export type DuelRoomSnapshot = {
  roomId: string;
  ownerParticipantId: string;
  settings: DuelRoomPublicSettings;
  slots: readonly [DuelRoomSlot, DuelRoomSlot];
  canStart: boolean;
};

export type DuelRoomValidationResult =
  | {
      ok: true;
      settings: DuelRoomSettingsInput;
    }
  | {
      ok: false;
      errors: readonly string[];
    };

const DUEL_MAP_IDS: readonly DuelMapId[] = [
  "frost-wastes",
  "inferno-rift",
  "tempest-prime",
  "ocean-abyss",
  "terra-core",
  "celestial-void",
];

function isMapId(value: string): value is DuelMapId {
  return DUEL_MAP_IDS.includes(value as DuelMapId);
}

function cloneMapSelection(
  selection: DuelRoomMapSelection,
): DuelRoomMapSelection {
  if (selection.mode === "fixed") {
    return { mode: "fixed", mapId: selection.mapId };
  }
  return {
    mode: selection.mode,
    pool: [...selection.pool],
  };
}

function normalizeRoomName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizePassword(value: string | undefined): string {
  return value?.trim() ?? "";
}

function normalizeBotConfig(
  config: DuelRoomBotConfig,
): DuelRoomBotConfig {
  return {
    wpm: Math.max(
      10,
      Math.min(
        300,
        Number.isFinite(config.wpm) ? Math.round(config.wpm) : 60,
      ),
    ),
    accuracy: Math.max(
      0.5,
      Math.min(
        1,
        Number.isFinite(config.accuracy) ? config.accuracy : 0.95,
      ),
    ),
    reactionMs: Math.max(
      0,
      Math.min(
        3000,
        Number.isFinite(config.reactionMs)
          ? Math.round(config.reactionMs)
          : 250,
      ),
    ),
    personality: config.personality,
  };
}

function emptySlot(slotIndex: 0 | 1): DuelRoomSlot {
  return {
    slotIndex,
    kind: "empty",
    participantId: null,
    displayName: "Open slot",
    ready: false,
    shipId: null,
    characterId: null,
    bot: null,
  };
}

function cloneSlot(slot: DuelRoomSlot): DuelRoomSlot {
  return {
    ...slot,
    bot: slot.bot === null ? null : { ...slot.bot },
  };
}

function mapSelectionIsValid(
  selection: DuelRoomMapSelection,
): boolean {
  if (selection.mode === "fixed") {
    return isMapId(selection.mapId);
  }
  return (
    selection.pool.length > 0 &&
    selection.pool.length <= DUEL_MAP_IDS.length &&
    new Set(selection.pool).size === selection.pool.length &&
    selection.pool.every(isMapId)
  );
}

export function validateDuelRoomSettings(
  input: DuelRoomSettingsInput,
): DuelRoomValidationResult {
  const errors: string[] = [];
  const roomName = normalizeRoomName(input.roomName);
  const password = normalizePassword(input.password);

  if (roomName.length < 2 || roomName.length > 40) {
    errors.push("Room name must be 2-40 characters.");
  }
  if (
    input.visibility === "private" &&
    (password.length < 4 || password.length > 64)
  ) {
    errors.push(
      "Private room password must be 4-64 characters.",
    );
  }
  if (
    ![180, 240, 300].includes(input.matchLengthSeconds)
  ) {
    errors.push("Match length must be 3, 4 or 5 minutes.");
  }
  if (![1, 3, 5].includes(input.roundFormat)) {
    errors.push("Round format must be Bo1, Bo3 or Bo5.");
  }
  if (!mapSelectionIsValid(input.mapSelection)) {
    errors.push("Room map selection is invalid.");
  }
  if (
    input.seedMode === "fixed" &&
    (!Number.isFinite(input.fixedSeed) ||
      Math.floor(input.fixedSeed!) < 0 ||
      Math.floor(input.fixedSeed!) > 0xffff_ffff)
  ) {
    errors.push(
      "Fixed seed must be an unsigned 32-bit integer.",
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    settings: {
      ...input,
      roomName,
      password:
        input.visibility === "private" ? password : undefined,
      mapSelection: cloneMapSelection(input.mapSelection),
      fixedSeed:
        input.seedMode === "fixed"
          ? Math.floor(input.fixedSeed!)
          : undefined,
    },
  };
}

export class DuelRoom {
  private readonly ownerParticipantId: string;
  private readonly roomId: string;
  private password: string;
  private settings: DuelRoomSettingsInput;
  private readonly slots: [DuelRoomSlot, DuelRoomSlot];

  constructor(input: {
    roomId: string;
    ownerParticipantId: string;
    ownerDisplayName: string;
    settings: DuelRoomSettingsInput;
  }) {
    const validation = validateDuelRoomSettings(input.settings);
    if (!validation.ok) {
      throw new Error(validation.errors.join(" "));
    }
    const roomId = input.roomId.trim();
    const ownerParticipantId = input.ownerParticipantId.trim();
    if (roomId.length < 4 || roomId.length > 32) {
      throw new Error("Room id must be 4-32 characters.");
    }
    if (ownerParticipantId.length === 0) {
      throw new Error("Owner participant id is required.");
    }

    this.roomId = roomId;
    this.ownerParticipantId = ownerParticipantId;
    this.settings = validation.settings;
    this.password = normalizePassword(
      validation.settings.password,
    );
    this.slots = [
      {
        ...emptySlot(0),
        kind: "human",
        participantId: ownerParticipantId,
        displayName:
          input.ownerDisplayName.trim().slice(0, 32) || "Host",
      },
      emptySlot(1),
    ];
  }

  join(input: {
    participantId: string;
    displayName: string;
    password?: string;
  }): boolean {
    const participantId = input.participantId.trim();
    if (participantId.length === 0) return false;
    if (
      this.settings.visibility === "private" &&
      normalizePassword(input.password) !== this.password
    ) {
      return false;
    }
    if (
      this.slots.some(
        (slot) => slot.participantId === participantId,
      )
    ) {
      return true;
    }
    const open = this.slots.find((slot) => slot.kind === "empty");
    if (open === undefined) return false;

    open.kind = "human";
    open.participantId = participantId;
    open.displayName =
      input.displayName.trim().slice(0, 32) || "Player";
    open.ready = false;
    open.bot = null;
    return true;
  }

  setBot(input: {
    requesterId: string;
    config: DuelRoomBotConfig;
    displayName?: string;
  }): boolean {
    if (
      input.requesterId !== this.ownerParticipantId ||
      !this.settings.botAllowed
    ) {
      return false;
    }
    const slot = this.slots[1];
    if (
      slot.kind === "human" &&
      slot.participantId !== this.ownerParticipantId
    ) {
      return false;
    }
    slot.kind = "bot";
    slot.participantId = "bot:slot-2";
    slot.displayName =
      input.displayName?.trim().slice(0, 32) || "Duel Bot";
    slot.ready = true;
    slot.bot = normalizeBotConfig(input.config);
    return true;
  }

  removeSecondSlot(requesterId: string): boolean {
    if (requesterId !== this.ownerParticipantId) return false;
    this.slots[1] = emptySlot(1);
    return true;
  }

  hasParticipant(participantId: string): boolean {
    return this.slots.some(
      (slot) => slot.participantId === participantId,
    );
  }

  leave(participantId: string): "owner" | "guest" | "missing" {
    if (participantId === this.ownerParticipantId) return "owner";
    const slot = this.slots.find(
      (candidate) =>
        candidate.kind === "human" &&
        candidate.participantId === participantId,
    );
    if (slot === undefined) return "missing";
    this.slots[slot.slotIndex] = emptySlot(slot.slotIndex);
    return "guest";
  }

  setReady(
    participantId: string,
    ready: boolean,
  ): boolean {
    const slot = this.slots.find(
      (candidate) =>
        candidate.kind === "human" &&
        candidate.participantId === participantId,
    );
    if (slot === undefined) return false;
    slot.ready = ready;
    return true;
  }

  setLoadout(
    participantId: string,
    input: {
      shipId: string | null;
      characterId: string | null;
    },
  ): boolean {
    const slot = this.slots.find(
      (candidate) =>
        candidate.participantId === participantId,
    );
    if (slot === undefined) return false;
    slot.shipId = input.shipId?.trim() || null;
    slot.characterId = input.characterId?.trim() || null;
    return true;
  }

  updateSettings(
    requesterId: string,
    next: DuelRoomSettingsInput,
  ): DuelRoomValidationResult {
    const validation = validateDuelRoomSettings(next);
    if (!validation.ok) return validation;
    if (requesterId !== this.ownerParticipantId) {
      return {
        ok: false,
        errors: ["Only the room owner can change settings."],
      };
    }
    if (
      !validation.settings.botAllowed &&
      this.slots[1].kind === "bot"
    ) {
      return {
        ok: false,
        errors: [
          "Remove the bot before disabling bot participation.",
        ],
      };
    }
    this.settings = validation.settings;
    this.password = normalizePassword(
      validation.settings.password,
    );
    return validation;
  }

  canStart(): boolean {
    return this.slots.every(
      (slot) => slot.kind !== "empty" && slot.ready,
    );
  }

  selectedMap(seedRoll = 0): DuelMapId {
    const selection = this.settings.mapSelection;
    if (selection.mode === "fixed") return selection.mapId;
    const pool = selection.pool;
    const safe =
      Number.isFinite(seedRoll) && seedRoll >= 0
        ? Math.floor(seedRoll)
        : 0;
    return pool[safe % pool.length]!;
  }

  snapshot(): DuelRoomSnapshot {
    const publicSettings: DuelRoomPublicSettings = {
      roomName: this.settings.roomName,
      visibility: this.settings.visibility,
      matchLengthSeconds: this.settings.matchLengthSeconds,
      roundFormat: this.settings.roundFormat,
      mapSelection: cloneMapSelection(this.settings.mapSelection),
      hazardLevel: this.settings.hazardLevel,
      mysteryFrequency: this.settings.mysteryFrequency,
      fateFrequency: this.settings.fateFrequency,
      botAllowed: this.settings.botAllowed,
      seedMode: this.settings.seedMode,
      modifier: this.settings.modifier,
      passwordRequired:
        this.settings.visibility === "private" &&
        this.password.length > 0,
      fixedSeedConfigured:
        this.settings.seedMode === "fixed" &&
        this.settings.fixedSeed !== undefined,
      combatProfile: "normalized",
    };
    return {
      roomId: this.roomId,
      ownerParticipantId: this.ownerParticipantId,
      settings: publicSettings,
      slots: [
        cloneSlot(this.slots[0]),
        cloneSlot(this.slots[1]),
      ],
      canStart: this.canStart(),
    };
  }
}

export function defaultDuelRoomSettings(): DuelRoomSettingsInput {
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

export function createPracticeDuelRoom(input: {
  roomId: string;
  participantId: string;
  displayName: string;
  bot?: Partial<DuelRoomBotConfig>;
  mapId?: DuelMapId;
}): DuelRoom {
  const settings = defaultDuelRoomSettings();
  settings.roomName = "Practice Duel";
  settings.visibility = "private";
  settings.password = "local";
  settings.mapSelection = {
    mode: "fixed",
    mapId: input.mapId ?? "frost-wastes",
  };
  const room = new DuelRoom({
    roomId: input.roomId,
    ownerParticipantId: input.participantId,
    ownerDisplayName: input.displayName,
    settings,
  });
  room.setBot({
    requesterId: input.participantId,
    displayName: "Practice Bot",
    config: {
      wpm: input.bot?.wpm ?? 55,
      accuracy: input.bot?.accuracy ?? 0.94,
      reactionMs: input.bot?.reactionMs ?? 320,
      personality: input.bot?.personality ?? "balanced",
    },
  });
  room.setReady(input.participantId, true);
  return room;
}

export function validateDuelMapCatalog(): string[] {
  const errors: string[] = [];
  for (const id of DUEL_MAP_IDS) {
    const profile = duelMapProfile(id);
    if (profile.id !== id) {
      errors.push(id + ": map profile id mismatch.");
    }
  }
  return errors;
}
