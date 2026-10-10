export type InputMode = "typing" | "voice" | "hybrid";

export function sanitizeInputMode(value: unknown): InputMode {
  return value === "voice" || value === "hybrid" ? value : "typing";
}

export function allowsCombatLetters(mode: InputMode): boolean {
  return mode !== "voice";
}
