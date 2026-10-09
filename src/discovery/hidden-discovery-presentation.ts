import type { HiddenDiscoveryState } from "./hidden-content";

export const HIDDEN_DISCOVERY_PRESENTATION_EVENT =
  "space-typing:hidden-discovery";

let currentState: HiddenDiscoveryState | null = null;

function cloneState(state: HiddenDiscoveryState): HiddenDiscoveryState {
  return {
    discovered: [...state.discovered],
    discoveryStages: { ...state.discoveryStages },
    drought: { ...state.drought },
    seedIdentity: state.seedIdentity,
    lastRollStage: state.lastRollStage,
    lastRollIdentity: state.lastRollIdentity,
    encounter:
      state.encounter === undefined
        ? undefined
        : {
            active:
              state.encounter.active === null
                ? null
                : { ...state.encounter.active },
            resolvedOfferIds: [...state.encounter.resolvedOfferIds],
          },
  };
}

/**
 * Read-only bridge for presentation-only consumers that cannot own Campaign
 * persistence. The canonical discovery owner still lives in HiddenDiscoveryState;
 * this snapshot never rolls, rewards, saves, or mutates discovery state.
 */
export function publishHiddenDiscoveryPresentation(
  state: HiddenDiscoveryState,
): void {
  currentState = cloneState(state);
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(HIDDEN_DISCOVERY_PRESENTATION_EVENT),
  );
}

export function currentHiddenDiscoveryPresentation(): HiddenDiscoveryState | null {
  return currentState === null ? null : cloneState(currentState);
}
