export type CinematicPhase =
  | "idle"
  | "intro"
  | "focus"
  | "resolve"
  | "done";

export type CinematicState = {
  id: string;
  phase: CinematicPhase;
  elapsed: number;
  skipped: boolean;
};

export type CinematicFrame = {
  phase: CinematicPhase;
  progress: number;
  showTitleSafeZone: boolean;
  backgroundDim: number;
};

const PHASE_LENGTHS: Record<Exclude<CinematicPhase, "idle" | "done">, number> = {
  intro: 1.6,
  focus: 2.2,
  resolve: 1.4,
};

export function createCinematicState(id: string): CinematicState {
  return { id, phase: "idle", elapsed: 0, skipped: false };
}

export function startCinematic(state: CinematicState): CinematicState {
  return { ...state, phase: "intro", elapsed: 0, skipped: false };
}

export function skipCinematic(state: CinematicState): CinematicState {
  return { ...state, phase: "done", elapsed: 0, skipped: true };
}

export function tickCinematic(
  stateInput: CinematicState,
  dtInput: number,
): CinematicState {
  if (stateInput.phase === "idle" || stateInput.phase === "done") {
    return stateInput;
  }
  let phase = stateInput.phase;
  let elapsed = stateInput.elapsed + Math.max(0, dtInput);
  while (phase !== "done") {
    const length = PHASE_LENGTHS[phase];
    if (elapsed < length) break;
    elapsed -= length;
    phase =
      phase === "intro"
        ? "focus"
        : phase === "focus"
          ? "resolve"
          : "done";
  }
  return { ...stateInput, phase, elapsed };
}

export function cinematicFrame(state: CinematicState): CinematicFrame {
  if (state.phase === "idle" || state.phase === "done") {
    return {
      phase: state.phase,
      progress: state.phase === "done" ? 1 : 0,
      showTitleSafeZone: false,
      backgroundDim: 0,
    };
  }
  const progress = Math.min(1, state.elapsed / PHASE_LENGTHS[state.phase]);
  return {
    phase: state.phase,
    progress,
    showTitleSafeZone: state.phase === "focus",
    backgroundDim:
      state.phase === "intro"
        ? 0.25 + progress * 0.2
        : state.phase === "focus"
          ? 0.45
          : 0.45 * (1 - progress),
  };
}
