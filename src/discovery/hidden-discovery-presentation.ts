import type { HiddenDiscoveryState } from "./hidden-content";

export const HIDDEN_DISCOVERY_PRESENTATION_EVENT =
  "space-typing:hidden-discovery";

let currentState: HiddenDiscoveryState | null = null;
let currentRouteKey = "";

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

function routeKey(state: HiddenDiscoveryState): string {
  return [
    state.seedIdentity,
    String(state.lastRollStage),
    state.lastRollIdentity ?? "",
    state.discovered
      .map(
        (id) =>
          id + "@" + String(state.discoveryStages[id] ?? 0),
      )
      .join(","),
  ].join("|");
}

/**
 * Read-only bridge for presentation-only consumers that cannot own Campaign
 * persistence. The canonical discovery owner still lives in HiddenDiscoveryState;
 * this snapshot never rolls, rewards, saves, or mutates discovery state.
 */
export function publishHiddenDiscoveryPresentation(
  state: HiddenDiscoveryState,
): void {
  const nextRouteKey = routeKey(state);
  currentState = cloneState(state);
  if (nextRouteKey === currentRouteKey) return;
  currentRouteKey = nextRouteKey;
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(HIDDEN_DISCOVERY_PRESENTATION_EVENT),
  );
}

export function currentHiddenDiscoveryPresentation(): HiddenDiscoveryState | null {
  return currentState === null ? null : cloneState(currentState);
}
