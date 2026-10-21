import { describe, expect, it, vi } from "vitest";
import { difficultyFor } from "../src/campaign/difficulty";
import { createDifficultySettings, difficultyInputFromSettings } from "../src/campaign/difficulty-settings";
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
  commitStageClear,
  settleStageClear,
  StageClearLedger,
  type StageClearCommitSteps,
  type StageClearRecord,
  type StageClearSettlement,
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

function objectiveOf(status: "complete" | "failed"): StageClearRecord["objective"] {
  return { status, definition: { rewardFactor: 0.2 } } as unknown as StageClearRecord["objective"];
}

function difficultyAt(stage: number, mode: "typing" | "voice" | "hybrid") {
  return difficultyFor(difficultyInputFromSettings(createDifficultySettings(), stage, 2, mode));
}

/**
 * Clears worked out by the inline onStageClear code that settleStageClear
 * replaced (src/main.ts before 2026-10-21), kept as fixed results.
 */
describe("stage-clear settlement matches the inline code it replaced", () => {
  const sector = (tier: number, stage: number) => `${WARP_POLICY.version}:sector:${tier}:${stage}`;
  const fields = (settlement: StageClearSettlement) => ({
    message: settlement.message,
    credits: settlement.state.run.credits,
    reward: settlement.credits,
    currencies: settlement.state.run.expansionCurrencies,
    relic: settlement.relic,
    milestoneKey: settlement.milestoneKey,
    checkpoint: settlement.state.campaignExpansion.checkpoint.stage,
    restHub: settlement.state.run.shops.pendingRestHub ?? null,
    booster: settlement.state.cosmetics.booster?.clearsLeft ?? null,
    codex: settlement.state.codex.rewards,
    xp: settlement.progressAward.xpGained,
    snapshotCredits: settlement.checkpointSnapshot?.credits ?? null,
    selectedStage: settlement.state.run.campaign.selectedStage,
  });

  it("a first clear with perfect typing", () => {
    expect(fields(settleStageClear(accountAt(1, 1234), clearOf(1, { accuracy: 100, wpm: 90 })))).toEqual({
      message: "✓ Saved · Stage 001 cleared · +30 Credits · +1 Alloy · Achievement: Launch Confirmed, Precision Pilot",
      credits: 1264, reward: 30, currencies: { alloy: 1, starCrystal: 0, quantumCore: 0 },
      relic: null, milestoneKey: null, checkpoint: 1, restHub: null, booster: null, codex: [],
      xp: 137, snapshotCredits: null, selectedStage: 2,
    });
  });

  it("a sector checkpoint with a difficulty profile and a completed objective", () => {
    const clear = clearOf(10, {
      accuracy: 97, wpm: 55, difficulty: difficultyAt(10, "typing"), objective: objectiveOf("complete"),
      salvage: 3, combatCreditsGranted: 4, creditsMultiplier: 1.1,
    });
    expect(fields(settleStageClear(accountAt(10, 0), clear))).toEqual({
      message: "✓ Saved · Stage 010 cleared · +150 Credits · +10 Alloy · +1 Star Crystal · Objective +20% · " +
        "Performance: Objective · Achievement: Launch Confirmed · Checkpoint 011 committed · Sector +98 Credits · Relic: First Light Seed",
      credits: 150, reward: 150, currencies: { alloy: 10, starCrystal: 1, quantumCore: 0 },
      relic: "first-light-seed", milestoneKey: sector(0, 10), checkpoint: 11, restHub: 10, booster: null,
      codex: ["performance-objective", "sector-cache"], xp: 128, snapshotCredits: 150, selectedStage: 11,
    });
  });

  it("a voice clear with a failed objective and the Credit Booster", () => {
    const account = accountAt(20, 300);
    account.cosmetics = { ...account.cosmetics, booster: { id: "booster-credits", bonus: 0.5, clearsLeft: 3 } };
    const clear = clearOf(20, {
      accuracy: 80, wpm: 20, inputMode: "voice", voiceWords: 12, correctWordKeys: 0,
      difficulty: difficultyAt(20, "voice"), objective: objectiveOf("failed"),
    });
    expect(fields(settleStageClear(account, clear))).toEqual({
      message: "✓ Saved · Stage 020 cleared · +163 Credits · +11 Alloy · +2 Star Crystal · Objective failed · " +
        "Achievement: Launch Confirmed · Checkpoint 021 committed · Sector +106 Credits · Relic: First Light Seed",
      credits: 463, reward: 163, currencies: { alloy: 11, starCrystal: 2, quantumCore: 0 },
      relic: "first-light-seed", milestoneKey: sector(0, 20), checkpoint: 21, restHub: 20, booster: 2,
      codex: ["sector-cache"], xp: 110, snapshotCredits: 463, selectedStage: 21,
    });
  });

  it("an Ascension 1 sector checkpoint", () => {
    const account = accountAt(10, 50);
    account.run.ascension = {
      ...account.run.ascension, highestUnlockedTier: 1, selectedTier: 1,
      frontierByTier: { ...account.run.ascension.frontierByTier, "1": 10 },
    };
    const clear = clearOf(10, { accuracy: 97, wpm: 55, inputMode: "hybrid", voiceWords: 12, difficulty: difficultyAt(10, "hybrid") });
    const settlement = settleStageClear(account, clear);
    expect(fields(settlement)).toEqual({
      message: "✓ Saved · Stage 010 cleared · +133 Credits · +9 Alloy · +1 Star Crystal · Achievement: Launch Confirmed · " +
        "Ascension A1 checkpoint 010 committed · Sector +98 Credits · Relic: First Light Seed",
      credits: 183, reward: 133, currencies: { alloy: 9, starCrystal: 1, quantumCore: 0 },
      relic: "first-light-seed", milestoneKey: sector(1, 10), checkpoint: 1, restHub: null, booster: null,
      codex: ["sector-cache"], xp: 128, snapshotCredits: 183, selectedStage: 11,
    });
    expect(settlement.state.run.ascension.frontierByTier).toEqual({ "1": 11 });
  });

  it("a sector whose reward the account already had", () => {
    const account = accountAt(100, 9000);
    account.milestoneGrants = [sector(0, 100)];
    const clear = clearOf(100, { difficulty: difficultyAt(100, "typing"), combatCreditsGranted: 5, creditsMultiplier: 1.1 });
    expect(fields(settleStageClear(account, clear))).toEqual({
      message: "✓ Saved · Stage 100 cleared · Aegis unlocked · +106 Credits · +10 Alloy · +4 Star Crystal · +1 Quantum Core · " +
        "Achievement: Launch Confirmed, Galaxy One, Centurion · Checkpoint 101 committed",
      credits: 9106, reward: 106, currencies: { alloy: 10, starCrystal: 4, quantumCore: 1 },
      relic: null, milestoneKey: null, checkpoint: 101, restHub: null, booster: null, codex: [],
      xp: 152, snapshotCredits: null, selectedStage: 101,
    });
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

describe("committing a stage clear", () => {
  /** The game's side of one clear (src/main.ts settleCampaignStageClear); `log` records what ran, in order. */
  function steps(ledger: StageClearLedger, overrides: Partial<StageClearCommitSteps> = {}) {
    const log: string[] = [];
    const notices: string[] = [];
    const commitSteps: StageClearCommitSteps = {
      settle: () => settleStageClear(accountAt(10, 0), clearOf(10)),
      apply: () => {
        log.push("apply" + (ledger.isSettled("attempt-1") ? " (already settled)" : ""));
      },
      save: async () => {
        log.push("save" + (ledger.isSettled("attempt-1") ? "" : " (not settled)"));
        return true;
      },
      openRestHub: () => {
        log.push("rest hub");
      },
      afterSave: () => {
        log.push("after save");
      },
      notice: (text) => {
        notices.push(text);
      },
      ...overrides,
    };
    return { commitSteps, log, notices };
  }

  it("counts the encounter as settled only once the clear is applied, then saves and opens the Rest Hub", async () => {
    const ledger = new StageClearLedger();
    const { commitSteps, log, notices } = steps(ledger);

    const settlement = await commitStageClear(ledger, "attempt-1", commitSteps);

    expect(settlement?.milestoneKey).toBe(`${WARP_POLICY.version}:sector:0:10`);
    expect(log).toEqual(["apply", "save", "rest hub", "after save"]);
    expect(ledger.isSettled("attempt-1")).toBe(true);
    expect(notices).toEqual([]);
  });

  it("a save that is not kept opens no Rest Hub, and the clear stays settled for its commit", async () => {
    const ledger = new StageClearLedger();
    const { commitSteps, log } = steps(ledger, { save: async () => false });

    await commitStageClear(ledger, "attempt-1", commitSteps);

    expect(log).toEqual(["apply", "after save"]);
    expect(ledger.isSettled("attempt-1")).toBe(true);
  });

  it("runs the after-save steps even when the save throws", async () => {
    const ledger = new StageClearLedger();
    const { commitSteps, log } = steps(ledger, { save: () => Promise.reject(new Error("QuotaExceededError")) });

    await expect(commitStageClear(ledger, "attempt-1", commitSteps)).rejects.toThrow("QuotaExceededError");
    expect(log).toEqual(["apply", "after save"]);
  });

  it("a settlement that throws changes nothing; its retry while leaving applies it without opening the Rest Hub", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const ledger = new StageClearLedger();
    let attempts = 0;
    const { commitSteps, log, notices } = steps(ledger, {
      settle: () => {
        attempts += 1;
        if (attempts === 1) throw new Error("settlement failed");
        return settleStageClear(accountAt(10, 0), clearOf(10));
      },
    });

    await expect(commitStageClear(ledger, "attempt-1", commitSteps)).resolves.toBeNull();
    expect(log).toEqual([]);
    expect(ledger.isSettled("attempt-1")).toBe(false);
    expect(notices).toEqual(["Stage rewards are not settled yet · retrying when you leave this screen"]);

    await expect(ledger.retry("attempt-1")).resolves.toBe(true);
    expect(log).toEqual(["apply", "save", "after save"]);
    expect(notices).toHaveLength(1);
    error.mockRestore();
  });

  it("a retry that throws again stays unsettled and owed, without a second 'retrying' notice", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const ledger = new StageClearLedger();
    const settle = vi.fn((): StageClearSettlement => {
      throw new Error("settlement failed");
    });
    const { commitSteps, log, notices } = steps(ledger, { settle });

    await commitStageClear(ledger, "attempt-1", commitSteps);
    await expect(ledger.retry("attempt-1")).resolves.toBe(false);
    await expect(ledger.retry("attempt-1")).resolves.toBe(false);

    expect(settle).toHaveBeenCalledTimes(3);
    expect(log).toEqual([]);
    expect(notices).toEqual(["Stage rewards are not settled yet · retrying when you leave this screen"]);
    error.mockRestore();
  });
});
