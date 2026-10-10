import { expect, it } from "vitest";
import {
  createDefaultCampaignProgress,
  inputProfileKey,
  recordStageClear,
  sanitizeCampaignProgress,
} from "../src/campaign/progress";
import {
  createDifficultySettings,
  recordDifficultyResult,
  sanitizeDifficultySettings,
} from "../src/campaign/difficulty-settings";
import { SkillEngine } from "../src/skills/engine";
const best = {
  score: 100,
  accuracy: 90,
  wpm: 60,
  clearedAt: "2026-10-04T00:00:00Z",
};
it("old saves remain Typing; Voice and Hybrid cannot replace their best score", () => {
  let p = recordStageClear(createDefaultCampaignProgress(), 1, best);
  const key = inputProfileKey("voice", "combat", "balanced", 0, 1);
  p = recordStageClear(
    p,
    1,
    {
      ...best,
      inputMode: "voice",
      score: 999,
      accuracy: 0,
      wpm: 0,
      voiceWords: 10,
      voicePolicy: "space-voice-v2-effort1",
    },
    key,
  );
  expect(p.bestByStage["1"]).toEqual(best);
  expect(p.bestByInputProfile?.[key]?.["1"]?.score).toBe(999);
  const restored = sanitizeCampaignProgress(JSON.parse(JSON.stringify(p)));
  expect(restored.bestByInputProfile?.[key]?.["1"]).toMatchObject({
    inputMode: "voice",
    voiceWords: 10,
  });
  expect(
    sanitizeCampaignProgress({
      ...p,
      bestByStage: { 1: { ...best, score: Infinity } },
    }).bestByStage,
  ).toEqual({});
});
it("Voice measurements never train the old typing adaptive history", () => {
  const old = createDifficultySettings();
  const next = recordDifficultyResult(old, 0, 0, {
    mode: "voice",
    voiceWords: 20,
    elapsedSeconds: 120,
  });
  expect(next.profile).toEqual(old.profile);
  expect(next.inputProfiles?.voice).toMatchObject({
    encounters: 1,
    voiceWords: 20,
    elapsedSeconds: 120,
  });
  expect(
    sanitizeDifficultySettings(JSON.parse(JSON.stringify(next))).inputProfiles,
  ).toEqual(next.inputProfiles);
});
it("Voice unlocks combat skill conditions through its own effort without fake hit statistics", () => {
  const skills = new SkillEngine();
  skills.setDefinitions([
    {
      id: "test",
      name: "test",
      energyCost: 0,
      cooldown: 0,
      charges: null,
      perStageLimit: null,
      typingCondition: { minStreak: 20, minAccuracy: 95 },
    },
  ]);
  const base = {
    energy: 10,
    streak: 0,
    hits: 0,
    misses: 0,
    inputMode: "voice" as const,
    voiceWords: 0,
    voiceEffortStreak: 0,
  };
  expect(skills.canActivate("test", base)).toBe("typing-condition");
  expect(
    skills.canActivate("test", {
      ...base,
      voiceWords: 3,
      voiceEffortStreak: 20,
    }),
  ).toBeNull();
  expect(base.hits).toBe(0);
});
