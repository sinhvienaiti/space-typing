import {
  duelActionDefinitionForMap,
  duelActionMapForMap,
  duelActionsForMap,
} from "../duel/map-actions";
import {
  DuelBot,
  duelBotObservation,
  type DuelBotPersonality,
} from "../duel/bots";
import { DuelOfferDraft } from "../duel/draft";
import {
  DuelEngine,
  type DuelEngineEvent,
  type DuelTickEffect,
} from "../duel/engine";
import type {
  DuelCataclysmEvent,
  DuelHazardEvent,
} from "../duel/director";
import {
  DUEL_MAPS,
  type DuelMapId,
} from "../duel/maps";
import type {
  DuelActionCategory,
  DuelActionOffer,
  DuelMatchPhase,
  DuelPlayerId,
} from "../duel/model";
import {
  DUEL_COMBO_RECIPES,
  type DuelComboId,
} from "../duel/strategy";
import {
  assessDuelPerformance,
  type DuelPerformanceDiagnostics,
} from "../duel/performance";

type DuelLabBotConfig = {
  wpm: number;
  accuracy: number;
  reactionMs: number;
  personality: DuelBotPersonality;
};

export type DuelLabVisualQa = {
  performance(): DuelPerformanceDiagnostics | null;
  resetPerformance(): void;
  startStress?(
    phase: "crisis" | "cataclysm",
    mapId: DuelMapId,
  ): void;
};

type DuelLabOptions = {
  showNotice?(message: string): void;
  visualQa?: DuelLabVisualQa;
};

export type DuelTestLabController = {
  destroy(): void;
};

const CATEGORIES = [
  "attack",
  "defense",
  "support",
  "tactical",
  "fate",
  "mystery",
] as const satisfies readonly DuelActionCategory[];

const PHASE_TARGET_SECONDS: Readonly<
  Record<DuelMatchPhase, number>
> = {
  build: 0,
  skirmish: 61,
  war: 121,
  crisis: 193,
  cataclysm: 241,
};

const BOT_PERSONALITIES: readonly DuelBotPersonality[] = [
  "balanced",
  "aggro",
  "turtle",
  "tactician",
  "trickster",
  "fortune",
  "sniper",
];

const HAZARD_PRESETS: ReadonlyArray<{
  id: DuelHazardEvent["hazardId"];
  label: string;
  mapId: DuelMapId;
}> = [
  {
    id: "fire-tornado",
    label: "Trigger Tornado",
    mapId: "inferno-rift",
  },
  {
    id: "lightning-storm",
    label: "Trigger Lightning",
    mapId: "tempest-prime",
  },
  {
    id: "frozen-meteor",
    label: "Trigger Meteor",
    mapId: "frost-wastes",
  },
  {
    id: "black-hole",
    label: "Trigger Black Hole",
    mapId: "celestial-void",
  },
];

function option(
  value: string,
  label = value,
): HTMLOptionElement {
  const node = document.createElement("option");
  node.value = value;
  node.textContent = label;
  return node;
}

function inputValue(
  root: ParentNode,
  selector: string,
  fallback: string,
): string {
  return (
    root.querySelector<HTMLInputElement | HTMLSelectElement>(
      selector,
    )?.value ?? fallback
  );
}

function numberValue(
  root: ParentNode,
  selector: string,
  fallback: number,
): number {
  const value = Number(
    root.querySelector<HTMLInputElement | HTMLSelectElement>(
      selector,
    )?.value,
  );
  return Number.isFinite(value) ? value : fallback;
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function phaseRank(phase: DuelMatchPhase): number {
  return ["build", "skirmish", "war", "crisis", "cataclysm"].indexOf(
    phase,
  );
}

function mapLabel(id: DuelMapId): string {
  return DUEL_MAPS[id].displayName;
}

class DuelTestLabRuntime {
  private engine!: DuelEngine;
  private bot!: DuelBot;
  private drafts!: Record<DuelPlayerId, DuelOfferDraft>;
  private humanSequence = 0;
  private manualOfferSequence = 0;
  private lastEvents: DuelEngineEvent[] = [];
  private mapId: DuelMapId = "frost-wastes";
  private seed = 20261001;
  private botConfig: DuelLabBotConfig = {
    wpm: 60,
    accuracy: 0.95,
    reactionMs: 260,
    personality: "balanced",
  };

  constructor() {
    this.restart();
  }

  configure(input: {
    mapId?: DuelMapId;
    seed?: number;
    bot?: Partial<DuelLabBotConfig>;
  }): void {
    if (input.mapId !== undefined) {
      this.mapId = input.mapId;
    }
    if (input.seed !== undefined) {
      this.seed = Math.max(1, Math.floor(input.seed)) >>> 0;
    }
    if (input.bot !== undefined) {
      this.botConfig = {
        wpm: clamp(
          input.bot.wpm ?? this.botConfig.wpm,
          10,
          300,
        ),
        accuracy: clamp(
          input.bot.accuracy ?? this.botConfig.accuracy,
          0.5,
          1,
        ),
        reactionMs: clamp(
          input.bot.reactionMs ?? this.botConfig.reactionMs,
          0,
          3000,
        ),
        personality:
          input.bot.personality ??
          this.botConfig.personality,
      };
    }
  }

  restart(): void {
    this.engine = new DuelEngine({
      typingCannon: true,
      autoActivateItems: true,
      regulationSeconds: 240,
      hardOvertimeSeconds: 45,
      maxHull: 100,
      maxShield: 40,
      maxEnergy: 100,
      startingShield: 20,
      startingEnergy: 60,
      matchSeed: this.seed,
      mapId: this.mapId,
      actions: duelActionMapForMap(this.mapId),
    });
    const multiplier =
      DUEL_MAPS[this.mapId].categoryMultiplier;
    this.drafts = {
      "player-1": new DuelOfferDraft({
        ensureEnergyOffer: true,
        seed: this.seed ^ 0x51a7,
        actions: duelActionsForMap(this.mapId),
        enabledCategories: CATEGORIES,
        categoryMultiplier: multiplier,
      }),
      "player-2": new DuelOfferDraft({
        ensureEnergyOffer: true,
        seed: this.seed ^ 0xb071,
        actions: duelActionsForMap(this.mapId),
        enabledCategories: CATEGORIES,
        categoryMultiplier: multiplier,
      }),
    };
    this.bot = this.createBot();
    this.humanSequence = 0;
    this.manualOfferSequence = 0;
    this.lastEvents = [];
    this.dealOffers();
  }

  snapshot(): unknown {
    return {
      mapId: this.mapId,
      seed: this.seed,
      botConfig: { ...this.botConfig },
      botMetrics: this.bot.metrics(),
      lastEvents: this.lastEvents,
      engine: this.engine.snapshot(),
    };
  }

  spawnCategory(category: DuelActionCategory): void {
    const action = duelActionsForMap(this.mapId).find(
      (candidate) => candidate.category === category,
    );
    if (action === undefined) return;
    this.placeManualOffer("player-1", action.id);
  }

  spawnAction(actionId: string): void {
    if (
      duelActionDefinitionForMap(this.mapId, actionId) ===
      undefined
    ) {
      return;
    }
    this.placeManualOffer("player-1", actionId);
  }

  forcePhase(phase: DuelMatchPhase): void {
    const current = this.engine.snapshot();
    const target = PHASE_TARGET_SECONDS[phase];

    if (
      phaseRank(current.phase) > phaseRank(phase) ||
      current.round.status !== "active"
    ) {
      this.restart();
    }

    let elapsed = this.engine.snapshot().elapsedSeconds;
    while (elapsed + 0.001 < target) {
      const dt = Math.min(1, target - elapsed);
      this.step(dt);
      elapsed = this.engine.snapshot().elapsedSeconds;
      if (this.engine.snapshot().round.status !== "active") {
        break;
      }
    }
  }

  triggerHazard(
    id: DuelHazardEvent["hazardId"],
    mapId: DuelMapId,
  ): void {
    const hazard: DuelHazardEvent = {
      sequence: 999,
      mapId,
      hazardId: id,
      phase: this.engine.phase(),
      pressure: 1.15,
      telegraphSeconds: 1.2,
      protectionSeconds: 2,
      symmetry: "symmetric",
    };
    this.lastEvents = this.engine.applyHazardEvent(hazard);
  }

  triggerCataclysm(): void {
    const map = DUEL_MAPS[this.mapId];
    const cataclysm: DuelCataclysmEvent = {
      sequence: 1000,
      mapId: this.mapId,
      cataclysmId: map.cataclysm.id,
      displayLabel: map.cataclysm.displayLabel,
      pressureMultiplier: map.cataclysm.pressureMultiplier,
    };
    this.lastEvents =
      this.engine.applyCataclysmEvent(cataclysm);
  }

  triggerFate(): void {
    this.lastEvents = this.engine.resolveFate("player-1");
  }

  spawnMystery(): void {
    this.lastEvents = this.engine.createMystery();
  }

  resolveFirstMystery(): void {
    const mystery =
      this.engine.snapshot().chance.mysteries.find(
        (entry) => !entry.resolved,
      );
    if (mystery === undefined) return;
    this.lastEvents = this.engine.resolveMystery(
      "player-1",
      mystery.id,
    );
  }

  setResources(
    playerId: DuelPlayerId,
    input: {
      hull: number;
      shield: number;
      energy: number;
    },
  ): void {
    const snapshot = this.engine.snapshot();
    const player = snapshot.players[playerId];
    const desiredHull = clamp(
      input.hull,
      1,
      player.maxHull,
    );
    const desiredShield = clamp(
      input.shield,
      0,
      player.maxShield,
    );
    const desiredEnergy = clamp(
      input.energy,
      0,
      player.maxEnergy,
    );
    const effects: DuelTickEffect[] = [];

    if (player.shield > 0) {
      effects.push({
        type: "damage",
        targetId: playerId,
        amount: player.shield,
      });
    }

    const hullAfterShield = player.hull;
    if (desiredHull < hullAfterShield) {
      effects.push({
        type: "damage",
        targetId: playerId,
        amount: hullAfterShield - desiredHull,
      });
    } else if (desiredHull > hullAfterShield) {
      effects.push({
        type: "repair",
        targetId: playerId,
        amount: desiredHull - hullAfterShield,
      });
    }

    if (desiredShield > 0) {
      effects.push({
        type: "shield",
        targetId: playerId,
        amount: desiredShield,
      });
    }

    if (desiredEnergy > player.energy) {
      effects.push({
        type: "energy",
        targetId: playerId,
        amount: desiredEnergy - player.energy,
      });
    } else if (desiredEnergy < player.energy) {
      effects.push({
        type: "energy-cost",
        targetId: playerId,
        amount: player.energy - desiredEnergy,
      });
    }

    this.lastEvents = this.engine.applyTickEffects(effects);
  }

  giveWeapon(): void {
    this.completeAction("missile");
  }

  giveTactical(): void {
    this.completeAction("disrupt");
  }

  giveDefense(): void {
    this.completeAction("shield");
  }

  forceCombo(comboId: DuelComboId): void {
    const recipe = DUEL_COMBO_RECIPES.find(
      (candidate) => candidate.id === comboId,
    );
    if (recipe === undefined) return;

    for (const ingredient of recipe.ingredients) {
      this.completeAction(ingredient);
      if (this.engine.snapshot().round.status !== "active") {
        return;
      }
    }

    this.humanSequence += 1;
    this.engine.enqueueIntent({
      type: "ACTIVATE_SKILL",
      playerId: "player-1",
      sequence: this.humanSequence,
      skillId: "combo:" + comboId,
    });
    this.lastEvents = this.engine.step(0);
    this.refillCompletedOffers();
  }

  runBot(seconds: number): void {
    const safe = clamp(seconds, 0.05, 90);
    let remaining = safe;
    while (
      remaining > 0 &&
      this.engine.snapshot().round.status === "active"
    ) {
      const dt = Math.min(0.05, remaining);
      this.step(dt);
      remaining -= dt;
    }
  }

  private createBot(): DuelBot {
    return new DuelBot({
      playerId: "player-2",
      wpm: this.botConfig.wpm,
      accuracy: this.botConfig.accuracy,
      reactionMs: this.botConfig.reactionMs,
      personality: this.botConfig.personality,
      seed: this.seed ^ 0xb07b07,
    });
  }

  private dealOffers(): void {
    const phase = this.engine.phase();
    this.engine.setPrivateOffers(
      "player-1",
      this.drafts["player-1"].dealPrivateOffers(
        "player-1",
        phase,
      ),
    );
    this.engine.setPrivateOffers(
      "player-2",
      this.drafts["player-2"].dealPrivateOffers(
        "player-2",
        phase,
      ),
    );
  }

  private step(dtSeconds: number): void {
    const snapshot = this.engine.snapshot();
    const intents = this.bot.update(
      dtSeconds,
      duelBotObservation({
        autoActivateItems: true,
        mapId: this.mapId,
        phase: snapshot.phase,
        self: {
          ...snapshot.players["player-2"],
          cooldowns:
            snapshot.cooldowns["player-2"],
          inventory:
            snapshot.inventories["player-2"],
          incomingThreats:
            snapshot.incomingThreats["player-2"],
          initiative:
            snapshot.strategy["player-2"].initiative,
          readyCombos:
            snapshot.strategy["player-2"].readyCombos,
          trapCount:
            snapshot.strategy["player-2"].traps.length,
        },
        neutralObjective: snapshot.neutralObjective,
        opponent: snapshot.players["player-1"],
      }),
    );
    for (const intent of intents) {
      this.engine.enqueueIntent(intent);
    }
    this.lastEvents = this.engine.step(dtSeconds);
    this.refillCompletedOffers();
  }

  private placeManualOffer(
    playerId: DuelPlayerId,
    actionId: string,
  ): DuelActionOffer {
    const snapshot = this.engine.snapshot();
    const current = snapshot.players[playerId].offers
      .filter((offer) => offer.status !== "completed")
      .map((offer) => ({ ...offer }));

    const slotIndex = current.length < 5
      ? current.length
      : 0;
    const next = current.filter(
      (offer) => offer.slotIndex !== slotIndex,
    );
    const offer: DuelActionOffer = {
      instanceId:
        "lab:" +
        playerId +
        ":" +
        actionId +
        ":" +
        String(++this.manualOfferSequence),
      actionId,
      ownerId: playerId,
      status: "available",
      typedPrefix: "",
      slotIndex,
      shared: false,
    };
    next.push(offer);
    next.sort(
      (left, right) => left.slotIndex - right.slotIndex,
    );
    this.engine.setPrivateOffers(playerId, next);
    return offer;
  }

  private completeAction(actionId: string): void {
    const action = duelActionDefinitionForMap(
      this.mapId,
      actionId,
    );
    if (action === undefined) return;

    const offer = this.placeManualOffer(
      "player-1",
      actionId,
    );
    this.humanSequence += 1;
    this.engine.enqueueIntent({
      type: "SELECT_TARGET",
      playerId: "player-1",
      sequence: this.humanSequence,
      targetInstanceId: offer.instanceId,
    });
    this.lastEvents = this.engine.step(0);

    for (const char of action.answerToken) {
      this.humanSequence += 1;
      this.engine.enqueueIntent({
        type: "TYPE_CHAR",
        playerId: "player-1",
        sequence: this.humanSequence,
        char,
        targetInstanceId: offer.instanceId,
      });
      this.lastEvents = this.engine.step(0);
    }
    this.refillCompletedOffers();
  }

  private refillCompletedOffers(): void {
    const snapshot = this.engine.snapshot();
    for (const playerId of [
      "player-1",
      "player-2",
    ] as const) {
      const offers = snapshot.players[playerId].offers.map(
        (offer) => ({ ...offer }),
      );
      let changed = false;

      for (let slotIndex = 0; slotIndex < 5; slotIndex += 1) {
        const existing = offers.find(
          (offer) => offer.slotIndex === slotIndex,
        );
        if (
          existing !== undefined &&
          (existing.status === "available" ||
            existing.status === "locked")
        ) {
          continue;
        }

        const refill =
          this.drafts[playerId].refillPrivateOffer(
            playerId,
            slotIndex,
            snapshot.phase,
            offers.filter(
              (offer) =>
                offer.slotIndex !== slotIndex &&
                (offer.status === "available" ||
                  offer.status === "locked"),
            ),
          );
        if (refill === null) continue;

        const index = offers.findIndex(
          (offer) => offer.slotIndex === slotIndex,
        );
        if (index >= 0) {
          offers[index] = refill;
        } else {
          offers.push(refill);
        }
        changed = true;
      }

      if (changed) {
        this.engine.setPrivateOffers(
          playerId,
          offers.filter(
            (offer) =>
              offer.status === "available" ||
              offer.status === "locked",
          ),
        );
      }
    }
  }
}

export function mountDuelTestLab(
  root: HTMLElement,
  options: DuelLabOptions = {},
): DuelTestLabController {
  const runtime = new DuelTestLabRuntime();

  root.innerHTML = `
    <p class="equipment-note">
      DuelEngine production logic in an isolated sandbox. No Campaign save,
      no PvE stat inheritance, no network authority bypass.
    </p>
    <div class="test-lab-grid">
      <label>Map<select data-duel-field="map"></select></label>
      <label>Seed<input data-duel-field="seed" type="number" min="1" value="20261001"></label>
      <label>Bot WPM<input data-duel-field="bot-wpm" type="number" min="10" max="300" value="60"></label>
      <label>Bot accuracy %<input data-duel-field="bot-accuracy" type="number" min="50" max="100" step="0.1" value="95"></label>
      <label>Bot reaction ms<input data-duel-field="bot-reaction" type="number" min="0" max="3000" value="260"></label>
      <label>Bot personality<select data-duel-field="bot-personality"></select></label>
      <label>P1 Hull<input data-duel-field="p1-hull" type="number" min="1" max="100" value="100"></label>
      <label>P1 Shield<input data-duel-field="p1-shield" type="number" min="0" max="40" value="20"></label>
      <label>P1 Energy<input data-duel-field="p1-energy" type="number" min="0" max="100" value="60"></label>
    </div>

    <div class="test-lab-row">
      <button type="button" data-duel-action="restart">Restart Duel Lab</button>
      <button type="button" data-duel-action="apply-bot">Apply Bot Config</button>
      <button type="button" data-duel-action="apply-resources">Set Player Resources</button>
      <button type="button" data-duel-action="run-bot-5">Run Bot 5s</button>
      <button type="button" data-duel-action="run-bot-30">Run Bot 30s</button>
    </div>

    <h4>Action words</h4>
    <div class="test-lab-row" data-duel-role="categories"></div>

    <h4>Escalation phase</h4>
    <div class="test-lab-row" data-duel-role="phases"></div>

    <h4>Map / Fate / Mystery</h4>
    <div class="test-lab-row" data-duel-role="hazards"></div>
    <div class="test-lab-row">
      <button type="button" data-duel-action="fate">Spawn Fate</button>
      <button type="button" data-duel-action="mystery">Spawn Mystery</button>
      <button type="button" data-duel-action="resolve-mystery">Resolve First Mystery</button>
      <button type="button" data-duel-action="cataclysm">Trigger Map Cataclysm</button>
    </div>

    <h4>Banking / strategy</h4>
    <div class="test-lab-row">
      <button type="button" data-duel-action="give-weapon">Give Weapon</button>
      <button type="button" data-duel-action="give-defense">Give Defense</button>
      <button type="button" data-duel-action="give-tactical">Give Tactical</button>
      <select data-duel-field="combo"></select>
      <button type="button" data-duel-action="force-combo">Force Combo</button>
    </div>

    <h4>Live battle performance</h4>
    <p class="equipment-note">
      Measures the real Duel battle renderer. High/Ultra quality is preserved;
      this gate never disables approved FX to make the result pass.
    </p>
    <div class="test-lab-row">
      <button type="button" data-duel-action="stress-crisis">Open Crisis Stress Scene</button>
      <button type="button" data-duel-action="stress-cataclysm">Open Cataclysm Stress Scene</button>
      <button type="button" data-duel-action="read-performance">Read Live Performance</button>
      <button type="button" data-duel-action="reset-performance">Reset Live Performance</button>
    </div>
    <pre class="test-lab-mini-inspector" data-duel-role="performance"></pre>

    <h4>Engine state</h4>
    <pre class="test-lab-mini-inspector" data-duel-role="inspector"></pre>
  `;

  const mapSelect =
    root.querySelector<HTMLSelectElement>(
      '[data-duel-field="map"]',
    )!;
  mapSelect.replaceChildren(
    ...Object.keys(DUEL_MAPS).map((id) =>
      option(id, mapLabel(id as DuelMapId)),
    ),
  );

  const personalitySelect =
    root.querySelector<HTMLSelectElement>(
      '[data-duel-field="bot-personality"]',
    )!;
  personalitySelect.replaceChildren(
    ...BOT_PERSONALITIES.map((id) => option(id)),
  );

  const comboSelect =
    root.querySelector<HTMLSelectElement>(
      '[data-duel-field="combo"]',
    )!;
  comboSelect.replaceChildren(
    ...DUEL_COMBO_RECIPES.map((recipe) =>
      option(
        recipe.id,
        recipe.id
          .replaceAll("-", " ")
          .toUpperCase(),
      ),
    ),
  );

  const categoryRoot =
    root.querySelector<HTMLElement>(
      '[data-duel-role="categories"]',
    )!;
  for (const category of CATEGORIES) {
    const control = document.createElement("button");
    control.type = "button";
    control.textContent =
      "Spawn " +
      category[0]!.toUpperCase() +
      category.slice(1) +
      " Word";
    control.addEventListener("click", () => {
      runtime.spawnCategory(category);
      render();
    });
    categoryRoot.append(control);
  }

  const phaseRoot =
    root.querySelector<HTMLElement>(
      '[data-duel-role="phases"]',
    )!;
  const phaseLabels: Readonly<
    Record<DuelMatchPhase, string>
  > = {
    build: "Force Phase 1 · Build",
    skirmish: "Force Phase 2 · Skirmish",
    war: "Force Phase 3 · War",
    crisis: "Force Crisis",
    cataclysm: "Force Cataclysm",
  };
  for (const phase of [
    "build",
    "skirmish",
    "war",
    "crisis",
    "cataclysm",
  ] as const) {
    const control = document.createElement("button");
    control.type = "button";
    control.textContent = phaseLabels[phase];
    control.addEventListener("click", () => {
      runtime.forcePhase(phase);
      render();
    });
    phaseRoot.append(control);
  }

  const hazardRoot =
    root.querySelector<HTMLElement>(
      '[data-duel-role="hazards"]',
    )!;
  for (const hazard of HAZARD_PRESETS) {
    const control = document.createElement("button");
    control.type = "button";
    control.textContent = hazard.label;
    control.addEventListener("click", () => {
      runtime.triggerHazard(
        hazard.id,
        hazard.mapId,
      );
      render();
    });
    hazardRoot.append(control);
  }

  const inspector =
    root.querySelector<HTMLElement>(
      '[data-duel-role="inspector"]',
    )!;
  const performanceOutput =
    root.querySelector<HTMLElement>(
      '[data-duel-role="performance"]',
    )!;

  const renderPerformance = (): void => {
    const diagnostics =
      options.visualQa?.performance() ?? null;
    if (diagnostics === null) {
      performanceOutput.textContent =
        "No live Duel battle performance sample yet. " +
        "Open a Practice/Stress scene first.";
      return;
    }
    const assessment =
      assessDuelPerformance(diagnostics);
    performanceOutput.textContent = JSON.stringify(
      {
        result: assessment.ready
          ? assessment.pass
            ? "PASS"
            : "FAIL"
          : "NOT READY",
        reasons: assessment.reasons,
        diagnostics,
      },
      null,
      2,
    );
  };

  const configure = (restart: boolean): void => {
    runtime.configure({
      mapId: mapSelect.value as DuelMapId,
      seed: numberValue(
        root,
        '[data-duel-field="seed"]',
        20261001,
      ),
      bot: {
        wpm: numberValue(
          root,
          '[data-duel-field="bot-wpm"]',
          60,
        ),
        accuracy:
          numberValue(
            root,
            '[data-duel-field="bot-accuracy"]',
            95,
          ) / 100,
        reactionMs: numberValue(
          root,
          '[data-duel-field="bot-reaction"]',
          260,
        ),
        personality: inputValue(
          root,
          '[data-duel-field="bot-personality"]',
          "balanced",
        ) as DuelBotPersonality,
      },
    });
    if (restart) runtime.restart();
  };

  const render = (): void => {
    inspector.textContent = JSON.stringify(
      runtime.snapshot(),
      null,
      2,
    );
  };

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const action = target.dataset.duelAction;
    if (action === undefined) return;

    if (action === "restart") {
      configure(true);
    } else if (action === "apply-bot") {
      configure(false);
      options.showNotice?.("Duel Bot config applied.");
    } else if (action === "apply-resources") {
      runtime.setResources("player-1", {
        hull: numberValue(
          root,
          '[data-duel-field="p1-hull"]',
          100,
        ),
        shield: numberValue(
          root,
          '[data-duel-field="p1-shield"]',
          20,
        ),
        energy: numberValue(
          root,
          '[data-duel-field="p1-energy"]',
          60,
        ),
      });
    } else if (action === "run-bot-5") {
      runtime.runBot(5);
    } else if (action === "run-bot-30") {
      runtime.runBot(30);
    } else if (action === "fate") {
      runtime.triggerFate();
    } else if (action === "mystery") {
      runtime.spawnMystery();
    } else if (action === "resolve-mystery") {
      runtime.resolveFirstMystery();
    } else if (action === "cataclysm") {
      runtime.triggerCataclysm();
    } else if (action === "give-weapon") {
      runtime.giveWeapon();
    } else if (action === "give-defense") {
      runtime.giveDefense();
    } else if (action === "give-tactical") {
      runtime.giveTactical();
    } else if (action === "force-combo") {
      runtime.forceCombo(
        inputValue(
          root,
          '[data-duel-field="combo"]',
          "homing-barrage",
        ) as DuelComboId,
      );
    } else if (action === "stress-crisis") {
      options.visualQa?.startStress?.(
        "crisis",
        mapSelect.value as DuelMapId,
      );
    } else if (action === "stress-cataclysm") {
      options.visualQa?.startStress?.(
        "cataclysm",
        mapSelect.value as DuelMapId,
      );
    } else if (action === "read-performance") {
      renderPerformance();
    } else if (action === "reset-performance") {
      options.visualQa?.resetPerformance();
      renderPerformance();
      options.showNotice?.(
        "Duel live performance samples reset.",
      );
    }

    render();
  });

  render();
  renderPerformance();

  return {
    destroy(): void {
      root.replaceChildren();
    },
  };
}
