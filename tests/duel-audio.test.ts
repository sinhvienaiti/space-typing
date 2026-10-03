import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DuelCombatAudioRouter,
  duelAudioPresentationKey,
  duelCombatAudioCues,
  duelMusicProfileForMap,
  duelMusicStateForPhase,
} from "../src/duel/audio";
import { DUEL_MAPS } from "../src/duel/maps";
import { DUEL_KO_TIMELINE, duelProjectileTravelMs } from "../src/duel/presentation-timing";
import { DuelLocalPracticeMatch } from "../src/duel/local-match";
import { createPracticeDuelRoom } from "../src/duel/room";

function practiceView() {
  const room = createPracticeDuelRoom({
    roomId: "AUDIO",
    participantId: "human",
    displayName: "Pilot",
    mapId: "frost-wastes",
    bot: {
      wpm: 70,
      accuracy: 0.96,
      reactionMs: 120,
      personality: "balanced",
    },
  }).snapshot();
  return new DuelLocalPracticeMatch({
    room,
    seed: 919,
  }).initial().view;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Duel map audio presentation", () => {
  it("maps every Duel map to an existing themed world profile while preserving Duel audio identity", () => {
    for (const map of Object.values(DUEL_MAPS)) {
      const profile = duelMusicProfileForMap(map.id);
      expect(profile.id).toBe(map.audioProfileId);
      expect(profile.worldId).toBe("duel-" + map.id);
      expect(profile.baseTrack.defaultPath).toBe(
        "/assets/audio/duel/music/duel-nebula-calm.ogg",
      );
      expect(profile.intenseTrackOrLayer.defaultPath).toBe(
        "/assets/audio/duel/music/duel-combat-intense.ogg",
      );
      expect(profile.ambientLayers.length).toBeGreaterThan(0);
      expect(profile.preloadHints.length).toBeGreaterThan(0);
    }
  });

  it("keeps early Duel calm and escalates War/Crisis/Cataclysm without changing gameplay", () => {
    expect(duelMusicStateForPhase("build")).toBe(
      "WORLD_NORMAL",
    );
    expect(duelMusicStateForPhase("skirmish")).toBe(
      "WORLD_NORMAL",
    );
    expect(duelMusicStateForPhase("war")).toBe(
      "WORLD_INTENSE",
    );
    expect(duelMusicStateForPhase("crisis")).toBe(
      "WORLD_INTENSE",
    );
    expect(duelMusicStateForPhase("cataclysm")).toBe(
      "GALAXY_BOSS",
    );
  });

  it("changes presentation key only when map identity or audio intensity changes", () => {
    expect(
      duelAudioPresentationKey(
        "frost-wastes",
        "build",
      ),
    ).toBe("duel-frost:WORLD_NORMAL");
    expect(
      duelAudioPresentationKey(
        "frost-wastes",
        "skirmish",
      ),
    ).toBe("duel-frost:WORLD_NORMAL");
    expect(
      duelAudioPresentationKey(
        "frost-wastes",
        "war",
      ),
    ).toBe("duel-frost:WORLD_INTENSE");
    expect(
      duelAudioPresentationKey(
        "celestial-void",
        "war",
      ),
    ).toBe("duel-void:WORLD_INTENSE");
  });
});


describe("Duel projectile presentation timing", () => {
  it("keeps one deterministic visual/audio travel clock", () => {
    // 860 ms since 2026-10-03: 720 ms read as a flash across the wide arena.
    expect(duelProjectileTravelMs(1)).toBe(860);
    expect(duelProjectileTravelMs(2)).toBe(430);
    expect(duelProjectileTravelMs(0.25)).toBe(1720); // speed scale floors at 0.5
    expect(duelProjectileTravelMs(Number.NaN)).toBe(860);
  });
});

describe("Duel combat SFX routing", () => {
  it("plays primary impact only when the authority confirms the hit", () => {
    const view = practiceView();
    expect(duelCombatAudioCues(view, [
      { type: "cannon-fired", playerId: "player-1", shotId: "cannon:1", travelMs: 360 },
    ])).toEqual([{ cue: "laser-launch", delayMs: 0, side: "self" }]);
    expect(duelCombatAudioCues(view, [
      { type: "cannon-hit", playerId: "player-1", targetPlayerId: "player-2", shotId: "cannon:1" },
    ])).toEqual([{ cue: "energy-impact", delayMs: 0, side: "opponent" }]);
  });

  it("does not delay a resolved incoming threat by a second projectile flight", () => {
    expect(duelCombatAudioCues(practiceView(), [{
      type: "threat-resolved", threatId: "threat:audio", sourcePlayerId: "player-2",
      targetPlayerId: "player-1", actionId: "siege-lance",
    }])).toEqual([{ cue: "heavy-impact", delayMs: 0, side: "self" }]);
  });

  it("maps confirmed attack events to launch plus impact on the projectile timeline", () => {
    const view = practiceView();
    const cues = duelCombatAudioCues(view, [
      {
        type: "action-fired",
        playerId: "player-1",
        actionId: "laser",
      },
    ]);

    expect(cues).toEqual([
      {
        cue: "laser-launch",
        delayMs: 0,
        side: "self",
      },
      {
        cue: "energy-impact",
        delayMs: 860,
        side: "self",
      },
    ]);
  });

  it("prioritizes incoming threat/intercept/result signals without exposing private opponent words", () => {
    const view = practiceView();
    const cues = duelCombatAudioCues(view, [
      {
        type: "threat-created",
        threat: {
          id: "threat:audio",
          sourcePlayerId: "player-2",
          targetPlayerId: "player-1",
          actionId: "siege-lance",
          displayLabel: "INTERCEPT",
          answerToken: "intercept",
          typedPrefix: "",
          counterTags: ["intercept"],
          remainingSeconds: 2.8,
          effectScale: 1,
          status: "open",
        },
      },
      {
        type: "threat-countered",
        threatId: "threat:audio",
        sourcePlayerId: "player-2",
        targetPlayerId: "player-1",
        actionId: "siege-lance",
      },
      {
        type: "round-ended",
        result: {
          status: "won",
          winnerId: "player-1",
        },
      },
    ]);

    // A won round plays the K.O. chain, the final blast, the result
    // stinger once the card shows, then the next-round call.
    expect(cues.map((cue) => cue.cue)).toEqual([
      "warning",
      "intercept",
      ...DUEL_KO_TIMELINE.chainMs.map(() => "ko-blast"),
      "ko-final",
      "round-win",
      "round-ready",
    ]);
    expect(cues.find((cue) => cue.cue === "ko-final")).toMatchObject({ side: "opponent", delayMs: DUEL_KO_TIMELINE.finalMs });
    expect(cues.find((cue) => cue.cue === "round-win")?.delayMs).toBe(DUEL_KO_TIMELINE.bannerMs);
  });

  it("deduplicates replayed presentation updates and cancels delayed impact tails on reset", () => {
    vi.useFakeTimers();
    const view = practiceView();
    const played: string[] = [];
    const router = new DuelCombatAudioRouter((cue) => {
      played.push(cue.cue);
    });
    const events = [
      {
        type: "action-fired" as const,
        playerId: "player-1" as const,
        actionId: "missile",
      },
    ];

    router.consume(view, events);
    router.consume(view, events);
    expect(played).toEqual(["missile-launch"]);

    router.reset("next-round");
    vi.advanceTimersByTime(1000);
    expect(played).toEqual(["missile-launch"]);
    router.destroy();
  });
});
