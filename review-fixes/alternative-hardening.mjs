import fs from "node:fs";

function replaceUnique(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Duplicate ${label}`);
  }
  return source.replace(before, after);
}

for (const path of ["src/duel/reflex.ts", "src/duel/word-chain.ts"]) {
  let source = fs.readFileSync(path, "utf8");
  source = replaceUnique(
    source,
    `function exactKeys(value: JsonObject, allowed: readonly string[]): boolean {\n  const set = new Set(allowed);\n  return Object.keys(value).every((key) => set.has(key));\n}\n`,
    `const TYPE_CHAR_KEYS: ReadonlySet<string> = new Set(["type", "char"]);\nconst TYPE_ONLY_KEYS: ReadonlySet<string> = new Set(["type"]);\n\nfunction exactKeys(value: JsonObject, allowed: ReadonlySet<string>): boolean {\n  return Object.keys(value).every((key) => allowed.has(key));\n}\n`,
    `${path} exact key allowlist`,
  );
  source = source
    .replaceAll(`exactKeys(value, ["type", "char"])`, `exactKeys(value, TYPE_CHAR_KEYS)`)
    .replaceAll(`exactKeys(value, ["type"])`, `exactKeys(value, TYPE_ONLY_KEYS)`);
  fs.writeFileSync(path, source);
}

const challengePath = "server/duel/reflex/challenge-bank.ts";
let challenge = fs.readFileSync(challengePath, "utf8");
challenge = replaceUnique(
  challenge,
  `  const durationMs = Math.max(2_000, Math.min(60_000, input.durationMs ?? 12_000));`,
  `  const requestedDurationMs = input.durationMs;\n  const durationMs =\n    typeof requestedDurationMs === "number" && Number.isFinite(requestedDurationMs)\n      ? Math.max(2_000, Math.min(60_000, requestedDurationMs))\n      : 12_000;`,
  "Reflex finite duration",
);
fs.writeFileSync(challengePath, challenge);

const runtimePath = "server/duel/alternative-match-runtime.ts";
let runtime = fs.readFileSync(runtimePath, "utf8");
runtime = replaceUnique(
  runtime,
  `    this.reflexChallengeIndex = Math.max(\n      0,\n      Math.trunc(input.challengeIndex ?? 0),\n    );`,
  `    this.reflexChallengeIndex =\n      typeof input.challengeIndex === "number" && Number.isFinite(input.challengeIndex)\n        ? Math.max(0, Math.trunc(input.challengeIndex))\n        : 0;`,
  "Alternative finite challenge index",
);
fs.writeFileSync(runtimePath, runtime);

const chainPath = "server/duel/word-chain/authority.ts";
let chain = fs.readFileSync(chainPath, "utf8");
chain = replaceUnique(
  chain,
  `    const duration = Math.max(2_000, Math.min(60_000, this.beatDurationMs));`,
  `    const duration = Number.isFinite(this.beatDurationMs)\n      ? Math.max(2_000, Math.min(60_000, this.beatDurationMs))\n      : 12_000;`,
  "Word Chain finite beat duration",
);
fs.writeFileSync(chainPath, chain);

const serverPath = "server/duel/ws-server.ts";
let server = fs.readFileSync(serverPath, "utf8");
server = replaceUnique(
  server,
  `      if (!result.ok) {\n        activeMatches.delete(matchId);\n        roomList.notifyChanged();\n        continue;\n      }`,
  `      if (!result.ok) {\n        activeMatches.delete(matchId);\n        disposeAlternativeMatch(matchId);\n        roomList.notifyChanged();\n        continue;\n      }`,
  "Alternative tick error cleanup",
);
fs.writeFileSync(serverPath, server);

fs.writeFileSync(
  "tests/duel-alternative-hardening.test.ts",
  `import { readFileSync } from "node:fs";\nimport { describe, expect, it } from "vitest";\nimport { createReviewedReflexChallenge } from "../server/duel/reflex/challenge-bank";\nimport { WordChainAuthority } from "../server/duel/word-chain/authority";\nimport { DuelModeRuntime, type DuelModeCombatPort } from "../server/duel/mode-runtime";\n\nconst noopCombat: DuelModeCombatPort = { scheduleModeAttack() {} };\n\ndescribe("Alternative mode boundary hardening", () => {\n  it("falls back to finite default challenge/beat durations", () => {\n    const reflex = createReviewedReflexChallenge({\n      index: 0,\n      modeEpoch: 1,\n      issuedAtMs: 1_000,\n      durationMs: Number.NaN,\n    });\n    expect(reflex.publicChallenge.deadlineAtMs).toBe(13_000);\n\n    const chain = new WordChainAuthority(\n      new DuelModeRuntime(noopCombat),\n      "practice",\n      Number.NaN,\n    );\n    const beat = chain.start(2_000);\n    expect(beat.deadlineAtMs).toBe(14_000);\n  });\n\n  it("keeps mode parser allowlists module-scoped instead of allocating per keypress", () => {\n    for (const path of ["../src/duel/reflex.ts", "../src/duel/word-chain.ts"]) {\n      const source = readFileSync(new URL(path, import.meta.url), "utf8");\n      expect(source).toContain("const TYPE_CHAR_KEYS");\n      expect(source).toContain("const TYPE_ONLY_KEYS");\n      expect(source).not.toContain("const set = new Set(allowed)");\n    }\n  });\n\n  it("disposes alternative runtime when the authoritative tick fails", () => {\n    const source = readFileSync(\n      new URL("../server/duel/ws-server.ts", import.meta.url),\n      "utf8",\n    );\n    expect(source).toContain(\n      "if (!result.ok) {\\n        activeMatches.delete(matchId);\\n        disposeAlternativeMatch(matchId);",\n    );\n  });\n});\n`,
);
