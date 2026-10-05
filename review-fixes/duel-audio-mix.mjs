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
  `export type DuelSoundHost = {\n  context(): AudioContext | null;\n  volume(): number;\n  pronunciationActive(): boolean;\n};`,
  `export type DuelSoundHost = {\n  context(): AudioContext | null;\n  volume(): number;\n  categoryVolume(group: AudioGroup): number;\n};`,
  "Duel sound host category volume",
);

duel = replaceUnique(
  duel,
  `  private bus: GainNode | null = null;\n  private focusBus: GainNode | null = null;\n  private reverbIn: GainNode | null = null;`,
  `  private bus: GainNode | null = null;\n  private reverbIn: GainNode | null = null;\n  private readonly focusBuses = new Map<AudioGroup, {\n    dry: GainNode;\n    wet: GainNode | null;\n  }>();`,
  "Duel sound focus bus fields",
);

duel = replaceUnique(
  duel,
  `  constructor(private readonly host: DuelSoundHost) {\n    this.focusUnsubscribe = sharedAudioFocus.subscribe(() => this.applyFocusGain());\n  }`,
  `  constructor(private readonly host: DuelSoundHost) {\n    this.focusUnsubscribe = sharedAudioFocus.subscribe(() => this.applyMixGains());\n  }\n\n  refreshMix(): void {\n    this.applyMixGains();\n  }`,
  "Duel sound focus subscription",
);

duel = replaceUnique(
  duel,
  `    try { this.bus?.disconnect(); } catch { /* fail-soft teardown */ }\n    try { this.focusBus?.disconnect(); } catch { /* fail-soft teardown */ }\n    try { this.reverbIn?.disconnect(); } catch { /* fail-soft teardown */ }\n    this.bus = null;\n    this.focusBus = null;\n    this.reverbIn = null;`,
  `    try { this.bus?.disconnect(); } catch { /* fail-soft teardown */ }\n    try { this.reverbIn?.disconnect(); } catch { /* fail-soft teardown */ }\n    for (const buses of this.focusBuses.values()) {\n      try { buses.dry.disconnect(); } catch { /* fail-soft teardown */ }\n      try { buses.wet?.disconnect(); } catch { /* fail-soft teardown */ }\n    }\n    this.focusBuses.clear();\n    this.bus = null;\n    this.reverbIn = null;`,
  "Duel sound bus teardown",
);

duel = replaceUnique(
  duel,
  `    const focusBus = context.createGain();\n    focusBus.gain.value = this.focusGain();\n    bus.connect(glue).connect(limiter).connect(focusBus).connect(context.destination);\n    this.focusBus = focusBus;`,
  `    bus.connect(glue).connect(limiter).connect(context.destination);`,
  "Duel sound shared focus bus removal",
);

duel = replaceUnique(
  duel,
  `  private level(gain: number, group: AudioGroup = "combat"): number {\n    // Focus is applied once at the stable post-wet bus so already-playing dry\n    // voices and reverb tails move together. Spawn gain keeps only user/group/event.\n    return mixedSfxGain(this.host.volume(), group, Math.min(1, gain), false);\n  }\n\n  private focusGain(): number {\n    return sfxFocusGain("combat", sharedAudioFocus.isActive("pronunciation"));\n  }\n\n  private applyFocusGain(): void {\n    if (this.destroyed) return;\n    const context = this.host.context();\n    const bus = this.focusBus;\n    if (context === null || bus === null) return;\n    const target = this.focusGain();\n    if (typeof bus.gain.setTargetAtTime === "function") {\n      bus.gain.setTargetAtTime(target, context.currentTime, target < 1 ? 0.012 : 0.055);\n    } else {\n      bus.gain.value = target;\n    }\n  }`,
  `  private level(gain: number, group: AudioGroup = "combat"): number {\n    // Runtime player/category/focus gain lives on stable group buses so active\n    // dry voices and reverb sends react immediately to mix changes.\n    return mixedSfxGain(1, group, Math.min(1, gain), false);\n  }\n\n  private runtimeGroupGain(group: AudioGroup): number {\n    const master = this.host.volume();\n    const category = this.host.categoryVolume(group);\n    const safeMaster = Number.isFinite(master) ? Math.max(0, Math.min(1, master)) : 0;\n    const safeCategory = Number.isFinite(category) ? Math.max(0, Math.min(1, category)) : 1;\n    return (\n      safeMaster *\n      safeCategory *\n      sfxFocusGain(group, sharedAudioFocus.isActive("pronunciation"))\n    );\n  }\n\n  private focusBusFor(\n    context: AudioContext,\n    group: AudioGroup,\n    wet: boolean,\n  ): GainNode {\n    let buses = this.focusBuses.get(group);\n    if (buses === undefined) {\n      const dry = context.createGain();\n      dry.gain.value = this.runtimeGroupGain(group);\n      dry.connect(this.bus!);\n      buses = { dry, wet: null };\n      this.focusBuses.set(group, buses);\n    }\n    if (!wet) return buses.dry;\n    if (buses.wet === null) {\n      const wetBus = context.createGain();\n      wetBus.gain.value = this.runtimeGroupGain(group);\n      if (this.reverbIn !== null) wetBus.connect(this.reverbIn);\n      buses.wet = wetBus;\n    }\n    return buses.wet;\n  }\n\n  private applyMixGains(): void {\n    if (this.destroyed) return;\n    const context = this.host.context();\n    if (context === null) return;\n    for (const [group, buses] of this.focusBuses) {\n      const target = this.runtimeGroupGain(group);\n      for (const bus of [buses.dry, buses.wet]) {\n        if (bus === null) continue;\n        if (typeof bus.gain.setTargetAtTime === "function") {\n          bus.gain.setTargetAtTime(\n            target,\n            context.currentTime,\n            sharedAudioFocus.isActive("pronunciation") ? 0.012 : 0.055,\n          );\n        } else {\n          bus.gain.value = target;\n        }\n      }\n    }\n  }`,
  "Duel sound group mix implementation",
);

duel = replaceUnique(
  duel,
  `    head.connect(this.bus!);\n    const send = voice.send ?? 0;\n    if (send > 0 && this.reverbIn !== null) {\n      const sendGain = context.createGain();\n      sendGain.gain.value = send;\n      head.connect(sendGain).connect(this.reverbIn);\n    }`,
  `    const group = voice.group ?? "combat";\n    head.connect(this.focusBusFor(context, group, false));\n    const send = voice.send ?? 0;\n    if (send > 0 && this.reverbIn !== null) {\n      const sendGain = context.createGain();\n      sendGain.gain.value = send;\n      head.connect(sendGain).connect(this.focusBusFor(context, group, true));\n    }`,
  "Duel sound output routing",
);

fs.writeFileSync(duelPath, duel);

const sfxPath = "src/audio/Sfx.ts";
let sfx = fs.readFileSync(sfxPath, "utf8");
sfx = replaceUnique(
  sfx,
  `  setCategoryVolumes(volumes: Partial<Record<AudioGroup, number>>): void {\n    for (const group of AUDIO_GROUPS) {\n      const value = volumes[group];\n      this.groupPreferences[group] =\n        typeof value === "number" && Number.isFinite(value)\n          ? Math.min(1, Math.max(0, value))\n          : 1;\n    }\n    this.refreshPlayerMix();\n  }\n\n  private effectiveSfxVolume(): number {`,
  `  setCategoryVolumes(volumes: Partial<Record<AudioGroup, number>>): void {\n    for (const group of AUDIO_GROUPS) {\n      const value = volumes[group];\n      this.groupPreferences[group] =\n        typeof value === "number" && Number.isFinite(value)\n          ? Math.min(1, Math.max(0, value))\n          : 1;\n    }\n    this.refreshPlayerMix();\n  }\n\n  categoryVolume(group: AudioGroup): number {\n    return this.groupPreferences[group];\n  }\n\n  private effectiveSfxVolume(): number {`,
  "Sfx category volume accessor",
);
fs.writeFileSync(sfxPath, sfx);

const gamePath = "src/Game.ts";
let game = fs.readFileSync(gamePath, "utf8");
game = replaceUnique(
  game,
  `    this.duelSound ??= new DuelSoundEngine({\n      context: () => this.sfx.audioContext(),\n      volume: () => this.sfx.masterVolume(),\n      pronunciationActive: () => this.sfx.isPronunciationActive(),\n    });`,
  `    this.duelSound ??= new DuelSoundEngine({\n      context: () => this.sfx.audioContext(),\n      volume: () => this.sfx.masterVolume(),\n      categoryVolume: (group) => this.sfx.categoryVolume(group),\n    });`,
  "Game Duel sound host",
);
game = replaceUnique(
  game,
  `    this.sfx.setAnnouncerVolume(settings.announcerVolume ?? 1);\n    this.sfx.setCategoryVolumes(settings.audioCategoryVolumes ?? {});\n  }`,
  `    this.sfx.setAnnouncerVolume(settings.announcerVolume ?? 1);\n    this.sfx.setCategoryVolumes(settings.audioCategoryVolumes ?? {});\n    this.duelSound?.refreshMix();\n  }`,
  "Game Duel mix refresh",
);
fs.writeFileSync(gamePath, game);

const lifecyclePath = "tests/duel-sound-lifecycle.test.ts";
let lifecycle = fs.readFileSync(lifecyclePath, "utf8");
lifecycle = replaceUnique(
  lifecycle,
  `      volume: () => 1,\n      pronunciationActive: () => false,`,
  `      volume: () => 1,\n      categoryVolume: () => 1,`,
  "Duel lifecycle host update",
);
fs.writeFileSync(lifecyclePath, lifecycle);

fs.writeFileSync(
  "tests/duel-sound-mix.test.ts",
  `import { afterEach, describe, expect, it } from "vitest";\nimport { DuelSoundEngine } from "../src/audio/duel-sound";\nimport { sharedAudioFocus } from "../src/audio/focus-manager";\nimport type { AudioGroup } from "../src/audio/mix";\n\nclass FakeParam {\n  value = 0;\n  setTargetAtTime(value: number): void { this.value = value; }\n}\n\nclass FakeNode {\n  connect<T>(node: T): T { return node; }\n  disconnect(): void {}\n}\n\nclass FakeGain extends FakeNode {\n  readonly gain = new FakeParam();\n}\n\nclass FakeCompressor extends FakeNode {\n  threshold = { value: 0 };\n  knee = { value: 0 };\n  ratio = { value: 0 };\n  attack = { value: 0 };\n  release = { value: 0 };\n}\n\nfunction fakeContext(gains: FakeGain[]): AudioContext {\n  const sampleRate = 10;\n  return {\n    currentTime: 0,\n    sampleRate,\n    destination: new FakeNode(),\n    createGain() {\n      const gain = new FakeGain();\n      gains.push(gain);\n      return gain;\n    },\n    createDynamicsCompressor() { return new FakeCompressor(); },\n    createBuffer(_channels: number, length: number) {\n      return {\n        duration: length / sampleRate,\n        getChannelData: () => new Float32Array(length),\n      };\n    },\n  } as unknown as AudioContext;\n}\n\ndescribe("Duel sound player/category/focus mix", () => {\n  const owner = "duel-sound-mix-test";\n\n  afterEach(() => {\n    sharedAudioFocus.clearOwner(owner);\n  });\n\n  it("applies category and group-specific pronunciation focus on stable buses", () => {\n    const gains: FakeGain[] = [];\n    const context = fakeContext(gains);\n    let volume = 0.8;\n    const categories: Record<AudioGroup, number> = {\n      typing: 1,\n      combat: 0.25,\n      warnings: 0.75,\n      ui: 1,\n      rewards: 1,\n    };\n    const engine = new DuelSoundEngine({\n      context: () => context,\n      volume: () => volume,\n      categoryVolume: (group) => categories[group],\n    });\n    const internals = engine as unknown as {\n      ensureGraph(context: AudioContext): GainNode | null;\n      output(context: AudioContext, level: number, voice: { group?: AudioGroup }): AudioNode;\n    };\n\n    expect(internals.ensureGraph(context)).not.toBeNull();\n    internals.output(context, 1, { group: "warnings" });\n    const warningBus = gains.at(-1)!;\n    expect(warningBus.gain.value).toBeCloseTo(0.8 * 0.75);\n\n    const pronunciation = sharedAudioFocus.acquire("pronunciation", owner);\n    expect(warningBus.gain.value).toBeCloseTo(0.8 * 0.75 * 0.68);\n\n    categories.warnings = 0.5;\n    volume = 0.6;\n    engine.refreshMix();\n    expect(warningBus.gain.value).toBeCloseTo(0.6 * 0.5 * 0.68);\n\n    internals.output(context, 1, { group: "combat" });\n    const combatBus = gains.at(-1)!;\n    expect(combatBus.gain.value).toBeCloseTo(0.6 * 0.25 * 0.38);\n\n    sharedAudioFocus.release(pronunciation);\n    expect(warningBus.gain.value).toBeCloseTo(0.6 * 0.5);\n    expect(combatBus.gain.value).toBeCloseTo(0.6 * 0.25);\n    engine.destroy();\n  });\n});\n`,
);
