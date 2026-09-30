import {
  DUEL_CONTENT_VERSION,
  type DuelActionDefinition,
} from "./model";
import {
  isValidDuelAnswerToken,
  normalizeDuelAnswerToken,
} from "./typing";

const ACTIONS = [
  {
    id: "laser",
    category: "attack",
    displayLabel: "LASER",
    answerToken: "laser",
    typingCostBand: "short",
    resolveMode: "instant",
    targetPolicy: "opponent",
    capacityPolicy: "none",
    energyCost: 0,
    cooldownSeconds: 0,
    effectId: "rapid-laser",
    counterTags: ["shield"],
    contentVersion: DUEL_CONTENT_VERSION,
  },
  {
    id: "missile",
    category: "attack",
    displayLabel: "MISSILE",
    answerToken: "missile",
    typingCostBand: "medium",
    resolveMode: "banked",
    targetPolicy: "opponent",
    capacityPolicy: "attack-bank",
    energyCost: 12,
    cooldownSeconds: 0,
    effectId: "guided-missile",
    counterTags: ["intercept", "barrier"],
    contentVersion: DUEL_CONTENT_VERSION,
  },
  {
    id: "siege-lance",
    category: "attack",
    displayLabel: "SIEGE LANCE",
    answerToken: "siegelance",
    typingCostBand: "long",
    resolveMode: "instant",
    targetPolicy: "opponent",
    capacityPolicy: "none",
    energyCost: 36,
    cooldownSeconds: 8,
    effectId: "siege-lance",
    counterTags: ["intercept", "barrier"],
    responseOpportunity: {
      mode: "attached-token",
      counterTags: ["intercept", "barrier"],
      windowSeconds: 2.8,
    },
    contentVersion: DUEL_CONTENT_VERSION,
  },
  {
    id: "barrier",
    category: "defense",
    displayLabel: "BARRIER",
    answerToken: "barrier",
    typingCostBand: "medium",
    resolveMode: "banked",
    targetPolicy: "self",
    capacityPolicy: "defense-reserve",
    energyCost: 8,
    cooldownSeconds: 0,
    effectId: "barrier-charge",
    counterTags: [],
    contentVersion: DUEL_CONTENT_VERSION,
  },
  {
    id: "repair",
    category: "defense",
    displayLabel: "REPAIR",
    answerToken: "repair",
    typingCostBand: "medium",
    resolveMode: "instant",
    targetPolicy: "self",
    capacityPolicy: "none",
    energyCost: 14,
    cooldownSeconds: 6,
    effectId: "hull-repair",
    counterTags: [],
    contentVersion: DUEL_CONTENT_VERSION,
  },
  {
    id: "energy",
    category: "support",
    displayLabel: "ENERGY",
    answerToken: "energy",
    typingCostBand: "medium",
    resolveMode: "instant",
    targetPolicy: "self",
    capacityPolicy: "none",
    energyCost: 0,
    cooldownSeconds: 0,
    effectId: "energy-gain",
    counterTags: [],
    contentVersion: DUEL_CONTENT_VERSION,
  },
  {
    id: "lock-on",
    category: "support",
    displayLabel: "LOCK-ON",
    answerToken: "lockon",
    typingCostBand: "medium",
    resolveMode: "instant",
    targetPolicy: "self",
    capacityPolicy: "none",
    energyCost: 6,
    cooldownSeconds: 4,
    effectId: "lock-on",
    counterTags: [],
    contentVersion: DUEL_CONTENT_VERSION,
  },
  {
    id: "disrupt",
    category: "tactical",
    displayLabel: "DISRUPT",
    answerToken: "disrupt",
    typingCostBand: "medium",
    resolveMode: "banked",
    targetPolicy: "opponent",
    capacityPolicy: "tactical-reserve",
    energyCost: 16,
    cooldownSeconds: 0,
    effectId: "disrupt",
    counterTags: ["cleanse", "anchor"],
    contentVersion: DUEL_CONTENT_VERSION,
  },
  {
    id: "scan",
    category: "tactical",
    displayLabel: "SCAN",
    answerToken: "scan",
    typingCostBand: "short",
    resolveMode: "instant",
    targetPolicy: "opponent",
    capacityPolicy: "none",
    energyCost: 8,
    cooldownSeconds: 8,
    effectId: "scan",
    counterTags: [],
    contentVersion: DUEL_CONTENT_VERSION,
  },
  {
    id: "fate-crystal",
    category: "fate",
    displayLabel: "FATE CRYSTAL",
    answerToken: "fatecrystal",
    typingCostBand: "long",
    resolveMode: "instant",
    targetPolicy: "shared",
    capacityPolicy: "none",
    energyCost: 0,
    cooldownSeconds: 0,
    effectId: "fate-crystal",
    counterTags: [],
    contentVersion: DUEL_CONTENT_VERSION,
  },
  {
    id: "black-hole",
    category: "mystery",
    displayLabel: "BLACK HOLE",
    answerToken: "blackhole",
    typingCostBand: "long",
    resolveMode: "instant",
    targetPolicy: "map",
    capacityPolicy: "none",
    energyCost: 0,
    cooldownSeconds: 0,
    effectId: "mystery-black-hole",
    counterTags: [],
    mapPresentationId: "void-distortion",
    contentVersion: DUEL_CONTENT_VERSION,
  },
] as const satisfies readonly DuelActionDefinition[];

export const DUEL_ACTIONS: readonly DuelActionDefinition[] = ACTIONS;

export const DUEL_ACTIONS_BY_ID: ReadonlyMap<
  string,
  DuelActionDefinition
> = new Map(ACTIONS.map((action) => [action.id, action]));

export function validateDuelActionDefinitions(
  actions: readonly DuelActionDefinition[] = DUEL_ACTIONS,
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const tokens = new Set<string>();

  for (const action of actions) {
    if (ids.has(action.id)) {
      errors.push("Duplicate Duel action id: " + action.id);
    }
    ids.add(action.id);

    if (!isValidDuelAnswerToken(action.answerToken)) {
      errors.push(action.id + ": answerToken must be normalized a-z.");
    }
    if (
      normalizeDuelAnswerToken(action.displayLabel) !==
      action.answerToken
    ) {
      errors.push(
        action.id +
          ": displayLabel must normalize exactly to answerToken.",
      );
    }
    if (tokens.has(action.answerToken)) {
      errors.push(
        "Duplicate Duel answerToken: " + action.answerToken,
      );
    }
    tokens.add(action.answerToken);

    if (action.energyCost < 0 || action.cooldownSeconds < 0) {
      errors.push(action.id + ": costs/cooldowns must be non-negative.");
    }
    if (
      action.category === "attack" &&
      action.typingCostBand === "long" &&
      action.energyCost >= 30 &&
      action.responseOpportunity === undefined
    ) {
      errors.push(
        action.id +
          ": strong attack requires a deterministic response opportunity.",
      );
    }
    if (
      action.responseOpportunity !== undefined &&
      action.responseOpportunity.windowSeconds <= 0
    ) {
      errors.push(action.id + ": response window must be positive.");
    }
  }

  const categories = new Set(actions.map((action) => action.category));
  for (const category of [
    "attack",
    "defense",
    "support",
    "tactical",
    "fate",
    "mystery",
  ] as const) {
    if (!categories.has(category)) {
      errors.push("Missing Duel category: " + category);
    }
  }
  return errors;
}
