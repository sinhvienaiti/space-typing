import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createReviewedReflexChallenge } from "../server/duel/reflex/challenge-bank";
import { WordChainAuthority } from "../server/duel/word-chain/authority";
import { DuelModeRuntime, type DuelModeCombatPort } from "../server/duel/mode-runtime";

const noopCombat: DuelModeCombatPort = { scheduleModeAttack() {} };

describe("Alternative mode boundary hardening", () => {
  it("falls back to finite default challenge/beat durations", () => {
    const reflex = createReviewedReflexChallenge({
      index: 0,
      modeEpoch: 1,
      issuedAtMs: 1_000,
      durationMs: Number.NaN,
    });
    expect(reflex.publicChallenge.deadlineAtMs).toBe(13_000);

    const chain = new WordChainAuthority(
      new DuelModeRuntime(noopCombat),
      "practice",
      Number.NaN,
    );
    const beat = chain.start(2_000);
    expect(beat.deadlineAtMs).toBe(14_000);
  });

  it("keeps mode parser allowlists module-scoped instead of allocating per keypress", () => {
    for (const path of ["../src/duel/reflex.ts", "../src/duel/word-chain.ts"]) {
      const source = readFileSync(new URL(path, import.meta.url), "utf8");
      expect(source).toContain("const TYPE_CHAR_KEYS");
      expect(source).toContain("const TYPE_ONLY_KEYS");
      expect(source).not.toContain("const set = new Set(allowed)");
    }
  });

  it("disposes alternative runtime when the authoritative tick fails", () => {
    const source = readFileSync(
      new URL("../server/duel/ws-server.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain(
      "if (!result.ok) {\n        activeMatches.delete(matchId);\n        disposeAlternativeMatch(matchId);",
    );
  });
});
