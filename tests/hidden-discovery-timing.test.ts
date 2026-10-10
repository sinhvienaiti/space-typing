import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../src/Game.ts", import.meta.url), "utf8");

describe("hidden discovery lifecycle timing", () => {
  it("rolls only after a normal stage satisfies its clear gates", () => {
    const startIndex = source.indexOf("  startStage(");
    const finishIndex = source.indexOf("  private finishStage(): void {");
    const finishEnd = source.indexOf("  private pickBossEntry(", finishIndex);

    expect(startIndex).toBeGreaterThanOrEqual(0);
    expect(finishIndex).toBeGreaterThan(startIndex);
    expect(finishEnd).toBeGreaterThan(finishIndex);

    const startStage = source.slice(startIndex, finishIndex);
    const finishStage = source.slice(finishIndex, finishEnd);

    expect(startStage).not.toContain("rollHiddenDiscovery(");
    expect(source.match(/rollHiddenDiscovery\(/g)).toHaveLength(1);

    const objectiveGate = finishStage.indexOf(
      "requiredObjectiveAllowsFinish(this.stageObjective)",
    );
    const hiddenEncounterGuard = finishStage.indexOf(
      "this.hiddenEncounterRuntime === null && this.stageConfig !== null",
    );
    const roll = finishStage.indexOf("rollHiddenDiscovery(");
    const stageClear = finishStage.indexOf('this.phase = "stageclear";');

    expect(objectiveGate).toBeGreaterThanOrEqual(0);
    expect(hiddenEncounterGuard).toBeGreaterThan(objectiveGate);
    expect(roll).toBeGreaterThan(hiddenEncounterGuard);
    expect(stageClear).toBeGreaterThan(roll);
  });
});
