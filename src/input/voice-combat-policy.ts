export const VOICE_COMBAT_POLICY = Object.freeze({
  version: "space-voice-v2-effort1",
  maxEffort: 8,
  scorePerEffort: 10,
  powerPerEffort: 1.8,
});
export function voiceEffort(remaining: number): number {
  return Number.isFinite(remaining)
    ? Math.min(
        VOICE_COMBAT_POLICY.maxEffort,
        Math.max(0, Math.floor(remaining)),
      )
    : 0;
}
/** Separate credit per passive; one utterance never releases several banked procs. */
export class VoicePassiveCredit {
  private values = new Map<string, number>();
  add(key: string, effort: number, threshold: number): boolean {
    if (!Number.isSafeInteger(threshold) || threshold < 1) return false;
    const total = (this.values.get(key) ?? 0) + voiceEffort(effort);
    const triggered = total >= threshold;
    this.values.set(
      key,
      triggered ? Math.min(threshold - 1, total - threshold) : total,
    );
    return triggered;
  }
  reset(): void {
    this.values.clear();
  }
}
export const NATO_LETTERS: Readonly<Record<string, string>> = Object.freeze({
  a: "alpha",
  b: "bravo",
  c: "charlie",
  d: "delta",
  e: "echo",
  f: "foxtrot",
  g: "golf",
  h: "hotel",
  i: "india",
  j: "juliet",
  k: "kilo",
  l: "lima",
  m: "mike",
  n: "november",
  o: "oscar",
  p: "papa",
  q: "quebec",
  r: "romeo",
  s: "sierra",
  t: "tango",
  u: "uniform",
  v: "victor",
  w: "whiskey",
  x: "x ray",
  y: "yankee",
  z: "zulu",
});
