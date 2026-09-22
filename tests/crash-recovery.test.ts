import { describe, expect, it } from "vitest";
import type { CampaignProgress } from "../src/campaign/types";
import { createCampaignExpansionState } from "../src/campaign/expansion-state";
import { createStarterEquipmentState } from "../src/equipment/loadout";
import { createStarterSupportSpellState } from "../src/skills/support-loadout";
import { createStarterCharacterState } from "../src/characters/state";
import { createLuckPityState } from "../src/loot/pity";
import { createHiddenDiscoveryState } from "../src/discovery/hidden-content";
import { createProgressionState } from "../src/progression/missions";
import { createExpansionCurrencyState } from "../src/economy/currencies";
import { createShopState } from "../src/shops/state";
import {
  createRouteState,
  routeChoicesForStage,
  selectRouteNode,
  selectedRouteNode,
} from "../src/campaign/route";
import {
  completeHiddenChallengeEncounter,
  createHiddenChallengeOffer,
  createHiddenChallengeState,
  registerHiddenChallengeOffer,
  startHiddenChallenge,
} from "../src/campaign/hidden-challenge";
import {
  createCheckpointSnapshot,
  type RunPersistentState,
} from "../src/persistence/checkpoint";
import {
  captureCrashRecoverySnapshot,
  invalidateCrashRecoverySnapshot,
  isValidCrashRecoverySnapshot,
  resolveCrashRecovery,
} from "../src/persistence/crash-recovery";
import {
  choosePreferredPlayerSave,
  createPlayerSave,
  resolvePlayerSaveRecovery,
} from "../src/persistence/player-save";

function progressAt(stage: number): CampaignProgress {
  return {
    version: 1,
    highestUnlockedStage: stage,
    selectedStage: stage,
    clearedStages: Array.from(
      { length: Math.max(0, stage - 1) },
      (_, index) => index + 1,
    ),
    bestByStage: {},
  };
}

function stateAt(stage: number): RunPersistentState {
  return {
    campaign: progressAt(stage),
    inventory: {},
    equipment: createStarterEquipmentState(),
    supportSpells: createStarterSupportSpellState(),
    characters: createStarterCharacterState(),
    luckPity: createLuckPityState(),
    hiddenDiscovery: createHiddenDiscoveryState(),
    credits: 0,
    progression: createProgressionState(),
    expansionCurrencies: createExpansionCurrencyState(),
    shops: createShopState(),
    route: createRouteState(stage),
    challenge: createHiddenChallengeState(),
  };
}

describe("M03 crash recovery", () => {
  it("restores the last safe transition instead of newer unsafe state", () => {
    const safeState = stateAt(190);
    safeState.credits = 500;
    safeState.inventory = { "repair-kit": 2 };

    const expansion = createCampaignExpansionState(
      safeState.campaign,
      "2026-09-22T09:00:00.000Z",
    );
    const checkpointState = stateAt(181);
    checkpointState.credits = 100;
    const checkpoint = createCheckpointSnapshot(
      checkpointState,
      181,
    );
    const captured = captureCrashRecoverySnapshot(
      safeState,
      expansion,
      checkpoint,
      "stage-entry",
      "2026-09-22T09:01:00.000Z",
    );

    const unsafeState = stateAt(190);
    unsafeState.credits = 999;
    unsafeState.inventory = { "repair-kit": 7 };

    const resolved = resolveCrashRecovery(
      unsafeState,
      captured.campaignExpansion,
      checkpoint,
      captured.snapshot,
      "2026-09-22T09:02:00.000Z",
    );

    expect(resolved.mode).toBe("crash");
    expect(resolved.state.campaign.selectedStage).toBe(190);
    expect(resolved.state.credits).toBe(500);
    expect(resolved.state.inventory).toEqual({ "repair-kit": 2 });
    expect(resolved.campaignExpansion.crashRecovery).toMatchObject({
      stage: 190,
      reason: "stage-entry",
      deathInvalidated: false,
    });
  });

  it("restores the persisted route choice from the last safe route transition", () => {
    const safeState = stateAt(189);
    const routeChoice = routeChoicesForStage(
      safeState.route,
      189,
    )[0]!;
    safeState.route = selectRouteNode(
      safeState.route,
      189,
      routeChoice.id,
    );

    const expansion = createCampaignExpansionState(
      safeState.campaign,
      "2026-09-22T09:00:00.000Z",
    );
    const checkpoint = createCheckpointSnapshot(
      stateAt(181),
      181,
    );
    const captured = captureCrashRecoverySnapshot(
      safeState,
      expansion,
      checkpoint,
      "route-choice",
      "2026-09-22T09:00:30.000Z",
    );

    const unsafeState = stateAt(189);
    const resolved = resolveCrashRecovery(
      unsafeState,
      captured.campaignExpansion,
      checkpoint,
      captured.snapshot,
      "2026-09-22T09:00:40.000Z",
    );

    expect(resolved.mode).toBe("crash");
    expect(
      selectedRouteNode(resolved.state.route, 189)?.id,
    ).toBe(routeChoice.id);
  });

  it("restores an active hidden challenge from the last safe transition", () => {
    const safeState = stateAt(190);
    const offer = {
      ...createHiddenChallengeOffer(
        190,
        "route-190-hidden-signal",
      ),
      encounterCount: 2,
    };
    safeState.challenge = startHiddenChallenge(
      registerHiddenChallengeOffer(
        safeState.challenge,
        offer,
      ),
      offer.id,
      "III",
    );

    const expansion = createCampaignExpansionState(
      safeState.campaign,
      "2026-09-22T11:00:00.000Z",
    );
    const checkpoint = createCheckpointSnapshot(
      stateAt(181),
      181,
    );
    const captured = captureCrashRecoverySnapshot(
      safeState,
      expansion,
      checkpoint,
      "hidden-transition",
      "2026-09-22T11:01:00.000Z",
    );

    const unsafe = stateAt(190);
    unsafe.challenge = completeHiddenChallengeEncounter(
      safeState.challenge,
    );

    const resolved = resolveCrashRecovery(
      unsafe,
      captured.campaignExpansion,
      checkpoint,
      captured.snapshot,
      "2026-09-22T11:02:00.000Z",
    );

    expect(resolved.mode).toBe("crash");
    expect(resolved.state.challenge.active).toEqual({
      offerId: offer.id,
      tier: "III",
      encounterIndex: 0,
    });
  });

  it("invalidates recovery on real death and restores the committed checkpoint", () => {
    const committedState = stateAt(181);
    committedState.credits = 120;
    committedState.inventory = { "repair-kit": 1 };
    const checkpoint = createCheckpointSnapshot(
      committedState,
      181,
    );

    const active = stateAt(190);
    active.credits = 950;
    active.inventory = {
      "repair-kit": 5,
      "nova-bomb": 1,
    };
    const failedOffer = createHiddenChallengeOffer(
      190,
      "route-190-death-hidden-signal",
    );
    active.challenge = startHiddenChallenge(
      registerHiddenChallengeOffer(
        active.challenge,
        failedOffer,
      ),
      failedOffer.id,
      "II",
    );
    active.campaign.bestByStage["189"] = {
      score: 9000,
      accuracy: 100,
      wpm: 88,
      clearedAt: "2026-09-22T09:03:00.000Z",
    };

    const expansion = createCampaignExpansionState(
      active.campaign,
      "2026-09-22T09:00:00.000Z",
    );
    const captured = captureCrashRecoverySnapshot(
      active,
      expansion,
      checkpoint,
      "stage-entry",
      "2026-09-22T09:01:00.000Z",
    );
    const invalidated = invalidateCrashRecoverySnapshot(
      captured.snapshot,
      active,
      captured.campaignExpansion,
      checkpoint,
      "2026-09-22T09:04:00.000Z",
    );

    expect(invalidated.snapshot.deathInvalidated).toBe(true);
    expect(
      invalidated.campaignExpansion.crashRecovery?.deathInvalidated,
    ).toBe(true);

    const resolved = resolveCrashRecovery(
      active,
      invalidated.campaignExpansion,
      checkpoint,
      invalidated.snapshot,
      "2026-09-22T09:05:00.000Z",
    );

    expect(resolved.mode).toBe("death-rollback");
    expect(resolved.state.campaign.highestUnlockedStage).toBe(181);
    expect(resolved.state.campaign.selectedStage).toBe(181);
    expect(resolved.state.credits).toBe(120);
    expect(resolved.state.inventory).toEqual({ "repair-kit": 1 });
    expect(resolved.state.challenge).toEqual(
      committedState.challenge,
    );
    expect(resolved.state.campaign.bestByStage["189"]?.score).toBe(9000);
    expect(
      resolved.campaignExpansion.crashRecovery?.deathInvalidated,
    ).toBe(true);
  });

  it("prevents reload from preferring a stale pre-death active save", () => {
    const committedState = stateAt(181);
    committedState.credits = 80;
    const checkpoint = createCheckpointSnapshot(
      committedState,
      181,
    );

    const active = stateAt(190);
    active.credits = 900;
    const expansion = createCampaignExpansionState(active.campaign);
    const captured = captureCrashRecoverySnapshot(
      active,
      expansion,
      checkpoint,
      "stage-entry",
      "2026-09-22T09:08:00.000Z",
    );
    const staleIndexed = createPlayerSave(
      active.campaign,
      "2026-09-22T09:08:00.000Z",
      "stage-entry",
      active.inventory,
      active.equipment,
      active.supportSpells,
      active.characters,
      active.luckPity,
      active.hiddenDiscovery,
      active.credits,
      active.progression,
      active.expansionCurrencies,
      captured.campaignExpansion,
      checkpoint,
      captured.snapshot,
    );

    const invalidated = invalidateCrashRecoverySnapshot(
      captured.snapshot,
      active,
      captured.campaignExpansion,
      checkpoint,
      "2026-09-22T09:09:00.000Z",
    );
    const deathMirror = createPlayerSave(
      active.campaign,
      "2026-09-22T09:09:00.000Z",
      "gameover",
      active.inventory,
      active.equipment,
      active.supportSpells,
      active.characters,
      active.luckPity,
      active.hiddenDiscovery,
      active.credits,
      active.progression,
      active.expansionCurrencies,
      invalidated.campaignExpansion,
      checkpoint,
      invalidated.snapshot,
    );

    expect(
      choosePreferredPlayerSave(staleIndexed, deathMirror),
    ).toBe(deathMirror);

    const resolved = resolvePlayerSaveRecovery(
      deathMirror,
      "2026-09-22T09:10:00.000Z",
    );
    expect(resolved.recoveryMode).toBe("death-rollback");
    expect(resolved.save.campaign.selectedStage).toBe(181);
    expect(resolved.save.credits).toBe(80);
    expect(
      resolved.save.crashRecoverySnapshot?.deathInvalidated,
    ).toBe(true);
  });

  it("rejects malformed recovery snapshots instead of trusting them", () => {
    const active = stateAt(20);
    const expansion = createCampaignExpansionState(active.campaign);
    const checkpoint = createCheckpointSnapshot(active, 11);
    const captured = captureCrashRecoverySnapshot(
      active,
      expansion,
      checkpoint,
      "pagehide",
      "2026-09-22T09:06:00.000Z",
    );

    expect(isValidCrashRecoverySnapshot(captured.snapshot)).toBe(true);

    const corrupted = {
      ...captured.snapshot,
      deathInvalidated: false,
      campaignExpansion: {
        ...captured.snapshot.campaignExpansion,
        crashRecovery: {
          ...captured.snapshot.campaignExpansion.crashRecovery,
          stage: 999,
        },
      },
    };

    expect(isValidCrashRecoverySnapshot(corrupted)).toBe(false);
    expect(
      resolveCrashRecovery(
        active,
        expansion,
        checkpoint,
        corrupted as never,
        "2026-09-22T09:07:00.000Z",
      ).mode,
    ).toBe("none");
  });
});
