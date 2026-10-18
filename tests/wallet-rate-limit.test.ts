import { describe, expect, it } from "vitest";
import { WalletRateLimit } from "../cloud/src/wallet-rate-limit";

describe("wallet request budget", () => {
  it("allows 30 operations per account per minute without any database call", () => {
    const limit = new WalletRateLimit();
    for (let n = 0; n < 30; n++) limit.hit("a", 1000 + n);
    expect(() => limit.hit("a", 60_999)).toThrow(expect.objectContaining({ status: 429, code: "rate-limited" }));
    expect(() => limit.hit("b", 2000)).not.toThrow();
    expect(() => limit.hit("a", 61_000)).not.toThrow();
  });
});
