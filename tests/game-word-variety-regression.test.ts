import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createTestGame } from "./helpers/game-harness";
import type { VocabularyEntry } from "../src/types";
import type { StageWordLedger } from "../src/enemies/stage-word-variety";
import { typingText } from "../src/logic";
import { createBossTypingMechanicState } from "../src/boss/typing-mechanics";
import { difficultyFor } from "../src/campaign/difficulty";

type Runtime = {
  stageWordLedger: StageWordLedger;
  expansionVocabulary(): readonly VocabularyEntry[];
  selectVariedEnemyEntry(preferred: VocabularyEntry, excludeId?: number, source?: readonly VocabularyEntry[]): VocabularyEntry | null;
};

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("real selected vocabulary in campaign patterns", () => {
  it.each(["long-word", "short-burst"] as const)("uses all 150 selected Level 1 words before repeating in %s", pattern => {
    const { entries } = JSON.parse(readFileSync(new URL("../../../shared/vocabulary/levels/001.json", import.meta.url), "utf8")) as { entries: VocabularyEntry[] };
    const game = createTestGame(entries);
    game.setExpansionEncounterContext({ encounterId: "variety-regression", pattern, gameplaySeed: 42 });
    const runtime = game as unknown as Runtime;
    const source = runtime.expansionVocabulary();
    const assigned: string[] = [];
    try {
      for (let i = 0; i < entries.length; i++) {
        const entry = runtime.selectVariedEnemyEntry(source[0]!, undefined, source);
        expect(entry).not.toBeNull();
        runtime.stageWordLedger.record(entry!);
        assigned.push(entry!.en);
      }
      expect(new Set(assigned).size).toBe(150);
      expect(new Set(assigned.slice(0, source.length))).toEqual(new Set(source.map(entry => entry.en)));
      if (pattern === "long-word") {
        expect(source).toHaveLength(24);
        const lengths = assigned.slice(24).map(text => typingText(text).length);
        expect(lengths).toEqual([...lengths].sort((a,b)=>b-a));
      }
    } finally { game.destroy(); }
  });
  it.each(["long-word","short-burst"] as const)("keeps the boss weak-point length rule after exhausting %s", pattern => {
    const entries = ["cat","sun","asteroids","spaceship","interstellar"].map(en=>({id:en,en,vi:"",ipa:""}));
    const game=createTestGame(entries);
    game.setExpansionEncounterContext({encounterId:"strict-weak",pattern,gameplaySeed:42});
    const state=game as unknown as Runtime & { pickBossEntry(mechanic: ReturnType<typeof createBossTypingMechanicState>): VocabularyEntry };
    const mechanic=createBossTypingMechanicState("cosmic","boss",1,difficultyFor({stage:100,vocabularyLevel:1,mode:"balanced",recentWpm:60,recentAccuracy:96}));
    try { for(let i=0;i<12;i++) expect(state.pickBossEntry(mechanic).en.length).toBeGreaterThanOrEqual(9); }
    finally {game.destroy();}
  });
});
