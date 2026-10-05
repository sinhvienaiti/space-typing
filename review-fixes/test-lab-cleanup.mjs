import fs from "node:fs";

function replaceUnique(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Duplicate ${label}`);
  }
  return source.replace(before, after);
}

const path = "src/test-lab/controller.ts";
let source = fs.readFileSync(path, "utf8");

source = replaceUnique(
  source,
  `  const testLabFocusTokens: Partial<Record<"pronunciation" | "announcer" | "warning", AudioFocusToken>> = {};\n  let inspectorTimer = 0;`,
  `  const testLabFocusTokens: Partial<Record<"pronunciation" | "announcer" | "warning", AudioFocusToken>> = {};\n  let rapidPronunciationTimers: number[] = [];\n\n  function clearRapidPronunciationTimers(): void {\n    for (const timer of rapidPronunciationTimers) window.clearTimeout(timer);\n    rapidPronunciationTimers = [];\n  }\n\n  function releaseTestLabFocus(): void {\n    for (const token of Object.values(testLabFocusTokens)) {\n      if (token !== undefined) sharedAudioFocus.release(token);\n    }\n    delete testLabFocusTokens.announcer;\n    delete testLabFocusTokens.pronunciation;\n    delete testLabFocusTokens.warning;\n  }\n\n  function cleanupTransientAudioQa(): void {\n    clearRapidPronunciationTimers();\n    releaseTestLabFocus();\n  }\n\n  let inspectorTimer = 0;`,
  "Test Lab transient audio cleanup helpers",
);

source = replaceUnique(
  source,
  `      const first = inputValue(dialog, '[data-field="pronunciation-text"]') || "checkpoint";\n      [first, "shield", "reactor"].forEach((text, index) => {\n        window.setTimeout(() => speakEnglish(text, settings), index * 120);\n      });`,
  `      const first = inputValue(dialog, '[data-field="pronunciation-text"]') || "checkpoint";\n      clearRapidPronunciationTimers();\n      rapidPronunciationTimers = [first, "shield", "reactor"].map((text, index) =>\n        window.setTimeout(() => speakEnglish(text, settings), index * 120),\n      );`,
  "rapid pronunciation timeout ownership",
);

source = replaceUnique(
  source,
  `    if (action === "release-ducks") {\n      for (const token of Object.values(testLabFocusTokens)) {\n        if (token !== undefined) sharedAudioFocus.release(token);\n      }\n      delete testLabFocusTokens.announcer;\n      delete testLabFocusTokens.pronunciation;\n      delete testLabFocusTokens.warning;\n      renderInspector();`,
  `    if (action === "release-ducks") {\n      releaseTestLabFocus();\n      renderInspector();`,
  "manual focus release",
);

source = replaceUnique(
  source,
  `  dialog.addEventListener("close", () => {\n    destroyRuntime();\n    audioQa?.destroy();`,
  `  dialog.addEventListener("close", () => {\n    cleanupTransientAudioQa();\n    destroyRuntime();\n    audioQa?.destroy();`,
  "dialog close cleanup",
);

source = replaceUnique(
  source,
  `    destroy(): void {\n      destroyRuntime();\n      audioQa?.destroy();`,
  `    destroy(): void {\n      cleanupTransientAudioQa();\n      destroyRuntime();\n      audioQa?.destroy();`,
  "controller destroy cleanup",
);

fs.writeFileSync(path, source);

fs.writeFileSync(
  "tests/test-lab-audio-lifecycle-contract.test.ts",
  `import { readFileSync } from "node:fs";\nimport { describe, expect, it } from "vitest";\n\nconst source = readFileSync(\n  new URL("../src/test-lab/controller.ts", import.meta.url),\n  "utf8",\n);\n\ndescribe("Test Lab transient audio lifecycle contract", () => {\n  it("owns and clears rapid pronunciation timers", () => {\n    expect(source).toContain("function clearRapidPronunciationTimers(): void");\n    expect(source).toContain("clearRapidPronunciationTimers();\\n      rapidPronunciationTimers = [first");\n  });\n\n  it("releases Test Lab focus on manual release, dialog close, and destroy", () => {\n    expect(source).toContain("function releaseTestLabFocus(): void");\n    expect(source).toContain('if (action === "release-ducks") {\\n      releaseTestLabFocus();');\n    expect(source).toContain('dialog.addEventListener("close", () => {\\n    cleanupTransientAudioQa();');\n    expect(source).toContain('destroy(): void {\\n      cleanupTransientAudioQa();');\n  });\n});\n`,
);
