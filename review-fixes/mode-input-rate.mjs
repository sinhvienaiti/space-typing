import fs from "node:fs";

function replaceUnique(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Duplicate ${label}`);
  }
  return source.replace(before, after);
}

const authorityPath = "src/duel/authority.ts";
let authority = fs.readFileSync(authorityPath, "utf8");
authority = replaceUnique(
  authority,
  `    if (session === undefined) {\n      return this.error("SESSION_NOT_FOUND", "Duel session does not exist.");\n    }\n    if (match === undefined) {\n      return this.error("MATCH_NOT_FOUND", "Duel match does not exist.");\n    }`,
  `    if (session === undefined) {\n      return this.error("SESSION_NOT_FOUND", "Duel session does not exist.");\n    }\n    // MODE_INPUT intentionally bypasses the WebSocket-level message limiter so\n    // it is charged exactly once here. Charge immediately after authentication\n    // so malformed/stale/unknown-match packets cannot bypass anti-abuse limits.\n    const rate = this.acceptMessage(sessionId, input.now);\n    if (!rate.ok) return rate;\n    if (match === undefined) {\n      return this.error("MATCH_NOT_FOUND", "Duel match does not exist.");\n    }`,
  "mode input early rate limit",
);
authority = replaceUnique(
  authority,
  `    const rate = this.acceptMessage(sessionId, input.now);\n    if (!rate.ok) return rate;\n    const payload = parsed.value.payload;`,
  `    const payload = parsed.value.payload;`,
  "mode input old late rate limit",
);
fs.writeFileSync(authorityPath, authority);

fs.writeFileSync(
  "tests/duel-mode-input-rate-limit.test.ts",
  `import { describe, expect, it } from "vitest";\nimport {\n  DuelAuthorityService,\n  type DuelAuthorityDependencies,\n} from "../src/duel/authority";\nimport { DUEL_PROTOCOL_VERSION } from "../src/duel/protocol";\n\nfunction deps(): DuelAuthorityDependencies {\n  let token = 0;\n  return {\n    authenticate(sessionToken) {\n      return sessionToken === "auth:user"\n        ? { accountId: "user", displayName: "Pilot" }\n        : null;\n    },\n    token() { return \`token-\${++token}\`; },\n    roomId() { return "ROOM-1"; },\n    matchId() { return "MATCH-1"; },\n    seed() { return 1; },\n  };\n}\n\ndescribe("Duel MODE_INPUT anti-abuse boundary", () => {\n  it("charges rejected packets before match/envelope validation", () => {\n    const authority = new DuelAuthorityService(deps(), {\n      maxMessagesPerSecond: 2,\n    });\n    const opened = authority.openSession({\n      protocolVersion: DUEL_PROTOCOL_VERSION,\n      sessionToken: "auth:user",\n      now: 1_000,\n    });\n    if (!opened.ok) throw new Error(opened.message);\n\n    const invalid = {\n      matchId: "missing-match",\n      roundId: "missing-round",\n      envelope: {\n        gameMode: "reflex",\n        modeEpoch: 1,\n        inputId: "spam",\n        clientSequence: 0,\n        kind: "mode-input",\n        payload: { type: "TYPE_CHAR", char: "x" },\n      },\n      now: 1_100,\n    } as const;\n\n    expect(authority.submitModeInput(opened.value.sessionId, invalid)).toMatchObject({\n      ok: false,\n      code: "MATCH_NOT_FOUND",\n    });\n    expect(authority.submitModeInput(opened.value.sessionId, invalid)).toMatchObject({\n      ok: false,\n      code: "MATCH_NOT_FOUND",\n    });\n    expect(authority.submitModeInput(opened.value.sessionId, invalid)).toMatchObject({\n      ok: false,\n      code: "RATE_LIMITED",\n    });\n  });\n});\n`,
);
