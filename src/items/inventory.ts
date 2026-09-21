import {
  getItemDefinition,
  isItemId,
  type ItemId,
} from "./registry";

export type Inventory = Partial<Record<ItemId, number>>;

export type InventoryChange = {
  inventory: Inventory;
  changed: number;
};

export function createEmptyInventory(): Inventory {
  return {};
}

export function itemCount(
  inventory: Inventory,
  id: ItemId,
): number {
  return inventory[id] ?? 0;
}

export function inventoryTotal(inventory: Inventory): number {
  return Object.values(inventory).reduce(
    (total, value) => total + (value ?? 0),
    0,
  );
}

export function sanitizeInventory(value: unknown): Inventory {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: Inventory = {};

  for (const [rawId, rawCount] of Object.entries(value)) {
    if (!isItemId(rawId) || typeof rawCount !== "number") continue;

    const definition = getItemDefinition(rawId);
    const count = Math.min(
      definition.maxStack,
      Math.max(0, Math.floor(rawCount)),
    );

    if (Number.isFinite(count) && count > 0) {
      result[rawId] = count;
    }
  }

  return result;
}

export function isValidInventory(value: unknown): value is Inventory {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  for (const [rawId, rawCount] of Object.entries(value)) {
    if (!isItemId(rawId)) return false;
    if (
      typeof rawCount !== "number" ||
      !Number.isInteger(rawCount) ||
      rawCount < 0 ||
      rawCount > getItemDefinition(rawId).maxStack
    ) {
      return false;
    }
  }

  return true;
}

export function addItem(
  inventory: Inventory,
  id: ItemId,
  amount = 1,
): InventoryChange {
  const requested = Math.max(0, Math.floor(amount));
  const current = itemCount(inventory, id);
  const maxStack = getItemDefinition(id).maxStack;
  const next = Math.min(maxStack, current + requested);
  const changed = next - current;

  if (changed <= 0) {
    return { inventory: { ...inventory }, changed: 0 };
  }

  return {
    inventory: {
      ...inventory,
      [id]: next,
    },
    changed,
  };
}

export function removeItem(
  inventory: Inventory,
  id: ItemId,
  amount = 1,
): InventoryChange {
  const requested = Math.max(0, Math.floor(amount));
  const current = itemCount(inventory, id);
  const removed = Math.min(current, requested);
  const next = current - removed;
  const result = { ...inventory };

  if (next > 0) result[id] = next;
  else delete result[id];

  return {
    inventory: result,
    changed: removed,
  };
}
