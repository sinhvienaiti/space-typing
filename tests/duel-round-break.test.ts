import { describe, expect, it } from "vitest";
import { DuelLocalPracticeMatch } from "../src/duel/local-match";
import { createPracticeDuelRoom } from "../src/duel/room";
import { DUEL_ROUND_BREAK_SECONDS } from "../src/duel/presentation-timing";

function practice(seed: number) {
  const room = createPracticeDuelRoom({
    roomId: "BREAK",
    participantId: "human",
    displayName: "Pilot",
    mapId: "frost-wastes",
    bot: { wpm: 95, accuracy: 0.99, reactionMs: 90, personality: "aggro" },
  }).snapshot();
  return new DuelLocalPracticeMatch({ room, seed });
}

describe("Duel between-round break", () => {
  it("holds the finished round for the K.O./result break, ignores keys, then deals the next round", () => {
    const match = practice(4242);
    let update = match.initial();
    let ended = false;
    for (let step = 0; step < 4000 && !ended; step += 1) {
      update = match.tick(0.5);
      ended = update.events.some((event) => event.type === "round-ended");
    }
    expect(ended).toBe(true);
    if (match.isFinished()) return; // a Bo1 room would end the series here
    const finishedRound = update.view.roundId;
    expect(update.view.round.status).not.toBe("active");

    expect(match.sendIntent({ type: "TYPE_CHAR", char: "a" })).toBeNull();
    const elapsed = update.view.elapsedSeconds;
    const held = match.tick(DUEL_ROUND_BREAK_SECONDS - 0.5);
    expect(held.view.roundId).toBe(finishedRound);
    expect(held.events).toEqual([]);
    expect(held.view.elapsedSeconds).toBe(elapsed);

    const next = match.tick(0.5);
    expect(next.view.roundId).not.toBe(finishedRound);
    expect(next.view.round.status).toBe("active");
    expect(match.sendIntent({ type: "TYPE_CHAR", char: "a" })).not.toBeNull();
  });
});
