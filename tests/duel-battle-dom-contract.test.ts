import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8",
  );
}

describe("Duel battle DOM contract", () => {
  it("declares every required static FX node before querying it", () => {
    const source = read("../src/duel/battle-ui.ts");

    expect(source).toContain(
      'id="duelEventFx" class="duel-event-fx"',
    );
    expect(source).toContain('fx: byId("duelEventFx")');
    expect(source).toContain(
      'id="duelTypingFx" class="duel-typing-fx"',
    );
    expect(source).toContain(
      'typingFx: byId("duelTypingFx")',
    );
  });

  it("keeps the local player at the bottom and rival at the top", () => {
    const source = read("../src/duel/battle-ui.ts");
    const css = read("../src/duel/battle.css");

    expect(source).toContain(
      'class="duel-rival-zone"',
    );
    expect(source).toContain(
      'class="duel-self-zone"',
    );
    expect(source).toContain(
      'class="duel-arena"',
    );
    expect(css).toContain(
      ".duel-rival-zone .duel-ship-frame",
    );
    expect(css).toContain(
      ".duel-self-zone .duel-ship-frame",
    );
    expect(css).toContain(
      "@keyframes duel-projectile-up",
    );
    expect(css).toContain(
      "@keyframes duel-projectile-down",
    );
  });

  it("connects accepted typing progress to micro combat feedback", () => {
    const source = read("../src/duel/battle-ui.ts");
    const css = read("../src/duel/battle.css");

    expect(source).toContain(
      "maybeSpawnTypingFeedback",
    );
    expect(source).toContain(
      'createElement("i", "duel-typing-bolt")',
    );
    expect(source).toContain(
      'class="duel-current-input duel-arena-input"',
    );
    expect(css).toContain(
      "@keyframes duel-typing-bolt",
    );
    expect(css).toContain(
      "@keyframes duel-typing-impact",
    );
  });

  it("uses action-specific attack presentation instead of generic firing for every action", () => {
    const source = read("../src/duel/battle-ui.ts");

    expect(source).toContain(
      'case "guided-missile":',
    );
    expect(source).toContain(
      'return "missile";',
    );
    expect(source).toContain(
      'case "delayed-bomb":',
    );
    expect(source).toContain(
      'return "bomb";',
    );
    expect(source).toContain(
      'spawnShipActionFx(sourcePlayerId, action.effectId);',
    );
  });
});
