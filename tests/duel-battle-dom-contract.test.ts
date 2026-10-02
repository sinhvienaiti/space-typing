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
      'class="duel-current-input duel-arena-input hidden"',
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

  it("shows only a privacy-safe rival charge cue and resolves counter beats in the arena", () => {
    const source = read("../src/duel/battle-ui.ts");
    const css = read("../src/duel/battle.css");

    expect(source).toContain(
      'id="duelOpponentCharge" class="duel-opponent-charge hidden"',
    );
    expect(source).toContain(
      "view.opponent.typingTelegraph",
    );
    expect(source).toContain(
      "spawnThreatTelegraph(event.threat)",
    );
    expect(source).toContain(
      "spawnThreatIntercept",
    );
    expect(source).toContain(
      "event.type === \"threat-resolved\"",
    );
    expect(css).toContain(
      ".duel-threat-telegraph",
    );
    expect(css).toContain(
      ".duel-threat-intercept",
    );
    expect(css).toContain(
      ".duel-projectile-arrival",
    );
  });

  it("renders tactical actions on their actual combat target or arena", () => {
    const source = read("../src/duel/battle-ui.ts");
    const css = read("../src/duel/battle.css");

    expect(source).toContain("spawnTacticalActionFx");
    expect(source).toContain(
      'effectId === "lock-on" || effectId === "scan"',
    );
    expect(source).toContain(
      'effectId === "gravity-well"',
    );
    expect(source).toContain(
      'effectId === "disrupt"',
    );
    expect(css).toContain(".duel-tactical-reticle");
    expect(css).toContain(".duel-tactical-gravity-well");
    expect(css).toContain(".duel-tactical-disrupt");
  });

  it("shows positive shield repair and energy state changes on either ship", () => {
    const source = read("../src/duel/battle-ui.ts");
    const css = read("../src/duel/battle.css");

    expect(source).toContain("spawnResourceGain");
    expect(source).toContain(
      'spawnResourceGain("opponent", "shield")',
    );
    expect(source).toContain(
      'spawnResourceGain("opponent", "repair")',
    );
    expect(source).toContain(
      'spawnResourceGain("opponent", "energy")',
    );
    expect(css).toContain(".duel-resource-gain-shield");
    expect(css).toContain(".duel-resource-gain-repair");
    expect(css).toContain(".duel-resource-gain-energy");
  });

  it("uses combat targets instead of a visible action-card deck", () => {
    const source = read("../src/duel/battle-ui.ts");
    const css = read("../src/duel/battle.css");

    expect(source).toContain("const MAX_VISIBLE_WORD_TARGETS = 10;");
    expect(source).toContain('id="duelOffers" class="duel-word-field"');
    expect(source).toContain('card.classList.add("duel-word-target")');
    expect(source).toContain('"duel-target-object"');
    expect(source).not.toContain("ACTION OFFERS");
    expect(source).not.toContain('class="duel-command-deck"');
    expect(css).toContain(".duel-word-target {");
    expect(css).toContain(".duel-target-object {");
    expect(css).toContain(".duel-hidden-systems {");
  });

  it("keeps the duel arena spacious with compact ships and HUD", () => {
    const css = read("../src/duel/battle.css");

    expect(css).toContain("width: clamp(68px, 6vw, 98px);");
    expect(css).toContain("top: clamp(54px, 7vh, 82px);");
    expect(css).toContain("bottom: clamp(32px, 4.5vh, 58px);");
    expect(css).toContain("width: clamp(148px, 14vw, 205px);");
  });

});
