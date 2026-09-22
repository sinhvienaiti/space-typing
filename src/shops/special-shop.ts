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
import type { HiddenDiscoveryState } from "../discovery/hidden-content";
import {
  sanitizeCredits,
  spendCredits,
} from "../economy/credits";

export type SpecialShopKind = "black-market" | "event-shop";

export type SpecialShopItemOffer = {
  key: string;
  kind: "item";
  itemId: ItemId;
  price: number;
};

export type SpecialShopEquipmentOffer = {
  key: string;
  kind: "equipment";
  definitionId: EquipmentId;
  grade: GradeId;
  price: number;
};

export type SpecialShopOffer =
  | SpecialShopItemOffer
  | SpecialShopEquipmentOffer;

export type SpecialShopState = {
  credits: number;
  inventory: Inventory;
  equipment: EquipmentState;
};

export type SpecialShopPurchase = {
  state: SpecialShopState;
  purchased: boolean;
  reason: "credits" | "full" | "duplicate" | null;
};

const EVENT_ITEMS: readonly ItemId[] = [
  "nova-bomb",
  "emp-charge",
  "time-crystal",
  "word-bomb",
  "supply-beacon",
  "lucky-dice",
];

export function specialShopUnlocked(
  kind: SpecialShopKind,
  hiddenDiscovery: HiddenDiscoveryState,
): boolean {
  const required =
    kind === "black-market" ? "black-market-signal" : "echo-rift";
  return hiddenDiscovery.discovered.includes(required);
}

function blackMarketGrade(
  stage: number,
  offset: number,
): GradeId {
  if (stage >= 800 && offset === 2) return "diamond";
  if (stage >= 500 && offset === 2) return "gold";
  if (stage >= 180 && offset >= 1) return "silver";
  return "copper";
}

function equipmentPrice(grade: GradeId): number {
  if (rarity === "legendary") return 1450;
  if (rarity === "epic") return 720;
  return 390;
}

export function specialShopOffers(
  kind: SpecialShopKind,
  stage: number,
): SpecialShopOffer[] {
  const safeStage = Math.max(1, Math.min(1000, Math.floor(stage)));

  if (kind === "event-shop") {
    const start = safeStage % EVENT_ITEMS.length;
    return Array.from({ length: 4 }, (_, offset) => {
      const itemId =
        EVENT_ITEMS[(start + offset) % EVENT_ITEMS.length] ??
        "nova-bomb";
      return {
        key: "event-" + itemId,
        kind: "item" as const,
        itemId,
        price:
          itemId === "time-crystal" || itemId === "lucky-dice"
            ? 125
            : 92,
      };
    });
  }

  const start = (safeStage * 5) % EQUIPMENT_IDS.length;
  return Array.from({ length: 3 }, (_, offset) => {
    const definitionId =
      EQUIPMENT_IDS[(start + offset * 3) % EQUIPMENT_IDS.length] ??
      EQUIPMENT_IDS[0];
    const grade = blackMarketGrade(safeStage, offset);
    return {
      key: "black-" + definitionId + "-" + grade,
      kind: "equipment" as const,
      definitionId,
      grade,
      price: equipmentPrice(grade),
    };
  });
}

export function specialShopOfferName(
  offer: SpecialShopOffer,
): string {
  return offer.kind === "item"
    ? getItemDefinition(offer.itemId).name
    : getEquipmentDefinition(offer.definitionId).name;
}

export function buySpecialShopOffer(
  current: SpecialShopState,
  offer: SpecialShopOffer,
  instanceId = "",
): SpecialShopPurchase {
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
