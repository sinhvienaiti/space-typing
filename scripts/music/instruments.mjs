/**
 * More voices for the song engine, on top of synth.mjs: keys, felt piano,
 * strings, choir, flute, music box, organ, brass, taiko, shaker, rim, drone
 * and a few textures (crackle, glints, anvil). Same conventions as synth.mjs:
 * render straight into a stereo Bus, times in seconds, deterministic noise.
 */
import {
  SAMPLE_RATE,
  Svf,
  frameOf,
  hz,
  pan,
  polyBlep,
  rng,
} from "./synth.mjs";

const TAU = Math.PI * 2;

function clampPan(value) {
  return Math.max(-1, Math.min(1, value));
}

/** Pitch-based stereo spread: low notes a little left, high ones right. */
function pitchPan(note, panning, width = 0.35) {
  return clampPan(panning + ((note - 66) / 24) * width);
}

function release(t, duration, seconds) {
  return t > duration ? Math.exp(-(t - duration) / Math.max(1e-3, seconds / 4.6)) : 1;
}

/** Electric piano (tine FM): warm bell-like attack, soft tremolo. */
export function keys(bus, start, duration, note, options = {}) {
  const { gain = 0.1, panning = 0, decay = 1.8, rel = 0.35, bright = 1, tremolo = 0.08 } = options;
  const first = frameOf(start);
  const length = frameOf(duration + rel + 0.05);
  const f = hz(note);
  for (const side of [-1, 1]) {
    const carrierStep = (TAU * f * (1 + side * 0.0016)) / SAMPLE_RATE;
    const tineStep = carrierStep * 14;
    const [left, right] = pan(clampPan(pitchPan(note, panning) + side * 0.22));
    let carrier = 0;
    let modulator = 0;
    let tine = 0;
    for (let index = 0; index < length; index += 1) {
      const frame = first + index;
      if (frame >= bus.frames) break;
      const t = index / SAMPLE_RATE;
      const depth = bright * (1.3 * Math.exp(-t / 0.3) + 0.22);
      const value = Math.sin(carrier + depth * Math.sin(modulator)) + 0.16 * Math.exp(-t / 0.035) * Math.sin(tine);
      carrier += carrierStep;
      modulator += carrierStep;
      tine += tineStep;
      const amp =
        Math.min(1, t / 0.003) *
        Math.exp(-t / decay) *
        release(t, duration, rel) *
        (1 + tremolo * Math.sin(TAU * 4.3 * t + side));
      const out = value * amp * gain * 0.5;
      bus.l[frame] += out * left;
      bus.r[frame] += out * right;
    }
  }
}

/** Felt piano: stretched partials that fade faster the higher they sit. */
export function piano(bus, start, duration, note, options = {}) {
  const { gain = 0.1, panning = 0, decay = 2.6, rel = 0.45, soft = 0.55, seed = 3 } = options;
  const random = rng(seed + note);
  const first = frameOf(start);
  const length = frameOf(Math.min(duration + rel, decay * 2.2) + 0.05);
  const f = hz(note);
  const partials = [1, 2, 3, 4, 5, 6].map((n) => ({
    step: (TAU * f * n * Math.sqrt(1 + 0.00035 * n * n)) / SAMPLE_RATE,
    amp: (n === 1 ? 1 : soft / n ** 1.25) * (0.9 + random() * 0.2),
    tau: decay / n ** 0.75,
    phase: random() * TAU,
  }));
  const hammer = new Svf("low", 0.7);
  hammer.setCutoff(1800 + (note - 60) * 30);
  const [left, right] = pan(pitchPan(note, panning, 0.5));
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    let value = 0;
    for (const partial of partials) {
      value += Math.sin(partial.phase) * partial.amp * Math.exp(-t / partial.tau);
      partial.phase += partial.step;
    }
    if (t < 0.006) value += hammer.process(random() * 2 - 1) * 0.25 * (1 - t / 0.006);
    const out = value * Math.min(1, t / 0.002) * release(t, duration, rel) * gain * 0.42;
    bus.l[frame] += out * left;
    bus.r[frame] += out * right;
  }
}

/** String ensemble: detuned saws, slow bow attack, delayed vibrato. */
export function strings(bus, start, duration, notes, options = {}) {
  const { gain = 0.1, attack = 0.45, rel = 1.1, cutoff = 2600, vibrato = 7, seed = 5, width = 0.8 } = options;
  const random = rng(seed);
  const first = frameOf(start);
  const length = frameOf(duration + rel);
  const filters = [new Svf("low", 0.8), new Svf("low", 0.8)];
  filters[0].setCutoff(cutoff);
  filters[1].setCutoff(cutoff * 1.05);
  const voices = [];
  for (const note of notes) {
    for (const cents of [-9, 0, 9]) {
      const [left, right] = pan(clampPan((cents / 9) * width * 0.6 + (random() - 0.5) * 0.3));
      voices.push({
        phase: random(),
        base: hz(note) * 2 ** (cents / 1200),
        left: left / Math.sqrt(3 * notes.length),
        right: right / Math.sqrt(3 * notes.length),
        wobble: random() * TAU,
      });
    }
  }
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    const vib = t > 0.3 ? Math.min(1, (t - 0.3) / 0.6) * vibrato : 0;
    let left = 0;
    let right = 0;
    for (const voice of voices) {
      const step = (voice.base * 2 ** ((vib * Math.sin(TAU * 5.1 * t + voice.wobble)) / 1200)) / SAMPLE_RATE;
      const value = 2 * voice.phase - 1 - polyBlep(voice.phase, step);
      voice.phase += step;
      if (voice.phase >= 1) voice.phase -= 1;
      left += value * voice.left;
      right += value * voice.right;
    }
    const x = Math.min(1, t / attack);
    const amp = x * x * (3 - 2 * x) * release(t, duration, rel) * gain;
    bus.l[frame] += filters[0].process(left) * amp;
    bus.r[frame] += filters[1].process(right) * amp;
  }
}

/** Choir "aah": saws through vowel formants, breathy and slow. */
export function choir(bus, start, duration, notes, options = {}) {
  const { gain = 0.1, attack = 0.7, rel = 1.4, vowel = "ah", seed = 7 } = options;
  const random = rng(seed);
  const first = frameOf(start);
  const length = frameOf(duration + rel);
  const formants = vowel === "oo" ? [[380, 7, 1], [870, 8, 0.4], [2600, 10, 0.12]] : [[780, 6, 1], [1180, 7, 0.55], [2800, 9, 0.2]];
  const banks = [0, 1].map(() =>
    formants.map(([frequency, q, level]) => {
      const filter = new Svf("band", q);
      filter.setCutoff(frequency);
      return { filter, level };
    }),
  );
  const voices = [];
  for (const note of notes) {
    for (const cents of [-11, 5]) {
      voices.push({ phase: random(), base: hz(note) * 2 ** (cents / 1200), side: cents < 0 ? 0 : 1, wobble: random() * TAU });
    }
  }
  const norm = 1 / Math.sqrt(voices.length);
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    const sources = [0, 0];
    for (const voice of voices) {
      const vib = 9 * Math.sin(TAU * 5.4 * t + voice.wobble) * Math.min(1, t / 0.8);
      const step = (voice.base * 2 ** (vib / 1200)) / SAMPLE_RATE;
      const value = 2 * voice.phase - 1 - polyBlep(voice.phase, step);
      voice.phase += step;
      if (voice.phase >= 1) voice.phase -= 1;
      sources[voice.side] += value * norm;
    }
    const breath = (random() * 2 - 1) * 0.08;
    const x = Math.min(1, t / attack);
    const amp = x * x * (3 - 2 * x) * release(t, duration, rel) * gain * 2.2;
    for (let side = 0; side < 2; side += 1) {
      let out = 0;
      for (const { filter, level } of banks[side]) out += filter.process(sources[side] + breath) * level;
      if (side === 0) bus.l[frame] += out * amp;
      else bus.r[frame] += out * amp;
    }
  }
}

/** Flute: soft sine with a breathy chiff and delayed vibrato. */
export function flute(bus, start, duration, note, options = {}) {
  const { gain = 0.1, panning = 0, rel = 0.2, vibrato = 13, seed = 9 } = options;
  const random = rng(seed + note);
  const first = frameOf(start);
  const length = frameOf(duration + rel);
  const f = hz(note);
  const breath = new Svf("band", 2.2);
  breath.setCutoff(Math.min(9000, f * 2.2));
  const [left, right] = pan(pitchPan(note, panning, 0.25));
  let phase = random() * TAU;
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    const vib = t > 0.25 ? Math.min(1, (t - 0.25) / 0.4) * vibrato * Math.sin(TAU * 5.2 * t) : 0;
    phase += (TAU * f * 2 ** (vib / 1200)) / SAMPLE_RATE;
    const tone = Math.sin(phase) + 0.12 * Math.sin(2 * phase) + 0.04 * Math.sin(3 * phase);
    const air = breath.process(random() * 2 - 1) * (0.1 + 0.5 * Math.exp(-t / 0.04));
    const x = Math.min(1, t / 0.07);
    const out = (tone + air) * x * x * release(t, duration, rel) * gain * 0.55;
    bus.l[frame] += out * left;
    bus.r[frame] += out * right;
  }
}

/** Music box: a plucked metal tine with bright inharmonic overtones. */
export function musicBox(bus, start, duration, note, options = {}) {
  const { gain = 0.1, panning = 0, decay = 1.2 } = options;
  const first = frameOf(start);
  const length = frameOf(Math.max(duration, decay * 3));
  const f = hz(note);
  const [left, right] = pan(pitchPan(note, panning, 0.5));
  let a = 0;
  let b = 0;
  let c = 0;
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    const value =
      Math.sin(a) * Math.exp(-t / decay) +
      0.35 * Math.sin(b) * Math.exp(-t / 0.14) +
      0.15 * Math.sin(c) * Math.exp(-t / 0.05);
    a += (TAU * f) / SAMPLE_RATE;
    b += (TAU * f * 4.07) / SAMPLE_RATE;
    c += (TAU * f * 6.83) / SAMPLE_RATE;
    const out = value * Math.min(1, t / 0.0015) * gain * 0.5;
    bus.l[frame] += out * left;
    bus.r[frame] += out * right;
  }
}

/** Church-style organ: additive drawbars with a slow rotary shimmer. */
export function organ(bus, start, duration, notes, options = {}) {
  const { gain = 0.1, attack = 0.12, rel = 0.6 } = options;
  const first = frameOf(start);
  const length = frameOf(duration + rel);
  const bars = [[0.5, 0.42], [1, 1], [2, 0.55], [3, 0.28], [4, 0.2], [6, 0.08]];
  const voices = [];
  for (const note of notes) {
    for (const [ratio, weight] of bars) {
      voices.push({ step: (TAU * hz(note) * ratio) / SAMPLE_RATE, weight: weight / Math.sqrt(notes.length * 2.4), phase: 0 });
    }
  }
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    const rotor = Math.sin(TAU * 5.6 * t);
    let value = 0;
    for (const voice of voices) {
      value += Math.sin(voice.phase) * voice.weight;
      voice.phase += voice.step * (1 + rotor * 0.0015);
    }
    const x = Math.min(1, t / attack);
    const amp = x * release(t, duration, rel) * gain * 0.6;
    bus.l[frame] += value * amp * (1 + rotor * 0.08);
    bus.r[frame] += value * amp * (1 - rotor * 0.08);
  }
}

/** Brass: detuned saws with a pitch scoop and a swelling filter. */
export function brass(bus, start, duration, note, options = {}) {
  const { gain = 0.1, panning = 0, bright = 2600, rel = 0.18, seed = 13 } = options;
  const random = rng(seed + note);
  const first = frameOf(start);
  const length = frameOf(duration + rel);
  const filters = [new Svf("low", 1.1), new Svf("low", 1.1)];
  const phases = [random(), random(), random()];
  const detunes = [-7, 0, 7];
  const [left, right] = pan(clampPan(panning));
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    const scoop = -35 * Math.exp(-t / 0.05);
    const vib = t > 0.35 ? 8 * Math.sin(TAU * 5.3 * t) * Math.min(1, (t - 0.35) / 0.5) : 0;
    if ((index & 15) === 0) {
      const open = 380 + bright * (Math.min(1, t / 0.09) * (0.7 + 0.3 * Math.exp(-t / 0.25)));
      filters[0].setCutoff(open);
      filters[1].setCutoff(open * 1.04);
    }
    let sum = 0;
    for (let voice = 0; voice < 3; voice += 1) {
      const step = (hz(note) * 2 ** ((detunes[voice] + scoop + vib) / 1200)) / SAMPLE_RATE;
      sum += 2 * phases[voice] - 1 - polyBlep(phases[voice], step);
      phases[voice] += step;
      if (phases[voice] >= 1) phases[voice] -= 1;
    }
    const x = Math.min(1, t / 0.03);
    const amp = x * release(t, duration, rel) * gain * 0.32;
    const shaped = Math.tanh(sum * 0.55);
    bus.l[frame] += filters[0].process(shaped) * amp * left * 1.41;
    bus.r[frame] += filters[1].process(shaped) * amp * right * 1.41;
  }
}

/** Taiko: a huge low drum with a slapped skin. */
export function taiko(bus, start, options = {}) {
  const { gain = 0.4, panning = 0, pitch = 1, seed = 17 } = options;
  const random = rng(seed);
  const first = frameOf(start);
  const length = frameOf(1.4);
  const skin = new Svf("low", 0.8);
  skin.setCutoff(900);
  const [left, right] = pan(clampPan(panning));
  let phase = 0;
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    phase += (TAU * (58 + 48 * Math.exp(-t / 0.05)) * pitch) / SAMPLE_RATE;
    const body = Math.sin(phase) * Math.exp(-t / 0.5);
    const slap = skin.process(random() * 2 - 1) * Math.exp(-t / 0.07) * 0.5;
    const out = Math.tanh((body + slap) * 1.5) * Math.min(1, t / 0.002) * gain;
    bus.l[frame] += out * left * 1.2;
    bus.r[frame] += out * right * 1.2;
  }
}

/** Shaker: a short, soft burst of high noise. */
export function shaker(bus, start, options = {}) {
  const { gain = 0.05, panning = 0.2, seed = 19 } = options;
  const random = rng(seed);
  const first = frameOf(start);
  const length = frameOf(0.09);
  const band = new Svf("band", 1.3);
  band.setCutoff(6800);
  const [left, right] = pan(clampPan(panning));
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    const env = Math.min(1, t / 0.006) * Math.exp(-t / 0.035);
    const out = band.process(random() * 2 - 1) * env * gain * 1.6;
    bus.l[frame] += out * left;
    bus.r[frame] += out * right;
  }
}

/** Rim click. */
export function rim(bus, start, options = {}) {
  const { gain = 0.1, panning = -0.1, seed = 23 } = options;
  const random = rng(seed);
  const first = frameOf(start);
  const length = frameOf(0.06);
  const band = new Svf("band", 5);
  band.setCutoff(2200);
  const [left, right] = pan(clampPan(panning));
  let phase = 0;
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    phase += (TAU * 1650) / SAMPLE_RATE;
    const out = (Math.sin(phase) * Math.exp(-t / 0.012) + band.process(random() * 2 - 1) * Math.exp(-t / 0.02) * 1.5) * gain;
    bus.l[frame] += out * left;
    bus.r[frame] += out * right;
  }
}

/** Dark drone: saw and sub under a slowly breathing low-pass. */
export function drone(bus, start, duration, note, options = {}) {
  const { gain = 0.1, attack = 2, rel = 3, seed = 29 } = options;
  const random = rng(seed);
  const first = frameOf(start);
  const length = frameOf(duration + rel);
  const filters = [new Svf("low", 1.8), new Svf("low", 1.8)];
  const phases = [random(), random()];
  const steps = [hz(note) * 0.998, hz(note) * 1.002].map((f) => f / SAMPLE_RATE);
  let sub = 0;
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    if ((index & 63) === 0) {
      const cutoff = 260 + 320 * (0.5 + 0.5 * Math.sin(t * 0.45 + seed));
      filters[0].setCutoff(cutoff);
      filters[1].setCutoff(cutoff * 1.1);
    }
    const out = [0, 1].map((side) => {
      const value = 2 * phases[side] - 1 - polyBlep(phases[side], steps[side]);
      phases[side] += steps[side];
      if (phases[side] >= 1) phases[side] -= 1;
      return filters[side].process(value);
    });
    sub += (TAU * hz(note) * 0.5) / SAMPLE_RATE;
    const x = Math.min(1, t / attack);
    const amp = x * x * release(t, duration, rel) * gain;
    const low = Math.sin(sub) * 0.5;
    bus.l[frame] += (out[0] + low) * amp;
    bus.r[frame] += (out[1] + low) * amp;
  }
}

/**
 * Crackle texture over a span: `fire` gives low pops and an ember roar,
 * `vinyl` gives the faint clicks of an old record.
 */
export function crackle(bus, start, duration, options = {}) {
  const { gain = 0.03, kind = "fire", seed = 31 } = options;
  const random = rng(seed);
  const first = frameOf(start);
  const length = frameOf(duration);
  const roar = [new Svf("low", 0.7), new Svf("low", 0.7)];
  roar[0].setCutoff(kind === "fire" ? 420 : 3000);
  roar[1].setCutoff(kind === "fire" ? 460 : 3200);
  const pop = new Svf("band", 3);
  pop.setCutoff(kind === "fire" ? 1400 : 3600);
  const rate = (kind === "fire" ? 9 : 5) / SAMPLE_RATE;
  let popLife = 0;
  let popPan = 0;
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    if (popLife <= 0 && random() < rate) {
      popLife = frameOf(0.004 + random() * 0.012);
      popPan = random() * 2 - 1;
    }
    let click = 0;
    if (popLife > 0) {
      click = pop.process(random() * 2 - 1) * 2.2;
      popLife -= 1;
    }
    const bed = kind === "fire" ? 0.5 : 0.08;
    const [left, right] = pan(popPan);
    bus.l[frame] += (roar[0].process(random() * 2 - 1) * bed + click * left) * gain;
    bus.r[frame] += (roar[1].process(random() * 2 - 1) * bed + click * right) * gain;
  }
}

/** Ice glints: sparse, high, glassy blips drifting across the field. */
export function glints(bus, start, duration, notes, options = {}) {
  const { gain = 0.03, every = 0.9, seed = 37 } = options;
  const random = rng(seed);
  for (let at = start + random() * every; at < start + duration; at += every * (0.6 + random() * 0.8)) {
    const note = notes[Math.floor(random() * notes.length)];
    musicBox(bus, at, 0.2, note, { gain: gain * (0.5 + random() * 0.5), panning: random() * 1.6 - 0.8, decay: 0.9 });
  }
}

/** Anvil: a struck metal bar for the forge (inharmonic ring and a click). */
export function anvil(bus, start, options = {}) {
  const { gain = 0.12, panning = 0.3, seed = 41 } = options;
  const random = rng(seed);
  const first = frameOf(start);
  const length = frameOf(1.2);
  const modes = [[1, 1, 0.55], [2.76, 0.5, 0.28], [5.4, 0.3, 0.14], [8.93, 0.18, 0.07]];
  const base = 640 + random() * 60;
  const [left, right] = pan(clampPan(panning));
  const phases = modes.map(() => random() * TAU);
  for (let index = 0; index < length; index += 1) {
    const frame = first + index;
    if (frame >= bus.frames) break;
    const t = index / SAMPLE_RATE;
    let value = 0;
    modes.forEach(([ratio, level, tau], mode) => {
      value += Math.sin(phases[mode]) * level * Math.exp(-t / tau);
      phases[mode] += (TAU * base * ratio) / SAMPLE_RATE;
    });
    if (t < 0.003) value += (random() * 2 - 1) * (1 - t / 0.003);
    const out = value * gain;
    bus.l[frame] += out * left;
    bus.r[frame] += out * right;
  }
}
