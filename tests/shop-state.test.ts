import { describe, expect, it } from "vitest";
import { createDefaultCampaignProgress } from "../src/campaign/progress";
import { createCampaignExpansionState } from "../src/campaign/expansion-state";
import { createHiddenDiscoveryState } from "../src/discovery/hidden-content";
import { createStarterEquipmentState } from "../src/equipment/loadout";
import { createExpansionCurrencyState } from "../src/economy/currencies";
import {
  createCheckpointSnapshot,
  restoreCheckpointSnapshot,
  type RunPersistentState,
} from "../src/persistence/checkpoint";
import {
  captureCrashRecoverySnapshot,
  resolveCrashRecovery,
} from "../src/persistence/crash-recovery";
import {
  createStageEntrySnapshot,
  resolveStageRevivalCore,
} from "../src/persistence/death-protection";
import { createStarterSupportSpellState } from "../src/skills/support-loadout";
import { createStarterCharacterState } from "../src/characters/state";
import { createLuckPityState } from "../src/loot/pity";
import { createProgressionState } from "../src/progression/missions";
import {
  buyShopStockEntry,
  createShopState,
  resolveShopInstance,
  shopAvailable,
  shopInstanceId,
  type ShopRollContext,
} from "../src/shops/state";

function hiddenState() {
  const state = createHiddenDiscoveryState();
  state.discovered = ["black-market-signal", "echo-rift"];
  return state;
}

function context(
  stage = 220,
  worldKey = "world-11",
  luck = 25,
  progression = 120,
): ShopRollContext {
  return {
    stage,
    worldKey,
    luck,
    progression,
    hiddenDiscovery: hiddenState(),
  };
}

function runState(): RunPersistentState {
  return {
    campaign: createDefaultCampaignProgress(),
    inventory: {},
    equipment: createStarterEquipmentState(),
    supportSpells: createStarterSupportSpellState(),
    characters: createStarterCharacterState(),
    luckPity: createLuckPityState(),
    hiddenDiscovery: hiddenState(),
    credits: 0,
    progression: createProgressionState(),
    expansionCurrencies: createExpansionCurrencyState(),
    shops: createShopState(),
  };
}

describe("M06 deterministic finite-stock shops", () => {
  it("uses a stable sector instance id and deterministic inventory roll", () => {
    const input = context();
    const first = resolveShopInstance(createShopState(), "normal", input);
    const second = resolveShopInstance(createShopState(), "normal", input);

    expect(first.instance.id).toBe(second.instance.id);
    expect(first.instance.seed).toBe(second.instance.seed);
    expect(first.instance.stock).toEqual(second.instance.stock);
    expect(first.created).toBe(true);
    expect(second.created).toBe(true);

    expect(
      shopInstanceId("normal", { stage: 229, worldKey: "world-11" }),
    ).toBe(
      shopInstanceId("normal", { stage: 221, worldKey: "world-11" }),
    );
  });

  it("reuses persisted stock instead of rerolling when Luck/progression change", () => {
    const initial = resolveShopInstance(
      createShopState(),
      "black-market",
      context(521, "world-26", 5, 300),
    );
    const reopened = resolveShopInstance(
      initial.state,
      "black-market",
      context(529, "world-26", 100, 999),
    );

    expect(reopened.created).toBe(false);
    expect(reopened.instance.seed).toBe(initial.instance.seed);
    expect(reopened.instance.stock).toEqual(initial.instance.stock);
  });

  it("decrements finite stock and refuses a second purchase when sold out", () => {
    const resolved = resolveShopInstance(
      createShopState(),
      "normal",
      context(),
    );
    const equipmentOffer = resolved.instance.stock.find(
      (entry) => entry.kind === "equipment",
    );
    expect(equipmentOffer?.kind).toBe("equipment");
    if (equipmentOffer?.kind !== "equipment") return;

    const first = buyShopStockEntry(
      {
        credits: 99999,
        expansionCurrencies: {
          alloy: 999,
          starCrystal: 999,
          quantumCore: 999,
        },
        inventory: {},
        equipment: createStarterEquipmentState(),
        shops: resolved.state,
      },
      resolved.instance.id,
      equipmentOffer.key,
      "m06-equipment-1",
    );

    expect(first.purchased).toBe(true);
    expect(
      first.state.shops.instances[resolved.instance.id]?.stock.find(
        (entry) => entry.key === equipmentOffer.key,
      )?.remaining,
    ).toBe(0);

    const second = buyShopStockEntry(
      first.state,
      resolved.instance.id,
      equipmentOffer.key,
      "m06-equipment-2",
    );
    expect(second.purchased).toBe(false);
    expect(second.reason).toBe("sold-out");
    expect(
      second.state.equipment.items.some(
        (item) => item.instanceId === "m06-equipment-2",
      ),
    ).toBe(false);
  });

  it("uses shop-specific multi-currency pricing atomically", () => {
    const resolved = resolveShopInstance(
      createShopState(),
      "hidden",
      context(820, "world-41", 30, 600),
    );
    const offer = resolved.instance.stock.find(
      (entry) =>
        entry.kind === "equipment" &&
        (entry.price.starCrystal > 0 ||
          entry.price.quantumCore > 0),
    );
    expect(offer?.kind).toBe("equipment");
    if (offer?.kind !== "equipment") return;

    const paid = buyShopStockEntry(
      {
        credits: offer.price.credits,
        expansionCurrencies: {
          alloy: offer.price.alloy,
          starCrystal: offer.price.starCrystal,
          quantumCore: offer.price.quantumCore,
        },
        inventory: {},
        equipment: createStarterEquipmentState(),
        shops: resolved.state,
      },
      resolved.instance.id,
      offer.key,
      "hidden-purchase-1",
    );

    expect(paid.purchased).toBe(true);
    expect(paid.state.credits).toBe(0);
    expect(paid.state.expansionCurrencies).toEqual({
      alloy: 0,
      starCrystal: 0,
      quantumCore: 0,
    });

    const unaffordable = buyShopStockEntry(
      {
        credits: 0,
        expansionCurrencies: createExpansionCurrencyState(),
        inventory: {},
        equipment: createStarterEquipmentState(),
        shops: resolved.state,
      },
      resolved.instance.id,
      offer.key,
      "hidden-purchase-2",
    );
    expect(unaffordable.purchased).toBe(false);
    expect(unaffordable.reason).toBe("currency");
    expect(unaffordable.state.credits).toBe(0);
  });

  it("keeps traveling availability deterministic for the same context", () => {
    const input = context(330, "world-17", 40, 200);
    expect(shopAvailable("traveling", input)).toBe(
      shopAvailable("traveling", input),
    );
    expect(shopAvailable("black-market", input)).toBe(true);
    expect(shopAvailable("hidden", input)).toBe(true);
    expect(shopAvailable("event", input)).toBe(true);
  });

  it("keeps resurrection stock finite and restricted to eligible merchant types", () => {
    const protectedIds = new Set([
      "salvage-anchor",
      "stage-revival-core",
      "phoenix-core",
    ]);

    const normal = resolveShopInstance(
      createShopState(),
      "normal",
      context(900, "world-45", 100, 800),
    ).instance;
    expect(
      normal.stock.some(
        (entry) => entry.kind === "item" && protectedIds.has(entry.itemId),
      ),
    ).toBe(false);

    let found = false;
    for (let index = 1; index <= 250 && !found; index += 1) {
      const instance = resolveShopInstance(
        createShopState(),
        "hidden",
        context(900, "world-" + String(index), 100, index),
      ).instance;
      const resurrection = instance.stock.filter(
        (entry) => entry.kind === "item" && protectedIds.has(entry.itemId),
      );
      if (resurrection.length > 0) {
        found = true;
        expect(
          resurrection.every((entry) => entry.remaining === 1),
        ).toBe(true);
      }
    }

    expect(found).toBe(true);
  });

  it("restores persisted shop stock from the last safe crash snapshot", () => {
    const safe = runState();
    safe.credits = 99999;
    const rolled = resolveShopInstance(
      safe.shops,
      "normal",
      context(1, "world-01", 0, 0),
    );
    safe.shops = rolled.state;

    const offer = rolled.instance.stock.find(
      (entry) => entry.kind === "equipment",
    );
    expect(offer?.kind).toBe("equipment");
    if (offer?.kind !== "equipment") return;

    const checkpoint = createCheckpointSnapshot(safe, 1);
    const expansion = createCampaignExpansionState(
      safe.campaign,
      "2026-09-22T11:45:00.000Z",
    );
    const captured = captureCrashRecoverySnapshot(
      safe,
      expansion,
      checkpoint,
      "shop",
      "2026-09-22T11:46:00.000Z",
    );

    const purchase = buyShopStockEntry(
      {
        credits: safe.credits,
        expansionCurrencies: safe.expansionCurrencies,
        inventory: safe.inventory,
        equipment: safe.equipment,
        shops: safe.shops,
      },
      rolled.instance.id,
      offer.key,
      "crash-stock-test",
    );
    expect(purchase.purchased).toBe(true);

    const unsafe: RunPersistentState = {
      ...safe,
      credits: purchase.state.credits,
      expansionCurrencies: purchase.state.expansionCurrencies,
      inventory: purchase.state.inventory,
      equipment: purchase.state.equipment,
      shops: purchase.state.shops,
    };

    const recovered = resolveCrashRecovery(
      unsafe,
      captured.campaignExpansion,
      checkpoint,
      captured.snapshot,
      "2026-09-22T11:47:00.000Z",
    );

    expect(recovered.mode).toBe("crash");
    expect(
      recovered.state.shops.instances[rolled.instance.id]?.stock.find(
        (entry) => entry.key === offer.key,
      )?.remaining,
    ).toBe(1);
    expect(
      recovered.state.equipment.items.some(
        (item) => item.instanceId === "crash-stock-test",
      ),
    ).toBe(false);
  });

  it("restores stage-entry shop stock when Stage Revival Core is used", () => {
    const entry = runState();
    entry.credits = 99999;
    entry.inventory = { "stage-revival-core": 1 };
    const rolled = resolveShopInstance(
      entry.shops,
      "normal",
      context(1, "world-01", 0, 0),
    );
    entry.shops = rolled.state;

    const offer = rolled.instance.stock.find(
      (candidate) => candidate.kind === "equipment",
    );
    expect(offer?.kind).toBe("equipment");
    if (offer?.kind !== "equipment") return;

    const expansion = createCampaignExpansionState(
      entry.campaign,
      "2026-09-22T11:48:00.000Z",
    );
    const checkpoint = createCheckpointSnapshot(entry, 1);
    const stageEntry = createStageEntrySnapshot(
      entry,
      expansion,
      checkpoint,
      "2026-09-22T11:49:00.000Z",
    );

    const purchase = buyShopStockEntry(
      {
        credits: entry.credits,
        expansionCurrencies: entry.expansionCurrencies,
        inventory: entry.inventory,
        equipment: entry.equipment,
        shops: entry.shops,
      },
      rolled.instance.id,
      offer.key,
      "revival-stock-test",
    );
    expect(purchase.purchased).toBe(true);

    const active: RunPersistentState = {
      ...entry,
      credits: purchase.state.credits,
      expansionCurrencies: purchase.state.expansionCurrencies,
      inventory: purchase.state.inventory,
      equipment: purchase.state.equipment,
      shops: purchase.state.shops,
    };

    const revived = resolveStageRevivalCore(active, stageEntry);
    expect(revived?.applied).toBe(true);
    expect(
      revived?.state.shops.instances[rolled.instance.id]?.stock.find(
        (candidate) => candidate.key === offer.key,
      )?.remaining,
    ).toBe(1);
    expect(
      revived?.state.equipment.items.some(
        (item) => item.instanceId === "revival-stock-test",
      ),
    ).toBe(false);
    expect(revived?.state.inventory["stage-revival-core"] ?? 0).toBe(0);
  });

  it("rolls purchased stock back to the committed checkpoint", () => {
    const committed = runState();
    const contextInput = context(1, "world-01", 0, 0);
    const rolled = resolveShopInstance(
      committed.shops,
      "normal",
      contextInput,
    );
    committed.shops = rolled.state;
    committed.credits = 99999;

    const checkpoint = createCheckpointSnapshot(committed, 1);
    const offer = rolled.instance.stock.find(
      (entry) => entry.kind === "equipment",
    );
    expect(offer?.kind).toBe("equipment");
    if (offer?.kind !== "equipment") return;

    const purchase = buyShopStockEntry(
      {
        credits: committed.credits,
        expansionCurrencies: committed.expansionCurrencies,
        inventory: committed.inventory,
        equipment: committed.equipment,
        shops: committed.shops,
      },
      rolled.instance.id,
      offer.key,
      "rollback-test-equipment",
    );
    expect(purchase.purchased).toBe(true);

    const active: RunPersistentState = {
      ...committed,
      credits: purchase.state.credits,
      expansionCurrencies: purchase.state.expansionCurrencies,
      inventory: purchase.state.inventory,
      equipment: purchase.state.equipment,
      shops: purchase.state.shops,
    };
    const restored = restoreCheckpointSnapshot(checkpoint, active);

    expect(
      restored.shops.instances[rolled.instance.id]?.stock.find(
        (entry) => entry.key === offer.key,
      )?.remaining,
    ).toBe(1);
    expect(
      restored.equipment.items.some(
        (item) => item.instanceId === "rollback-test-equipment",
      ),
    ).toBe(false);
  });
});
