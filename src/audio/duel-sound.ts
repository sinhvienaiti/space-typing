import { mixedSfxGain, type AudioGroup } from "./mix";
import type { DuelTimedAudioCue } from "../duel/audio";

/**
 * Duel combat sound on Web Audio, voiced like fighter-craft firepower.
 *
 * History (2026-10-03): the generated Duel pack sounded like pitched toy
 * "tinh tinh" pings; the first synthesized replacement ("crunch" sped up
 * plus resonant band-pass rings) sounded like "throwing stones into a pan".
 * Weapons and hits are now recorded/designed CC0 sounds from Freesound,
 * picked by downloads and measured spectrum (see docs/ASSET_SOURCES.md),
 * under a clean synthesized sub thump. No resonant metal rings, no
 * sped-up gravel. Announcer lines (DotA) are the owner's local assets.
 *
 * Samples are decoded once to AudioBuffers; stereo follows the layout; your
 * own fire is louder than the rival's; bus compressor + limiter keep stacked
 * blasts loud but clean.
 */

/** CC0 weapon/impact set, trimmed and normalised (public/assets/audio/duel/war). */
const DUEL_SFX = {
  gunA: "/assets/audio/duel/war/gun-a.ogg",
  gunB: "/assets/audio/duel/war/gun-b.ogg",
  gunReal: "/assets/audio/duel/war/gunshot-real.ogg",
  hitA: "/assets/audio/duel/war/hit-a.ogg",
  hitB: "/assets/audio/duel/war/hit-b.ogg",
  hitHeavy: "/assets/audio/duel/war/hit-heavy.ogg",
  railgun: "/assets/audio/duel/war/railgun.ogg",
  tankFire: "/assets/audio/duel/war/tank-fire.ogg",
  explosionA: "/assets/audio/duel/war/explosion-a.ogg",
  explosionB: "/assets/audio/duel/war/explosion-b.ogg",
  explosionBig: "/assets/audio/duel/war/explosion-big.ogg",
  missile: "/assets/audio/duel/war/missile.ogg",
  rocket: "/assets/audio/duel/war/rocket.ogg",
  laserImpact: "/assets/audio/duel/war/laser-impact.ogg",
  shield: "/assets/audio/duel/war/shield.ogg",
  impactDesign: "/assets/audio/duel/war/impact-design.ogg",
  lowBoom: "/assets/audio/sfx/kenney/explosion-low.ogg",
  destruction: "/assets/audio/duel/sfx/ship-destruction.ogg",
} as const;

type SampleName = keyof typeof DUEL_SFX;

/** DotA announcer lines: local, private-use assets (gitignored). */
const ANNOUNCER_ROOT = "/local-assets/announcer/";

export type DuelSoundHost = {
  context(): AudioContext | null;
  volume(): number;
  pronunciationActive(): boolean;
};

type Voice = {
  pan?: number;
  /** Reverb send, 0…1. */
  send?: number;
  group?: AudioGroup;
  /** Low-pass the voice (Hz); tames bright samples. */
  lowpass?: number;
  /** Soft-clip drive (0 = clean). Grit for rumble, horns and cannon. */
  drive?: number;
};

const MAX_VOICES = 64;

export class DuelSoundEngine {
  private bus: GainNode | null = null;
  private reverbIn: GainNode | null = null;
  private white: AudioBuffer | null = null;
  private brown: AudioBuffer | null = null;
  private readonly buffers = new Map<SampleName, AudioBuffer>();
  private readonly curves = new Map<number, Float32Array<ArrayBuffer>>();
  private loadStarted = false;
  private horizontal = true;
  private activeVoices = 0;
  private selfTier = 0;
  private readonly lastPlayed = new Map<string, number>();

  constructor(private readonly host: DuelSoundHost) {}

  setHorizontal(horizontal: boolean): void {
    this.horizontal = horizontal;
  }

  /** Fetch and decode the layers once (no-op until audio is unlocked). */
  preload(): void {
    const context = this.host.context();
    if (context === null || this.loadStarted || typeof fetch !== "function") return;
    this.loadStarted = true;
    // Announcer lines are optional local files listed in one manifest, so a
    // machine without them costs one 404 instead of one per line.
    void fetch(ANNOUNCER_ROOT + "manifest.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((manifest: { lines?: unknown } | null) => {
        const lines = Array.isArray(manifest?.lines) ? manifest.lines.filter((line): line is string => typeof line === "string") : [];
        this.availableLines = new Set(lines);
        this.preloadAnnouncer(lines);
      })
      .catch(() => {
        this.availableLines = new Set();
      });
    for (const [name, path] of Object.entries(DUEL_SFX) as Array<[SampleName, string]>) {
      void fetch(path)
        .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(path))))
        .then((data) => context.decodeAudioData(data))
        .then((buffer) => {
          this.buffers.set(name, buffer);
        })
        .catch(() => undefined);
    }
  }

  get loadedSamples(): number {
    return this.buffers.size;
  }

  /** Returns false when Web Audio is unavailable, so the caller can fall back. */
  play(cue: DuelTimedAudioCue): boolean {
    const context = this.host.context();
    if (context === null || this.ensureGraph(context) === null) return false;
    this.preload();
    const t = context.currentTime + 0.004;
    const pan = this.panFor(cue.side);
    if (cue.tier !== undefined && cue.side === "self") this.selfTier = cue.tier;
    // Your own fire is in front; the rival's is felt but sits back.
    const near = cue.side === "opponent" ? 0.58 : 1;
    const tier = cue.tier ?? 0;
    const rate = (spread = 0.08): number => 1 - spread / 2 + Math.random() * spread;
    const flip = (): boolean => (this.flipCount = (this.flipCount + 1) % 2) === 0;

    switch (cue.cue) {
      case "laser-launch": {
        // Typing cannon: a punchy sci-fi round; momentum adds a real report.
        if (!this.gate("gun:" + cue.side, 0.026)) return true;
        const heat = cue.side === "self" ? this.selfTier : 0;
        // Levels (offline, master 0.5): gun ≈ −20 dB, hit ≈ −18 dB, so a
        // 3-shots-a-second stream stays punchy without burying everything.
        this.sample(flip() ? "gunA" : "gunB", t, 0.2 * near, rate() * (1 - Math.min(4, heat) * 0.015), { pan, send: 0.08 });
        this.osc(t, "sine", 125, 46, 0.08, 0.2 * near, { pan });
        if (heat >= 3) this.sample("gunReal", t, 0.14 * near, rate(), { pan, lowpass: 6000 });
        return true;
      }
      case "energy-impact": {
        // A round striking a hull: designed hit plus a sub punch.
        if (!this.gate("hit:" + cue.side, 0.02)) return true;
        const onYou = cue.side === "self";
        this.sample(flip() ? "hitA" : "hitB", t, onYou ? 0.6 : 0.56, rate(), { pan, send: 0.12 });
        if (onYou) this.sample("hitHeavy", t, 0.3, rate(), { pan, lowpass: 5000, send: 0.15 });
        this.osc(t, "sine", onYou ? 110 : 135, 40, 0.1, onYou ? 0.42 : 0.26, { pan });
        return true;
      }
      case "missile-launch": {
        // One per missile: ignition thump, then the rocket roar tearing away.
        const step = cue.step ?? 0;
        this.thock(t, 0.9, pan);
        this.sample(step % 2 === 0 ? "missile" : "rocket", t, (step === 0 ? 0.36 : 0.26) * near, rate(), { pan, send: 0.16 });
        if (step === 0) this.noise(t, 0.55, 0.12 * near, "bandpass", 1800, 420, 0.9, { pan, send: 0.2 });
        return true;
      }
      case "missile-impact": {
        // One blast per missile, alternating bodies, the first the heaviest.
        const step = cue.step ?? 0;
        this.sample(step % 2 === 0 ? "explosionA" : "explosionB", t, step === 0 ? 0.6 : 0.46, rate(0.12), { pan, send: 0.3 });
        this.boom(t, step === 0 ? 1.15 : 0.85, pan, 0.25);
        if (step === 2) this.debris(t + 0.05, 0.6, pan);
        return true;
      }
      case "beam-launch": {
        // Ion beam: a low powered growl with a hiss of plasma, no whistle.
        if (!this.gate("beam:" + cue.side, 0.05)) return true;
        this.osc(t, "sawtooth", 70, 52, 0.62, 0.11 * near, { pan, lowpass: 900, drive: 0.5, send: 0.18 }, 0.02);
        this.osc(t, "square", 105, 98, 0.55, 0.04 * near, { pan, lowpass: 600, send: 0.1 }, 0.02);
        this.noise(t, 0.6, 0.12 * near, "bandpass", 900, 2600, 0.9, { pan, send: 0.15 });
        this.sample("laserImpact", t, 0.22 * near, 0.85, { pan, lowpass: 5000, send: 0.12 });
        return true;
      }
      case "beam-impact":
        // The beam burning in: sizzle, a sharp hit and a short sub punch.
        this.noise(t, 0.35, 0.22, "highpass", 2400, 4200, 0.8, { pan, send: 0.15 });
        this.sample("hitA", t, 0.52, rate(), { pan, send: 0.15 });
        this.sample("laserImpact", t, 0.4, rate(0.06), { pan, send: 0.2 });
        this.osc(t, "sine", 120, 42, 0.16, 0.36, { pan });
        return true;
      case "rail-charge": {
        // Capacitors filling: a rising growl and rising hiss, then the shot.
        const seconds = Math.max(0.2, Math.min(1.5, cue.seconds ?? 0.6));
        this.osc(t, "sawtooth", 45, 210, seconds, 0.15 * near, { pan, lowpass: 1400, drive: 0.4, send: 0.2 }, seconds * 0.92);
        for (let i = 0; i < 4; i += 1) {
          const at = t + seconds * (i / 4);
          this.noise(at, seconds * 0.3, (0.06 + i * 0.035) * near, "bandpass", 500 + i * 450, 900 + i * 600, 1.2, { pan, send: 0.15 });
        }
        return true;
      }
      case "rail-impact":
        // A slug punching through: crack, heavy hit, blast and a deep thud.
        this.sample("hitHeavy", t, 0.6, rate(0.06), { pan, send: 0.2 });
        this.sample("laserImpact", t, 0.4, 0.9, { pan, send: 0.25 });
        this.sample("explosionB", t + 0.02, 0.48, rate(0.1), { pan, send: 0.32 });
        this.boom(t, 1.4, pan, 0.32);
        return true;
      case "lance-charge": {
        // The siege lance gathering power for its whole counter window.
        const seconds = Math.max(0.4, Math.min(5, cue.seconds ?? 2.8));
        const level = cue.side === "opponent" ? 0.7 : 1;
        this.osc(t, "sawtooth", 38, 160, seconds, 0.1 * level, { pan, lowpass: 1100, drive: 0.45, send: 0.3, group: "warnings" }, seconds * 0.95);
        this.osc(t, "sine", 55, 110, seconds, 0.2 * level, { pan, group: "warnings" }, seconds * 0.95);
        const pulses = Math.max(2, Math.round(seconds * 2));
        for (let i = 0; i < pulses; i += 1) {
          this.noise(t + seconds * (i / pulses), 0.22, (0.05 + 0.1 * (i / pulses)) * level, "bandpass", 400 + 900 * (i / pulses), 1400 + 1200 * (i / pulses), 1, { pan, send: 0.25, group: "warnings" });
        }
        return true;
      }
      case "lance-impact":
        // The lance lands: the biggest blast short of a K.O.
        this.sample("railgun", t, 0.6, 0.85, { pan, send: 0.35 });
        this.sample("explosionBig", t + 0.03, 0.95, rate(0.06), { pan, send: 0.5 });
        this.sample("explosionA", t + 0.1, 0.5, 0.88, { pan, send: 0.4 });
        this.sample("lowBoom", t, 0.65, 0.9, { pan });
        this.boom(t, 2.6, pan, 0.45);
        this.debris(t + 0.12, 1, pan);
        return true;
      case "lance-break":
        // Intercepted: the charged spear shattering.
        this.sample("impactDesign", t, 0.55, 1, { pan, send: 0.3 });
        this.sample("shield", t, 0.45, 0.8, { pan, lowpass: 6000, send: 0.3 });
        this.noise(t, 0.4, 0.2, "highpass", 3000, 1800, 0.7, { pan, send: 0.25 });
        this.osc(t, "sine", 140, 40, 0.3, 0.35, { pan });
        return true;
      case "heavy-launch":
        this.sample("railgun", t, 0.55 * near, rate(0.06), { pan, send: 0.25 });
        this.osc(t, "sine", 90, 40, 0.2, 0.3 * near, { pan });
        return true;
      case "heavy-impact":
        this.sample("laserImpact", t, 0.5, rate(), { pan, send: 0.25 });
        this.sample("explosionB", t, 0.42, rate(0.1), { pan, send: 0.3 });
        this.boom(t, 1.2, pan, 0.3);
        return true;
      case "bomb-launch":
        this.sample("tankFire", t, 0.6 * near, rate(0.06), { pan, send: 0.2 }, 0, 1.4);
        return true;
      case "bomb-impact":
        this.sample("explosionBig", t, 0.85, rate(0.08), { pan, send: 0.45 });
        this.sample("explosionA", t, 0.45, 0.9, { pan, send: 0.3 });
        this.sample("lowBoom", t, 0.5, 0.9, { pan });
        this.boom(t, 1.6, pan, 0.4);
        this.debris(t + 0.1, 0.9, pan);
        return true;
      case "support":
        // Servo and power coupling: mechanical, low, no chime.
        this.thock(t, 0.8 * near, pan);
        this.osc(t, "sawtooth", 70, 150, 0.42, 0.06 * near, { pan, lowpass: 520, send: 0.2 }, 0.04);
        return true;
      case "bank":
        this.thock(t, 0.6, 0);
        return true;
      case "warning":
        // Military klaxon, two blasts.
        for (const at of [0, 0.2]) {
          this.osc(t + at, "square", 440, 380, 0.16, 0.05, { pan, group: "warnings", lowpass: 1400, drive: 0.4 });
        }
        return true;
      case "intercept":
        this.sample("gunReal", t, 0.5, rate(), { pan, lowpass: 7000 });
        this.sample("hitB", t, 0.4, rate(), { pan });
        return true;
      case "precision":
        // Ordnance armed: breech thock and a short rail charge.
        this.thock(t, 1.1, pan);
        this.sample("railgun", t + 0.02, 0.35, 1.25, { pan, lowpass: 5000 }, 0, 0.5);
        return true;
      case "cataclysm":
        this.sample("explosionBig", t, 0.85, 0.85, { send: 0.5, group: "warnings" });
        this.boom(t, 2, 0, 0.6);
        this.siren(t + 0.2, 1.6);
        return true;
      case "typing-miss":
        // A jammed round: dry clunk and a short low buzz.
        this.noise(t, 0.012, 0.28, "lowpass", 900, 600, 0.7, { pan, group: "typing" });
        this.osc(t, "square", 62, 55, 0.08, 0.06, { pan, group: "typing", lowpass: 320 });
        return true;
      case "type-tick":
        // Every correct key loads the gun: a soft low thock, heavier with momentum.
        if (!this.gate("tick", 0.016)) return true;
        this.thock(t, 0.5 + Math.min(6, tier) * 0.08, pan, "typing");
        return true;
      case "streak-tier":
        // Weapons overdrive: a rising roar, then a heavy rail shot.
        this.osc(t, "sawtooth", 46, 120, 0.34, 0.1, { pan, lowpass: 900, drive: 0.5, send: 0.2 }, 0.05);
        this.noise(t, 0.3, 0.12, "bandpass", 300, 2400, 0.8, { pan, send: 0.2 }, true);
        this.sample("railgun", t + 0.28, 0.5 + Math.min(6, tier) * 0.05, 1.05, { pan, send: 0.3 }, 0, 1.2);
        return true;
      case "streak-break":
        // Overheated barrel venting: hiss and a dead clunk.
        this.noise(t, 0.5, 0.2, "highpass", 3200, 5200, 0.7, { pan, group: "typing" });
        this.osc(t, "sine", 120, 45, 0.18, 0.6, { pan, group: "typing" });
        return true;
      case "shield-hit":
        if (!this.gate("shield:" + cue.side, 0.04)) return true;
        this.sample("shield", t, 0.6, rate(0.1), { pan, lowpass: 7000, send: 0.15 });
        this.osc(t, "sine", 115, 55, 0.12, 0.3, { pan });
        return true;
      case "shield-break":
        this.sample("impactDesign", t, 0.65, 1, { pan, send: 0.3, group: "warnings" });
        this.sample("shield", t, 0.5, 0.78, { pan, lowpass: 6000, send: 0.3 });
        this.boom(t, 0.8, pan, 0.25);
        return true;
      case "ko-blast": {
        const step = cue.step ?? 0;
        this.sample(step % 2 === 0 ? "explosionA" : "explosionB", t, 0.62 + step * 0.03, 0.86 + Math.random() * 0.18, { pan, send: 0.4 });
        this.boom(t, 0.7 + step * 0.06, pan, 0.3);
        return true;
      }
      case "ko-final":
        this.sample("explosionBig", t, 0.95, 0.92, { pan, send: 0.6 });
        this.sample("tankFire", t, 0.45, 0.8, { pan, lowpass: 3000, send: 0.4 });
        this.sample("lowBoom", t, 0.75, 0.75, { pan });
        this.sample("lowBoom", t + 0.32, 0.5, 0.62, { pan: -pan, send: 0.5 });
        this.sample("destruction", t, 0.35, 0.8, { pan, lowpass: 2500, send: 0.5 });
        this.noise(t, 2.2, 0.28, "lowpass", 700, 50, 0.7, { pan, send: 0.5, drive: 0.3 }, true);
        return true;
      case "round-win":
      case "match-win": {
        const big = cue.cue === "match-win";
        for (const at of big ? [0, 0.26, 0.52, 0.9] : [0, 0.26, 0.52]) this.drum(t + at, at === 0 ? 1.2 : 0.9);
        this.brass(t + 0.08, 130.81, big ? [1, 1.26, 1.5, 2, 2.52] : [1, 1.26, 1.5, 2], big ? 2.4 : 1.7, 0.05);
        return true;
      }
      case "round-loss":
      case "match-loss": {
        const big = cue.cue === "match-loss";
        this.drum(t, 1.1);
        this.drum(t + 0.7, 0.9);
        this.brass(t + 0.05, 110, [1, 1.19, 1.5], big ? 2.4 : 1.8, 0.05, 0.94);
        return true;
      }
      case "round-draw":
        this.drum(t, 1);
        this.brass(t + 0.05, 123.47, [1, 1.5, 2], 1.5, 0.045);
        return true;
      case "round-ready":
        this.drum(t, 0.8);
        this.drum(t + 0.42, 0.95);
        return true;
      case "fight":
        this.drum(t, 1.4);
        this.brass(t, 146.83, [1, 1.5, 2], 0.7, 0.06);
        this.sample("gunA", t + 0.02, 0.6, 0.95, { pan: -0.3 });
        this.sample("gunB", t + 0.1, 0.6, 0.95, { pan: 0.3 });
        return true;
      case "phase-shift": {
        const root = 98 * Math.pow(2, Math.min(4, tier) / 12);
        this.brass(t, root, [1, 1.5, 2], 1.4, 0.05);
        this.drum(t, 1.1);
        this.drum(t + 0.36, 0.85);
        if (tier >= 3) this.siren(t + 0.1, 1.4);
        return true;
      }
      case "announce":
        this.announce(cue.voice ?? "", cue.priority ?? 1);
        return true;
    }
  }

  private flipCount = 0;
  private voiceUntil = 0;
  private voicePriority = 0;
  private voiceSource: AudioBufferSourceNode | null = null;
  private readonly voices = new Map<string, AudioBuffer | null | Promise<AudioBuffer | null>>();

  /**
   * One announcer line at a time: a busy voice is cut by an equal or higher
   * priority one (the newer rung wins), never by a lower one (K.O. Ownage > First Blood > multi-kill > streak > combo).
   * Music ducks while it speaks. Missing local files are skipped silently.
   */
  private availableLines: Set<string> | null = null;

  private announce(voice: string, priority: number): void {
    const context = this.host.context();
    if (context === null || voice === "") return;
    if (this.availableLines !== null && !this.availableLines.has(voice)) return;
    const now = context.currentTime;
    if (now < this.voiceUntil && priority < this.voicePriority) return;
    const cached = this.voices.get(voice);
    if (cached === undefined) {
      // First use: load, then play if still relevant (≤ 0.6 s late).
      const requested = now;
      const pending = fetch(ANNOUNCER_ROOT + voice + ".ogg")
        .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error("missing"))))
        .then((data) => context.decodeAudioData(data))
        .catch(() => null);
      this.voices.set(voice, pending);
      void pending.then((buffer) => {
        this.voices.set(voice, buffer);
        if (buffer !== null && context.currentTime - requested < 0.6) this.speak(context, buffer, priority);
      });
      return;
    }
    if (cached instanceof Promise || cached === null) return;
    this.speak(context, cached, priority);
  }

  private speak(context: AudioContext, buffer: AudioBuffer, priority: number): void {
    if (context.currentTime < this.voiceUntil && priority < this.voicePriority) return;
    try {
      this.voiceSource?.stop();
    } catch {
      // already ended
    }
    const level = this.level(0.95, "warnings");
    if (level <= 0) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.output(context, level * 0.75, { send: 0.12, group: "warnings" }));
    source.start(context.currentTime + 0.01);
    this.voiceSource = source;
    this.voicePriority = priority;
    this.voiceUntil = context.currentTime + buffer.duration;
    this.duckMusic(buffer.duration);
  }

  /** Preload the announcer lines so the first call-out is not late. */
  preloadAnnouncer(lines: readonly string[]): void {
    const context = this.host.context();
    if (context === null) return;
    for (const voice of lines) {
      if (this.voices.has(voice)) continue;
      const pending = fetch(ANNOUNCER_ROOT + voice + ".ogg")
        .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error("missing"))))
        .then((data) => context.decodeAudioData(data))
        .catch(() => null);
      this.voices.set(voice, pending);
      void pending.then((buffer) => this.voices.set(voice, buffer));
    }
  }

  private duckTimer: ReturnType<typeof setTimeout> | null = null;

  private duckMusic(seconds: number): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("space-typing:announcer", { detail: { active: true } }));
    if (this.duckTimer !== null) clearTimeout(this.duckTimer);
    this.duckTimer = setTimeout(() => {
      this.duckTimer = null;
      window.dispatchEvent(new CustomEvent("space-typing:announcer", { detail: { active: false } }));
    }, seconds * 1000 + 150);
  }

  /** Soft low key "thock": no resonant ring (that read as a metal pan). */
  private thock(t: number, weight: number, pan: number, group: AudioGroup = "combat"): void {
    const w = Math.max(0.3, Math.min(1.6, weight));
    this.noise(t, 0.006, 0.4 * w, "lowpass", 2600, 1800, 0.7, { pan, group });
    this.osc(t, "sine", 165, 72, 0.05 + 0.02 * w, 0.4 * w, { pan, group });
  }

  // --- Weapons ---------------------------------------------------------------

  /** An explosion's body: kick sub, distorted rumble and crack. */
  private boom(t: number, weight: number, pan: number, send: number): void {
    const w = Math.max(0.3, Math.min(2.8, weight));
    this.osc(t, "sine", 115 + 20 * w, 28, 0.3 + 0.16 * w, 0.26 + 0.1 * w, { pan });
    this.noise(t, 0.4 + 0.35 * w, 0.14 + 0.07 * w, "lowpass", 900 + 250 * w, 90, 0.6, { pan, send, drive: 0.4 }, true);
  }

  /** Debris raining after a big blast: a decaying gravelly rattle, low. */
  private debris(t: number, weight: number, pan: number): void {
    const w = Math.max(0.3, Math.min(1.5, weight));
    this.noise(t, 0.7 + 0.4 * w, 0.1 * w, "lowpass", 2200, 500, 0.7, { pan, send: 0.3 }, true);
    for (let i = 0; i < 4; i += 1) {
      this.noise(t + 0.08 + i * 0.11 + Math.random() * 0.05, 0.05, 0.08 * w * (1 - i * 0.18), "bandpass", 1500 - i * 200, 900, 0.9, { pan });
    }
  }

  // --- Score -----------------------------------------------------------------------

  /** War drum: deep skin, slap and a little snare. */
  private drum(t: number, weight: number): void {
    const w = Math.max(0.4, Math.min(1.6, weight));
    this.osc(t, "sine", 96, 40, 0.42, 0.42 * w, { group: "ui", send: 0.35 });
    this.noise(t, 0.16, 0.22 * w, "lowpass", 600, 160, 0.8, { group: "ui", send: 0.35 }, true);
    this.noise(t, 0.11, 0.1 * w, "bandpass", 1700, 1300, 0.8, { group: "ui", send: 0.3 });
  }

  /** Low brass section: detuned saws through a swelling low-pass, with grit. */
  private brass(t: number, root: number, ratios: readonly number[], duration: number, level: number, glide = 1): void {
    for (const ratio of ratios) {
      for (const detune of [0.997, 1.004]) {
        const frequency = root * ratio * detune;
        this.osc(t, "sawtooth", frequency, frequency * glide, duration, level / 2,
          { group: "ui", send: 0.45, drive: 0.25 }, 0.07, 320, 1900);
      }
    }
  }

  /** Air-raid siren (Crisis/Cataclysm). */
  private siren(t: number, duration: number): void {
    const context = this.host.context();
    if (context === null) return;
    const level = this.level(0.07, "warnings");
    if (level <= 0) return;
    const oscillator = context.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(420, t);
    oscillator.frequency.linearRampToValueAtTime(820, t + duration * 0.45);
    oscillator.frequency.linearRampToValueAtTime(380, t + duration);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, t);
    envelope.gain.linearRampToValueAtTime(1, t + 0.25);
    envelope.gain.setValueAtTime(1, t + duration * 0.7);
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    oscillator.connect(envelope).connect(this.output(context, level, { send: 0.5, lowpass: 1800, drive: 0.4, group: "warnings" }));
    this.track(oscillator);
    oscillator.start(t);
    oscillator.stop(t + duration + 0.05);
  }

  // --- Building blocks -----------------------------------------------------

  private ensureGraph(context: AudioContext): GainNode | null {
    if (this.bus !== null) return this.bus;
    if (typeof context.createGain !== "function" || typeof context.createDynamicsCompressor !== "function") return null;
    const bus = context.createGain();
    // About +9 dB over the legacy pool so gunfire sits clearly above the
    // music; the glue compressor and limiter hold the big blasts.
    bus.gain.value = 2.8;
    const glue = context.createDynamicsCompressor();
    // Gentle glue: Chrome's compressor adds make-up gain, and a low threshold
    // squeezed gunfire and explosions to nearly one level.
    glue.threshold.value = -10;
    glue.knee.value = 8;
    glue.ratio.value = 3;
    glue.attack.value = 0.004;
    glue.release.value = 0.18;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.09;
    bus.connect(glue).connect(limiter).connect(context.destination);
    if (typeof context.createConvolver === "function") {
      const reverb = context.createConvolver();
      reverb.buffer = this.impulse(context, 2.2);
      const send = context.createGain();
      send.gain.value = 0.55;
      const back = context.createGain();
      back.gain.value = 0.45;
      send.connect(reverb).connect(back).connect(bus);
      this.reverbIn = send;
    }
    this.white = this.noiseBuffer(context, false);
    this.brown = this.noiseBuffer(context, true);
    this.bus = bus;
    return bus;
  }

  private panFor(side: DuelTimedAudioCue["side"]): number {
    if (side === "arena") return 0;
    const spread = this.horizontal ? 0.55 : 0.12;
    return side === "self" ? -spread : spread;
  }

  /** Rate limit for very frequent cues (cannon, keys) so they never phase. */
  private gate(key: string, seconds: number): boolean {
    const now = this.host.context()?.currentTime ?? 0;
    const last = this.lastPlayed.get(key) ?? -Infinity;
    if (now - last < seconds || this.activeVoices > MAX_VOICES) return false;
    this.lastPlayed.set(key, now);
    return true;
  }

  private level(gain: number, group: AudioGroup = "combat"): number {
    return mixedSfxGain(this.host.volume(), group, Math.min(1, gain), this.host.pronunciationActive());
  }

  private curve(drive: number): Float32Array<ArrayBuffer> {
    const key = Math.round(drive * 10);
    let curve = this.curves.get(key);
    if (curve === undefined) {
      const k = 1 + key * 1.6;
      curve = new Float32Array(new ArrayBuffer(1024 * 4));
      for (let index = 0; index < 1024; index += 1) {
        const x = (index / 1023) * 2 - 1;
        curve[index] = Math.tanh(k * x) / Math.tanh(k);
      }
      this.curves.set(key, curve);
    }
    return curve;
  }

  /** Voice output: (drive) → (low-pass) → gain → (panner) → bus, + reverb send. */
  private output(context: AudioContext, level: number, voice: Voice): AudioNode {
    const gain = context.createGain();
    gain.gain.value = level;
    let input: AudioNode = gain;
    if (voice.lowpass !== undefined && voice.lowpass < 16000 && typeof context.createBiquadFilter === "function") {
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = voice.lowpass;
      filter.Q.value = 0.7;
      filter.connect(gain);
      input = filter;
    }
    if ((voice.drive ?? 0) > 0.05 && typeof context.createWaveShaper === "function") {
      const shaper = context.createWaveShaper();
      shaper.curve = this.curve(voice.drive!);
      shaper.oversample = "2x";
      shaper.connect(input);
      input = shaper;
    }
    let head: AudioNode = gain;
    const pan = voice.pan ?? 0;
    if (Math.abs(pan) > 0.01 && typeof context.createStereoPanner === "function") {
      const panner = context.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      gain.connect(panner);
      head = panner;
    }
    head.connect(this.bus!);
    const send = voice.send ?? 0;
    if (send > 0 && this.reverbIn !== null) {
      const sendGain = context.createGain();
      sendGain.gain.value = send;
      head.connect(sendGain).connect(this.reverbIn);
    }
    return input;
  }

  private track(node: AudioScheduledSourceNode): void {
    this.activeVoices += 1;
    node.onended = () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    };
  }

  private sample(name: SampleName, t: number, gain: number, rate: number, voice: Voice, offset = 0, duration?: number, fade = 0): void {
    const context = this.host.context();
    const buffer = this.buffers.get(name);
    if (context === null || buffer === undefined) return;
    const level = this.level(gain, voice.group);
    if (level <= 0) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = Math.max(0.5, Math.min(2, rate));
    let head: AudioNode = source;
    if (duration !== undefined) {
      // Trimmed segment: fade the cut so it never clicks.
      const envelope = context.createGain();
      const length = duration / source.playbackRate.value;
      envelope.gain.setValueAtTime(fade > 0 ? 0.0001 : 1, t);
      if (fade > 0) envelope.gain.linearRampToValueAtTime(1, t + fade);
      envelope.gain.setValueAtTime(1, t + Math.max(fade, length * 0.6));
      envelope.gain.exponentialRampToValueAtTime(0.0001, t + length);
      head = source.connect(envelope);
    }
    head.connect(this.output(context, level, voice));
    this.track(source);
    if (duration !== undefined) source.start(t, offset, duration);
    else source.start(t, offset);
  }

  /**
   * One oscillator with an exponential glide and envelope. `filterFrom` /
   * `filterTo` add a low-pass sweep (brass swells, risers).
   */
  private osc(
    t: number,
    type: OscillatorType,
    from: number,
    to: number,
    duration: number,
    gain: number,
    voice: Voice,
    attack = 0.002,
    filterFrom?: number,
    filterTo?: number,
  ): void {
    const context = this.host.context();
    if (context === null) return;
    const level = this.level(gain, voice.group);
    if (level <= 0) return;
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, from), t);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, t);
    envelope.gain.linearRampToValueAtTime(1, t + Math.max(0.001, attack));
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    let head: AudioNode = oscillator.connect(envelope);
    if (filterFrom !== undefined && typeof context.createBiquadFilter === "function") {
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(filterFrom, t);
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, filterTo ?? filterFrom), t + duration * 0.5);
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, filterFrom), t + duration);
      filter.Q.value = 0.8;
      head = head.connect(filter);
    }
    head.connect(this.output(context, level, voice));
    this.track(oscillator);
    oscillator.start(t);
    oscillator.stop(t + duration + 0.03);
  }

  private noise(
    t: number,
    duration: number,
    gain: number,
    type: BiquadFilterType,
    from: number,
    to: number,
    q: number,
    voice: Voice,
    brown = false,
  ): void {
    const context = this.host.context();
    const buffer = brown ? this.brown : this.white;
    if (context === null || buffer === null) return;
    const level = this.level(gain, voice.group);
    if (level <= 0) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = duration > buffer.duration;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(1, t);
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    let head: AudioNode = source;
    if (typeof context.createBiquadFilter === "function") {
      const filter = context.createBiquadFilter();
      filter.type = type;
      filter.Q.value = q;
      filter.frequency.setValueAtTime(Math.max(30, from), t);
      filter.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + duration);
      head = source.connect(filter);
    }
    head.connect(envelope).connect(this.output(context, level, voice));
    this.track(source);
    const offset = Math.random() * Math.max(0, buffer.duration - Math.min(duration, buffer.duration));
    source.start(t, offset);
    source.stop(t + duration + 0.03);
  }

  private noiseBuffer(context: AudioContext, brown: boolean): AudioBuffer {
    const length = Math.floor(context.sampleRate * 1.5);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * white) / 1.02;
        data[index] = last * 3.5;
      } else {
        data[index] = white;
      }
    }
    return buffer;
  }

  /** A generated stereo battlefield tail: decaying noise, darker as it fades. */
  private impulse(context: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      let smooth = 0;
      for (let index = 0; index < length; index += 1) {
        const k = index / length;
        const white = Math.random() * 2 - 1;
        smooth += (white - smooth) * (0.55 - 0.45 * k);
        data[index] = smooth * Math.pow(1 - k, 2.2);
      }
    }
    return buffer;
  }
}
