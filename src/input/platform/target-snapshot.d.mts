import type { VoiceSnapshot, VoiceTarget } from "./protocol.mjs";
export function matchSnapshot(snapshot: VoiceSnapshot, form: string, suppressedForms?: readonly string[]): { status: "matched" | "ambiguous" | "no-match" | "suppressed"; targets: VoiceTarget[] };
