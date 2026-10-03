import type {
  DuelActionCategory,
} from "./model";

export const DUEL_OFFER_LIFETIME_SECONDS: Readonly<
  Record<DuelActionCategory, number>
> = Object.freeze({
  attack: 18,
  defense: 22,
  support: 20,
  tactical: 22,
  fate: 24,
  mystery: 24,
});

export function duelOfferLifetimeSeconds(
  category: DuelActionCategory,
): number {
  return DUEL_OFFER_LIFETIME_SECONDS[category];
}

export function sanitizeDuelOfferRemainingSeconds(
  value: number | null | undefined,
  fallbackSeconds: number,
): number | null {
  if (value === null) return null;
  if (value === undefined) {
    return Math.max(0.1, fallbackSeconds);
  }
  if (!Number.isFinite(value)) {
    return Math.max(0.1, fallbackSeconds);
  }
  return Math.max(0, value);
}
