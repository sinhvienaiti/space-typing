import {
  addEquipmentInstance,
  type EquipmentState,
} from "../equipment/loadout";
import {
  EQUIPMENT_IDS,
  getEquipmentDefinition,
  type EquipmentId,
} from "../equipment/registry";
import type { GradeId } from "../grades";
import {
  addItem,
  type Inventory,
} from "../items/inventory";
import {
  getItemDefinition,
  type ItemId,
} from "../items/registry";
import type { RecoveryItemId } from "../items/consumables";
import {
  sanitizeCredits,
  spendCredits,
} from "../economy/credits";

export type NormalShopItemOffer = {
  key: string;
  kind: "item";
  itemId: RecoveryItemId;
  price: number;
};

export type NormalShopEquipmentOffer = {
  key: string;
  kind: "equipment";
  definitionId: EquipmentId;
  grade: GradeId;
  price: number;
};

export type NormalShopOffer =
  | NormalShopItemOffer
  | NormalShopEquipmentOffer;

export type NormalShopState = {
  credits: number;
  inventory: Inventory;
  equipment: EquipmentState;
};

export type NormalShopPurchase = {
  state: NormalShopState;
  purchased: boolean;
  reason: "credits" | "full" | "duplicate" | null;
};

const ITEM_OFFERS: readonly NormalShopItemOffer[] = [
  { key: "item-repair-kit", kind: "item", itemId: "repair-kit", price: 48 },
  { key: "item-shield-cell", kind: "item", itemId: "shield-cell", price: 38 },
  { key: "item-energy-cell", kind: "item", itemId: "energy-cell", price: 38 },
];

function equipmentPrice(grade: GradeId): number {
  return rarity === "rare" ? 240 : 145;
}

export function normalShopOffers(stage: number): NormalShopOffer[] {
  const safeStage = Math.max(1, Math.min(1000, Math.floor(stage)));
  const start = (safeStage * 3) % EQUIPMENT_IDS.length;
  const equipmentOffers: NormalShopEquipmentOffer[] = [];

  for (let offset = 0; offset < 3; offset += 1) {
    const definitionId =
      EQUIPMENT_IDS[(start + offset * 2) % EQUIPMENT_IDS.length] ??
      EQUIPMENT_IDS[0];
    const grade: GradeId =
      safeStage >= 100 && offset === 2 ? "rare" : "common";
    equipmentOffers.push({
      key: "equipment-" + definitionId + "-" + grade,
      kind: "equipment",
      definitionId,
      grade,
      price: equipmentPrice(grade),
    });
  }

  return [...ITEM_OFFERS, ...equipmentOffers];
}

export function normalShopOfferName(offer: NormalShopOffer): string {
  if (offer.kind === "item") {
    return getItemDefinition(offer.itemId).name;
  }
  return getEquipmentDefinition(offer.definitionId).name;
}

export function buyNormalShopOffer(
  current: NormalShopState,
  offer: NormalShopOffer,
  instanceId = "",
): NormalShopPurchase {
  const credits = sanitizeCredits(current.credits);
  if (credits < offer.price) {
    return {
      state: { ...current, credits },
      purchased: false,
      reason: "credits",
    };
  }

  if (offer.kind === "item") {
    const change = addItem(current.inventory, offer.itemId, 1);
    if (change.changed <= 0) {
      return {
        state: { ...current, credits },
        purchased: false,
        reason: "full",
      };
    }

    const payment = spendCredits(credits, offer.price);
    return {
      state: {
        credits: payment.credits,
        inventory: change.inventory,
        equipment: current.equipment,
      },
      purchased: true,
      reason: null,
    };
  }

  if (
    instanceId.length === 0 ||
    current.equipment.items.some((item) => item.instanceId === instanceId)
  ) {
    return {
      state: { ...current, credits },
      purchased: false,
      reason: "duplicate",
    };
  }

  const equipment = addEquipmentInstance(current.equipment, {
    instanceId,
    definitionId: offer.definitionId,
    grade: offer.grade,
    enhancement: 0,
  });
  const payment = spendCredits(credits, offer.price);

  return {
    state: {
      credits: payment.credits,
      inventory: current.inventory,
      equipment,
    },
    purchased: true,
    reason: null,
  };
}

export function normalShopItemIsFull(
  inventory: Inventory,
  itemId: ItemId,
): boolean {
  const count = inventory[itemId] ?? 0;
  return count >= getItemDefinition(itemId).maxStack;
}
