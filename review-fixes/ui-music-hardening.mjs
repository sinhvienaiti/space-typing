import fs from "node:fs";

function replaceUnique(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Duplicate ${label}`);
  }
  return source.replace(before, after);
}

const uiPath = "src/duel/alternative-battle-ui.ts";
let ui = fs.readFileSync(uiPath, "utf8");
ui = replaceUnique(
  ui,
  `  const clock = createNode("strong", "duel-alternative-clock");\n  head.append(kicker, clock);`,
  `  const clock = createNode("strong", "duel-alternative-clock");\n  clock.setAttribute("aria-hidden", "true");\n  head.append(kicker, clock);`,
  "Alternative countdown accessibility",
);
ui = replaceUnique(
  ui,
  `    if (presentation.deadlineAtMs === null) {\n      clock.textContent = "";\n      return;\n    }`,
  `    if (presentation.deadlineAtMs === null) {\n      clock.textContent = "";\n      delete root.dataset.urgent;\n      return;\n    }`,
  "Alternative urgent reset without deadline",
);
ui = replaceUnique(
  ui,
  `      root.classList.add("hidden");\n      delete battle.dataset.alternativeMode;\n      stopTimer();`,
  `      root.classList.add("hidden");\n      delete battle.dataset.alternativeMode;\n      delete root.dataset.urgent;\n      stopTimer();`,
  "Alternative hidden urgent reset",
);
fs.writeFileSync(uiPath, ui);

const musicPath = "src/audio/music-profile.ts";
let music = fs.readFileSync(musicPath, "utf8");
music = replaceUnique(
  music,
  `    if (\n      profile.duckingProfile.pronunciation <= 0 ||\n      profile.duckingProfile.pronunciation > 1 ||\n      profile.duckingProfile.announcer <= 0 ||\n      profile.duckingProfile.announcer > 1 ||\n      profile.duckingProfile.warning <= 0 ||\n      profile.duckingProfile.warning > 1\n    ) {`,
  `    if (\n      !Number.isFinite(profile.duckingProfile.pronunciation) ||\n      profile.duckingProfile.pronunciation <= 0 ||\n      profile.duckingProfile.pronunciation > 1 ||\n      !Number.isFinite(profile.duckingProfile.announcer) ||\n      profile.duckingProfile.announcer <= 0 ||\n      profile.duckingProfile.announcer > 1 ||\n      !Number.isFinite(profile.duckingProfile.warning) ||\n      profile.duckingProfile.warning <= 0 ||\n      profile.duckingProfile.warning > 1\n    ) {`,
  "music ducking finite validation",
);
fs.writeFileSync(musicPath, music);

fs.writeFileSync(
  "tests/review-ui-music-hardening.test.ts",
  `import { readFileSync } from "node:fs";\nimport { describe, expect, it } from "vitest";\n\ndescribe("review UI/music hardening contracts", () => {\n  it("keeps the 100ms visual countdown out of aria-live announcements and clears urgent state", () => {\n    const source = readFileSync(\n      new URL("../src/duel/alternative-battle-ui.ts", import.meta.url),\n      "utf8",\n    );\n    expect(source).toContain('clock.setAttribute("aria-hidden", "true")');\n    expect(source.match(/delete root\.dataset\.urgent/g)?.length ?? 0).toBeGreaterThanOrEqual(2);\n  });\n\n  it("rejects non-finite music ducking values", () => {\n    const source = readFileSync(\n      new URL("../src/audio/music-profile.ts", import.meta.url),\n      "utf8",\n    );\n    expect(source).toContain("Number.isFinite(profile.duckingProfile.pronunciation)");\n    expect(source).toContain("Number.isFinite(profile.duckingProfile.announcer)");\n    expect(source).toContain("Number.isFinite(profile.duckingProfile.warning)");\n  });\n});\n`,
);
