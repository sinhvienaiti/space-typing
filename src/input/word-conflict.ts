import { typingText } from "../logic";

export type WordReservation = {
  unitId: string;
  contextId: string;
  text: string;
  spokenForms?: readonly string[];
  phoneticGroups?: readonly string[];
};
export type WordConflictReason = "invalid-key" | "exact-duplicate" | "full-prefix" | "spoken-conflict";

export function spokenKey(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}
export function fullTypingPrefixConflict(left: string, right: string): boolean {
  const a = typingText(left); const b = typingText(right);
  return a.length > 0 && b.length > 0 && (a.startsWith(b) || b.startsWith(a));
}
export function wordConflict(candidate: WordReservation, active: readonly WordReservation[], excludeUnitId?: string): WordConflictReason | null {
  const key = typingText(candidate.text);
  if (!key) return "invalid-key";
  const forms = new Set((candidate.spokenForms ?? [candidate.text]).map(spokenKey).filter(Boolean));
  for (const unit of active) {
    if (unit.contextId !== candidate.contextId || unit.unitId === excludeUnitId) continue;
    const otherKey = typingText(unit.text);
    if (!otherKey) continue;
    if (key === otherKey) return "exact-duplicate";
    if (fullTypingPrefixConflict(key, otherKey)) return "full-prefix";
    if ((unit.spokenForms ?? [unit.text]).some((form) => forms.has(spokenKey(form)))) return "spoken-conflict";
    if (candidate.phoneticGroups?.some((group) => unit.phoneticGroups?.includes(group))) return "spoken-conflict";
  }
  return null;
}
