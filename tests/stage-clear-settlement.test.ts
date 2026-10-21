import { describe, expect, it, vi } from "vitest";
import { createDifficultySettings } from "../src/campaign/difficulty-settings";
import { createCampaignExpansionState } from "../src/campaign/expansion-state";
import { createRouteState } from "../src/campaign/route";
import type { CampaignProgress } from "../src/campaign/types";
import { createStarterCharacterState } from "../src/characters/state";
import { createCodexState } from "../src/codex/state";
import { createCosmeticsState } from "../src/cosmetics/state";
import { stageClearCreditReward } from "../src/economy/credits";
import { createExpansionCurrencyState } from "../src/economy/currencies";
import { WARP_POLICY } from "../src/economy/warp-charge";
import { createStarterEquipmentState } from "../src/equipment/loadout";
import { createHiddenDiscoveryState } from "../src/discovery/hidden-content";
import { createLuckPityState } from "../src/loot/pity";
import type { RunPersistentState } from "../src/persistence/checkpoint";
import { createAscensionState } from "../src/progression/ascension";
import { createProgressionState } from "../src/progression/missions";
import { createUpgradeState } from "../src/progression/upgrades";
import { RELIC_IDS } from "../src/relics/registry";
import { awardRelicReward, createRelicState, MAX_EQUIPPED_RELICS } from "../src/relics/state";
import { sectorCheckpointReward } from "../src/rewards/campaign-rewards";
import { settleCombatCreditStageBase } from "../src/rewards/combat-credit-drops";
import {
  settleStageClear,
  StageClearLedger,
  type StageClearRecord,
  type StageClearState,
} from "../src/rewards/stage-clear-settlement";
import { createShopState } from "../src/shops/state";
import { createStarterSupportSpellState } from "../src/skills/support-loadout";

const CLEARED_AT = "2026-10-21T08:00:00.000Z";

function progressAt(stage: number): CampaignProgress {
  return {
    version: 1,
    highestUnlockedStage: stage,
    selectedStage: stage,
    clearedStages: Array.from({ length: stage - 1 }, (_, index) => index + 1),
    bestByStage: {},
  };
}

function accountAt(stage: number, credits = 500): StageClearState {
  const campaign = progressAt(stage);
  const run: RunPersistentState = {
    campaign,
    inventory: {},
    equipment: createStarterEquipmentState(),
    supportSpells: createStarterSupportSpellState(),
    characters: createStarterCharacterState(),
    luckPity: createLuckPityState(),
    hiddenDiscovery: createHiddenDiscoveryState(),
    credits,
    progression: createProgressionState(),
    upgrades: createUpgradeState(),
    expansionCurrencies: createExpansionCurrencyState(),
    shops: createShopState(),
    route: createRouteState(campaign.highestUnlockedStage),
    relics: createRelicState(),
    ascension: createAscensionState(campaign),
  };
  return {
    run,
    cosmetics: createCosmeticsState(),
    codex: createCodexState(),
    campaignExpansion: createCampaignExpansionState(campaign, CLEARED_AT),
    difficultySettings: createDifficultySettings(),
    milestoneGrants: [],
  };
}

function clearOf(stage: number, overrides: Partial<StageClearRecord> = {}): StageClearRecord {
  return {
    stats: { stage, score: 4200, misses: 2, maxStreak: 18 },
    accuracy: 96,
    wpm: 48,
    elapsedSeconds: 75,
    correctWordKeys: 240,
    inputMode: "typing",
    voiceWords: 0,
    voicePolicy: "test",
    gameplayMode: "combat",
    vocabularyLevel: 1,
    objective: null,
    difficulty: null,
    salvage: 0,
    combatCreditsGranted: 0,
    creditsMultiplier: 1,
    clearedAt: CLEARED_AT,
    ...overrides,
  };
}

/** Base Credits of a clear with no difficulty profile (no performance or objective bonus). */
function baseCredits(clear: StageClearRecord): number {
  return settleCombatCreditStageBase({
    stageBaseCredits: stageClearCreditReward({
      stage: clear.stats.stage,
      accuracy: clear.accuracy,
      salvage: clear.salvage,
    }),
    combatCreditsGranted: clear.combatCreditsGranted,
    creditsMultiplier: clear.creditsMultiplier,
  }).settlementCredits;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

describe("stage-clear settlement", () => {
  it("works out a clear without changing the state it was given", () => {
    const account = accountAt(5);
    const before = structuredClone(account);
    const clear = clearOf(5);

    const settlement = settleStageClear(deepFreeze(account), deepFreeze(clear));

    expect(account).toEqual(before);
    const { run } = settlement.state;
    expect(run.campaign.clearedStages).toContain(5);
    expect(run.campaign.highestUnlockedStage).toBe(6);
    expect(run.route).not.toBe(account.run.route);
    expect(run.progression.counters.stageClears).toBe(1);
    expect(run.characters.progress[settlement.characterId].xp).toBe(settlement.progressAward.progress.xp);
    expect(settlement.progressAward.xpGained).toBeGreaterThan(0);
    expect(settlement.state.difficultySettings).not.toBe(account.difficultySettings);
    expect(run.inventory).toBe(account.run.inventory);
    expect(run.equipment).toBe(account.run.equipment);
  });

  it("adds the clear's Credits to the balance and names them in the saved notice", () => {
    const clear = clearOf(5, { combatCreditsGranted: 6 });
    const settlement = settleStageClear(accountAt(5, 500), clear);

    expect(settlement.credits).toBe(baseCredits(clear));
    expect(settlement.state.run.credits).toBe(500 + settlement.credits);
    expect(settlement.message).toMatch(
      new RegExp("^✓ Saved · Stage 005 cleared · \\+" + settlement.credits.toLocaleString() + " Credits"),
    );
    expect(settlement.checkpointSnapshot).toBeNull();
    expect(settlement.milestoneKey).toBeNull();
    expect(settlement.relic).toBeNull();
  });

  it("adds the Credit Booster bonus and uses one of its clears", () => {
    const account = accountAt(5, 0);
    account.cosmetics = {
      ...account.cosmetics,
      booster: { id: "booster-credits", bonus: 0.5, clearsLeft: 2 },
    };
    const clear = clearOf(5);
    const base = baseCredits(clear);

    const settlement = settleStageClear(account, clear);

    expect(settlement.credits).toBe(base + Math.floor(base * 0.5));
    expect(settlement.state.run.credits).toBe(settlement.credits);
    expect(settlement.state.cosmetics.booster?.clearsLeft).toBe(1);
  });

  it("reports a failed objective", () => {
    const settlement = settleStageClear(
      accountAt(5),
      clearOf(5, { objective: { status: "failed" } as StageClearRecord["objective"] }),
    );

    expect(settlement.objectiveText).toBe(" · Objective failed");
    expect(settlement.message).toContain(" · Objective failed");
  });

  it("commits a sector checkpoint with its reward, relic, rest hub and checkpoint loadout", () => {
    const account = accountAt(10, 0);
    const clear = clearOf(10);
    const sector = sectorCheckpointReward(10);
    const relic = awardRelicReward(account.run.relics, 10, "sector:10").id;

    const settlement = settleStageClear(account, clear);

    expect(settlement.milestoneKey).toBe(`${WARP_POLICY.version}:sector:0:10`);
    expect(settlement.credits).toBe(baseCredits(clear) + sector.credits);
    expect(settlement.state.run.credits).toBe(settlement.credits);
    expect(settlement.state.campaignExpansion.checkpoint.stage).toBe(11);
    expect(settlement.state.run.shops.pendingRestHub).toBe(10);
    expect(settlement.state.codex.rewards).toContain("sector-cache");
    expect(settlement.relic).toBe(relic);
    if (relic !== null) expect(settlement.state.run.relics.owned).toContain(relic);
    expect(settlement.checkpointSnapshot?.campaign.highestUnlockedStage).toBe(11);
    expect(settlement.checkpointSnapshot?.credits).toBe(settlement.credits);
    expect(settlement.checkpointText).toContain(" · Checkpoint 011 committed · Sector +");
  });

  it("gives a sector reward only once per account", () => {
    const account = accountAt(10, 0);
    account.milestoneGrants = [`${WARP_POLICY.version}:sector:0:10`];
    const clear = clearOf(10);

    const settlement = settleStageClear(account, clear);

    expect(settlement.state.campaignExpansion.checkpoint.stage).toBe(11);
    expect(settlement.milestoneKey).toBeNull();
    expect(settlement.relic).toBeNull();
    expect(settlement.checkpointSnapshot).toBeNull();
    expect(settlement.credits).toBe(baseCredits(clear));
    expect(settlement.state.run.shops.pendingRestHub ?? null).toBeNull();
    expect(settlement.checkpointText).toBe(" · Checkpoint 011 committed");
  });
});

describe("stage-clear ledger", () => {
  it("leaves an encounter open until its clear is settled", () => {
    const ledger = new StageClearLedger();

    expect(ledger.isSettled("attempt-1")).toBe(false);
    ledger.settle("attempt-1");
    expect(ledger.isSettled("attempt-1")).toBe(true);
    expect(ledger.isSettled("attempt-2")).toBe(false);
  });

  it("retries a settlement that threw, for the same encounter", async () => {
    const ledger = new StageClearLedger();
    const retry = vi.fn(async () => ledger.settle("attempt-1"));
    ledger.defer("attempt-1", retry);

    await expect(ledger.retry("attempt-1")).resolves.toBe(true);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(ledger.isSettled("attempt-1")).toBe(true);
    await expect(ledger.retry("attempt-1")).resolves.toBe(true);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("keeps a retry that fails again open for the next attempt to leave", async () => {
    const ledger = new StageClearLedger();
    const retry = vi.fn(async () => ledger.defer("attempt-1", retry));
    ledger.defer("attempt-1", retry);

    await expect(ledger.retry("attempt-1")).resolves.toBe(false);
    await expect(ledger.retry("attempt-1")).resolves.toBe(false);
    expect(retry).toHaveBeenCalledTimes(2);
  });

  it("never replays an older encounter's settlement into a later one", async () => {
    const ledger = new StageClearLedger();
    const stale = vi.fn(async () => undefined);
    ledger.defer("attempt-1", stale);

    await expect(ledger.retry("attempt-2")).resolves.toBe(false);
    await expect(ledger.retry("attempt-1")).resolves.toBe(false);
    expect(stale).not.toHaveBeenCalled();
  });
});

describe("awardRelicReward", () => {
  it("grants a reward relic and equips it while a slot is free", () => {
    const award = awardRelicReward(createRelicState(), 1000, "sector:1000");

    expect(award.id).not.toBeNull();
    expect(award.state.owned).toEqual([award.id]);
    expect(award.state.equipped).toEqual([award.id]);
  });

  it("only grants once every slot is taken, and gives nothing when none is left", () => {
    let state = createRelicState();
    for (let index = 0; index < MAX_EQUIPPED_RELICS; index += 1) {
      state = awardRelicReward(state, 1000, "sector:" + String(index)).state;
    }
    const award = awardRelicReward(state, 1000, "sector:next");
    expect(award.state.owned).toHaveLength(MAX_EQUIPPED_RELICS + 1);
    expect(award.state.equipped).toHaveLength(MAX_EQUIPPED_RELICS);

    const full = { ...state, owned: [...RELIC_IDS] };
    expect(awardRelicReward(full, 1000, "sector:none")).toEqual({ state: full, id: null });
  });
});
