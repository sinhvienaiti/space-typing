import { describe, expect, it } from "vitest";
import { StageWordLedger } from "../src/enemies/stage-word-variety";
import { typingText } from "../src/logic";
import type { VocabularyEntry } from "../src/types";

function word(text: string, id = text): VocabularyEntry {
  return { id, en: text, vi: "", ipa: "" };
}

describe("per-stage enemy word variety", () => {
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
