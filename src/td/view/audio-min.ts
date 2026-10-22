/**
 * Typing sounds made in code (docs/td/BUILD_NOW.md §5.5, TK 24.6), no files:
 * a dealt word ticks softly in its building's timbre (at most 6 a second), a
 * right key clicks a semitone higher per letter, a wrong or stray key thocks
 * 12 dB lower, a finished word plays a pentatonic note by chain tier
 * (Perfect and Flash add a ting), an expired word puffs, Word Shots and
 * blasts hiss with a sweep, word gold ticks. One mute switch.
 */
import { FX, type RareEvent } from "../sim/events";
import { PROJECTILE } from "../sim/stores/projectiles";
import type { World } from "../sim/world";
import { KEY } from "../typing/router";
import { chainTier } from "../sim/systems/chain";

/** C major pentatonic from C5, one step per chain tier. */
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
const TICKS_PER_S = 6;

export class TypingAudio {
  muted = false;
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private ticks: number[] = [];
  private cursor = 0;

  /** Browsers start audio only from a gesture: call on the first key or click. */
  resume(): void {
    if (this.ctx === null) {
      this.ctx = new AudioContext();
      this.out = new GainNode(this.ctx, { gain: 0.6 });
      this.out.connect(this.ctx.destination);
      this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.4, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    } else if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  /** One voice: an oscillator (`freq` > 0, swept to `sweepTo`) or filtered noise (`cutoff`), with a 3 ms attack and an exponential fall. */
  private voice(seconds: number, gain: number, freq: number, type: OscillatorType = "sine", sweepTo = 0, cutoff = 0, filter: BiquadFilterType = "lowpass"): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.003);
    env.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    env.connect(this.out!);
    let source: AudioScheduledSourceNode;
    if (freq > 0) {
      const osc = (source = ctx.createOscillator());
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (sweepTo > 0) osc.frequency.exponentialRampToValueAtTime(sweepTo, t + seconds);
      osc.connect(env);
    } else {
      const noise = (source = ctx.createBufferSource());
      const band = ctx.createBiquadFilter();
      noise.buffer = this.noise;
      band.type = filter;
      band.frequency.value = cutoff;
      noise.connect(band).connect(env);
    }
    source.start(t);
    source.stop(t + seconds + 0.02);
  }

  /** This frame's rare events and the combat ring since the last call. */
  read(events: readonly RareEvent[], w: World, now: number): void {
    const ring = w.events.ring;
    const from = Math.max(this.cursor, ring.written - ring.size);
    this.cursor = ring.written;
    if (this.ctx === null || this.muted) return;
    for (const event of events) {
      if (event.t === "wordSpawn") {
        while (this.ticks.length > 0 && now - this.ticks[0]! > 1000) this.ticks.shift();
        if (this.ticks.length >= TICKS_PER_S) continue;
        this.ticks.push(now);
        const b = w.buildings.slotOf(event.building);
        const family = b >= 0 ? w.c.buildings[w.buildings.def[b]!]!.family : "attack";
        if (family === "military") this.voice(0.03, 0.025, 990, "square");
        else if (family === "economy" || family === "core") this.voice(0.035, 0.04, 1760);
        else this.voice(0.03, 0.04, 1320, "triangle");
      } else if (event.t === "wordKey") {
        const s = w.words.slotOf(event.word);
        if (event.result === KEY.wrong || event.result === KEY.stray) {
          this.voice(0.05, 0.03, 150);
          this.voice(0.03, 0.02, 0, "sine", 0, 700);
        } else if (event.result !== KEY.group) this.voice(0.018, 0.1, 880 * 2 ** (Math.min(12, s >= 0 ? w.words.typed[s]! : 8) / 12), "triangle");
      } else if (event.t === "wordHit") {
        const step = event.grade === "sloppy" ? 0 : Math.min(PENTATONIC.length - 1, chainTier(w.typing.chain) + 1);
        this.voice(0.28, event.grade === "sloppy" ? 0.06 : event.grade === "ok" ? 0.1 : 0.13, PENTATONIC[step]!);
        if (event.grade === "perfect" || event.grade === "flash") this.voice(0.18, 0.05, 2093);
      } else if (event.t === "wordMiss") this.voice(0.2, 0.07, 0, "sine", 0, 450);
    }
    let blasts = 0;
    for (let index = from; index < ring.written; index += 1) {
      const slot = index % ring.size;
      const kind = ring.kind[slot]!;
      if (kind === FX.fire && ring.value[slot] === PROJECTILE.wordShot) {
        this.voice(0.12, 0.05, 0, "sine", 0, 2400, "highpass");
        this.voice(0.12, 0.05, 660, "sawtooth", 1500);
      } else if (kind === FX.burst && blasts++ < 2) this.voice(0.25, 0.08, 0, "sine", 0, 380);
      else if (kind === FX.wordGold) this.voice(0.07, 0.05, 1568);
    }
  }
}
