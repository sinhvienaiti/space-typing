import { describe, expect, it } from "vitest";
import { StageWordLedger } from "../src/enemies/stage-word-variety";
import { typingText } from "../src/logic";
import type { VocabularyEntry } from "../src/types";

function word(text: string, id = text): VocabularyEntry {
  return { id, en: text, vi: "", ipa: "" };
}

describe("per-stage enemy word variety", () => {
  it("exhausts the selected source before repeating a narrow near-rank band", () => {
    const entries = [word("go"), word("electromagnetism"), word("intercontinental flight")];
    const ledger = new StageWordLedger();
    const selected: string[] = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = ledger.pick(entries, entries[0]!, 1, [], 0)!;
      ledger.record(entry);
      selected.push(entry.en);
    }
    expect(new Set(selected).size).toBe(entries.length);
  });

  it("uses fresh fallback words after a specialized pattern pool is exhausted", () => {
    const selected = [word("afternoon"), word("question"), word("morning"), word("brother")];
    const patterned = selected.slice(0, 2);
    const ledger = new StageWordLedger();
    const picks: string[] = [];
    for (let i = 0; i < selected.length; i++) {
      const entry = ledger.pick(patterned, patterned[0]!, 1, [], 0, () => true, selected)!;
      ledger.record(entry);
      picks.push(entry.en);
    }
    expect(new Set(picks.slice(0, 2))).toEqual(new Set(patterned.map(entry => entry.en)));
    expect(new Set(picks).size).toBe(selected.length);
  });

  it("balances unavoidable repeats across the whole source after exhaustion", () => {
    const entries = [word("go"), word("electromagnetism"), word("intercontinental flight")];
    const ledger = new StageWordLedger();
    for (let i = 0; i < 12; i++) {
      const entry = ledger.pick(entries, entries[0]!, 1, [], 0)!;
      ledger.record(entry);
    }
    expect(entries.map(entry => ledger.count(entry.en))).toEqual([4, 4, 4]);
  });

  it("uses 100 distinct words when a selected vocabulary has 150 near-rank choices", () => {
    const entries = Array.from({ length: 150 }, (_, index) => {
      const a = String.fromCharCode(97 + Math.floor(index / 26));
      const b = String.fromCharCode(97 + (index % 26));
      return word("plan" + a + b + "ter", String(index));
    });
    const ledger = new StageWordLedger();
    const selected: string[] = [];

    for (let i = 0; i < 100; i += 1) {
      const entry = ledger.pick(entries, entries[0]!, 1, [], 0);
      expect(entry).not.toBeNull();
      ledger.record(entry!);
      selected.push(typingText(entry!.en));
    }

    expect(new Set(selected).size).toBe(100);
    expect(selected.length).toBe(100);
  });

  it("never chooses a currently visible typing-equivalent enemy word", () => {
    const entries = [
      word("star ship", "spaced"),
      word("star-ship", "hyphenated"),
      word("planet"),
      word("castle"),
    ];
    const ledger = new StageWordLedger();

    const next = ledger.pick(entries, entries[0]!, 1, ["STARSHIP"], 0);

    expect(next).not.toBeNull();
    expect(typingText(next!.en)).not.toBe("starship");
  });

  it("delays another active single-word Custom target but permits later repeats", () => {
    const ledger = new StageWordLedger();
    const tiny = [word("apple")];
    const first = ledger.pick(tiny, tiny[0]!, 1, [], 0);
    expect(first?.en).toBe("apple");
    ledger.record(first!);

    expect(ledger.pick(tiny, tiny[0]!, 1, ["apple"], 0)).toBeNull();
    expect(ledger.pick(tiny, tiny[0]!, 1, [], 0)?.en).toBe("apple");
  });

  it("prefers a fresh word, rolls back tentative formations and resets on next stage", () => {
    const entries = [word("apple"), word("orbit"), word("laser")];
    const ledger = new StageWordLedger();
    ledger.record(entries[0]!);

    const next = ledger.pick(entries, entries[0]!, 1, [], 0);
    expect(next?.en).not.toBe("apple");

    ledger.record(next!);
    expect(ledger.count(next!.en)).toBe(1);
    ledger.undo(next!);
    expect(ledger.count(next!.en)).toBe(0);

    ledger.reset();
    expect(ledger.count("apple")).toBe(0);
    expect(ledger.pick(entries, entries[0]!, 1, [], 0)).not.toBeNull();
  });

  it("keeps the extra weight of a word the source repeats (Recall weak words)", () => {
    const fresh = Array.from({ length: 10 }, (_, index) => word("plan" + String.fromCharCode(98 + index) + "ter", "w" + index));
    const weak = word("planater", "weak");
    const firstPickShare = (entries: VocabularyEntry[]): number => {
      let hits = 0;
      const draws = 1000;
      for (let index = 0; index < draws; index += 1) {
        const ledger = new StageWordLedger();
        if (ledger.pick(entries, fresh[0]!, 1, [], (index + 0.5) / draws)?.id === "weak") hits += 1;
      }
      return hits / draws;
    };
    // buildAdaptiveRecallVocabulary adds copies of a weak word to favour it.
    const once = firstPickShare([...fresh, weak]);
    const favoured = firstPickShare([...fresh, weak, weak, weak, weak]);
    expect(once).toBeGreaterThan(0);
    expect(favoured).toBeGreaterThan(once * 2.5);
  });

  it("stays repeatable with the same stage order and random input", () => {
    const entries = ["galaxy", "planet", "castle", "orbit", "meteor"]
      .map((text) => word(text));
    const run = () => {
      const ledger = new StageWordLedger();
      return Array.from({ length: 12 }, () => {
        const entry = ledger.pick(entries, entries[0]!, 1, [], 0.25)!;
        ledger.record(entry);
        return entry.en;
      });
    };

    expect(run()).toEqual(run());
  });
});
