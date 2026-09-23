import { PriorityKillChain } from "./audio/announcer";
import { Sfx } from "./audio/Sfx";
import {
  bossActionInterval,
  bossKeyDamage,
  bossPhaseFor,
  bossProjectileCount,
  bossWordDamage,
  createBossState,
  isBossStageRole,
  toBossHud,
} from "./boss/model";
import type {
  BossHudState,
  BossRole,
  BossState,
} from "./boss/model";
import {
  bossActionIntervalMultiplier,
  bossWordLengthPreference,
  createBossTypingMechanicState,
  resolveBossWordMechanic,
  tickBossTypingMechanic,
  type BossTypingMechanicState,
} from "./boss/typing-mechanics";
import {
  bossVisualDefinitionIdForStage,
  bossVisualNameForStage,
} from "./boss/visual-profile";
import type { DifficultyProfile, StageConfig } from "./campaign/types";
import type { HiddenEncounterRuntime } from "./discovery/hidden-encounter";
import {
  activeThreatPressure,
  canAdmitFormation,
  canAdmitSpawn,
  emptyActivePressureSnapshot,
  isControllerSupportKind,
  type ActiveTypingPressureSnapshot,
} from "./campaign/active-pressure";
import {
  environmentForWorld,
  type WorldEnvironmentProfile,
} from "./worlds/environment";
import { worldForStage } from "./worlds/registry";
import type { CharacterId } from "./characters/registry";
import {
  AEGIS_ACTIVE_SKILL,
  AEGIS_ACTIVE_SKILL_ID,
  AEGIS_FORTRESS_DURATION,
  AEGIS_FORTRESS_SHIELD_RATIO,
  AEGIS_REFLECT_DURATION,
  restoreAegisShield,
} from "./characters/aegis";
import {
  addCelestialCharge,
  CELESTIAL_ACTIVE_SKILL,
  CELESTIAL_ACTIVE_SKILL_ID,
  CELESTIAL_STANCE_DURATION,
  CELESTIAL_STARFALL_BOSS_RATIO,
  CELESTIAL_STARFALL_TARGETS,
  spendCelestialCharge,
} from "./characters/celestial";
import {
  REAPER_ACTIVE_SKILL,
  REAPER_ACTIVE_SKILL_ID,
  REAPER_DEATH_CHAIN_BOSS_RATIO,
  REAPER_DEATH_CHAIN_DURATION,
  REAPER_DEATH_CHAIN_TARGETS,
  REAPER_EXECUTE_ADVANCE,
  REAPER_EXECUTE_BOSS_RATIO,
  reaperStreakDamageMultiplier,
} from "./characters/reaper";
import {
  shouldTriggerZenithCore,
  ZENITH_ACTIVE_SKILL,
  ZENITH_ACTIVE_SKILL_ID,
  ZENITH_PROTOCOL_DURATION,
  ZENITH_PROTOCOL_GUARD_BLOCKS,
  ZENITH_PROTOCOL_MARK_DURATION,
  ZENITH_SHIFT_DURATION,
} from "./characters/zenith";
import {
  BASTION_ACTIVE_SKILL,
  BASTION_ACTIVE_SKILL_ID,
  BASTION_MATRIX_BLOCKS,
  BASTION_MATRIX_DURATION,
  BASTION_SANCTUARY_BLOCKS,
  BASTION_SANCTUARY_DURATION,
  BASTION_SANCTUARY_SHIELD_RATIO,
  recycleBastionShield,
} from "./characters/bastion";
import {
  ORACLE_ACTIVE_SKILL,
  ORACLE_ACTIVE_SKILL_ID,
  ORACLE_MARK_DURATION,
  ORACLE_PERFECT_MARK_DURATION,
  ORACLE_PERFECT_POWER_GAIN,
  ORACLE_ULTIMATE_BOSS_RATIO,
  ORACLE_ULTIMATE_MARK_DURATION,
  ORACLE_ULTIMATE_TARGETS,
} from "./characters/oracle";
import {
  ARSENAL_ACTIVE_SKILL,
  ARSENAL_ACTIVE_SKILL_ID,
  ARSENAL_OVERCLOCK_DURATION,
  ARSENAL_PROTOCOL_BOSS_RATIO,
  ARSENAL_PROTOCOL_DURATION,
  ARSENAL_PROTOCOL_TARGETS,
} from "./characters/arsenal";
import {
  fortunePower,
  FORTUNE_ACTIVE_SHIELD_RATIO,
  FORTUNE_ACTIVE_SKILL,
  FORTUNE_ACTIVE_SKILL_ID,
  FORTUNE_JACKPOT_DURATION,
  FORTUNE_JACKPOT_SHIELD_RATIO,
} from "./characters/fortune";
import {
  shouldTriggerWraithCloak,
  WRAITH_ACTIVE_SKILL,
  WRAITH_ACTIVE_SKILL_ID,
  WRAITH_ACTIVE_CLOAK_DURATION,
  WRAITH_PASSIVE_CLOAK_DURATION,
  WRAITH_TIME_COLLAPSE_DURATION,
} from "./characters/wraith";
import {
  restoreVoltEnergy,
  VOLT_ACTIVE_SKILL,
  VOLT_ACTIVE_SKILL_ID,
  VOLT_EMP_DELAY,
  VOLT_LONG_WORD_LENGTH,
  VOLT_THUNDER_BOSS_RATIO,
  VOLT_THUNDER_TARGETS,
} from "./characters/volt";
import {
  restoreVanguardShield,
  shouldTriggerVanguardShieldRhythm,
  VANGUARD_ACTIVE_BARRIER_DURATION,
  VANGUARD_ACTIVE_BARRIER_SHIELD_RATIO,
  VANGUARD_ACTIVE_SKILL,
  VANGUARD_ACTIVE_SKILL_ID,
  VANGUARD_NOVA_DURATION,
  VANGUARD_NOVA_SHIELD_RATIO,
} from "./characters/vanguard";
import {
  calculateEffectiveStats,
  type CoreStats,
  type EffectiveStatInput,
} from "./stats/core";
import {
  applySupplyReward,
  rollSupplyReward,
  supplyRewardLabel,
  type SupplyPod,
} from "./supply/pod";
import {
  applyIncomingDamage,
  createPlayerResources,
  DEFAULT_PLAYER_BASE_STATS,
  firepowerDamage,
  focusPowerGain,
  regenerateResources,
  wardDuration,
} from "./stats/player";
import {
  rollEquipmentDrop,
  type EquipmentDrop,
  type LootSource,
} from "./loot/equipment-loot";
import {
  createLuckPityState,
  rollLuckPity,
  sanitizeLuckPityState,
  type LuckPityKey,
  type LuckPityState,
} from "./loot/pity";
import {
  createHiddenDiscoveryState,
  rollHiddenDiscovery,
  sanitizeHiddenDiscoveryState,
  type HiddenContentDefinition,
  type HiddenDiscoveryState,
} from "./discovery/hidden-content";
import {
  combineStageEventEffects,
  createStageEventModifiers,
  scheduleStageRandomEvents,
  type StageEventDefinition,
  type StageRandomEventModifiers,
} from "./events/stage-scheduler";
import { galaxyStageModifiers } from "./events/galaxy-hazards";
import {
  createStageObjectiveState,
  objectiveForcesCommander,
  objectiveForcesElite,
  objectiveForStage,
  reduceStageObjective,
  requiredObjectiveAllowsFinish,
  type StageObjectiveEvent,
  type StageObjectiveState,
} from "./events/objectives";
import {
  applyStatus,
  cleanseNegativeStatuses,
  createStatusState,
  hasCleanseableNegativeStatus,
  statusIncomingDamageMultiplier,
  statusRemaining,
  tickStatuses,
  type ActiveStatus,
  type StatusId,
  type StatusState,
} from "./status/engine";
import type { BuildSynergyId } from "./synergy/build";
import {
  goldenEnemyChance,
  treasureDroneChance,
  type TreasureDrone,
} from "./events/rare-targets";
import {
  createRewardChoiceOptions,
  rewardChoiceCrateChance,
  rewardChoiceWord,
  type RewardChoiceCrate,
} from "./events/reward-choice";
import {
  anomalyCrateChance,
  anomalyRiskHullRatio,
  anomalyWord,
  createAnomalyReward,
  type AnomalyChoice,
  type AnomalyCrate,
} from "./events/anomaly";
import {
  applyEliteModifiers,
  eliteModifierCount,
  pickEliteModifiers,
  rollElite,
} from "./enemies/elite";
import {
  chooseEnemyKind,
  enemyProfile,
} from "./enemies/kinds";
import {
  chooseFormation,
  formationSpawnChance,
  shouldAttemptFormation,
  type FormationDefinition,
} from "./enemies/formations";
import {
  enemyDefinition,
  type EnemyDefinitionId,
} from "./enemies/registry";
import { applyEnemyRewardEffect } from "./enemies/reward-effects";
import {
  applyEnemyAreaControl,
  softenNearbyEnemies,
  tickEnemyRewardControl,
  timedRewardMultiplier,
} from "./enemies/reward-runtime";
import {
  EMPTY_COMPILED_RELIC_EFFECTS,
  type CompiledRelicEffects,
} from "./relics/state";
import { drawModularEnemy } from "./enemies/renderer";
import {
  spawnWorldEnemyDefinitionId,
  worldRuntimeEnemyDefinitionId,
} from "./worlds/roster";
import {
  currentEnemyLayer,
  enemyLayerPlan,
  enemyLayerSegments,
  reinforceEnemyLayerPlan,
} from "./enemies/layers";
import {
  enemyRankLabel,
  type EnemyRank,
} from "./enemies/rank";
import {
  pickVocabularyEntryForRank,
  wordDifficultyScore,
} from "./enemies/word-difficulty";
import { resolveEnemyTypingProfile } from "./enemies/typing-profile";
import {
  enemySkillDefinition,
  type EnemySkillId,
} from "./enemies/skills";
import { resolveEnemyRuntimeProfile } from "./enemies/runtime-profile";
import {
  beginHardCc,
  canApplyHardCc,
  createHardCcState,
  tickHardCcState,
  type HardCcId,
} from "./combat/cc-guard";
import {
  isRecoveryItemId,
  useRecoveryItem,
  type RecoveryItemId,
} from "./items/consumables";
import {
  absorbBarrierDamage,
  DEFENSIVE_SKILLS,
  emergencyRepair,
  isDefensiveSkillId,
  type DefensiveSkillId,
} from "./skills/defensive";
import {
  chainTypingAdvance,
  markedBossDamageMultiplier,
  OFFENSIVE_SKILLS,
  isOffensiveSkillId,
  type OffensiveSkillId,
} from "./skills/offensive";
import {
  getSupportSpell,
  isSupportSpellId,
  type SupportSpellId,
} from "./skills/support";
import {
  SkillEngine,
  type SkillActivationResult,
  type SkillBlockReason,
  type SkillDefinition,
  type SkillRuntimeState,
} from "./skills/engine";
import {
  UPGRADEABLE_SKILL_IDS,
  resolveSkillDefinitionsForLevels,
  type UpgradeableSkillId,
} from "./skills/progression";
import {
  PHOENIX_REVIVE_GRACE_SECONDS,
  phoenixReviveResources,
} from "./combat/revival";
import {
  accuracyPercent,
  clamp,
  chooseTarget,
  multiplierForStreak,
  normalizeWord,
  splitDisplayByTypedLetters,
  typingText,
} from "./logic";
import {
  impactFeedback,
  telegraphPulse,
  telegraphStrength,
  type ImpactKind,
} from "./vfx/polish";
import { enemyFxProfile } from "./vfx/enemy-fx";
import { rewardFxProfile } from "./vfx/reward-fx";
import {
  FrameProfiler,
  qualityProfile,
  resolveRenderDpr,
  type PerformanceReport,
} from "./performance/quality";
import type {
  Enemy,
  EnemyKind,
  EnemyProjectile,
  GamePhase,
  GameSettings,
  GameStats,
  Laser,
  Particle,
  VocabularyEntry,
} from "./types";

type EnemySpawnRequest = {
  kind?: EnemyKind;
  skipAdmission?: boolean;
  formationMember?: boolean;
  x?: number;
  yOffset?: number;
};

export type GameHooks = {
  onStats(stats: GameStats): void;
  onPhase(phase: GamePhase): void;
  onStage(stage: number): void;
  onStageEvents(events: readonly StageEventDefinition[]): void;
  onObjectiveUpdate(objective: StageObjectiveState | null): void;
  onStageClear(stats: GameStats): void;
  onBossUpdate(boss: BossHudState | null): void;
  onWordComplete(entry: VocabularyEntry): void;
  onEquipmentDrop(drop: EquipmentDrop): void;
  onRewardChoice(options: readonly EquipmentDrop[]): void;
  onBossRewardChoice(stage: number, role: BossRole): void;
  onEnemySeen(definitionId: EnemyDefinitionId): void;
  onAnomalyReady(riskHullRatio: number): void;
  onLuckPityUpdate(state: LuckPityState): void;
  onHiddenDiscoveryUpdate(
    state: HiddenDiscoveryState,
    discovery: HiddenContentDefinition | null,
  ): void;
  onStatuses(statuses: readonly ActiveStatus[]): void;
  onSkills(): void;
};

export type TestLabDeathMode = "immortal" | "real";

export type TestLabEnemySpawn = {
  definitionId?: EnemyDefinitionId;
  kind?: EnemyKind;
  count?: number;
  elite?: boolean;
  rank?: EnemyRank;
  layers?: 1 | 2 | 3;
  skillIds?: readonly EnemySkillId[];
};

export type TestLabBossOverride = {
  hpRatio?: number;
  phase?: 1 | 2 | 3;
  shieldActive?: boolean;
  staggerSeconds?: number;
};

export type TestLabGameSnapshot = {
  phase: GamePhase;
  stage: number | null;
  difficulty: DifficultyProfile | null;
  stats: GameStats;
  enemies: Enemy[];
  boss: BossHudState | null;
  statuses: ActiveStatus[];
  projectiles: number;
  particles: number;
  activePressure: ActiveTypingPressureSnapshot;
  deathMode: TestLabDeathMode;
  lethalHits: number;
  scheduler: {
    frozen: boolean;
    spawnRemaining: number;
    spawnTimer: number;
    timeScale: number;
  };
  skillStates: Array<{
    id: string;
    cooldownRemaining: number;
    chargesRemaining: number | null;
    usesThisStage: number;
  }>;
  objective: StageObjectiveState | null;
};

const FALLBACK_ENTRIES: VocabularyEntry[] = [
  { id: "fallback-01", en: "code", vi: "mã", ipa: "/koʊd/" },
  { id: "fallback-02", en: "space", vi: "không gian", ipa: "/speɪs/" },
  { id: "fallback-03", en: "learn", vi: "học", ipa: "/lɝn/" },
  { id: "fallback-04", en: "focus", vi: "tập trung", ipa: "/ˈfoʊkəs/" },
  { id: "fallback-05", en: "laser", vi: "tia laser", ipa: "/ˈleɪzɚ/" },
  { id: "fallback-06", en: "orbit", vi: "quỹ đạo", ipa: "/ˈɔrbɪt/" },
  { id: "fallback-07", en: "shield", vi: "lá chắn", ipa: "/ʃild/" },
  { id: "fallback-08", en: "energy", vi: "năng lượng", ipa: "/ˈɛnɚdʒi/" },
  { id: "fallback-09", en: "reactor", vi: "lò phản ứng", ipa: "/riˈæktɚ/" },
  { id: "fallback-10", en: "typing", vi: "gõ phím", ipa: "/ˈtaɪpɪŋ/" },
];

const PLAYER_Y_OFFSET = 72;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function ultimateVisual(characterId: CharacterId): {
  count: number;
  hue: number;
  shake: number;
} {
  switch (characterId) {
    case "aegis":
      return { count: 56, hue: 300, shake: 10 };
    case "volt":
      return { count: 62, hue: 202, shake: 11 };
    case "wraith":
      return { count: 58, hue: 274, shake: 9 };
    case "fortune":
      return { count: 54, hue: 48, shake: 8 };
    case "arsenal":
      return { count: 60, hue: 18, shake: 10 };
    case "oracle":
      return { count: 58, hue: 326, shake: 9 };
    case "bastion":
      return { count: 58, hue: 164, shake: 9 };
    case "reaper":
      return { count: 66, hue: 350, shake: 11 };
    case "celestial":
      return { count: 68, hue: 220, shake: 10 };
    case "zenith":
      return { count: 72, hue: 190, shake: 11 };
    default:
      return { count: 48, hue: 184, shake: 9 };
  }
}

export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly hooks: GameHooks;
  private readonly sfx = new Sfx();
  private readonly priorityKillChain = new PriorityKillChain();
  private readonly skillEngine = new SkillEngine();
  private skillLevels: Record<UpgradeableSkillId, number> =
    Object.fromEntries(
      UPGRADEABLE_SKILL_IDS.map((id) => [id, 1]),
    ) as Record<UpgradeableSkillId, number>;
  private relicEffects: CompiledRelicEffects = {
    ...EMPTY_COMPILED_RELIC_EFFECTS,
  };
  private relicFirstWordTriggered = false;
  private relicMistakeGuardsUsed = 0;

  private characterId: CharacterId = "vanguard";
  private supportSkillIds: SupportSpellId[] = [
    "sanctuary",
    "gravity-well",
  ];
  private settings: GameSettings;
  private vocabulary: VocabularyEntry[];
  private vocabularyLevel = 1;
  private phase: GamePhase = "title";
  private playerStats: CoreStats = calculateEffectiveStats({
    base: DEFAULT_PLAYER_BASE_STATS,
  });
  private stats: GameStats = this.createGameStats(1);
  private secondsSinceDamage = Number.POSITIVE_INFINITY;
  private resourceEmitTimer = 0;

  private width = 1280;
  private height = 720;
  private dpr = 1;
  private nextEnemyId = 1;
  private nextProjectileId = 1;
  private eliteSpawned = 0;
  private boss: BossState | null = null;
  private bossHudTimer = 0;
  private bossSpawned = false;
  private bossDefeated = false;
  private bossRewardPending = false;
  private seenEnemyDefinitions = new Set<EnemyDefinitionId>();
  private enemies: Enemy[] = [];
  private projectiles: EnemyProjectile[] = [];
  private lasers: Laser[] = [];
  private particles: Particle[] = [];
  private targetId: number | null = null;
  private spawnTimer = 0;
  private spawnRemaining = 0;
  private stageConfig: StageConfig | null = null;
  private difficulty: DifficultyProfile | null = null;
  private hiddenEncounterRuntime: HiddenEncounterRuntime | null = null;
  private shake = 0;
  private overdriveTimer = 0;
  private interferenceTimer = 0;
  private barrierTimer = 0;
  private barrierHp = 0;
  private reflectTimer = 0;
  private timeShellTimer = 0;
  private guardianTimer = 0;
  private guardianBlocks = 0;
  private markedEnemyId: number | null = null;
  private markTimer = 0;
  private bossMarkTimer = 0;
  private gravityWellTimer = 0;
  private cloakTimer = 0;
  private phoenixGraceTimer = 0;
  private weaponOverclockTimer = 0;
  private rewardScoreMultiplierTimer = 0;
  private rewardCreditsMultiplierTimer = 0;
  private rewardNotice: {
    label: string;
    x: number;
    y: number;
    hue: number;
    remaining: number;
  } | null = null;
  private celestialCharge = 0;
  private skillHudTimer = 0;
  private supplyPod: SupplyPod | null = null;
  private supplySpawnTimer = 0;
  private supplySpawnsRemaining = 0;
  private treasureDrone: TreasureDrone | null = null;
  private treasureDroneTimer = 0;
  private treasureDronePending = false;
  private rewardChoiceCrate: RewardChoiceCrate | null = null;
  private rewardChoiceTimer = 0;
  private rewardChoicePending = false;
  private anomalyCrate: AnomalyCrate | null = null;
  private anomalyTimer = 0;
  private anomalyPending = false;
  private anomalyResolutionPending = false;
  private anomalyRiskRatio = 0;
  private luckPity: LuckPityState = createLuckPityState();
  private hiddenDiscovery: HiddenDiscoveryState =
    createHiddenDiscoveryState();
  private stageEvents: StageEventDefinition[] = [];
  private stageObjective: StageObjectiveState | null = null;
  private objectiveHudTimer = 0;
  private stageEventModifiers: StageRandomEventModifiers =
    createStageEventModifiers();
  private statusState: StatusState = createStatusState();
  private hardCcState = createHardCcState();
  private activeSynergies = new Set<BuildSynergyId>();
  private stageElapsedSeconds = 0;
  private hitStopTimer = 0;
  private readonly frameProfiler = new FrameProfiler();
  private lastTime = performance.now();
  private animationFrame = 0;
  private stars: Array<{ x: number; y: number; z: number }> = [];
  private backgroundGradient: CanvasGradient | null = null;
  private worldEnvironment: WorldEnvironmentProfile =
    environmentForWorld("world-01");
  private testLabEnabled = false;
  private testLabDeathMode: TestLabDeathMode = "immortal";
  private testLabLethalHits = 0;
  private testLabTimeScale = 1;
  private testLabSchedulerFrozen = false;

  constructor(
    canvas: HTMLCanvasElement,
    vocabulary: VocabularyEntry[],
    settings: GameSettings,
    hooks: GameHooks,
  ) {
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("Canvas 2D is unavailable.");
    }

    this.canvas = canvas;
    this.context = context;
    this.vocabulary = vocabulary.length > 0 ? vocabulary : FALLBACK_ENTRIES;
    this.settings = settings;
    this.hooks = hooks;
    this.refreshSkillDefinitions();
    this.sfx.setVolume(settings.sfxVolume);
    this.resize();
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  destroy(): void {
    cancelAnimationFrame(this.animationFrame);
    this.sfx.destroy();
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  getStats(): GameStats {
    return { ...this.stats };
  }

  getPerformanceReport(): PerformanceReport {
    return this.frameProfiler.report();
  }

  setTestLabMode(
    enabled: boolean,
    deathMode: TestLabDeathMode = "immortal",
  ): void {
    this.testLabEnabled = enabled;
    this.testLabDeathMode = deathMode;
    if (!enabled) {
      this.testLabLethalHits = 0;
      this.testLabTimeScale = 1;
      this.testLabSchedulerFrozen = false;
    }
  }

  testLabSetDeathMode(mode: TestLabDeathMode): boolean {
    if (!this.testLabEnabled) return false;
    this.testLabDeathMode = mode;
    return true;
  }

  getTestLabSnapshot(): TestLabGameSnapshot | null {
    if (!this.testLabEnabled) return null;
    const difficulty = this.difficulty;
    return {
      phase: this.phase,
      stage: this.stageConfig?.stage ?? null,
      difficulty: difficulty === null ? null : { ...difficulty },
      stats: this.getStats(),
      enemies: this.enemies.map((enemy) => ({
        ...enemy,
        eliteModifiers: [...enemy.eliteModifiers],
        layerPlan:
          enemy.layerPlan === undefined
            ? undefined
            : [...enemy.layerPlan],
        skillIds:
          enemy.skillIds === undefined
            ? undefined
            : [...enemy.skillIds],
        threatBudget:
          enemy.threatBudget === undefined
            ? undefined
            : { ...enemy.threatBudget },
        entry: { ...enemy.entry },
      })),
      boss: this.boss === null ? null : toBossHud(this.boss),
      statuses: this.statusState.map((status) => ({ ...status })),
      projectiles: this.projectiles.length,
      particles: this.particles.length,
      activePressure:
        difficulty === null
          ? emptyActivePressureSnapshot()
          : this.activeTypingPressureSnapshot(difficulty),
      deathMode: this.testLabDeathMode,
      lethalHits: this.testLabLethalHits,
      scheduler: {
        frozen: this.testLabSchedulerFrozen,
        spawnRemaining: this.spawnRemaining,
        spawnTimer: this.spawnTimer,
        timeScale: this.testLabTimeScale,
      },
      skillStates: this.skillEngine.getDefinitions().map((definition) => {
        const state = this.skillEngine.getState(definition.id);
        return {
          id: definition.id,
          cooldownRemaining: state?.cooldownRemaining ?? 0,
          chargesRemaining: state?.chargesRemaining ?? null,
          usesThisStage: state?.usesThisStage ?? 0,
        };
      }),
      objective: this.getStageObjective(),
    };
  }

  testLabSpawnEnemies(input: TestLabEnemySpawn = {}): number[] {
    if (
      !this.testLabEnabled ||
      (this.phase !== "playing" && this.phase !== "paused")
    ) {
      return [];
    }

    const count = clamp(
      Math.floor(input.count ?? 1),
      1,
      30,
    );
    const spawned: number[] = [];
    for (let index = 0; index < count; index += 1) {
      const before = this.nextEnemyId;
      if (
        !this.spawnEnemy({
          kind: input.kind,
          skipAdmission: true,
        })
      ) {
        continue;
      }

      const enemy = this.enemies.find((item) => item.id === before);
      if (enemy === undefined) continue;

      if (input.definitionId !== undefined) {
        enemy.definitionId = input.definitionId;
        this.notifyEnemySeen(input.definitionId);
      }
      if (input.elite !== undefined) {
        enemy.elite = input.elite;
      }
      if (input.rank !== undefined) {
        enemy.rank = input.rank;
      }
      if (input.layers !== undefined) {
        enemy.layersRemaining = input.layers;
        enemy.layerPlan = enemyLayerPlan(enemy.kind, input.layers);
      }
      if (input.skillIds !== undefined) {
        enemy.skillIds = [...new Set(input.skillIds)].slice(0, 3);
        enemy.nextSkillIndex = 0;
        enemy.pendingSkillId = null;
        enemy.skillTelegraphRemaining = 0;
      }
      spawned.push(enemy.id);
    }
    return spawned;
  }

  testLabClearEnemies(): boolean {
    if (!this.testLabEnabled) return false;
    this.enemies = [];
    this.projectiles = [];
    this.targetId = null;
    return true;
  }

  testLabForceEnemySkill(
    enemyId: number,
    skillId: EnemySkillId,
  ): boolean {
    if (!this.testLabEnabled || this.difficulty === null) return false;
    const enemy = this.enemies.find((item) => item.id === enemyId);
    if (enemy === undefined) return false;

    this.executeEnemySkill(enemy, skillId, this.difficulty);
    enemy.actionCooldown = this.enemySkillCooldown(
      skillId,
      this.difficulty,
    );
    enemy.pendingSkillId = null;
    enemy.skillTelegraphRemaining = 0;
    return true;
  }

  testLabApplyStatus(
    id: StatusId,
    duration = 5,
  ): boolean {
    if (!this.testLabEnabled) return false;
    return this.addStatus(
      id,
      clamp(duration, 0.1, 120),
      "test-lab",
    );
  }

  testLabClearStatuses(): boolean {
    if (!this.testLabEnabled) return false;
    this.setStatusState(createStatusState());
    this.hardCcState = createHardCcState();
    return true;
  }

  testLabSetResources(input: {
    hull?: number;
    shield?: number;
    energy?: number;
    power?: number;
  }): boolean {
    if (!this.testLabEnabled) return false;
    if (input.hull !== undefined) {
      this.stats.hull = clamp(input.hull, 0, this.stats.maxHull);
    }
    if (input.shield !== undefined) {
      this.stats.shield = clamp(input.shield, 0, this.stats.maxShield);
    }
    if (input.energy !== undefined) {
      this.stats.energy = clamp(input.energy, 0, this.stats.maxEnergy);
    }
    if (input.power !== undefined) {
      this.stats.power = clamp(input.power, 0, 100);
    }
    this.emitStats();
    return true;
  }

  testLabDamagePlayer(rawDamage: number): boolean {
    if (
      !this.testLabEnabled ||
      (this.phase !== "playing" && this.phase !== "paused")
    ) {
      return false;
    }
    this.applyPlayerDamage(
      this.width / 2,
      this.height - PLAYER_Y_OFFSET,
      Math.max(0, rawDamage),
    );
    return true;
  }

  testLabSpawnBoss(): boolean {
    if (
      !this.testLabEnabled ||
      (this.phase !== "playing" && this.phase !== "paused") ||
      this.boss !== null
    ) {
      return false;
    }
    this.spawnBoss();
    return this.boss !== null;
  }

  testLabSetBoss(input: TestLabBossOverride): boolean {
    if (!this.testLabEnabled || this.boss === null) return false;
    if (input.hpRatio !== undefined) {
      const ratio = clamp(input.hpRatio, 0, 1);
      this.boss.hp = Math.max(
        0,
        Math.round(this.boss.maxHp * ratio),
      );
    }
    if (input.phase !== undefined) {
      this.boss.phase = input.phase;
    }
    if (input.shieldActive !== undefined) {
      this.boss.shieldActive = input.shieldActive;
    }
    if (input.staggerSeconds !== undefined) {
      this.boss.staggerTimer = clamp(
        input.staggerSeconds,
        0,
        120,
      );
    }
    this.hooks.onBossUpdate(toBossHud(this.boss));
    return true;
  }

  testLabClearBoss(): boolean {
    if (!this.testLabEnabled) return false;
    this.boss = null;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.bossRewardPending = false;
    this.projectiles = [];
    this.hooks.onBossUpdate(null);
    return true;
  }

  testLabSetTimeScale(scale: number): boolean {
    if (!this.testLabEnabled) return false;
    this.testLabTimeScale = clamp(
      Number.isFinite(scale) ? scale : 1,
      0.1,
      4,
    );
    return true;
  }

  testLabSetSchedulerFrozen(frozen: boolean): boolean {
    if (!this.testLabEnabled) return false;
    this.testLabSchedulerFrozen = frozen;
    return true;
  }

  testLabStepScheduler(): boolean {
    if (
      !this.testLabEnabled ||
      this.difficulty === null ||
      this.stageConfig === null ||
      this.spawnRemaining <= 0
    ) {
      return false;
    }
    this.spawnTimer = 0;
    return this.runSpawnScheduler(this.difficulty);
  }

  testLabClearProjectiles(): boolean {
    if (!this.testLabEnabled) return false;
    this.projectiles = [];
    this.lasers = [];
    return true;
  }

  testLabClearParticles(): boolean {
    if (!this.testLabEnabled) return false;
    this.particles = [];
    return true;
  }

  testLabResetSkillCooldowns(): boolean {
    if (!this.testLabEnabled) return false;
    this.skillEngine.resetStage();
    this.hooks.onSkills();
    return true;
  }

  testLabForceWordComplete(enemyId: number): boolean {
    if (!this.testLabEnabled) return false;
    const enemy = this.enemies.find((item) => item.id === enemyId);
    if (enemy === undefined) return false;
    enemy.typed = typingText(enemy.entry.en).length;
    this.completeWord(enemy);
    this.emitStats();
    return true;
  }

  testLabKillEnemy(enemyId: number): boolean {
    if (!this.testLabEnabled) return false;
    let enemy = this.enemies.find((item) => item.id === enemyId);
    if (enemy === undefined) return false;
    let guard = 0;
    while (enemy !== undefined && guard < 4) {
      enemy.typed = typingText(enemy.entry.en).length;
      this.completeWord(enemy);
      enemy = this.enemies.find((item) => item.id === enemyId);
      guard += 1;
    }
    this.emitStats();
    return true;
  }

  testLabResetArena(): boolean {
    if (!this.testLabEnabled) return false;
    this.enemies = [];
    this.projectiles = [];
    this.lasers = [];
    this.particles = [];
    this.targetId = null;
    this.boss = null;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.bossRewardPending = false;
    this.testLabLethalHits = 0;
    this.setStatusState(createStatusState());
    this.hardCcState = createHardCcState();
    this.hooks.onBossUpdate(null);
    return true;
  }

  setCharacter(id: CharacterId): void {
    if (this.characterId === id) return;
    this.characterId = id;
    this.refreshSkillDefinitions();
    this.hooks.onSkills();
  }

  setSkills(definitions: readonly SkillDefinition[]): void {
    this.skillEngine.setDefinitions(definitions);
  }

  setSkillLevels(
    levels: Partial<Record<UpgradeableSkillId, number>>,
  ): void {
    const next = { ...this.skillLevels };
    for (const id of UPGRADEABLE_SKILL_IDS) {
      const value = levels[id];
      next[id] =
        typeof value === "number" && Number.isFinite(value)
          ? clamp(Math.floor(value), 1, 5)
          : 1;
    }
    this.skillLevels = next;
    this.refreshSkillDefinitions();
    this.hooks.onSkills();
  }

  setRelicEffects(effects: CompiledRelicEffects): void {
    this.relicEffects = {
      ...EMPTY_COMPILED_RELIC_EFFECTS,
      ...effects,
    };
  }

  setSupportSpells(ids: readonly SupportSpellId[]): void {
    this.supportSkillIds = Array.from(
      new Set(ids.filter(isSupportSpellId)),
    ).slice(0, 2);
    this.refreshSkillDefinitions();
    this.hooks.onSkills();
  }

  private refreshSkillDefinitions(): void {
    const supportDefinitions = this.supportSkillIds.map(getSupportSpell);
    const characterDefinitions =
      this.characterId === "vanguard"
        ? [VANGUARD_ACTIVE_SKILL]
        : this.characterId === "aegis"
          ? [AEGIS_ACTIVE_SKILL]
          : this.characterId === "volt"
            ? [VOLT_ACTIVE_SKILL]
            : this.characterId === "wraith"
              ? [WRAITH_ACTIVE_SKILL]
              : this.characterId === "fortune"
                ? [FORTUNE_ACTIVE_SKILL]
                : this.characterId === "arsenal"
                  ? [ARSENAL_ACTIVE_SKILL]
                  : this.characterId === "oracle"
                    ? [ORACLE_ACTIVE_SKILL]
                    : this.characterId === "bastion"
                      ? [BASTION_ACTIVE_SKILL]
                      : this.characterId === "reaper"
                        ? [REAPER_ACTIVE_SKILL]
                        : this.characterId === "celestial"
                          ? [CELESTIAL_ACTIVE_SKILL]
                          : this.characterId === "zenith"
                            ? [ZENITH_ACTIVE_SKILL]
                            : [];

    const coreDefinitions =
      resolveSkillDefinitionsForLevels(
        [...DEFENSIVE_SKILLS, ...OFFENSIVE_SKILLS],
        this.skillLevels,
      );

    this.skillEngine.setDefinitions([
      ...characterDefinitions,
      ...coreDefinitions,
      ...supportDefinitions,
    ]);
  }

  getSkillState(id: string): SkillRuntimeState | null {
    return this.skillEngine.getState(id);
  }

  getSkillDefinition(id: string): SkillDefinition | null {
    return this.skillEngine.getDefinition(id);
  }

  private coreSkillEffectScale(id: UpgradeableSkillId): number {
    return this.skillEngine.getDefinition(id)?.effectScale ?? 1;
  }

  private coreSkillMastery(id: UpgradeableSkillId): boolean {
    return this.skillEngine.getDefinition(id)?.masteryUnlocked === true;
  }

  canUseSkill(id: string): SkillBlockReason | null {
    if (this.phase !== "playing") return "unknown-skill";
    if (statusRemaining(this.statusState, "silenced") > 0) {
      return "silenced";
    }

    if (
      id === "emergency-repair" &&
      this.stats.hull >= this.stats.maxHull &&
      this.stats.shield >= this.stats.maxShield
    ) {
      return "effect-not-needed";
    }

    if (
      id === FORTUNE_ACTIVE_SKILL_ID &&
      this.stats.power >= 100 &&
      this.stats.shield >= this.stats.maxShield
    ) {
      return "effect-not-needed";
    }

    if (
      (id === "emp-burst" || id === VOLT_ACTIVE_SKILL_ID) &&
      this.projectiles.length === 0 &&
      this.enemies.length === 0 &&
      this.boss === null
    ) {
      return "effect-not-needed";
    }

    if (
      id === "chain-lightning" &&
      this.enemies.length === 0 &&
      this.boss === null
    ) {
      return "effect-not-needed";
    }

    if (
      (id === "mark-of-weakness" || id === ORACLE_ACTIVE_SKILL_ID) &&
      this.currentTarget() === null &&
      this.enemies.length === 0 &&
      this.boss === null
    ) {
      return "effect-not-needed";
    }

    if (
      id === REAPER_ACTIVE_SKILL_ID &&
      this.currentTarget() === null &&
      this.enemies.length === 0 &&
      this.boss === null
    ) {
      return "effect-not-needed";
    }

    if (
      id === "cleanse" &&
      this.interferenceTimer <= 0 &&
      !hasCleanseableNegativeStatus(this.statusState)
    ) {
      return "effect-not-needed";
    }

    if (
      id === "meteor" &&
      this.enemies.length === 0 &&
      this.boss === null
    ) {
      return "effect-not-needed";
    }

    return this.skillEngine.canActivate(id, {
      energy: this.stats.energy,
      streak: this.stats.streak,
      hits: this.stats.hits,
      misses: this.stats.misses,
    });
  }

  useSkill(id: string): SkillActivationResult {
    const blocked = this.canUseSkill(id);
    if (blocked !== null) {
      return {
        ok: false,
        reason: blocked,
        energy: this.stats.energy,
        state: this.skillEngine.getState(id),
      };
    }

    const result = this.tryUseSkill(id);
    if (!result.ok) return result;

    if (
      id === VANGUARD_ACTIVE_SKILL_ID &&
      this.characterId === "vanguard"
    ) {
      this.activateVanguardSkill();
    } else if (
      id === AEGIS_ACTIVE_SKILL_ID &&
      this.characterId === "aegis"
    ) {
      this.activateAegisSkill();
    } else if (
      id === VOLT_ACTIVE_SKILL_ID &&
      this.characterId === "volt"
    ) {
      this.activateVoltSkill();
    } else if (
      id === WRAITH_ACTIVE_SKILL_ID &&
      this.characterId === "wraith"
    ) {
      this.activateWraithSkill();
    } else if (
      id === FORTUNE_ACTIVE_SKILL_ID &&
      this.characterId === "fortune"
    ) {
      this.activateFortuneSkill();
    } else if (
      id === ARSENAL_ACTIVE_SKILL_ID &&
      this.characterId === "arsenal"
    ) {
      this.activateArsenalSkill();
    } else if (
      id === ORACLE_ACTIVE_SKILL_ID &&
      this.characterId === "oracle"
    ) {
      this.activateOracleSkill();
    } else if (
      id === BASTION_ACTIVE_SKILL_ID &&
      this.characterId === "bastion"
    ) {
      this.activateBastionSkill();
    } else if (
      id === REAPER_ACTIVE_SKILL_ID &&
      this.characterId === "reaper"
    ) {
      this.activateReaperSkill();
    } else if (
      id === CELESTIAL_ACTIVE_SKILL_ID &&
      this.characterId === "celestial"
    ) {
      this.activateCelestialSkill();
    } else if (
      id === ZENITH_ACTIVE_SKILL_ID &&
      this.characterId === "zenith"
    ) {
      this.activateZenithSkill();
    } else if (isDefensiveSkillId(id)) {
      this.activateDefensiveSkill(id);
    } else if (isOffensiveSkillId(id)) {
      this.activateOffensiveSkill(id);
    } else if (isSupportSpellId(id)) {
      this.activateSupportSpell(id);
    }

    this.hooks.onSkills();
    return result;
  }

  tryUseSkill(id: string): SkillActivationResult {
    if (this.phase !== "playing") {
      return {
        ok: false,
        reason: "unknown-skill",
        energy: this.stats.energy,
        state: this.skillEngine.getState(id),
      };
    }

    const result = this.skillEngine.activate(id, {
      energy: this.stats.energy,
      streak: this.stats.streak,
      hits: this.stats.hits,
      misses: this.stats.misses,
    });

    if (result.ok) {
      this.stats.energy = result.energy;
      this.emitStats();
    }

    return result;
  }

  private activateVanguardSkill(): void {
    const playerX = this.width / 2;
    const playerY = this.height - PLAYER_Y_OFFSET;

    this.barrierHp = Math.max(
      this.barrierHp,
      90 + this.playerStats.shield * 0.55,
    );
    this.barrierTimer = Math.max(
      this.barrierTimer,
      VANGUARD_ACTIVE_BARRIER_DURATION,
    );
    this.stats.shield = restoreVanguardShield(
      this.stats.shield,
      this.stats.maxShield,
      VANGUARD_ACTIVE_BARRIER_SHIELD_RATIO,
    );

    this.burst(playerX, playerY, 38, 188);
    this.sfx.power();
    this.emitStats();
  }

  private activateAegisSkill(): void {
    this.reflectTimer = Math.max(
      this.reflectTimer,
      AEGIS_REFLECT_DURATION,
    );
    this.burst(
      this.width / 2,
      this.height - PLAYER_Y_OFFSET,
      36,
      300,
    );
    this.sfx.power();
  }

  private activateVoltSkill(): void {
    this.activateEmpPulse(VOLT_EMP_DELAY);
  }

  private activateWraithSkill(): void {
    this.cloakTimer = Math.max(this.cloakTimer, WRAITH_ACTIVE_CLOAK_DURATION);
    this.burst(this.width / 2, this.height - PLAYER_Y_OFFSET, 30, 274);
    this.sfx.support();
  }

  private activateFortuneSkill(): void {
    this.stats.power = fortunePower(this.stats.power);
    this.stats.shield = clamp(
      this.stats.shield + this.stats.maxShield * FORTUNE_ACTIVE_SHIELD_RATIO,
      0,
      this.stats.maxShield,
    );
    this.burst(this.width / 2, this.height - PLAYER_Y_OFFSET, 28, 48);
    this.sfx.support();
    this.emitStats();
  }

  private activateArsenalSkill(): void {
    this.weaponOverclockTimer = Math.max(
      this.weaponOverclockTimer,
      ARSENAL_OVERCLOCK_DURATION,
    );
    this.burst(this.width / 2, this.height - PLAYER_Y_OFFSET, 30, 18);
    this.sfx.power();
  }

  private activateOracleSkill(): void {
    this.activateMarkOfWeakness(ORACLE_MARK_DURATION);
  }

  private activateBastionSkill(): void {
    this.guardianTimer = Math.max(
      this.guardianTimer,
      BASTION_MATRIX_DURATION,
    );
    this.guardianBlocks = Math.max(
      this.guardianBlocks,
      BASTION_MATRIX_BLOCKS,
    );
    this.burst(this.width / 2, this.height - PLAYER_Y_OFFSET, 30, 164);
    this.sfx.support();
  }

  private activateReaperSkill(): void {
    if (this.boss !== null) {
      const damage = firepowerDamage(
        Math.max(
          1,
          Math.round(this.boss.maxHp * REAPER_EXECUTE_BOSS_RATIO),
        ),
        this.playerStats,
      ) * reaperStreakDamageMultiplier(this.stats.streak);
      this.boss.hp = Math.max(0, this.boss.hp - damage);
      this.boss.flash = 1;
      this.updateBossPhase(this.boss);
      this.hooks.onBossUpdate(toBossHud(this.boss));
      if (this.boss.hp <= 0) this.defeatBoss();
      this.sfx.power();
      return;
    }

    const target =
      this.currentTarget() ??
      [...this.enemies].sort((a, b) => b.y - a.y)[0] ??
      null;
    if (target === null) return;

    const wordLength = typingText(target.entry.en).length;
    target.typed = Math.min(
      Math.max(0, wordLength - 1),
      target.typed + REAPER_EXECUTE_ADVANCE,
    );
    target.flash = 1;
    target.kick = Math.max(target.kick, 1.2);
    this.burst(target.x, target.y, 22, 350);
    this.sfx.power();
  }

  private activateCelestialSkill(): void {
    const chargeFactor = this.celestialCharge / 100;
    if (this.stats.shield < this.stats.maxShield * 0.55) {
      this.stats.shield = clamp(
        this.stats.shield +
          this.stats.maxShield * (0.18 + chargeFactor * 0.22),
        0,
        this.stats.maxShield,
      );
      this.barrierHp = Math.max(
        this.barrierHp,
        45 + this.playerStats.shield * chargeFactor * 0.35,
      );
      this.barrierTimer = Math.max(this.barrierTimer, 4);
    } else {
      this.overdriveTimer = Math.max(
        this.overdriveTimer,
        CELESTIAL_STANCE_DURATION,
      );
      this.bossMarkTimer = Math.max(
        this.bossMarkTimer,
        3 + chargeFactor * 4,
      );
    }

    this.stats.energy = clamp(
      this.stats.energy + this.stats.maxEnergy * (0.1 + chargeFactor * 0.12),
      0,
      this.stats.maxEnergy,
    );
    this.celestialCharge = spendCelestialCharge(this.celestialCharge);
    this.burst(this.width / 2, this.height - PLAYER_Y_OFFSET, 34, 220);
    this.sfx.support();
    this.emitStats();
  }

  private activateZenithSkill(): void {
    this.overdriveTimer = Math.max(
      this.overdriveTimer,
      ZENITH_SHIFT_DURATION,
    );
    this.timeShellTimer = Math.max(this.timeShellTimer, 2.5);
    this.stats.shield = clamp(
      this.stats.shield + this.stats.maxShield * 0.16,
      0,
      this.stats.maxShield,
    );
    this.stats.energy = clamp(
      this.stats.energy + this.stats.maxEnergy * 0.2,
      0,
      this.stats.maxEnergy,
    );
    this.burst(this.width / 2, this.height - PLAYER_Y_OFFSET, 38, 190);
    this.sfx.power();
    this.emitStats();
  }

  private activateEmpPulse(actionDelay: number): void {
    const clearedProjectiles = this.projectiles.length;
    this.projectiles = [];

    for (const enemy of this.enemies) {
      enemy.flash = 1;
      enemy.kick = Math.max(enemy.kick, 0.7);
      if (enemy.actionCooldown !== null) {
        enemy.actionCooldown += actionDelay;
      }
    }

    if (this.boss !== null) {
      this.boss.flash = 1;
      this.boss.actionCooldown += actionDelay;
    }

    this.interferenceTimer = 0;
    this.burst(
      this.width / 2,
      this.height * 0.44,
      36 + Math.min(24, clearedProjectiles * 3),
      192,
    );
    this.sfx.power();
  }

  private activateDefensiveSkill(id: DefensiveSkillId): void {
    const playerX = this.width / 2;
    const playerY = this.height - PLAYER_Y_OFFSET;
    const effectScale = this.coreSkillEffectScale(id);
    const mastery = this.coreSkillMastery(id);

    if (id === "barrier") {
      this.barrierHp = Math.max(
        this.barrierHp,
        (72 + this.playerStats.shield * 0.45) * effectScale,
      );
      const duration = 7 * effectScale;
      this.barrierTimer = Math.max(this.barrierTimer, duration);
      this.addStatus("fortified", duration, "skill:barrier");
      if (mastery) {
        this.stats.shield = clamp(
          this.stats.shield + this.stats.maxShield * 0.1,
          0,
          this.stats.maxShield,
        );
      }
      this.burst(playerX, playerY, 28, 188);
      this.sfx.support();
    } else if (id === "reflect-field") {
      this.reflectTimer = Math.max(
        this.reflectTimer,
        4.5 * effectScale,
      );
      this.burst(playerX, playerY, 30, 300);
      this.sfx.power();
    } else if (id === "time-shell") {
      this.timeShellTimer = Math.max(
        this.timeShellTimer,
        5 * effectScale,
      );
      this.burst(playerX, playerY, 34, 258);
      this.sfx.support();
    } else if (id === "emergency-repair") {
      const repaired = emergencyRepair(
        {
          hull: this.stats.hull,
          shield: this.stats.shield,
          energy: this.stats.energy,
        },
        {
          hull: this.stats.maxHull,
          shield: this.stats.maxShield,
          energy: this.stats.maxEnergy,
        },
        effectScale,
      );
      this.stats.hull = repaired.hull;
      this.stats.shield = repaired.shield;
      this.stats.energy = repaired.energy;
      this.burst(playerX, playerY, 34, 138);
      this.sfx.support();
    } else {
      this.guardianTimer = Math.max(
        this.guardianTimer,
        12 * effectScale,
      );
      this.guardianBlocks = Math.max(
        this.guardianBlocks,
        3 + (mastery ? 1 : 0),
      );
      this.burst(playerX, playerY, 26, 48);
      this.sfx.support();
    }

    this.emitStats();
  }

  private activateOffensiveSkill(id: OffensiveSkillId): void {
    const effectScale = this.coreSkillEffectScale(id);
    const mastery = this.coreSkillMastery(id);

    if (id === "emp-burst") {
      this.activateEmpPulse(2.5 * effectScale);
      if (mastery) {
        this.skillEngine.reduceCooldowns(1.25);
      }
      return;
    }

    if (id === "chain-lightning") {
      const chainTargets =
        (this.hasBuildSynergy("arc-circuit") ? 6 : 4) +
        Math.floor((effectScale - 1) * 4) +
        (mastery ? 1 : 0);
      const targets = [...this.enemies]
        .sort((a, b) => b.y - a.y)
        .slice(0, chainTargets);

      for (const enemy of targets) {
        const wordLength = typingText(enemy.entry.en).length;

        if (enemy.layersRemaining > 1) {
          enemy.layersRemaining -= 1;
        } else {
          enemy.typed = chainTypingAdvance(
            enemy.typed,
            wordLength,
          );
        }

        enemy.flash = 1;
        enemy.kick = Math.max(enemy.kick, 1.1);
        this.burst(enemy.x, enemy.y, 16, 202);
      }

      if (this.boss !== null && targets.length === 0) {
        const damage = firepowerDamage(
          Math.max(
            1,
            Math.round(
              this.boss.maxHp *
                (this.hasBuildSynergy("arc-circuit") ? 0.05 : 0.04) *
                  effectScale,
            ),
          ),
          this.playerStats,
        );
        this.boss.hp = Math.max(0, this.boss.hp - damage);
        this.boss.flash = 1;
        this.updateBossPhase(this.boss);
        this.hooks.onBossUpdate(toBossHud(this.boss));

        if (this.boss.hp <= 0) {
          this.defeatBoss();
        }
      }

      this.sfx.power();
      return;
    }

    this.activateMarkOfWeakness(
      (this.hasBuildSynergy("oracle-lens") ? 11 : 8) *
        effectScale +
        (mastery ? 2 : 0),
    );
  }

  private activateMarkOfWeakness(duration: number): void {
    if (this.boss !== null) {
      this.bossMarkTimer = Math.max(this.bossMarkTimer, duration);
      this.boss.flash = 1;
      this.hooks.onBossUpdate(toBossHud(this.boss));
      this.sfx.support();
      return;
    }

    const target =
      this.currentTarget() ??
      [...this.enemies].sort((a, b) => b.y - a.y)[0] ??
      null;

    if (target !== null) {
      this.markedEnemyId = target.id;
      this.markTimer = Math.max(this.markTimer, duration);

      if (target.layersRemaining > 1) {
        target.layersRemaining -= 1;
      }

      target.flash = 1;
      target.kick = Math.max(target.kick, 1);
      this.burst(target.x, target.y, 22, 326);
      this.sfx.support();
    }
  }

  private activateSupportSpell(id: SupportSpellId): void {
    const playerX = this.width / 2;
    const playerY = this.height - PLAYER_Y_OFFSET;

    if (id === "sanctuary") {
      const sanctuaryBoost = this.hasBuildSynergy("sanctuary-matrix")
        ? 1.2
        : 1;
      this.stats.shield = clamp(
        this.stats.shield +
          this.stats.maxShield * 0.35 * sanctuaryBoost,
        0,
        this.stats.maxShield,
      );
      this.barrierHp = Math.max(
        this.barrierHp,
        (50 + this.playerStats.shield * 0.25) * sanctuaryBoost,
      );
      const sanctuaryDuration = this.hasBuildSynergy(
        "sanctuary-matrix",
      )
        ? 8
        : 6;
      this.barrierTimer = Math.max(
        this.barrierTimer,
        sanctuaryDuration,
      );
      this.addStatus(
        "fortified",
        sanctuaryDuration,
        "support:sanctuary",
      );
      this.burst(playerX, playerY, 34, 164);
      this.sfx.support();
      this.emitStats();
      return;
    }

    if (id === "gravity-well") {
      this.gravityWellTimer = Math.max(this.gravityWellTimer, 5);
      this.burst(this.width / 2, this.height * 0.42, 42, 270);
      this.sfx.power();
      return;
    }

    if (id === "cleanse") {
      this.setStatusState(
        cleanseNegativeStatuses(this.statusState),
      );
      this.interferenceTimer = 0;
      this.burst(playerX, playerY, 24, 176);
      this.sfx.support();
      return;
    }

    const targets = [...this.enemies]
      .sort((a, b) => b.y - a.y)
      .slice(0, 3);

    for (const enemy of targets) {
      const wordLength = typingText(enemy.entry.en).length;

      if (enemy.layersRemaining > 1) {
        enemy.layersRemaining -= 1;
      } else if (wordLength > 1) {
        enemy.typed = Math.min(
          wordLength - 1,
          Math.max(0, enemy.typed) + 1,
        );
      }

      enemy.flash = 1;
      enemy.kick = Math.max(enemy.kick, 1.25);
      this.burst(enemy.x, enemy.y, 20, 28);
    }

    if (this.boss !== null && targets.length === 0) {
      const damage = firepowerDamage(
        Math.max(1, Math.round(this.boss.maxHp * 0.03)),
        this.playerStats,
      );
      this.boss.hp = Math.max(0, this.boss.hp - damage);
      this.boss.flash = 1;
      this.updateBossPhase(this.boss);
      this.hooks.onBossUpdate(toBossHud(this.boss));

      if (this.boss.hp <= 0) {
        this.defeatBoss();
      }
    }

    this.sfx.power();
  }

  useConsumable(id: string): boolean {
    if (
      this.phase !== "playing" ||
      !isRecoveryItemId(id)
    ) {
      return false;
    }

    return this.useRecoveryConsumable(id);
  }

  private useRecoveryConsumable(id: RecoveryItemId): boolean {
    const result = useRecoveryItem(
      id,
      {
        hull: this.stats.hull,
        shield: this.stats.shield,
        energy: this.stats.energy,
      },
      {
        hull: this.stats.maxHull,
        shield: this.stats.maxShield,
        energy: this.stats.maxEnergy,
      },
    );

    if (!result.applied) return false;

    this.stats.hull = result.resources.hull;
    this.stats.shield = result.resources.shield;
    this.stats.energy = result.resources.energy;

    const hue =
      id === "repair-kit"
        ? 142
        : id === "shield-cell"
          ? 190
          : 48;
    this.burst(
      this.width / 2,
      this.height - PLAYER_Y_OFFSET,
      22,
      hue,
    );
    this.sfx.support();
    this.emitStats();
    return true;
  }

  setPlayerStats(input: EffectiveStatInput): void {
    this.playerStats = calculateEffectiveStats(input);

    if (this.phase !== "playing" && this.phase !== "paused") {
      this.stats = this.createGameStats(this.stats.stage);
      this.emitStats();
    }
  }

  getPlayerStats(): CoreStats {
    return { ...this.playerStats };
  }

  getStageObjective(): StageObjectiveState | null {
    return this.stageObjective === null
      ? null
      : {
          ...this.stageObjective,
          definition: { ...this.stageObjective.definition },
        };
  }

  getStageElapsedSeconds(): number {
    return this.stageElapsedSeconds;
  }

  setLuckPityState(state: LuckPityState): void {
    this.luckPity = sanitizeLuckPityState(state);
  }

  setHiddenDiscoveryState(state: HiddenDiscoveryState): void {
    this.hiddenDiscovery = sanitizeHiddenDiscoveryState(state);
  }

  setBuildSynergies(ids: readonly BuildSynergyId[]): void {
    this.activeSynergies = new Set(ids);
  }

  private hasBuildSynergy(id: BuildSynergyId): boolean {
    return this.activeSynergies.has(id);
  }

  private setStatusState(state: StatusState): void {
    this.statusState = state;
    this.interferenceTimer = statusRemaining(state, "jammed");
    this.hooks.onStatuses(state);
  }

  private addStatus(
    id: ActiveStatus["id"],
    duration: number,
    source: string,
    useWard = false,
  ): boolean {
    const result = applyStatus(
      this.statusState,
      { id, duration, source },
      useWard ? this.playerStats.ward : 0,
    );
    this.setStatusState(result.state);
    return result.applied;
  }

  setVocabulary(entries: VocabularyEntry[]): void {
    if (entries.length === 0) return;
    this.vocabulary = entries;
    this.enemies = [];
    this.targetId = null;
    this.spawnTimer = 0.2;
  }

  setVocabularyLevel(level: number): void {
    this.vocabularyLevel = clamp(
      Number.isFinite(level) ? Math.floor(level) : 1,
      1,
      100,
    );
  }

  updateSettings(settings: GameSettings): void {
    const qualityChanged =
      this.settings.visualQuality !== settings.visualQuality;
    this.settings = settings;
    this.sfx.setVolume(settings.sfxVolume);
    if (qualityChanged) this.resize();
  }

  startStage(
    stage: StageConfig,
    difficulty: DifficultyProfile,
    hiddenEncounterRuntime: HiddenEncounterRuntime | null = null,
  ): void {
    this.sfx.unlock();
    this.stageConfig = stage;
    this.difficulty = difficulty;
    this.hiddenEncounterRuntime = hiddenEncounterRuntime;
    this.priorityKillChain.setWindowSeconds(
      hiddenEncounterRuntime?.killChainWindowSeconds ?? 8,
    );
    const environmentStage =
      hiddenEncounterRuntime?.environmentStageOverride ??
      stage.stage;
    const nextEnvironment = environmentForWorld(
      worldForStage(environmentStage),
    );
    if (nextEnvironment.id !== this.worldEnvironment.id) {
      this.worldEnvironment = nextEnvironment;
      this.backgroundGradient = null;
      this.seedStars();
    }

    if (hiddenEncounterRuntime === null) {
      const hiddenRoll = rollHiddenDiscovery(
        this.hiddenDiscovery,
        stage.stage,
        this.playerStats.luck,
      );
      if (hiddenRoll.rolled) {
        this.hiddenDiscovery = hiddenRoll.state;
        this.hooks.onHiddenDiscoveryUpdate(
          hiddenRoll.state,
          hiddenRoll.discovery,
        );
      }
    }

    this.stageEvents = [
      ...galaxyStageModifiers(stage),
      ...scheduleStageRandomEvents(
        stage,
        this.playerStats.luck,
      ),
    ];
    this.stageEventModifiers = combineStageEventEffects(
      this.stageEvents,
    );
    this.hooks.onStageEvents(this.stageEvents);
    const objectiveDefinition =
      hiddenEncounterRuntime === null
        ? objectiveForStage(stage, difficulty)
        : null;
    this.stageObjective =
      objectiveDefinition === null
        ? null
        : createStageObjectiveState(objectiveDefinition);
    this.objectiveHudTimer = 0;
    this.hooks.onObjectiveUpdate(this.getStageObjective());

    this.phase = "playing";
    this.stageElapsedSeconds = 0;
    this.priorityKillChain.reset();
    this.relicFirstWordTriggered = false;
    this.relicMistakeGuardsUsed = 0;
    this.stats = this.createGameStats(stage.stage);
    this.stats.shield = Math.min(
      this.stats.maxShield,
      this.stats.shield *
        this.stageEventModifiers.startingShieldMultiplier,
    );
    this.secondsSinceDamage = Number.POSITIVE_INFINITY;
    this.resourceEmitTimer = 0;
    this.skillEngine.resetStage();
    this.enemies = [];
    this.projectiles = [];
    this.lasers = [];
    this.particles = [];
    this.targetId = null;
    this.supplyPod = null;
    this.supplySpawnTimer = randomBetween(5.5, 8.5);
    this.supplySpawnsRemaining =
      (stage.stage >= 500 ? 2 : 1) *
      this.stageEventModifiers.supplyMultiplier;
    this.treasureDrone = null;
    this.treasureDroneTimer = randomBetween(9, 14);
    this.treasureDronePending = this.rollPityEvent(
      "treasure",
      treasureDroneChance(stage.stage),
      0.32,
    );
    this.rewardChoiceCrate = null;
    this.rewardChoiceTimer = randomBetween(14, 20);
    this.rewardChoicePending = this.rollPityEvent(
      "choice",
      rewardChoiceCrateChance(stage.stage),
      0.25,
    );
    this.anomalyCrate = null;
    this.anomalyTimer = randomBetween(18, 24);
    this.anomalyPending = this.rollPityEvent(
      "anomaly",
      anomalyCrateChance(stage.stage),
      0.2,
    );
    this.anomalyResolutionPending = false;
    this.anomalyRiskRatio = 0;
    this.spawnRemaining = Math.max(
      1,
      Math.round(
        stage.enemyBudget *
          (hiddenEncounterRuntime?.enemyBudgetMultiplier ?? 1),
      ),
    );
    this.spawnTimer = 0.3;
    this.eliteSpawned = 0;
    this.boss = null;
    this.bossHudTimer = 0;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.bossRewardPending = false;
    this.overdriveTimer = 0;
    this.interferenceTimer = 0;
    this.barrierTimer = 0;
    this.barrierHp = 0;
    this.reflectTimer = 0;
    this.timeShellTimer = 0;
    this.guardianTimer = 0;
    this.guardianBlocks = 0;
    this.markedEnemyId = null;
    this.markTimer = 0;
    this.bossMarkTimer = 0;
    this.gravityWellTimer = 0;
    this.cloakTimer = 0;
    this.phoenixGraceTimer = 0;
    this.weaponOverclockTimer = 0;
    this.rewardScoreMultiplierTimer = 0;
    this.rewardCreditsMultiplierTimer = 0;
    this.rewardNotice = null;
    this.celestialCharge = 0;
    this.statusState = createStatusState();
    this.hardCcState = createHardCcState();
    this.interferenceTimer = 0;
    this.hitStopTimer = 0;
    this.skillHudTimer = 0;
    this.hooks.onBossUpdate(null);
    this.hooks.onStatuses(this.statusState);
    this.hooks.onSkills();
    this.hooks.onPhase(this.phase);
    this.hooks.onStats(this.getStats());
    this.hooks.onStage(stage.stage);
  }

  reviveCurrentEncounter(): boolean {
    if (
      this.phase !== "gameover" ||
      this.stageConfig === null ||
      this.stats.hull > 0
    ) {
      return false;
    }

    const revived = phoenixReviveResources(
      this.stats.maxHull,
      this.stats.maxShield,
      this.stats.maxEnergy,
    );
    this.stats.hull = revived.hull;
    this.stats.shield = revived.shield;
    this.stats.energy = revived.energy;
    this.stats.streak = 0;
    this.stats.multiplier = 1;
    this.secondsSinceDamage = 0;
    this.phoenixGraceTimer = PHOENIX_REVIVE_GRACE_SECONDS;
    this.projectiles = [];
    this.phase = "playing";
    this.lastTime = performance.now();

    this.burst(
      this.width / 2,
      this.height - PLAYER_Y_OFFSET,
      54,
      28,
    );
    if (this.settings.screenShake) {
      this.shake = Math.max(this.shake, 7);
    }
    this.sfx.power();
    this.emitStats();
    this.hooks.onPhase(this.phase);
    return true;
  }

  pause(): void {
    if (this.phase !== "playing") return;
    this.phase = "paused";
    this.hooks.onPhase(this.phase);
  }

  resume(): void {
    if (this.phase !== "paused") return;
    this.phase = "playing";
    this.lastTime = performance.now();
    this.hooks.onPhase(this.phase);
  }

  togglePause(): void {
    if (this.phase === "playing") {
      this.pause();
    } else if (this.phase === "paused") {
      this.resume();
    }
  }

  backToTitle(): void {
    this.phase = "title";
    this.enemies = [];
    this.projectiles = [];
    this.lasers = [];
    this.particles = [];
    this.targetId = null;
    this.supplyPod = null;
    this.supplySpawnsRemaining = 0;
    this.treasureDrone = null;
    this.treasureDronePending = false;
    this.rewardChoiceCrate = null;
    this.rewardChoicePending = false;
    this.anomalyCrate = null;
    this.anomalyPending = false;
    this.anomalyResolutionPending = false;
    this.anomalyRiskRatio = 0;
    this.boss = null;
    this.bossRewardPending = false;
    this.hooks.onBossUpdate(null);
    this.hooks.onPhase(this.phase);
  }

  handleKey(rawKey: string): void {
    if (rawKey === "Escape") {
      this.togglePause();
      return;
    }

    if (this.phase !== "playing") return;

    if (rawKey === " ") {
      this.activateOverdrive();
      return;
    }

    if (
      rawKey.length === 1 &&
      statusRemaining(this.statusState, "frozen") > 0
    ) {
      return;
    }

    if (rawKey.length !== 1) return;

    const key = rawKey.toLocaleLowerCase("en-US");
    if (!/^[a-z]$/.test(key)) return;

    this.sfx.unlock();
    const target = this.currentTarget();

    if (target !== null) {
      this.typeTarget(target, key);
      return;
    }

    if (this.supplyPod !== null && this.supplyPod.typed > 0) {
      this.typeSupplyPod(this.supplyPod, key);
      return;
    }

    if (this.treasureDrone !== null && this.treasureDrone.typed > 0) {
      this.typeTreasureDrone(this.treasureDrone, key);
      return;
    }

    if (
      this.rewardChoiceCrate !== null &&
      this.rewardChoiceCrate.typed > 0
    ) {
      this.typeRewardChoiceCrate(this.rewardChoiceCrate, key);
      return;
    }

    if (this.anomalyCrate !== null && this.anomalyCrate.typed > 0) {
      this.typeAnomalyCrate(this.anomalyCrate, key);
      return;
    }

    const projectile = this.findProjectileForKey(key);
    if (projectile !== null) {
      this.destroyProjectile(projectile);
      return;
    }

    if (this.boss !== null && this.boss.typed > 0) {
      this.typeBoss(key);
      return;
    }

    if (
      this.supplyPod !== null &&
      typingText(this.supplyPod.entry.en)[0] === key
    ) {
      this.typeSupplyPod(this.supplyPod, key);
      return;
    }

    if (
      this.treasureDrone !== null &&
      typingText(this.treasureDrone.entry.en)[0] === key
    ) {
      this.typeTreasureDrone(this.treasureDrone, key);
      return;
    }

    if (
      this.rewardChoiceCrate !== null &&
      typingText(this.rewardChoiceCrate.entry.en)[0] === key
    ) {
      this.typeRewardChoiceCrate(this.rewardChoiceCrate, key);
      return;
    }

    if (
      this.anomalyCrate !== null &&
      typingText(this.anomalyCrate.entry.en)[0] === key
    ) {
      this.typeAnomalyCrate(this.anomalyCrate, key);
      return;
    }

    if (this.boss !== null) {
      this.typeBoss(key);
      return;
    }

    const candidate = chooseTarget(
      this.enemies,
      key,
      this.width / 2,
      this.height - PLAYER_Y_OFFSET,
    );

    if (candidate === null) {
      this.registerMiss();
      return;
    }

    this.targetId = candidate.id;
    this.typeTarget(candidate, key);
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(640, rect.width || window.innerWidth);
    this.height = Math.max(420, rect.height || window.innerHeight);
    const profile = qualityProfile(this.settings.visualQuality);
    this.dpr = resolveRenderDpr(
      profile,
      window.devicePixelRatio || 1,
      this.width,
      this.height,
    );

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.backgroundGradient = null;
    this.seedStars();
  }

  private frame = (now: number): void => {
    const rawDt = Math.max(0, (now - this.lastTime) / 1000);
    const dt =
      Math.min(0.05, rawDt) *
      (this.testLabEnabled ? this.testLabTimeScale : 1);
    this.lastTime = now;
    this.frameProfiler.pushFrame(rawDt);

    if (this.phase === "playing") {
      this.stageElapsedSeconds += dt;
      if (this.hitStopTimer > 0) {
        this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);
        this.updateEffects(dt);
      } else {
        this.update(dt);
      }
    } else {
      this.updateEffects(dt);
    }

    this.draw(now / 1000);
    this.animationFrame = requestAnimationFrame(this.frame);
  };

  private update(dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 28);
    this.overdriveTimer = Math.max(0, this.overdriveTimer - dt);
    this.statusState = tickStatuses(this.statusState, dt);
    this.hardCcState = tickHardCcState(this.hardCcState, dt);
    this.interferenceTimer = statusRemaining(
      this.statusState,
      "jammed",
    );
    this.barrierTimer = Math.max(0, this.barrierTimer - dt);
    this.reflectTimer = Math.max(0, this.reflectTimer - dt);
    this.timeShellTimer = Math.max(0, this.timeShellTimer - dt);
    this.guardianTimer = Math.max(0, this.guardianTimer - dt);
    this.markTimer = Math.max(0, this.markTimer - dt);
    this.bossMarkTimer = Math.max(0, this.bossMarkTimer - dt);
    this.gravityWellTimer = Math.max(0, this.gravityWellTimer - dt);
    this.cloakTimer = Math.max(0, this.cloakTimer - dt);
    this.phoenixGraceTimer = Math.max(
      0,
      this.phoenixGraceTimer - dt,
    );
    this.weaponOverclockTimer = Math.max(
      0,
      this.weaponOverclockTimer - dt,
    );
    this.rewardScoreMultiplierTimer = Math.max(
      0,
      this.rewardScoreMultiplierTimer - dt,
    );
    this.rewardCreditsMultiplierTimer = Math.max(
      0,
      this.rewardCreditsMultiplierTimer - dt,
    );
    if (this.rewardNotice !== null) {
      this.rewardNotice.remaining = Math.max(
        0,
        this.rewardNotice.remaining - dt,
      );
      if (this.rewardNotice.remaining <= 0) this.rewardNotice = null;
    }

    if (this.barrierTimer <= 0) this.barrierHp = 0;
    if (this.guardianTimer <= 0) this.guardianBlocks = 0;
    if (this.markTimer <= 0) this.markedEnemyId = null;

    this.skillEngine.tick(dt);
    this.skillHudTimer -= dt;
    if (this.skillHudTimer <= 0) {
      this.skillHudTimer = 0.15;
      this.hooks.onSkills();
      this.hooks.onStatuses(this.statusState);
    }

    const difficulty = this.difficulty;
    if (difficulty === null || this.stageConfig === null) return;

    this.updateStageObjective({
      type: "tick",
      dt,
    });
    this.objectiveHudTimer -= dt;
    if (this.objectiveHudTimer <= 0) {
      this.objectiveHudTimer = 0.15;
      this.hooks.onObjectiveUpdate(this.getStageObjective());
    }

    this.updatePlayerResources(dt);
    const hostileTimeFactor = Math.min(
      this.timeShellTimer > 0 ? 0.42 : 1,
      this.gravityWellTimer > 0 ? 0.68 : 1,
    );
    this.updateBoss(dt * hostileTimeFactor, difficulty);
    this.updateSupplyPod(dt);
    this.updateTreasureDrone(dt);
    this.updateRewardChoiceCrate(dt);
    this.updateAnomalyCrate(dt);
    if (!(this.testLabEnabled && this.testLabSchedulerFrozen)) {
      this.spawnTimer -= dt * hostileTimeFactor;
    }
    this.supplySpawnTimer -= dt;
    this.treasureDroneTimer -= dt;
    this.rewardChoiceTimer -= dt;
    this.anomalyTimer -= dt;

    if (
      this.supplyPod === null &&
      this.supplySpawnsRemaining > 0 &&
      this.supplySpawnTimer <= 0 &&
      this.boss === null &&
      (this.spawnRemaining > 0 || this.enemies.length > 0)
    ) {
      this.spawnSupplyPod();
      this.supplySpawnsRemaining -= 1;
      this.supplySpawnTimer = randomBetween(11, 16);
    }

    if (
      this.treasureDronePending &&
      this.treasureDrone === null &&
      this.supplyPod === null &&
      this.rewardChoiceCrate === null &&
      this.anomalyCrate === null &&
      this.treasureDroneTimer <= 0 &&
      this.boss === null &&
      (this.spawnRemaining > 0 || this.enemies.length > 0)
    ) {
      this.spawnTreasureDrone();
      this.treasureDronePending = false;
    }

    if (
      this.rewardChoicePending &&
      this.rewardChoiceCrate === null &&
      this.supplyPod === null &&
      this.treasureDrone === null &&
      this.anomalyCrate === null &&
      this.rewardChoiceTimer <= 0 &&
      this.boss === null &&
      (this.spawnRemaining > 0 || this.enemies.length > 0)
    ) {
      this.spawnRewardChoiceCrate();
      this.rewardChoicePending = false;
    }

    if (
      this.anomalyPending &&
      this.anomalyCrate === null &&
      this.supplyPod === null &&
      this.treasureDrone === null &&
      this.rewardChoiceCrate === null &&
      this.anomalyTimer <= 0 &&
      this.boss === null &&
      (this.spawnRemaining > 0 || this.enemies.length > 0)
    ) {
      this.spawnAnomalyCrate();
      this.anomalyPending = false;
    }

    if (!(this.testLabEnabled && this.testLabSchedulerFrozen)) {
      this.runSpawnScheduler(difficulty);
    }

    const playerY = this.height - PLAYER_Y_OFFSET;
    const overdriveFactor =
      this.overdriveTimer > 0
        ? this.characterId === "vanguard"
          ? 0.5
          : 0.58
        : 1;
    const speedFactor = overdriveFactor * hostileTimeFactor;

    for (const enemy of this.enemies) {
      enemy.age += dt;
      enemy.flash = Math.max(0, enemy.flash - dt * 7);
      enemy.kick = Math.max(0, enemy.kick - dt * 4);
      const rewardControl = tickEnemyRewardControl(enemy, dt);
      const markedSlow =
        enemy.id === this.markedEnemyId && this.markTimer > 0
          ? 0.72
          : 1;
      enemy.y +=
        enemy.speed * speedFactor * markedSlow * rewardControl * dt;

      const desiredX =
        enemy.baseX + Math.sin(enemy.age * 1.1 + enemy.id) * enemy.drift;
      enemy.x +=
        (desiredX - enemy.x) * Math.min(1, dt * 2 * rewardControl);

      if (
        enemy.pendingSkillId !== undefined &&
        enemy.pendingSkillId !== null
      ) {
        enemy.skillTelegraphRemaining = Math.max(
          0,
          (enemy.skillTelegraphRemaining ?? 0) -
            dt * hostileTimeFactor * rewardControl,
        );
        if (enemy.skillTelegraphRemaining <= 0) {
          const skillId = enemy.pendingSkillId;
          enemy.pendingSkillId = null;
          this.executeEnemySkill(enemy, skillId, difficulty);
          enemy.actionCooldown = this.enemySkillCooldown(
            skillId,
            difficulty,
          );
        }
      } else if (enemy.actionCooldown !== null) {
        enemy.actionCooldown -=
          dt * hostileTimeFactor * rewardControl;
        if (enemy.actionCooldown <= 0) {
          const skills = enemy.skillIds ?? [];
          if (skills.length > 0) {
            const index =
              (enemy.nextSkillIndex ?? 0) % skills.length;
            const skillId = skills[index]!;
            enemy.nextSkillIndex = (index + 1) % skills.length;
            this.beginEnemySkill(enemy, skillId, difficulty);
          } else {
            this.executeLegacyEnemyAction(enemy);
            enemy.actionCooldown =
              this.legacyEnemyActionCooldown(enemy, difficulty);
          }
        }
      }

      if (enemy.y + enemy.radius >= playerY - 24) {
        this.damagePlayer(enemy.id, enemy.x, enemy.y);
      }
    }

    const playerX = this.width / 2;
    for (const projectile of this.projectiles) {
      projectile.x += projectile.vx * dt * hostileTimeFactor;
      projectile.y += projectile.vy * dt * hostileTimeFactor;

      if (
        Math.hypot(projectile.x - playerX, projectile.y - playerY) <=
        projectile.radius + 15
      ) {
        this.damageFromProjectile(
          projectile.id,
          projectile.x,
          projectile.y,
        );
      }
    }

    this.projectiles = this.projectiles.filter(
      (projectile) =>
        projectile.x > -80 &&
        projectile.x < this.width + 80 &&
        projectile.y > -80 &&
        projectile.y < this.height + 100,
    );

    this.updateEffects(dt);

    if (
      this.spawnRemaining === 0 &&
      this.enemies.length === 0 &&
      this.phase === "playing"
    ) {
      if (
        isBossStageRole(this.stageConfig.role) &&
        !this.bossSpawned
      ) {
        this.spawnBoss();
      } else if (
        !isBossStageRole(this.stageConfig.role) ||
        (this.bossDefeated && !this.bossRewardPending)
      ) {
        this.finishStage();
      }
    }
  }

  private updateEffects(dt: number): void {
    if (this.boss !== null) {
      this.boss.flash = Math.max(0, this.boss.flash - dt * 7);
      this.boss.kick = Math.max(0, this.boss.kick - dt * 4);
    }

    for (const laser of this.lasers) {
      laser.life -= dt;
    }
    this.lasers = this.lasers.filter((laser) => laser.life > 0);

    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.12, dt);
      particle.vy *= Math.pow(0.12, dt);
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  private spawnBoss(): void {
    const stage = this.stageConfig;
    const difficulty = this.difficulty;
    if (
      stage === null ||
      difficulty === null ||
      !isBossStageRole(stage.role)
    ) {
      return;
    }

    const bossVisualStage =
      this.hiddenEncounterRuntime?.bossStageOverride ??
      stage.stage;
    const bossDefinition = enemyDefinition(
      bossVisualDefinitionIdForStage(
        bossVisualStage,
        stage.role,
      ),
    );
    const family = bossDefinition?.family ?? "devil";
    const mechanic = createBossTypingMechanicState(
      family,
      stage.role,
      1,
      difficulty,
    );
    const entry = this.pickBossEntry(mechanic);
    this.boss = createBossState(
      stage.stage,
      stage.galaxy,
      stage.role,
      entry,
    );
    const bossHpMultiplier = Math.max(
      1,
      difficulty.bossHpMultiplier ?? 1,
    );
    if (bossHpMultiplier !== 1) {
      this.boss.maxHp = Math.max(
        1,
        Math.round(this.boss.maxHp * bossHpMultiplier),
      );
      this.boss.hp = this.boss.maxHp;
    }
    this.boss.typingMechanic = mechanic;
    this.boss.shieldActive =
      mechanic.id === "shield-sequence" &&
      mechanic.active;
    this.boss.name =
      bossVisualNameForStage(
        bossVisualStage,
        this.boss.role,
      ) +
      (difficulty.bossMutationLabel === undefined
        ? ""
        : " · ASC " + difficulty.bossMutationLabel);
    if (bossDefinition !== undefined) {
      this.notifyEnemySeen(bossDefinition.id);
    }
    this.bossSpawned = true;
    this.bossDefeated = false;
    this.projectiles = [];
    this.targetId = null;
    this.boss.actionCooldown =
      (bossActionInterval(this.boss.role, this.boss.phase) *
        bossActionIntervalMultiplier(mechanic)) /
      Math.max(0.75, difficulty.bossPressure) /
      Math.max(1, difficulty.bossActionRateMultiplier ?? 1);
    this.hooks.onBossUpdate(toBossHud(this.boss));
    if (bossDefinition !== undefined) {
      const fx = enemyFxProfile(bossDefinition.family, "boss-intro");
      const position = this.bossPosition();
      this.burst(position.x, position.y, fx.count, fx.hue);
      this.sfx.bossEntrance(fx.pitch);
    } else {
      this.sfx.bossEntrance();
    }

    if (this.settings.screenShake) {
      this.shake = Math.max(this.shake, 7);
    }
  }

  private updateBoss(
    dt: number,
    difficulty: DifficultyProfile,
  ): void {
    const boss = this.boss;
    if (boss === null) return;

    this.bossHudTimer = Math.max(
      0,
      this.bossHudTimer - dt,
    );
    if (boss.typingMechanic !== undefined) {
      const mechanicTick = tickBossTypingMechanic(
        boss.typingMechanic,
        dt,
      );
      boss.typingMechanic = mechanicTick.state;
      if (mechanicTick.expiredInterrupt) {
        this.fireBossProjectiles(boss);
        this.fireBossProjectiles(boss);
        boss.flash = 1;
        this.sfx.bossPhase();
        this.hooks.onBossUpdate(toBossHud(boss));
      } else if (
        boss.typingMechanic.id === "interrupt-charge" &&
        boss.typingMechanic.active &&
        this.bossHudTimer <= 0
      ) {
        this.bossHudTimer = 0.1;
        this.hooks.onBossUpdate(toBossHud(boss));
      }
    }

    if (boss.staggerTimer > 0) {
      boss.staggerTimer = Math.max(0, boss.staggerTimer - dt);
      this.hooks.onBossUpdate(toBossHud(boss));
      return;
    }

    boss.actionCooldown -= dt;
    if (boss.actionCooldown > 0) return;

    this.fireBossProjectiles(boss);
    boss.actionCooldown =
      (bossActionInterval(boss.role, boss.phase) *
        (boss.typingMechanic === undefined
          ? 1
          : bossActionIntervalMultiplier(
              boss.typingMechanic,
            ))) /
      Math.max(0.75, difficulty.bossPressure) /
      Math.max(1, difficulty.bossActionRateMultiplier ?? 1);
  }

  private fireBossProjectiles(boss: BossState): void {
    if (this.difficulty === null) return;

    const { x, y } = this.bossPosition();
    const playerX = this.width / 2;
    const playerY = this.height - PLAYER_Y_OFFSET;
    const baseAngle = Math.atan2(playerY - y, playerX - x);
    const count = Math.min(
      5,
      bossProjectileCount(boss.role, boss.phase) +
        Math.max(0, Math.floor(this.difficulty.bossProjectileBonus ?? 0)),
    );
    const spread = count === 1 ? 0 : 0.16;
    const speed =
      125 +
      this.difficulty.bossPressure * 48 +
      Math.max(0, boss.phase - 1) * 14;
    const alphabet = "asdfjklqweruiopzxcvbnm";

    for (let index = 0; index < count; index += 1) {
      const offset = (index - (count - 1) / 2) * spread;
      const angle = baseAngle + offset;
      const char =
        alphabet[Math.floor(Math.random() * alphabet.length)] ?? "a";

      this.projectiles.push({
        id: this.nextProjectileId++,
        ownerId: -1,
        char,
        x,
        y: y + 18,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: boss.phase >= 3 ? 15 : 13,
      });
    }

    this.sfx.enemyShot();
  }

  private updateStageObjective(
    event: StageObjectiveEvent,
  ): void {
    if (this.stageObjective === null) return;

    const beforeStatus = this.stageObjective.status;
    const beforeProgress = this.stageObjective.progress;
    const beforeIntegrity = this.stageObjective.integrity;
    const beforeTarget = this.stageObjective.targetEnemyId;
    this.stageObjective = reduceStageObjective(
      this.stageObjective,
      event,
    );

    if (
      this.stageObjective.status !== beforeStatus ||
      this.stageObjective.progress !== beforeProgress ||
      this.stageObjective.integrity !== beforeIntegrity ||
      this.stageObjective.targetEnemyId !== beforeTarget
    ) {
      this.hooks.onObjectiveUpdate(this.getStageObjective());
    }
  }

  private finishStage(): void {
    if (this.phase !== "playing") return;

    this.updateStageObjective({
      type: "stage-clear",
      hits: this.stats.hits,
      misses: this.stats.misses,
    });
    if (!requiredObjectiveAllowsFinish(this.stageObjective)) {
      return;
    }

    this.phase = "stageclear";
    this.projectiles = [];
    this.supplyPod = null;
    this.treasureDrone = null;
    this.rewardChoiceCrate = null;
    this.anomalyCrate = null;
    this.anomalyResolutionPending = false;
    this.anomalyRiskRatio = 0;
    this.boss = null;
    this.hooks.onBossUpdate(null);
    this.sfx.stageClear();
    this.hooks.onStageClear(this.getStats());
    this.hooks.onPhase(this.phase);
  }

  private pickBossEntry(
    mechanic?: BossTypingMechanicState,
  ): VocabularyEntry {
    const preference =
      mechanic === undefined
        ? "normal"
        : bossWordLengthPreference(mechanic);
    const candidates = this.vocabulary.filter((entry) => {
      const length = typingText(entry.en).length;
      if (preference === "short") {
        return length >= 3 && length <= 6;
      }
      if (preference === "long") {
        return length >= 9 && length <= 18;
      }
      return length >= 5 && length <= 12;
    });
    const source = candidates.length > 0 ? candidates : this.vocabulary;
    return (
      source[Math.floor(Math.random() * source.length)] ??
      FALLBACK_ENTRIES[8]!
    );
  }

  private spawnSupplyPod(): void {
    const candidates = this.vocabulary.filter((entry) => {
      const length = typingText(entry.en).length;
      return length >= 4 && length <= 9;
    });
    const source = candidates.length > 0 ? candidates : this.vocabulary;
    const entry =
      source[Math.floor(Math.random() * source.length)] ??
      FALLBACK_ENTRIES[1]!;

    this.supplyPod = {
      entry,
      typed: 0,
      reward: rollSupplyReward(),
      x: -46,
      y: randomBetween(118, Math.max(150, this.height * 0.42)),
      speed: randomBetween(68, 88),
      age: 0,
      lifetime: 18,
    };

    this.sfx.supplyArrival();
  }

  private updateSupplyPod(dt: number): void {
    if (this.supplyPod === null) return;

    this.supplyPod.age += dt;
    this.supplyPod.x += this.supplyPod.speed * dt;

    if (
      this.supplyPod.age >= this.supplyPod.lifetime ||
      this.supplyPod.x > this.width + 60
    ) {
      this.supplyPod = null;
    }
  }

  private spawnTreasureDrone(): void {
    const candidates = this.vocabulary.filter((entry) => {
      const length = typingText(entry.en).length;
      return length >= 5 && length <= 10;
    });
    const source = candidates.length > 0 ? candidates : this.vocabulary;
    const entry =
      source[Math.floor(Math.random() * source.length)] ??
      FALLBACK_ENTRIES[5]!;

    this.treasureDrone = {
      entry,
      typed: 0,
      x: this.width + 52,
      y: randomBetween(105, Math.max(145, this.height * 0.36)),
      speed: randomBetween(78, 96),
      age: 0,
      lifetime: 17,
    };

    this.sfx.eliteWarning();
  }

  private updateTreasureDrone(dt: number): void {
    if (this.treasureDrone === null) return;

    this.treasureDrone.age += dt;
    this.treasureDrone.x -= this.treasureDrone.speed * dt;

    if (
      this.treasureDrone.age >= this.treasureDrone.lifetime ||
      this.treasureDrone.x < -70
    ) {
      this.treasureDrone = null;
    }
  }

  private spawnRewardChoiceCrate(): void {
    const entry = rewardChoiceWord(this.vocabulary);
    if (entry === null) {
      this.rewardChoicePending = false;
      return;
    }

    this.rewardChoiceCrate = {
      entry,
      typed: 0,
      x: randomBetween(100, this.width - 100),
      y: -42,
      speed: randomBetween(34, 46),
      age: 0,
      lifetime: 18,
    };

    this.sfx.support();
  }

  private updateRewardChoiceCrate(dt: number): void {
    if (this.rewardChoiceCrate === null) return;

    this.rewardChoiceCrate.age += dt;
    this.rewardChoiceCrate.y += this.rewardChoiceCrate.speed * dt;

    if (
      this.rewardChoiceCrate.age >= this.rewardChoiceCrate.lifetime ||
      this.rewardChoiceCrate.y > this.height * 0.63
    ) {
      this.rewardChoiceCrate = null;
    }
  }

  private spawnAnomalyCrate(): void {
    const entry = anomalyWord(this.vocabulary);
    if (entry === null) {
      this.anomalyPending = false;
      return;
    }

    this.anomalyCrate = {
      entry,
      typed: 0,
      x: randomBetween(90, this.width - 90),
      y: -46,
      speed: randomBetween(31, 42),
      age: 0,
      lifetime: 19,
    };

    this.sfx.eliteWarning();
  }

  private updateAnomalyCrate(dt: number): void {
    if (this.anomalyCrate === null) return;

    this.anomalyCrate.age += dt;
    this.anomalyCrate.y += this.anomalyCrate.speed * dt;

    if (
      this.anomalyCrate.age >= this.anomalyCrate.lifetime ||
      this.anomalyCrate.y > this.height * 0.62
    ) {
      this.anomalyCrate = null;
    }
  }

  private activeTypingPressureSnapshot(
    difficulty: DifficultyProfile,
  ): ActiveTypingPressureSnapshot {
    const snapshot = emptyActivePressureSnapshot();
    const playerY = this.height - PLAYER_Y_OFFSET;
    const projectileByOwner = new Map<number, number>();

    for (const projectile of this.projectiles) {
      projectileByOwner.set(
        projectile.ownerId,
        (projectileByOwner.get(projectile.ownerId) ?? 0) + 1,
      );

      const timeToImpact =
        projectile.vy > 0
          ? Math.max(
              0,
              (playerY - projectile.y) /
                Math.max(1, projectile.vy),
            )
          : Number.POSITIVE_INFINITY;
      const urgency = clamp(
        difficulty.reactionWindow /
          Math.max(
            difficulty.reactionWindow * 0.4,
            timeToImpact,
          ),
        0,
        2.5,
      );
      snapshot.pressure += 0.08 + urgency * 0.12;
      if (
        timeToImpact <=
        difficulty.reactionWindow * 1.6
      ) {
        snapshot.urgentThreats += 1;
      }
    }

    snapshot.projectileCount = this.projectiles.length;

    for (const enemy of this.enemies) {
      const remainingCharacters = Math.max(
        1,
        typingText(enemy.entry.en).length -
          Math.max(0, enemy.typed),
      );
      const timeToImpactSeconds = Math.max(
        difficulty.reactionWindow * 0.5,
        (playerY - 24 - enemy.y - enemy.radius) /
          Math.max(1, enemy.speed),
      );
      const pendingId =
        enemy.pendingSkillId ?? null;
      const pending =
        pendingId === null
          ? null
          : enemySkillDefinition(pendingId);
      const pendingStatus =
        pending?.effect.type === "status"
          ? pending.effect
          : null;
      const ccSeverity =
        pending?.category === "control"
          ? pendingStatus?.hardCc
            ? 1.35
            : 0.72
          : 0;
      const supportPriority =
        pending?.category === "support"
          ? 1
          : isControllerSupportKind(enemy.kind)
            ? 0.28
            : 0;
      const threat = activeThreatPressure({
        remainingCharacters,
        remainingLayers: enemy.layersRemaining,
        targetWpm: difficulty.targetWpm,
        reactionWindow: difficulty.reactionWindow,
        timeToImpactSeconds,
        castDeadlineSeconds:
          pendingId === null
            ? null
            : Math.max(
                0,
                enemy.skillTelegraphRemaining ?? 0,
              ),
        projectileUrgency:
          (projectileByOwner.get(enemy.id) ?? 0) *
          0.45,
        ccSeverity,
        supportPriority,
        threatBudgetUsed:
          enemy.threatBudget?.used ?? 0,
      });

      snapshot.pressure += threat.pressure;
      if (threat.urgent) {
        snapshot.urgentThreats += 1;
      }
      if (isControllerSupportKind(enemy.kind)) {
        snapshot.controllerSupportCount += 1;
      }
    }

    snapshot.enemyCount = this.enemies.length;

    if (this.boss !== null) {
      const bossUrgent =
        this.boss.actionCooldown <=
        difficulty.reactionWindow;
      snapshot.bossPressure =
        1.15 +
        Math.max(0, this.boss.phase - 1) * 0.35 +
        (bossUrgent ? 0.55 : 0);
      snapshot.pressure += snapshot.bossPressure;
      if (bossUrgent) snapshot.urgentThreats += 1;
    }

    return snapshot;
  }

  private runSpawnScheduler(
    difficulty: DifficultyProfile,
  ): boolean {
    if (
      this.spawnRemaining <= 0 ||
      this.spawnTimer > 0 ||
      this.enemies.length >= difficulty.maxEnemies
    ) {
      return false;
    }

    const formationCount = this.trySpawnFormation(difficulty);
    if (formationCount > 0) {
      this.spawnRemaining -= formationCount;
      this.spawnTimer =
        difficulty.spawnInterval * randomBetween(1.02, 1.28);
      return true;
    }

    const spawned = this.spawnEnemy();
    if (spawned) {
      this.spawnRemaining -= 1;
      this.spawnTimer =
        difficulty.spawnInterval * randomBetween(0.82, 1.16);
      return true;
    }

    // Pressure denial is not a skipped enemy. Retry shortly after the
    // active pile becomes more feasible.
    this.spawnTimer = Math.max(
      0.12,
      difficulty.reactionWindow * 0.24,
    );
    return false;
  }

  private canAdmitEnemyKind(
    kind: EnemyKind,
    difficulty: DifficultyProfile,
  ): boolean {
    return canAdmitSpawn(
      this.activeTypingPressureSnapshot(difficulty),
      difficulty,
      kind,
    );
  }

  private canAdmitFormation(
    formation: FormationDefinition,
    difficulty: DifficultyProfile,
  ): boolean {
    return canAdmitFormation(
      this.activeTypingPressureSnapshot(difficulty),
      difficulty,
      formation,
    );
  }

  private trySpawnFormation(
    difficulty: DifficultyProfile,
  ): number {
    if (
      this.hiddenEncounterRuntime?.forcePriorityTargets ||
      objectiveForcesCommander(this.stageObjective) ||
      objectiveForcesElite(this.stageObjective)
    ) {
      return 0;
    }
    const stageConfig = this.stageConfig;
    if (
      stageConfig === null ||
      this.spawnRemaining < 2 ||
      formationSpawnChance(
        difficulty,
        stageConfig.role,
      ) <= 0 ||
      !shouldAttemptFormation(
        difficulty,
        stageConfig.role,
      )
    ) {
      return 0;
    }

    const formation = chooseFormation(
      stageConfig.stage,
      difficulty.formationComplexity,
      this.spawnRemaining,
    );
    if (
      formation === null ||
      !this.canAdmitFormation(formation, difficulty)
    ) {
      return 0;
    }

    const anchorPadding = Math.min(
      Math.max(145, this.width * 0.2),
      Math.max(145, this.width / 2 - 20),
    );
    const anchorX =
      this.width <= anchorPadding * 2
        ? this.width / 2
        : randomBetween(
            anchorPadding,
            this.width - anchorPadding,
          );
    const initialEnemyCount = this.enemies.length;

    for (const member of formation.members) {
      const spawned = this.spawnEnemy({
        kind: member.kind,
        skipAdmission: true,
        formationMember: true,
        x: anchorX + member.xOffset,
        yOffset: member.yOffset,
      });

      if (!spawned) {
        // The package is atomic: a defensive failure cannot leave half a
        // formation alive or consume the Campaign enemy budget.
        this.enemies.splice(initialEnemyCount);
        return 0;
      }
    }

    this.burst(anchorX, 22, 18 + formation.members.length * 4, 195);
    return formation.members.length;
  }

  private spawnEnemy(
    request: EnemySpawnRequest = {},
  ): boolean {
    const stage = this.stageConfig?.stage ?? 1;
    const rosterStage =
      this.hiddenEncounterRuntime?.rosterStageOverride ?? stage;
    const galaxy = this.stageConfig?.galaxy ?? 1;
    const difficulty = this.difficulty;
    if (difficulty === null) return false;

    const objectiveCommander =
      request.kind === undefined &&
      objectiveForcesCommander(this.stageObjective);
    let kind =
      request.kind ??
      (objectiveCommander
        ? "commander"
        : chooseEnemyKind(stage));
    if (
      !request.skipAdmission &&
      !this.canAdmitEnemyKind(kind, difficulty)
    ) {
      // Do not deadlock the scheduler because one controller/support roll was
      // rejected. A Scout fallback is still subject to the same total pressure
      // and urgent-threat caps.
      if (
        request.kind === undefined &&
        !objectiveCommander &&
        kind !== "scout" &&
        this.canAdmitEnemyKind("scout", difficulty)
      ) {
        kind = "scout";
      } else {
        return false;
      }
    }

    const profile = enemyProfile(kind, galaxy);

    const formationMember = request.formationMember === true;
    const priorityOnly =
      this.hiddenEncounterRuntime?.forcePriorityTargets === true;
    const forceObjectiveElite =
      !formationMember &&
      objectiveForcesElite(this.stageObjective);
    const forceElite =
      priorityOnly ||
      forceObjectiveElite ||
      (!formationMember &&
        this.stageConfig?.role === "elite" &&
        this.eliteSpawned === 0);
    const elite =
      priorityOnly
        ? true
        : formationMember
          ? false
          : forceElite ||
            rollElite(this.stageConfig?.eliteChance ?? 0);
    const golden =
      !formationMember &&
      !elite &&
      this.rollPityEvent(
        "golden",
        goldenEnemyChance(stage),
        0.16,
      );
    const eliteModifiers = elite
      ? pickEliteModifiers(
          eliteModifierCount(this.stageConfig?.modifierSlots ?? 0),
        )
      : [];

    const supportAction =
      kind === "carrier" ||
      kind === "jammer" ||
      kind === "healer" ||
      kind === "leech" ||
      kind === "commander";
    const actionPressure = supportAction
      ? difficulty.combatPressure
      : difficulty.projectilePressure *
        this.stageEventModifiers.projectilePressureMultiplier;

    const baseSpeed =
      (profile.baseSpeed + randomBetween(0, profile.speedVariance)) *
      difficulty.enemySpeed *
      this.stageEventModifiers.enemySpeedMultiplier;
    const baseCooldown =
      profile.actionInterval === null
        ? null
        : (profile.actionInterval * difficulty.attackIntervalFactor) /
          Math.max(0.7, actionPressure);
    const eliteStats = applyEliteModifiers(
      {
        speed: baseSpeed,
        layers: profile.layers,
        actionCooldown: baseCooldown,
      },
      eliteModifiers,
    );

    const minX = profile.radius + 70;
    const maxX = Math.max(
      minX,
      this.width - profile.radius - 70,
    );
    const baseX = clamp(
      request.x ??
        randomBetween(minX, maxX),
      minX,
      maxX,
    );
    const definitionId = spawnWorldEnemyDefinitionId(
      kind,
      elite,
      rosterStage,
    );
    const minimumLayers = clamp(
      eliteStats.layers +
        (!elite && !golden
          ? this.stageEventModifiers.extraEnemyLayers
          : 0),
      1,
      3,
    );
    const typingProfile = resolveEnemyTypingProfile({
      stage: rosterStage,
      kind,
      elite,
      minimumLayers,
      vocabularyLevel: this.vocabularyLevel,
      entries: this.vocabulary,
      wordScoreOffset: difficulty.wordScoreOffset,
      rankBonus: difficulty.enemyRankBonus ?? 0,
    });
    const runtimeProfile = resolveEnemyRuntimeProfile({
      stage: rosterStage,
      kind,
      rank: typingProfile.rank,
      elite,
      wordDifficultyScore: typingProfile.wordDifficultyScore,
      layers: typingProfile.layersRemaining,
    });
    const firstSkill = runtimeProfile.skills[0];
    const resolvedActionCooldown =
      firstSkill === undefined
        ? eliteStats.actionCooldown
        : this.enemySkillCooldown(
            firstSkill,
            difficulty,
          );

    const enemyId = this.nextEnemyId++;
    this.enemies.push({
      id: enemyId,
      kind,
      definitionId,
      elite,
      golden,
      eliteModifiers,
      rank: typingProfile.rank,
      wordDifficultyScore: typingProfile.wordDifficultyScore,
      layerPlan: typingProfile.layerPlan,
      skillIds: runtimeProfile.skills,
      nextSkillIndex: 0,
      pendingSkillId: null,
      skillTelegraphRemaining: 0,
      threatBudget: runtimeProfile.threatBudget,
      entry: typingProfile.entry,
      typed: 0,
      wordMissed: false,
      layersRemaining: typingProfile.layersRemaining,
      x: baseX,
      y:
        -profile.radius -
        20 +
        (request.yOffset ?? 0),
      baseX,
      speed: eliteStats.speed * (golden ? 1.12 : 1),
      age: Math.random() * 8,
      drift: randomBetween(profile.driftMin, profile.driftMax),
      radius: elite ? profile.radius * 1.08 : profile.radius,
      flash: 0,
      kick: 0,
      actionCooldown: resolvedActionCooldown,
    });

    this.notifyEnemySeen(definitionId);
    const spawnDefinition = enemyDefinition(definitionId);
    if (spawnDefinition !== undefined) {
      const fx = enemyFxProfile(spawnDefinition.family, "spawn");
      this.burst(baseX, 12, fx.count, fx.hue);
    }

    this.updateStageObjective({
      type: "enemy-spawn",
      enemyId,
      kind,
      elite,
    });

    if (elite) {
      const firstElite = this.eliteSpawned === 0;
      this.eliteSpawned += 1;
      if (firstElite) this.sfx.eliteWarning();
    } else if (golden) {
      this.sfx.eliteWarning();
    }

    return true;
  }

  private pickVocabularyEntry(kind: EnemyKind): VocabularyEntry {
    const candidates = this.vocabulary.filter((entry) => {
      const length = typingText(entry.en).length;
      if (length === 0) return false;
      if (kind === "mine") return length <= 6;
      if (kind === "tank") return length >= 5;
      if (kind === "shield") return length >= 4 && length <= 10;
      if (kind === "carrier") return length >= 5;
      return true;
    });

    const source = candidates.length > 0 ? candidates : this.vocabulary;
    return (
      source[Math.floor(Math.random() * source.length)] ??
      FALLBACK_ENTRIES[0]!
    );
  }

  private pickEnemyLayerEntry(enemy: Enemy): VocabularyEntry {
    const entry =
      pickVocabularyEntryForRank(
        this.vocabulary,
        enemy.rank ?? "I",
        this.vocabularyLevel,
        Math.random(),
        enemy.entry.id,
        this.difficulty?.wordScoreOffset ?? 0,
      ) ?? this.pickVocabularyEntry(enemy.kind);

    enemy.wordDifficultyScore = wordDifficultyScore(
      entry,
      this.vocabularyLevel,
    );
    return entry;
  }

  private activateInterference(jammer: Enemy): void {
    const duration = wardDuration(
      1.15 +
        Math.min(
          0.55,
          (this.difficulty?.combatPressure ?? 1) * 0.12,
        ),
      this.playerStats,
    );
    this.addStatus(
      "jammed",
      duration,
      "enemy:" + jammer.kind,
      true,
    );
    this.burst(jammer.x, jammer.y, 18, 74);
    this.sfx.enemyShot();
  }

  private drainOverdrive(leech: Enemy): void {
    const pressure = this.difficulty?.combatPressure ?? 1;
    const amount = Math.min(18, 8 + pressure * 4);
    const before = this.stats.power;
    this.stats.power = clamp(this.stats.power - amount, 0, 100);

    this.burst(
      this.width / 2,
      this.height - PLAYER_Y_OFFSET,
      16,
      286,
    );
    this.burst(leech.x, leech.y, 12, 286);
    this.sfx.drain();

    if (before !== this.stats.power) {
      this.emitStats();
    }
  }

  private commandPulse(commander: Enemy): void {
    const allies = this.enemies
      .filter((enemy) => enemy.id !== commander.id)
      .sort((a, b) => b.y - a.y)
      .slice(0, 4);

    for (const ally of allies) {
      ally.y += 12;
      ally.flash = Math.max(ally.flash, 0.55);

      if (ally.actionCooldown !== null) {
        ally.actionCooldown = Math.max(0.18, ally.actionCooldown - 0.55);
      }
    }

    this.spawnTimer = Math.min(this.spawnTimer, 0.12);
    this.burst(commander.x, commander.y, 24, 48);
    this.sfx.command();
  }

  private reinforceAlly(healer: Enemy): void {
    const ally =
      this.enemies
        .filter(
          (enemy) =>
            enemy.id !== healer.id &&
            enemy.kind !== "healer" &&
            enemy.layersRemaining < 2,
        )
        .sort((a, b) => b.y - a.y)[0] ?? null;

    if (ally === null) return;

    const reinforced = reinforceEnemyLayerPlan(
      ally.layerPlan ??
        enemyLayerPlan(
          ally.kind,
          clamp(ally.layersRemaining, 1, 3) as 1 | 2 | 3,
        ),
      ally.layersRemaining,
      ally.kind,
    );
    ally.layerPlan = reinforced.plan;
    ally.layersRemaining = reinforced.remaining;
    ally.flash = 1;
    this.burst(ally.x, ally.y, 20, 142);
    this.sfx.support();
  }

  private enemySkillPressure(
    skillId: EnemySkillId,
    difficulty: DifficultyProfile | null,
  ): number {
    const definition = enemySkillDefinition(skillId);
    const safeDifficulty = difficulty ?? this.difficulty;
    if (safeDifficulty === null) return 1;

    if (definition.category === "attack") {
      return (
        safeDifficulty.projectilePressure *
        this.stageEventModifiers.projectilePressureMultiplier
      );
    }

    return safeDifficulty.combatPressure;
  }

  private enemySkillCooldown(
    skillId: EnemySkillId,
    difficulty: DifficultyProfile | null,
  ): number {
    const definition = enemySkillDefinition(skillId);
    const safeDifficulty = difficulty ?? this.difficulty;
    const intervalFactor =
      safeDifficulty?.attackIntervalFactor ?? 1;
    return (
      definition.cooldown *
      intervalFactor /
      Math.max(
        0.7,
        this.enemySkillPressure(skillId, difficulty),
      )
    );
  }

  private enemySkillTelegraph(
    skillId: EnemySkillId,
    difficulty: DifficultyProfile,
  ): number {
    const definition = enemySkillDefinition(skillId);
    const pressure = clamp(
      0.85 + difficulty.combatPressure * 0.12,
      0.85,
      1.25,
    );
    return Math.max(
      definition.telegraph / pressure,
      difficulty.reactionWindow * 0.55,
    );
  }

  private beginEnemySkill(
    enemy: Enemy,
    skillId: EnemySkillId,
    difficulty: DifficultyProfile,
  ): void {
    enemy.pendingSkillId = skillId;
    enemy.skillTelegraphRemaining = this.enemySkillTelegraph(
      skillId,
      difficulty,
    );
    enemy.actionCooldown = 0;
    enemy.flash = Math.max(enemy.flash, 0.35);

    const definition = enemySkillDefinition(skillId);
    const hue =
      definition.category === "control"
        ? 205
        : definition.category === "support"
          ? 145
          : definition.category === "defense"
            ? 185
            : 24;
    this.burst(enemy.x, enemy.y, 10, hue);
    this.sfx.projectileWarning();
  }

  private executeEnemySkill(
    enemy: Enemy,
    skillId: EnemySkillId,
    difficulty: DifficultyProfile,
  ): void {
    const definition = enemySkillDefinition(skillId);
    const effect = definition.effect;

    if (effect.type === "projectile") {
      this.fireEnemyProjectile(enemy);
      return;
    }

    if (effect.type === "volley") {
      this.fireEnemyProjectile(enemy);
      this.fireEnemyProjectile(enemy);
      return;
    }

    if (effect.type === "reinforce-self") {
      const reinforced = reinforceEnemyLayerPlan(
        enemy.layerPlan ??
          enemyLayerPlan(
            enemy.kind,
            clamp(enemy.layersRemaining, 1, 3) as 1 | 2 | 3,
          ),
        enemy.layersRemaining,
        enemy.kind,
      );
      enemy.layerPlan = reinforced.plan;
      enemy.layersRemaining = reinforced.remaining;
      enemy.flash = 1;
      this.burst(enemy.x, enemy.y, 18, 185);
      this.sfx.support();
      return;
    }

    if (effect.type === "reinforce-ally") {
      this.reinforceAlly(enemy);
      return;
    }

    if (effect.type === "summon-scout") {
      this.spawnCarrierChild(enemy);
      return;
    }

    if (effect.type === "drain") {
      this.drainOverdrive(enemy);
      return;
    }

    const duration = effect.duration *
      difficulty.hardCcDurationFactor;
    const source = "enemy-skill:" + skillId;

    if (!effect.hardCc) {
      this.addStatus(effect.status, duration, source, true);
      return;
    }

    const hardCcId: HardCcId | null =
      effect.status === "frozen"
        ? "freeze"
        : effect.status === "silenced"
          ? "silence"
          : null;
    if (
      hardCcId === null ||
      !canApplyHardCc(this.hardCcState, hardCcId)
    ) {
      return;
    }

    if (this.addStatus(effect.status, duration, source, true)) {
      this.hardCcState = beginHardCc(
        this.hardCcState,
        hardCcId,
        duration,
        effect.immunityAfter *
          difficulty.ccImmunityFactor,
      );
    }
  }

  private executeLegacyEnemyAction(enemy: Enemy): void {
    if (enemy.kind === "carrier") {
      this.spawnCarrierChild(enemy);
    } else if (enemy.kind === "jammer") {
      this.activateInterference(enemy);
    } else if (enemy.kind === "healer") {
      this.reinforceAlly(enemy);
    } else if (enemy.kind === "leech") {
      this.drainOverdrive(enemy);
    } else if (enemy.kind === "commander") {
      this.commandPulse(enemy);
    } else {
      this.fireEnemyProjectile(enemy);
    }
  }

  private legacyEnemyActionCooldown(
    enemy: Enemy,
    difficulty: DifficultyProfile,
  ): number {
    const baseInterval =
      enemyProfile(
        enemy.kind,
        this.stageConfig?.galaxy ?? 1,
      ).actionInterval ?? 4;
    const supportAction =
      enemy.kind === "carrier" ||
      enemy.kind === "jammer" ||
      enemy.kind === "healer" ||
      enemy.kind === "leech" ||
      enemy.kind === "commander";
    const pressure = supportAction
      ? difficulty.combatPressure
      : difficulty.projectilePressure *
        this.stageEventModifiers.projectilePressureMultiplier;

    return (
      baseInterval *
      difficulty.attackIntervalFactor /
      Math.max(0.7, pressure)
    );
  }

  private spawnCarrierChild(carrier: Enemy): void {
    if (this.difficulty === null) return;
    if (this.enemies.length >= this.difficulty.maxEnemies + 2) return;
    if (!this.canAdmitEnemyKind("scout", this.difficulty)) return;

    const profile = enemyProfile("scout", this.stageConfig?.galaxy ?? 1);
    const baseX = clamp(
      carrier.x + randomBetween(-95, 95),
      profile.radius + 55,
      this.width - profile.radius - 55,
    );

    const stage = this.stageConfig?.stage ?? 1;
    const rosterStage =
      this.hiddenEncounterRuntime?.rosterStageOverride ?? stage;
    const definitionId = spawnWorldEnemyDefinitionId(
      "scout",
      false,
      rosterStage,
    );
    const typingProfile = resolveEnemyTypingProfile({
      stage: rosterStage,
      kind: "scout",
      elite: false,
      minimumLayers: 1,
      vocabularyLevel: this.vocabularyLevel,
      entries: this.vocabulary,
      wordScoreOffset: this.difficulty.wordScoreOffset,
    });
    const runtimeProfile = resolveEnemyRuntimeProfile({
      stage: rosterStage,
      kind: "scout",
      rank: typingProfile.rank,
      elite: false,
      wordDifficultyScore: typingProfile.wordDifficultyScore,
      layers: typingProfile.layersRemaining,
    });
    const firstSkill = runtimeProfile.skills[0];

    this.enemies.push({
      id: this.nextEnemyId++,
      kind: "scout",
      definitionId,
      elite: false,
      eliteModifiers: [],
      rank: typingProfile.rank,
      wordDifficultyScore: typingProfile.wordDifficultyScore,
      layerPlan: typingProfile.layerPlan,
      skillIds: runtimeProfile.skills,
      nextSkillIndex: 0,
      pendingSkillId: null,
      skillTelegraphRemaining: 0,
      threatBudget: runtimeProfile.threatBudget,
      entry: typingProfile.entry,
      typed: 0,
      wordMissed: false,
      layersRemaining: typingProfile.layersRemaining,
      x: carrier.x,
      y: carrier.y + carrier.radius * 0.45,
      baseX,
      speed:
        (profile.baseSpeed + randomBetween(2, profile.speedVariance + 6)) *
        this.difficulty.enemySpeed *
        1.08,
      age: Math.random() * 8,
      drift: randomBetween(profile.driftMin, profile.driftMax),
      radius: 19,
      flash: 0,
      kick: 0,
      actionCooldown:
        firstSkill === undefined
          ? null
          : this.enemySkillCooldown(firstSkill, this.difficulty),
    });
    this.notifyEnemySeen(definitionId);

    this.burst(carrier.x, carrier.y, 12, 47);
  }

  private findProjectileForKey(key: string): EnemyProjectile | null {
    return (
      this.projectiles
        .filter((projectile) => projectile.char === key)
        .sort((a, b) => b.y - a.y)[0] ?? null
    );
  }

  private fireEnemyProjectile(enemy: Enemy): void {
    if (this.difficulty === null) return;

    const playerX = this.width / 2;
    const playerY = this.height - PLAYER_Y_OFFSET;
    const baseAngle = Math.atan2(playerY - enemy.y, playerX - enemy.x);
    const speed =
      (115 + this.difficulty.projectilePressure * 52) *
      this.stageEventModifiers.projectilePressureMultiplier *
      (enemy.kind === "sniper" ? 1.72 : 1);
    const alphabet = "asdfjklqweruiopzxcvbnm";
    const count = enemy.kind === "oppressor" ? 3 : 1;
    const spreadStep = enemy.kind === "oppressor" ? 0.13 : 0;

    for (let index = 0; index < count; index += 1) {
      const offset = (index - (count - 1) / 2) * spreadStep;
      const angle = baseAngle + offset;
      const char =
        alphabet[Math.floor(Math.random() * alphabet.length)] ?? "a";

      this.projectiles.push({
        id: this.nextProjectileId++,
        ownerId: enemy.id,
        char,
        x: enemy.x,
        y: enemy.y + enemy.radius * 0.45,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius:
          enemy.kind === "oppressor" ? 15 : enemy.kind === "sniper" ? 11 : 14,
      });
    }

    this.sfx.enemyShot();
  }

  private destroyProjectile(projectile: EnemyProjectile): void {
    this.projectiles = this.projectiles.filter(
      (item) => item.id !== projectile.id,
    );

    this.stats.hits += 1;
    this.stats.streak += 1;
    this.stats.maxStreak = Math.max(
      this.stats.maxStreak,
      this.stats.streak,
    );
    this.stats.multiplier = multiplierForStreak(this.stats.streak);
    this.addScore(35 * this.stats.multiplier);
    this.gainPower(2.5);
    this.applyCharacterCorrectKeyPassive();

    this.lasers.push({
      x1: this.width / 2,
      y1: this.height - PLAYER_Y_OFFSET,
      x2: projectile.x,
      y2: projectile.y,
      life: 0.09,
      maxLife: 0.09,
      power: 0.9,
    });

    this.burst(projectile.x, projectile.y, 13, 342);
    this.sfx.hit();
    this.emitStats();
  }

  private typeBoss(key: string): void {
    const boss = this.boss;
    if (boss === null) return;

    const word = typingText(boss.entry.en);
    const expected = word[boss.typed];

    if (key !== expected) {
      boss.wordMissed = true;
      this.registerMiss();
      return;
    }

    boss.typed += 1;
    boss.flash = 1;
    boss.kick = 1;

    this.stats.hits += 1;
    this.stats.streak += 1;
    this.stats.maxStreak = Math.max(
      this.stats.maxStreak,
      this.stats.streak,
    );
    this.stats.multiplier = multiplierForStreak(this.stats.streak);
    this.addScore(16 * this.stats.multiplier);
    this.gainPower(2);
    this.applyCharacterCorrectKeyPassive();

    if (!boss.shieldActive) {
      boss.hp = Math.max(
        0,
        boss.hp -
          firepowerDamage(
            bossKeyDamage(boss.maxHp, boss.role),
            this.playerStats,
          ) *
            markedBossDamageMultiplier(this.bossMarkTimer > 0) *
            this.characterBossDamageMultiplier(),
      );
      this.updateBossPhase(boss);
    }

    this.fireBossLaser(0.9);
    this.sfx.shot(this.stats.multiplier);

    if (boss.hp <= 0) {
      this.defeatBoss();
      this.emitStats();
      return;
    }

    if (boss.typed >= word.length) {
      this.triggerImpactFeedback("boss-word");
      this.hooks.onWordComplete(boss.entry);
      this.applyCharacterWordCompletePassive(word.length);

      const perfectWord = !boss.wordMissed;
      const mechanicResult =
        boss.typingMechanic === undefined
          ? null
          : resolveBossWordMechanic(
              boss.typingMechanic,
              perfectWord,
            );
      if (mechanicResult !== null) {
        boss.typingMechanic = mechanicResult.state;
      }

      if (boss.shieldActive) {
        const shieldBroken =
          mechanicResult?.shieldBroken ?? true;
        if (shieldBroken) {
          boss.shieldActive = false;
          this.sfx.bossShieldBreak();
          const { x, y } = this.bossPosition();
          this.burst(x, y, 36, 176);
        }
      } else {
        const mechanicDamage =
          mechanicResult?.damageMultiplier ?? 1;
        boss.hp = Math.max(
          0,
          boss.hp -
            firepowerDamage(
              bossWordDamage(boss.maxHp, boss.role),
              this.playerStats,
            ) *
              mechanicDamage *
              this.relicBossWordDamageMultiplier(word.length) *
              markedBossDamageMultiplier(this.bossMarkTimer > 0) *
              this.characterBossDamageMultiplier(),
        );
      }

      this.sfx.wordComplete(perfectWord);
      this.applyCharacterPerfectWordPassive(perfectWord);
      this.applyRelicWordComplete(word.length, perfectWord);
      boss.wordsCompleted += 1;
      boss.typed = 0;
      boss.entry = this.pickBossEntry(
        boss.typingMechanic,
      );
      boss.flash = 1;
      boss.kick = 1.5;
      boss.wordMissed = false;

      this.addScore(
        (140 + word.length * 18) * this.stats.multiplier,
      );
      this.gainPower(perfectWord ? 11 : 8);

      const staggerSeconds =
        mechanicResult?.staggerSeconds ??
        (perfectWord ? 1.05 : 0);
      if (staggerSeconds > 0) {
        boss.staggerTimer = Math.max(
          boss.staggerTimer,
          staggerSeconds,
        );
        this.sfx.bossStagger();
      }

      const { x, y } = this.bossPosition();
      this.burst(x, y, perfectWord ? 34 : 28, 18);
      this.sfx.bossHit();
      this.updateBossPhase(boss);

      if (boss.hp <= 0) {
        this.defeatBoss();
        this.emitStats();
        return;
      }
    }

    this.hooks.onBossUpdate(toBossHud(boss));
    this.emitStats();
  }

  private updateBossPhase(boss: BossState): void {
    const nextPhase = bossPhaseFor(
      boss.hp,
      boss.maxHp,
      boss.role,
    );
    if (nextPhase <= boss.phase) return;

    boss.phase = nextPhase;
    boss.flash = 1;

    const { x, y } = this.bossPosition();
    const definition = enemyDefinition(
      bossVisualDefinitionIdForStage(
        this.hiddenEncounterRuntime?.bossStageOverride ??
          this.stageConfig?.stage ??
          1,
        boss.role,
      ),
    );
    if (this.difficulty !== null) {
      boss.typingMechanic =
        createBossTypingMechanicState(
          definition?.family ?? "devil",
          boss.role,
          boss.phase,
          this.difficulty,
        );
      boss.shieldActive =
        boss.typingMechanic.id === "shield-sequence" &&
        boss.typingMechanic.active;
    } else {
      boss.shieldActive = false;
    }
    boss.entry = this.pickBossEntry(
      boss.typingMechanic,
    );
    boss.typed = 0;
    boss.wordMissed = false;
    boss.actionCooldown =
      (bossActionInterval(boss.role, boss.phase) *
        (boss.typingMechanic === undefined
          ? 1
          : bossActionIntervalMultiplier(
              boss.typingMechanic,
            ))) /
      Math.max(0.75, this.difficulty?.bossPressure ?? 1) /
      Math.max(1, this.difficulty?.bossActionRateMultiplier ?? 1);
    const fx = enemyFxProfile(
      definition?.family ?? "devil",
      "boss-phase",
    );
    this.burst(x, y, fx.count, fx.hue);
    this.sfx.bossPhase(fx.pitch);

    if (this.settings.screenShake) {
      this.shake = Math.max(this.shake, boss.phase >= 3 ? 10 : 7);
    }

    this.hooks.onBossUpdate(toBossHud(boss));
  }

  private defeatBoss(): void {
    const boss = this.boss;
    if (boss === null) return;

    const { x, y } = this.bossPosition();
    this.triggerImpactFeedback("boss-defeat");
    this.stats.kills += 1;
    this.addScore(1200 * this.stats.multiplier);
    this.gainPower(18);

    const definition = enemyDefinition(
      bossVisualDefinitionIdForStage(
        this.hiddenEncounterRuntime?.bossStageOverride ??
          this.stageConfig?.stage ??
          1,
        boss.role,
      ),
    );
    const fx = enemyFxProfile(
      definition?.family ?? "devil",
      "boss-death",
    );
    this.burst(x, y, fx.count, fx.hue);
    this.sfx.bossDeath(fx.pitch);
    this.tryRollEquipmentDrop("boss");
    if (definition !== undefined) {
      this.activateDefinitionReward(definition, x, y);
    }

    if (this.settings.screenShake) {
      this.shake = Math.max(this.shake, 13);
    }

    this.boss = null;
    this.bossDefeated = true;
    this.hooks.onBossUpdate(null);

    if (this.hiddenEncounterRuntime === null) {
      this.bossRewardPending = true;
      this.hooks.onBossRewardChoice(
        this.stageConfig?.stage ?? 1,
        boss.role,
      );
      return;
    }

    this.finishStage();
  }

  resolveBossRewardChoice(): boolean {
    if (
      !this.bossRewardPending ||
      !this.bossDefeated ||
      this.phase !== "playing"
    ) {
      return false;
    }

    this.bossRewardPending = false;
    this.finishStage();
    return true;
  }

  private rollPityEvent(
    key: LuckPityKey,
    baseChance: number,
    maxChance: number,
  ): boolean {
    const current = this.luckPity[key];
    const roll = rollLuckPity(
      baseChance,
      this.effectiveLuck(),
      current,
      maxChance,
    );

    if (roll.nextPity !== current) {
      this.luckPity = {
        ...this.luckPity,
        [key]: roll.nextPity,
      };
      this.hooks.onLuckPityUpdate({ ...this.luckPity });
    }

    return roll.triggered;
  }

  private tryRollEquipmentDrop(source: LootSource): void {
    const drop = rollEquipmentDrop(
      source,
      this.effectiveLuck(),
      this.playerStats.salvage,
    );
    if (drop !== null) {
      if (
        drop.grade === "silver" ||
        drop.grade === "gold" ||
        drop.grade === "diamond"
      ) {
        this.sfx.rareDrop();
      }
      this.hooks.onEquipmentDrop(drop);
    }
  }

  private typeSupplyPod(pod: SupplyPod, key: string): void {
    const word = typingText(pod.entry.en);
    const expected = word[pod.typed];

    if (key !== expected) {
      this.registerMiss();
      return;
    }

    pod.typed += 1;
    this.stats.hits += 1;
    this.stats.streak += 1;
    this.stats.maxStreak = Math.max(
      this.stats.maxStreak,
      this.stats.streak,
    );
    this.stats.multiplier = multiplierForStreak(this.stats.streak);
    this.addScore(8 * this.stats.multiplier);
    this.gainPower(1.2);
    this.applyCharacterCorrectKeyPassive();

    this.burst(pod.x, pod.y, 7, 48);
    this.sfx.shot(this.stats.multiplier);

    if (pod.typed >= word.length) {
      this.collectSupplyPod(pod);
    }

    this.emitStats();
  }

  private collectSupplyPod(pod: SupplyPod): void {
    const reward = applySupplyReward(
      pod.reward,
      {
        hull: this.stats.hull,
        shield: this.stats.shield,
        energy: this.stats.energy,
      },
      {
        hull: this.stats.maxHull,
        shield: this.stats.maxShield,
        energy: this.stats.maxEnergy,
      },
      this.stats.power,
    );

    this.stats.hull = reward.resources.hull;
    this.stats.shield = reward.resources.shield;
    this.stats.energy = reward.resources.energy;
    this.stats.power = reward.power;
    this.addScore(140 * this.stats.multiplier);
    this.hooks.onWordComplete(pod.entry);
    this.burst(pod.x, pod.y, 34, 48);
    this.sfx.support();
    this.supplyPod = null;
    this.emitStats();
  }

  private typeTreasureDrone(drone: TreasureDrone, key: string): void {
    const word = typingText(drone.entry.en);
    const expected = word[drone.typed];

    if (key !== expected) {
      this.registerMiss();
      return;
    }

    drone.typed += 1;
    this.stats.hits += 1;
    this.stats.streak += 1;
    this.stats.maxStreak = Math.max(
      this.stats.maxStreak,
      this.stats.streak,
    );
    this.stats.multiplier = multiplierForStreak(this.stats.streak);
    this.addScore(12 * this.stats.multiplier);
    this.gainPower(1.5);
    this.applyCharacterCorrectKeyPassive();
    this.burst(drone.x, drone.y, 8, 48);
    this.sfx.shot(this.stats.multiplier);

    if (drone.typed >= word.length) {
      const drop = rollEquipmentDrop(
        "treasure",
        this.effectiveLuck(),
        this.playerStats.salvage,
      );
      if (drop !== null) {
        this.hooks.onEquipmentDrop(drop);
      }
      this.addScore(320 * this.stats.multiplier);
      this.hooks.onWordComplete(drone.entry);
      this.burst(drone.x, drone.y, 44, 48);
      this.sfx.support();
      this.treasureDrone = null;
    }

    this.emitStats();
  }

  private typeRewardChoiceCrate(
    crate: RewardChoiceCrate,
    key: string,
  ): void {
    const word = typingText(crate.entry.en);
    const expected = word[crate.typed];

    if (key !== expected) {
      this.registerMiss();
      return;
    }

    crate.typed += 1;
    this.stats.hits += 1;
    this.stats.streak += 1;
    this.stats.maxStreak = Math.max(
      this.stats.maxStreak,
      this.stats.streak,
    );
    this.stats.multiplier = multiplierForStreak(this.stats.streak);
    this.addScore(10 * this.stats.multiplier);
    this.gainPower(1.3);
    this.applyCharacterCorrectKeyPassive();
    this.burst(crate.x, crate.y, 7, 286);
    this.sfx.shot(this.stats.multiplier);

    if (crate.typed >= word.length) {
      const options = createRewardChoiceOptions(this.effectiveLuck());
      this.addScore(220 * this.stats.multiplier);
      this.hooks.onWordComplete(crate.entry);
      this.burst(crate.x, crate.y, 40, 286);
      this.sfx.support();
      this.rewardChoiceCrate = null;
      if (options.length > 0) {
        this.hooks.onRewardChoice(options);
      }
    }

    this.emitStats();
  }

  private typeAnomalyCrate(crate: AnomalyCrate, key: string): void {
    const word = typingText(crate.entry.en);
    const expected = word[crate.typed];

    if (key !== expected) {
      this.registerMiss();
      return;
    }

    crate.typed += 1;
    this.stats.hits += 1;
    this.stats.streak += 1;
    this.stats.maxStreak = Math.max(
      this.stats.maxStreak,
      this.stats.streak,
    );
    this.stats.multiplier = multiplierForStreak(this.stats.streak);
    this.addScore(12 * this.stats.multiplier);
    this.gainPower(1.4);
    this.applyCharacterCorrectKeyPassive();
    this.burst(crate.x, crate.y, 8, 322);
    this.sfx.shot(this.stats.multiplier);

    if (crate.typed >= word.length) {
      this.addScore(260 * this.stats.multiplier);
      this.hooks.onWordComplete(crate.entry);
      this.burst(crate.x, crate.y, 44, 322);
      this.sfx.support();
      this.anomalyCrate = null;
      this.anomalyResolutionPending = true;
      this.anomalyRiskRatio = anomalyRiskHullRatio(
        this.stageConfig?.stage ?? 1,
      );
      this.hooks.onAnomalyReady(this.anomalyRiskRatio);
    }

    this.emitStats();
  }

  resolveAnomaly(choice: AnomalyChoice): boolean {
    if (!this.anomalyResolutionPending) return false;

    if (choice === "overload") {
      this.stats.hull = Math.max(
        1,
        this.stats.hull - this.stats.maxHull * this.anomalyRiskRatio,
      );
      this.burst(
        this.width / 2,
        this.height - PLAYER_Y_OFFSET,
        30,
        350,
      );
    } else {
      this.stats.shield = clamp(
        this.stats.shield + this.stats.maxShield * 0.12,
        0,
        this.stats.maxShield,
      );
    }

    const reward = createAnomalyReward(
      choice,
      this.effectiveLuck(),
    );
    this.hooks.onEquipmentDrop(reward);
    this.anomalyResolutionPending = false;
    this.anomalyRiskRatio = 0;
    this.emitStats();
    return true;
  }

  private currentTarget(): Enemy | null {
    if (this.targetId === null) return null;

    const target =
      this.enemies.find((enemy) => enemy.id === this.targetId) ?? null;

    if (target === null) {
      this.targetId = null;
    }

    return target;
  }

  private typeTarget(enemy: Enemy, key: string): void {
    const word = typingText(enemy.entry.en);
    const expected = word[enemy.typed];

    if (key !== expected) {
      enemy.wordMissed = true;
      this.registerMiss();
      return;
    }

    enemy.typed += 1;
    enemy.flash = 1;
    enemy.kick = 1;

    this.stats.hits += 1;
    this.stats.streak += 1;
    this.stats.maxStreak = Math.max(this.stats.maxStreak, this.stats.streak);
    this.stats.multiplier = multiplierForStreak(this.stats.streak);
    this.addScore(10 * this.stats.multiplier);
    this.gainPower(1.8);
    this.applyCharacterCorrectKeyPassive();
    this.applyRelicCorrectKeyPassive(enemy);

    this.fireLaser(enemy, 0.8);
    this.sfx.shot(this.stats.multiplier);

    if (enemy.typed >= word.length) {
      this.completeWord(enemy);
    }

    this.emitStats();
  }

  private completeWord(enemy: Enemy): void {
    this.triggerImpactFeedback("word");
    const length = typingText(enemy.entry.en).length;
    const perfectWord = !enemy.wordMissed;
    this.sfx.wordComplete(perfectWord);
    this.hooks.onWordComplete(enemy.entry);
    this.applyCharacterWordCompletePassive(length);
    this.applyCharacterPerfectWordPassive(perfectWord);
    this.applyRelicWordComplete(length, perfectWord, enemy);

    if (enemy.layersRemaining > 1) {
      enemy.layersRemaining -= 1;
      enemy.entry = this.pickEnemyLayerEntry(enemy);
      enemy.typed = 0;
      enemy.wordMissed = false;
      enemy.flash = 1;
      enemy.kick = 1.45;

      if (enemy.kind === "shield") {
        enemy.speed *= 1.2;
      }

      this.addScore((45 + length * 8) * this.stats.multiplier);
      this.gainPower(4);

      this.fireLaser(enemy, 1.25);
      const hitDefinition = this.visualDefinitionForEnemy(enemy);
      const hitFx = enemyFxProfile(
        hitDefinition?.family ?? "rainbow",
        "hit",
      );
      this.burst(enemy.x, enemy.y, hitFx.count, hitFx.hue);
      this.sfx.hit(hitFx.pitch);
      this.targetId = null;
      return;
    }

    this.stats.kills += 1;
    this.addScore((80 + length * 14) * this.stats.multiplier);
    this.gainPower(7);

    this.fireLaser(enemy, 1.45);
    const deathDefinition = this.visualDefinitionForEnemy(enemy);
    const deathFx = enemyFxProfile(
      deathDefinition?.family ?? "rainbow",
      "death",
    );
    this.burst(enemy.x, enemy.y, deathFx.count, deathFx.hue);
    this.sfx.hit(deathFx.pitch);
    this.sfx.kill(deathFx.pitch);
    if (enemy.elite || deathDefinition?.rarity === "elite") {
      const announcerEvent = this.priorityKillChain.registerKill(
        this.stageElapsedSeconds,
      );
      if (announcerEvent !== null) {
        this.sfx.announcer(announcerEvent);
      }
    }
    if (enemy.golden) {
      this.addScore(260 * this.stats.multiplier);
    }
    this.tryRollEquipmentDrop(
      enemy.golden ? "golden" : enemy.elite ? "elite" : "normal",
    );
    this.activateEnemyReward(enemy);

    if (enemy.kind === "splitter") {
      this.spawnSplitFragments(enemy);
    }

    if (enemy.eliteModifiers.includes("volatile")) {
      this.spawnVolatileBurst(enemy);
    }

    if (this.settings.screenShake) {
      this.shake = Math.max(
        this.shake,
        enemy.kind === "tank" ? 6.5 : 4.5,
      );
    }

    this.updateStageObjective({
      type: "enemy-kill",
      enemyId: enemy.id,
      kind: enemy.kind,
      elite: enemy.elite,
    });

    this.enemies = this.enemies.filter((item) => item.id !== enemy.id);
    if (this.markedEnemyId === enemy.id) {
      this.markedEnemyId = null;
      this.markTimer = 0;
    }
    this.targetId = null;
  }

  private notifyEnemySeen(definitionId: EnemyDefinitionId): void {
    if (this.seenEnemyDefinitions.has(definitionId)) return;
    this.seenEnemyDefinitions.add(definitionId);
    this.hooks.onEnemySeen(definitionId);
  }

  private visualDefinitionForEnemy(enemy: Enemy) {
    return enemyDefinition(
      enemy.definitionId ??
        worldRuntimeEnemyDefinitionId(
          enemy.kind,
          enemy.elite,
          this.hiddenEncounterRuntime?.rosterStageOverride ??
            this.stageConfig?.stage ??
            1,
        ),
    );
  }

  private activateEnemyReward(enemy: Enemy): void {
    const definition = this.visualDefinitionForEnemy(enemy);
    if (definition?.reward === undefined) return;
    this.activateDefinitionReward(
      definition,
      enemy.x,
      enemy.y,
      enemy,
    );
  }

  private activateDefinitionReward(
    definition: NonNullable<ReturnType<typeof enemyDefinition>>,
    x: number,
    y: number,
    sourceEnemy?: Enemy,
  ): void {
    if (definition.reward === undefined) return;

    const effect = applyEnemyRewardEffect(
      definition.reward,
      {
        restoreHull: (ratio) => {
          this.stats.hull = clamp(
            this.stats.hull + this.stats.maxHull * ratio,
            0,
            this.stats.maxHull,
          );
        },
        restoreShield: (ratio) => {
          this.stats.shield = clamp(
            this.stats.shield + this.stats.maxShield * ratio,
            0,
            this.stats.maxShield,
          );
        },
        applyPlayerStatus: (id, duration) => {
          this.addStatus(id, duration, "enemy-reward");
        },
        setFireRateBoost: (duration) => {
          this.weaponOverclockTimer = Math.max(
            this.weaponOverclockTimer,
            duration,
          );
        },
        freezeNearby: (duration) => {
          if (sourceEnemy !== undefined) {
            applyEnemyAreaControl(this.enemies, sourceEnemy, duration, 0);
          }
        },
        slowNearby: (duration) => {
          if (sourceEnemy !== undefined) {
            applyEnemyAreaControl(
              this.enemies,
              sourceEnemy,
              duration,
              0.55,
            );
          }
        },
        damageNearby: (power) => {
          if (sourceEnemy !== undefined) {
            softenNearbyEnemies(this.enemies, sourceEnemy, power, 5);
          }
        },
        chainDamage: (power) => {
          if (sourceEnemy !== undefined) {
            softenNearbyEnemies(
              this.enemies,
              sourceEnemy,
              power,
              4,
              330,
            );
          }
        },
        clearNormalEnemies: () => {
          this.enemies = this.enemies.filter(
            (target) =>
              target.elite ||
              (sourceEnemy !== undefined &&
                target.id === sourceEnemy.id),
          );
        },
        clearProjectiles: () => {
          this.projectiles = [];
        },
        setScoreMultiplier: (_multiplier, duration) => {
          this.rewardScoreMultiplierTimer = Math.max(
            this.rewardScoreMultiplierTimer,
            duration,
          );
        },
        setCreditsMultiplier: (_multiplier, duration) => {
          this.rewardCreditsMultiplierTimer = Math.max(
            this.rewardCreditsMultiplierTimer,
            duration,
          );
        },
        reduceSkillCooldowns: (seconds) => {
          this.skillEngine.reduceCooldowns(seconds);
          this.hooks.onSkills();
        },
        restoreEnergy: (ratio) => {
          this.stats.energy = clamp(
            this.stats.energy + this.stats.maxEnergy * ratio,
            0,
            this.stats.maxEnergy,
          );
        },
        addPower: (amount) => {
          this.stats.power = clamp(this.stats.power + amount, 0, 100);
        },
      },
      definition.rewardPower,
    );

    const rewardFx = rewardFxProfile(definition.reward);
    this.burst(x, y, rewardFx.count, rewardFx.hue);
    if (rewardFx.audio === "support") {
      this.sfx.support();
    } else if (rewardFx.audio === "rare-drop") {
      this.sfx.rareDrop();
    } else {
      this.sfx.power();
    }
    this.rewardNotice = {
      label: effect.label,
      x,
      y,
      hue: rewardFx.hue,
      remaining: 1.05,
    };
    this.hooks.onStatuses(this.statusState);
    this.emitStats();
  }

  private spawnVolatileBurst(enemy: Enemy): void {
    if (this.difficulty === null) return;

    const playerX = this.width / 2;
    const playerY = this.height - PLAYER_Y_OFFSET;
    const baseAngle = Math.atan2(playerY - enemy.y, playerX - enemy.x);
    const alphabet = "asdfjklqweruiopzxcvbnm";
    const speed = 105 + this.difficulty.projectilePressure * 34;

    for (const offset of [-0.13, 0.13]) {
      const char =
        alphabet[Math.floor(Math.random() * alphabet.length)] ?? "a";
      const angle = baseAngle + offset;

      this.projectiles.push({
        id: this.nextProjectileId++,
        ownerId: enemy.id,
        char,
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 12,
      });
    }

    this.burst(enemy.x, enemy.y, 26, 48);
  }

  private spawnSplitFragments(splitter: Enemy): void {
    if (this.difficulty === null) return;

    for (const direction of [-1, 1]) {
      if (!this.canAdmitEnemyKind("scout", this.difficulty)) break;
      const profile = enemyProfile("scout", this.stageConfig?.galaxy ?? 1);
      const baseX = clamp(
        splitter.x + direction * randomBetween(54, 86),
        55,
        this.width - 55,
      );

      const stage = this.stageConfig?.stage ?? 1;
      const rosterStage =
        this.hiddenEncounterRuntime?.rosterStageOverride ?? stage;
      const definitionId = spawnWorldEnemyDefinitionId(
        "scout",
        false,
        rosterStage,
      );
      const typingProfile = resolveEnemyTypingProfile({
        stage: rosterStage,
        kind: "scout",
        elite: false,
        minimumLayers: 1,
        vocabularyLevel: this.vocabularyLevel,
        entries: this.vocabulary,
        wordScoreOffset: this.difficulty.wordScoreOffset,
      });
      const runtimeProfile = resolveEnemyRuntimeProfile({
        stage: rosterStage,
        kind: "scout",
        rank: typingProfile.rank,
        elite: false,
        wordDifficultyScore: typingProfile.wordDifficultyScore,
        layers: typingProfile.layersRemaining,
      });
      const firstSkill = runtimeProfile.skills[0];

      this.enemies.push({
        id: this.nextEnemyId++,
        kind: "scout",
        definitionId,
        elite: false,
        eliteModifiers: [],
        rank: typingProfile.rank,
        wordDifficultyScore: typingProfile.wordDifficultyScore,
        layerPlan: typingProfile.layerPlan,
        skillIds: runtimeProfile.skills,
        nextSkillIndex: 0,
        pendingSkillId: null,
        skillTelegraphRemaining: 0,
        threatBudget: runtimeProfile.threatBudget,
        entry: typingProfile.entry,
        typed: 0,
        wordMissed: false,
        layersRemaining: typingProfile.layersRemaining,
        x: splitter.x,
        y: splitter.y,
        baseX,
        speed:
          (profile.baseSpeed + randomBetween(10, 18)) *
          this.difficulty.enemySpeed *
          1.12,
        age: Math.random() * 8,
        drift: randomBetween(48, 82),
        radius: 15,
        flash: 1,
        kick: 0.7,
        actionCooldown:
          firstSkill === undefined
            ? null
            : this.enemySkillCooldown(firstSkill, this.difficulty),
      });
      this.notifyEnemySeen(definitionId);
    }

    this.burst(splitter.x, splitter.y, 30, 318);
  }

  private applyRelicCorrectKeyPassive(source: Enemy): void {
    const interval = this.relicEffects.streakFreezeInterval;
    if (
      interval <= 0 ||
      this.stats.streak <= 0 ||
      this.stats.streak % interval !== 0
    ) {
      return;
    }

    const changed = applyEnemyAreaControl(
      this.enemies,
      source,
      this.relicEffects.streakFreezeSeconds,
      0,
      280,
    );
    if (changed > 0) {
      this.burst(source.x, source.y, 18, 205);
      this.sfx.support();
    }
  }

  private applyRelicWordComplete(
    length: number,
    perfectWord: boolean,
    source?: Enemy,
  ): void {
    if (
      !this.relicFirstWordTriggered &&
      this.relicEffects.firstWordHullRatio > 0
    ) {
      this.relicFirstWordTriggered = true;
      this.stats.hull = clamp(
        this.stats.hull +
          this.stats.maxHull * this.relicEffects.firstWordHullRatio,
        0,
        this.stats.maxHull,
      );
      this.burst(
        this.width / 2,
        this.height - PLAYER_Y_OFFSET,
        14,
        132,
      );
    }

    if (
      perfectWord &&
      source !== undefined &&
      this.relicEffects.perfectWordChainRatio > 0 &&
      this.relicEffects.perfectWordChainTargets > 0
    ) {
      const changed = softenNearbyEnemies(
        this.enemies,
        source,
        this.relicEffects.perfectWordChainRatio,
        this.relicEffects.perfectWordChainTargets,
        330,
      );
      if (changed > 0) {
        this.burst(source.x, source.y, 16 + changed * 3, 286);
      }
    }

    if (
      length >= this.relicEffects.longBossWordMinLength &&
      this.relicEffects.longBossWordMinLength > 0
    ) {
      this.gainPower(1.5);
    }
  }

  private relicBossWordDamageMultiplier(length: number): number {
    return this.relicEffects.longBossWordMinLength > 0 &&
      length >= this.relicEffects.longBossWordMinLength
      ? this.relicEffects.longBossWordDamageMultiplier
      : 1;
  }

  private registerMiss(): void {
    this.stats.misses += 1;
    this.updateStageObjective({ type: "miss" });

    const guardAvailable =
      this.relicMistakeGuardsUsed <
        this.relicEffects.mistakeGuardCharges &&
      this.relicEffects.mistakeGuardShieldRatio > 0 &&
      this.stats.shield > 0;

    if (guardAvailable) {
      this.relicMistakeGuardsUsed += 1;
      this.stats.shield = Math.max(
        0,
        this.stats.shield -
          this.stats.maxShield *
            this.relicEffects.mistakeGuardShieldRatio,
      );
      this.burst(
        this.width / 2,
        this.height - PLAYER_Y_OFFSET,
        16,
        198,
      );
    } else {
      this.stats.streak = 0;
      this.stats.multiplier = 1;
      this.stats.power = clamp(this.stats.power - 12, 0, 100);
    }

    if (this.settings.screenShake) {
      this.shake = Math.max(this.shake, guardAvailable ? 1 : 2);
    }

    this.sfx.wrong();
    this.emitStats();
  }

  private createGameStats(stage: number): GameStats {
    const resources = createPlayerResources(this.playerStats);

    return {
      score: 0,
      streak: 0,
      maxStreak: 0,
      multiplier: 1,
      hits: 0,
      misses: 0,
      kills: 0,
      stage,
      hull: resources.hull,
      maxHull: this.playerStats.hull,
      shield: resources.shield,
      maxShield: this.playerStats.shield,
      energy: resources.energy,
      maxEnergy: this.playerStats.energy,
      power: 0,
    };
  }

  getCreditsMultiplier(): number {
    return timedRewardMultiplier(this.rewardCreditsMultiplierTimer);
  }

  private addScore(amount: number): void {
    const multiplier = timedRewardMultiplier(
      this.rewardScoreMultiplierTimer,
    );
    this.stats.score += Math.max(0, amount) * multiplier;
  }

  private effectiveLuck(): number {
    return (
      this.playerStats.luck +
      (statusRemaining(this.statusState, "lucky") > 0 ? 25 : 0)
    );
  }

  private gainPower(baseGain: number): void {
    this.stats.power = clamp(
      this.stats.power +
        focusPowerGain(baseGain, this.playerStats),
      0,
      100,
    );
  }

  private updatePlayerResources(dt: number): void {
    this.secondsSinceDamage += dt;
    this.resourceEmitTimer -= dt;

    const beforeShield = this.stats.shield;
    const beforeEnergy = this.stats.energy;
    const next = regenerateResources(
      {
        hull: this.stats.hull,
        shield: this.stats.shield,
        energy: this.stats.energy,
      },
      this.playerStats,
      dt,
      this.secondsSinceDamage >= 3,
    );

    this.stats.hull = next.hull;
    this.stats.shield = next.shield;
    this.stats.energy = next.energy;

    const changed =
      Math.abs(beforeShield - next.shield) > 0.01 ||
      Math.abs(beforeEnergy - next.energy) > 0.01;

    if (changed && this.resourceEmitTimer <= 0) {
      this.resourceEmitTimer = 0.15;
      this.emitStats();
    }
  }

  private applyCharacterWordCompletePassive(wordLength: number): void {
    if (
      this.characterId !== "volt" ||
      wordLength < VOLT_LONG_WORD_LENGTH
    ) {
      return;
    }

    const nextEnergy = restoreVoltEnergy(
      this.stats.energy,
      this.stats.maxEnergy,
      wordLength,
    );
    if (nextEnergy <= this.stats.energy) return;

    this.stats.energy = nextEnergy;
    this.burst(
      this.width / 2,
      this.height - PLAYER_Y_OFFSET,
      14,
      202,
    );
    this.sfx.support();
  }

  private applyCharacterPerfectWordPassive(perfectWord: boolean): void {
    if (!perfectWord) return;

    if (this.characterId === "aegis") {
      const nextShield = restoreAegisShield(
        this.stats.shield,
        this.stats.maxShield,
      );
      if (nextShield > this.stats.shield) {
        this.stats.shield = nextShield;
        this.burst(
          this.width / 2,
          this.height - PLAYER_Y_OFFSET,
          16,
          204,
        );
        this.sfx.support();
      }
    }

    if (this.characterId === "oracle") {
      this.gainPower(ORACLE_PERFECT_POWER_GAIN);
      if (this.boss !== null) {
        this.bossMarkTimer = Math.max(
          this.bossMarkTimer,
          ORACLE_PERFECT_MARK_DURATION,
        );
        this.boss.flash = 1;
        this.hooks.onBossUpdate(toBossHud(this.boss));
      }
    }

    if (this.characterId === "celestial") {
      this.celestialCharge = addCelestialCharge(
        this.celestialCharge,
        true,
      );
      this.burst(
        this.width / 2,
        this.height - PLAYER_Y_OFFSET,
        10,
        220,
      );
    }
  }

  private applyCharacterCorrectKeyPassive(): void {
    if (
      this.characterId === "vanguard" &&
      shouldTriggerVanguardShieldRhythm(this.stats.streak)
    ) {
      const nextShield = restoreVanguardShield(this.stats.shield, this.stats.maxShield);
      if (nextShield > this.stats.shield) {
        this.stats.shield = nextShield;
        this.burst(this.width / 2, this.height - PLAYER_Y_OFFSET, 14, 184);
        this.sfx.support();
      }
    }

    if (
      this.characterId === "wraith" &&
      shouldTriggerWraithCloak(this.stats.streak)
    ) {
      this.cloakTimer = Math.max(this.cloakTimer, WRAITH_PASSIVE_CLOAK_DURATION);
      this.burst(this.width / 2, this.height - PLAYER_Y_OFFSET, 12, 274);
      this.sfx.support();
    }

    if (
      this.characterId === "zenith" &&
      shouldTriggerZenithCore(this.stats.streak)
    ) {
      this.stats.shield = clamp(
        this.stats.shield + this.stats.maxShield * 0.08,
        0,
        this.stats.maxShield,
      );
      this.stats.energy = clamp(
        this.stats.energy + this.stats.maxEnergy * 0.1,
        0,
        this.stats.maxEnergy,
      );
      this.gainPower(5);
      this.burst(
        this.width / 2,
        this.height - PLAYER_Y_OFFSET,
        14,
        190,
      );
    }
  }

  private characterBossDamageMultiplier(): number {
    let multiplier = 1;

    if (this.characterId === "arsenal" && this.weaponOverclockTimer > 0) {
      multiplier *= 1.35;
    }
    if (statusRemaining(this.statusState, "overcharged") > 0) {
      multiplier *= 1.2;
    }
    if (this.characterId === "reaper") {
      multiplier *= reaperStreakDamageMultiplier(this.stats.streak);
    }
    if (
      (this.characterId === "celestial" ||
        this.characterId === "zenith") &&
      this.overdriveTimer > 0
    ) {
      multiplier *= this.characterId === "zenith" ? 1.25 : 1.18;
    }

    return multiplier;
  }

  private activateOverdrive(): void {
    if (this.stats.power < 100) return;

    const isVanguard = this.characterId === "vanguard";
    const isAegis = this.characterId === "aegis";
    const isVolt = this.characterId === "volt";
    const isWraith = this.characterId === "wraith";
    const isFortune = this.characterId === "fortune";
    const isArsenal = this.characterId === "arsenal";
    const isOracle = this.characterId === "oracle";
    const isBastion = this.characterId === "bastion";
    const isReaper = this.characterId === "reaper";
    const isCelestial = this.characterId === "celestial";
    const isZenith = this.characterId === "zenith";
    this.stats.power = 0;
    this.overdriveTimer = isVanguard
      ? VANGUARD_NOVA_DURATION
      : isFortune
        ? FORTUNE_JACKPOT_DURATION
        : isReaper
          ? REAPER_DEATH_CHAIN_DURATION
          : isZenith
            ? ZENITH_PROTOCOL_DURATION
            : isAegis ||
                isVolt ||
                isWraith ||
                isArsenal ||
                isOracle ||
                isBastion ||
                isCelestial
              ? 0
              : 4.5;

    if (isVanguard) {
      this.stats.shield = restoreVanguardShield(
        this.stats.shield,
        this.stats.maxShield,
        VANGUARD_NOVA_SHIELD_RATIO,
      );
    } else if (isAegis) {
      this.stats.shield = restoreAegisShield(
        this.stats.shield,
        this.stats.maxShield,
        AEGIS_FORTRESS_SHIELD_RATIO,
      );
      this.barrierHp = Math.max(
        this.barrierHp,
        140 + this.playerStats.shield * 0.9,
      );
      this.barrierTimer = Math.max(
        this.barrierTimer,
        AEGIS_FORTRESS_DURATION,
      );
      this.reflectTimer = Math.max(
        this.reflectTimer,
        AEGIS_FORTRESS_DURATION,
      );
      this.guardianTimer = Math.max(
        this.guardianTimer,
        AEGIS_FORTRESS_DURATION,
      );
      this.guardianBlocks = Math.max(this.guardianBlocks, 5);
    } else if (isVolt) {
      this.projectiles = [];
      this.setStatusState(
        cleanseNegativeStatuses(this.statusState),
      );
      this.interferenceTimer = 0;
      this.stats.energy = this.stats.maxEnergy;

      const targets = [...this.enemies]
        .sort((a, b) => b.y - a.y)
        .slice(0, VOLT_THUNDER_TARGETS);

      for (const enemy of targets) {
        const wordLength = typingText(enemy.entry.en).length;
        if (enemy.layersRemaining > 1) {
          enemy.layersRemaining -= 1;
        } else {
          enemy.typed = chainTypingAdvance(enemy.typed, wordLength);
        }
        if (enemy.actionCooldown !== null) {
          enemy.actionCooldown += VOLT_EMP_DELAY;
        }
        enemy.flash = 1;
        enemy.kick = Math.max(enemy.kick, 1.35);
        this.burst(enemy.x, enemy.y, 20, 202);
      }

      if (this.boss !== null) {
        const damage = firepowerDamage(
          Math.max(
            1,
            Math.round(this.boss.maxHp * VOLT_THUNDER_BOSS_RATIO),
          ),
          this.playerStats,
        );
        this.boss.hp = Math.max(0, this.boss.hp - damage);
        this.boss.flash = 1;
        this.boss.actionCooldown += VOLT_EMP_DELAY;
        this.updateBossPhase(this.boss);
        this.hooks.onBossUpdate(toBossHud(this.boss));

        if (this.boss.hp <= 0) {
          this.defeatBoss();
        }
      }
    } else if (isWraith) {
      this.projectiles = [];
      this.timeShellTimer = Math.max(this.timeShellTimer, WRAITH_TIME_COLLAPSE_DURATION);
      this.gravityWellTimer = Math.max(this.gravityWellTimer, WRAITH_TIME_COLLAPSE_DURATION);
      this.cloakTimer = Math.max(this.cloakTimer, WRAITH_ACTIVE_CLOAK_DURATION);
    } else if (isFortune) {
      this.stats.energy = this.stats.maxEnergy;
      this.stats.shield = clamp(
        this.stats.shield + this.stats.maxShield * FORTUNE_JACKPOT_SHIELD_RATIO,
        0,
        this.stats.maxShield,
      );
    } else if (isArsenal) {
      this.weaponOverclockTimer = Math.max(
        this.weaponOverclockTimer,
        ARSENAL_PROTOCOL_DURATION,
      );
      const targets = [...this.enemies]
        .sort((a, b) => b.y - a.y)
        .slice(0, ARSENAL_PROTOCOL_TARGETS);

      for (const enemy of targets) {
        const wordLength = typingText(enemy.entry.en).length;
        enemy.typed = chainTypingAdvance(enemy.typed, wordLength);
        enemy.flash = 1;
        enemy.kick = Math.max(enemy.kick, 1.15);
        this.burst(enemy.x, enemy.y, 16, 18);
      }

      if (this.boss !== null) {
        const damage = firepowerDamage(
          Math.max(
            1,
            Math.round(this.boss.maxHp * ARSENAL_PROTOCOL_BOSS_RATIO),
          ),
          this.playerStats,
        );
        this.boss.hp = Math.max(0, this.boss.hp - damage);
        this.boss.flash = 1;
        this.updateBossPhase(this.boss);
        this.hooks.onBossUpdate(toBossHud(this.boss));

        if (this.boss.hp <= 0) {
          this.defeatBoss();
        }
      }
    } else if (isOracle) {
      this.bossMarkTimer = Math.max(
        this.bossMarkTimer,
        ORACLE_ULTIMATE_MARK_DURATION,
      );
      const targets = [...this.enemies]
        .sort((a, b) => b.y - a.y)
        .slice(0, ORACLE_ULTIMATE_TARGETS);

      for (const enemy of targets) {
        const wordLength = typingText(enemy.entry.en).length;
        enemy.typed = chainTypingAdvance(enemy.typed, wordLength);
        enemy.flash = 1;
        enemy.kick = Math.max(enemy.kick, 1.1);
        this.burst(enemy.x, enemy.y, 18, 326);
      }

      if (this.boss !== null) {
        const damage = firepowerDamage(
          Math.max(
            1,
            Math.round(this.boss.maxHp * ORACLE_ULTIMATE_BOSS_RATIO),
          ),
          this.playerStats,
        );
        this.boss.hp = Math.max(0, this.boss.hp - damage);
        this.boss.flash = 1;
        this.updateBossPhase(this.boss);
        this.hooks.onBossUpdate(toBossHud(this.boss));

        if (this.boss.hp <= 0) {
          this.defeatBoss();
        }
      }
    } else if (isBastion) {
      this.stats.shield = recycleBastionShield(
        this.stats.shield,
        this.stats.maxShield,
        BASTION_SANCTUARY_SHIELD_RATIO,
      );
      this.guardianTimer = Math.max(
        this.guardianTimer,
        BASTION_SANCTUARY_DURATION,
      );
      this.guardianBlocks = Math.max(
        this.guardianBlocks,
        BASTION_SANCTUARY_BLOCKS,
      );
      this.barrierHp = Math.max(
        this.barrierHp,
        120 + this.playerStats.shield * 0.7,
      );
      this.barrierTimer = Math.max(
        this.barrierTimer,
        BASTION_SANCTUARY_DURATION,
      );
    } else if (isReaper) {
      const targets = [...this.enemies]
        .sort((a, b) => b.y - a.y)
        .slice(0, REAPER_DEATH_CHAIN_TARGETS);

      for (const enemy of targets) {
        const wordLength = typingText(enemy.entry.en).length;
        enemy.typed = chainTypingAdvance(enemy.typed, wordLength);
        enemy.flash = 1;
        enemy.kick = Math.max(enemy.kick, 1.3);
        this.burst(enemy.x, enemy.y, 20, 350);
      }

      if (this.boss !== null) {
        const damage =
          firepowerDamage(
            Math.max(
              1,
              Math.round(this.boss.maxHp * REAPER_DEATH_CHAIN_BOSS_RATIO),
            ),
            this.playerStats,
          ) * reaperStreakDamageMultiplier(this.stats.streak);
        this.boss.hp = Math.max(0, this.boss.hp - damage);
        this.boss.flash = 1;
        this.updateBossPhase(this.boss);
        this.hooks.onBossUpdate(toBossHud(this.boss));
        if (this.boss.hp <= 0) this.defeatBoss();
      }
    } else if (isCelestial) {
      const chargeFactor = this.celestialCharge / 100;
      const targets = [...this.enemies]
        .sort((a, b) => b.y - a.y)
        .slice(0, CELESTIAL_STARFALL_TARGETS);

      for (const enemy of targets) {
        const wordLength = typingText(enemy.entry.en).length;
        enemy.typed = chainTypingAdvance(enemy.typed, wordLength);
        enemy.flash = 1;
        enemy.kick = Math.max(enemy.kick, 1.25);
        this.burst(enemy.x, enemy.y, 20, 220);
      }

      if (this.boss !== null) {
        const damage = firepowerDamage(
          Math.max(
            1,
            Math.round(
              this.boss.maxHp *
                CELESTIAL_STARFALL_BOSS_RATIO *
                (1 + chargeFactor * 0.7),
            ),
          ),
          this.playerStats,
        );
        this.boss.hp = Math.max(0, this.boss.hp - damage);
        this.boss.flash = 1;
        this.updateBossPhase(this.boss);
        this.hooks.onBossUpdate(toBossHud(this.boss));
        if (this.boss.hp <= 0) this.defeatBoss();
      }

      this.stats.shield = clamp(
        this.stats.shield + this.stats.maxShield * (0.12 + chargeFactor * 0.18),
        0,
        this.stats.maxShield,
      );
      this.stats.energy = clamp(
        this.stats.energy + this.stats.maxEnergy * (0.18 + chargeFactor * 0.2),
        0,
        this.stats.maxEnergy,
      );
      this.celestialCharge = 0;
    } else if (isZenith) {
      this.timeShellTimer = Math.max(this.timeShellTimer, 5);
      this.bossMarkTimer = Math.max(
        this.bossMarkTimer,
        ZENITH_PROTOCOL_MARK_DURATION,
      );
      this.guardianTimer = Math.max(
        this.guardianTimer,
        ZENITH_PROTOCOL_DURATION,
      );
      this.guardianBlocks = Math.max(
        this.guardianBlocks,
        ZENITH_PROTOCOL_GUARD_BLOCKS,
      );
      this.barrierHp = Math.max(
        this.barrierHp,
        90 + this.playerStats.shield * 0.55,
      );
      this.barrierTimer = Math.max(
        this.barrierTimer,
        ZENITH_PROTOCOL_DURATION,
      );
      this.stats.energy = this.stats.maxEnergy;
      this.stats.shield = clamp(
        this.stats.shield + this.stats.maxShield * 0.28,
        0,
        this.stats.maxShield,
      );
    }

    const visual = ultimateVisual(this.characterId);
    this.burst(
      this.width / 2,
      this.height - PLAYER_Y_OFFSET,
      visual.count,
      visual.hue,
    );

    if (this.settings.screenShake) {
      this.shake = Math.max(this.shake, visual.shake);
    }

    this.sfx.power();
    this.emitStats();
  }

  private damagePlayer(enemyId: number, x: number, y: number): void {
    const escaped = this.enemies.find(
      (enemy) => enemy.id === enemyId,
    );
    if (escaped !== undefined) {
      this.updateStageObjective({
        type: "enemy-escaped",
        enemyId: escaped.id,
        kind: escaped.kind,
        elite: escaped.elite,
      });
    }
    this.enemies = this.enemies.filter((enemy) => enemy.id !== enemyId);
    if (this.targetId === enemyId) this.targetId = null;
    this.applyPlayerDamage(x, y, 60);
  }

  private damageFromProjectile(
    projectileId: number,
    x: number,
    y: number,
  ): void {
    const projectile =
      this.projectiles.find((item) => item.id === projectileId) ?? null;

    this.projectiles = this.projectiles.filter(
      (item) => item.id !== projectileId,
    );

    if (this.reflectTimer > 0 && projectile !== null) {
      this.reflectProjectile(projectile, x, y);
      return;
    }

    const bastionRecycle =
      this.characterId === "bastion" &&
      this.guardianTimer > 0 &&
      this.guardianBlocks > 0;

    this.applyPlayerDamage(x, y, 42);

    if (bastionRecycle) {
      this.stats.shield = recycleBastionShield(
        this.stats.shield,
        this.stats.maxShield,
      );
      this.emitStats();
    }
  }

  private reflectProjectile(
    projectile: EnemyProjectile,
    x: number,
    y: number,
  ): void {
    if (projectile.ownerId === -1 && this.boss !== null) {
      const damage = Math.max(
        1,
        Math.round(this.boss.maxHp * 0.018),
      );
      this.boss.hp = Math.max(0, this.boss.hp - damage);
      this.boss.flash = 1;
      this.updateBossPhase(this.boss);
      this.hooks.onBossUpdate(toBossHud(this.boss));

      if (this.boss.hp <= 0) {
        this.defeatBoss();
      }
    } else {
      const enemy = this.enemies.find(
        (item) => item.id === projectile.ownerId,
      );

      if (enemy !== undefined) {
        enemy.flash = 1;
        enemy.kick = Math.max(enemy.kick, 1.2);

        if (enemy.layersRemaining > 1) {
          enemy.layersRemaining -= 1;
        } else {
          enemy.y = Math.max(-enemy.radius, enemy.y - 46);
        }

        this.fireLaser(enemy, 0.75);
      }
    }

    this.burst(x, y, 18, 300);
    this.sfx.hit();
  }

  private applyPlayerDamage(
    x: number,
    y: number,
    rawDamage: number,
  ): void {
    if (this.phoenixGraceTimer > 0) {
      this.burst(x, y, 18, 28);
      this.sfx.support();
      return;
    }

    if (this.cloakTimer > 0) {
      this.burst(x, y, 18, 274);
      this.sfx.support();
      return;
    }

    if (this.guardianTimer > 0 && this.guardianBlocks > 0) {
      this.guardianBlocks -= 1;
      if (this.guardianBlocks <= 0) {
        this.guardianTimer = 0;
      }

      this.burst(x, y, 22, 48);
      this.sfx.support();
      this.hooks.onSkills();
      return;
    }

    let damageRemaining = rawDamage;
    if (this.barrierTimer > 0 && this.barrierHp > 0) {
      const barrier = absorbBarrierDamage(
        this.barrierHp,
        damageRemaining,
      );
      this.barrierHp = barrier.barrierHp;
      damageRemaining = barrier.damageRemaining;

      if (this.barrierHp <= 0) {
        this.barrierTimer = 0;
      }

      this.burst(x, y, 18, 188);
      this.hooks.onSkills();

      if (damageRemaining <= 0) {
        this.sfx.hit();
        return;
      }
    }

    const shieldBefore = this.stats.shield;
    const damage = applyIncomingDamage(
      {
        hull: this.stats.hull,
        shield: this.stats.shield,
        energy: this.stats.energy,
      },
      this.playerStats,
      damageRemaining *
        statusIncomingDamageMultiplier(this.statusState),
    );

    this.stats.hull = damage.resources.hull;
    this.stats.shield = damage.resources.shield;
    this.stats.energy = damage.resources.energy;
    this.secondsSinceDamage = 0;
    this.stats.streak = 0;
    this.stats.multiplier = 1;
    this.stats.power = clamp(this.stats.power - 30, 0, 100);

    this.burst(x, y, 34, 2);

    if (this.settings.screenShake) {
      this.shake = Math.max(this.shake, 11);
    }

    if (shieldBefore > 0 && this.stats.shield <= 0) {
      this.sfx.shieldBreak();
    }
    this.sfx.damage();
    if (
      this.stats.hull <= 0 &&
      this.testLabEnabled &&
      this.testLabDeathMode === "immortal"
    ) {
      this.testLabLethalHits += 1;
      this.stats.hull = 1;
    }
    this.emitStats();

    if (this.stats.hull <= 0) {
      this.phase = "gameover";
      this.sfx.stageFail();
      this.hooks.onPhase(this.phase);
    }
  }

  private fireBossLaser(power: number): void {
    const { x, y } = this.bossPosition();
    this.lasers.push({
      x1: this.width / 2,
      y1: this.height - PLAYER_Y_OFFSET,
      x2: x,
      y2: y,
      life: 0.09,
      maxLife: 0.09,
      power,
    });
    this.burst(x, y, 7, 18);
  }

  private fireLaser(enemy: Enemy, power: number): void {
    this.lasers.push({
      x1: this.width / 2,
      y1: this.height - PLAYER_Y_OFFSET,
      x2: enemy.x,
      y2: enemy.y,
      life: 0.085,
      maxLife: 0.085,
      power,
    });

    this.burst(enemy.x, enemy.y, power > 1 ? 12 : 5, 188);
  }

  private triggerImpactFeedback(kind: ImpactKind): void {
    const feedback = impactFeedback(kind);
    this.hitStopTimer = Math.max(
      this.hitStopTimer,
      feedback.hitStopSeconds,
    );
    if (this.settings.screenShake && feedback.shake > 0) {
      this.shake = Math.max(this.shake, feedback.shake);
    }
  }

  private burst(x: number, y: number, count: number, hue: number): void {
    const profile = qualityProfile(this.settings.visualQuality);
    const finalCount = Math.max(
      2,
      Math.round(count * profile.particleScale),
    );

    for (let index = 0; index < finalCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomBetween(45, 240);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomBetween(0.22, 0.62),
        maxLife: 0.62,
        size: randomBetween(1.2, 4.2),
        hue: hue + randomBetween(-18, 18),
      });
    }

    if (this.particles.length > profile.maxParticles) {
      this.particles.splice(
        0,
        this.particles.length - profile.maxParticles,
      );
    }
  }

  private emitStats(): void {
    this.hooks.onStats(this.getStats());
  }

  private seedStars(): void {
    const profile = qualityProfile(this.settings.visualQuality);
    const count = Math.max(
      profile.minStars,
      Math.min(
        profile.maxStars,
        Math.round(
          (this.width * this.height) / profile.starAreaDivisor,
        ),
      ),
    );

    this.stars = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: randomBetween(0.2, 1),
    }));
  }

  private draw(time: number): void {
    const context = this.context;

    context.save();

    if (this.shake > 0 && this.settings.screenShake) {
      context.translate(
        randomBetween(-this.shake, this.shake),
        randomBetween(-this.shake, this.shake),
      );
    }

    this.drawBackground(time);
    if (this.interferenceTimer > 0) {
      this.drawInterference(time);
    }
    this.drawLasers();
    this.drawParticles();

    for (const projectile of this.projectiles) {
      this.drawProjectile(projectile);
    }

    if (this.supplyPod !== null) {
      this.drawSupplyPod(this.supplyPod);
    }
    if (this.treasureDrone !== null) {
      this.drawTreasureDrone(this.treasureDrone);
    }
    if (this.rewardChoiceCrate !== null) {
      this.drawRewardChoiceCrate(this.rewardChoiceCrate);
    }
    if (this.anomalyCrate !== null) {
      this.drawAnomalyCrate(this.anomalyCrate);
    }

    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    if (this.boss !== null) {
      this.drawBoss(time);
    }

    this.drawPlayer(time);
    this.drawDefensiveEffects(time);
    this.drawTargetLine();
    this.drawRewardNotice();
    this.drawEnemyControlOverlay();

    if (this.overdriveTimer > 0) {
      context.fillStyle =
        "rgba(65, 225, 255, " +
        String(0.035 + Math.sin(time * 10) * 0.012) +
        ")";
      context.fillRect(0, 0, this.width, this.height);
    }

    context.restore();
    this.drawRewardBuffTimers();
  }

  private drawEnemyControlOverlay(): void {
    const frozen = statusRemaining(this.statusState, "frozen");
    const silenced = statusRemaining(this.statusState, "silenced");
    if (frozen <= 0 && silenced <= 0) return;

    const context = this.context;
    context.save();

    if (frozen > 0) {
      context.fillStyle = "rgba(126, 220, 255, 0.09)";
      context.fillRect(0, 0, this.width, this.height);
      context.strokeStyle = "rgba(174, 239, 255, 0.32)";
      context.lineWidth = 5;
      context.strokeRect(4, 4, this.width - 8, this.height - 8);
      context.fillStyle = "rgba(220, 250, 255, 0.96)";
      context.font =
        "900 18px ui-monospace, SFMono-Regular, Menlo, monospace";
      context.textAlign = "center";
      context.fillText(
        "FROZEN · " + frozen.toFixed(1) + "s",
        this.width / 2,
        42,
      );
    }

    if (silenced > 0) {
      context.fillStyle = "rgba(190, 135, 255, 0.95)";
      context.font =
        "800 13px ui-monospace, SFMono-Regular, Menlo, monospace";
      context.textAlign = "center";
      context.fillText(
        "SKILLS SILENCED · " + silenced.toFixed(1) + "s",
        this.width / 2,
        frozen > 0 ? 64 : 42,
      );
    }

    context.restore();
  }

  private drawBackground(time: number): void {
    const context = this.context;
    if (this.backgroundGradient === null) {
      const gradient = context.createRadialGradient(
        this.width * 0.5,
        this.height * 0.78,
        50,
        this.width * 0.5,
        this.height * 0.52,
        Math.max(this.width, this.height) * 0.82,
      );
      gradient.addColorStop(
        0,
        this.worldEnvironment.backgroundCore,
      );
      gradient.addColorStop(
        0.45,
        this.worldEnvironment.backgroundMid,
      );
      gradient.addColorStop(
        1,
        this.worldEnvironment.backgroundEdge,
      );
      this.backgroundGradient = gradient;
    }

    context.fillStyle = this.backgroundGradient;
    context.fillRect(-30, -30, this.width + 60, this.height + 60);

    for (const star of this.stars) {
      const y =
        ((star.y +
          time *
            0.016 *
            this.worldEnvironment.starDrift *
            star.z) %
          1) *
        this.height;
      context.fillStyle =
        "rgba(" +
        this.worldEnvironment.starRgb +
        ", " +
        String(0.12 + star.z * 0.48) +
        ")";
      context.fillRect(
        star.x * this.width,
        y,
        star.z * 1.7,
        star.z * 1.7,
      );
    }

    context.save();
    context.fillStyle =
      "rgba(" +
      this.worldEnvironment.hazeRgb +
      ", " +
      String(this.worldEnvironment.hazeIntensity) +
      ")";
    context.fillRect(0, 0, this.width, this.height);

    context.translate(this.width / 2, this.height * 0.08);
    context.strokeStyle =
      "rgba(" +
      this.worldEnvironment.gridRgb +
      ", " +
      String(this.worldEnvironment.gridIntensity) +
      ")";
    context.lineWidth = 1;

    const profile = qualityProfile(this.settings.visualQuality);
    const horizon = 44;
    const scroll = (time * 72) % profile.gridStep;

    for (
      let y = horizon + scroll;
      y < this.height;
      y += profile.gridStep
    ) {
      const perspective =
        (y - horizon) / Math.max(1, this.height - horizon);
      const lineWidth = this.width * (0.2 + perspective * 1.24);
      context.beginPath();
      context.moveTo(-lineWidth / 2, y);
      context.lineTo(lineWidth / 2, y);
      context.stroke();
    }

    for (let index = -12; index <= 12; index += 1) {
      context.beginPath();
      context.moveTo(index * 14, horizon);
      context.lineTo(index * this.width * 0.082, this.height);
      context.stroke();
    }

    context.restore();
  }

  private drawInterference(time: number): void {
    const context = this.context;
    const alpha = Math.min(1, this.interferenceTimer) * 0.11;

    context.save();
    context.fillStyle = "rgba(202, 255, 84, " + String(alpha * 0.18) + ")";
    context.fillRect(0, 0, this.width, this.height);

    context.strokeStyle = "rgba(206, 255, 92, " + String(alpha) + ")";
    context.lineWidth = 1;
    const offset = (time * 140) % 24;
    for (let y = -24 + offset; y < this.height; y += 24) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(this.width, y + Math.sin(y * 0.07 + time * 8) * 2);
      context.stroke();
    }

    context.fillStyle = "rgba(220, 255, 120, 0.65)";
    context.font = "700 10px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textAlign = "right";
    context.fillText("SIGNAL JAMMED", this.width - 18, 84);
    context.restore();
  }

  private drawLasers(): void {
    const context = this.context;

    context.save();
    context.globalCompositeOperation = "lighter";

    for (const laser of this.lasers) {
      const alpha = clamp(laser.life / laser.maxLife, 0, 1);
      context.strokeStyle =
        "rgba(74, 242, 255, " + String(alpha) + ")";
      context.shadowBlur =
        14 *
        laser.power *
        qualityProfile(this.settings.visualQuality).glowScale;
      context.shadowColor = "#50f6ff";
      context.lineWidth = 1.4 + laser.power * 1.8;

      context.beginPath();
      context.moveTo(laser.x1, laser.y1);
      context.lineTo(laser.x2, laser.y2);
      context.stroke();
    }

    context.restore();
  }

  private drawParticles(): void {
    const context = this.context;

    context.save();
    context.globalCompositeOperation = "lighter";

    for (const particle of this.particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      context.fillStyle =
        "hsla(" +
        String(particle.hue) +
        ", 100%, 68%, " +
        String(alpha) +
        ")";
      context.beginPath();
      context.arc(
        particle.x,
        particle.y,
        particle.size * alpha,
        0,
        Math.PI * 2,
      );
      context.fill();
    }

    context.restore();
  }

  private drawProjectile(projectile: EnemyProjectile): void {
    const context = this.context;

    context.save();
    context.translate(projectile.x, projectile.y);
    context.globalCompositeOperation = "lighter";
    context.shadowBlur =
      18 * qualityProfile(this.settings.visualQuality).glowScale;
    context.shadowColor = "#ff5c89";
    context.fillStyle = "rgba(255, 70, 118, 0.13)";
    context.strokeStyle = "#ff7298";
    context.lineWidth = 2;

    context.beginPath();
    context.arc(0, 0, projectile.radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.globalCompositeOperation = "source-over";
    context.fillStyle = "#fff4f7";
    context.font = "800 14px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(projectile.char.toUpperCase(), 0, 0);

    context.restore();
  }

  private bossPosition(): { x: number; y: number } {
    return {
      x: this.width / 2,
      y: Math.max(190, Math.min(270, this.height * 0.31)),
    };
  }

  private drawBoss(time: number): void {
    const boss = this.boss;
    if (boss === null) return;

    const context = this.context;
    const { x, y } = this.bossPosition();
    const radius =
      boss.role === "major-boss" ? 82 : boss.role === "boss" ? 70 : 60;
    const pulse = 0.88 + Math.sin(time * 4.5) * 0.12;
    const warning = telegraphStrength(boss.actionCooldown, 1.1);
    const warningPulse = telegraphPulse(warning, time);

    context.save();
    context.translate(x, y - boss.kick * 8);

    if (warningPulse > 0.02 && boss.staggerTimer <= 0) {
      context.save();
      context.strokeStyle =
        "rgba(255, 83, 106, " +
        String(0.18 + warningPulse * 0.62) +
        ")";
      context.lineWidth = 1.4 + warningPulse * 2.2;
      context.setLineDash([7, 8]);
      context.lineDashOffset = -time * 28;
      context.beginPath();
      context.arc(
        0,
        0,
        radius * (1.5 + warningPulse * 0.2),
        0,
        Math.PI * 2,
      );
      context.stroke();
      context.restore();
    }
    context.globalCompositeOperation = "lighter";
    const phaseColor =
      boss.phase >= 3 ? "#ff527c" : boss.phase === 2 ? "#68e9ff" : "#ff8a6f";
    const definition = enemyDefinition(
      bossVisualDefinitionIdForStage(
        this.hiddenEncounterRuntime?.bossStageOverride ??
          this.stageConfig?.stage ??
          1,
        boss.role,
      ),
    );
    const modularDrawn =
      definition !== undefined &&
      drawModularEnemy(context, definition, {
        radius,
        age: time,
        flash: boss.flash,
        targeted: false,
        glowScale: qualityProfile(this.settings.visualQuality).glowScale,
      });

    if (!modularDrawn) {
      context.shadowBlur = boss.flash > 0 ? 36 : 24;
      context.shadowColor = boss.flash > 0 ? "#ffffff" : phaseColor;
      context.strokeStyle = boss.flash > 0 ? "#ffffff" : phaseColor;
      context.fillStyle =
        boss.phase >= 3
          ? "rgba(255, 61, 112, 0.09)"
          : boss.phase === 2
            ? "rgba(82, 218, 255, 0.08)"
            : "rgba(255, 89, 72, 0.075)";
      context.lineWidth = boss.role === "major-boss" ? 3.4 : 2.6;

      context.beginPath();
      for (let index = 0; index < 8; index += 1) {
        const angle = (Math.PI * 2 * index) / 8 - Math.PI / 2;
        const pointRadius =
          index % 2 === 0 ? radius : radius * 0.72;
        const px = Math.cos(angle) * pointRadius;
        const py = Math.sin(angle) * pointRadius * 0.82;
        if (index === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
      context.stroke();
    }

    context.strokeStyle =
      "rgba(255, 178, 105, " + String(0.35 + pulse * 0.18) + ")";
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(0, 0, radius * (0.56 + pulse * 0.04), 0, Math.PI * 2);
    context.stroke();

    context.fillStyle =
      boss.phase >= 3
        ? "rgba(255, 112, 157, 0.86)"
        : boss.phase === 2
          ? "rgba(119, 239, 255, 0.84)"
          : "rgba(255, 222, 164, 0.75)";
    context.beginPath();
    context.arc(0, 0, 8 + pulse * 2, 0, Math.PI * 2);
    context.fill();

    if (boss.shieldActive) {
      context.strokeStyle = "rgba(112, 235, 255, 0.62)";
      context.lineWidth = 2.4;
      context.beginPath();
      context.arc(0, 0, radius * 1.2, 0, Math.PI * 2);
      context.stroke();

      context.strokeStyle = "rgba(112, 235, 255, 0.22)";
      context.beginPath();
      context.arc(0, 0, radius * 1.42, 0, Math.PI * 2);
      context.stroke();
    }

    if (this.bossMarkTimer > 0) {
      context.strokeStyle = "rgba(255, 103, 204, 0.62)";
      context.lineWidth = 1.8;
      context.setLineDash([5, 6]);
      context.lineDashOffset = -time * 24;
      context.beginPath();
      context.arc(0, 0, radius * 1.52, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
    }

    if (boss.staggerTimer > 0) {
      context.strokeStyle = "rgba(255, 245, 178, 0.72)";
      context.setLineDash([4, 5]);
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, radius * 1.08, 0, Math.PI * 2);
      context.stroke();
    }

    context.restore();

    this.drawBossWord(boss, x, y, radius);
  }

  private drawBossWord(
    boss: BossState,
    x: number,
    y: number,
    radius: number,
  ): void {
    const context = this.context;
    const displayWord = normalizeWord(boss.entry.en);
    const split = splitDisplayByTypedLetters(displayWord, boss.typed);

    context.save();
    context.font =
      "800 24px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textBaseline = "middle";

    const fullWidth = context.measureText(displayWord).width;
    const typedWidth = context.measureText(split.typed).width;
    const left = x - fullWidth / 2;
    const wordY = y + radius + 34;

    context.fillStyle = "rgba(4, 8, 15, 0.92)";
    context.fillRect(left - 12, wordY - 18, fullWidth + 24, 36);

    context.textAlign = "left";
    context.fillStyle = "rgba(160, 176, 194, 0.46)";
    context.fillText(split.typed, left, wordY);

    context.fillStyle = "#fff4ed";
    context.shadowBlur = 10;
    context.shadowColor = "#ff806b";
    context.fillText(
      split.remaining,
      left + typedWidth,
      wordY,
    );
    context.restore();
  }

  private drawSupplyPod(pod: SupplyPod): void {
    const context = this.context;
    const y = pod.y + Math.sin(pod.age * 3.2) * 7;
    const displayWord = normalizeWord(pod.entry.en);
    const split = splitDisplayByTypedLetters(displayWord, pod.typed);

    context.save();
    context.translate(pod.x, y);
    context.globalCompositeOperation = "lighter";
    context.shadowBlur = 20;
    context.shadowColor = "#ffd866";

    context.fillStyle = "rgba(255, 216, 102, 0.12)";
    context.strokeStyle = "rgba(255, 225, 130, 0.9)";
    context.lineWidth = 1.6;
    context.beginPath();
    context.roundRect(-31, -18, 62, 36, 8);
    context.fill();
    context.stroke();

    context.fillStyle = "#fff1b0";
    context.font =
      "800 9px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textAlign = "center";
    context.fillText(
      "SUPPLY · " + supplyRewardLabel(pod.reward),
      0,
      3,
    );
    context.restore();

    context.save();
    context.font =
      "750 17px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textBaseline = "middle";
    const fullWidth = context.measureText(displayWord).width;
    const typedWidth = context.measureText(split.typed).width;
    const left = pod.x - fullWidth / 2;
    const wordY = y - 36;

    context.fillStyle = "rgba(4, 8, 14, 0.88)";
    context.fillRect(left - 9, wordY - 14, fullWidth + 18, 28);
    context.textAlign = "left";
    context.fillStyle = "rgba(143, 158, 170, 0.5)";
    context.fillText(split.typed, left, wordY);
    context.fillStyle = "#fff4bd";
    context.shadowBlur = 7;
    context.shadowColor = "#ffd866";
    context.fillText(split.remaining, left + typedWidth, wordY);
    context.restore();
  }

  private drawTreasureDrone(drone: TreasureDrone): void {
    const context = this.context;
    const y = drone.y + Math.sin(drone.age * 4) * 9;
    const displayWord = normalizeWord(drone.entry.en);
    const split = splitDisplayByTypedLetters(displayWord, drone.typed);

    context.save();
    context.translate(drone.x, y);
    context.globalCompositeOperation = "lighter";
    context.shadowBlur = 26;
    context.shadowColor = "#ffe066";
    context.fillStyle = "rgba(255, 224, 102, 0.18)";
    context.strokeStyle = "#ffe98a";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-28, 0);
    context.lineTo(-12, -14);
    context.lineTo(20, -10);
    context.lineTo(31, 0);
    context.lineTo(20, 10);
    context.lineTo(-12, 14);
    context.closePath();
    context.fill();
    context.stroke();

    context.fillStyle = "#fff4bd";
    context.font =
      "850 9px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textAlign = "center";
    context.fillText("TREASURE DRONE", 0, 3);
    context.restore();

    context.save();
    context.font =
      "800 18px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textBaseline = "middle";
    const fullWidth = context.measureText(displayWord).width;
    const typedWidth = context.measureText(split.typed).width;
    const left = drone.x - fullWidth / 2;
    const wordY = y - 34;
    context.fillStyle = "rgba(4, 8, 14, 0.9)";
    context.fillRect(left - 9, wordY - 14, fullWidth + 18, 28);
    context.textAlign = "left";
    context.fillStyle = "rgba(145, 155, 165, 0.5)";
    context.fillText(split.typed, left, wordY);
    context.fillStyle = "#fff1a8";
    context.shadowBlur = 10;
    context.shadowColor = "#ffd84d";
    context.fillText(split.remaining, left + typedWidth, wordY);
    context.restore();
  }

  private drawRewardChoiceCrate(crate: RewardChoiceCrate): void {
    const context = this.context;
    const x = crate.x + Math.sin(crate.age * 2.6) * 16;
    const displayWord = normalizeWord(crate.entry.en);
    const split = splitDisplayByTypedLetters(displayWord, crate.typed);

    context.save();
    context.translate(x, crate.y);
    context.globalCompositeOperation = "lighter";
    context.shadowBlur = 22;
    context.shadowColor = "#b787ff";
    context.fillStyle = "rgba(151, 105, 255, 0.16)";
    context.strokeStyle = "#d7bbff";
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(-28, -22, 56, 44, 6);
    context.fill();
    context.stroke();

    context.strokeStyle = "rgba(255, 236, 167, 0.8)";
    context.beginPath();
    context.moveTo(-18, -6);
    context.lineTo(18, -6);
    context.moveTo(0, -17);
    context.lineTo(0, 17);
    context.stroke();

    context.fillStyle = "#f0e4ff";
    context.font =
      "850 8px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textAlign = "center";
    context.fillText("CHOICE CRATE", 0, 34);
    context.restore();

    context.save();
    context.font =
      "800 18px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textBaseline = "middle";
    const fullWidth = context.measureText(displayWord).width;
    const typedWidth = context.measureText(split.typed).width;
    const left = x - fullWidth / 2;
    const wordY = crate.y - 38;
    context.fillStyle = "rgba(4, 8, 14, 0.9)";
    context.fillRect(left - 9, wordY - 14, fullWidth + 18, 28);
    context.textAlign = "left";
    context.fillStyle = "rgba(145, 155, 165, 0.5)";
    context.fillText(split.typed, left, wordY);
    context.fillStyle = "#eadbff";
    context.shadowBlur = 9;
    context.shadowColor = "#a86cff";
    context.fillText(split.remaining, left + typedWidth, wordY);
    context.restore();
  }

  private drawAnomalyCrate(crate: AnomalyCrate): void {
    const context = this.context;
    const x = crate.x + Math.sin(crate.age * 3.1) * 18;
    const displayWord = normalizeWord(crate.entry.en);
    const split = splitDisplayByTypedLetters(displayWord, crate.typed);

    context.save();
    context.translate(x, crate.y);
    context.rotate(Math.sin(crate.age * 2.2) * 0.08);
    context.globalCompositeOperation = "lighter";
    context.shadowBlur = 28;
    context.shadowColor = "#ff65cc";
    context.fillStyle = "rgba(255, 83, 193, 0.15)";
    context.strokeStyle = "#ff9bdd";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, -27);
    context.lineTo(26, 0);
    context.lineTo(0, 27);
    context.lineTo(-26, 0);
    context.closePath();
    context.fill();
    context.stroke();

    context.fillStyle = "#ffe0f5";
    context.font =
      "850 8px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textAlign = "center";
    context.fillText("ANOMALY", 0, 3);
    context.restore();

    context.save();
    context.font =
      "800 18px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textBaseline = "middle";
    const fullWidth = context.measureText(displayWord).width;
    const typedWidth = context.measureText(split.typed).width;
    const left = x - fullWidth / 2;
    const wordY = crate.y - 40;
    context.fillStyle = "rgba(4, 8, 14, 0.9)";
    context.fillRect(left - 9, wordY - 14, fullWidth + 18, 28);
    context.textAlign = "left";
    context.fillStyle = "rgba(145, 155, 165, 0.5)";
    context.fillText(split.typed, left, wordY);
    context.fillStyle = "#ffd7f0";
    context.shadowBlur = 10;
    context.shadowColor = "#ff65cc";
    context.fillText(split.remaining, left + typedWidth, wordY);
    context.restore();
  }

  private drawEnemy(enemy: Enemy): void {
    const context = this.context;
    const targeted = enemy.id === this.targetId;
    const kick = enemy.kick * 7;

    const baseColor =
      enemy.golden
        ? "#ffd84d"
        : enemy.kind === "mine"
        ? "#ff648d"
        : enemy.kind === "tank"
          ? "#8f83ff"
          : enemy.kind === "destroyer"
            ? "#57d8ff"
            : enemy.kind === "oppressor"
              ? "#e36dff"
              : enemy.kind === "shield"
                ? "#58f0c7"
                : enemy.kind === "carrier"
                  ? "#ffd866"
                  : enemy.kind === "jammer"
                    ? "#d8ff66"
                    : enemy.kind === "cloaker"
                      ? "#7f8dff"
                      : enemy.kind === "healer"
                        ? "#6dffb4"
                        : enemy.kind === "splitter"
                          ? "#ff73d4"
                          : enemy.kind === "sniper"
                            ? "#ff8b62"
                            : enemy.kind === "leech"
                              ? "#bb72ff"
                              : enemy.kind === "commander"
                                ? "#fff29a"
                                : "#ffb75b";
    const targetColor = "#80f3ff";

    const warning = telegraphStrength(enemy.actionCooldown, 0.9);
    const warningPulse = telegraphPulse(warning, enemy.age);
    if (warningPulse > 0.02) {
      context.save();
      context.strokeStyle =
        "rgba(255, 104, 85, " +
        String(0.12 + warningPulse * 0.5) +
        ")";
      context.setLineDash([5, 7]);
      context.lineWidth = 1 + warningPulse * 1.2;
      context.beginPath();
      context.arc(
        enemy.x,
        enemy.y - kick,
        enemy.radius * (1.35 + warningPulse * 0.16),
        0,
        Math.PI * 2,
      );
      context.stroke();

      if (enemy.kind === "sniper") {
        context.beginPath();
        context.moveTo(enemy.x, enemy.y - kick);
        context.lineTo(
          this.width / 2,
          this.height - PLAYER_Y_OFFSET,
        );
        context.stroke();
      }
      context.restore();
    }

    if (enemy.id === this.markedEnemyId && this.markTimer > 0) {
      context.save();
      context.strokeStyle = "rgba(255, 105, 202, 0.62)";
      context.lineWidth = 1.8;
      context.setLineDash([4, 5]);
      context.lineDashOffset = -enemy.age * 18;
      context.beginPath();
      context.arc(
        enemy.x,
        enemy.y - kick,
        enemy.radius * 1.38,
        0,
        Math.PI * 2,
      );
      context.stroke();
      context.restore();
    }

    context.save();
    context.translate(enemy.x, enemy.y - kick);
    if (enemy.kind === "cloaker" && !targeted) {
      context.globalAlpha = 0.42;
    }
    context.globalCompositeOperation = "lighter";
    context.shadowBlur = targeted ? 25 : enemy.kind === "tank" ? 20 : 14;
    context.shadowColor = targeted ? "#86f8ff" : baseColor;
    context.strokeStyle =
      enemy.flash > 0 ? "#ffffff" : targeted ? targetColor : baseColor;
    context.fillStyle = targeted
      ? "rgba(65, 226, 255, 0.10)"
      : enemy.kind === "mine"
        ? "rgba(255, 70, 115, 0.10)"
        : enemy.kind === "tank"
          ? "rgba(132, 112, 255, 0.10)"
          : enemy.kind === "healer"
            ? "rgba(95, 255, 180, 0.09)"
            : enemy.kind === "splitter"
              ? "rgba(255, 105, 210, 0.09)"
              : "rgba(255, 168, 69, 0.08)";
    context.lineWidth = targeted ? 2.8 : enemy.kind === "tank" ? 2.2 : 1.6;

    const visual = enemyDefinition(
      enemy.definitionId ??
        worldRuntimeEnemyDefinitionId(
          enemy.kind,
          enemy.elite,
          this.hiddenEncounterRuntime?.rosterStageOverride ??
            this.stageConfig?.stage ??
            1,
        ),
    );
    const modularDrawn =
      visual !== undefined &&
      drawModularEnemy(context, visual, {
        radius: enemy.radius,
        age: enemy.age,
        flash: enemy.flash,
        targeted,
        glowScale: qualityProfile(this.settings.visualQuality).glowScale,
      });

    if (!modularDrawn) {
      context.beginPath();
  
      if (enemy.kind === "mine") {
        for (let index = 0; index < 8; index += 1) {
          const angle = (Math.PI * 2 * index) / 8 - Math.PI / 2;
          const radius = index % 2 === 0 ? enemy.radius * 1.3 : enemy.radius * 0.62;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
      } else if (enemy.kind === "tank") {
        for (let index = 0; index < 6; index += 1) {
          const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
          const x = Math.cos(angle) * enemy.radius;
          const y = Math.sin(angle) * enemy.radius * 0.78;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
      } else if (enemy.kind === "destroyer") {
        context.moveTo(0, enemy.radius);
        context.lineTo(enemy.radius, -enemy.radius * 0.45);
        context.lineTo(enemy.radius * 0.32, -enemy.radius * 0.72);
        context.lineTo(0, -enemy.radius * 0.38);
        context.lineTo(-enemy.radius * 0.32, -enemy.radius * 0.72);
        context.lineTo(-enemy.radius, -enemy.radius * 0.45);
        context.closePath();
      } else if (enemy.kind === "oppressor") {
        for (let index = 0; index < 6; index += 1) {
          const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
          const radius =
            index % 2 === 0 ? enemy.radius : enemy.radius * 0.78;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius * 0.78;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
      } else if (enemy.kind === "carrier") {
        context.moveTo(0, enemy.radius * 0.78);
        context.lineTo(enemy.radius * 1.12, enemy.radius * 0.12);
        context.lineTo(enemy.radius * 0.72, -enemy.radius * 0.58);
        context.lineTo(0, -enemy.radius * 0.35);
        context.lineTo(-enemy.radius * 0.72, -enemy.radius * 0.58);
        context.lineTo(-enemy.radius * 1.12, enemy.radius * 0.12);
        context.closePath();
      } else if (enemy.kind === "shield") {
        context.arc(0, 0, enemy.radius * 0.72, 0, Math.PI * 2);
      } else if (enemy.kind === "jammer") {
        context.moveTo(0, enemy.radius);
        context.lineTo(enemy.radius * 0.86, 0);
        context.lineTo(0, -enemy.radius);
        context.lineTo(-enemy.radius * 0.86, 0);
        context.closePath();
      } else if (enemy.kind === "cloaker") {
        context.moveTo(0, enemy.radius);
        context.lineTo(enemy.radius * 0.95, -enemy.radius * 0.62);
        context.lineTo(enemy.radius * 0.28, -enemy.radius * 0.42);
        context.lineTo(0, -enemy.radius * 0.78);
        context.lineTo(-enemy.radius * 0.28, -enemy.radius * 0.42);
        context.lineTo(-enemy.radius * 0.95, -enemy.radius * 0.62);
        context.closePath();
      } else if (enemy.kind === "healer") {
        context.moveTo(0, enemy.radius);
        context.lineTo(enemy.radius * 0.5, enemy.radius * 0.26);
        context.lineTo(enemy.radius, 0);
        context.lineTo(enemy.radius * 0.5, -enemy.radius * 0.26);
        context.lineTo(0, -enemy.radius);
        context.lineTo(-enemy.radius * 0.5, -enemy.radius * 0.26);
        context.lineTo(-enemy.radius, 0);
        context.lineTo(-enemy.radius * 0.5, enemy.radius * 0.26);
        context.closePath();
      } else if (enemy.kind === "splitter") {
        context.moveTo(0, enemy.radius);
        context.lineTo(enemy.radius * 0.8, enemy.radius * 0.25);
        context.lineTo(enemy.radius * 0.45, -enemy.radius * 0.75);
        context.lineTo(0, -enemy.radius * 0.35);
        context.lineTo(-enemy.radius * 0.45, -enemy.radius * 0.75);
        context.lineTo(-enemy.radius * 0.8, enemy.radius * 0.25);
        context.closePath();
      } else if (enemy.kind === "sniper") {
        context.moveTo(0, enemy.radius);
        context.lineTo(enemy.radius * 0.52, -enemy.radius * 0.3);
        context.lineTo(enemy.radius * 0.22, -enemy.radius);
        context.lineTo(0, -enemy.radius * 0.64);
        context.lineTo(-enemy.radius * 0.22, -enemy.radius);
        context.lineTo(-enemy.radius * 0.52, -enemy.radius * 0.3);
        context.closePath();
      } else if (enemy.kind === "leech") {
        for (let index = 0; index < 7; index += 1) {
          const angle = (Math.PI * 2 * index) / 7 - Math.PI / 2;
          const radius =
            index % 2 === 0 ? enemy.radius : enemy.radius * 0.7;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
      } else if (enemy.kind === "commander") {
        context.moveTo(0, enemy.radius);
        context.lineTo(enemy.radius, enemy.radius * 0.1);
        context.lineTo(enemy.radius * 0.65, -enemy.radius * 0.72);
        context.lineTo(0, -enemy.radius * 0.45);
        context.lineTo(-enemy.radius * 0.65, -enemy.radius * 0.72);
        context.lineTo(-enemy.radius, enemy.radius * 0.1);
        context.closePath();
      } else {
        context.moveTo(0, enemy.radius);
        context.lineTo(enemy.radius * 0.9, -enemy.radius * 0.72);
        context.lineTo(0, -enemy.radius * 0.34);
        context.lineTo(-enemy.radius * 0.9, -enemy.radius * 0.72);
        context.closePath();
      }
  
      context.fill();
      context.stroke();
    }

    if ((enemy.rewardControlTimer ?? 0) > 0) {
      const frozen = (enemy.rewardControlFactor ?? 1) <= 0.05;
      context.save();
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = frozen
        ? "rgba(153, 241, 255, 0.92)"
        : "rgba(117, 201, 255, 0.78)";
      context.fillStyle = frozen
        ? "rgba(115, 229, 255, 0.10)"
        : "rgba(102, 183, 255, 0.07)";
      context.lineWidth = frozen ? 2.3 : 1.7;
      if (!frozen) {
        context.setLineDash([4, 5]);
        context.lineDashOffset = -enemy.age * 12;
      }
      context.beginPath();
      context.arc(0, 0, enemy.radius * 1.18, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      if (frozen) {
        context.fillStyle = "#e7fcff";
        context.font =
          "800 " +
          String(Math.max(10, Math.round(enemy.radius * 0.42))) +
          "px ui-monospace, SFMono-Regular, Menlo, monospace";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText("❄", 0, enemy.radius * 0.02);
      }
      context.restore();
    }

    if (enemy.elite) {
      context.strokeStyle = "rgba(255, 226, 105, 0.64)";
      context.lineWidth = 1.6;
      context.setLineDash([5, 6]);
      context.lineDashOffset = -enemy.age * 18;
      context.beginPath();
      context.arc(0, 0, enemy.radius * 1.28, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);

      const modifierGap = 8;
      const startX =
        -((enemy.eliteModifiers.length - 1) * modifierGap) / 2;
      context.fillStyle = "rgba(255, 230, 123, 0.9)";
      for (let index = 0; index < enemy.eliteModifiers.length; index += 1) {
        context.beginPath();
        context.arc(
          startX + index * modifierGap,
          enemy.radius + 17,
          2.2,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    }

    if (!modularDrawn && enemy.kind === "tank") {
      context.strokeStyle = "rgba(169, 154, 255, 0.45)";
      context.lineWidth = 1.4;
      context.beginPath();
      context.arc(0, 0, enemy.radius * 0.58, 0, Math.PI * 2);
      context.stroke();
    }

    if (enemy.layersRemaining > 1) {
      const pipGap = 10;
      const startX = -((enemy.layersRemaining - 1) * pipGap) / 2;
      context.fillStyle =
        enemy.kind === "shield" ? "#67f0c9" : "#d9e6f2";
      for (let index = 0; index < enemy.layersRemaining; index += 1) {
        context.fillRect(
          startX + index * pipGap - 2,
          enemy.radius + 8,
          5,
          3,
        );
      }
    }

    if (!modularDrawn && enemy.kind === "oppressor") {
      context.strokeStyle = "rgba(229, 111, 255, 0.38)";
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(0, 0, enemy.radius * 0.62, 0, Math.PI * 2);
      context.stroke();

      context.beginPath();
      context.arc(0, 0, enemy.radius * 0.35, 0, Math.PI * 2);
      context.stroke();
    }

    if (!modularDrawn && enemy.kind === "shield" && enemy.layersRemaining > 1) {
      context.strokeStyle = "rgba(91, 255, 214, 0.55)";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, enemy.radius * 1.18, 0, Math.PI * 2);
      context.stroke();

      context.strokeStyle = "rgba(91, 255, 214, 0.2)";
      context.beginPath();
      context.arc(0, 0, enemy.radius * 1.42, 0, Math.PI * 2);
      context.stroke();
    }

    if (!modularDrawn && enemy.kind === "carrier") {
      context.fillStyle = "rgba(255, 219, 105, 0.75)";
      context.fillRect(-enemy.radius * 0.85, 2, 7, 7);
      context.fillRect(enemy.radius * 0.85 - 7, 2, 7, 7);
    }

    if (!modularDrawn && enemy.kind === "jammer") {
      context.strokeStyle = "rgba(221, 255, 105, 0.45)";
      context.lineWidth = 1.4;
      for (const scale of [0.75, 1.08]) {
        context.beginPath();
        context.arc(0, 0, enemy.radius * scale, -0.75, 0.75);
        context.stroke();
        context.beginPath();
        context.arc(0, 0, enemy.radius * scale, Math.PI - 0.75, Math.PI + 0.75);
        context.stroke();
      }
    }

    if (!modularDrawn && enemy.kind === "healer") {
      context.strokeStyle = "rgba(111, 255, 185, 0.55)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(-enemy.radius * 0.42, 0);
      context.lineTo(enemy.radius * 0.42, 0);
      context.moveTo(0, -enemy.radius * 0.42);
      context.lineTo(0, enemy.radius * 0.42);
      context.stroke();
    }

    if (!modularDrawn && enemy.kind === "commander") {
      context.strokeStyle = "rgba(255, 243, 156, 0.52)";
      context.lineWidth = 1.4;
      context.beginPath();
      context.arc(0, 0, enemy.radius * 0.62, 0, Math.PI * 2);
      context.stroke();

      context.fillStyle = "rgba(255, 243, 156, 0.8)";
      context.fillRect(-2, -enemy.radius * 0.82, 4, 8);
    }

    if (!modularDrawn && enemy.kind === "leech") {
      context.strokeStyle = "rgba(194, 119, 255, 0.48)";
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(0, 0, enemy.radius * 0.42, 0, Math.PI * 2);
      context.stroke();
    }

    context.restore();

    this.drawEnemyWord(enemy, targeted);
  }

  private drawEnemyWord(enemy: Enemy, targeted: boolean): void {
    const context = this.context;
    const actualWord = normalizeWord(enemy.entry.en);
    const typingWord = typingText(enemy.entry.en);
    const hideForCloak = enemy.kind === "cloaker" && !targeted;
    const hideForJam =
      this.interferenceTimer > 0 &&
      !targeted &&
      enemy.kind !== "jammer";
    const hidden = hideForCloak || hideForJam;

    const displayWord = hidden
      ? (typingWord[0] ?? "?") +
        "·".repeat(Math.max(3, Math.min(8, typingWord.length - 1)))
      : actualWord;
    const split = hidden
      ? { typed: "", remaining: displayWord }
      : splitDisplayByTypedLetters(displayWord, enemy.typed);
    const typed = split.typed;
    const remaining = split.remaining;
    const layerPlan =
      enemy.layerPlan ??
      enemyLayerPlan(
        enemy.kind,
        clamp(enemy.layersRemaining, 1, 3) as 1 | 2 | 3,
      );
    const layerSegments = enemyLayerSegments(
      layerPlan,
      enemy.layersRemaining,
    );
    const currentLayer = currentEnemyLayer(
      layerPlan,
      enemy.layersRemaining,
    );
    const layerLabel = currentLayer
      .replace("-", " ")
      .toUpperCase();

    context.save();
    context.font =
      "700 18px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textBaseline = "middle";

    const fullWidth = context.measureText(displayWord).width;
    const typedWidth = context.measureText(typed).width;
    const panelWidth = Math.max(fullWidth + 16, 126);
    const left = enemy.x - fullWidth / 2;
    const panelLeft = enemy.x - panelWidth / 2;
    const y = enemy.y - enemy.radius - 22;

    context.fillStyle = hidden
      ? "rgba(5, 9, 18, 0.92)"
      : "rgba(2, 7, 14, 0.84)";
    context.fillRect(panelLeft, y - 14, panelWidth, 28);

    context.textAlign = "left";
    context.fillStyle = "rgba(133, 151, 171, 0.45)";
    context.fillText(typed, left, y);

    context.fillStyle = targeted
      ? "#f4feff"
      : hideForJam
        ? "#d8ff74"
        : hideForCloak
          ? "#9ca6ff"
          : "#f4c87a";
    context.shadowBlur = targeted ? 7 : 0;
    context.shadowColor = "#57efff";
    context.fillText(remaining, left + typedWidth, y);

    context.shadowBlur = 0;
    context.font =
      "800 8px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textAlign = "center";
    context.fillStyle = targeted
      ? "rgba(213, 249, 255, 0.95)"
      : "rgba(202, 215, 229, 0.8)";
    const objectiveTarget =
      this.stageObjective?.targetEnemyId === enemy.id;
    context.fillText(
      (objectiveTarget ? "OBJECTIVE · " : "") +
        enemyRankLabel(enemy.rank ?? "I") +
        " · " +
        layerLabel,
      enemy.x,
      y - 25,
    );

    if (
      enemy.pendingSkillId !== undefined &&
      enemy.pendingSkillId !== null &&
      (enemy.skillTelegraphRemaining ?? 0) > 0
    ) {
      const pending = enemySkillDefinition(enemy.pendingSkillId);
      context.font =
        "900 9px ui-monospace, SFMono-Regular, Menlo, monospace";
      context.fillStyle = "rgba(255, 224, 138, 0.96)";
      context.fillText(
        "⚠ " + pending.name.toUpperCase(),
        enemy.x,
        y - 37,
      );
    }

    const segmentGap = 3;
    const segmentWidth = (panelWidth - segmentGap * 2) / 3;
    const segmentY = y - 19;
    for (const segment of layerSegments) {
      const x =
        panelLeft +
        segment.slot * (segmentWidth + segmentGap);
      context.fillStyle =
        segment.status === "current"
          ? targeted
            ? "rgba(103, 239, 255, 0.95)"
            : "rgba(244, 200, 122, 0.92)"
          : segment.status === "cleared"
            ? "rgba(117, 255, 177, 0.45)"
            : segment.status === "pending"
              ? "rgba(162, 181, 205, 0.32)"
              : "rgba(74, 88, 106, 0.14)";
      context.fillRect(x, segmentY, segmentWidth, 3);
    }

    context.restore();
  }

  private drawRewardBuffTimers(): void {
    const buffs: Array<{ label: string; remaining: number }> = [];
    if (this.rewardScoreMultiplierTimer > 0) {
      buffs.push({
        label: "SCORE ×2",
        remaining: this.rewardScoreMultiplierTimer,
      });
    }
    if (this.rewardCreditsMultiplierTimer > 0) {
      buffs.push({
        label: "CREDITS ×2",
        remaining: this.rewardCreditsMultiplierTimer,
      });
    }
    if (buffs.length === 0) return;

    const context = this.context;
    context.save();
    context.globalCompositeOperation = "source-over";
    context.font =
      "800 12px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textAlign = "right";
    context.textBaseline = "middle";

    let y = 116;
    for (const buff of buffs) {
      const text = buff.label + " · " + buff.remaining.toFixed(1) + "s";
      const width = context.measureText(text).width + 20;
      const x = this.width - 18;
      context.fillStyle = "rgba(3, 9, 18, 0.88)";
      context.fillRect(x - width, y - 12, width, 24);
      context.strokeStyle = "rgba(255, 231, 132, 0.72)";
      context.lineWidth = 1;
      context.strokeRect(x - width, y - 12, width, 24);
      context.fillStyle = "#fff0a8";
      context.fillText(text, x - 10, y);
      y += 30;
    }

    context.restore();
  }

  private drawRewardNotice(): void {
    const notice = this.rewardNotice;
    if (notice === null) return;

    const context = this.context;
    const alpha = clamp(notice.remaining / 1.05, 0, 1);
    const lift = (1 - alpha) * 22;
    const y = notice.y - 54 - lift;

    context.save();
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = alpha;
    context.font =
      "850 13px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    const width = context.measureText(notice.label).width;
    context.fillStyle = "rgba(3, 9, 20, 0.9)";
    context.fillRect(
      notice.x - width / 2 - 9,
      y - 12,
      width + 18,
      24,
    );
    context.fillStyle =
      "hsl(" + String(notice.hue) + " 90% 78%)";
    context.fillText(notice.label, notice.x, y);
    context.restore();
  }

  private drawPlayer(time: number): void {
    const context = this.context;
    const x = this.width / 2;
    const y = this.height - PLAYER_Y_OFFSET;
    const pulse = 0.82 + Math.sin(time * 8) * 0.12;

    context.save();
    context.translate(x, y);
    context.globalCompositeOperation = "lighter";
    context.shadowBlur = 20;
    context.shadowColor = "#4cf7ff";

    context.fillStyle =
      "rgba(70, 238, 255, " + String(0.2 + pulse * 0.08) + ")";
    context.beginPath();
    context.moveTo(0, -26);
    context.lineTo(18, 20);
    context.lineTo(0, 11);
    context.lineTo(-18, 20);
    context.closePath();
    context.fill();

    context.strokeStyle = "#83fbff";
    context.lineWidth = 2;
    context.stroke();

    context.strokeStyle =
      "rgba(100, 225, 255, " + String(0.4 + pulse * 0.2) + ")";
    context.beginPath();
    context.moveTo(-5, 18);
    context.lineTo(0, 36 + Math.sin(time * 12) * 4);
    context.lineTo(5, 18);
    context.stroke();

    context.restore();
  }

  private drawDefensiveEffects(time: number): void {
    const context = this.context;
    const x = this.width / 2;
    const y = this.height - PLAYER_Y_OFFSET;

    context.save();
    context.globalCompositeOperation = "lighter";

    if (this.phoenixGraceTimer > 0) {
      context.strokeStyle = "rgba(255, 190, 78, 0.82)";
      context.lineWidth = 2.6;
      context.shadowBlur = 22;
      context.shadowColor = "#ffb347";
      context.beginPath();
      context.arc(
        x,
        y,
        30 + Math.sin(time * 10) * 3,
        0,
        Math.PI * 2,
      );
      context.stroke();
    }

    if (this.barrierTimer > 0 && this.barrierHp > 0) {
      context.strokeStyle = "rgba(92, 225, 255, 0.72)";
      context.lineWidth = 2.2;
      context.shadowBlur = 18;
      context.shadowColor = "#5ce1ff";
      context.beginPath();
      context.arc(
        x,
        y,
        34 + Math.sin(time * 6) * 2,
        0,
        Math.PI * 2,
      );
      context.stroke();
    }

    if (this.reflectTimer > 0) {
      context.strokeStyle = "rgba(211, 121, 255, 0.66)";
      context.lineWidth = 1.7;
      context.setLineDash([5, 7]);
      context.lineDashOffset = -time * 28;
      context.beginPath();
      context.arc(x, y, 43, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
    }

    if (this.guardianTimer > 0 && this.guardianBlocks > 0) {
      for (let index = 0; index < this.guardianBlocks; index += 1) {
        const angle =
          time * 2.2 +
          (Math.PI * 2 * index) /
            Math.max(1, this.guardianBlocks);
        const droneX = x + Math.cos(angle) * 48;
        const droneY = y + Math.sin(angle) * 18;

        context.fillStyle = "rgba(255, 226, 98, 0.88)";
        context.beginPath();
        context.arc(droneX, droneY, 3.2, 0, Math.PI * 2);
        context.fill();
      }
    }

    if (this.gravityWellTimer > 0) {
      context.strokeStyle = "rgba(191, 95, 255, 0.28)";
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(
        x,
        y,
        68 + Math.sin(time * 2.6) * 7,
        0,
        Math.PI * 2,
      );
      context.stroke();
    }

    if (this.timeShellTimer > 0) {
      context.strokeStyle = "rgba(152, 117, 255, 0.34)";
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(
        x,
        y,
        56 + Math.sin(time * 3.5) * 5,
        0,
        Math.PI * 2,
      );
      context.stroke();
    }

    context.restore();
  }

  private drawTargetLine(): void {
    const target = this.currentTarget();
    if (target === null) return;

    const context = this.context;
    context.save();
    context.strokeStyle = "rgba(91, 236, 255, 0.18)";
    context.setLineDash([4, 8]);
    context.beginPath();
    context.moveTo(this.width / 2, this.height - PLAYER_Y_OFFSET);
    context.lineTo(target.x, target.y);
    context.stroke();
    context.restore();
  }

  getAccuracy(): number {
    return accuracyPercent(this.stats.hits, this.stats.misses);
  }
}
