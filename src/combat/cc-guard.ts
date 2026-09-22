export const HARD_CC_IDS = [
  "freeze",
  "silence",
] as const;

export type HardCcId = (typeof HARD_CC_IDS)[number];

export type HardCcState = {
  active:
    | {
        id: HardCcId;
        remaining: number;
        immunityAfter: number;
      }
    | null;
  immunity: Record<HardCcId, number>;
};

export function createHardCcState(): HardCcState {
  return {
    active: null,
    immunity: {
      freeze: 0,
      silence: 0,
    },
  };
}

export function tickHardCcState(
  state: HardCcState,
  dt: number,
): HardCcState {
  const delta = Math.max(0, dt);
  const immunity = {
    freeze: Math.max(0, state.immunity.freeze - delta),
    silence: Math.max(0, state.immunity.silence - delta),
  };

  if (state.active === null) {
    return { active: null, immunity };
  }

  const remaining = Math.max(0, state.active.remaining - delta);
  if (remaining > 0) {
    return {
      active: { ...state.active, remaining },
      immunity,
    };
  }

  immunity[state.active.id] = Math.max(
    immunity[state.active.id],
    state.active.immunityAfter,
  );
  return {
    active: null,
    immunity,
  };
}

export function canApplyHardCc(
  state: HardCcState,
  id: HardCcId,
): boolean {
  return (
    state.active === null &&
    state.immunity[id] <= 0
  );
}

export function beginHardCc(
  state: HardCcState,
  id: HardCcId,
  duration: number,
  immunityAfter: number,
): HardCcState {
  if (!canApplyHardCc(state, id)) return state;

  return {
    active: {
      id,
      remaining: Math.max(0, duration),
      immunityAfter: Math.max(0, immunityAfter),
    },
    immunity: { ...state.immunity },
  };
}
