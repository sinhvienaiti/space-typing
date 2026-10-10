export const BOSS_PART_TYPES = [
  "engine",
  "core",
  "cannon",
  "shield",
] as const;
export type BossPartType = (typeof BOSS_PART_TYPES)[number];

export type BossPartState = {
  instanceId: string;
  parentBossId: string;
  type: BossPartType;
  targetToken: string;
  hp: number;
  maxHp: number;
  destroyed: boolean;
  vulnerable: boolean;
  countsForKillObjective: false;
  dropsLoot: false;
};

export type BossPartsState = {
  bossId: string;
  parts: BossPartState[];
  interruptConsumed: boolean;
};

export function createReferenceBossParts(
  bossId: string,
  bossMaxHp: number,
): BossPartsState {
  const max = Math.max(1, bossMaxHp);
  return {
    bossId,
    interruptConsumed: false,
    parts: [
      {
        instanceId: bossId + "/cannon",
        parentBossId: bossId,
        type: "cannon",
        targetToken: "cannon",
        hp: Math.max(1, Math.round(max * 0.18)),
        maxHp: Math.max(1, Math.round(max * 0.18)),
        destroyed: false,
        vulnerable: true,
        countsForKillObjective: false,
        dropsLoot: false,
      },
      {
        instanceId: bossId + "/core",
        parentBossId: bossId,
        type: "core",
        targetToken: "core",
        hp: Math.max(1, Math.round(max * 0.22)),
        maxHp: Math.max(1, Math.round(max * 0.22)),
        destroyed: false,
        vulnerable: false,
        countsForKillObjective: false,
        dropsLoot: false,
      },
    ],
  };
}

export function damageBossPart(
  state: BossPartsState,
  instanceId: string,
  damageInput: number,
): { state: BossPartsState; destroyedNow: boolean } {
  let destroyedNow = false;
  const damage = Math.max(0, damageInput);
  const parts = state.parts.map((part) => {
    if (
      part.instanceId !== instanceId ||
      part.destroyed ||
      !part.vulnerable
    ) {
      return part;
    }
    const hp = Math.max(0, part.hp - damage);
    const destroyed = hp <= 0;
    destroyedNow = destroyed && !part.destroyed;
    return { ...part, hp, destroyed };
  });
  const cannonDestroyed = parts.some(
    (part) => part.type === "cannon" && part.destroyed,
  );
  return {
    destroyedNow,
    state: {
      ...state,
      parts: parts.map((part) =>
        part.type === "core" && cannonDestroyed
          ? { ...part, vulnerable: true }
          : part,
      ),
    },
  };
}

export function cleanupBossParts(
  state: BossPartsState,
): BossPartsState {
  return {
    ...state,
    parts: state.parts.map((part) => ({
      ...part,
      hp: 0,
      destroyed: true,
      vulnerable: false,
    })),
  };
}

export function aliveBossPartTargets(
  state: BossPartsState,
): BossPartState[] {
  return state.parts.filter((part) => !part.destroyed && part.vulnerable);
}
