import { sanitizeDuelActionQualityScale } from "./accuracy";
import {
  DUEL_INVENTORY_CAPACITY,
  duelInventoryBucketFor,
  type DuelActionDefinition,
  type DuelInventoryBucket,
} from "./model";

export type DuelStoredAction = {
  instanceId: string;
  actionId: string;
  storedAtTick: number;
  qualityScale: number;
};

export type DuelCombatInventorySnapshot = Readonly<
  Record<DuelInventoryBucket, readonly DuelStoredAction[]>
>;

export type DuelStoreResult =
  | {
      stored: true;
      bucket: DuelInventoryBucket;
      entry: DuelStoredAction;
    }
  | {
      stored: false;
      bucket: DuelInventoryBucket | null;
      reason: "not-bankable" | "full";
    };

export class DuelCombatInventory {
  private readonly buckets: Record<
    DuelInventoryBucket,
    DuelStoredAction[]
  > = {
    attack: [],
    defense: [],
    tactical: [],
  };
  private sequence = 0;

  canStore(action: DuelActionDefinition): boolean {
    const bucket = duelInventoryBucketFor(action);
    if (bucket === null || action.resolveMode !== "banked") return false;
    return this.buckets[bucket].length < DUEL_INVENTORY_CAPACITY[bucket];
  }

  store(
    action: DuelActionDefinition,
    storedAtTick: number,
    qualityScale = 1,
  ): DuelStoreResult {
    const bucket = duelInventoryBucketFor(action);
    if (bucket === null || action.resolveMode !== "banked") {
      return {
        stored: false,
        bucket,
        reason: "not-bankable",
      };
    }
    if (this.buckets[bucket].length >= DUEL_INVENTORY_CAPACITY[bucket]) {
      return {
        stored: false,
        bucket,
        reason: "full",
      };
    }

    const entry: DuelStoredAction = {
      instanceId:
        "stored:" +
        bucket +
        ":" +
        String(++this.sequence),
      actionId: action.id,
      storedAtTick: Math.max(0, Math.floor(storedAtTick)),
      qualityScale: sanitizeDuelActionQualityScale(qualityScale),
    };
    this.buckets[bucket].push(entry);
    return { stored: true, bucket, entry: { ...entry } };
  }

  consume(
    bucket: DuelInventoryBucket,
    instanceId: string,
  ): DuelStoredAction | null {
    const entries = this.buckets[bucket];
    const index = entries.findIndex(
      (entry) => entry.instanceId === instanceId,
    );
    if (index < 0) return null;
    return entries.splice(index, 1)[0] ?? null;
  }

  consumeFirstByAction(
    actionId: string,
  ): DuelStoredAction | null {
    for (const bucket of [
      "attack",
      "defense",
      "tactical",
    ] as const) {
      const index = this.buckets[bucket].findIndex(
        (entry) => entry.actionId === actionId,
      );
      if (index >= 0) {
        return this.buckets[bucket].splice(index, 1)[0] ?? null;
      }
    }
    return null;
  }

  snapshot(): DuelCombatInventorySnapshot {
    return {
      attack: this.buckets.attack.map((entry) => ({ ...entry })),
      defense: this.buckets.defense.map((entry) => ({ ...entry })),
      tactical: this.buckets.tactical.map((entry) => ({ ...entry })),
    };
  }

  clear(): void {
    this.buckets.attack.length = 0;
    this.buckets.defense.length = 0;
    this.buckets.tactical.length = 0;
  }
}
