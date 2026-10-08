import { describe, expect, it } from "vitest";
import alternativeModesContract from "../contracts/space-typing-admin-alternative-modes.v1.json";

describe("Space Typing Admin Alternative Modes contract", () => {
  it("reports Reflex and Word Chain as runtime-absent prototypes", () => {
    expect(alternativeModesContract.capability).toBe("alternative-modes.read");
    expect(alternativeModesContract.route).toEqual({
      id: "alternative-modes",
      path: "/admin/space-typing/alternative-modes",
      label: "Alternative Modes",
    });
    expect(alternativeModesContract.alternativeModes).toMatchObject({
      mode: "runtime-absence-diagnostic",
      supportedDuelMatchModes: ["friend", "ranked", "practice"],
      requestedPrototypeModes: ["reflex", "word-chain"],
      runtimeImplementations: { reflex: false, "word-chain": false },
      authorableFields: [],
      writeCapability: false,
      previewCapability: false,
      rankedAdmissionCapability: false,
      persistenceOwner: "none",
      applyBoundary: "none",
    });
  });

  it("keeps legacy mock controls explicitly unsupported", () => {
    expect(alternativeModesContract.alternativeModes.unsupportedAdminMockFields).toEqual(
      expect.arrayContaining([
        "reactionWindowMs",
        "roundDamage",
        "challengePool",
        "botReactionMs",
        "practiceEnabled",
        "friendRoomEnabled",
        "rankedEnabled",
        "beatWindowMs",
        "penaltyDamage",
        "lexicon",
        "chainRule",
      ]),
    );
  });
});
