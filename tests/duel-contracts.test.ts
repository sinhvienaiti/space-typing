import { describe, expect, it } from "vitest";
import {
  DUEL_ACTIONS,
  DUEL_ACTIONS_BY_ID,
  validateDuelActionDefinitions,
} from "../src/duel/actions";
import {
  DUEL_HARD_OVERTIME_SECONDS,
  DUEL_INVENTORY_CAPACITY,
  DUEL_PRIVATE_OFFER_COUNT,
  DUEL_SHARED_OBJECTIVE_LANES,
  duelPhaseForProgress,
  duelRegulationProgress,
  type DuelActionOffer,
} from "../src/duel/model";
import {
  acquireDuelOfferByPrefix,
  duelCharacterFromKeyboardInput,
  hasDuelTokenPrefixConflict,
  normalizeDuelAnswerToken,
} from "../src/duel/typing";
import {
  DUEL_RNG_DOMAINS,
  DuelRngStreams,
} from "../src/duel/rng";

describe("Duel FINAL V3 contracts", () => {
  it("keeps the approved offer and inventory defaults", () => {
    expect(DUEL_PRIVATE_OFFER_COUNT).toBe(3);
    expect(DUEL_SHARED_OBJECTIVE_LANES).toBe(1);
    expect(DUEL_INVENTORY_CAPACITY).toEqual({
      attack: 3,
      defense: 2,
      tactical: 2,
    });
    expect(DUEL_HARD_OVERTIME_SECONDS).toBe(45);
  });

  it("uses normalized a-z answer tokens without sentence grammar input", () => {
    expect(normalizeDuelAnswerToken("BLACK HOLE")).toBe("blackhole");
    expect(normalizeDuelAnswerToken("LOCK-ON")).toBe("lockon");
    expect(normalizeDuelAnswerToken("ÉNERGY!")).toBe("energy");
    expect(validateDuelActionDefinitions()).toEqual([]);
  });

  it("covers all six approved word categories through ActionDefinition", () => {
    expect(new Set(DUEL_ACTIONS.map((action) => action.category))).toEqual(
      new Set([
        "attack",
        "defense",
        "support",
        "tactical",
        "fate",
        "mystery",
      ]),
    );
  });

  it("rejects composing, repeat and modifier keyboard input", () => {
    expect(duelCharacterFromKeyboardInput({ key: "A" })).toBe("a");
    expect(
      duelCharacterFromKeyboardInput({ key: "a", isComposing: true }),
    ).toBeNull();
    expect(
      duelCharacterFromKeyboardInput({ key: "a", repeat: true }),
    ).toBeNull();
    expect(
      duelCharacterFromKeyboardInput({ key: "a", metaKey: true }),
    ).toBeNull();
    expect(duelCharacterFromKeyboardInput({ key: " " })).toBeNull();
  });

  it("acquires only an unambiguous available target prefix", () => {
    const offers: DuelActionOffer[] = [
      {
        instanceId: "offer-1",
        actionId: "laser",
        ownerId: "player-1",
        status: "available",
        typedPrefix: "",
        slotIndex: 0,
        shared: false,
      },
      {
        instanceId: "offer-2",
        actionId: "lock-on",
        ownerId: "player-1",
        status: "available",
        typedPrefix: "",
        slotIndex: 1,
        shared: false,
      },
    ];
    expect(
      acquireDuelOfferByPrefix("l", offers, DUEL_ACTIONS_BY_ID),
    ).toBeNull();
    expect(
      acquireDuelOfferByPrefix("la", offers, DUEL_ACTIONS_BY_ID)
        ?.instanceId,
    ).toBe("offer-1");
  });

  it("detects token prefix conflicts for deterministic fallback", () => {
    expect(hasDuelTokenPrefixConflict(["laser", "repair"])).toBe(false);
    expect(hasDuelTokenPrefixConflict(["scan", "scanner"])).toBe(true);
  });

  it("uses percentage pacing for 3/4/5 minute rooms", () => {
    expect(duelPhaseForProgress(0)).toBe("build");
    expect(duelPhaseForProgress(0.25)).toBe("skirmish");
    expect(duelPhaseForProgress(0.5)).toBe("war");
    expect(duelPhaseForProgress(0.8)).toBe("crisis");
    expect(duelPhaseForProgress(1)).toBe("cataclysm");

    expect(
      duelPhaseForProgress(duelRegulationProgress(45, 180)),
    ).toBe("skirmish");
    expect(
      duelPhaseForProgress(duelRegulationProgress(60, 240)),
    ).toBe("skirmish");
    expect(
      duelPhaseForProgress(duelRegulationProgress(75, 300)),
    ).toBe("skirmish");
  });

  it("separates deterministic RNG domains", () => {
    expect(DUEL_RNG_DOMAINS).toContain("word-offers");
    expect(DUEL_RNG_DOMAINS).toContain("mystery");
    expect(DUEL_RNG_DOMAINS).toContain("bot-behavior");

    const a = new DuelRngStreams(12345, "v3");
    const b = new DuelRngStreams(12345, "v3");
    expect(a.domain("word-offers").nextUint32()).toBe(
      b.domain("word-offers").nextUint32(),
    );
    expect(a.domain("mystery").nextUint32()).not.toBe(
      a.domain("word-offers").nextUint32(),
    );
  });

  it("requires a deterministic response opportunity for strong attacks", () => {
    const invalid = {
      ...DUEL_ACTIONS_BY_ID.get("siege-lance")!,
      responseOpportunity: undefined,
    };
    expect(validateDuelActionDefinitions([invalid])).toContain(
      "siege-lance: strong attack requires a deterministic response opportunity.",
    );
  });
});
