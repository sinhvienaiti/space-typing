/**
 * Tiny offline synthesizer for Space Typing's generated music (no packages).
 * Instruments render notes straight into stereo buses; effects and the
 * master chain work on whole buffers. Everything is deterministic (seeded
 * noise), so the same script always renders the same track.
 *
 * Used by scripts/music/render-world-theme.mjs. See docs/MUSIC_WORLD_01.md.
 */

export const SAMPLE_RATE = 48000;

// ---------------------------------------------------------------------------
// Basics.
// ---------------------------------------------------------------------------

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A4" → 69, "G#3" → 56, "Bb2" → 46. */
export function midi(name) {
  const match = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (match === null) throw new Error("Bad note name: " + name);
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  return 12 * (Number(match[3]) + 1) + NOTE_INDEX[match[1]] + accidental;
}

export function hz(midiNote) {
  return 440 * 2 ** ((midiNote - 69) / 12);
}

export function dbToGain(db) {
  return 10 ** (db / 20);
}

/** Seeded PRNG (mulberry32): deterministic noise and humanising. */
export function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Bus {
  constructor(frames) {
    this.l = new Float32Array(frames);
    this.r = new Float32Array(frames);
  }

  get frames() {
    return this.l.length;
  }
}

function polyBlep(t, dt) {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

/**
 * State-variable filter (Zavalishin TPT): stable while its cutoff moves.
 * `process` returns the chosen response for one sample.
 */
export class Svf {
  constructor(mode = "low", q = 0.707) {
    this.mode = mode;
    this.k = 1 / q;
    this.ic1 = 0;
    this.ic2 = 0;
    this.setCutoff(1000);
  }

  setCutoff(cutoff) {
    const fc = Math.min(SAMPLE_RATE * 0.45, Math.max(10, cutoff));
    const g = Math.tan((Math.PI * fc) / SAMPLE_RATE);
    this.a1 = 1 / (1 + g * (g + this.k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }

  process(input) {
    const v3 = input - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    if (this.mode === "low") return v2;
    if (this.mode === "band") return v1;
    return input - this.k * v1 - v2;
  }
}

/** Smooth attack / hold / exponential release amplitude. */
function envelope(t, duration, attack, release, sustain = 1, decay = 0.2) {
  if (t < 0) return 0;
  let level;
  if (t < attack) {
    const x = t / attack;
    level = x * x * (3 - 2 * x);
  } else {
    level = sustain + (1 - sustain) * Math.exp(-(t - attack) / Math.max(1e-4, decay));
  }
  if (t > duration) level *= Math.exp(-(t - duration) / Math.max(1e-4, release / 4.6));
  return level;
}

function frameOf(seconds) {
  return Math.round(seconds * SAMPLE_RATE);
}

function pan(value) {
  // Constant-power pan, value -1 (left) … 1 (right).
  const angle = ((value + 1) * Math.PI) / 4;
  return [Math.cos(angle), Math.sin(angle)];
}

// ---------------------------------------------------------------------------
// Instruments. Each takes a bus, a start time and a length in seconds.
// ---------------------------------------------------------------------------

/**
 * Supersaw pad: detuned saws spread across the stereo field, through a
 * slowly breathing low-pass.
 */
export function pad(bus, start, duration, notes, options = {}) {
  const {
    gain = 0.1,
    attack = 1.2,
    release = 2.4,
    cutoff = 1400,
    cutoffEnd = cutoff,
    q = 0.9,
    voices = 5,
    detune = 14,
    width = 0.9,
    wobble = 0.18,
    seed = 1,
    /** Level at the end of the note relative to its start (crescendo > 1). */
    swellTo = 1,
  } = options;
  const random = rng(seed);
  const first = frameOf(start);
  const length = frameOf(duration + release);
  const filters = [new Svf("low", q), new Svf("low", q)];
  const oscillators = [];
  for (const note of notes) {
    for (let voice = 0; voice < voices; voice += 1) {
      const spread = voices === 1 ? 0 : voice / (voices - 1) - 0.5;
      const cents = spread * 2 * detune + (random() - 0.5) * 3;
      const [left, right] = pan(spread * 2 * width);
      oscillators.push({
        phase: random(),
        step: (hz(note) * 2 ** (cents / 1200)) / SAMPLE_RATE,
        left: left / Math.sqrt(voices * notes.length),
        right: right / Math.sqrt(voices * notes.length),
      });
    }
  }
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    if ((index & 31) === 0) {
      const progress = Math.min(1, t / Math.max(0.01, duration));
      const sweep = cutoff * (cutoffEnd / cutoff) ** progress;
      const breath = 1 + Math.sin(t * 0.9 + seed) * wobble;
      filters[0].setCutoff(sweep * breath);
      filters[1].setCutoff(sweep * breath);
    }
    let left = 0;
    let right = 0;
    for (const osc of oscillators) {
      const value = 2 * osc.phase - 1 - polyBlep(osc.phase, osc.step);
      osc.phase += osc.step;
      if (osc.phase >= 1) osc.phase -= 1;
      left += value * osc.left;
      right += value * osc.right;
    }
    const swell = 1 + (swellTo - 1) * Math.min(1, t / Math.max(0.01, duration));
    const amp = envelope(t, duration, attack, release) * gain * swell;
    bus.l[frame] += filters[0].process(left) * amp;
    bus.r[frame] += filters[1].process(right) * amp;
  }
}

/** Plucked synth (arpeggios): saw + pulse with a snappy filter envelope. */
export function pluck(bus, start, duration, note, options = {}) {
  const {
    gain = 0.1,
    cutoff = 2600,
    floor = 380,
    decay = 0.22,
    release = 0.25,
    panning = 0,
    q = 1.4,
    pulseMix = 0.35,
  } = options;
  const first = frameOf(start);
  const length = frameOf(duration + release);
  const filter = new Svf("low", q);
  const step = hz(note) / SAMPLE_RATE;
  const [left, right] = pan(panning);
  let phase = 0;
  let pulsePhase = 0.5;
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    if ((index & 15) === 0) filter.setCutoff(floor + (cutoff - floor) * Math.exp(-t / (decay * 0.6)));
    const saw = 2 * phase - 1 - polyBlep(phase, step);
    const pulse = (phase < 0.5 ? 1 : -1) + polyBlep(phase, step) - polyBlep(pulsePhase, step);
    phase += step;
    if (phase >= 1) phase -= 1;
    pulsePhase += step;
    if (pulsePhase >= 1) pulsePhase -= 1;
    const amp = envelope(t, duration, 0.004, release, 0, decay) * gain;
    const value = filter.process(saw * (1 - pulseMix) + pulse * pulseMix) * amp;
    bus.l[frame] += value * left;
    bus.r[frame] += value * right;
  }
}

/** FM bell / glass: soft chill lead. */
export function bell(bus, start, duration, note, options = {}) {
  const { gain = 0.1, ratio = 3.5, index = 2.2, decay = 1.4, panning = 0, detune = 4 } = options;
  const first = frameOf(start);
  const length = frameOf(duration + decay * 2.5);
  const f = hz(note);
  for (const side of [-1, 1]) {
    const carrierStep = (2 * Math.PI * f * 2 ** ((side * detune) / 1200)) / SAMPLE_RATE;
    const modulatorStep = carrierStep * ratio;
    const [left, right] = pan(Math.max(-1, Math.min(1, panning + side * 0.35)));
    let carrier = 0;
    let modulator = side * 0.7;
    for (let sample = 0; sample < length; sample += 1) {
      const frame = first + sample;
      if (frame >= bus.frames) break;
      const t = sample / SAMPLE_RATE;
      const depth = index * (0.25 + 0.75 * Math.exp(-t / 0.18));
      const value = Math.sin(carrier + depth * Math.sin(modulator));
      carrier += carrierStep;
      modulator += modulatorStep;
      const amp = Math.min(1, t / 0.006) * Math.exp(-t / decay) * (t > duration ? Math.exp(-(t - duration) / (decay * 0.6)) : 1);
      const out = value * amp * gain * 0.5;
      bus.l[frame] += out * left;
      bus.r[frame] += out * right;
    }
  }
}

/**
 * Saw lead with glide from the previous note and delayed vibrato.
 * `from` = previous MIDI note (or null) for portamento.
 */
export function lead(bus, start, duration, note, options = {}) {
  const { gain = 0.1, from = null, glide = 0.045, cutoff = 3200, vibrato = 0.13, release = 0.16, panning = 0 } = options;
  const first = frameOf(start);
  const length = frameOf(duration + release);
  const filters = [new Svf("low", 0.8), new Svf("low", 0.8)];
  const detunes = [-9, 0, 9];
  const phases = [0.1, 0.6, 0.35];
  const sub = { phase: 0 };
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    const gliding = from !== null && t < glide ? from + (note - from) * (t / glide) : note;
    const vib = t > 0.22 ? Math.sin(2 * Math.PI * 5.4 * t) * vibrato * Math.min(1, (t - 0.22) / 0.3) : 0;
    const base = hz(gliding + vib);
    if ((index & 15) === 0) {
      const bright = cutoff * (0.75 + 0.25 * Math.exp(-t / 0.2));
      filters[0].setCutoff(bright);
      filters[1].setCutoff(bright * 1.04);
    }
    let left = 0;
    let right = 0;
    detunes.forEach((cents, voice) => {
      const step = (base * 2 ** (cents / 1200)) / SAMPLE_RATE;
      const value = 2 * phases[voice] - 1 - polyBlep(phases[voice], step);
      phases[voice] += step;
      if (phases[voice] >= 1) phases[voice] -= 1;
      left += value * (voice === 2 ? 0.45 : voice === 0 ? 1 : 0.8);
      right += value * (voice === 0 ? 0.45 : voice === 2 ? 1 : 0.8);
    });
    const subStep = base / 2 / SAMPLE_RATE;
    const square = sub.phase < 0.5 ? 0.35 : -0.35;
    sub.phase += subStep;
    if (sub.phase >= 1) sub.phase -= 1;
    const amp = envelope(t, duration, 0.012, release, 0.82, 0.25) * gain * 0.4;
    const [pl, pr] = pan(panning);
    bus.l[frame] += filters[0].process(left + square) * amp * pl * 1.41;
    bus.r[frame] += filters[1].process(right + square) * amp * pr * 1.41;
  }
}

/** Bass: `sub` = warm sine, `pluck` = filtered saw on a sine sub. Mono. */
export function bass(bus, start, duration, note, options = {}) {
  const { gain = 0.2, kind = "sub", cutoff = 900, release = 0.12 } = options;
  const first = frameOf(start);
  const length = frameOf(duration + release);
  const step = hz(note) / SAMPLE_RATE;
  const filter = new Svf("low", 1.1);
  let phase = 0;
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    const sine = Math.sin(2 * Math.PI * phase);
    let value = sine + 0.12 * Math.sin(4 * Math.PI * phase);
    if (kind === "pluck") {
      if ((index & 15) === 0) filter.setCutoff(140 + cutoff * Math.exp(-t / 0.09));
      const saw = 2 * phase - 1 - polyBlep(phase, step);
      value = sine * 0.75 + filter.process(saw) * 0.6;
    }
    phase += step;
    if (phase >= 1) phase -= 1;
    const amp = envelope(t, duration, kind === "pluck" ? 0.003 : 0.02, release, kind === "pluck" ? 0.7 : 1, 0.18) * gain;
    const out = Math.tanh(value * 1.2) * amp;
    bus.l[frame] += out;
    bus.r[frame] += out;
  }
}

/** Kick: pitch-swept sine with a short click. */
export function kick(bus, start, options = {}) {
  const { gain = 0.5, decay = 0.34, top = 150, bottom = 44, click = 0.25, seed = 7 } = options;
  const random = rng(seed);
  const first = frameOf(start);
  const length = frameOf(decay * 4);
  let phase = 0;
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    const f = bottom + (top - bottom) * Math.exp(-t / 0.028);
    phase += (2 * Math.PI * f) / SAMPLE_RATE;
    const body = Math.sin(phase) * Math.exp(-t / decay) * Math.min(1, t / 0.0015);
    const tick = t < 0.004 ? (random() * 2 - 1) * (1 - t / 0.004) * click : 0;
    const out = Math.tanh((body + tick) * 1.6) * gain;
    bus.l[frame] += out;
    bus.r[frame] += out;
  }
}

/** Snare (or clap): tuned body plus band-passed noise. */
export function snare(bus, start, options = {}) {
  const { gain = 0.3, decay = 0.17, tone = 188, clap = false, seed = 11, panning = 0 } = options;
  const random = rng(seed);
  const first = frameOf(start);
  const length = frameOf(decay * 4);
  const band = new Svf("band", 0.9);
  band.setCutoff(clap ? 1500 : 2800);
  const high = new Svf("high", 0.7);
  high.setCutoff(900);
  const [left, right] = pan(panning);
  let phase = 0;
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    phase += (2 * Math.PI * (tone - 30 * Math.min(1, t / 0.05))) / SAMPLE_RATE;
    const body = clap ? 0 : Math.sin(phase) * Math.exp(-t / 0.06) * 0.7;
    let burst = Math.exp(-t / decay);
    if (clap) {
      // Three quick slaps, then the tail.
      const slap = t % 0.011;
      burst = t < 0.033 ? Math.exp(-slap / 0.004) : Math.exp(-(t - 0.033) / decay);
    }
    const noise = high.process(band.process(random() * 2 - 1)) * burst * 1.6;
    const out = Math.tanh((body + noise) * 1.3) * gain;
    bus.l[frame] += out * left;
    bus.r[frame] += out * right;
  }
}

/** Hi-hat: high-passed noise, closed or open. */
export function hat(bus, start, options = {}) {
  const { gain = 0.08, open = false, panning = 0.15, seed = 23 } = options;
  const random = rng(seed);
  const first = frameOf(start);
  const decay = open ? 0.24 : 0.032;
  const length = frameOf(decay * 5);
  const high = new Svf("high", 0.9);
  high.setCutoff(7200);
  const band = new Svf("band", 1.2);
  band.setCutoff(10500);
  const [left, right] = pan(panning);
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    const noise = random() * 2 - 1;
    const value = (high.process(noise) * 0.7 + band.process(noise) * 0.6) * Math.exp(-t / decay);
    bus.l[frame] += value * gain * left;
    bus.r[frame] += value * gain * right;
  }
}

/** Tom for fills. */
export function tom(bus, start, note, options = {}) {
  const { gain = 0.25, panning = 0 } = options;
  const first = frameOf(start);
  const length = frameOf(0.6);
  const f0 = hz(note);
  const [left, right] = pan(panning);
  let phase = 0;
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    phase += (2 * Math.PI * f0 * (1 + 0.6 * Math.exp(-t / 0.04))) / SAMPLE_RATE;
    const out = Math.tanh(Math.sin(phase) * 1.4) * Math.exp(-t / 0.16) * gain;
    bus.l[frame] += out * left;
    bus.r[frame] += out * right;
  }
}

/** Noise riser: band-pass sweeping up while it swells. */
export function riser(bus, start, duration, options = {}) {
  const { gain = 0.12, from = 350, to = 9000, seed = 31 } = options;
  const random = rng(seed);
  const first = frameOf(start);
  const length = frameOf(duration);
  const filters = [new Svf("band", 1.6), new Svf("band", 1.6)];
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const progress = index / length;
    if ((index & 31) === 0) {
      const cutoff = from * (to / from) ** progress;
      filters[0].setCutoff(cutoff);
      filters[1].setCutoff(cutoff * 1.07);
    }
    const amp = progress * progress * gain;
    bus.l[frame] += filters[0].process(random() * 2 - 1) * amp;
    bus.r[frame] += filters[1].process(random() * 2 - 1) * amp;
  }
}

/** Reverse cymbal swell into a downbeat (ends exactly at start + duration). */
export function swell(bus, start, duration, options = {}) {
  const { gain = 0.1, seed = 41 } = options;
  const random = rng(seed);
  const first = frameOf(start);
  const length = frameOf(duration);
  const filters = [new Svf("high", 0.8), new Svf("high", 0.8)];
  filters[0].setCutoff(5200);
  filters[1].setCutoff(5600);
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const progress = index / length;
    const amp = progress ** 3 * gain;
    bus.l[frame] += filters[0].process(random() * 2 - 1) * amp;
    bus.r[frame] += filters[1].process(random() * 2 - 1) * amp;
  }
}

/** Crash / impact: noise wash plus a sub drop. */
export function impact(bus, start, options = {}) {
  const { gain = 0.25, sub = 0.6, seed = 53 } = options;
  const random = rng(seed);
  const first = frameOf(start);
  const length = frameOf(3.2);
  const filters = [new Svf("high", 0.7), new Svf("high", 0.7)];
  filters[0].setCutoff(3000);
  filters[1].setCutoff(3300);
  let phase = 0;
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    phase += (2 * Math.PI * (32 + 40 * Math.exp(-t / 0.25))) / SAMPLE_RATE;
    const boom = Math.sin(phase) * Math.exp(-t / 0.9) * sub;
    const wash = Math.exp(-t / 0.85) * Math.min(1, t / 0.0015);
    bus.l[frame] += (filters[0].process(random() * 2 - 1) * wash + boom) * gain;
    bus.r[frame] += (filters[1].process(random() * 2 - 1) * wash + boom) * gain;
  }
}

/**
 * Quiet space wind: filtered noise drifting in pitch and across the stereo
 * field. With `loopFade`, it fades in over its first seconds and out over
 * the same span after `duration`, so a loop fold crossfades it seamlessly.
 */
export function atmosphere(bus, start, duration, options = {}) {
  const { gain = 0.03, seed = 61, loopFade = 0 } = options;
  const random = rng(seed);
  const first = frameOf(start);
  const length = frameOf(duration + loopFade);
  const filters = [new Svf("band", 2.5), new Svf("band", 2.5)];
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    if ((index & 63) === 0) {
      filters[0].setCutoff(500 + 380 * Math.sin(t * 0.21) + 160 * Math.sin(t * 0.53));
      filters[1].setCutoff(560 + 380 * Math.sin(t * 0.19 + 1.3) + 160 * Math.sin(t * 0.47));
    }
    // Equal-power fades: in over [0, loopFade], out over [duration, +loopFade].
    let fade = 1;
    if (loopFade > 0 && t < loopFade) fade = Math.sin((t / loopFade) * (Math.PI / 2));
    if (loopFade > 0 && t > duration) fade = Math.cos(Math.min(1, (t - duration) / loopFade) * (Math.PI / 2));
    const drift = 0.5 + 0.5 * Math.sin(t * 0.13);
    bus.l[frame] += filters[0].process(random() * 2 - 1) * gain * fade * (0.6 + 0.4 * drift);
    bus.r[frame] += filters[1].process(random() * 2 - 1) * gain * fade * (1 - 0.4 * drift);
  }
}

// ---------------------------------------------------------------------------
// Effects on whole buses.
// ---------------------------------------------------------------------------

/** Adds `source * gain` into `target`. */
export function mixInto(target, source, gain = 1) {
  for (let index = 0; index < target.frames; index += 1) {
    target.l[index] += source.l[index] * gain;
    target.r[index] += source.r[index] * gain;
  }
}

/** 12 dB/oct high-pass on a bus (removes rumble below `cutoff`). */
export function highPass(bus, cutoff) {
  const filters = [new Svf("high", 0.707), new Svf("high", 0.707)];
  filters[0].setCutoff(cutoff);
  filters[1].setCutoff(cutoff);
  for (let index = 0; index < bus.frames; index += 1) {
    bus.l[index] = filters[0].process(bus.l[index]);
    bus.r[index] = filters[1].process(bus.r[index]);
  }
}

export function lowPass(bus, cutoff) {
  const filters = [new Svf("low", 0.707), new Svf("low", 0.707)];
  filters[0].setCutoff(cutoff);
  filters[1].setCutoff(cutoff);
  for (let index = 0; index < bus.frames; index += 1) {
    bus.l[index] = filters[0].process(bus.l[index]);
    bus.r[index] = filters[1].process(bus.r[index]);
  }
}

/**
 * Side-chain pump: ducks the bus after each kick time (seconds), recovering
 * over `release` seconds.
 */
export function sidechain(bus, kickTimes, depth, release = 0.18) {
  const gainCurve = new Float32Array(bus.frames).fill(1);
  for (const time of kickTimes) {
    const first = frameOf(time);
    const length = frameOf(release * 3);
    for (let index = 0; index < length; index += 1) {
      const frame = first + index;
      if (frame >= bus.frames) break;
      const t = index / SAMPLE_RATE;
      const attack = Math.min(1, t / 0.004);
      const duck = 1 - depth * attack * Math.exp(-t / release);
      if (duck < gainCurve[frame]) gainCurve[frame] = duck;
    }
  }
  for (let index = 0; index < bus.frames; index += 1) {
    bus.l[index] *= gainCurve[index];
    bus.r[index] *= gainCurve[index];
  }
}

/** Ping-pong delay; returns the wet signal as a new bus. */
export function pingPong(bus, seconds, feedback = 0.38, damp = 3200) {
  const out = new Bus(bus.frames);
  const delay = frameOf(seconds);
  const left = new Float32Array(delay);
  const right = new Float32Array(delay);
  const filters = [new Svf("low", 0.707), new Svf("low", 0.707)];
  filters[0].setCutoff(damp);
  filters[1].setCutoff(damp);
  let cursor = 0;
  for (let index = 0; index < bus.frames; index += 1) {
    const dl = left[cursor];
    const dr = right[cursor];
    out.l[index] = dl;
    out.r[index] = dr;
    const mono = (bus.l[index] + bus.r[index]) * 0.5;
    // Cross-feed: the left echo feeds the right line and back.
    left[cursor] = filters[0].process(mono + dr * feedback);
    right[cursor] = filters[1].process(dl * feedback);
    cursor += 1;
    if (cursor >= delay) cursor = 0;
  }
  return out;
}

/** Freeverb (Jezar): 8 combs + 4 all-passes per side. Returns the wet bus. */
export function reverb(bus, options = {}) {
  const { room = 0.84, damp = 0.35, width = 1, preDelay = 0.02 } = options;
  const scale = SAMPLE_RATE / 44100;
  const combTunings = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const allpassTunings = [556, 441, 341, 225];
  const spread = 23;
  const feedback = room * 0.28 + 0.7;
  const damping = damp * 0.4;
  const make = (tuning) => ({ buffer: new Float32Array(Math.round(tuning * scale)), index: 0, store: 0 });
  const sides = [0, spread].map((offset) => ({
    combs: combTunings.map((tuning) => make(tuning + offset)),
    allpasses: allpassTunings.map((tuning) => make(tuning + offset)),
  }));
  const pre = frameOf(preDelay);
  const out = new Bus(bus.frames);
  const wet = [new Float32Array(bus.frames), new Float32Array(bus.frames)];
  for (let index = 0; index < bus.frames; index += 1) {
    const source = index - pre;
    const input = source >= 0 ? (bus.l[source] + bus.r[source]) * 0.015 : 0;
    sides.forEach((side, channel) => {
      let sum = 0;
      for (const comb of side.combs) {
        const output = comb.buffer[comb.index];
        comb.store = output * (1 - damping) + comb.store * damping;
        comb.buffer[comb.index] = input + comb.store * feedback;
        comb.index += 1;
        if (comb.index >= comb.buffer.length) comb.index = 0;
        sum += output;
      }
      for (const allpass of side.allpasses) {
        const buffered = allpass.buffer[allpass.index];
        const output = -sum + buffered;
        allpass.buffer[allpass.index] = sum + buffered * 0.5;
        allpass.index += 1;
        if (allpass.index >= allpass.buffer.length) allpass.index = 0;
        sum = output;
      }
      wet[channel][index] = sum;
    });
  }
  const wet1 = width / 2 + 0.5;
  const wet2 = (1 - width) / 2;
  for (let index = 0; index < bus.frames; index += 1) {
    out.l[index] = wet[0][index] * wet1 + wet[1][index] * wet2;
    out.r[index] = wet[1][index] * wet1 + wet[0][index] * wet2;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Master.
// ---------------------------------------------------------------------------

/** Folds everything past `loopFrames` back onto the start: a seamless loop. */
export function foldLoop(bus, loopFrames) {
  const out = new Bus(loopFrames);
  for (let index = 0; index < bus.frames; index += 1) {
    const target = index % loopFrames;
    out.l[target] += bus.l[index];
    out.r[target] += bus.r[index];
  }
  return out;
}

/** ITU-R BS.1770 integrated loudness (LUFS) with the standard gating. */
export function integratedLoudness(bus) {
  const biquad = (b0, b1, b2, a1, a2) => {
    let x1 = 0;
    let x2 = 0;
    let y1 = 0;
    let y2 = 0;
    return (x) => {
      const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
      return y;
    };
  };
  // K-weighting coefficients (48 kHz), from the standard.
  const shelf = () => biquad(1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585);
  const highpass = () => biquad(1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621);
  const channels = [bus.l, bus.r].map((data) => {
    const a = shelf();
    const b = highpass();
    const weighted = new Float32Array(data.length);
    for (let index = 0; index < data.length; index += 1) weighted[index] = b(a(data[index]));
    return weighted;
  });
  const block = Math.round(0.4 * SAMPLE_RATE);
  const hop = Math.round(0.1 * SAMPLE_RATE);
  const powers = [];
  for (let start = 0; start + block <= bus.frames; start += hop) {
    let sum = 0;
    for (const data of channels) {
      for (let index = start; index < start + block; index += 1) sum += data[index] * data[index];
    }
    powers.push(sum / block);
  }
  const loudness = (power) => -0.691 + 10 * Math.log10(power);
  const absolute = powers.filter((power) => loudness(power) > -70);
  if (absolute.length === 0) return -Infinity;
  const mean = absolute.reduce((a, b) => a + b, 0) / absolute.length;
  const relative = absolute.filter((power) => loudness(power) > loudness(mean) - 10);
  return loudness(relative.reduce((a, b) => a + b, 0) / relative.length);
}

/** Gain, gentle glue compression, soft clip and a look-ahead peak limiter. */
export function master(bus, options = {}) {
  const { gainDb = 0, ceilingDb = -1.2, glue = 0.25 } = options;
  const gain = dbToGain(gainDb);
  const ceiling = dbToGain(ceilingDb);
  // Glue: slow RMS compressor, ~2:1 above -13 dBFS (the loudest passages
  // only, so quiet and loud sections keep their contrast).
  let rms = 0;
  const rmsCoef = Math.exp(-1 / (0.08 * SAMPLE_RATE));
  const threshold = dbToGain(-13);
  for (let index = 0; index < bus.frames; index += 1) {
    const l = bus.l[index] * gain;
    const r = bus.r[index] * gain;
    rms = rmsCoef * rms + (1 - rmsCoef) * (l * l + r * r) * 0.5;
    const level = Math.sqrt(rms);
    const over = level > threshold ? (threshold / level) ** (glue * 2) : 1;
    bus.l[index] = Math.tanh(l * over * 0.95) / 0.95;
    bus.r[index] = Math.tanh(r * over * 0.95) / 0.95;
  }
  // Limiter: 3 ms look-ahead, 60 ms release, never above the ceiling.
  const look = frameOf(0.003);
  const release = Math.exp(-1 / (0.06 * SAMPLE_RATE));
  const needed = new Float32Array(bus.frames);
  for (let index = 0; index < bus.frames; index += 1) {
    const peak = Math.max(Math.abs(bus.l[index]), Math.abs(bus.r[index]));
    needed[index] = peak > ceiling ? ceiling / peak : 1;
  }
  let current = 1;
  const attack = 1 - Math.exp(-4.6 / Math.max(1, look));
  const out = new Bus(bus.frames);
  // Glide toward the smallest gain needed within the look-ahead window, so
  // the reduction is in place by the time the peak arrives (no clicks).
  for (let index = 0; index < bus.frames; index += 1) {
    let target = 1;
    const end = Math.min(bus.frames, index + look);
    for (let ahead = index; ahead < end; ahead += 1) if (needed[ahead] < target) target = needed[ahead];
    current = target < current ? current + (target - current) * attack : target + (current - target) * release;
    out.l[index] = Math.max(-ceiling, Math.min(ceiling, bus.l[index] * current));
    out.r[index] = Math.max(-ceiling, Math.min(ceiling, bus.r[index] * current));
  }
  return out;
}

export function peakDb(bus) {
  let peak = 0;
  for (let index = 0; index < bus.frames; index += 1) {
    peak = Math.max(peak, Math.abs(bus.l[index]), Math.abs(bus.r[index]));
  }
  return 20 * Math.log10(peak || 1e-9);
}

/** 16-bit PCM WAV. */
export function wavBytes(bus) {
  const frames = bus.frames;
  const data = Buffer.alloc(44 + frames * 4);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + frames * 4, 4);
  data.write("WAVE", 8);
  data.write("fmt ", 12);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SAMPLE_RATE, 24);
  data.writeUInt32LE(SAMPLE_RATE * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(frames * 4, 40);
  for (let index = 0; index < frames; index += 1) {
    const l = Math.max(-1, Math.min(1, bus.l[index]));
    const r = Math.max(-1, Math.min(1, bus.r[index]));
    data.writeInt16LE(Math.round(l * 32767), 44 + index * 4);
    data.writeInt16LE(Math.round(r * 32767), 46 + index * 4);
  }
  return data;
}
