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
import type { BossHudState, BossState } from "./boss/model";
import type { DifficultyProfile, StageConfig } from "./campaign/types";
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
  applyIncomingDamage,
  createPlayerResources,
  DEFAULT_PLAYER_BASE_STATS,
  firepowerDamage,
  focusPowerGain,
  regenerateResources,
  wardDuration,
} from "./stats/player";
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
  accuracyPercent,
  clamp,
  chooseTarget,
  multiplierForStreak,
  normalizeWord,
  splitDisplayByTypedLetters,
  typingText,
} from "./logic";
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

type Hooks = {
  onStats(stats: GameStats): void;
  onPhase(phase: GamePhase): void;
  onStage(stage: number): void;
  onStageClear(stats: GameStats): void;
  onBossUpdate(boss: BossHudState | null): void;
  onWordComplete(entry: VocabularyEntry): void;
  onSkills(): void;
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

export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly hooks: Hooks;
  private readonly sfx = new Sfx();
  private readonly skillEngine = new SkillEngine();

  private characterId: CharacterId = "vanguard";
  private supportSkillIds: SupportSpellId[] = [
    "sanctuary",
    "gravity-well",
  ];
  private settings: GameSettings;
  private vocabulary: VocabularyEntry[];
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
  private bossSpawned = false;
  private bossDefeated = false;
  private enemies: Enemy[] = [];
  private projectiles: EnemyProjectile[] = [];
  private lasers: Laser[] = [];
  private particles: Particle[] = [];
  private targetId: number | null = null;
  private spawnTimer = 0;
  private spawnRemaining = 0;
  private stageConfig: StageConfig | null = null;
  private difficulty: DifficultyProfile | null = null;
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
  private skillHudTimer = 0;
  private lastTime = performance.now();
  private animationFrame = 0;
  private stars: Array<{ x: number; y: number; z: number }> = [];

  constructor(
    canvas: HTMLCanvasElement,
    vocabulary: VocabularyEntry[],
    settings: GameSettings,
    hooks: Hooks,
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
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  getStats(): GameStats {
    return { ...this.stats };
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
            : [];

    this.skillEngine.setDefinitions([
      ...characterDefinitions,
      ...DEFENSIVE_SKILLS,
      ...OFFENSIVE_SKILLS,
      ...supportDefinitions,
    ]);
  }

  getSkillState(id: string): SkillRuntimeState | null {
    return this.skillEngine.getState(id);
  }

  canUseSkill(id: string): SkillBlockReason | null {
    if (this.phase !== "playing") return "unknown-skill";

    if (
      id === "emergency-repair" &&
      this.stats.hull >= this.stats.maxHull &&
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
      id === "mark-of-weakness" &&
      this.currentTarget() === null &&
      this.enemies.length === 0 &&
      this.boss === null
    ) {
      return "effect-not-needed";
    }

    if (id === "cleanse" && this.interferenceTimer <= 0) {
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

    if (id === "barrier") {
      this.barrierHp = Math.max(
        this.barrierHp,
        72 + this.playerStats.shield * 0.45,
      );
      this.barrierTimer = Math.max(this.barrierTimer, 7);
      this.burst(playerX, playerY, 28, 188);
      this.sfx.support();
    } else if (id === "reflect-field") {
      this.reflectTimer = Math.max(this.reflectTimer, 4.5);
      this.burst(playerX, playerY, 30, 300);
      this.sfx.power();
    } else if (id === "time-shell") {
      this.timeShellTimer = Math.max(this.timeShellTimer, 5);
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
      );
      this.stats.hull = repaired.hull;
      this.stats.shield = repaired.shield;
      this.stats.energy = repaired.energy;
      this.burst(playerX, playerY, 34, 138);
      this.sfx.support();
    } else {
      this.guardianTimer = Math.max(this.guardianTimer, 12);
      this.guardianBlocks = Math.max(this.guardianBlocks, 3);
      this.burst(playerX, playerY, 26, 48);
      this.sfx.support();
    }

    this.emitStats();
  }

  private activateOffensiveSkill(id: OffensiveSkillId): void {
    if (id === "emp-burst") {
      this.activateEmpPulse(2.5);
      return;
    }

    if (id === "chain-lightning") {
      const targets = [...this.enemies]
        .sort((a, b) => b.y - a.y)
        .slice(0, 4);

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
          Math.max(1, Math.round(this.boss.maxHp * 0.04)),
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

    if (this.boss !== null) {
      this.bossMarkTimer = Math.max(this.bossMarkTimer, 8);
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
      this.markTimer = 8;

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
      this.stats.shield = clamp(
        this.stats.shield + this.stats.maxShield * 0.35,
        0,
        this.stats.maxShield,
      );
      this.barrierHp = Math.max(
        this.barrierHp,
        50 + this.playerStats.shield * 0.25,
      );
      this.barrierTimer = Math.max(this.barrierTimer, 6);
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

  setVocabulary(entries: VocabularyEntry[]): void {
    if (entries.length === 0) return;
    this.vocabulary = entries;
    this.enemies = [];
    this.targetId = null;
    this.spawnTimer = 0.2;
  }

  updateSettings(settings: GameSettings): void {
    this.settings = settings;
    this.sfx.setVolume(settings.sfxVolume);
  }

  startStage(stage: StageConfig, difficulty: DifficultyProfile): void {
    this.sfx.unlock();
    this.stageConfig = stage;
    this.difficulty = difficulty;
    this.phase = "playing";
    this.stats = this.createGameStats(stage.stage);
    this.secondsSinceDamage = Number.POSITIVE_INFINITY;
    this.resourceEmitTimer = 0;
    this.skillEngine.resetStage();
    this.enemies = [];
    this.projectiles = [];
    this.lasers = [];
    this.particles = [];
    this.targetId = null;
    this.spawnRemaining = stage.enemyBudget;
    this.spawnTimer = 0.3;
    this.eliteSpawned = 0;
    this.boss = null;
    this.bossSpawned = false;
    this.bossDefeated = false;
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
    this.skillHudTimer = 0;
    this.hooks.onBossUpdate(null);
    this.hooks.onSkills();
    this.hooks.onPhase(this.phase);
    this.hooks.onStats(this.getStats());
    this.hooks.onStage(stage.stage);
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
    this.boss = null;
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

    if (rawKey.length !== 1) return;

    const key = rawKey.toLocaleLowerCase("en-US");
    if (!/^[a-z]$/.test(key)) return;

    this.sfx.unlock();
    const target = this.currentTarget();

    if (target !== null) {
      this.typeTarget(target, key);
      return;
    }

    const projectile = this.findProjectileForKey(key);
    if (projectile !== null) {
      this.destroyProjectile(projectile);
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
    this.dpr = Math.min(2, window.devicePixelRatio || 1);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.seedStars();
  }

  private frame = (now: number): void => {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.phase === "playing") {
      this.update(dt);
    } else {
      this.updateEffects(dt);
    }

    this.draw(now / 1000);
    this.animationFrame = requestAnimationFrame(this.frame);
  };

  private update(dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 28);
    this.overdriveTimer = Math.max(0, this.overdriveTimer - dt);
    this.interferenceTimer = Math.max(0, this.interferenceTimer - dt);
    this.barrierTimer = Math.max(0, this.barrierTimer - dt);
    this.reflectTimer = Math.max(0, this.reflectTimer - dt);
    this.timeShellTimer = Math.max(0, this.timeShellTimer - dt);
    this.guardianTimer = Math.max(0, this.guardianTimer - dt);
    this.markTimer = Math.max(0, this.markTimer - dt);
    this.bossMarkTimer = Math.max(0, this.bossMarkTimer - dt);
    this.gravityWellTimer = Math.max(0, this.gravityWellTimer - dt);

    if (this.barrierTimer <= 0) this.barrierHp = 0;
    if (this.guardianTimer <= 0) this.guardianBlocks = 0;
    if (this.markTimer <= 0) this.markedEnemyId = null;

    this.skillEngine.tick(dt);
    this.skillHudTimer -= dt;
    if (this.skillHudTimer <= 0) {
      this.skillHudTimer = 0.15;
      this.hooks.onSkills();
    }

    const difficulty = this.difficulty;
    if (difficulty === null || this.stageConfig === null) return;

    this.updatePlayerResources(dt);
    const hostileTimeFactor = Math.min(
      this.timeShellTimer > 0 ? 0.42 : 1,
      this.gravityWellTimer > 0 ? 0.68 : 1,
    );
    this.updateBoss(dt * hostileTimeFactor, difficulty);
    this.spawnTimer -= dt * hostileTimeFactor;

    if (
      this.spawnRemaining > 0 &&
      this.spawnTimer <= 0 &&
      this.enemies.length < difficulty.maxEnemies
    ) {
      this.spawnEnemy();
      this.spawnRemaining -= 1;
      this.spawnTimer =
        difficulty.spawnInterval * randomBetween(0.82, 1.16);
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
      const markedSlow =
        enemy.id === this.markedEnemyId && this.markTimer > 0
          ? 0.72
          : 1;
      enemy.y += enemy.speed * speedFactor * markedSlow * dt;

      const desiredX =
        enemy.baseX + Math.sin(enemy.age * 1.1 + enemy.id) * enemy.drift;
      enemy.x += (desiredX - enemy.x) * Math.min(1, dt * 2);

      if (enemy.actionCooldown !== null) {
        enemy.actionCooldown -= dt * hostileTimeFactor;
        if (enemy.actionCooldown <= 0) {
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

          const baseInterval =
            enemyProfile(enemy.kind, this.stageConfig.galaxy).actionInterval ?? 4;
          const pressure =
            enemy.kind === "carrier" ||
            enemy.kind === "jammer" ||
            enemy.kind === "healer" ||
            enemy.kind === "leech" ||
            enemy.kind === "commander"
              ? difficulty.combatPressure
              : difficulty.projectilePressure;
          enemy.actionCooldown =
            baseInterval / Math.max(0.7, pressure);
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
        this.bossDefeated
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
    if (stage === null || !isBossStageRole(stage.role)) return;

    const entry = this.pickBossEntry();
    this.boss = createBossState(
      stage.stage,
      stage.galaxy,
      stage.role,
      entry,
    );
    this.bossSpawned = true;
    this.bossDefeated = false;
    this.projectiles = [];
    this.targetId = null;
    this.boss.actionCooldown =
      bossActionInterval(this.boss.role, this.boss.phase) /
      Math.max(0.75, this.difficulty?.bossPressure ?? 1);
    this.hooks.onBossUpdate(toBossHud(this.boss));
    this.sfx.bossEntrance();

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

    if (boss.staggerTimer > 0) {
      boss.staggerTimer = Math.max(0, boss.staggerTimer - dt);
      this.hooks.onBossUpdate(toBossHud(boss));
      return;
    }

    boss.actionCooldown -= dt;
    if (boss.actionCooldown > 0) return;

    this.fireBossProjectiles(boss);
    boss.actionCooldown =
      bossActionInterval(boss.role, boss.phase) /
      Math.max(0.75, difficulty.bossPressure);
  }

  private fireBossProjectiles(boss: BossState): void {
    if (this.difficulty === null) return;

    const { x, y } = this.bossPosition();
    const playerX = this.width / 2;
    const playerY = this.height - PLAYER_Y_OFFSET;
    const baseAngle = Math.atan2(playerY - y, playerX - x);
    const count = bossProjectileCount(boss.role, boss.phase);
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

  private finishStage(): void {
    if (this.phase !== "playing") return;
    this.phase = "stageclear";
    this.projectiles = [];
    this.boss = null;
    this.hooks.onBossUpdate(null);
    this.hooks.onStageClear(this.getStats());
    this.hooks.onPhase(this.phase);
  }

  private pickBossEntry(): VocabularyEntry {
    const candidates = this.vocabulary.filter((entry) => {
      const length = typingText(entry.en).length;
      return length >= 5 && length <= 12;
    });
    const source = candidates.length > 0 ? candidates : this.vocabulary;
    return (
      source[Math.floor(Math.random() * source.length)] ??
      FALLBACK_ENTRIES[8]!
    );
  }

  private spawnEnemy(): void {
    const stage = this.stageConfig?.stage ?? 1;
    const galaxy = this.stageConfig?.galaxy ?? 1;
    const kind = chooseEnemyKind(stage);
    const profile = enemyProfile(kind, galaxy);
    const entry = this.pickVocabularyEntry(kind);
    const difficulty = this.difficulty;

    const forceElite =
      this.stageConfig?.role === "elite" && this.eliteSpawned === 0;
    const elite =
      forceElite ||
      rollElite(this.stageConfig?.eliteChance ?? 0);
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
      ? difficulty?.combatPressure ?? 1
      : difficulty?.projectilePressure ?? 1;

    const baseSpeed =
      (profile.baseSpeed + randomBetween(0, profile.speedVariance)) *
      (difficulty?.enemySpeed ?? 1);
    const baseCooldown =
      profile.actionInterval === null
        ? null
        : profile.actionInterval / Math.max(0.7, actionPressure);
    const eliteStats = applyEliteModifiers(
      {
        speed: baseSpeed,
        layers: profile.layers,
        actionCooldown: baseCooldown,
      },
      eliteModifiers,
    );

    const baseX = randomBetween(
      profile.radius + 70,
      this.width - profile.radius - 70,
    );

    this.enemies.push({
      id: this.nextEnemyId++,
      kind,
      elite,
      eliteModifiers,
      entry,
      typed: 0,
      wordMissed: false,
      layersRemaining: eliteStats.layers,
      x: baseX,
      y: -profile.radius - 20,
      baseX,
      speed: eliteStats.speed,
      age: Math.random() * 8,
      drift: randomBetween(profile.driftMin, profile.driftMax),
      radius: elite ? profile.radius * 1.08 : profile.radius,
      flash: 0,
      kick: 0,
      actionCooldown: eliteStats.actionCooldown,
    });

    if (elite) {
      const firstElite = this.eliteSpawned === 0;
      this.eliteSpawned += 1;
      if (firstElite) this.sfx.eliteWarning();
    }
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

  private activateInterference(jammer: Enemy): void {
    this.interferenceTimer = Math.max(
      this.interferenceTimer,
      wardDuration(
        1.15 +
          Math.min(
            0.55,
            (this.difficulty?.combatPressure ?? 1) * 0.12,
          ),
        this.playerStats,
      ),
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

    ally.layersRemaining = 2;
    ally.flash = 1;
    this.burst(ally.x, ally.y, 20, 142);
    this.sfx.support();
  }

  private spawnCarrierChild(carrier: Enemy): void {
    if (this.difficulty === null) return;
    if (this.enemies.length >= this.difficulty.maxEnemies + 2) return;

    const profile = enemyProfile("scout", this.stageConfig?.galaxy ?? 1);
    const baseX = clamp(
      carrier.x + randomBetween(-95, 95),
      profile.radius + 55,
      this.width - profile.radius - 55,
    );

    this.enemies.push({
      id: this.nextEnemyId++,
      kind: "scout",
      elite: false,
      eliteModifiers: [],
      entry: this.pickVocabularyEntry("scout"),
      typed: 0,
      wordMissed: false,
      layersRemaining: 1,
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
      actionCooldown: null,
    });

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
    this.stats.score += 35 * this.stats.multiplier;
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
    this.stats.score += 16 * this.stats.multiplier;
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
            markedBossDamageMultiplier(this.bossMarkTimer > 0),
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
      this.hooks.onWordComplete(boss.entry);
      this.applyCharacterWordCompletePassive(word.length);

      if (boss.shieldActive) {
        boss.shieldActive = false;
        this.sfx.bossShieldBreak();
        const { x, y } = this.bossPosition();
        this.burst(x, y, 36, 176);
      } else {
        boss.hp = Math.max(
          0,
          boss.hp -
            firepowerDamage(
              bossWordDamage(boss.maxHp, boss.role),
              this.playerStats,
            ) *
              markedBossDamageMultiplier(this.bossMarkTimer > 0),
        );
      }

      const perfectWord = !boss.wordMissed;
      this.applyCharacterPerfectWordPassive(perfectWord);
      boss.wordsCompleted += 1;
      boss.typed = 0;
      boss.entry = this.pickBossEntry();
      boss.flash = 1;
      boss.kick = 1.5;
      boss.wordMissed = false;

      this.stats.score +=
        (140 + word.length * 18) * this.stats.multiplier;
      this.gainPower(perfectWord ? 11 : 8);

      if (perfectWord) {
        boss.staggerTimer = Math.max(boss.staggerTimer, 1.05);
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
    boss.actionCooldown =
      bossActionInterval(boss.role, boss.phase) /
      Math.max(0.75, this.difficulty?.bossPressure ?? 1);

    if (boss.phase === 2) {
      boss.shieldActive = true;
    }

    const { x, y } = this.bossPosition();
    this.burst(x, y, 44, boss.phase >= 3 ? 350 : 176);
    this.sfx.bossPhase();

    if (this.settings.screenShake) {
      this.shake = Math.max(this.shake, boss.phase >= 3 ? 10 : 7);
    }

    this.hooks.onBossUpdate(toBossHud(boss));
  }

  private defeatBoss(): void {
    const boss = this.boss;
    if (boss === null) return;

    const { x, y } = this.bossPosition();
    this.stats.kills += 1;
    this.stats.score += 1200 * this.stats.multiplier;
    this.gainPower(18);

    this.burst(x, y, 70, 24);
    this.sfx.bossDeath();

    if (this.settings.screenShake) {
      this.shake = Math.max(this.shake, 13);
    }

    this.boss = null;
    this.bossDefeated = true;
    this.hooks.onBossUpdate(null);
    this.finishStage();
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
    this.stats.score += 10 * this.stats.multiplier;
    this.gainPower(1.8);
    this.applyCharacterCorrectKeyPassive();

    this.fireLaser(enemy, 0.8);
    this.sfx.shot(this.stats.multiplier);

    if (enemy.typed >= word.length) {
      this.completeWord(enemy);
    }

    this.emitStats();
  }

  private completeWord(enemy: Enemy): void {
    const length = typingText(enemy.entry.en).length;
    const perfectWord = !enemy.wordMissed;
    this.hooks.onWordComplete(enemy.entry);
    this.applyCharacterWordCompletePassive(length);
    this.applyCharacterPerfectWordPassive(perfectWord);

    if (enemy.layersRemaining > 1) {
      enemy.layersRemaining -= 1;
      enemy.entry = this.pickVocabularyEntry(enemy.kind);
      enemy.typed = 0;
      enemy.wordMissed = false;
      enemy.flash = 1;
      enemy.kick = 1.45;

      if (enemy.kind === "shield") {
        enemy.speed *= 1.2;
      }

      this.stats.score += (45 + length * 8) * this.stats.multiplier;
      this.gainPower(4);

      this.fireLaser(enemy, 1.25);
      this.burst(
        enemy.x,
        enemy.y,
        enemy.kind === "shield" ? 25 : 18,
        enemy.kind === "shield" ? 164 : 202,
      );
      this.sfx.hit();
      this.targetId = null;
      return;
    }

    this.stats.kills += 1;
    this.stats.score += (80 + length * 14) * this.stats.multiplier;
    this.gainPower(7);

    this.fireLaser(enemy, 1.45);
    this.burst(
      enemy.x,
      enemy.y,
      enemy.kind === "tank" ? 36 : 24,
      enemy.kind === "mine" ? 342 : 188,
    );
    this.sfx.hit();
    this.sfx.kill();

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

    this.enemies = this.enemies.filter((item) => item.id !== enemy.id);
    if (this.markedEnemyId === enemy.id) {
      this.markedEnemyId = null;
      this.markTimer = 0;
    }
    this.targetId = null;
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
      const profile = enemyProfile("scout", this.stageConfig?.galaxy ?? 1);
      const baseX = clamp(
        splitter.x + direction * randomBetween(54, 86),
        55,
        this.width - 55,
      );

      this.enemies.push({
        id: this.nextEnemyId++,
        kind: "scout",
        elite: false,
        eliteModifiers: [],
        entry: this.pickVocabularyEntry("mine"),
        typed: 0,
        wordMissed: false,
        layersRemaining: 1,
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
        actionCooldown: null,
      });
    }

    this.burst(splitter.x, splitter.y, 30, 318);
  }

  private registerMiss(): void {
    this.stats.misses += 1;
    this.stats.streak = 0;
    this.stats.multiplier = 1;
    this.stats.power = clamp(this.stats.power - 12, 0, 100);

    if (this.settings.screenShake) {
      this.shake = Math.max(this.shake, 2);
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
    if (!perfectWord || this.characterId !== "aegis") return;

    const nextShield = restoreAegisShield(
      this.stats.shield,
      this.stats.maxShield,
    );
    if (nextShield <= this.stats.shield) return;

    this.stats.shield = nextShield;
    this.burst(
      this.width / 2,
      this.height - PLAYER_Y_OFFSET,
      16,
      204,
    );
    this.sfx.support();
  }

  private applyCharacterCorrectKeyPassive(): void {
    if (
      this.characterId !== "vanguard" ||
      !shouldTriggerVanguardShieldRhythm(this.stats.streak)
    ) {
      return;
    }

    const nextShield = restoreVanguardShield(
      this.stats.shield,
      this.stats.maxShield,
    );
    if (nextShield <= this.stats.shield) return;

    this.stats.shield = nextShield;
    this.burst(
      this.width / 2,
      this.height - PLAYER_Y_OFFSET,
      14,
      184,
    );
    this.sfx.support();
  }

  private activateOverdrive(): void {
    if (this.stats.power < 100) return;

    const isVanguard = this.characterId === "vanguard";
    const isAegis = this.characterId === "aegis";
    const isVolt = this.characterId === "volt";
    this.stats.power = 0;
    this.overdriveTimer = isVanguard
      ? VANGUARD_NOVA_DURATION
      : isAegis || isVolt
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
    }

    this.burst(
      this.width / 2,
      this.height - PLAYER_Y_OFFSET,
      isVanguard ? 48 : isAegis ? 56 : isVolt ? 62 : 36,
      isAegis ? 300 : isVolt ? 202 : 184,
    );

    if (this.settings.screenShake) {
      this.shake = Math.max(
        this.shake,
        isVanguard ? 9 : isAegis ? 10 : isVolt ? 11 : 7,
      );
    }

    this.sfx.power();
    this.emitStats();
  }

  private damagePlayer(enemyId: number, x: number, y: number): void {
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

    this.applyPlayerDamage(x, y, 42);
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

    const damage = applyIncomingDamage(
      {
        hull: this.stats.hull,
        shield: this.stats.shield,
        energy: this.stats.energy,
      },
      this.playerStats,
      damageRemaining,
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

    this.sfx.damage();
    this.emitStats();

    if (this.stats.hull <= 0) {
      this.phase = "gameover";
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

  private burst(x: number, y: number, count: number, hue: number): void {
    const qualityScale =
      this.settings.visualQuality === "ultra"
        ? 1.35
        : this.settings.visualQuality === "high"
          ? 1
          : this.settings.visualQuality === "medium"
            ? 0.65
            : 0.35;

    const finalCount = Math.max(2, Math.round(count * qualityScale));

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

    const maxParticles =
      this.settings.visualQuality === "ultra"
        ? 520
        : this.settings.visualQuality === "high"
          ? 360
          : this.settings.visualQuality === "medium"
            ? 220
            : 110;

    if (this.particles.length > maxParticles) {
      this.particles.splice(0, this.particles.length - maxParticles);
    }
  }

  private emitStats(): void {
    this.hooks.onStats(this.getStats());
  }

  private seedStars(): void {
    const count = Math.max(
      80,
      Math.min(220, Math.round((this.width * this.height) / 9000)),
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

    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    if (this.boss !== null) {
      this.drawBoss(time);
    }

    this.drawPlayer(time);
    this.drawDefensiveEffects(time);
    this.drawTargetLine();

    if (this.overdriveTimer > 0) {
      context.fillStyle =
        "rgba(65, 225, 255, " +
        String(0.035 + Math.sin(time * 10) * 0.012) +
        ")";
      context.fillRect(0, 0, this.width, this.height);
    }

    context.restore();
  }

  private drawBackground(time: number): void {
    const context = this.context;
    const gradient = context.createRadialGradient(
      this.width * 0.5,
      this.height * 0.78,
      50,
      this.width * 0.5,
      this.height * 0.52,
      Math.max(this.width, this.height) * 0.82,
    );

    gradient.addColorStop(0, "#0a2432");
    gradient.addColorStop(0.45, "#07121d");
    gradient.addColorStop(1, "#03060c");

    context.fillStyle = gradient;
    context.fillRect(-30, -30, this.width + 60, this.height + 60);

    for (const star of this.stars) {
      const y = ((star.y + time * 0.016 * star.z) % 1) * this.height;
      context.fillStyle =
        "rgba(156, 225, 255, " + String(0.12 + star.z * 0.48) + ")";
      context.fillRect(
        star.x * this.width,
        y,
        star.z * 1.7,
        star.z * 1.7,
      );
    }

    context.save();
    context.translate(this.width / 2, this.height * 0.08);
    context.strokeStyle = "rgba(75, 205, 235, 0.065)";
    context.lineWidth = 1;

    const horizon = 44;
    const scroll = (time * 72) % 48;

    for (let y = horizon + scroll; y < this.height; y += 48) {
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
      context.shadowBlur = 14 * laser.power;
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
    context.shadowBlur = 18;
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

    context.save();
    context.translate(x, y - boss.kick * 8);
    context.globalCompositeOperation = "lighter";
    context.shadowBlur = boss.flash > 0 ? 36 : 24;
    const phaseColor =
      boss.phase >= 3 ? "#ff527c" : boss.phase === 2 ? "#68e9ff" : "#ff8a6f";
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

  private drawEnemy(enemy: Enemy): void {
    const context = this.context;
    const targeted = enemy.id === this.targetId;
    const kick = enemy.kick * 7;

    const baseColor =
      enemy.kind === "mine"
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

    if (
      enemy.kind === "sniper" &&
      enemy.actionCooldown !== null &&
      enemy.actionCooldown <= 0.8
    ) {
      const warning = clamp(1 - enemy.actionCooldown / 0.8, 0, 1);
      context.save();
      context.strokeStyle =
        "rgba(255, 104, 85, " + String(0.12 + warning * 0.45) + ")";
      context.setLineDash([5, 7]);
      context.lineWidth = 1 + warning * 1.2;
      context.beginPath();
      context.moveTo(enemy.x, enemy.y);
      context.lineTo(this.width / 2, this.height - PLAYER_Y_OFFSET);
      context.stroke();
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

    if (enemy.kind === "tank") {
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

    if (enemy.kind === "oppressor") {
      context.strokeStyle = "rgba(229, 111, 255, 0.38)";
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(0, 0, enemy.radius * 0.62, 0, Math.PI * 2);
      context.stroke();

      context.beginPath();
      context.arc(0, 0, enemy.radius * 0.35, 0, Math.PI * 2);
      context.stroke();
    }

    if (enemy.kind === "shield" && enemy.layersRemaining > 1) {
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

    if (enemy.kind === "carrier") {
      context.fillStyle = "rgba(255, 219, 105, 0.75)";
      context.fillRect(-enemy.radius * 0.85, 2, 7, 7);
      context.fillRect(enemy.radius * 0.85 - 7, 2, 7, 7);
    }

    if (enemy.kind === "jammer") {
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

    if (enemy.kind === "healer") {
      context.strokeStyle = "rgba(111, 255, 185, 0.55)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(-enemy.radius * 0.42, 0);
      context.lineTo(enemy.radius * 0.42, 0);
      context.moveTo(0, -enemy.radius * 0.42);
      context.lineTo(0, enemy.radius * 0.42);
      context.stroke();
    }

    if (enemy.kind === "commander") {
      context.strokeStyle = "rgba(255, 243, 156, 0.52)";
      context.lineWidth = 1.4;
      context.beginPath();
      context.arc(0, 0, enemy.radius * 0.62, 0, Math.PI * 2);
      context.stroke();

      context.fillStyle = "rgba(255, 243, 156, 0.8)";
      context.fillRect(-2, -enemy.radius * 0.82, 4, 8);
    }

    if (enemy.kind === "leech") {
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

    context.save();
    context.font =
      "700 18px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textBaseline = "middle";

    const fullWidth = context.measureText(displayWord).width;
    const typedWidth = context.measureText(typed).width;
    const left = enemy.x - fullWidth / 2;
    const y = enemy.y - enemy.radius - 22;

    context.fillStyle = hidden
      ? "rgba(5, 9, 18, 0.92)"
      : "rgba(2, 7, 14, 0.84)";
    context.fillRect(left - 8, y - 14, fullWidth + 16, 28);

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
