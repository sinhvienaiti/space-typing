import { mixedSfxGain, type AudioGroup } from "./mix";
import type { DuelTimedAudioCue } from "../duel/audio";

/**
 * Duel combat sound on Web Audio, voiced like war film firepower: gunfire
 * (crack, body, thump, slap-back), cannon, explosions (recorded crunch, sub
 * boom, distorted rumble, debris crackle, long tail), war drums and low
 * brass. No pitched chimes or beeps (the owner rejected "tinh tinh" toy
 * sounds on 2026-10-03).
 *
 * The Duel pack used to play through pooled <audio> elements: tens of ms of
 * latency, voices cut off when the pool wrapped, no stereo, no layering.
 * Here samples are decoded once to AudioBuffers and each cue is a layered
 * voice. Stereo follows the wide layout (you left, rival right); your own
 * fire is louder than the rival's. A bus compressor and limiter keep stacked
 * explosions loud but clean.
 */

/**
 * Layers. The Duel pack's tonal "pew/ting" files (laser, energy impact,
 * precision, launches, stingers) measured spectral flatness 0.01–0.06, i.e.
 * pitched synth tones; the owner heard them as childish (2026-10-03), so
 * they are no longer played. Only the noisy pack files stay, low-passed to
 * lose their tinny 3–5 kHz edge, under recorded CC0 Kenney explosions
 * (flatness 0.32, already shipped in public/assets/audio/sfx/kenney) and
 * synthesized gunfire, sub and debris.
 */
const DUEL_SFX = {
  crunch: "/assets/audio/sfx/kenney/explosion-crunch.ogg",
  lowBoom: "/assets/audio/sfx/kenney/explosion-low.ogg",
  rocket: "/assets/audio/sfx/kenney/thruster.ogg",
  kineticImpact: "/assets/audio/duel/sfx/kinetic-impact.ogg",
  missileImpact: "/assets/audio/duel/sfx/missile-impact.ogg",
  bombImpact: "/assets/audio/duel/sfx/bomb-impact.ogg",
  shieldHit: "/assets/audio/duel/sfx/shield-hit.ogg",
  shieldBreak: "/assets/audio/duel/sfx/shield-break.ogg",
  destruction: "/assets/audio/duel/sfx/ship-destruction.ogg",
} as const;

type SampleName = keyof typeof DUEL_SFX;

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
  private voices = 0;
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
    const near = cue.side === "opponent" ? 0.6 : 1;
    const tier = cue.tier ?? 0;
    const rate = (spread = 0.12): number => 1 - spread / 2 + Math.random() * spread;

    switch (cue.cue) {
      case "laser-launch": {
        // Typing cannon: an autocannon round. Momentum makes it heavier.
        if (!this.gate("gun:" + cue.side, 0.024)) return true;
        const heat = cue.side === "self" ? this.selfTier : 0;
        this.gunshot(t, (0.62 + heat * 0.07) * near, pan, 0.14 + heat * 0.02);
        return true;
      }
      case "energy-impact": {
        // A round striking armour: crack, thud, a little debris.
        if (!this.gate("hit:" + cue.side, 0.018)) return true;
        const onYou = cue.side === "self";
        this.noise(t, 0.03, onYou ? 0.7 : 0.55, "bandpass", 2600, 1800, 1.1, { pan });
        this.noise(t, 0.07, onYou ? 0.5 : 0.36, "lowpass", 1400, 300, 0.8, { pan, drive: 0.5 }, true);
        this.osc(t, "sine", onYou ? 130 : 150, 44, 0.11, onYou ? 0.7 : 0.5, { pan });
        this.sample("crunch", t, onYou ? 0.42 : 0.28, rate(0.3) * 1.25, { pan, lowpass: 3500 }, 0, 0.22);
        return true;
      }
      case "missile-launch":
        this.rocket(t, 0.5, near, pan);
        this.gunshot(t, 0.55 * near, pan, 0.2, 900);
        return true;
      case "missile-impact":
        this.explosion(t, 1, pan);
        return true;
      case "heavy-launch":
        this.cannon(t, near, pan);
        return true;
      case "heavy-impact":
        this.explosion(t, 1.25, pan);
        // Armour ringing under the blast (resonant noise, not a tone).
        this.noise(t, 0.38, 0.12, "bandpass", 620, 560, 9, { pan, send: 0.3 });
        return true;
      case "bomb-launch":
        this.osc(t, "sine", 82, 38, 0.22, 0.4 * near, { pan });
        this.noise(t, 0.16, 0.25 * near, "lowpass", 700, 200, 0.7, { pan, send: 0.2 }, true);
        // The falling-bomb whistle of every war film, kept low and filtered.
        this.osc(t + 0.05, "triangle", 1500, 720, 0.75, 0.035 * near, { pan, lowpass: 1600 }, 0.12);
        return true;
      case "bomb-impact":
        this.explosion(t, 1.8, pan);
        this.sample("lowBoom", t, 0.55, 0.85, { pan });
        return true;
      case "support":
        // Servo and power coupling: mechanical, low, no chime.
        this.click(t, 0.8 * near, pan);
        this.osc(t, "sawtooth", 70, 150, 0.42, 0.06 * near, { pan, lowpass: 520, send: 0.2 }, 0.04);
        this.noise(t + 0.05, 0.28, 0.06 * near, "highpass", 2800, 4200, 0.7, { pan });
        return true;
      case "bank":
        this.click(t, 0.6, 0);
        return true;
      case "warning":
        // Military klaxon, two blasts.
        for (const at of [0, 0.2]) {
          this.osc(t + at, "square", 440, 380, 0.16, 0.05, { pan, group: "warnings", lowpass: 1400, drive: 0.4 });
        }
        return true;
      case "intercept":
        // Flak burst.
        this.gunshot(t, 0.9, pan, 0.3);
        this.sample("crunch", t, 0.32, 1.4, { pan, lowpass: 4000 }, 0, 0.3);
        return true;
      case "precision":
        // Ordnance armed: breech clack and a rising charge whine.
        this.click(t, 1.2, pan);
        this.osc(t + 0.03, "sawtooth", 160, 520, 0.22, 0.05, { pan, lowpass: 900, drive: 0.3 }, 0.02);
        return true;
      case "cataclysm":
        this.explosion(t, 2.2, 0);
        this.siren(t + 0.2, 1.6);
        return true;
      case "typing-miss":
        // A jammed round: dry clunk and a short low buzz.
        this.noise(t, 0.012, 0.28, "bandpass", 900, 700, 1.4, { pan, group: "typing" });
        this.osc(t, "square", 62, 55, 0.08, 0.06, { pan, group: "typing", lowpass: 320 });
        return true;
      case "type-tick": {
        // Every correct key feeds the gun: a metal clack, heavier with momentum.
        if (!this.gate("tick", 0.016)) return true;
        this.click(t, 0.55 + Math.min(6, tier) * 0.1, pan, "typing");
        return true;
      }
      case "streak-tier": {
        // Weapons overdrive: a rising roar, then a heavy gun and a clank.
        this.osc(t, "sawtooth", 46, 120, 0.34, 0.12, { pan, lowpass: 900, drive: 0.6, send: 0.2 }, 0.05);
        this.noise(t, 0.32, 0.14, "bandpass", 300, 2400, 1.1, { pan, send: 0.2 }, true);
        const hit = t + 0.3;
        this.cannon(hit, 0.8 + Math.min(6, tier) * 0.09, pan);
        this.noise(hit, 0.3, 0.1, "bandpass", 1150, 1050, 10, { pan, send: 0.3 });
        return true;
      }
      case "streak-break":
        // Overheated barrel venting: hiss and a dead clunk.
        this.noise(t, 0.5, 0.2, "highpass", 3200, 5200, 0.7, { pan, group: "typing" });
        this.osc(t, "sine", 120, 45, 0.18, 0.6, { pan, group: "typing" });
        this.noise(t, 0.03, 0.5, "bandpass", 700, 500, 1.5, { pan, group: "typing" });
        return true;
      case "shield-hit":
        // Energy shield taking a round: crackle and a resonant thud.
        if (!this.gate("shield:" + cue.side, 0.04)) return true;
        this.sample("shieldHit", t, 0.45, rate(0.2) * 0.9, { pan, lowpass: 3000 });
        this.noise(t, 0.08, 0.3, "highpass", 2400, 1800, 0.8, { pan });
        this.noise(t, 0.14, 0.28, "bandpass", 900, 780, 7, { pan, send: 0.2 });
        this.osc(t, "sine", 110, 55, 0.13, 0.45, { pan });
        return true;
      case "shield-break":
        this.sample("shieldBreak", t, 0.55, 0.9, { pan, lowpass: 5000, send: 0.3 });
        this.crackle(t, 0.5, 14, 0.18, pan);
        this.boom(t, 0.9, pan, 0.3);
        return true;
      case "ko-blast": {
        const step = cue.step ?? 0;
        this.explosion(t, 0.75 + step * 0.08, pan);
        return true;
      }
      case "ko-final":
        this.explosion(t, 2.6, pan);
        this.sample("lowBoom", t, 0.75, 0.75, { pan });
        this.sample("lowBoom", t + 0.32, 0.5, 0.62, { pan: -pan, send: 0.5 });
        this.sample("destruction", t, 0.5, 0.8, { pan, lowpass: 3000, send: 0.6 });
        this.noise(t, 2.4, 0.34, "lowpass", 900, 50, 0.7, { pan, send: 0.5, drive: 0.5 }, true);
        this.crackle(t + 0.15, 1.6, 26, 0.2, pan);
        return true;
      case "round-win":
      case "match-win": {
        const big = cue.cue === "match-win";
        // War drums and a low brass major chord.
        for (const at of big ? [0, 0.26, 0.52, 0.9] : [0, 0.26, 0.52]) this.drum(t + at, at === 0 ? 1.2 : 0.9);
        this.brass(t + 0.08, 130.81, big ? [1, 1.26, 1.5, 2, 2.52] : [1, 1.26, 1.5, 2], big ? 2.4 : 1.7, 0.05);
        if (big) this.noise(t + 0.52, 1.6, 0.08, "highpass", 5000, 7000, 0.6, { group: "ui", send: 0.6 });
        return true;
      }
      case "round-loss":
      case "match-loss": {
        const big = cue.cue === "match-loss";
        this.drum(t, 1.1);
        this.drum(t + 0.7, 0.9);
        this.brass(t + 0.05, 110, [1, 1.19, 1.5], big ? 2.4 : 1.8, 0.05, 0.94);
        this.noise(t, 1.6, 0.14, "lowpass", 400, 60, 0.7, { send: 0.4 }, true);
        return true;
      }
      case "round-draw":
        this.drum(t, 1);
        this.brass(t + 0.05, 123.47, [1, 1.5, 2], 1.5, 0.045);
        return true;
      case "round-ready":
        // Heartbeat drums under rising tension.
        this.drum(t, 0.8);
        this.drum(t + 0.42, 0.95);
        this.noise(t, 1, 0.08, "bandpass", 200, 1400, 1.2, { group: "ui", send: 0.3 }, true);
        return true;
      case "fight":
        this.drum(t, 1.4);
        this.brass(t, 146.83, [1, 1.5, 2], 0.7, 0.06);
        this.gunshot(t + 0.02, 0.9, -0.3, 0.3);
        this.gunshot(t + 0.09, 0.9, 0.3, 0.3);
        return true;
      case "phase-shift": {
        const root = 98 * Math.pow(2, Math.min(4, tier) / 12);
        this.brass(t, root, [1, 1.5, 2], 1.4, 0.05);
        this.drum(t, 1.1);
        this.drum(t + 0.36, 0.85);
        if (tier >= 3) this.siren(t + 0.1, 1.4);
        return true;
      }
    }
  }

  // --- Weapons --------------------------------------------------------------------

  /** One round fired: transient crack, gritty body, low thump, slap-back. */
  private gunshot(t: number, weight: number, pan: number, send: number, lowpass = 6000): void {
    const w = Math.max(0.2, Math.min(2.4, weight));
    this.noise(t, 0.008, 0.95 * w, "highpass", 1800, 1800, 0.7, { pan, lowpass });
    this.noise(t, 0.06, 0.6 * w, "bandpass", 850, 600, 0.9, { pan, drive: 0.6, lowpass });
    this.noise(t, 0.1 + 0.04 * w, 0.62 * w, "lowpass", 2600, 480, 0.8, { pan, send, drive: 0.5, lowpass });
    this.osc(t, "sine", 150, 44, 0.1 + 0.03 * w, 0.75 * w, { pan });
  }

  /** Tank-gun class shot: a huge gunshot over a recorded blast. */
  private cannon(t: number, weight: number, pan: number): void {
    this.gunshot(t, 1.5 * weight, pan, 0.45);
    this.sample("crunch", t, 0.42 * weight, 0.7, { pan, lowpass: 2600, send: 0.4 });
    this.sample("lowBoom", t, 0.42 * weight, 1.15, { pan }, 0, 0.9);
  }

  private rocket(t: number, duration: number, weight: number, pan: number): void {
    const buffer = this.buffers.get("rocket");
    const offset = buffer === undefined ? 0 : Math.random() * Math.max(0, buffer.duration - duration - 0.1);
    this.sample("rocket", t, 0.45 * weight, 1.15, { pan, lowpass: 3200, send: 0.2 }, offset, duration, 0.05);
    this.noise(t, duration, 0.14 * weight, "bandpass", 420, 1700, 1.1, { pan });
    this.osc(t, "sawtooth", 55, 72, duration, 0.08 * weight, { pan, lowpass: 240, drive: 0.6 }, 0.03);
  }

  /**
   * An explosion: recorded crunch (and the owner's noisy blast files, dulled),
   * sub thump, distorted rumble, debris crackle and a long tail.
   */
  private explosion(t: number, weight: number, pan: number): void {
    const w = Math.max(0.4, Math.min(2.8, weight));
    this.sample("crunch", t, 0.5 + 0.12 * w, 1.08 - w * 0.12 + Math.random() * 0.1, { pan, lowpass: 3800 - w * 500, send: 0.35 + 0.08 * w });
    this.sample(w >= 1.6 ? "bombImpact" : Math.random() < 0.5 ? "missileImpact" : "kineticImpact", t, 0.22 + 0.05 * w, 0.82, { pan, lowpass: 2200, send: 0.3 });
    if (w >= 1.1) this.sample("lowBoom", t, Math.min(0.75, 0.25 * w), 1.25 - w * 0.12, { pan }, 0, 0.6 + 0.5 * w);
    this.boom(t, w, pan, 0.4 + 0.1 * w);
    this.crackle(t + 0.04, 0.35 + 0.25 * w, Math.round(4 + 4 * w), 0.1 + 0.03 * w, pan);
  }

  /** Breech/feed clack: two metal transients and a low knock. */
  private click(t: number, weight: number, pan: number, group: AudioGroup = "combat"): void {
    const w = Math.max(0.3, Math.min(1.6, weight));
    this.noise(t, 0.006, 0.6 * w, "bandpass", 3600 - 600 * w, 3600 - 600 * w, 3.5, { pan, group });
    this.noise(t + 0.022, 0.009, 0.5 * w, "bandpass", 1900 - 300 * w, 1900 - 300 * w, 4, { pan, group });
    this.osc(t, "sine", 170, 70, 0.05 + 0.02 * w, 0.42 * w, { pan, group });
  }

  /** Burning debris: short random snaps spread over `duration`. */
  private crackle(t: number, duration: number, grains: number, level: number, pan: number): void {
    for (let index = 0; index < grains; index += 1) {
      const at = t + Math.pow(Math.random(), 1.6) * duration;
      const frequency = 1800 + Math.random() * 3200;
      this.noise(at, 0.006 + Math.random() * 0.012, level * (0.4 + Math.random() * 0.6), "bandpass", frequency, frequency, 1.5,
        { pan: Math.max(-1, Math.min(1, pan + (Math.random() - 0.5) * 0.5)) });
    }
  }

  /** An explosion's body: kick sub, distorted rumble and crack. */
  private boom(t: number, weight: number, pan: number, send: number): void {
    const w = Math.max(0.3, Math.min(2.8, weight));
    this.osc(t, "sine", 115 + 20 * w, 28, 0.3 + 0.16 * w, 0.26 + 0.1 * w, { pan });
    this.noise(t, 0.45 + 0.4 * w, 0.16 + 0.08 * w, "lowpass", 1000 + 300 * w, 90, 0.6, { pan, send, drive: 0.55 }, true);
    this.noise(t, 0.05, 0.14 + 0.04 * w, "bandpass", 2200, 1400, 0.9, { pan });
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
    glue.threshold.value = -16;
    glue.knee.value = 10;
    glue.ratio.value = 4;
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
    if (now - last < seconds || this.voices > MAX_VOICES) return false;
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
    this.voices += 1;
    node.onended = () => {
      this.voices = Math.max(0, this.voices - 1);
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
