import { describe, expect, it } from "vitest";
import { DUEL_ACTIONS_BY_ID } from "../src/duel/actions";
import { DuelOfferDraft } from "../src/duel/draft";
import { DuelEngine } from "../src/duel/engine";
import {
  DUEL_TYPING_LENGTHS,
  DUEL_TYPING_LEXICON,
  validateDuelTypingLexicon,
} from "../src/duel/word-lexicon";

describe("Duel FINAL V4 typing prompt director", () => {
  it("ships at least 64 curated unique ASCII words for every used length bucket", () => {
    expect(validateDuelTypingLexicon()).toEqual([]);

    for (const length of DUEL_TYPING_LENGTHS) {
      const words = DUEL_TYPING_LEXICON.filter(
        (entry) => entry.length === length,
      );
      expect(words.length).toBeGreaterThanOrEqual(64);
      expect(
        new Set(words.map((entry) => entry.token)).size,
      ).toBe(words.length);
      expect(
        words.every(
          (entry) =>
            /^[a-z]+$/.test(entry.token) &&
            entry.token.length === length,
        ),
      ).toBe(true);
    }
  });

  it("keeps action draft deterministic while issuing deterministic instance prompts from a separate stream", () => {
    const left = new DuelOfferDraft({ seed: 22026 });
    const right = new DuelOfferDraft({ seed: 22026 });

    const a = left.dealPrivateOffers("player-1", "war");
    const b = right.dealPrivateOffers("player-1", "war");

    expect(a.map((offer) => offer.actionId)).toEqual(
      b.map((offer) => offer.actionId),
    );
    expect(
      a.map((offer) => offer.typingPrompt?.answerToken),
    ).toEqual(
      b.map((offer) => offer.typingPrompt?.answerToken),
    );
    expect(
      a.every(
        (offer) =>
          offer.typingPrompt !== undefined &&
          offer.typingPrompt.promptId.startsWith(
            offer.instanceId + ":prompt:",
          ),
      ),
    ).toBe(true);
  });

  it("varies the typed word across repeated instances of the same action without changing action identity", () => {
    const laser = DUEL_ACTIONS_BY_ID.get("laser")!;
    const draft = new DuelOfferDraft({
      seed: 9981,
      actions: [laser],
      enabledCategories: ["attack"],
    });
    const seen = new Set<string>();

    let active = [];
    for (let index = 0; index < 24; index += 1) {
      const offer = draft.refillPrivateOffer(
        "player-1",
        0,
        "war",
        active,
      );
      expect(offer).not.toBeNull();
      expect(offer?.actionId).toBe("laser");
      expect(offer?.typingPrompt?.answerToken).toHaveLength(
        laser.answerToken.length,
      );
      seen.add(offer!.typingPrompt!.answerToken);
      active = [];
    }

    expect(seen.size).toBeGreaterThanOrEqual(20);
    expect(draft.wordDiagnostics().hardExhaustion).toBe(0);
  });

  it("never introduces a new private word that matches an in-progress acquisition prefix", () => {
    const draft = new DuelOfferDraft({ seed: 411 });
    const initial = draft.dealPrivateOffers(
      "player-1",
      "skirmish",
    );
    expect(initial).toHaveLength(5);

    const refill = draft.refillPrivateOffer(
      "player-1",
      2,
      "skirmish",
      initial.filter((offer) => offer.slotIndex !== 2),
      {},
      "co",
    );
    expect(refill).not.toBeNull();
    expect(
      refill!.typingPrompt!.answerToken.startsWith("co"),
    ).toBe(false);
  });

  it("preserves the exact prompt through target lock, typing miss and cancel", () => {
    const draft = new DuelOfferDraft({ seed: 818 });
    const [offer] = draft.dealPrivateOffers(
      "player-1",
      "build",
      1,
    );
    expect(offer?.typingPrompt).toBeDefined();

    const engine = new DuelEngine();
    engine.setPrivateOffers("player-1", [offer!]);
    const before = engine.snapshot().players["player-1"].offers[0]!
      .typingPrompt!;

    engine.enqueueIntent({
      type: "SELECT_TARGET",
      playerId: "player-1",
      sequence: 1,
      targetInstanceId: offer!.instanceId,
    });
    engine.enqueueIntent({
      type: "TYPE_CHAR",
      playerId: "player-1",
      sequence: 2,
      char: "z",
      targetInstanceId: offer!.instanceId,
    });
    engine.enqueueIntent({
      type: "CANCEL_TARGET",
      playerId: "player-1",
      sequence: 3,
      targetInstanceId: offer!.instanceId,
    });
    engine.step(0);

    const after = engine.snapshot().players["player-1"].offers[0]!
      .typingPrompt!;
    expect(after).toEqual(before);
  });
});
