export type NemesisRecord = {
  id: string;
  enemyDefinitionId: string;
  sourceStage: number;
  defeats: number;
  returns: number;
  resolved: boolean;
  rewardClaimed: boolean;
};

export type NemesisState = {
  active: NemesisRecord | null;
};

export function createNemesisState(): NemesisState {
  return { active: null };
}

export function recordNemesisDefeat(
  state: NemesisState,
  enemyDefinitionId: string,
  sourceStage: number,
): NemesisState {
  if (state.active !== null && !state.active.resolved) {
    return {
      active: {
        ...state.active,
        defeats: Math.min(9, state.active.defeats + 1),
      },
    };
  }
  return {
    active: {
      id: "nemesis:" + enemyDefinitionId + ":" + Math.max(1, Math.floor(sourceStage)),
      enemyDefinitionId,
      sourceStage: Math.max(1, Math.floor(sourceStage)),
      defeats: 1,
      returns: 0,
      resolved: false,
      rewardClaimed: false,
    },
  };
}

export function markNemesisReturn(state: NemesisState): NemesisState {
  if (state.active === null || state.active.resolved) return state;
  return {
    active: {
      ...state.active,
      returns: Math.min(3, state.active.returns + 1),
    },
  };
}

export function resolveNemesis(
  state: NemesisState,
): { state: NemesisState; grantReward: boolean } {
  if (state.active === null || state.active.resolved) {
    return { state, grantReward: false };
  }
  return {
    grantReward: !state.active.rewardClaimed,
    state: {
      active: {
        ...state.active,
        resolved: true,
        rewardClaimed: true,
      },
    },
  };
}
