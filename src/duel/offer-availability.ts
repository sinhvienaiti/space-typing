import { DUEL_INVENTORY_CAPACITY, duelInventoryBucketFor, type DuelActionDefinition } from "./model";
import type { DuelCombatInventorySnapshot } from "./inventory";

/** Live Duel: activate on completion, retaining existing costs and effects. */
export function autoActivateDuelAction(action: DuelActionDefinition): DuelActionDefinition {
  return action.resolveMode === "banked" ? { ...action, resolveMode: "instant", capacityPolicy: "none" } : action;
}

export function duelAutoActionBlock(action: DuelActionDefinition | undefined, energy: number, cooldown = 0): string | null {
  if (!action) return null;
  if (cooldown > 0) return `HỒI CHIÊU ${cooldown.toFixed(1)}s`;
  if (energy < action.energyCost) return `CẦN ${action.energyCost} NĂNG LƯỢNG`;
  return null;
}

/** Shared UI/prediction rule; authority still validates its own inventory. */
export function duelFullBank(action: DuelActionDefinition | undefined, inventory: DuelCombatInventorySnapshot) {
  if (action?.resolveMode !== "banked") return null;
  const bucket = duelInventoryBucketFor(action);
  if (bucket === null || inventory[bucket].length < DUEL_INVENTORY_CAPACITY[bucket]) return null;
  return { bucket, count: inventory[bucket].length, capacity: DUEL_INVENTORY_CAPACITY[bucket] };
}

export function duelFullBankLabel(bank: NonNullable<ReturnType<typeof duelFullBank>>): string {
  const name = { attack: "TẤN CÔNG", defense: "PHÒNG THỦ", tactical: "CHIẾN THUẬT" }[bank.bucket];
  return `KHO ${name} ĐẦY ${bank.count}/${bank.capacity}`;
}
