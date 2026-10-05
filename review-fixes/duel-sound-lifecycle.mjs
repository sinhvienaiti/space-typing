import fs from "node:fs";

function replaceUnique(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Duplicate ${label}`);
  }
  return source.replace(before, after);
}

const duelPath = "src/audio/duel-sound.ts";
let duel = fs.readFileSync(duelPath, "utf8");

duel = replaceUnique(
  duel,
  `  private selfTier = 0;\n  private readonly lastPlayed = new Map<string, number>();\n\n  constructor(private readonly host: DuelSoundHost) {\n    sharedAudioFocus.subscribe(() => this.applyFocusGain());\n  }\n\n  setHorizontal(horizontal: boolean): void {`,
  `  private selfTier = 0;\n  private readonly lastPlayed = new Map<string, number>();\n  private focusUnsubscribe: (() => void) | null = null;\n  private destroyed = false;\n\n  constructor(private readonly host: DuelSoundHost) {\n    this.focusUnsubscribe = sharedAudioFocus.subscribe(() => this.applyFocusGain());\n  }\n\n  destroy(): void {\n    if (this.destroyed) return;\n    this.destroyed = true;\n    this.focusUnsubscribe?.();\n    this.focusUnsubscribe = null;\n    try { this.bus?.disconnect(); } catch { /* fail-soft teardown */ }\n    try { this.focusBus?.disconnect(); } catch { /* fail-soft teardown */ }\n    try { this.reverbIn?.disconnect(); } catch { /* fail-soft teardown */ }\n    this.bus = null;\n    this.focusBus = null;\n    this.reverbIn = null;\n    this.white = null;\n    this.brown = null;\n    this.buffers.clear();\n    this.curves.clear();\n    this.lastPlayed.clear();\n    this.activeVoices = 0;\n  }\n\n  setHorizontal(horizontal: boolean): void {`,
  "Duel sound subscription ownership",
);

duel = replaceUnique(
  duel,
  `  preload(): void {\n    const context = this.host.context();`,
  `  preload(): void {\n    if (this.destroyed) return;\n    const context = this.host.context();`,
  "Duel sound preload destroy guard",
);

duel = replaceUnique(
  duel,
  `  play(cue: DuelTimedAudioCue): boolean {\n    const context = this.host.context();`,
  `  play(cue: DuelTimedAudioCue): boolean {\n    if (this.destroyed) return false;\n    const context = this.host.context();`,
  "Duel sound play destroy guard",
);

duel = replaceUnique(
  duel,
  `  private applyFocusGain(): void {\n    const context = this.host.context();`,
  `  private applyFocusGain(): void {\n    if (this.destroyed) return;\n    const context = this.host.context();`,
  "Duel sound focus destroy guard",
);

fs.writeFileSync(duelPath, duel);

const gamePath = "src/Game.ts";
let game = fs.readFileSync(gamePath, "utf8");
game = replaceUnique(
  game,
  `    this.backgroundStage?.destroy();\n    this.textWidthCache.clear();\n    this.sfx.destroy();`,
  `    this.backgroundStage?.destroy();\n    this.textWidthCache.clear();\n    this.duelSound?.destroy();\n    this.duelSound = null;\n    this.sfx.destroy();`,
  "Game Duel sound teardown",
);
fs.writeFileSync(gamePath, game);

fs.writeFileSync(
  "tests/duel-sound-lifecycle.test.ts",
  `import { afterEach, describe, expect, it, vi } from "vitest";\nimport { DuelSoundEngine } from "../src/audio/duel-sound";\nimport { sharedAudioFocus } from "../src/audio/focus-manager";\n\ndescribe("DuelSoundEngine lifecycle", () => {\n  afterEach(() => {\n    sharedAudioFocus.clearOwner("duel-sound-lifecycle-test");\n    vi.restoreAllMocks();\n  });\n\n  it("unsubscribes from shared audio focus and refuses playback after destroy", () => {\n    const engine = new DuelSoundEngine({\n      context: () => null,\n      volume: () => 1,\n      pronunciationActive: () => false,\n    });\n    const internals = engine as unknown as { applyFocusGain: () => void };\n    const original = internals.applyFocusGain.bind(engine);\n    const focusSpy = vi.fn(original);\n    internals.applyFocusGain = focusSpy;\n\n    const token = sharedAudioFocus.acquire(\n      "pronunciation",\n      "duel-sound-lifecycle-test",\n      1,\n    );\n    expect(focusSpy).toHaveBeenCalledTimes(1);\n\n    engine.destroy();\n    sharedAudioFocus.release(token);\n    expect(focusSpy).toHaveBeenCalledTimes(1);\n    expect(engine.play({ cue: "typing-miss", side: "self", atMs: 0 })).toBe(false);\n\n    expect(() => engine.destroy()).not.toThrow();\n  });\n});\n`,
);
