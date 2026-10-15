import { normalizeSpokenForm, parseSnapshot } from "./protocol.mjs";

/** Exact full-form matching only; decoder candidates/nearest targets have no authority. */
export function matchSnapshot(snapshotInput, form, suppressedForms = []) {
  const snapshot = parseSnapshot(snapshotInput);
  const key = normalizeSpokenForm(form);
  if (suppressedForms.some((x) => normalizeSpokenForm(x) === key)) return { status: "suppressed", targets: [] };
  const targets = snapshot.targets.filter((t) => t.eligible && t.forms.includes(key));
  return { status: targets.length === 1 ? "matched" : targets.length > 1 ? "ambiguous" : "no-match", targets };
}
