import type { HiddenDiscoveryState } from "./hidden-content";

export const HIDDEN_DISCOVERY_PRESENTATION_EVENT =
  "space-typing:hidden-discovery";
export const HIDDEN_STOP_ARRIVAL_EVENT =
  "space-typing:hidden-stop-arrival";

export type HiddenStopArrival = {
  discoveryId: "black-market-signal" | "hidden-station-signal";
  stage: number;
  kind: "hidden-shop" | "hidden-station";
  title: "Hidden Shop" | "Hidden Station";
};

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
 * Detect only a genuinely new secret stop from the same live Campaign seed.
 * Initial save hydration intentionally returns null so reloading a discovered
 * stop cannot replay its arrival card.
 */
export function hiddenStopArrivalBetween(
  previous: HiddenDiscoveryState | null,
  next: HiddenDiscoveryState,
): HiddenStopArrival | null {
  if (
    previous === null ||
    previous.seedIdentity !== next.seedIdentity ||
    next.lastRollStage <= previous.lastRollStage ||
    next.lastRollIdentity === null ||
    next.lastRollIdentity === previous.lastRollIdentity
  ) {
    return null;
  }

  const previousIds = new Set(previous.discovered);
  const candidates = [
    {
      discoveryId: "black-market-signal" as const,
      kind: "hidden-shop" as const,
      title: "Hidden Shop" as const,
    },
    {
      discoveryId: "hidden-station-signal" as const,
      kind: "hidden-station" as const,
      title: "Hidden Station" as const,
    },
  ];

  for (const candidate of candidates) {
    if (
      !previousIds.has(candidate.discoveryId) &&
      next.discovered.includes(candidate.discoveryId) &&
      next.discoveryStages[candidate.discoveryId] === next.lastRollStage
    ) {
      return {
        ...candidate,
        stage: next.lastRollStage,
      };
    }
  }

  return null;
}

/**
 * Read-only bridge for presentation-only consumers that cannot own Campaign
 * persistence. The canonical discovery owner still lives in HiddenDiscoveryState;
 * this snapshot never rolls, rewards, saves, or mutates discovery state.
 */
export function publishHiddenDiscoveryPresentation(
  state: HiddenDiscoveryState,
): void {
  const previousState = currentState;
  const nextState = cloneState(state);
  const nextRouteKey = routeKey(nextState);
  const arrival = hiddenStopArrivalBetween(previousState, nextState);
  currentState = nextState;
  if (nextRouteKey === currentRouteKey) return;
  currentRouteKey = nextRouteKey;
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function" ||
    typeof CustomEvent === "undefined"
  ) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(HIDDEN_DISCOVERY_PRESENTATION_EVENT),
  );
  if (arrival !== null) {
    window.dispatchEvent(
      new CustomEvent<HiddenStopArrival>(HIDDEN_STOP_ARRIVAL_EVENT, {
        detail: arrival,
      }),
    );
  }
}

export function currentHiddenDiscoveryPresentation(): HiddenDiscoveryState | null {
  return currentState === null ? null : cloneState(currentState);
}
