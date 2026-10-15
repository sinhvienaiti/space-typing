import type {
  DuelActionDefinition,
  DuelActionOffer,
} from "./model";

export function normalizeDuelAnswerToken(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z]/g, "");
}

export function isValidDuelAnswerToken(value: string): boolean {
  return /^[a-z]+$/.test(value);
}

export function duelCharacterFromKeyboardInput(input: {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  isComposing?: boolean;
  repeat?: boolean;
}): string | null {
  if (
    input.ctrlKey === true ||
    input.altKey === true ||
    input.metaKey === true ||
    input.isComposing === true ||
    input.repeat === true
  ) {
    return null;
  }
  const normalized = input.key.toLocaleLowerCase("en-US");
  return /^[a-z]$/.test(normalized) ? normalized : null;
}

export function duelOfferAnswerToken(
  offer: DuelActionOffer,
  actions: ReadonlyMap<string, DuelActionDefinition>,
): string | null {
  const promptToken = offer.typingPrompt?.answerToken;
  if (
    promptToken !== undefined &&
    isValidDuelAnswerToken(promptToken)
  ) {
    return promptToken;
  }

  // FINAL V4 migration path for legacy replay/test fixtures only.
  const legacy = actions.get(offer.actionId)?.answerToken;
  return legacy !== undefined && isValidDuelAnswerToken(legacy)
    ? legacy
    : null;
}

export function matchingDuelOffers(
  prefix: string,
  offers: readonly DuelActionOffer[],
  actions: ReadonlyMap<string, DuelActionDefinition>,
): DuelActionOffer[] {
  if (!isValidDuelAnswerToken(prefix)) return [];
  return offers.filter((offer) => {
    if (offer.status !== "available") return false;
    const token = duelOfferAnswerToken(offer, actions);
    return token?.startsWith(prefix) === true;
  });
}

export function acquireDuelOfferByPrefix(
  prefix: string,
  offers: readonly DuelActionOffer[],
  actions: ReadonlyMap<string, DuelActionDefinition>,
): DuelActionOffer | null {
  const matches = matchingDuelOffers(prefix, offers, actions);
  return matches.length === 1 ? matches[0]! : null;
}

export function hasDuelTokenPrefixConflict(
  tokens: readonly string[],
): boolean {
  for (let left = 0; left < tokens.length; left += 1) {
    const a = tokens[left]!;
    for (let right = left + 1; right < tokens.length; right += 1) {
      const b = tokens[right]!;
      if (a.startsWith(b) || b.startsWith(a)) return true;
    }
  }
  return false;
}
