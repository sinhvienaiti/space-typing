import { clamp } from "../logic";

export type ImpactKind = "key" | "word" | "boss-word" | "boss-defeat";

export type ImpactFeedback = {
  hitStopSeconds: number;
  shake: number;
};

const IMPACT_FEEDBACK: Record<ImpactKind, ImpactFeedback> = {
  key: { hitStopSeconds: 0, shake: 0 },
  // Word completion already has recoil, shot SFX and particles. Freezing all
  // enemies on every word makes fast typing look like dropped frames.
  word: { hitStopSeconds: 0, shake: 1.4 },
  "boss-word": { hitStopSeconds: 0.02, shake: 2.1 },
  "boss-defeat": { hitStopSeconds: 0.07, shake: 4.2 },
};

export function impactFeedback(kind: ImpactKind): ImpactFeedback {
  return { ...IMPACT_FEEDBACK[kind] };
}

export function telegraphStrength(
  actionCooldown: number | null,
  windowSeconds = 0.9,
): number {
  if (
    actionCooldown === null ||
    !Number.isFinite(actionCooldown) ||
    actionCooldown < 0
  ) {
    return actionCooldown !== null && actionCooldown < 0 ? 1 : 0;
  }

  const window = Math.max(0.05, windowSeconds);
  if (actionCooldown >= window) return 0;
  return clamp(1 - actionCooldown / window, 0, 1);
}

export function telegraphPulse(
  strength: number,
  timeSeconds: number,
): number {
  const safe = clamp(strength, 0, 1);
  const pulse = 0.72 + Math.sin(timeSeconds * 13) * 0.28;
  return clamp(safe * pulse, 0, 1);
}
