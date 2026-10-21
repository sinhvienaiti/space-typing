import type { VocabularyEntry } from "../../types";
import {
  ABILITY,
  BLAST,
  BOON_WAVES,
  BOONS,
  BOSS,
  CHARGE,
  COMBO_TIERS,
  CORE_LIVES,
  CORE_LIVES_MAX,
  DIFFICULTY,
  ECONOMY,
  ENEMIES,
  HABITUATION,
  LABELS,
  REPAIR_SHARE,
  ROAR_PUSH,
  RUBBLE_COST,
  SELL_REFUND,
  SHOT_FLIGHT,
  SKILLS,
  TOWER_TUNING,
  TOWERS,
  type BoonId,
  type Branch,
  type Difficulty,
  type EnemyType,
  type SkillId,
  type TowerStats,
  type TowerType,
  type WordBandName,
} from "./data";
import { type MapSpec, type Pad } from "./maps";
import { RoadPath, type Point2 } from "./path";

/**
 * Rift Defense rules (docs/SPACE_TYPING_DEFENSE_PLAN_V4_2026-10-21.md): plain
 * TypeScript, no three.js and no page, stepped at a fixed rate. The view
 * reads the enemy pool and the towers and drains `events`; the balance bot
 * drives it in tests.
 *
 * Only a completed word kills, one word one enemy; bomb words, chain
 * reactions and swarms (one enemy made of many drones) are how one word
 * clears many. Towers strike on their own rhythm (frost waves, pulls, chain
 * lightning, target locks, heals, income) but never kill. Some enemies and
 * the bosses strike back at the towers, which fall at 0 hit points.
 */

export type PickedWord = { entry: VocabularyEntry; text: string };
export type WordSource = { pick(band: WordBandName, taken: ReadonlySet<string>): PickedWord | null };

export type Phase = "build" | "wave" | "review" | "boon" | "victory" | "defeat";

export const MAX_ENEMIES = 640;
export const STEP = 1 / 60;

/** What an acting enemy is doing (Saboteur, Destroyer). */
export type EnemyAct = "walk" | "aim" | "detour" | "windup" | "return";

export class Enemy {
  index = 0;
  id = 0;
  alive = false;
  type: EnemyType = "scout";
  /** Which road (map path) it follows, and how far along it is. */
  path = 0;
  s = 0;
  lat = 0;
  x = 0;
  z = 0;
  baseSpeed = 0;
  /** Effective speed this step (metres/second), for the view's gait. */
  speed = 0;
  layers = 1;
  maxLayers = 1;
  bomb = false;
  /** The pad of the Beacon that marked it (−1: born a bomb, or none). */
  bombBy = -1;
  /** Seconds until the fireball for its last word lands (it is pinned meanwhile); 0 when not doomed. */
  doomed = 0;
  word: PickedWord | null = null;
  typed = 0;
  wordMistakes = 0;
  labeledAt = 0;
  labeled = false;
  frozen = 0;
  chill = 0;
  stun = 0;
  /** A Frost wave's slow and the seconds it still holds. */
  slowAmount = 0;
  slowTime = 0;
  /** Strongest slow and pull acting on it this step (view tints). */
  slowNow = 0;
  pullNow = 0;
  freezeHits = 0;
  freezeWindow = 0;
  /** Rime Lance: its next word strips two layers. */
  brittle = 0;
  /** Disruptor: no ability; Arc/Frost: a Phantom stays visible. */
  silence = 0;
  reveal = 0;
  /** Inside a Shield Bearer's reach (cannot be typed or blasted); a broken shield keeps off for a while. */
  shielded = false;
  shieldBreak = 0;
  cloaked = false;
  onIce = false;
  drones = 0;
  seed = 0;
  /** Seconds since a Beacon marked it (the view flashes the mark). */
  marked = 0;
  /** Hit flash for the view (seconds left). */
  flash = 0;
  pause = 0;
  summoned = false;
  charging = false;
  /** Explosions it got caught in, so one blast cannot hit it twice. */
  lastBlast = 0;
  /** Event Horizon: metres still to be thrown back. */
  thrown = 0;
  // Abilities.
  act: EnemyAct = "walk";
  actTimer = 0;
  actPad = -1;
  actShots = 0;
  rest = 0;
  /** Off the road toward a tower (Destroyer): 0 on the road … 1 at the tower. */
  off = 0;
  stomp = 0;
  bolt = 0;
  arcCool = 0;
}

export type Tower = {
  pad: number;
  type: TowerType;
  /** 0, 1, 2: levels 1–3; 3: its branch. */
  level: number;
  branch: Branch | null;
  spent: number;
  /** Spent in this build phase: selling gives it all back. */
  fresh: number;
  timer: number;
  timer2: number;
  hp: number;
  maxHp: number;
  down: boolean;
  /** Seconds before a Sanctum stands it up again (0: not reviving). */
  revive: number;
  stunned: number;
  jammed: boolean;
  /** Enemies in reach this step (Gravity hum, vortex strength). */
  active: number;
  /** Gravity: seconds of the collapse; Arc: strikes so far. */
  collapse: number;
  strikes: number;
  /** Repaired this step by a Sanctum (view sparkles). */
  mended: number;
  /** Per road: the distance along it of the point nearest the pad, or −1 when out of reach. */
  focus: number[];
};

export type ReviewWord = { entry: VocabularyEntry; text: string; mistakes: number; seconds: number };

export type HitKind = "shot" | "mine" | "smash" | "stomp" | "bolt";

export type DefenseEvent =
  | { kind: "spawn"; id: number; type: EnemyType }
  | { kind: "label"; id: number }
  | { kind: "type"; id: number; typed: number }
  | { kind: "miss"; id: number | null }
  | { kind: "shot"; id: number; bomb: boolean; final: boolean; x: number; z: number }
  | { kind: "layer"; id: number; layers: number; x: number; z: number; by: "word" | "arc" | "blast" | "heal" }
  | { kind: "kill"; id: number; type: EnemyType; x: number; z: number; frozen: boolean; byBlast: boolean; reward: number }
  | { kind: "swarmPop"; id: number; x: number; z: number; drones: number }
  | { kind: "blast"; x: number; z: number; radius: number; depth: number; small: boolean }
  | { kind: "shatter"; x: number; z: number }
  | { kind: "shieldBreak"; id: number; x: number; z: number }
  // Tower strikes.
  | { kind: "frost"; pad: number; hits: number }
  | { kind: "freeze"; pad: number; ids: number[] }
  | { kind: "lance"; pad: number; id: number }
  | { kind: "collapse"; pad: number }
  | { kind: "singularity"; pad: number }
  | { kind: "horizon"; pad: number }
  | { kind: "arc"; pad: number; ids: number[]; overload: boolean }
  | { kind: "mark"; id: number; pad: number }
  | { kind: "coreHeal"; pad: number; lives: number }
  | { kind: "revive"; pad: number }
  | { kind: "income"; pad: number; amount: number }
  | { kind: "siphon"; pad: number; x: number; z: number; amount: number }
  // Enemies striking back.
  | { kind: "aim"; id: number; pad: number }
  | { kind: "bolt"; id: number; pad: number; flight: number; boss: boolean }
  | { kind: "towerHit"; pad: number; amount: number; hit: HitKind; x: number; z: number }
  | { kind: "towerDown"; pad: number }
  | { kind: "mineBlast"; id: number; pad: number; x: number; z: number }
  | { kind: "smash"; id: number; pad: number }
  | { kind: "stomp"; id: number; x: number; z: number; radius: number }
  | { kind: "heal"; id: number; target: number }
  | { kind: "launch"; id: number; swarm: number }
  | { kind: "split"; id: number; x: number; z: number }
  | { kind: "leak"; id: number; type: EnemyType; damage: number; blocked: boolean }
  // Learning, rhythm and the page.
  | { kind: "learned"; entry: VocabularyEntry; perfect: boolean; seconds: number }
  | { kind: "combo"; combo: number; tier: string }
  | { kind: "skill"; skill: SkillId }
  | { kind: "build"; pad: number; type: TowerType; level: number; branch: Branch | null }
  | { kind: "sell"; pad: number; refund: number }
  | { kind: "repair"; pad: number }
  | { kind: "clear"; pad: number }
  | { kind: "waveStart"; wave: number; early: number }
  | { kind: "waveEnd"; wave: number; perfect: boolean; bonus: number }
  | { kind: "boonOffer"; boons: BoonId[] }
  | { kind: "boon"; boon: BoonId }
  | { kind: "bossPhase"; id: number; phase: 2 | 3 }
  | { kind: "victory"; stars: number }
  | { kind: "defeat" };

export type DefenseStats = {
  words: number;
  letters: number;
  keystrokes: number;
  mistakes: number;
  kills: number;
  affectedKills: number;
  chainBest: number;
  leaks: number;
  waveSeconds: number;
  maxCombo: number;
  maxAlive: number;
  energyEarned: number;
  towerHits: number;
  towersDown: number;
  learned: { entry: VocabularyEntry; perfect: boolean }[];
};

type Spawn = { at: number; type: EnemyType; drones: number; path: number };
type ChainBlast = { at: number; x: number; z: number; radius: number; depth: number; cluster: boolean; small: boolean };
type PendingHit = { at: number; pad: number; amount: number; hit: HitKind; x: number; z: number };

export type DefenseOptions = { map: MapSpec; difficulty?: Difficulty; words: WordSource; random?: () => number };

const HEART_AT: Partial<Record<EnemyType, number>> = { warden: BOSS.heartAt, lieutenant: 2 };
const ACTING: ReadonlySet<EnemyType> = new Set(["shield", "healer", "sniper", "carrier", "jammer", "destroyer"]);

export class DefenseEngine {
  readonly map: MapSpec;
  readonly paths: RoadPath[];
  readonly pads: readonly Pad[];
  readonly difficulty: Difficulty;
  readonly enemies: Enemy[] = Array.from({ length: MAX_ENEMIES }, (_, index) => Object.assign(new Enemy(), { index }));
  readonly towers: (Tower | null)[];
  /** Rubble pads that have been cleared (normal pads count as cleared). */
  readonly cleared: boolean[];
  readonly events: DefenseEvent[] = [];
  readonly boons = new Set<BoonId>();
  readonly stats: DefenseStats = {
    words: 0, letters: 0, keystrokes: 0, mistakes: 0, kills: 0, affectedKills: 0, chainBest: 0, leaks: 0, waveSeconds: 0, maxCombo: 0, maxAlive: 0,
    energyEarned: 0, towerHits: 0, towersDown: 0, learned: [],
  };
  phase: Phase = "build";
  /** Waves cleared so far (the next wave is map.waves[wave]). */
  wave = 0;
  energy: number;
  lives = CORE_LIVES;
  maxLives = CORE_LIVES;
  startLives = CORE_LIVES;
  /** Bastion: enemies the Core's shield still stops this wave. */
  coreShield = 0;
  combo = 0;
  charge = 0;
  readonly cooldowns: Record<SkillId, number> = { breath: 0, roar: 0, nova: 0 };
  breath = 0;
  nova = 0;
  /** Seconds left of the build phase (0 on the first one: it waits for the player). */
  buildTimer = 0;
  reviewTimer = 0;
  review: ReviewWord[] = [];
  offered: BoonId[] = [];
  locked: Enemy | null = null;
  time = 0;
  private waveTime = 0;
  private schedule: Spawn[] = [];
  private chains: ChainBlast[] = [];
  private hits: PendingHit[] = [];
  private chainCount = 0;
  private leaksThisWave = 0;
  private nextId = 1;
  private blastId = 0;
  private sanctumTimer = 0;
  private readonly words: WordSource;
  private readonly random: () => number;
  private readonly at: Point2 = { x: 0, z: 0 };
  private readonly taken = new Set<string>();
  private wordTimes: number[] = [];

  constructor(options: DefenseOptions) {
    this.map = options.map;
    this.paths = this.map.paths.map((points) => new RoadPath(points));
    this.pads = this.map.pads;
    this.difficulty = options.difficulty ?? "normal";
    this.words = options.words;
    this.random = options.random ?? Math.random;
    this.energy = Math.round(this.map.start * DIFFICULTY[this.difficulty].energy);
    this.towers = this.pads.map(() => null);
    this.cleared = this.pads.map((pad) => pad.trait !== "rubble");
  }

  get waveCount(): number {
    return this.map.waves.length;
  }

  get alive(): number {
    let count = 0;
    for (const enemy of this.enemies) if (enemy.alive) count += enemy.type === "swarm" ? enemy.drones : 1;
    return count;
  }

  get accuracy(): number {
    return this.stats.keystrokes === 0 ? 1 : this.stats.letters / this.stats.keystrokes;
  }

  get wpm(): number {
    return this.stats.waveSeconds < 1 ? 0 : this.stats.letters / 5 / (this.stats.waveSeconds / 60);
  }

  /** The bonus for calling the next wave now (build phase with a countdown). */
  get earlyBonus(): number {
    if (this.phase !== "build" || this.buildTimer <= 0) return 0;
    return Math.min(ECONOMY.earlyMax, Math.floor(this.buildTimer) * ECONOMY.earlyPerSecond);
  }

  // ------------------------------------------------------------- towers

  /** A tower's numbers now (its level or branch). */
  towerStats(tower: Tower): TowerStats {
    const spec = TOWERS[tower.type];
    return tower.branch !== null ? spec.branches[tower.branch].stats : spec.levels[Math.min(2, tower.level)]!;
  }

  /** Reach of a tower, with the pad's high ground. */
  range(tower: Tower): number {
    return this.towerStats(tower).range * (this.pads[tower.pad]!.trait === "high" ? 1 + TOWER_TUNING.highRange : 1);
  }

  /** Strength of a tower's effect: a ley pad gives 15 % more. */
  power(tower: Tower): number {
    return this.pads[tower.pad]!.trait === "ley" ? 1 + TOWER_TUNING.leyPower : 1;
  }

  /** Strike rate: ley pad, a nearby Conduit and a Restoration Sanctum each add theirs. */
  haste(tower: Tower): number {
    let haste = this.power(tower);
    const pad = this.pads[tower.pad]!;
    for (const other of this.towers) {
      if (other === null || other === tower || other.down || other.branch !== "b") continue;
      const at = this.pads[other.pad]!;
      const gap = Math.hypot(at.x - pad.x, at.z - pad.z);
      if (other.type === "siphon" && gap <= TOWER_TUNING.conduitRange) haste += TOWER_TUNING.conduitHaste;
      if (other.type === "sanctum" && gap <= this.range(other)) haste += TOWER_TUNING.restorationHaste;
    }
    return haste;
  }

  unlocked(type: TowerType): boolean {
    return this.map.towers.includes(type);
  }

  private buildPhase(): boolean {
    return this.phase === "build" || this.phase === "review" || this.phase === "boon";
  }

  canBuild(pad: number, type: TowerType): boolean {
    return this.buildPhase() && this.unlocked(type) && this.cleared[pad] === true && this.towers[pad] === null && this.energy >= TOWERS[type].levels[0].cost;
  }

  build(pad: number, type: TowerType): boolean {
    if (pad < 0 || pad >= this.towers.length || !this.canBuild(pad, type)) return false;
    const cost = TOWERS[type].levels[0].cost;
    this.energy -= cost;
    const hp = this.maxHp(TOWERS[type].levels[0].hp);
    const tower: Tower = {
      pad, type, level: 0, branch: null, spent: cost, fresh: cost, timer: 0, timer2: TOWER_TUNING.freezeEvery, hp, maxHp: hp, down: false, revive: 0, stunned: 0,
      jammed: false, active: 0, collapse: 0, strikes: 0, mended: 0, focus: [],
    };
    tower.focus = this.paths.map((path) => {
      const near = path.nearest(this.pads[pad]!.x, this.pads[pad]!.z);
      return near.gap <= this.range(tower) + 1 ? near.distance : -1;
    });
    this.towers[pad] = tower;
    this.events.push({ kind: "build", pad, type, level: 0, branch: null });
    return true;
  }

  private maxHp(base: number): number {
    return Math.round(base * (this.boons.has("reinforced") ? 1.4 : 1));
  }

  /** The price of the next level (level 3 → a branch), or null at the top. */
  upgradeCost(pad: number, branch?: Branch): number | null {
    const tower = this.towers[pad];
    if (tower == null || tower.branch !== null) return null;
    if (tower.level < 2) return TOWERS[tower.type].levels[tower.level + 1]!.cost;
    if (!this.map.branches) return null;
    return TOWERS[tower.type].branches[branch ?? "a"].stats.cost;
  }

  upgrade(pad: number, branch?: Branch): boolean {
    const tower = this.towers[pad];
    const cost = this.upgradeCost(pad, branch);
    if (tower == null || cost === null || !this.buildPhase() || tower.down || this.energy < cost) return false;
    if (tower.level >= 2 && branch === undefined) return false;
    this.energy -= cost;
    tower.spent += cost;
    tower.fresh += cost;
    if (tower.level >= 2) {
      tower.branch = branch!;
      tower.level = 3;
    } else tower.level += 1;
    const hp = this.maxHp(this.towerStats(tower).hp);
    tower.hp += hp - tower.maxHp;
    tower.maxHp = hp;
    tower.focus = this.paths.map((path) => {
      const near = path.nearest(this.pads[pad]!.x, this.pads[pad]!.z);
      return near.gap <= this.range(tower) + 1 ? near.distance : -1;
    });
    this.events.push({ kind: "build", pad, type: tower.type, level: tower.level, branch: tower.branch });
    return true;
  }

  /** What selling returns now. */
  refund(pad: number): number {
    const tower = this.towers[pad];
    if (tower == null) return 0;
    const share = this.boons.has("salvage") ? 0.8 : SELL_REFUND;
    return Math.floor(tower.fresh + (tower.spent - tower.fresh) * share);
  }

  sell(pad: number): boolean {
    const tower = this.towers[pad];
    if (tower == null || !this.buildPhase()) return false;
    const refund = this.refund(pad);
    this.energy += refund;
    this.towers[pad] = null;
    this.events.push({ kind: "sell", pad, refund });
    return true;
  }

  repairCost(pad: number): number | null {
    const tower = this.towers[pad];
    if (tower == null || (!tower.down && tower.hp >= tower.maxHp)) return null;
    const full = TOWERS[tower.type].levels[0].cost * REPAIR_SHARE * (this.boons.has("salvage") ? 0.5 : 1);
    // A scratched tower costs its share of the damage.
    return Math.max(5, Math.round(tower.down ? full : full * (1 - tower.hp / tower.maxHp)));
  }

  repair(pad: number): boolean {
    const tower = this.towers[pad];
    const cost = this.repairCost(pad);
    if (tower == null || cost === null || !this.buildPhase() || this.energy < cost) return false;
    this.energy -= cost;
    tower.down = false;
    tower.revive = 0;
    tower.hp = tower.maxHp;
    this.events.push({ kind: "repair", pad });
    return true;
  }

  clear(pad: number): boolean {
    if (!this.buildPhase() || this.cleared[pad] !== false || this.energy < RUBBLE_COST) return false;
    this.energy -= RUBBLE_COST;
    this.cleared[pad] = true;
    this.events.push({ kind: "clear", pad });
    return true;
  }

  startWave(): boolean {
    if (this.phase !== "build" || this.wave >= this.map.waves.length) return false;
    const early = this.earlyBonus;
    this.earn(early);
    const spec = this.map.waves[this.wave]!;
    const gates = this.paths.length;
    let turn = 0;
    this.schedule = spec.groups
      .flatMap((group) => {
        // Bosses stay one; other groups grow or shrink with the difficulty, keeping their span.
        const boss = ENEMIES[group.type].boss === true;
        const count = boss ? group.count : Math.max(1, Math.round(group.count * DIFFICULTY[this.difficulty].count));
        const every = (group.every * group.count) / count;
        return Array.from({ length: count }, (_, index): Spawn => {
          const path = typeof group.gate === "number" ? group.gate % gates : boss ? 0 : (turn++) % gates;
          return { at: group.at + index * every, type: group.type, drones: group.drones ?? 0, path };
        });
      })
      .sort((a, b) => a.at - b.at);
    this.waveTime = 0;
    this.leaksThisWave = 0;
    this.phase = "wave";
    for (const tower of this.towers) {
      if (tower === null) continue;
      tower.fresh = 0;
      tower.timer = 0;
      tower.timer2 = tower.type === "frost" && tower.branch === "b" ? TOWER_TUNING.lanceEvery : TOWER_TUNING.freezeEvery;
      if (tower.type === "gravity") tower.timer = this.towerStats(tower).period;
      if (tower.type === "beacon") tower.timer = this.beaconPeriod(tower) * 0.5;
    }
    this.coreShield = this.towers.some((tower) => tower?.type === "sanctum" && tower.branch === "a" && !tower.down) ? TOWER_TUNING.bastionShield : 0;
    this.events.push({ kind: "waveStart", wave: this.wave + 1, early });
    // Siphons pay out as the wave opens.
    for (const tower of this.towers) {
      if (tower === null || tower.type !== "siphon" || tower.down) continue;
      const amount = this.towerStats(tower).income + (this.boons.has("dividend") ? 5 : 0);
      this.earn(amount);
      this.events.push({ kind: "income", pad: tower.pad, amount });
    }
    return true;
  }

  private earn(amount: number): void {
    if (amount <= 0) return;
    this.energy += amount;
    this.stats.energyEarned += amount;
  }

  // ------------------------------------------------------------- typing

  /** One typed letter during a wave; true when it was right. */
  typeLetter(letter: string): boolean {
    if (this.phase !== "wave") return false;
    this.stats.keystrokes += 1;
    let target = this.locked;
    if (target !== null && (!target.alive || !target.labeled || target.doomed > 0 || target.word === null)) target = this.locked = null;
    if (target === null) {
      target = this.enemies.find((enemy) => this.typeable(enemy) && enemy.word?.text[0] === letter) ?? null;
      if (target === null) {
        this.miss(null);
        return false;
      }
      this.locked = target;
    } else if (target.word!.text[target.typed] !== letter) {
      this.miss(target);
      return false;
    }
    target.typed += 1;
    this.stats.letters += 1;
    this.events.push({ kind: "type", id: target.id, typed: target.typed });
    if (target.typed >= target.word!.text.length) this.completeWord(target);
    return true;
  }

  /** Can a word be started on it: labeled, not shielded, not cloaked, not already dying. */
  typeable(enemy: Enemy): boolean {
    return enemy.alive && enemy.labeled && enemy.doomed === 0 && !enemy.shielded && !enemy.cloaked && enemy.word !== null;
  }

  private miss(target: Enemy | null): void {
    this.stats.mistakes += 1;
    if (target !== null) target.wordMistakes += 1;
    this.combo = this.boons.has("keepFire") ? Math.floor(this.combo / 2) : 0;
    this.events.push({ kind: "miss", id: target?.id ?? null });
  }

  private completeWord(enemy: Enemy): void {
    const word = enemy.word!;
    const seconds = Math.max(0.1, this.time - enemy.labeledAt);
    this.stats.words += 1;
    this.wordTimes.push(seconds);
    const perfect = enemy.wordMistakes === 0;
    this.stats.learned.push({ entry: word.entry, perfect });
    this.events.push({ kind: "learned", entry: word.entry, perfect, seconds });
    const average = this.wordTimes.reduce((sum, value) => sum + value, 0) / this.wordTimes.length;
    if (!perfect || (this.wordTimes.length > 4 && seconds > average * 2.5)) this.noteReview({ entry: word.entry, text: word.text, mistakes: enemy.wordMistakes, seconds });
    const tier = COMBO_TIERS.filter((item) => this.combo + 1 >= item.combo).pop();
    this.charge = Math.min(CHARGE.max, this.charge + CHARGE.word * (tier?.charge ?? 1) * (this.boons.has("eagerDragon") ? 1.25 : 1));
    this.combo += 1;
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo);
    const reached = COMBO_TIERS.find((item) => item.combo === this.combo);
    if (reached !== undefined) {
      this.earn(reached.energy);
      this.events.push({ kind: "combo", combo: this.combo, tier: reached.name });
    }
    if (this.breath > 0 && ENEMIES[enemy.type].boss !== true) enemy.bomb = true;
    this.locked = null;
    // Rime Lance: a brittle enemy loses two layers to one word.
    const strip = enemy.brittle > 0 ? 2 : 1;
    enemy.brittle = 0;
    const heart = HEART_AT[enemy.type] ?? 0;
    enemy.layers = Math.max(enemy.layers > heart && enemy.layers - strip < heart ? heart : 0, enemy.layers - strip);
    enemy.typed = 0;
    enemy.wordMistakes = 0;
    if (enemy.layers > 0) {
      // A layer down: the fireball lands on it, the next word shows at once.
      this.events.push({ kind: "shot", id: enemy.id, bomb: false, final: false, x: enemy.x, z: enemy.z });
      this.events.push({ kind: "layer", id: enemy.id, layers: enemy.layers, x: enemy.x, z: enemy.z, by: "word" });
      enemy.flash = 0.25;
      if (enemy.type === "warden") this.bossProgress(enemy);
      this.assignWord(enemy, word.text[0]);
      return;
    }
    enemy.doomed = SHOT_FLIGHT;
    enemy.labeled = false;
    this.events.push({ kind: "shot", id: enemy.id, bomb: enemy.bomb, final: true, x: enemy.x, z: enemy.z });
  }

  private noteReview(word: ReviewWord): void {
    if (this.review.some((item) => item.text === word.text)) return;
    this.review.push(word);
    if (this.review.length > 3) this.review.shift();
  }

  // ------------------------------------------------------------- skills and boons

  canUse(skill: SkillId): boolean {
    return this.phase === "wave" && this.cooldowns[skill] <= 0 && this.charge >= SKILLS[skill].cost;
  }

  useSkill(skill: SkillId): boolean {
    if (!this.canUse(skill)) return false;
    this.charge -= SKILLS[skill].cost;
    this.cooldowns[skill] = SKILLS[skill].cooldown;
    if (skill === "breath") this.breath = SKILLS.breath.seconds;
    if (skill === "roar") {
      for (const enemy of this.enemies) {
        if (!enemy.alive || enemy.doomed > 0) continue;
        enemy.s = Math.max(0, enemy.s - ROAR_PUSH);
        enemy.stun = Math.max(enemy.stun, SKILLS.roar.seconds);
      }
    }
    if (skill === "nova") {
      this.nova = SKILLS.nova.seconds;
      for (const enemy of this.enemies) {
        if (enemy.alive && enemy.labeled && enemy.typed === 0 && enemy !== this.locked && ENEMIES[enemy.type].boss !== true) this.assignWord(enemy, enemy.word?.text[0]);
      }
    }
    this.events.push({ kind: "skill", skill });
    return true;
  }

  chooseBoon(index: number): boolean {
    const boon = this.offered[index];
    if (this.phase !== "boon" || boon === undefined) return false;
    this.boons.add(boon);
    if (boon === "fortify") {
      this.maxLives = CORE_LIVES_MAX;
      this.lives = Math.min(CORE_LIVES_MAX, this.lives + 4);
    }
    if (boon === "reinforced") {
      for (const tower of this.towers) {
        if (tower === null) continue;
        const hp = this.maxHp(this.towerStats(tower).hp);
        if (!tower.down) tower.hp += hp - tower.maxHp;
        tower.maxHp = hp;
      }
    }
    this.offered = [];
    this.events.push({ kind: "boon", boon });
    this.toBuild();
    return true;
  }

  skipReview(): void {
    if (this.phase === "review") this.reviewTimer = 0;
  }

  // ------------------------------------------------------------- step

  step(dt: number): void {
    this.time += dt;
    if (this.phase === "review") {
      this.reviewTimer -= dt;
      if (this.reviewTimer <= 0) this.afterReview();
      return;
    }
    if (this.phase === "build" && this.buildTimer > 0) {
      this.buildTimer -= dt;
      if (this.buildTimer <= 0) {
        this.buildTimer = 0;
        this.startWave();
      }
    }
    if (this.phase !== "wave") return;
    this.waveTime += dt;
    this.stats.waveSeconds += dt;
    this.breath = Math.max(0, this.breath - dt);
    this.nova = Math.max(0, this.nova - dt);
    for (const skill of ["breath", "roar", "nova"] as const) this.cooldowns[skill] = Math.max(0, this.cooldowns[skill] - dt);
    while (this.schedule.length > 0 && this.schedule[0]!.at <= this.waveTime) {
      const spawn = this.schedule.shift()!;
      this.spawn(spawn.type, spawn.path, 0, spawn.drones);
    }
    this.auras();
    this.towersAct(dt);
    this.enemiesAct(dt);
    this.move(dt);
    this.resolveHits();
    this.resolveShots(dt);
    this.resolveChains();
    this.label();
    this.stats.maxAlive = Math.max(this.stats.maxAlive, this.alive);
    if (this.phase === "wave" && this.schedule.length === 0 && this.chains.length === 0 && !this.enemies.some((enemy) => enemy.alive)) this.endWave();
  }

  /** Spawn a stress crowd (dev / performance checks): `count` enemies spread along the roads. */
  flood(count: number): void {
    const types: EnemyType[] = ["scout", "scout", "scout", "mine", "tank", "shield", "healer", "sniper"];
    let made = 0;
    for (let index = 0; made < count && index < count * 2; index += 1) {
      const type = index % 9 === 0 ? "swarm" : types[index % types.length]!;
      const path = index % this.paths.length;
      const enemy = this.spawn(type, path, this.random() * this.paths[path]!.length * 0.85, type === "swarm" ? 40 : 0);
      if (enemy === null) break;
      made += type === "swarm" ? 40 : 1;
    }
  }

  private spawn(type: EnemyType, path: number, s: number, drones: number, lat?: number): Enemy | null {
    const enemy = this.enemies.find((item) => !item.alive);
    if (enemy === undefined) return null;
    const spec = ENEMIES[type];
    Object.assign(enemy, {
      id: this.nextId++, alive: true, type, path, s, lat: lat ?? (this.random() * 2 - 1) * spec.lane,
      baseSpeed: spec.speed * this.map.pace * DIFFICULTY[this.difficulty].speed * (0.92 + this.random() * 0.16),
      speed: 0, layers: spec.layers, maxLayers: spec.layers, bomb: type === "mine", bombBy: -1, doomed: 0, word: null, typed: 0, wordMistakes: 0, labeled: false, labeledAt: 0,
      frozen: 0, chill: 0, stun: 0, slowAmount: 0, slowTime: 0, slowNow: 0, pullNow: 0, freezeHits: 0, freezeWindow: 0, brittle: 0, silence: 0, reveal: 0,
      shielded: false, shieldBreak: 0, cloaked: type === "cloaker", onIce: false, drones, seed: this.random(), marked: 0, flash: 0,
      pause: 0, summoned: false, charging: false, lastBlast: 0, thrown: 0,
      act: "walk", actTimer: type === "healer" ? ABILITY.healEvery : type === "carrier" ? ABILITY.carrierEvery * 0.6 : 0, actPad: -1, actShots: 0, rest: 1.5, off: 0,
      stomp: ABILITY.stompEvery * 0.6, bolt: ABILITY.bossBoltEvery, arcCool: 0,
    });
    this.place(enemy);
    this.events.push({ kind: "spawn", id: enemy.id, type });
    return enemy;
  }

  /** Where it stands: on its road, or part of the way to the tower a Destroyer is going for. */
  private place(enemy: Enemy): void {
    this.paths[enemy.path]!.point(enemy.s, enemy.lat, this.at);
    if (enemy.off > 0 && enemy.actPad >= 0) {
      const pad = this.pads[enemy.actPad]!;
      const dx = pad.x - this.at.x;
      const dz = pad.z - this.at.z;
      const length = Math.hypot(dx, dz) || 1;
      // Stops 1.4 m short of the tower's centre.
      const reach = Math.max(0, length - 1.4) * enemy.off;
      this.at.x += (dx / length) * reach;
      this.at.z += (dz / length) * reach;
    }
    enemy.x = this.at.x;
    enemy.z = this.at.z;
  }

  private remaining(enemy: Enemy): number {
    return this.paths[enemy.path]!.length - enemy.s;
  }

  /** Shields, cloaks, ice and jamming for this step. */
  private auras(): void {
    const [coreX, coreZ] = this.map.core;
    const bearers: Enemy[] = [];
    const jammers: Enemy[] = [];
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.doomed > 0 || enemy.silence > 0) continue;
      if (enemy.type === "shield") bearers.push(enemy);
      if (enemy.type === "jammer") jammers.push(enemy);
    }
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      let shielded = false;
      if (enemy.shieldBreak <= 0 && ENEMIES[enemy.type].boss !== true && enemy !== this.locked) {
        for (const bearer of bearers) {
          if (bearer !== enemy && Math.hypot(bearer.x - enemy.x, bearer.z - enemy.z) <= ABILITY.shieldRadius) {
            shielded = true;
            break;
          }
        }
      }
      enemy.shielded = shielded;
      enemy.cloaked = enemy.type === "cloaker" && enemy.reveal <= 0 && Math.hypot(enemy.x - coreX, enemy.z - coreZ) > ABILITY.cloakReveal && enemy !== this.locked;
      if (enemy.cloaked && enemy.labeled && enemy.typed === 0) enemy.labeled = false;
      enemy.onIce = this.onIce(enemy.x, enemy.z);
    }
    for (const tower of this.towers) {
      if (tower === null) continue;
      const pad = this.pads[tower.pad]!;
      let jammed = false;
      if (!this.jamProof(tower)) {
        for (const jammer of jammers) {
          if (Math.hypot(jammer.x - pad.x, jammer.z - pad.z) <= ABILITY.jamRadius) {
            jammed = true;
            break;
          }
        }
      }
      tower.jammed = jammed;
    }
  }

  private onIce(x: number, z: number): boolean {
    const ice = this.map.ice;
    if (ice === undefined) return false;
    for (const [x0, z0, x1, z1] of ice) if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return true;
    return false;
  }

  /** Restoration Sanctums keep the towers in their reach clear of jamming. */
  private jamProof(tower: Tower): boolean {
    const pad = this.pads[tower.pad]!;
    for (const other of this.towers) {
      if (other === null || other.type !== "sanctum" || other.branch !== "b" || other.down) continue;
      const at = this.pads[other.pad]!;
      if (Math.hypot(at.x - pad.x, at.z - pad.z) <= this.range(other)) return true;
    }
    return false;
  }

  // ------------------------------------------------------------- towers act

  private towersAct(dt: number): void {
    for (const tower of this.towers) {
      if (tower === null) continue;
      tower.mended = Math.max(0, tower.mended - dt);
      tower.stunned = Math.max(0, tower.stunned - dt);
      tower.active = 0;
      if (tower.down) {
        this.reviving(tower, dt);
        continue;
      }
      if (tower.stunned > 0 || tower.jammed) continue;
      switch (tower.type) {
        case "frost":
          this.frost(tower, dt);
          break;
        case "gravity":
          this.gravity(tower, dt);
          break;
        case "arc":
          this.arc(tower, dt);
          break;
        case "beacon":
          this.beacon(tower, dt);
          break;
        case "sanctum":
          this.sanctum(tower, dt);
          break;
        case "siphon":
          break;
      }
    }
  }

  /** Enemies within `range` of a pad, alive and not already dying. */
  private inReach(pad: Pad, range: number, out: Enemy[]): Enemy[] {
    out.length = 0;
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.doomed > 0) continue;
      if (Math.hypot(enemy.x - pad.x, enemy.z - pad.z) <= range) out.push(enemy);
    }
    return out;
  }

  private readonly reach: Enemy[] = [];

  private frost(tower: Tower, dt: number): void {
    const spec = this.towerStats(tower);
    const pad = this.pads[tower.pad]!;
    const near = this.inReach(pad, this.range(tower), this.reach);
    tower.active = near.length;
    tower.timer -= dt;
    if (tower.timer <= 0 && near.length > 0) {
      tower.timer = spec.period / this.haste(tower);
      const slow = Math.min(0.8, (spec.slow + (this.boons.has("deepFreeze") ? 0.1 : 0)) * this.power(tower));
      for (const enemy of near) {
        const bite = Math.min(0.85, slow * (enemy.onIce ? TOWER_TUNING.iceFrost : 1));
        enemy.slowAmount = Math.max(enemy.slowTime > 0 ? enemy.slowAmount : 0, bite);
        enemy.slowTime = Math.max(enemy.slowTime, spec.slowSeconds);
        if (spec.reveal > 0) enemy.reveal = Math.max(enemy.reveal, spec.reveal);
      }
      this.events.push({ kind: "frost", pad: tower.pad, hits: near.length });
    }
    if (tower.branch === "a") {
      tower.timer2 -= dt;
      if (tower.timer2 <= 0 && near.length > 0) {
        tower.timer2 = TOWER_TUNING.freezeEvery;
        const ids: number[] = [];
        for (const enemy of near) {
          if (ENEMIES[enemy.type].boss === true) continue;
          this.freeze(enemy, spec.freeze + (this.boons.has("deepFreeze") ? 0.6 : 0));
          ids.push(enemy.id);
        }
        this.events.push({ kind: "freeze", pad: tower.pad, ids });
      }
    } else if (tower.branch === "b") {
      tower.timer2 -= dt;
      if (tower.timer2 <= 0 && near.length > 0) {
        let best: Enemy | null = null;
        for (const enemy of near) {
          if (enemy.brittle > 0 || enemy.layers < 2) continue;
          if (best === null || enemy.layers > best.layers || (enemy.layers === best.layers && this.remaining(enemy) < this.remaining(best))) best = enemy;
        }
        if (best !== null) {
          tower.timer2 = TOWER_TUNING.lanceEvery;
          best.brittle = TOWER_TUNING.brittleSeconds;
          this.events.push({ kind: "lance", pad: tower.pad, id: best.id });
        }
      }
    }
  }

  private freeze(enemy: Enemy, seconds: number): void {
    if (this.time - enemy.freezeWindow > HABITUATION.window) {
      enemy.freezeWindow = this.time;
      enemy.freezeHits = 0;
    }
    const factor = HABITUATION.factors[Math.min(enemy.freezeHits, HABITUATION.factors.length - 1)]!;
    enemy.freezeHits += 1;
    enemy.frozen = Math.max(enemy.frozen, seconds * factor * ENEMIES[enemy.type].slowTaken);
  }

  private gravity(tower: Tower, dt: number): void {
    const spec = this.towerStats(tower);
    const pad = this.pads[tower.pad]!;
    const near = this.inReach(pad, this.range(tower), this.reach);
    tower.active = near.length;
    tower.collapse = Math.max(0, tower.collapse - dt);
    if (spec.period > 0) {
      tower.timer -= dt * this.haste(tower);
      if (tower.timer <= 0 && near.length > 0) {
        tower.timer = spec.period;
        if (tower.branch === "b") {
          for (const enemy of near) if (ENEMIES[enemy.type].boss !== true) enemy.thrown = TOWER_TUNING.horizonPush;
          this.events.push({ kind: "horizon", pad: tower.pad });
        } else {
          tower.collapse = TOWER_TUNING.collapseSeconds;
          this.events.push({ kind: "collapse", pad: tower.pad });
        }
      }
      // Singularity: the cluster is stunned as the collapse ends.
      if (tower.branch === "a" && tower.collapse > 0 && tower.collapse <= dt) {
        for (const enemy of near) if (ENEMIES[enemy.type].boss !== true) enemy.stun = Math.max(enemy.stun, TOWER_TUNING.singularityStun);
        this.events.push({ kind: "singularity", pad: tower.pad });
      }
    }
  }

  private arc(tower: Tower, dt: number): void {
    const spec = this.towerStats(tower);
    const pad = this.pads[tower.pad]!;
    const near = this.inReach(pad, this.range(tower), this.reach);
    tower.active = near.length;
    tower.timer -= dt;
    if (tower.timer > 0 || near.length === 0) return;
    tower.timer = spec.period / this.haste(tower);
    const count = spec.targets + (this.boons.has("overcharge") ? 2 : 0);
    // Shields and armour first, then the enemies that act, then whoever is nearest the Core.
    const score = (enemy: Enemy): number =>
      (enemy.shielded ? 30 : 0) + (enemy.layers > (HEART_AT[enemy.type] ?? 1) ? 20 : 0) + (ACTING.has(enemy.type) ? 12 : 0) + (enemy.cloaked && spec.reveal > 0 ? 8 : 0) - this.remaining(enemy) * 0.05;
    const picked = [...near].sort((a, b) => score(b) - score(a)).slice(0, count);
    // The bolt jumps from the pylon to the nearest, then on to the next nearest.
    const chain: Enemy[] = [];
    let fromX = pad.x;
    let fromZ = pad.z;
    while (picked.length > 0) {
      let best = 0;
      for (let index = 1; index < picked.length; index += 1) {
        if (Math.hypot(picked[index]!.x - fromX, picked[index]!.z - fromZ) < Math.hypot(picked[best]!.x - fromX, picked[best]!.z - fromZ)) best = index;
      }
      const next = picked.splice(best, 1)[0]!;
      chain.push(next);
      fromX = next.x;
      fromZ = next.z;
    }
    tower.strikes += 1;
    const overload = tower.branch === "a" && tower.strikes % TOWER_TUNING.overloadEvery === 0;
    for (const enemy of chain) {
      enemy.flash = Math.max(enemy.flash, 0.15);
      if (spec.reveal > 0) enemy.reveal = Math.max(enemy.reveal, spec.reveal);
      if (tower.branch === "b") enemy.silence = Math.max(enemy.silence, TOWER_TUNING.silenceSeconds);
      if (overload) enemy.stun = Math.max(enemy.stun, TOWER_TUNING.overloadStun);
      if (enemy.shielded) {
        enemy.shieldBreak = ABILITY.shieldBreakSeconds;
        enemy.shielded = false;
        this.events.push({ kind: "shieldBreak", id: enemy.id, x: enemy.x, z: enemy.z });
        continue;
      }
      const heart = HEART_AT[enemy.type] ?? 1;
      const boss = ENEMIES[enemy.type].boss === true;
      if (enemy.layers > heart && enemy !== this.locked && (!boss || enemy.arcCool <= 0)) {
        enemy.layers -= 1;
        if (boss) enemy.arcCool = 4;
        this.events.push({ kind: "layer", id: enemy.id, layers: enemy.layers, x: enemy.x, z: enemy.z, by: "arc" });
        if (enemy.type === "warden") this.bossProgress(enemy);
        if (enemy.labeled && enemy.typed === 0) this.assignWord(enemy, enemy.word?.text[0]);
        continue;
      }
      if (!boss) enemy.stun = Math.max(enemy.stun, TOWER_TUNING.arcStun);
    }
    this.events.push({ kind: "arc", pad: tower.pad, ids: chain.map((enemy) => enemy.id), overload });
  }

  private beaconPeriod(tower: Tower): number {
    return Math.max(2, this.towerStats(tower).period - (this.boons.has("quickBeacon") ? 2 : 0));
  }

  private beacon(tower: Tower, dt: number): void {
    const pad = this.pads[tower.pad]!;
    const near = this.inReach(pad, this.range(tower), this.reach);
    tower.active = near.length;
    tower.timer -= dt * this.haste(tower);
    if (tower.timer > 0) return;
    const marks = tower.branch === "b" ? 2 : 1;
    let made = 0;
    for (let mark = 0; mark < marks; mark += 1) {
      // The enemy with the most others within a blast of it: a bomb there takes the most with it.
      let best: Enemy | null = null;
      let bestCrowd = -1;
      for (const enemy of near) {
        if (enemy.bomb || ENEMIES[enemy.type].boss === true || enemy.cloaked) continue;
        let crowd = 0;
        for (const other of near) if (other !== enemy && Math.hypot(other.x - enemy.x, other.z - enemy.z) <= BLAST.radius) crowd += other.type === "swarm" ? 3 : 1;
        if (crowd > bestCrowd || (crowd === bestCrowd && best !== null && this.remaining(enemy) < this.remaining(best))) {
          best = enemy;
          bestCrowd = crowd;
        }
      }
      if (best === null) break;
      best.bomb = true;
      best.bombBy = tower.pad;
      best.marked = 1;
      made += 1;
      // A marked target shows a bomb (longer) word, unless the player is already typing it.
      if (best.labeled && best.typed === 0 && best !== this.locked) this.assignWord(best, best.word?.text[0]);
      this.events.push({ kind: "mark", id: best.id, pad: tower.pad });
    }
    if (made > 0) tower.timer = this.beaconPeriod(tower);
  }

  private sanctum(tower: Tower, dt: number): void {
    const spec = this.towerStats(tower);
    const pad = this.pads[tower.pad]!;
    const range = this.range(tower);
    const power = this.power(tower);
    // The Core: lives regained on the Sanctum's rhythm, whatever the distance.
    tower.timer += dt * power;
    if (tower.timer >= spec.period) {
      tower.timer = 0;
      if (this.lives < this.maxLives) {
        this.lives = Math.min(this.maxLives, this.lives + spec.bonus);
        this.events.push({ kind: "coreHeal", pad: tower.pad, lives: this.lives });
      }
    }
    for (const other of this.towers) {
      if (other === null || other === tower) continue;
      const at = this.pads[other.pad]!;
      if (Math.hypot(at.x - pad.x, at.z - pad.z) > range) continue;
      if (other.down) {
        // Level 3 and up stand fallen towers back up; Restoration at once.
        if (tower.level >= 2 && other.revive <= 0) other.revive = tower.branch === "b" ? 0.01 : TOWER_TUNING.reviveSeconds;
        continue;
      }
      if (other.hp < other.maxHp) {
        other.hp = Math.min(other.maxHp, other.hp + spec.repair * power * dt);
        other.mended = 0.25;
        tower.active += 1;
      }
    }
  }

  private reviving(tower: Tower, dt: number): void {
    if (tower.revive <= 0) return;
    tower.revive -= dt;
    if (tower.revive > 0) return;
    tower.revive = 0;
    tower.down = false;
    tower.hp = Math.round(tower.maxHp * TOWER_TUNING.reviveShare);
    this.events.push({ kind: "revive", pad: tower.pad });
  }

  // ------------------------------------------------------------- enemies act

  private nearestTower(x: number, z: number, reach: number): Tower | null {
    let best: Tower | null = null;
    let bestGap = reach;
    for (const tower of this.towers) {
      if (tower === null || tower.down) continue;
      const pad = this.pads[tower.pad]!;
      const gap = Math.hypot(pad.x - x, pad.z - z);
      if (gap <= bestGap) {
        best = tower;
        bestGap = gap;
      }
    }
    return best;
  }

  private hitTower(pad: number, amount: number, hit: HitKind, x: number, z: number): void {
    const tower = this.towers[pad];
    if (tower == null || tower.down) return;
    tower.hp -= amount;
    this.stats.towerHits += 1;
    this.events.push({ kind: "towerHit", pad, amount, hit, x, z });
    if (tower.hp <= 0) {
      tower.hp = 0;
      tower.down = true;
      tower.revive = 0;
      tower.collapse = 0;
      this.stats.towersDown += 1;
      this.events.push({ kind: "towerDown", pad });
    }
  }

  private enemiesAct(dt: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.doomed > 0) continue;
      enemy.rest = Math.max(0, enemy.rest - dt);
      enemy.arcCool = Math.max(0, enemy.arcCool - dt);
      const quiet = enemy.silence > 0 || enemy.frozen > 0 || enemy.stun > 0;
      switch (enemy.type) {
        case "healer":
          enemy.actTimer -= dt;
          if (enemy.actTimer <= 0) {
            enemy.actTimer = ABILITY.healEvery;
            if (!quiet) this.heal(enemy);
          }
          break;
        case "sniper":
          this.sniper(enemy, dt, quiet);
          break;
        case "mine": {
          const tower = this.nearestTower(enemy.x, enemy.z, ABILITY.mineReach);
          if (tower !== null) {
            this.events.push({ kind: "mineBlast", id: enemy.id, pad: tower.pad, x: enemy.x, z: enemy.z });
            this.release(enemy);
            this.hitTower(tower.pad, ABILITY.mineDamage, "mine", enemy.x, enemy.z);
          }
          break;
        }
        case "carrier":
          enemy.actTimer -= dt;
          if (enemy.actTimer <= 0 && enemy.actShots < ABILITY.carrierLaunches) {
            enemy.actTimer = ABILITY.carrierEvery;
            if (!quiet) {
              enemy.actShots += 1;
              const swarm = this.spawn("swarm", enemy.path, Math.max(0, enemy.s - 1), ABILITY.carrierDrones);
              if (swarm !== null) this.events.push({ kind: "launch", id: enemy.id, swarm: swarm.id });
            }
          }
          break;
        case "destroyer":
          this.destroyer(enemy, dt, quiet);
          break;
        case "lieutenant":
        case "warden":
          this.bossAct(enemy, dt, quiet);
          break;
        default:
          break;
      }
    }
  }

  private heal(healer: Enemy): void {
    let best: Enemy | null = null;
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy === healer || enemy.doomed > 0 || enemy.layers >= enemy.maxLayers) continue;
      if (Math.hypot(enemy.x - healer.x, enemy.z - healer.z) > ABILITY.healRadius) continue;
      if (best === null || enemy.maxLayers - enemy.layers > best.maxLayers - best.layers) best = enemy;
    }
    if (best === null) return;
    best.layers += 1;
    this.events.push({ kind: "heal", id: healer.id, target: best.id });
    this.events.push({ kind: "layer", id: best.id, layers: best.layers, x: best.x, z: best.z, by: "heal" });
  }

  private sniper(enemy: Enemy, dt: number, quiet: boolean): void {
    if (enemy.act === "walk") {
      if (enemy.rest > 0 || quiet) return;
      const tower = this.nearestTower(enemy.x, enemy.z, ABILITY.sniperRange);
      if (tower === null) return;
      enemy.act = "aim";
      enemy.actPad = tower.pad;
      enemy.actTimer = 0;
      enemy.actShots = 0;
      this.events.push({ kind: "aim", id: enemy.id, pad: tower.pad });
      return;
    }
    if (enemy.act !== "aim") return;
    const tower = this.towers[enemy.actPad];
    if (quiet || tower == null || tower.down) {
      enemy.act = "walk";
      enemy.rest = ABILITY.sniperRest * 0.5;
      return;
    }
    enemy.actTimer += dt;
    const shotAt = ((enemy.actShots + 1) * ABILITY.sniperAim) / (ABILITY.sniperShots + 1);
    if (enemy.actShots < ABILITY.sniperShots && enemy.actTimer >= shotAt) {
      enemy.actShots += 1;
      this.events.push({ kind: "bolt", id: enemy.id, pad: enemy.actPad, flight: ABILITY.boltFlight, boss: false });
      this.hits.push({ at: this.time + ABILITY.boltFlight, pad: enemy.actPad, amount: ABILITY.sniperDamage, hit: "shot", x: enemy.x, z: enemy.z });
    }
    if (enemy.actTimer >= ABILITY.sniperAim) {
      enemy.act = "walk";
      enemy.rest = ABILITY.sniperRest;
    }
  }

  private destroyer(enemy: Enemy, dt: number, quiet: boolean): void {
    const tower = enemy.actPad >= 0 ? this.towers[enemy.actPad] : null;
    switch (enemy.act) {
      case "walk": {
        if (enemy.rest > 0 || quiet) return;
        const target = this.nearestTower(enemy.x, enemy.z, ABILITY.destroyerReach);
        if (target === null) return;
        enemy.act = "detour";
        enemy.actPad = target.pad;
        enemy.off = 0;
        this.events.push({ kind: "aim", id: enemy.id, pad: target.pad });
        return;
      }
      case "detour": {
        if (tower == null || tower.down) {
          enemy.act = "return";
          return;
        }
        if (enemy.frozen > 0 || enemy.stun > 0) return;
        const pad = this.pads[enemy.actPad]!;
        this.paths[enemy.path]!.point(enemy.s, enemy.lat, this.at);
        const length = Math.max(1, Math.hypot(pad.x - this.at.x, pad.z - this.at.z) - 1.4);
        enemy.off = Math.min(1, enemy.off + (enemy.baseSpeed * (1 - this.slowOf(enemy)) * dt) / length);
        if (enemy.off >= 1) {
          enemy.act = "windup";
          enemy.actTimer = ABILITY.destroyerWindup;
        }
        return;
      }
      case "windup":
        if (enemy.frozen > 0 || enemy.stun > 0) return;
        enemy.actTimer -= dt;
        if (enemy.actTimer <= 0) {
          if (tower != null && !tower.down) {
            this.events.push({ kind: "smash", id: enemy.id, pad: enemy.actPad });
            this.hitTower(enemy.actPad, ABILITY.destroyerDamage, "smash", enemy.x, enemy.z);
          }
          enemy.act = "return";
        }
        return;
      case "return": {
        if (enemy.frozen > 0 || enemy.stun > 0) return;
        const pad = enemy.actPad >= 0 ? this.pads[enemy.actPad]! : null;
        this.paths[enemy.path]!.point(enemy.s, enemy.lat, this.at);
        const length = pad === null ? 1 : Math.max(1, Math.hypot(pad.x - this.at.x, pad.z - this.at.z) - 1.4);
        enemy.off = Math.max(0, enemy.off - (enemy.baseSpeed * dt) / length);
        if (enemy.off <= 0) {
          enemy.act = "walk";
          enemy.actPad = -1;
          enemy.rest = ABILITY.destroyerRest;
        }
        return;
      }
      default:
        return;
    }
  }

  private bossAct(boss: Enemy, dt: number, quiet: boolean): void {
    if (quiet) return;
    boss.stomp -= dt;
    if (boss.stomp <= 0) {
      boss.stomp = ABILITY.stompEvery;
      this.events.push({ kind: "stomp", id: boss.id, x: boss.x, z: boss.z, radius: ABILITY.stompRadius });
      for (const tower of this.towers) {
        if (tower === null || tower.down) continue;
        const pad = this.pads[tower.pad]!;
        if (Math.hypot(pad.x - boss.x, pad.z - boss.z) > ABILITY.stompRadius) continue;
        tower.stunned = Math.max(tower.stunned, ABILITY.stompStun);
        this.hitTower(tower.pad, ABILITY.stompDamage, "stomp", boss.x, boss.z);
      }
    }
    if (boss.type !== "warden") return;
    boss.bolt -= dt;
    if (boss.bolt <= 0) {
      boss.bolt = ABILITY.bossBoltEvery;
      const tower = this.nearestTower(boss.x, boss.z, ABILITY.bossRange);
      if (tower !== null) {
        const flight = 0.5;
        this.events.push({ kind: "bolt", id: boss.id, pad: tower.pad, flight, boss: true });
        this.hits.push({ at: this.time + flight, pad: tower.pad, amount: ABILITY.bossBoltDamage, hit: "bolt", x: boss.x, z: boss.z });
      }
    }
  }

  // ------------------------------------------------------------- movement

  /** The slow on it now (Frost wave, shatter chill), before its own resistance. */
  private slowOf(enemy: Enemy): number {
    return Math.max(enemy.slowTime > 0 ? enemy.slowAmount : 0, enemy.chill > 0 ? BLAST.shatterSlow : 0) * ENEMIES[enemy.type].slowTaken;
  }

  private move(dt: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.frozen = Math.max(0, enemy.frozen - dt);
      enemy.chill = Math.max(0, enemy.chill - dt);
      enemy.stun = Math.max(0, enemy.stun - dt);
      enemy.marked = Math.max(0, enemy.marked - dt);
      enemy.flash = Math.max(0, enemy.flash - dt);
      enemy.slowTime = Math.max(0, enemy.slowTime - dt);
      enemy.brittle = Math.max(0, enemy.brittle - dt);
      enemy.silence = Math.max(0, enemy.silence - dt);
      enemy.reveal = Math.max(0, enemy.reveal - dt);
      enemy.shieldBreak = Math.max(0, enemy.shieldBreak - dt);
      let slow = this.slowOf(enemy);
      let pull = 0;
      let squeeze = 0;
      for (const tower of this.towers) {
        if (tower === null || tower.type !== "gravity" || tower.down || tower.stunned > 0 || tower.jammed) continue;
        const anchor = tower.focus[enemy.path] ?? -1;
        if (anchor < 0) continue;
        const pad = this.pads[tower.pad]!;
        if (Math.hypot(enemy.x - pad.x, enemy.z - pad.z) > this.range(tower)) continue;
        const spec = this.towerStats(tower);
        const strength = spec.pull * this.power(tower) * (this.boons.has("tightPull") ? 1.3 : 1) * (tower.collapse > 0 ? TOWER_TUNING.collapsePull : 1);
        pull = Math.max(pull, strength);
        slow = Math.max(slow, spec.slow * this.power(tower) * ENEMIES[enemy.type].slowTaken);
        // Bunch up round the well: those past it slow down, those behind catch up.
        squeeze = Math.max(squeeze, enemy.s > anchor ? 0.18 * strength : -0.08 * strength);
        if (tower.collapse > 0) slow = Math.max(slow, 0.5);
      }
      enemy.slowNow = slow;
      enemy.pullNow = pull;
      if (pull > 0) enemy.lat -= enemy.lat * Math.min(1, pull * 1.4 * dt);
      let speed = enemy.baseSpeed * (enemy.onIce ? TOWER_TUNING.iceSpeed : 1) * (1 - Math.min(0.85, slow + Math.max(-0.2, squeeze) * ENEMIES[enemy.type].slowTaken));
      if (enemy.frozen > 0 || enemy.stun > 0 || enemy.doomed > 0 || enemy.act !== "walk") speed = 0;
      if (enemy.type === "warden") speed = this.bossSpeed(enemy, speed, dt);
      if (enemy.thrown > 0) {
        // Event Horizon: thrown back down the road over half a second.
        const back = Math.min(enemy.thrown, TOWER_TUNING.horizonPush * 2 * dt);
        enemy.thrown -= back;
        enemy.s = Math.max(0, enemy.s - back);
        speed = 0;
      }
      enemy.speed = speed;
      enemy.s += speed * dt;
      this.place(enemy);
      if (enemy.s >= this.paths[enemy.path]!.length) this.leak(enemy);
    }
  }

  private bossSpeed(boss: Enemy, speed: number, dt: number): number {
    if (boss.pause > 0) {
      boss.pause -= dt;
      return 0;
    }
    if (boss.charging && boss.doomed === 0) return BOSS.chargeSpeed * this.map.pace * DIFFICULTY[this.difficulty].speed;
    return speed;
  }

  private bossProgress(boss: Enemy): void {
    if (!boss.summoned && boss.layers <= BOSS.summonAt) {
      boss.summoned = true;
      boss.pause = BOSS.summonPause;
      for (let index = 0; index < BOSS.summonSwarms; index += 1) this.spawn("swarm", boss.path, Math.max(0, boss.s - 3 - index * 3), BOSS.summonDrones);
      this.events.push({ kind: "bossPhase", id: boss.id, phase: 2 });
    } else if (!boss.charging && boss.layers <= BOSS.chargeAt) {
      boss.charging = true;
      this.events.push({ kind: "bossPhase", id: boss.id, phase: 3 });
    } else if (boss.charging) {
      boss.s = Math.max(0, boss.s - BOSS.pushBack);
    }
  }

  private leak(enemy: Enemy): void {
    const boss = ENEMIES[enemy.type].boss === true;
    const blocked = !boss && this.coreShield > 0;
    const damage = boss ? this.lives : blocked ? 0 : ENEMIES[enemy.type].leak;
    if (blocked) this.coreShield -= 1;
    this.lives = Math.max(0, this.lives - damage);
    if (!blocked) {
      this.stats.leaks += 1;
      this.leaksThisWave += 1;
    }
    this.release(enemy);
    this.events.push({ kind: "leak", id: enemy.id, type: enemy.type, damage, blocked });
    if (this.lives <= 0) {
      this.phase = "defeat";
      this.events.push({ kind: "defeat" });
    }
  }

  private release(enemy: Enemy): void {
    enemy.alive = false;
    enemy.labeled = false;
    if (this.locked === enemy) this.locked = null;
  }

  // ------------------------------------------------------------- kills, blasts

  private resolveHits(): void {
    for (let index = 0; index < this.hits.length; ) {
      const hit = this.hits[index]!;
      if (hit.at > this.time) {
        index += 1;
        continue;
      }
      this.hits.splice(index, 1);
      this.hitTower(hit.pad, hit.amount, hit.hit, hit.x, hit.z);
    }
  }

  private resolveShots(dt: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.doomed <= 0) continue;
      enemy.doomed -= dt;
      if (enemy.doomed > 0) continue;
      enemy.doomed = 0;
      const bomb = enemy.bomb;
      const cluster = enemy.bombBy >= 0 && this.towers[enemy.bombBy]?.branch === "a" && this.towers[enemy.bombBy]?.type === "beacon";
      const by = enemy.bombBy;
      this.kill(enemy, false, -1);
      if (bomb) this.explode(enemy.x, enemy.z, this.blastRadius(enemy.x, enemy.z, by), 0, cluster, false);
    }
  }

  /** A bomb's reach: Wide Blast, the marking Beacon's level 3, a Singularity's well. */
  private blastRadius(x: number, z: number, beaconPad: number): number {
    let radius = BLAST.radius;
    if (this.boons.has("wideBlast")) radius *= 1.3;
    const beacon = beaconPad >= 0 ? this.towers[beaconPad] : null;
    if (beacon != null && beacon.type === "beacon") radius *= 1 + this.towerStats(beacon).bonus;
    for (const tower of this.towers) {
      if (tower === null || tower.type !== "gravity" || tower.branch !== "a" || tower.down) continue;
      const pad = this.pads[tower.pad]!;
      if (Math.hypot(pad.x - x, pad.z - z) <= this.range(tower)) {
        radius *= 1 + this.towerStats(tower).bonus;
        break;
      }
    }
    return radius;
  }

  /** `bombKill`: the beacon pad whose bomb killed it (Twin Sights pays), or −1. */
  private kill(enemy: Enemy, byBlast: boolean, bombKill: number): void {
    const frozen = enemy.frozen > 0;
    const spec = ENEMIES[enemy.type];
    this.stats.kills += 1;
    if (frozen || enemy.slowNow > 0 || enemy.pullNow > 0 || enemy.chill > 0) this.stats.affectedKills += 1;
    this.release(enemy);
    let reward = Math.round(spec.reward * DIFFICULTY[this.difficulty].energy) + (this.boons.has("fuel") ? 1 : 0);
    if (bombKill >= 0 && this.towers[bombKill]?.branch === "b") reward += 1;
    // Siphons in reach take their share of every kill.
    for (const tower of this.towers) {
      if (tower === null || tower.type !== "siphon" || tower.down) continue;
      const pad = this.pads[tower.pad]!;
      if (Math.hypot(pad.x - enemy.x, pad.z - enemy.z) > this.range(tower)) continue;
      const amount = this.towerStats(tower).perKill;
      reward += amount;
      this.events.push({ kind: "siphon", pad: tower.pad, x: enemy.x, z: enemy.z, amount });
    }
    this.earn(reward);
    if (enemy.type === "swarm") this.events.push({ kind: "swarmPop", id: enemy.id, x: enemy.x, z: enemy.z, drones: enemy.drones });
    else this.events.push({ kind: "kill", id: enemy.id, type: enemy.type, x: enemy.x, z: enemy.z, frozen, byBlast, reward });
    if (frozen) {
      // Shatter: shards of ice chill those close by.
      for (const other of this.enemies) {
        if (other.alive && Math.hypot(other.x - enemy.x, other.z - enemy.z) <= BLAST.shatterRadius) other.chill = Math.max(other.chill, BLAST.shatterSeconds);
      }
      this.events.push({ kind: "shatter", x: enemy.x, z: enemy.z });
    }
    if (enemy.type === "splitter") {
      for (let index = 0; index < ABILITY.splitInto; index += 1) this.spawn("splitling", enemy.path, Math.max(0, enemy.s + (index - 0.5) * 1.2), 0, enemy.lat + (index - 0.5) * 1.4);
      this.events.push({ kind: "split", id: enemy.id, x: enemy.x, z: enemy.z });
    }
  }

  /** A bomb going off at (x, z); depth counts the links of a chain reaction. */
  private explode(x: number, z: number, radius: number, depth: number, cluster: boolean, small: boolean): void {
    const id = ++this.blastId;
    if (depth === 0) this.chainCount = 0;
    this.chainCount += 1;
    this.stats.chainBest = Math.max(this.stats.chainBest, this.chainCount);
    this.events.push({ kind: "blast", x, z, radius, depth, small });
    const chainMax = this.boons.has("longChain") ? 20 : BLAST.chainMax;
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.lastBlast === id || enemy.doomed > 0) continue;
      if (Math.hypot(enemy.x - x, enemy.z - z) > radius) continue;
      enemy.lastBlast = id;
      if (enemy.shielded) {
        // A shield takes the blast and breaks.
        enemy.shieldBreak = ABILITY.shieldBreakSeconds;
        enemy.shielded = false;
        this.events.push({ kind: "shieldBreak", id: enemy.id, x: enemy.x, z: enemy.z });
        continue;
      }
      if (ENEMIES[enemy.type].boss === true) continue;
      if (enemy.layers > 1) {
        // Strong enemies lose one layer.
        enemy.layers -= 1;
        enemy.flash = 0.3;
        this.events.push({ kind: "layer", id: enemy.id, layers: enemy.layers, x: enemy.x, z: enemy.z, by: "blast" });
        if (enemy.labeled && enemy !== this.locked) this.assignWord(enemy, enemy.word?.text[0]);
        continue;
      }
      const bomb = enemy.bomb;
      const by = enemy.bombBy;
      const chainCluster = by >= 0 && this.towers[by]?.type === "beacon" && this.towers[by]?.branch === "a";
      this.kill(enemy, true, by);
      if (bomb && depth + 1 < chainMax) this.chains.push({ at: this.time + BLAST.chainDelay, x: enemy.x, z: enemy.z, radius: this.blastRadius(enemy.x, enemy.z, by), depth: depth + 1, cluster: chainCluster, small: false });
    }
    // Cluster Charge: three smaller blasts thrown round the first.
    if (cluster && !small && depth + 1 < chainMax) {
      for (let index = 0; index < TOWER_TUNING.clusterBombs; index += 1) {
        const angle = (index / TOWER_TUNING.clusterBombs) * Math.PI * 2 + this.random();
        const throwTo = radius * 0.8;
        this.chains.push({ at: this.time + 0.2 + index * 0.06, x: x + Math.cos(angle) * throwTo, z: z + Math.sin(angle) * throwTo, radius: TOWER_TUNING.clusterRadius, depth: depth + 1, cluster: false, small: true });
      }
    }
  }

  private resolveChains(): void {
    for (let index = 0; index < this.chains.length; ) {
      const chain = this.chains[index]!;
      if (chain.at > this.time) {
        index += 1;
        continue;
      }
      this.chains.splice(index, 1);
      this.explode(chain.x, chain.z, chain.radius, chain.depth, chain.cluster, chain.small);
    }
  }

  // ------------------------------------------------------------- words

  /** Keeps up to LABELS words on the visible enemies nearest the Core (bosses always have one). */
  private label(): void {
    let labeled = 0;
    for (const enemy of this.enemies) if (enemy.alive && enemy.labeled) labeled += 1;
    for (const enemy of this.enemies) {
      if (enemy.alive && ENEMIES[enemy.type].boss === true && !enemy.labeled && enemy.doomed === 0 && this.assignWord(enemy, undefined)) labeled += 1;
    }
    while (labeled < LABELS) {
      let best: Enemy | null = null;
      for (const enemy of this.enemies) {
        if (!enemy.alive || enemy.labeled || enemy.doomed > 0 || enemy.cloaked || enemy.s < 3) continue;
        if (best === null || this.remaining(enemy) < this.remaining(best)) best = enemy;
      }
      if (best === null || !this.assignWord(best, undefined)) break;
      labeled += 1;
    }
  }

  private assignWord(enemy: Enemy, previousFirst: string | undefined): boolean {
    this.taken.clear();
    for (const other of this.enemies) if (other.alive && other.labeled && other !== enemy && other.word !== null) this.taken.add(other.word.text[0]!);
    // A new word should not start with the same letter as the one just finished (the next key press reads clearly).
    if (previousFirst !== undefined && this.taken.size < 20) this.taken.add(previousFirst);
    const band: WordBandName = ENEMIES[enemy.type].boss === true ? "boss" : this.nova > 0 ? "short" : enemy.bomb ? "elite" : ENEMIES[enemy.type].band;
    const word = this.words.pick(band, this.taken) ?? (previousFirst !== undefined ? this.words.pick(band, new Set([...this.taken].filter((letter) => letter !== previousFirst))) : null);
    if (word === null) return false;
    enemy.word = word;
    enemy.typed = 0;
    enemy.labeled = true;
    enemy.labeledAt = this.time;
    this.events.push({ kind: "label", id: enemy.id });
    return true;
  }

  // ------------------------------------------------------------- waves

  private endWave(): void {
    this.wave += 1;
    const perfect = this.leaksThisWave === 0;
    const bonus = Math.round((ECONOMY.waveBase + ECONOMY.wavePerNumber * this.wave + (perfect ? ECONOMY.perfectWave : 0)) * DIFFICULTY[this.difficulty].energy);
    this.earn(bonus);
    this.locked = null;
    this.hits = [];
    for (const tower of this.towers) {
      if (tower === null) continue;
      tower.collapse = 0;
      tower.stunned = 0;
      tower.jammed = false;
      if (tower.down && this.boons.has("firstAid")) {
        tower.down = false;
        tower.hp = Math.round(tower.maxHp * 0.4);
        this.events.push({ kind: "revive", pad: tower.pad });
      }
    }
    this.events.push({ kind: "waveEnd", wave: this.wave, perfect, bonus });
    if (this.wave >= this.map.waves.length) {
      this.phase = "victory";
      this.events.push({ kind: "victory", stars: this.stars() });
      return;
    }
    this.phase = "review";
    this.reviewTimer = this.review.length > 0 ? 6 : 1.5;
  }

  private afterReview(): void {
    this.review = [];
    if (BOON_WAVES.includes(this.wave)) {
      const pool = (Object.keys(BOONS) as BoonId[]).filter((boon) => !this.boons.has(boon) && (BOONS[boon].needs === undefined || this.unlocked(BOONS[boon].needs!)));
      this.offered = [];
      while (this.offered.length < 3 && pool.length > 0) this.offered.push(pool.splice(Math.floor(this.random() * pool.length), 1)[0]!);
      this.phase = "boon";
      this.events.push({ kind: "boonOffer", boons: [...this.offered] });
      return;
    }
    this.toBuild();
  }

  private toBuild(): void {
    this.phase = "build";
    this.buildTimer = ECONOMY.buildSeconds * (this.difficulty === "hard" ? 0.75 : 1);
  }

  /** Stars for the Core lives kept (victory only): 3 at 90 %, 2 at 50 %, else 1. */
  stars(): number {
    if (this.phase !== "victory") return 0;
    const kept = this.lives / this.startLives;
    return kept >= 0.9 ? 3 : kept >= 0.5 ? 2 : 1;
  }
}
