import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../src/characters/registry";
import { DuelRoom, peekPracticeBotCharacter, randomDuelBotCharacter, takePracticeBotCharacter, createPracticeDuelRoom } from "../src/duel/room";

describe("Duel bot hulls", () => {
  it("picks valid random hulls, never the excluded one", () => {
    const seen = new Set<string>();
    for (let index = 0; index < 200; index += 1) {
      const id = randomDuelBotCharacter("vanguard");
      expect(CHARACTER_IDS).toContain(id);
      expect(id).not.toBe("vanguard");
      seen.add(id);
    }
    expect(seen.size).toBeGreaterThan(5);
  });

  it("gives room bots varied hulls across rooms, stable within a room", () => {
    const hulls = new Set<string>();
    for (let index = 0; index < 30; index += 1) {
      const room = createPracticeDuelRoom({ roomId: "room-" + index, participantId: "p1", displayName: "P1" });
      const hull = room.snapshot().slots[1].characterId;
      expect(CHARACTER_IDS).toContain(hull);
      hulls.add(hull!);
      // Re-configuring the bot keeps its hull.
      room.setBot({ requesterId: "p1", config: { wpm: 70, accuracy: 0.9, reactionMs: 300, personality: "balanced" } });
      expect(room.snapshot().slots[1].characterId).toBe(hull);
    }
    expect(hulls.size).toBeGreaterThan(3);
    expect(DuelRoom).toBeDefined();
  });

  it("uses the Practice bot hull picked when the lobby opened", () => {
    const early = peekPracticeBotCharacter("aegis");
    expect(peekPracticeBotCharacter("aegis")).toBe(early);
    expect(takePracticeBotCharacter("aegis")).toBe(early);
    expect(early).not.toBe("aegis");
  });
});
