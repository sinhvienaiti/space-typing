import { describe, expect, it } from "vitest";
import {
  signDuelSessionToken,
  verifyDuelSessionToken,
} from "../server/duel/auth";

const SECRET =
  "test-secret-that-is-definitely-longer-than-32-characters";

describe("Duel WSS signed session auth", () => {
  it("verifies a valid short-lived signed identity", () => {
    const now = 2_000_000_000_000;
    const token = signDuelSessionToken(
      {
        sub: "account-1",
        name: "Pilot One",
        exp: Math.floor(now / 1000) + 300,
      },
      SECRET,
    );

    expect(
      verifyDuelSessionToken(token, SECRET, now),
    ).toEqual({
      accountId: "account-1",
      displayName: "Pilot One",
    });
  });

  it("rejects tampered signatures", () => {
    const now = 2_000_000_000_000;
    const token = signDuelSessionToken(
      {
        sub: "account-1",
        name: "Pilot One",
        exp: Math.floor(now / 1000) + 300,
      },
      SECRET,
    );
    const tampered =
      token.slice(0, -1) +
      (token.endsWith("a") ? "b" : "a");

    expect(
      verifyDuelSessionToken(tampered, SECRET, now),
    ).toBeNull();
  });

  it("rejects expired identities", () => {
    const now = 2_000_000_000_000;
    const token = signDuelSessionToken(
      {
        sub: "account-1",
        name: "Pilot One",
        exp: Math.floor(now / 1000) - 1,
      },
      SECRET,
    );

    expect(
      verifyDuelSessionToken(token, SECRET, now),
    ).toBeNull();
  });

  it("requires a production-strength shared secret", () => {
    expect(() =>
      signDuelSessionToken(
        {
          sub: "account-1",
          name: "Pilot One",
          exp: 9_999_999_999,
        },
        "too-short",
      ),
    ).toThrow(/32 characters/);
  });
});
