import { describe, expect, it } from "vitest";
import {
  parseQaCapability,
  type QaCapability,
  type QaEnvironment,
} from "../src/admin/qa-session";

const sessionId = "qa-validity-session";
const environment: QaEnvironment = "development";
const now = Date.UTC(2026, 9, 6, 0, 0, 0);

function capability(patch: Partial<QaCapability> = {}): QaCapability {
  return {
    version: 1,
    id: "qa-validity-capability",
    gameId: "space-typing",
    environment,
    targetSessionId: sessionId,
    actorId: "admin:review",
    issuedAtMs: now - 1_000,
    expiresAtMs: now + 60_000,
    generation: 1,
    overrides: {},
    ...patch,
  };
}

describe("QA capability validity window", () => {
  it("rejects a capability before its issue time", () => {
    expect(() =>
      parseQaCapability(
        capability({
          issuedAtMs: now + 1,
          expiresAtMs: now + 60_000,
        }),
        sessionId,
        environment,
        now,
      ),
    ).toThrow(/invalid, expired, or out of scope/);
  });

  it("accepts the exact issue-time boundary", () => {
    expect(
      parseQaCapability(
        capability({ issuedAtMs: now }),
        sessionId,
        environment,
        now,
      ).issuedAtMs,
    ).toBe(now);
  });

  it("continues to reject the exact expiry boundary", () => {
    expect(() =>
      parseQaCapability(
        capability({ issuedAtMs: now - 1_000, expiresAtMs: now }),
        sessionId,
        environment,
        now,
      ),
    ).toThrow(/invalid, expired, or out of scope/);
  });
});
