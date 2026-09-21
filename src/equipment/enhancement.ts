export const MAX_ENHANCEMENT_LEVEL = 5;

export function sanitizeEnhancementLevel(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(
    MAX_ENHANCEMENT_LEVEL,
    Math.max(0, Math.floor(value)),
  );
}

export function enhancementStatMultiplier(level: number): number {
  return 1 + sanitizeEnhancementLevel(level) * 0.06;
}
