import { createAccountState, isValidAccountState, type AccountState } from "./account-state";
import { UnsupportedExpansionV2ProfileVersionError } from "../expansion-v2/profile-store";
import {
  createDefaultCampaignProgress,
  loadCampaignProgress,
  sanitizeCampaignProgress,
  saveCampaignProgress,
} from "../campaign/progress";
import type { CampaignProgress } from "../campaign/types";
import {
  createCampaignExpansionState,
  sanitizeCampaignExpansionState,
  type CampaignExpansionState,
} from "../campaign/expansion-state";
import {
  createStarterCharacterState,
  sanitizeCharacterState,
  type CharacterState,
} from "../characters/state";
import {
  createStarterEquipmentState,
  migrateLegacyEquipmentState,
  migrateRarityEquipmentState,
  sanitizeEquipmentState,
  type EquipmentState,
} from "../equipment/loadout";
import {
  createEmptyInventory,
  sanitizeInventory,
  type Inventory,
} from "../items/inventory";
import {
  createStarterSupportSpellState,
  sanitizeSupportSpellState,
  type SupportSpellState,
} from "../skills/support-loadout";
import {
  createLuckPityState,
  sanitizeLuckPityState,
  type LuckPityState,
} from "../loot/pity";
import {
  createHiddenDiscoveryState,
  sanitizeHiddenDiscoveryState,
  type HiddenDiscoveryState,
} from "../discovery/hidden-content";
import { sanitizeCredits } from "../economy/credits";
import {
  createExpansionCurrencyState,
  sanitizeExpansionCurrencyState,
  type ExpansionCurrencyState,
} from "../economy/currencies";
import {
  createProgressionState,
  sanitizeProgressionState,
  type ProgressionState,
} from "../progression/missions";
import {
  createCheckpointSnapshot,
  sanitizeCheckpointSnapshot,
  type CheckpointSnapshot,
  type RunPersistentState,
} from "./checkpoint";
import {
  createShopState,
  sanitizeShopState,
  type ShopState,
} from "../shops/state";
import {
  createRouteState,
  sanitizeRouteState,
  type RouteState,
} from "../campaign/route";
import {
  createUpgradeState,
  sanitizeUpgradeState,
  type UpgradeState,
} from "../progression/upgrades";
import {
  createRelicState,
  sanitizeRelicState,
  type RelicState,
} from "../relics/state";
import {
  createCodexState,
  mergeCodexState,
  sanitizeCodexState,
  type CodexState,
} from "../codex/state";
import {
  createAscensionState,
  sanitizeAscensionState,
  type AscensionState,
} from "../progression/ascension";
import {
  resolveCrashRecovery,
  sanitizeCrashRecoverySnapshot,
  type CrashRecoverySnapshot,
} from "./crash-recovery";
import {
  sanitizeStageEntrySnapshot,
  type StageEntrySnapshot,
} from "./death-protection";
import {
  createDefaultHotbarState,
  createLegacyHotbarState,
  sanitizeHotbarState,
  type HotbarState,
} from "../hud/hotbar";

const DB_NAME = "space-typing";
const INDEXED_DB_VERSION = 1;
const STORE_NAME = "player";
const SAVE_KEY = "main";
const RECOVERY_SAVE_KEY = "spaceTypingPlayerSaveRecoveryV3";

export const PLAYER_SAVE_VERSION = 28;
export class CorruptAccountStateError extends Error {
  constructor() { super("Current save has missing or invalid account data. Restore a valid backup; no Warp was granted."); }
}
/** Stored canonical data must identify a supported schema; unknown records are not a new player. */
export function readCanonicalPlayerSave(value: unknown): PlayerSave {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !Number.isSafeInteger((value as { version?: unknown }).version)
  )
    throw new CorruptAccountStateError();
  return migratePlayerSave(value).save;
}
export function validateAccountAuxiliary(value: unknown): void {
  if (value === undefined) return;
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new CorruptAccountStateError();
  const aux = value as PlayerSave["auxiliary"];
  if (aux?.expansionV2 !== undefined) {
    const profile = aux.expansionV2 as { version?: unknown };
    if (typeof profile?.version === "number" && profile.version > 1)
      throw new UnsupportedExpansionV2ProfileVersionError(profile.version);
    if (
      !profile ||
      typeof profile !== "object" ||
      Array.isArray(profile) ||
      profile.version !== 1
    )
      throw new CorruptAccountStateError();
  }
  if (
    aux?.difficulty !== undefined &&
    (!aux.difficulty ||
      typeof aux.difficulty !== "object" ||
      Array.isArray(aux.difficulty))
  )
    throw new CorruptAccountStateError();
}
class MissingCanonicalSaveError extends Error {
  constructor(readonly recovery: PlayerSave) { super("Canonical account missing. Explicit backup recovery is required."); }
}

export class UnsupportedPlayerSaveVersionError extends Error {
  constructor(readonly version: number) {
    super(
      "Player save version " +
        String(version) +
        " is newer or unsupported. Current version: " +
        String(PLAYER_SAVE_VERSION) +
        ".",
    );
    this.name = "UnsupportedPlayerSaveVersionError";
  }
}

export type SaveReason =
  | "migration"
  | "stage-entry"
  | "stage-clear"
  | "gameover"
  | "stage-select"
  | "inventory"
  | "equipment"
  | "support-spells"
  | "character"
  | "hotbar"
  | "discovery"
  | "shop"
  | "route-choice"
  | "upgrade"
  | "relic"
  | "codex"
  | "ascension"
  | "hidden-transition"
  | "progression"
  | "pagehide"
  | "manual"
  | "unknown";

export type PlayerSaveV1 = {
  version: 1;
  campaign: CampaignProgress;
  updatedAt: string;
};

export type PlayerSaveV2 = {
  version: 2;
  campaign: CampaignProgress;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV3 = {
  version: 3;
  campaign: CampaignProgress;
  inventory: Inventory;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV4 = {
  version: 4;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: unknown;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV5 = {
  version: 5;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: unknown;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV6 = {
  version: 6;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV7 = {
  version: 7;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV8 = {
  version: 8;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: unknown;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV9 = {
  version: 9;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: unknown;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV10 = {
  version: 10;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV11 = {
  version: 11;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV12 = {
  version: 12;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV13 = {
  version: 13;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV14 = {
  version: 14;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  progression: ProgressionState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV15 = {
  version: 15;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  progression: ProgressionState;
  expansionCurrencies: ExpansionCurrencyState;
  campaignExpansion: CampaignExpansionState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV16 = {
  version: 16;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  progression: ProgressionState;
  expansionCurrencies: ExpansionCurrencyState;
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV17 = {
  version: 17;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  progression: ProgressionState;
  expansionCurrencies: ExpansionCurrencyState;
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot | null;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV18 = {
  version: 18;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  progression: ProgressionState;
  expansionCurrencies: ExpansionCurrencyState;
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot | null;
  stageEntrySnapshot: StageEntrySnapshot | null;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV19 = {
  version: 19;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  progression: ProgressionState;
  expansionCurrencies: ExpansionCurrencyState;
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot | null;
  stageEntrySnapshot: StageEntrySnapshot | null;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV20 = {
  version: 20;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  progression: ProgressionState;
  expansionCurrencies: ExpansionCurrencyState;
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot | null;
  stageEntrySnapshot: StageEntrySnapshot | null;
  shops: ShopState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV21 = {
  version: 21;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  progression: ProgressionState;
  expansionCurrencies: ExpansionCurrencyState;
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot | null;
  stageEntrySnapshot: StageEntrySnapshot | null;
  shops: ShopState;
  route: RouteState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV22 = {
  version: 22;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  progression: ProgressionState;
  expansionCurrencies: ExpansionCurrencyState;
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot | null;
  stageEntrySnapshot: StageEntrySnapshot | null;
  shops: ShopState;
  route: RouteState;
  upgrades: UpgradeState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV23 = {
  version: 23;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  progression: ProgressionState;
  expansionCurrencies: ExpansionCurrencyState;
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot | null;
  stageEntrySnapshot: StageEntrySnapshot | null;
  shops: ShopState;
  route: RouteState;
  upgrades: UpgradeState;
  relics: RelicState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV24 = {
  version: 24;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  progression: ProgressionState;
  expansionCurrencies: ExpansionCurrencyState;
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot | null;
  stageEntrySnapshot: StageEntrySnapshot | null;
  shops: ShopState;
  route: RouteState;
  upgrades: UpgradeState;
  relics: RelicState;
  codex: CodexState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV25 = {
  version: 25;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  progression: ProgressionState;
  expansionCurrencies: ExpansionCurrencyState;
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot | null;
  stageEntrySnapshot: StageEntrySnapshot | null;
  shops: ShopState;
  route: RouteState;
  upgrades: UpgradeState;
  relics: RelicState;
  codex: CodexState;
  ascension: AscensionState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV26 = {
  version: 26;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  progression: ProgressionState;
  expansionCurrencies: ExpansionCurrencyState;
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot | null;
  stageEntrySnapshot: StageEntrySnapshot | null;
  shops: ShopState;
  route: RouteState;
  upgrades: UpgradeState;
  relics: RelicState;
  codex: CodexState;
  ascension: AscensionState;
  hotbar: HotbarState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV27 = Omit<PlayerSaveV26, "version"> & { version: 27 };

export type PlayerSave = Omit<PlayerSaveV27, "version"> & { version: 28; account: AccountState; auxiliary?: { expansionV2?: unknown; difficulty?: unknown } };
export type PersistenceSource = "indexeddb" | "localStorage";

export type LoadedPlayerSave = {
  save: PlayerSave;
  source: PersistenceSource;
  migrated: boolean;
  recoveryMode: "none" | "crash" | "death-rollback";
  interrupted?: boolean;
  mirrorRescue?: boolean;
};

export type MigrationResult = {
  save: PlayerSave;
  migrated: boolean;
  fromVersion: number | null;
};

function normalizeSaveReason(value: unknown): SaveReason {
  return value === "migration" ||
    value === "stage-entry" ||
    value === "stage-clear" ||
    value === "gameover" ||
    value === "stage-select" ||
    value === "inventory" ||
    value === "equipment" ||
    value === "support-spells" ||
    value === "character" ||
    value === "hotbar" ||
    value === "discovery" ||
    value === "shop" ||
    value === "route-choice" ||
    value === "upgrade" ||
    value === "relic" ||
    value === "codex" ||
    value === "ascension" ||
    value === "hidden-transition" ||
    value === "progression" ||
    value === "pagehide" ||
    value === "manual"
    ? value
    : "unknown";
}

export function createPlayerSave(
  campaign: CampaignProgress,
  updatedAt = new Date().toISOString(),
  lastSaveReason: SaveReason = "unknown",
  inventory: Inventory = createEmptyInventory(),
  equipment: EquipmentState = createStarterEquipmentState(),
  supportSpells: SupportSpellState = createStarterSupportSpellState(),
  characters: CharacterState = createStarterCharacterState(),
  luckPity: LuckPityState = createLuckPityState(),
  hiddenDiscovery: HiddenDiscoveryState = createHiddenDiscoveryState(),
  credits = 0,
  progression: ProgressionState = createProgressionState(),
  expansionCurrencies: ExpansionCurrencyState = createExpansionCurrencyState(),
  campaignExpansion: CampaignExpansionState = createCampaignExpansionState(
    campaign,
    updatedAt,
  ),
  checkpointSnapshot?: CheckpointSnapshot,
  crashRecoverySnapshot: CrashRecoverySnapshot | null = null,
  stageEntrySnapshot: StageEntrySnapshot | null = null,
  shops: ShopState = createShopState(),
  route: RouteState = createRouteState(campaign.highestUnlockedStage),
  upgrades: UpgradeState = createUpgradeState(),
  relics: RelicState = createRelicState(),
  codex: CodexState = createCodexState(),
  ascension: AscensionState = createAscensionState(campaign),
  hotbar: HotbarState = createDefaultHotbarState(),
  account?: AccountState,
): PlayerSave {
  const safeCampaign = sanitizeCampaignProgress(campaign);
  const activeState: RunPersistentState = {
    campaign: safeCampaign,
    inventory: sanitizeInventory(inventory),
    equipment: sanitizeEquipmentState(equipment),
    supportSpells: sanitizeSupportSpellState(supportSpells),
    characters: sanitizeCharacterState(characters),
    luckPity: sanitizeLuckPityState(luckPity),
    hiddenDiscovery: sanitizeHiddenDiscoveryState(hiddenDiscovery),
    credits: sanitizeCredits(credits),
    progression: sanitizeProgressionState(progression),
    expansionCurrencies: sanitizeExpansionCurrencyState(expansionCurrencies),
    shops: sanitizeShopState(shops),
    route: sanitizeRouteState(route, safeCampaign.highestUnlockedStage),
    upgrades: sanitizeUpgradeState(upgrades),
    relics: sanitizeRelicState(relics),
    ascension: sanitizeAscensionState(ascension, safeCampaign),
  };
  const safeCampaignExpansion = sanitizeCampaignExpansionState(
    campaignExpansion,
    safeCampaign,
    updatedAt,
  );
  const safeCheckpoint =
    checkpointSnapshot === undefined
      ? createCheckpointSnapshot(
          activeState,
          safeCampaignExpansion.checkpoint.stage,
        )
      : sanitizeCheckpointSnapshot(
          checkpointSnapshot,
          activeState,
          safeCampaignExpansion.checkpoint.stage,
        );

  const safeAccount = account ?? createAccountState();
  if (account === undefined) {
    for (const stage of safeCampaign.clearedStages)
      if (stage % 10 === 0)
        safeAccount.milestoneGrants.push(
          `${safeAccount.policy}:sector:0:${stage}`,
        );
    const safeAscension = activeState.ascension;
    for (let tier = 1; tier <= safeAscension.highestUnlockedTier; tier++) {
      const frontier = safeAscension.completedTiers.includes(tier)
        ? 1001
        : (safeAscension.frontierByTier[String(tier)] ?? 1);
      for (let stage = 10; stage < frontier; stage += 10)
        safeAccount.milestoneGrants.push(
          `${safeAccount.policy}:sector:${tier}:${stage}`,
        );
    }
  }
  return {
    version: PLAYER_SAVE_VERSION,
    account: structuredClone(safeAccount),
    ...activeState,
    campaignExpansion: safeCampaignExpansion,
    checkpointSnapshot: safeCheckpoint,
    crashRecoverySnapshot: sanitizeCrashRecoverySnapshot(crashRecoverySnapshot),
    stageEntrySnapshot: sanitizeStageEntrySnapshot(stageEntrySnapshot),
    codex: sanitizeCodexState(codex),
    ascension: sanitizeAscensionState(ascension, safeCampaign),
    hotbar: sanitizeHotbarState(hotbar),
    updatedAt,
    lastSaveReason,
  };
}

export function migratePlayerSave(value: unknown): MigrationResult {
  if (value === null || typeof value !== "object") {
    return {
      save: createPlayerSave(createDefaultCampaignProgress(), ""),
      migrated: false,
      fromVersion: null,
    };
  }

  const raw = value as {
    version?: unknown;
    campaign?: unknown;
    inventory?: unknown;
    equipment?: unknown;
    supportSpells?: unknown;
    characters?: unknown;
    luckPity?: unknown;
    hiddenDiscovery?: unknown;
    credits?: unknown;
    progression?: unknown;
    expansionCurrencies?: unknown;
    campaignExpansion?: unknown;
    checkpointSnapshot?: unknown;
    crashRecoverySnapshot?: unknown;
    stageEntrySnapshot?: unknown;
    shops?: unknown;
    route?: unknown;
    upgrades?: unknown;
    relics?: unknown;
    codex?: unknown;
    ascension?: unknown;
    hotbar?: unknown;
    account?: unknown;
    auxiliary?: PlayerSave["auxiliary"];
    updatedAt?: unknown;
    lastSaveReason?: unknown;
  };

  if (raw.version === 1 || raw.version === 2) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        createEmptyInventory(),
        createStarterEquipmentState(),
      ),
      migrated: true,
      fromVersion: raw.version,
    };
  }

  if (raw.version === 3) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        createStarterEquipmentState(),
      ),
      migrated: true,
      fromVersion: 3,
    };
  }

  if (raw.version === 4) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        migrateLegacyEquipmentState(raw.equipment),
      ),
      migrated: true,
      fromVersion: 4,
    };
  }

  if (raw.version === 5) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        migrateRarityEquipmentState(raw.equipment),
      ),
      migrated: true,
      fromVersion: 5,
    };
  }

  if (raw.version === 6) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        createStarterSupportSpellState(),
      ),
      migrated: true,
      fromVersion: 6,
    };
  }

  if (raw.version === 7) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        createStarterCharacterState(),
      ),
      migrated: true,
      fromVersion: 7,
    };
  }

  if (raw.version === 8) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
      ),
      migrated: true,
      fromVersion: 8,
    };
  }

  if (raw.version === 9) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
      ),
      migrated: true,
      fromVersion: 9,
    };
  }

  if (raw.version === 10) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        createLuckPityState(),
      ),
      migrated: true,
      fromVersion: 10,
    };
  }

  if (raw.version === 11) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        createHiddenDiscoveryState(),
      ),
      migrated: true,
      fromVersion: 11,
    };
  }

  if (raw.version === 12) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        0,
      ),
      migrated: true,
      fromVersion: 12,
    };
  }

  if (raw.version === 13) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        createProgressionState(),
      ),
      migrated: true,
      fromVersion: 13,
    };
  }

  if (raw.version === 14) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
      ),
      migrated: true,
      fromVersion: 14,
    };
  }

  if (raw.version === 15) {
    const safeCampaign = sanitizeCampaignProgress(raw.campaign);
    const timestamp =
      typeof raw.updatedAt === "string" ? raw.updatedAt : "";
    return {
      save: createPlayerSave(
        safeCampaign,
        timestamp,
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          safeCampaign,
          timestamp,
        ),
      ),
      migrated: true,
      fromVersion: 15,
    };
  }

  if (raw.version === 16) {
    const safeCampaign = sanitizeCampaignProgress(raw.campaign);
    const timestamp =
      typeof raw.updatedAt === "string" ? raw.updatedAt : "";
    return {
      save: createPlayerSave(
        safeCampaign,
        timestamp,
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          safeCampaign,
          timestamp,
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        null,
      ),
      migrated: true,
      fromVersion: 16,
    };
  }

  if (raw.version === 17) {
    const safeCampaign = sanitizeCampaignProgress(raw.campaign);
    const timestamp =
      typeof raw.updatedAt === "string" ? raw.updatedAt : "";
    return {
      save: createPlayerSave(
        safeCampaign,
        timestamp,
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          safeCampaign,
          timestamp,
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        sanitizeCrashRecoverySnapshot(raw.crashRecoverySnapshot),
        null,
      ),
      migrated: true,
      fromVersion: 17,
    };
  }

  if (raw.version === 18) {
    const safeCampaign = sanitizeCampaignProgress(raw.campaign);
    const timestamp =
      typeof raw.updatedAt === "string" ? raw.updatedAt : "";
    return {
      save: createPlayerSave(
        safeCampaign,
        timestamp,
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          safeCampaign,
          timestamp,
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        sanitizeCrashRecoverySnapshot(raw.crashRecoverySnapshot),
        sanitizeStageEntrySnapshot(raw.stageEntrySnapshot),
      ),
      migrated: true,
      fromVersion: 18,
    };
  }

  if (raw.version === 19) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          sanitizeCampaignProgress(raw.campaign),
          typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        sanitizeCrashRecoverySnapshot(raw.crashRecoverySnapshot),
        sanitizeStageEntrySnapshot(raw.stageEntrySnapshot),
        createShopState(),
      ),
      migrated: true,
      fromVersion: 19,
    };
  }

  if (raw.version === 20) {
    const safeCampaign = sanitizeCampaignProgress(raw.campaign);
    return {
      save: createPlayerSave(
        safeCampaign,
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          safeCampaign,
          typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        sanitizeCrashRecoverySnapshot(raw.crashRecoverySnapshot),
        sanitizeStageEntrySnapshot(raw.stageEntrySnapshot),
        sanitizeShopState(raw.shops),
        createRouteState(safeCampaign.highestUnlockedStage),
      ),
      migrated: true,
      fromVersion: 20,
    };
  }

  if (raw.version === 21) {
    const safeCampaign = sanitizeCampaignProgress(raw.campaign);
    return {
      save: createPlayerSave(
        safeCampaign,
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          safeCampaign,
          typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        sanitizeCrashRecoverySnapshot(raw.crashRecoverySnapshot),
        sanitizeStageEntrySnapshot(raw.stageEntrySnapshot),
        sanitizeShopState(raw.shops),
        sanitizeRouteState(
          raw.route,
          safeCampaign.highestUnlockedStage,
        ),
        createUpgradeState(),
      ),
      migrated: true,
      fromVersion: 21,
    };
  }

  if (raw.version === 22) {
    const safeCampaign = sanitizeCampaignProgress(raw.campaign);
    return {
      save: createPlayerSave(
        safeCampaign,
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          safeCampaign,
          typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        sanitizeCrashRecoverySnapshot(raw.crashRecoverySnapshot),
        sanitizeStageEntrySnapshot(raw.stageEntrySnapshot),
        sanitizeShopState(raw.shops),
        sanitizeRouteState(
          raw.route,
          safeCampaign.highestUnlockedStage,
        ),
        sanitizeUpgradeState(raw.upgrades),
        createRelicState(),
      ),
      migrated: true,
      fromVersion: 22,
    };
  }

  if (raw.version === 23) {
    const safeCampaign = sanitizeCampaignProgress(raw.campaign);
    return {
      save: createPlayerSave(
        safeCampaign,
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          safeCampaign,
          typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        sanitizeCrashRecoverySnapshot(raw.crashRecoverySnapshot),
        sanitizeStageEntrySnapshot(raw.stageEntrySnapshot),
        sanitizeShopState(raw.shops),
        sanitizeRouteState(
          raw.route,
          safeCampaign.highestUnlockedStage,
        ),
        sanitizeUpgradeState(raw.upgrades),
        sanitizeRelicState(raw.relics),
        createCodexState(),
      ),
      migrated: true,
      fromVersion: 23,
    };
  }

  if (raw.version === 24) {
    const safeCampaign = sanitizeCampaignProgress(raw.campaign);
    return {
      save: createPlayerSave(
        safeCampaign,
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          safeCampaign,
          typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        sanitizeCrashRecoverySnapshot(raw.crashRecoverySnapshot),
        sanitizeStageEntrySnapshot(raw.stageEntrySnapshot),
        sanitizeShopState(raw.shops),
        sanitizeRouteState(
          raw.route,
          safeCampaign.highestUnlockedStage,
        ),
        sanitizeUpgradeState(raw.upgrades),
        sanitizeRelicState(raw.relics),
        sanitizeCodexState(raw.codex),
        createAscensionState(safeCampaign),
      ),
      migrated: true,
      fromVersion: 24,
    };
  }

  if (raw.version === 25) {
    const safeCampaign = sanitizeCampaignProgress(raw.campaign);
    return {
      save: createPlayerSave(
        safeCampaign,
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          safeCampaign,
          typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        sanitizeCrashRecoverySnapshot(raw.crashRecoverySnapshot),
        sanitizeStageEntrySnapshot(raw.stageEntrySnapshot),
        sanitizeShopState(raw.shops),
        sanitizeRouteState(
          raw.route,
          safeCampaign.highestUnlockedStage,
        ),
        sanitizeUpgradeState(raw.upgrades),
        sanitizeRelicState(raw.relics),
        sanitizeCodexState(raw.codex),
        sanitizeAscensionState(raw.ascension, safeCampaign),
        createLegacyHotbarState(),
      ),
      migrated: true,
      fromVersion: 25,
    };
  }

  if (raw.version === 26) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          sanitizeCampaignProgress(raw.campaign),
          typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        sanitizeCrashRecoverySnapshot(raw.crashRecoverySnapshot),
        sanitizeStageEntrySnapshot(raw.stageEntrySnapshot),
        sanitizeShopState(raw.shops),
        sanitizeRouteState(
          raw.route,
          sanitizeCampaignProgress(raw.campaign).highestUnlockedStage,
        ),
        sanitizeUpgradeState(raw.upgrades),
        sanitizeRelicState(raw.relics),
        sanitizeCodexState(raw.codex),
        sanitizeAscensionState(raw.ascension, sanitizeCampaignProgress(raw.campaign)),
        sanitizeHotbarState(raw.hotbar),
      ),
      migrated: true,
      fromVersion: 26,
    };
  }

  if (raw.version === 27 || raw.version === PLAYER_SAVE_VERSION) {
    if (raw.version === PLAYER_SAVE_VERSION && !isValidAccountState(raw.account)) throw new CorruptAccountStateError();
    validateAccountAuxiliary(raw.auxiliary);
    return {
      save: { ...createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        normalizeSaveReason(raw.lastSaveReason),
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          sanitizeCampaignProgress(raw.campaign),
          typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        sanitizeCrashRecoverySnapshot(raw.crashRecoverySnapshot),
        sanitizeStageEntrySnapshot(raw.stageEntrySnapshot),
        sanitizeShopState(raw.shops),
        sanitizeRouteState(
          raw.route,
          sanitizeCampaignProgress(raw.campaign).highestUnlockedStage,
        ),
        sanitizeUpgradeState(raw.upgrades),
        sanitizeRelicState(raw.relics),
        sanitizeCodexState(raw.codex),
        sanitizeAscensionState(raw.ascension, sanitizeCampaignProgress(raw.campaign)),
        sanitizeHotbarState(raw.hotbar),
        raw.version === PLAYER_SAVE_VERSION ? raw.account as AccountState : undefined,
      ), ...(raw.auxiliary ? { auxiliary: structuredClone(raw.auxiliary) } : {}) },
      migrated: raw.version === 27,
      fromVersion: raw.version as number,
    };
  }

  if (typeof raw.version === "number" && Number.isFinite(raw.version)) {
    throw new UnsupportedPlayerSaveVersionError(raw.version);
  }

  return {
    save: createPlayerSave(
      sanitizeCampaignProgress(raw.campaign),
      typeof raw.updatedAt === "string" ? raw.updatedAt : "",
      "migration",
      sanitizeInventory(raw.inventory),
      sanitizeEquipmentState(raw.equipment),
      sanitizeSupportSpellState(raw.supportSpells),
      sanitizeCharacterState(raw.characters),
    ),
    migrated: true,
    fromVersion: null,
  };
}

export function sanitizePlayerSave(value: unknown): PlayerSave {
  return migratePlayerSave(value).save;
}

function progressRank(progress: CampaignProgress): [number, number, number] {
  return [
    progress.highestUnlockedStage,
    progress.clearedStages.length,
    Object.keys(progress.bestByStage).length,
  ];
}

function compareCampaignProgress(
  left: CampaignProgress,
  right: CampaignProgress,
): number {
  const leftRank = progressRank(left);
  const rightRank = progressRank(right);

  for (let index = 0; index < leftRank.length; index += 1) {
    const leftValue = leftRank[index] ?? 0;
    const rightValue = rightRank[index] ?? 0;
    if (leftValue > rightValue) return 1;
    if (rightValue > leftValue) return -1;
  }

  return 0;
}

export function chooseFurthestCampaign(
  preferred: CampaignProgress,
  fallback: CampaignProgress,
): CampaignProgress {
  return compareCampaignProgress(preferred, fallback) >= 0
    ? preferred
    : fallback;
}

function saveTimestamp(save: PlayerSave): number {
  const value = Date.parse(save.updatedAt);
  return Number.isFinite(value) ? value : 0;
}

export function choosePreferredPlayerSave(
  preferred: PlayerSave,
  recovery: PlayerSave,
): PlayerSave {
  const campaignComparison = compareCampaignProgress(
    preferred.campaign,
    recovery.campaign,
  );
  if (campaignComparison > 0) return preferred;
  if (campaignComparison < 0) return recovery;

  return saveTimestamp(recovery) > saveTimestamp(preferred)
    ? recovery
    : preferred;
}

function recoverySaveFromLegacy(): PlayerSave {
  const legacyCampaign = loadCampaignProgress();

  try {
    const raw = localStorage.getItem(RECOVERY_SAVE_KEY);
    if (raw === null) {
      return createPlayerSave(legacyCampaign, "", "migration");
    }

    const recovery = migratePlayerSave(JSON.parse(raw)).save;
    if (recovery.account.revision > 0) return recovery;
    const campaign = chooseFurthestCampaign(
      recovery.campaign,
      legacyCampaign,
    );

    return createPlayerSave(
      campaign,
      recovery.updatedAt,
      recovery.lastSaveReason,
      recovery.inventory,
      recovery.equipment,
      recovery.supportSpells,
      recovery.characters,
      recovery.luckPity,
      recovery.hiddenDiscovery,
      recovery.credits,
      recovery.progression,
      recovery.expansionCurrencies,
      recovery.campaignExpansion,
      recovery.checkpointSnapshot,
      recovery.crashRecoverySnapshot,
      recovery.stageEntrySnapshot,
      recovery.shops,
      recovery.route,
      recovery.upgrades,
      recovery.relics,
      recovery.codex,
      recovery.ascension,
      recovery.hotbar,
    );
  } catch (error) {
    if (error instanceof UnsupportedPlayerSaveVersionError || error instanceof CorruptAccountStateError) throw error;
    throw new CorruptAccountStateError();
  }
}

function saveRecovery(save: PlayerSave): void {
  localStorage.setItem(RECOVERY_SAVE_KEY, JSON.stringify(save));
  saveCampaignProgress(save.campaign);
}

export function savePlayerRecoveryMirrorSync(save: PlayerSave): void {
  saveRecovery(save);
}

function runStateFromSave(save: PlayerSave): RunPersistentState {
  return {
    campaign: save.campaign,
    inventory: save.inventory,
    equipment: save.equipment,
    supportSpells: save.supportSpells,
    characters: save.characters,
    luckPity: save.luckPity,
    hiddenDiscovery: save.hiddenDiscovery,
    credits: save.credits,
    progression: save.progression,
    expansionCurrencies: save.expansionCurrencies,
    shops: save.shops,
    route: save.route,
    upgrades: save.upgrades,
    relics: save.relics,
    ascension: save.ascension,
  };
}

export function resolvePlayerSaveRecovery(
  save: PlayerSave,
  timestamp = new Date().toISOString(),
): {
  save: PlayerSave;
  recoveryMode: LoadedPlayerSave["recoveryMode"];
} {
  if (save.account.revision > 0) return { save, recoveryMode: "none" };
  const resolution = resolveCrashRecovery(
    runStateFromSave(save),
    save.campaignExpansion,
    save.checkpointSnapshot,
    save.crashRecoverySnapshot,
    timestamp,
  );

  if (resolution.mode === "none") {
    return { save, recoveryMode: "none" };
  }

  return {
    save: createPlayerSave(
      resolution.state.campaign,
      timestamp,
      save.lastSaveReason,
      resolution.state.inventory,
      resolution.state.equipment,
      resolution.state.supportSpells,
      resolution.state.characters,
      resolution.state.luckPity,
      resolution.state.hiddenDiscovery,
      resolution.state.credits,
      resolution.state.progression,
      resolution.state.expansionCurrencies,
      resolution.campaignExpansion,
      resolution.checkpointSnapshot,
      resolution.crashRecoverySnapshot,
      save.stageEntrySnapshot,
      resolution.state.shops,
      resolution.state.route,
      resolution.state.upgrades,
      resolution.state.relics,
      save.codex,
      resolution.state.ascension,
      save.hotbar,
    ),
    recoveryMode: resolution.mode,
  };
}

export function openPlayerDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, INDEXED_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Unable to open IndexedDB."));
  });
}

/** Mutate synchronously inside get. The only success boundary is transaction.oncomplete. */
export async function playerSaveTransaction(
  mutate: (stored: unknown) => PlayerSave,
): Promise<PlayerSave> {
  const database = await openPlayerDatabase();
  try {
    return await new Promise<PlayerSave>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite", {
        durability: "strict",
      });
      const store = transaction.objectStore(STORE_NAME);
      let next: PlayerSave, failure: unknown;
      const request = store.get(SAVE_KEY);
      request.onsuccess = () => {
        try {
          next = mutate(request.result);
          store.put(next, SAVE_KEY);
        } catch (error) {
          failure = error;
          transaction.abort();
        }
      };
      transaction.oncomplete = () => resolve(next!);
      transaction.onabort = transaction.onerror = () =>
        reject(
          failure ??
            transaction.error ??
            new Error("Account transaction aborted"),
        );
    });
  } finally {
    database.close();
  }
}
export async function loadPlayerSave(): Promise<LoadedPlayerSave> {
  if (!("indexedDB" in window))
    return {
      save: recoverySaveFromLegacy(),
      source: "localStorage",
      migrated: false,
      recoveryMode: "none",
    };
  let migrated = false;
  let save: PlayerSave;
  try {
    save = await playerSaveTransaction((stored) => {
      if (stored !== undefined) {
        const result = {
          save: readCanonicalPlayerSave(stored),
          migrated:
            (stored as { version: number }).version !== PLAYER_SAVE_VERSION,
        };
        migrated = result.migrated;
        // Current canonical state always outranks a mirror or checkpoint, including its wallet.
        if (!migrated) return result.save;
        const resolved = resolvePlayerSaveRecovery(result.save);
        return { ...resolved.save, account: result.save.account };
      }
      migrated = true;
      const recovery = recoverySaveFromLegacy();
      if (recovery.account.revision > 0)
        throw new MissingCanonicalSaveError(recovery);
      return recovery;
    });
  } catch (error) {
    if (error instanceof MissingCanonicalSaveError)
      return {
        save: error.recovery,
        source: "localStorage",
        migrated: false,
        recoveryMode: "none",
        mirrorRescue: true,
      };
    throw error;
  }
  try {
    saveRecovery(save);
  } catch {
    /* A committed canonical revision remains authoritative. */
  }
  return { save, source: "indexeddb", migrated, recoveryMode: "none" };
}
