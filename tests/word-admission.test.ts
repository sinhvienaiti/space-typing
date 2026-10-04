import { describe, expect, it } from "vitest";
import { TargetRegistry } from "../src/input/target-registry";
import { fullTypingPrefixConflict, wordConflict, type WordReservation } from "../src/input/word-conflict";
import { StageWordLedger } from "../src/enemies/stage-word-variety";
import type { VocabularyEntry } from "../src/types";
const unit = (unitId: string, text: string, changes: Partial<WordReservation> = {}): WordReservation => ({ unitId, contextId: "combat", text, ...changes });
const word = (en: string): VocabularyEntry => ({ id: en, en, vi: "", ipa: "" });
function admit(registry: TargetRegistry, units: WordReservation[]) {
  const p = registry.prepare(units); if (p.status !== "prepared") throw new Error(p.reason);
  const result = registry.commit(p.token); if (result.status !== "accepted") throw new Error("commit rejected"); return result;
}
describe("strict word admission", () => {
  it("bans exact/full normalized prefixes in both directions, but permits shared initial letters", () => {
    expect(fullTypingPrefixConflict("react", "reactor")).toBe(true); expect(fullTypingPrefixConflict("reactor", "react")).toBe(true);
    expect(fullTypingPrefixConflict("star ship", "star-ship")).toBe(true);
    expect(fullTypingPrefixConflict("red", "robot")).toBe(false);
    expect(wordConflict(unit("new", "react"), [unit("old", "reactor")])).toBe("full-prefix");
    expect(wordConflict(unit("new", "123"), [])).toBe("invalid-key");
  });
  it("uses authored spoken aliases and homophone groups without flattening phrases to keyboard text", () => {
    expect(wordConflict(unit("a", "two", { phoneticGroups: ["en:tu"] }), [unit("b", "too", { phoneticGroups: ["en:tu"] })])).toBe("spoken-conflict");
    expect(wordConflict(unit("a", "colour", { spokenForms: ["colour", "color"] }), [unit("b", "tint", { spokenForms: ["color"] })])).toBe("spoken-conflict");
    expect(wordConflict(unit("a", "red"), [unit("b", "red", { contextId: "puzzle" })])).toBeNull();
  });
  it("reserves keyboard-owned full words although they are absent from voice candidates", () => {
    const r = new TargetRegistry("hybrid"); admit(r, [unit("a", "react")]); expect(r.claimKeyboard("a")).toBe(true);
    expect(r.voiceUnits("combat")).toEqual([]); expect(r.prepare([unit("b", "reactor")])).toEqual({ status: "deferred", reason: "full-prefix" });
    r.remove("a"); expect(r.prepare([unit("b", "reactor")]).status).toBe("prepared");
  });
  it("rejects entire conflicting formations before any reservation/history side effects", () => {
    const r = new TargetRegistry("voice"); expect(r.prepare([unit("a", "react"), unit("b", "reactor")]).status).toBe("deferred");
    expect(r.reservations()).toEqual([]); expect(r.prepare([unit("a", "red"), unit("b", "robot")]).status).toBe("prepared");
  });
  it("keeps pending batches reserved and validates replacements when async work commits", () => {
    const r = new TargetRegistry("hybrid"); admit(r, [unit("old", "red")]);
    const replacement = r.prepare([unit("new", "robot")], "old"); expect(replacement.status).toBe("prepared");
    expect(r.prepare([unit("other", "robots")]).status).toBe("deferred");
    r.remove("old"); if (replacement.status === "prepared") expect(r.commit(replacement.token)).toEqual({ status: "deferred", reason: "stale-admission" });
    expect(r.reservations()).toEqual([]);
  });
  it("does not reuse cancelled identities within an encounter, or stale tokens across reset", () => {
    const r = new TargetRegistry("hybrid"); const prepared = r.prepare([unit("a", "red")]); expect(prepared.status).toBe("prepared");
    if (prepared.status !== "prepared") return; r.cancel(prepared.token);
    expect(r.prepare([unit("a", "red")]).status).toBe("deferred");
    r.reset(); const fresh = r.prepare([unit("new", "red")]); expect(fresh.status).toBe("prepared");
    expect(r.commit(prepared.token).status).toBe("deferred");
  });
  it("enforces bounded capacity and Typing retains its existing prefix compatibility", () => {
    const r = new TargetRegistry("typing", 2); admit(r, [unit("a", "react"), unit("b", "reactor")]);
    expect(r.prepare([unit("c", "orbit")])).toEqual({ status: "deferred", reason: "capacity" });
    expect(() => new TargetRegistry("voice", 65)).toThrow();
  });
  it("does not expose mutable alias arrays from reservations or commits", () => {
    const r = new TargetRegistry("hybrid"), forms = ["red"]; const result = admit(r, [unit("a", "red", { spokenForms: forms })]);
    forms.push("robot"); (result.units[0]!.spokenForms as string[]).push("robot");
    expect(r.reservations()[0]!.spokenForms).toEqual(["red"]);
  });
  it("filters unsafe fresh words before variety and returns deferral rather than an unsafe fallback", () => {
    const entries = [word("reactor"), word("planet")], ledger = new StageWordLedger(); ledger.record(entries[1]!);
    const allowed = (e: VocabularyEntry) => wordConflict(unit("candidate", e.en), [unit("active", "react")]) === null;
    expect(ledger.pick(entries, entries[0]!, 1, ["react"], 0, allowed)?.en).toBe("planet");
    expect(ledger.pick([entries[0]!], entries[0]!, 1, ["react"], 0, allowed)).toBeNull();
    expect(ledger.count("reactor")).toBe(0); // Selection has no record/commit effects.
  });
});
