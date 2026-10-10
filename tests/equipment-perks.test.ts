import { afterEach, describe, expect, it, vi } from "vitest";
import { Game } from "../src/Game";
import { createStageConfig } from "../src/campaign/stage";
import { difficultyFor } from "../src/campaign/difficulty";
import { createHiddenDiscoveryState } from "../src/discovery/hidden-content";
import {
  EQUIPMENT_PERK_IDS,
  EQUIPMENT_PERKS,
  NO_EQUIPMENT_PERKS,
  resolveEquipmentPerks,
  type EquipmentPerkId,
} from "../src/equipment/perks";
import {
  EQUIPMENT_IDS,
  EQUIPMENT_REGISTRY,
  EQUIPMENT_SLOTS,
} from "../src/equipment/registry";
import {
  createStarterEquipmentState,
  equipInstance,
  equippedPerkIds,
  addEquipmentInstance,
} from "../src/equipment/loadout";
import { createShopState, resolveShopInstance, type ShopRollContext } from "../src/shops/state";
import type { Enemy, GameSettings, VocabularyEntry } from "../src/types";

const settings: GameSettings = {
  sfxVolume: 0,
  musicVolume: 0,
  ambientVolume: 0,
  screenShake: false,
  visualQuality: "low",
  pronunciationEnabled: false,
  pronunciationRate: 1,
  pronunciationVolume: 0,
  killTranslation: {
    enabled: true,
    mode: "kill-position",
    showIpa: true,
    showVietnamese: true,
    size: "large",
    durationSeconds: 2.4,
  },
};

const vocabulary: VocabularyEntry[] = [
  { id: "qa-1", en: "orbit", vi: "quỹ đạo", ipa: "/ˈɔrbɪt/" },
  { id: "qa-2", en: "shield", vi: "lá chắn", ipa: "/ʃild/" },
  { id: "qa-3", en: "stellar", vi: "thuộc về sao", ipa: "/ˈstelər/" },
];

function createTestGame(): Game {
  vi.stubGlobal("window", {
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
  });
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal(
    "AudioContext",
    class {
      state = "running";
      close(): Promise<void> {
        return Promise.resolve();
      }
      resume(): Promise<void> {
        return Promise.resolve();
      }
    },
  );

  const context = {
    setTransform: vi.fn(),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    getBoundingClientRect: vi.fn(() => ({
      width: 1280,
      height: 720,
      top: 0,
      left: 0,
      right: 1280,
      bottom: 720,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })),
  } as unknown as HTMLCanvasElement;

  return new Game(canvas, vocabulary, settings, {
    onStats: vi.fn(),
    onPhase: vi.fn(),
    onStage: vi.fn(),
    onStageEvents: vi.fn(),
    onObjectiveUpdate: vi.fn(),
    onStageClear: vi.fn(),
    onBossUpdate: vi.fn(),
    onWordComplete: vi.fn(),
    onEquipmentDrop: vi.fn(),
    onRewardChoice: vi.fn(),
    onBossRewardChoice: vi.fn(),
    onEnemySeen: vi.fn(),
    onAnomalyReady: vi.fn(),
    onLuckPityUpdate: vi.fn(),
    onHiddenDiscoveryUpdate: vi.fn(),
    onStatuses: vi.fn(),
    onSkills: vi.fn(),
  });
}

function start(game: Game, stage = 1): void {
  game.startStage(
    createStageConfig(stage),
    difficultyFor({
      stage,
      vocabularyLevel: 1,
      mode: "balanced",
      recentWpm: 60,
      recentAccuracy: 96,
    }),
  );
}

type Runtime = {
  enemies: Enemy[];
  stats: { hull: number; shield: number; energy: number; maxEnergy: number };
};

function perkGame(perks: EquipmentPerkId[]): { game: Game; runtime: Runtime } {
  const game = createTestGame();
  game.setTestLabMode(true);
  game.setEquipmentPerks(resolveEquipmentPerks(perks));
  start(game);
  game.testLabSetSchedulerFrozen(true);
  return { game, runtime: game as unknown as Runtime };
}

describe("equipment perk content", () => {
  it("gives every Mk.II and Mk.III part its own perk, and Mk.I parts none", () => {
    const used = new Map<EquipmentPerkId, string>();
    for (const id of EQUIPMENT_IDS) {
      const definition = EQUIPMENT_REGISTRY[id];
      if (definition.tier === 1) {
        expect(definition.perk, id).toBeUndefined();
        continue;
      }
      expect(definition.perk, id).toBeDefined();
      expect(used.has(definition.perk!), definition.perk).toBe(false);
      used.set(definition.perk!, id);
      expect(definition.name).toContain(definition.tier === 2 ? "Mk.II" : "Mk.III");
    }
    expect([...used.keys()].sort()).toEqual([...EQUIPMENT_PERK_IDS].sort());
    for (const id of EQUIPMENT_PERK_IDS) {
      expect(EQUIPMENT_PERKS[id].description.length, id).toBeGreaterThan(20);
    }
  });

  it("offers a Mk.II pair and a Mk.III part in every slot", () => {
    for (const slot of EQUIPMENT_SLOTS) {
      const tiers = EQUIPMENT_IDS.filter((id) => EQUIPMENT_REGISTRY[id].slot === slot).map(
        (id) => EQUIPMENT_REGISTRY[id].tier,
      );
      expect(tiers.filter((tier) => tier === 2), slot).toHaveLength(2);
      expect(tiers.filter((tier) => tier === 3), slot).toHaveLength(1);
    }
  });

  it("combines perks into one set of numbers", () => {
    expect(resolveEquipmentPerks([])).toEqual(NO_EQUIPMENT_PERKS);
    const effects = resolveEquipmentPerks(["wing-drones", "efficient-capacitor", "cryo-coolant", "ignition-core"]);
    expect(effects.escortDrones).toBe(2);
    expect(effects.escortInterval).toBe(6);
    expect(effects.skillCostMultiplier).toBeCloseTo(0.85);
    expect(effects.cooldownRate).toBeCloseTo(1.18);
    expect(effects.startingRage).toBe(25);
  });

  it("reads the perks of equipped parts only", () => {
    let state = createStarterEquipmentState();
    expect(equippedPerkIds(state)).toEqual([]);
    state = addEquipmentInstance(state, {
      instanceId: "qa-escort",
      definitionId: "escort-drone-mk2",
      grade: "silver",
      enhancement: 0,
      affixes: [],
    });
    expect(equippedPerkIds(state)).toEqual([]);
    state = equipInstance(state, "qa-escort");
    expect(equippedPerkIds(state)).toEqual(["escort-drone"]);
  });

  it("keeps Mk.III parts out of ordinary shops and prices perk parts higher", () => {
    const hidden = createHiddenDiscoveryState();
    for (let stage = 11; stage <= 400; stage += 7) {
      const context: ShopRollContext = { stage, worldKey: "world-" + String(stage), luck: 0, progression: 0, hiddenDiscovery: hidden };
      const { instance } = resolveShopInstance(createShopState(), "normal", context);
      for (const entry of instance.stock) {
        if (entry.kind !== "equipment") continue;
        expect(EQUIPMENT_REGISTRY[entry.definitionId].tier).toBeLessThan(3);
      }
    }
  });
});

describe("equipment perks in combat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Ablative Plating absorbs the first hit of the stage only", () => {
    const { game, runtime } = perkGame(["ablative-plating"]);
    const hull = runtime.stats.hull;
    const shield = runtime.stats.shield;
    game.testLabDamagePlayer(30);
    expect(runtime.stats.hull).toBe(hull);
    expect(runtime.stats.shield).toBe(shield);
    game.testLabDamagePlayer(30);
    expect(runtime.stats.hull + runtime.stats.shield).toBeLessThan(hull + shield);
    game.destroy();
  });

  it("Wreck Siphon restores Energy on each kill", () => {
    const energyAfterKill = (perks: EquipmentPerkId[]): number => {
      const { game, runtime } = perkGame(perks);
      game.testLabSetResources({ energy: 10 });
      const [id] = game.testLabSpawnEnemies({ kind: "scout", count: 1, layers: 1 });
      game.testLabForceWordComplete(id!);
      const energy = runtime.stats.energy;
      game.destroy();
      return energy;
    };
    expect(energyAfterKill(["kill-siphon"]) - energyAfterKill([])).toBeCloseTo(3);
  });

  it("an Escort Drone snipes a letter off the closest enemy", () => {
    const { game, runtime } = perkGame(["escort-drone"]);
    const [id] = game.testLabSpawnEnemies({ kind: "scout", count: 1, layers: 1 });
    const enemy = runtime.enemies.find((item) => item.id === id)!;
    enemy.speed = 0;
    expect(enemy.typed).toBe(0);
    game.testLabAdvanceSimulation(2.2);
    expect(enemy.typed).toBe(1);
    game.destroy();
  });

  it("Low-Loss Capacitor lowers every skill's Energy cost", () => {
    const { game } = perkGame(["efficient-capacitor"]);
    game.setSupportSpells(["sanctuary", "railgun"]);
    expect(game.getSkillDefinition("sanctuary")?.energyCost).toBe(Math.round(44 * 0.85));
    expect(game.getSkillDefinition("railgun")?.energyCost).toBe(Math.round(36 * 0.85));
    game.destroy();
  });

  it("Hot Start begins the stage with Rage", () => {
    const { game } = perkGame(["ignition-core"]);
    expect(game.getTestLabSnapshot()?.stats.power).toBeGreaterThanOrEqual(25);
    game.destroy();
  });
});
