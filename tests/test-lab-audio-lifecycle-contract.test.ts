import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../src/test-lab/controller.ts", import.meta.url),
  "utf8",
);

describe("Test Lab transient audio lifecycle contract", () => {
  it("owns and clears rapid pronunciation timers", () => {
    expect(source).toContain("function clearRapidPronunciationTimers(): void");
    expect(source).toContain("clearRapidPronunciationTimers();\n      rapidPronunciationTimers = [first");
  });

  it("releases Test Lab focus on manual release, dialog close, and destroy", () => {
    expect(source).toContain("function releaseTestLabFocus(): void");
    expect(source).toContain('if (action === "release-ducks") {\n      releaseTestLabFocus();');
    expect(source).toContain('dialog.addEventListener("close", () => {\n    cleanupTransientAudioQa();');
    expect(source).toContain('destroy(): void {\n      cleanupTransientAudioQa();');
  });
});
