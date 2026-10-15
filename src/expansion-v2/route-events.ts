export const EXPEDITION_ROUTE_EVENT_IDS = [
  "derelict-ship",
  "distress-signal",
  "merchant",
  "ancient-gate",
  "memory-fragment",
] as const;

export type ExpeditionRouteEventId =
  (typeof EXPEDITION_ROUTE_EVENT_IDS)[number];

export type ExpeditionRouteEventChoice = {
  id: string;
  label: string;
  effect:
    | "repair"
    | "challenge-draft"
    | "rescue"
    | "skip"
    | "salvage"
    | "risky-route"
    | "stable-route"
    | "review-word";
  amount?: number;
  flag?: string;
};

export type ExpeditionRouteEventDefinition = {
  id: ExpeditionRouteEventId;
  name: string;
  description: string;
  cooldownEncounters: number;
  choices: readonly ExpeditionRouteEventChoice[];
};

export const EXPEDITION_ROUTE_EVENTS: Record<
  ExpeditionRouteEventId,
  ExpeditionRouteEventDefinition
> = {
  "derelict-ship": {
    id: "derelict-ship",
    name: "Derelict Ship",
    description: "Take a small repair or accept a bounded challenge for a stronger next draft.",
    cooldownEncounters: 2,
    choices: [
      { id: "repair", label: "Recover 18% Hull", effect: "repair", amount: 0.18 },
      { id: "challenge", label: "Accept challenge", effect: "challenge-draft", flag: "derelict-challenge" },
    ],
  },
  "distress-signal": {
    id: "distress-signal",
    name: "Distress Signal",
    description: "Spend one encounter on a rescue or continue without punishment.",
    cooldownEncounters: 3,
    choices: [
      { id: "rescue", label: "Respond", effect: "rescue", flag: "rescue-support" },
      { id: "continue", label: "Continue", effect: "skip" },
    ],
  },
  merchant: {
    id: "merchant",
    name: "Run Merchant",
    description: "Trade only run-local salvage choices; Campaign wallet is never used.",
    cooldownEncounters: 3,
    choices: [
      { id: "salvage", label: "Salvage one Relic", effect: "salvage" },
      { id: "leave", label: "Keep build", effect: "skip" },
    ],
  },
  "ancient-gate": {
    id: "ancient-gate",
    name: "Ancient Gate",
    description: "Choose a previewed risky branch or the stable route.",
    cooldownEncounters: 4,
    choices: [
      { id: "risk", label: "Risky route", effect: "risky-route", flag: "ancient-gate-risk" },
      { id: "stable", label: "Stable route", effect: "stable-route", flag: "ancient-gate-stable" },
    ],
  },
  "memory-fragment": {
    id: "memory-fragment",
    name: "Memory Fragment",
    description: "Attempt one genuine review opportunity or skip it.",
    cooldownEncounters: 2,
    choices: [
      { id: "review", label: "Review a Wanted Word", effect: "review-word", flag: "memory-review" },
      { id: "skip", label: "Skip", effect: "skip" },
    ],
  },
};

export type ExpeditionRouteEventState = {
  history: Array<{ eventId: ExpeditionRouteEventId; encounterIndex: number; choiceId: string }>;
  flags: string[];
};

export function createExpeditionRouteEventState(): ExpeditionRouteEventState {
  return { history: [], flags: [] };
}

export function applyExpeditionRouteEventChoice(
  state: ExpeditionRouteEventState,
  eventId: ExpeditionRouteEventId,
  encounterIndex: number,
  choiceId: string,
): ExpeditionRouteEventState {
  const definition = EXPEDITION_ROUTE_EVENTS[eventId];
  const choice = definition.choices.find((entry) => entry.id === choiceId);
  if (choice === undefined) return state;
  const transactionKey = eventId + ":" + encounterIndex;
  if (
    state.history.some(
      (entry) => entry.eventId + ":" + entry.encounterIndex === transactionKey,
    )
  ) {
    return state;
  }
  return {
    history: [
      ...state.history,
      { eventId, encounterIndex, choiceId },
    ].slice(-64),
    flags:
      choice.flag === undefined
        ? state.flags
        : [...new Set([...state.flags, choice.flag])],
  };
}
