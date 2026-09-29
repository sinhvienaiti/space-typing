/**
 * Song engine: turns a song spec (scripts/music/songs/*.mjs) into two stems
 * of one song, "calm" (WORLD_NORMAL) and "intense" (WORLD_INTENSE). Both
 * stems share one timeline, so the game can switch between them at the same
 * position.
 *
 * Every song is built to hand over smoothly to the next one:
 * - it opens with a sparse intro (no drums in the calm stem) that fades in;
 * - it closes with an outro whose last two bars hold the tonic chord, then a
 *   reverb tail that fades to silence;
 * - `mixOut` (seconds) marks where the player should start crossfading into
 *   the next song (the outgoing song is already thinning out by then).
 *
 * Spec shape (see songs/ for examples):
 *   { id, title, mood, bpm, meter (3|4), key, seed,
 *     progressions: { A: ["Am", "F", "Dm E", …] (one entry per bar; two chords
 *                     in a bar split it) },
 *     themes: { A: [[["A4", 0.5], ["C5", 0.5], …], …] (bars of [note, beats]) },
 *     sections: [{ name, bars, chords: "A" | [...], theme?: "A", energy: [calm, intense],
 *                  ramp?: [dCalm, dIntense], build?, echo?, heartbeat?, ticks?, ending? }],
 *     palette: { pad, counter?, arp?, melody, bass, drums, texture, room?, swing? },
 *     finalNote?, loudness?: { calm, intense }, balance?: { calm: {role: dB}, intense: {…} } }
 */
import {
  Bus,
  SAMPLE_RATE,
  atmosphere,
  bass,
  bell,
  dbToGain,
  hat,
  highPass,
  impact,
  integratedLoudness,
  kick,
  lead,
  master,
  midi,
  mixInto,
  pad,
  peakDb,
  pingPong,
  pluck,
  reverb,
  riser,
  rng,
  sidechain,
  snare,
  swell,
  tom,
} from "./synth.mjs";
import {
  anvil,
  brass,
  choir,
  crackle,
  drone,
  flute,
  glints,
  keys,
  musicBox,
  organ,
  piano,
  rim,
  shaker,
  strings,
  taiko,
} from "./instruments.mjs";
import { bassNote, parseChord, voiceChord } from "./theory.mjs";

export const STEMS = ["calm", "intense"];
/** Silence-bound reverb tail after the last bar. */
export const TAIL_SECONDS = 4.5;
/** The player's crossfade into the next song; `mixOut` leaves room for it. */
export const SONG_CROSSFADE_SECONDS = 7;
/**
 * Rhythm enters only after this many seconds, so a new song's drums never
 * collide with the previous song's outro during the handover.
 */
export const DRUMLESS_OPENING_SECONDS = 7;

const ROLES = ["pad", "counter", "arp", "melody", "echoLine", "bass", "kick", "drums", "fx", "texture"];

/**
 * Loudness of each part before mastering (LUFS, measured while it plays).
 * The melody leads; bass and kick sit just under it; pads and the hall are a
 * bed well below. Tuned on "Signal in the Void" (World 01).
 */
const TARGETS = {
  calm: { melody: -20, echoLine: -26, bass: -21.5, kick: -25, drums: -31, pad: -24.5, counter: -26, arp: -27.5, fx: -31, texture: -37, echo: -31, hall: -27 },
  intense: { melody: -20, echoLine: -27, bass: -21, kick: -22.5, drums: -26, pad: -25.5, counter: -25.5, arp: -27, fx: -28.5, texture: -39, echo: -32, hall: -30 },
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));

// ---------------------------------------------------------------------------
// Timeline.
// ---------------------------------------------------------------------------

export function timeline(spec) {
  const meter = spec.meter ?? 4;
  const beat = 60 / spec.bpm;
  const barSeconds = beat * meter;
  const bars = [];
  // Every theme bar must fill the meter exactly (catches composing slips).
  for (const [name, theme] of Object.entries(spec.themes ?? {})) {
    theme.forEach((bar, index) => {
      const beats = bar.reduce((sum, [, length]) => sum + length, 0);
      if (Math.abs(beats - meter) > 1e-6) {
        throw new Error(spec.id + ": theme " + name + " bar " + (index + 1) + " has " + beats + " beats, not " + meter);
      }
    });
  }
  spec.sections.forEach((section, sectionIndex) => {
    const progression = Array.isArray(section.chords) ? section.chords : spec.progressions[section.chords];
    if (progression === undefined) throw new Error(spec.id + ": unknown progression " + section.chords);
    const theme = section.theme ? spec.themes[section.theme] : null;
    if (section.theme && theme === undefined) throw new Error(spec.id + ": unknown theme " + section.theme);
    const ramp = section.ramp ?? [0, 0];
    for (let inSection = 0; inSection < section.bars; inSection += 1) {
      const k = section.bars > 1 ? inSection / (section.bars - 1) : 0;
      const symbols = progression[inSection % progression.length].split(" ").filter(Boolean);
      bars.push({
        index: bars.length,
        section,
        sectionIndex,
        inSection,
        start: bars.length * barSeconds,
        chords: symbols.map(parseChord),
        themeBar: theme === null ? null : theme[inSection % theme.length],
        energy: [clamp01(section.energy[0] + ramp[0] * k), clamp01(section.energy[1] + ramp[1] * k)],
        first: inSection === 0,
        last: inSection === section.bars - 1,
        hold: section.ending === true && inSection >= section.bars - 2,
      });
    }
  });
  const musicEnd = bars.length * barSeconds;
  return {
    meter,
    beat,
    barSeconds,
    bars,
    musicEnd,
    totalSeconds: musicEnd + TAIL_SECONDS,
    // Start the handover as the outro thins out: measured on every playlist
    // pair (transition-check.mjs), 6.5 s before the end keeps the level
    // within about 3 dB below and 4 dB above either song.
    mixOut: Math.max(0, musicEnd - (SONG_CROSSFADE_SECONDS - 0.5)),
  };
}

/** Chord spans of a bar: one chord per span, spans split the bar evenly. */
function spans(bar, tl) {
  const count = bar.chords.length;
  return bar.chords.map((chord, index) => ({
    chord,
    start: bar.start + (tl.barSeconds * index) / count,
    duration: tl.barSeconds / count,
    beat: (tl.meter * index) / count,
    beats: tl.meter / count,
  }));
}

// ---------------------------------------------------------------------------
// Rendering.
// ---------------------------------------------------------------------------

export function renderStem(spec, stem) {
  const tl = timeline(spec);
  const s = stem === "intense" ? 1 : 0;
  const frames = Math.round(tl.totalSeconds * SAMPLE_RATE);
  const buses = Object.fromEntries(ROLES.map((role) => [role, new Bus(frames)]));
  const kicks = [];
  const random = rng((spec.seed ?? 1) * 7919 + s * 131);
  const human = (amount) => (random() - 0.5) * amount;
  const palette = spec.palette;
  const at = (bar, beat) => bar.start + beat * tl.beat;
  const swing = palette.swing ?? 0;
  const swung = (bar, beat) => {
    const sixteenth = Math.round(beat * 4);
    const late = Math.abs(beat * 4 - sixteenth) < 1e-6 && sixteenth % 2 === 1 ? swing * 0.25 : 0;
    return at(bar, beat + late);
  };

  renderHarmony(spec, tl, s, buses, random);
  renderBass(spec, tl, s, buses);
  renderArp(spec, tl, s, buses, human);
  renderMelody(spec, tl, s, buses);
  renderDrums(spec, tl, s, buses, kicks, human, swung);
  renderFx(spec, tl, s, buses, kicks);
  renderTexture(spec, tl, s, buses);
  return { buses, kicks, frames, tl };
}

function stemLevel(value, s) {
  return Array.isArray(value) ? value[s] : value;
}

/** Pad bed and counter-harmony, merged per run of one chord. */
function renderHarmony(spec, tl, s, buses, random) {
  const palette = spec.palette;
  const events = [];
  for (const bar of tl.bars) {
    for (const span of spans(bar, tl)) {
      const previous = events[events.length - 1];
      if (
        previous !== undefined &&
        previous.chord.symbol === span.chord.symbol &&
        previous.section === bar.section &&
        !bar.first
      ) {
        previous.duration += span.duration;
        previous.bars.push(bar);
      } else {
        events.push({ ...span, section: bar.section, bars: [bar] });
      }
    }
  }
  const last = events[events.length - 1];
  if (last !== undefined) last.final = true;

  let voicing = null;
  let counterVoicing = null;
  for (const event of events) {
    const bar = event.bars[0];
    const e = bar.energy[s];
    voicing = voiceChord(event.chord, voicing, { low: palette.pad.low ?? 55, high: palette.pad.high ?? 74, count: palette.pad.voices ?? 3 });
    const notes = [...voicing];
    if (e >= 0.72 && (palette.pad.kind === "supersaw" || palette.pad.kind === "strings")) notes.push(voicing[1] + 12);
    const rising = event.section.build === true;
    const releaseSeconds = event.final ? TAIL_SECONDS : 1.6;
    const duration = event.duration;
    const level = 0.7 + 0.5 * e;
    const cutoff = (palette.pad.cutoff ?? 1600) * (0.55 + 0.9 * e);
    playBed(palette.pad.kind, buses.pad, event, duration, notes, {
      level,
      cutoff,
      cutoffEnd: rising ? cutoff * 1.6 : cutoff,
      release: releaseSeconds,
      swellTo: rising ? 1.45 : 1,
      seed: bar.index + 3,
      meter: tl.meter,
      beat: tl.beat,
      random,
      palettePad: palette.pad,
    });
    const counter = palette.counter;
    if (counter !== undefined && e >= stemLevel(counter.min ?? 0.55, s) && !bar.hold) {
      counterVoicing = voiceChord(event.chord, counterVoicing, { low: counter.low ?? 64, high: counter.high ?? 84, count: 3 });
      playBed(counter.kind, buses.counter, event, duration, counterVoicing, {
        level: 0.6 + 0.6 * e,
        cutoff: counter.cutoff ?? 2600,
        cutoffEnd: counter.cutoff ?? 2600,
        release: 1.2,
        swellTo: 1,
        seed: bar.index + 11,
        meter: tl.meter,
        beat: tl.beat,
        random,
        palettePad: counter,
      });
    }
  }
}

function playBed(kind, bus, event, duration, notes, options) {
  const { level, cutoff, cutoffEnd, release, swellTo, seed, beat, meter, random, palettePad } = options;
  switch (kind) {
    case "strings":
      strings(bus, event.start, duration, notes, { gain: 0.1 * level, cutoff, rel: Math.max(1.1, release), seed, attack: palettePad.attack ?? 0.5 });
      return;
    case "choir":
      choir(bus, event.start, duration, notes, { gain: 0.1 * level, rel: Math.max(1.4, release), seed, vowel: palettePad.vowel ?? "ah" });
      return;
    case "organ":
      organ(bus, event.start, duration, notes, { gain: 0.1 * level, rel: Math.max(0.6, release * 0.6) });
      return;
    case "keys":
    case "piano": {
      // Comping: strike the chord at the start and again every half bar.
      const every = (meter === 3 ? 3 : 2) * beat;
      for (let at = 0; at < duration - 0.05; at += every) {
        const length = Math.min(every, duration - at);
        const isLast = at + every >= duration - 0.05;
        notes.forEach((note, index) => {
          const strum = index * 0.012 + (random() - 0.5) * 0.006;
          const play = kind === "keys" ? keys : piano;
          play(bus, event.start + at + strum, length * 0.96, note, {
            gain: 0.09 * level * (at === 0 ? 1 : 0.82),
            rel: isLast ? Math.min(3, release) : 0.4,
            panning: (index - 1) * 0.2,
          });
        });
      }
      return;
    }
    case "glass":
      pad(bus, event.start, duration, notes, {
        gain: 0.1 * level,
        cutoff: cutoff * 1.5,
        cutoffEnd: cutoffEnd * 1.5,
        attack: 1.1,
        release,
        voices: 3,
        detune: 7,
        seed,
        swellTo,
      });
      return;
    case "supersaw":
    default:
      pad(bus, event.start, duration, notes, {
        gain: 0.1 * level,
        cutoff,
        cutoffEnd,
        attack: palettePad.attack ?? 0.9,
        release,
        voices: palettePad.voices5 === false ? 3 : 5,
        detune: palettePad.detune ?? 14,
        seed,
        swellTo,
      });
  }
}

function renderBass(spec, tl, s, buses) {
  const palette = spec.palette;
  const style = stemLevel(palette.bass, s);
  const range = palette.bassRange ?? [36, 50];
  for (const bar of tl.bars) {
    const e = bar.energy[s];
    const barSpans = spans(bar, tl);
    if (bar.hold) {
      if (bar.inSection === bar.section.bars - 2) {
        const chord = bar.chords[bar.chords.length - 1];
        bass(buses.bass, bar.start, tl.barSeconds * 2, bassNote(chord, range[0], range[1]), { gain: 0.2, release: 2.2 });
      }
      continue;
    }
    let mode = e < 0.28 && style !== "drone" ? "sub" : style;
    if (style === "pulse" && e < 0.5) mode = "sub";
    for (const span of barSpans) {
      const root = bassNote(span.chord, range[0], range[1]);
      const stepsPerBeat = mode === "pulse" ? (e >= 0.72 ? 2 : 1) : 2;
      const steps = Math.round(span.beats * stepsPerBeat);
      const stepSeconds = tl.beat / stepsPerBeat;
      switch (mode) {
        case "drone":
          drone(buses.bass, span.start, span.duration, root - 12, { gain: 0.1, attack: 1.2, rel: 1.6, seed: bar.index });
          bass(buses.bass, span.start, span.duration - 0.05, root, { gain: 0.14, release: 0.6 });
          break;
        case "pulse":
          for (let step = 0; step < steps; step += 1) {
            bass(buses.bass, span.start + step * stepSeconds, stepSeconds * 0.85, root, { gain: 0.16 });
          }
          break;
        case "drive": {
          const pattern = tl.meter === 3 ? [0, 0, 12, 0, 0, 12] : [0, 0, 12, 0, 0, 0, 12, 0];
          for (let step = 0; step < steps; step += 1) {
            bass(buses.bass, span.start + step * stepSeconds, stepSeconds * 0.86, root + pattern[step % pattern.length], {
              kind: "pluck",
              gain: 0.2,
              cutoff: 900 + 500 * e,
            });
          }
          break;
        }
        case "bounce":
          for (let step = 0; step < steps; step += 1) {
            bass(buses.bass, span.start + step * stepSeconds, stepSeconds * 0.6, root + (step % 2 === 1 ? 12 : 0), {
              kind: "pluck",
              gain: 0.18,
              cutoff: 1100,
            });
          }
          break;
        case "walk": {
          const next = spans(tl.bars[bar.index + 1] ?? bar, tl)[0].chord;
          const target = bassNote(next, range[0], range[1]);
          const line = [root, root + 7, root + 12, target + (target > root ? -1 : 1)];
          const quarters = Math.round(span.beats);
          for (let step = 0; step < quarters; step += 1) {
            bass(buses.bass, span.start + step * tl.beat, tl.beat * 0.9, line[step % line.length], { gain: 0.17 });
          }
          break;
        }
        case "sub":
        default:
          bass(buses.bass, span.start, span.duration - 0.05, root, { gain: 0.19, release: 0.35 });
      }
    }
  }
}

function renderArp(spec, tl, s, buses, human) {
  const arp = spec.palette.arp;
  if (arp === undefined || arp === null) return;
  const shape = [0, 1, 2, 3, 2, 1];
  let cursor = 0;
  let voicing = null;
  for (const bar of tl.bars) {
    const e = bar.energy[s];
    if (bar.hold || e < stemLevel(arp.min ?? 0.3, s)) continue;
    const fast = e >= stemLevel(arp.fast ?? 0.66, s) && spec.bpm < 126;
    let perBeat = arp.kind === "bell" ? 1 : fast ? 4 : 2;
    if (arp.kind === "ostinato") perBeat = spec.bpm <= 132 ? 4 : 2;
    for (const span of spans(bar, tl)) {
      voicing = voiceChord(span.chord, voicing, { low: arp.low ?? 57, high: arp.high ?? 76, count: 3 });
      const up = arp.octave ?? 12;
      const tones = [voicing[0] + up, voicing[1] + up, voicing[2] + up, voicing[0] + up + 12];
      const root = voicing[0] + up;
      const steps = Math.round(span.beats * perBeat);
      const stepSeconds = tl.beat / perBeat;
      for (let step = 0; step < steps; step += 1) {
        const start = span.start + step * stepSeconds + human(0.004);
        const accent = step % perBeat === 0 ? 1 : 0.72;
        const gain = 0.07 * accent * (0.75 + 0.35 * e);
        let note;
        if (arp.kind === "ostinato") note = [root - 12, root, root - 12, root + 7][step % 4];
        else if (arp.kind === "pluck" || arp.kind === "bell") note = tones[shape[cursor % shape.length]];
        else note = [root - 12, root - 5, root, tones[1], root, root - 5][cursor % 6];
        cursor += 1;
        switch (arp.kind) {
          case "musicbox":
            musicBox(buses.arp, start, stepSeconds, note, { gain: gain * 1.3, decay: 0.9 });
            break;
          case "piano":
            piano(buses.arp, start, stepSeconds * 1.8, note - 12, { gain: gain * 1.2, decay: 1.6, rel: 0.3 });
            break;
          case "keys":
            keys(buses.arp, start, stepSeconds * 1.6, note - 12, { gain: gain * 1.2, decay: 1.2, rel: 0.25 });
            break;
          case "bell":
            bell(buses.arp, start, stepSeconds, note, { gain: gain * 1.2, decay: 1.6, ratio: 2, index: 1.4 });
            break;
          case "ostinato":
            pluck(buses.arp, start, stepSeconds * 0.8, note, { gain, cutoff: 2200 + 1200 * e, floor: 300, decay: 0.09, panning: step % 2 === 0 ? -0.25 : 0.25 });
            break;
          case "pluck":
          default:
            pluck(buses.arp, start, stepSeconds, note, {
              gain,
              cutoff: (arp.cutoff ?? 2400) * (0.7 + 0.5 * e),
              floor: 320,
              decay: perBeat >= 4 ? 0.13 : 0.22,
              panning: step % 2 === 0 ? -0.3 : 0.3,
            });
        }
      }
    }
  }
}

/** One melody note on the chosen instrument. */
function voiceNote(kind, bus, start, length, note, gain, previous) {
  switch (kind) {
    case "keys":
      keys(bus, start, length, note, { gain: gain * 1.3, decay: 2 });
      return;
    case "piano":
      piano(bus, start, length, note, { gain: gain * 1.3, decay: 2.8 });
      return;
    case "flute":
      flute(bus, start, length, note, { gain: gain * 1.1 });
      return;
    case "musicbox":
      musicBox(bus, start, length, note, { gain: gain * 1.3, decay: 1.3 });
      return;
    case "brass":
      brass(bus, start, length, note, { gain: gain * 1.2 });
      return;
    case "strings":
      strings(bus, start, length, [note], { gain: gain * 1.4, attack: 0.18, rel: 0.5, cutoff: 3200, width: 0.3 });
      return;
    case "choir":
      choir(bus, start, length, [note], { gain: gain * 1.6, attack: 0.25, rel: 0.6, vowel: "oo" });
      return;
    case "lead":
      lead(bus, start, length, note, { gain, from: previous, cutoff: 3200 });
      return;
    case "dist":
      lead(bus, start, length, note, { gain, from: previous, cutoff: 3400, drive: 2.6 });
      return;
    case "bell":
    default:
      bell(bus, start, length, note, { gain: gain * 1.2, decay: 1.2 });
  }
}

function renderMelody(spec, tl, s, buses) {
  const melody = spec.palette.melody;
  const kind = stemLevel(melody.kind, s);
  const double = melody.double?.[s === 1 ? "intense" : "calm"];
  let previous = null;
  for (const bar of tl.bars) {
    const e = bar.energy[s];
    if (bar.themeBar !== null && !bar.hold) {
      const echo = bar.section.echo === true;
      const bus = echo ? buses.echoLine : buses.melody;
      let beat = 0;
      for (const [name, beats] of bar.themeBar) {
        if (name !== null) {
          const note = midi(name) + (melody.octave ?? 0);
          const start = bar.start + beat * tl.beat;
          const length = beats * tl.beat * 0.94;
          const gain = 0.12 * (0.85 + 0.3 * e);
          voiceNote(kind, bus, start, length, note, gain, previous);
          if (double !== undefined && !echo) voiceNote(double.kind, bus, start, length, note + (double.octave ?? 12), gain * (double.gain ?? 0.35), null);
          previous = note;
        }
        beat += beats;
      }
    }
    // Ticking ostinato (suspense): one note per two bars, quarters, then eighths.
    const ticks = bar.section.ticks;
    if (ticks !== undefined && !bar.hold) {
      const note = midi(ticks[Math.floor(bar.inSection / 2) % ticks.length]);
      const perBeat = bar.inSection >= bar.section.bars / 2 ? 2 : 1;
      const grow = 0.6 + 0.4 * (bar.inSection / Math.max(1, bar.section.bars - 1));
      for (let step = 0; step < tl.meter * perBeat; step += 1) {
        const start = bar.start + (step / perBeat) * tl.beat;
        if (s === 1) lead(buses.melody, start, (tl.beat / perBeat) * 0.5, note, { gain: 0.06 * grow, cutoff: 2400 });
        else bell(buses.melody, start, (tl.beat / perBeat) * 0.8, note, { gain: 0.11 * grow, decay: 0.35 });
      }
    }
    // Final gesture: one soft note on the tonic as the outro starts holding.
    if (bar.hold && bar.inSection === bar.section.bars - 2 && spec.finalNote !== undefined) {
      voiceNote(stemLevel(melody.kind, 0), buses.melody, bar.start, tl.barSeconds * 1.5, midi(spec.finalNote), 0.1, null);
    }
  }
}

function renderDrums(spec, tl, s, buses, kicks, human, swung) {
  const palette = spec.palette;
  const beats = tl.meter;
  for (const bar of tl.bars) {
    if (bar.hold) continue;
    if (bar.start < DRUMLESS_OPENING_SECONDS) continue;
    const e = bar.energy[s];
    const style = bar.section.heartbeat === true ? "heartbeat" : stemLevel(palette.drums, s);
    const level = e < 0.18 ? 0 : e < 0.42 ? 1 : e < 0.74 ? 2 : 3; // off, light, main, full
    const k = (beat, gain = 0.5, options = {}) => {
      kick(buses.kick, swung(bar, beat), { gain, ...options });
      kicks.push(swung(bar, beat));
    };
    const sn = (beat, gain = 0.3, options = {}) => snare(buses.drums, swung(bar, beat) + human(0.002), { gain, ...options });
    const hh = (beat, gain = 0.05, options = {}) => hat(buses.drums, swung(bar, beat) + human(0.003), { gain, seed: 60 + Math.round(beat * 4), ...options });
    const sh = (beat, gain = 0.05) => shaker(buses.drums, swung(bar, beat) + human(0.004), { gain, seed: 70 + Math.round(beat * 8) });
    const rm = (beat, gain = 0.1) => rim(buses.drums, swung(bar, beat), { gain });
    const tk = (beat, gain = 0.4, pitch = 1) => {
      taiko(buses.kick, swung(bar, beat), { gain, pitch, seed: 17 + Math.round(beat * 4) });
      kicks.push(swung(bar, beat));
    };
    const fill = bar.last && level >= 2 && (bar.section.build === true || bar.index % 8 === 7);
    const roll = bar.section.build === true && bar.inSection >= bar.section.bars - 2;

    switch (style) {
      case "none":
        break;
      case "heartbeat":
        if (e >= 0.08 && (e >= 0.2 || bar.index % 2 === 0)) {
          k(0, 0.28 + 0.2 * e, { decay: 0.42, top: 100, click: 0.05 });
          k(0.42, 0.2 + 0.14 * e, { decay: 0.36, top: 95, click: 0.03 });
        }
        break;
      case "half":
        if (level === 0) break;
        k(0, 0.34 + 0.1 * level, { click: 0.12 });
        if (level >= 2) k(2.5, 0.28, { click: 0.1 });
        if (level >= 3) k(1.75, 0.22, { click: 0.08 });
        sn(2, level === 1 ? 0.1 : 0.16, { tone: 220, decay: 0.13 });
        for (let step = 0; step < (level >= 3 ? 16 : 8); step += 1) {
          const beat = (step * 4) / (level >= 3 ? 16 : 8);
          if (level === 1 && step % 2 === 0) continue;
          hh(beat, step % 2 === 1 ? 0.034 : 0.022);
        }
        if (level >= 2 && bar.index % 2 === 1) hh(3.5, 0.03, { open: true });
        break;
      case "four":
        if (level === 0) break;
        if (level === 1) {
          k(0, 0.46);
          k(2, 0.42);
          for (const beat of [0.5, 1.5, 2.5, 3.5]) hh(beat, 0.04);
          break;
        }
        for (let beat = 0; beat < beats; beat += 1) k(beat, 0.52);
        sn(1, 0.3, { clap: true });
        sn(3, 0.3, { clap: true, seed: 12 });
        if (level >= 3) {
          sn(1, 0.14, { seed: 13 });
          sn(3, 0.14, { seed: 14 });
        }
        for (let step = 0; step < 16; step += 1) {
          if (level === 2 && step % 2 === 1) continue;
          if (step % 4 === 2) hh(step / 4, 0.05, { open: true, panning: -0.2 });
          else hh(step / 4, step % 2 === 0 ? 0.05 : 0.03);
        }
        break;
      case "rock":
        if (level === 0) break;
        k(0, 0.5);
        if (level >= 2) k(1.5, 0.42);
        k(2, 0.48);
        if (level >= 3) k(2.75, 0.36);
        if (level === 1) {
          rm(1, 0.1);
          rm(3, 0.1);
        } else {
          sn(1, 0.32);
          sn(3, 0.32, { seed: 12 });
        }
        for (let step = 0; step < 8; step += 1) hh(step / 2, step % 2 === 0 ? 0.05 : 0.035);
        if (level >= 3 && bar.index % 2 === 1) hh(3.5, 0.045, { open: true });
        break;
      case "tribal":
        if (level === 0) break;
        tk(0, 0.42);
        if (level >= 2) {
          tk(1.5, 0.3, 1.2);
          tk(2.5, 0.34);
          tom(buses.drums, swung(bar, 3), midi("A2"), { gain: 0.18, panning: 0.3 });
          tom(buses.drums, swung(bar, 3.5), midi("E2"), { gain: 0.18, panning: -0.3 });
        } else {
          tk(2.5, 0.24);
        }
        if (level >= 3) {
          tk(0.75, 0.26, 1.3);
          tk(3.25, 0.24, 1.25);
          k(0, 0.36);
          k(2, 0.32);
        }
        for (let step = 0; step < (level >= 3 ? 16 : 8); step += 1) sh((step * 4) / (level >= 3 ? 16 : 8), step % 2 === 0 ? 0.05 : 0.032);
        break;
      case "epic":
        if (level === 0) break;
        tk(0, 0.46);
        if (level >= 2) {
          k(0, 0.34);
          k(2.5, 0.3);
          tk(2, 0.34, 1.1);
          sn(2, 0.34, { decay: 0.22 });
          tom(buses.drums, swung(bar, 3.5), midi("D2"), { gain: 0.2 });
        } else {
          tk(2, 0.26, 1.1);
        }
        if (level >= 3) {
          tk(1, 0.3, 1.2);
          tk(3, 0.3, 1.2);
          for (let step = 0; step < 8; step += 1) hh(step / 2, 0.035);
        }
        break;
      case "lofi":
        if (level === 0) break;
        if (level === 1) {
          rm(1, 0.09);
          rm(3, 0.09);
          for (let step = 0; step < 8; step += 1) hh(step / 2, 0.022);
          break;
        }
        k(0, 0.38, { decay: 0.3, click: 0.08 });
        k(2.25, 0.32, { decay: 0.3, click: 0.08 });
        if (level >= 3) k(1.75, 0.24, { decay: 0.28 });
        sn(1, 0.16, { tone: 200, decay: 0.12 });
        sn(3, 0.16, { tone: 200, decay: 0.12, seed: 12 });
        for (let step = 0; step < 16; step += 1) hh(step / 4, step % 4 === 0 ? 0.03 : step % 2 === 0 ? 0.022 : 0.014);
        for (const beat of [0.5, 1.5, 2.5, 3.5]) sh(beat, 0.03);
        if (level >= 3 && bar.index % 2 === 1) hh(3.5, 0.025, { open: true });
        break;
      case "shuffle":
        if (level === 0) break;
        k(0, 0.46);
        k(2, 0.44);
        if (level >= 2) k(2.5, 0.3);
        sn(1, level === 1 ? 0.16 : 0.28, { clap: true });
        sn(3, level === 1 ? 0.16 : 0.28, { clap: true, seed: 12 });
        for (const beat of [0.5, 1.5, 2.5, 3.5]) hh(beat, 0.045, { open: level >= 2 });
        if (level >= 2) for (let step = 0; step < 16; step += 1) sh(step / 4, step % 2 === 0 ? 0.03 : 0.018);
        break;
      case "waltz":
        if (level === 0) break;
        k(0, 0.36, { decay: 0.34, click: 0.06 });
        if (level >= 3) k(2.5, 0.22, { decay: 0.3 });
        if (level >= 2) {
          rm(1, 0.1);
          rm(2, 0.08);
        }
        for (let step = 0; step < 6; step += 1) sh(step / 2, step % 2 === 0 ? 0.04 : 0.024);
        break;
      case "ballad":
        if (level === 0) break;
        if (level >= 2) {
          k(0, 0.34, { decay: 0.36, click: 0.05 });
          k(2.5, 0.26, { decay: 0.34, click: 0.05 });
          sn(1, 0.12, { tone: 170, decay: 0.2 });
          sn(3, 0.12, { tone: 170, decay: 0.2, seed: 12 });
        } else {
          rm(1, 0.08);
          rm(3, 0.08);
        }
        for (let step = 0; step < 8; step += 1) sh(step / 2, step % 2 === 0 ? 0.034 : 0.02);
        if (level >= 3) for (let step = 0; step < 8; step += 1) hh(step / 2, 0.02);
        break;
      case "requiem":
        if (level === 0) break;
        tk(0, 0.24 + 0.1 * level, 0.85);
        if (level >= 2) tk(2, 0.18, 0.85);
        if (level >= 3) for (let step = 0; step < 4; step += 1) sn(step + 0.5, 0.05, { decay: 0.2, tone: 150 });
        break;
      default:
        throw new Error(spec.id + ": unknown drum style " + style);
    }

    if (roll && level >= 1) {
      // Build: a snare roll that thickens into the next section.
      const progress = bar.inSection - (bar.section.bars - 2);
      const division = progress === 0 ? 2 : 4;
      for (let step = 0; step < beats * division; step += 1) {
        const beat = step / division;
        sn(beat, (s === 1 ? 0.08 : 0.04) + (s === 1 ? 0.18 : 0.08) * ((progress * beats + beat) / (beats * 2)), { seed: 90 + step });
      }
    } else if (fill && s === 1 && style !== "heartbeat" && style !== "requiem") {
      ["D3", "A2", "F2", "D2"].forEach((name, index) => tom(buses.drums, swung(bar, beats - 1 + index * 0.25), midi(name), { gain: 0.2, panning: 0.4 - index * 0.25 }));
    }
  }
}

function renderFx(spec, tl, s, buses, kicks) {
  const bars = tl.bars;
  for (const bar of bars) {
    if (!bar.first || bar.index === 0) continue;
    const previous = bars[bar.index - 1];
    const e = bar.energy[s];
    const jump = e - previous.energy[s];
    if (jump >= 0.18 && e >= 0.6) {
      impact(buses.fx, bar.start, { gain: s === 1 ? 0.22 : 0.08, sub: s === 1 ? 0.6 : 0.3, seed: 50 + bar.index });
    } else if (e >= 0.7 && s === 1) {
      impact(buses.fx, bar.start, { gain: 0.12, sub: 0, seed: 50 + bar.index });
    }
  }
  spec.sections.forEach((section, index) => {
    if (section.build !== true) return;
    const lastBar = bars.find((bar) => bar.section === section && bar.last);
    if (lastBar === undefined) return;
    const barsBack = s === 1 ? 2 : 1;
    riser(buses.fx, lastBar.start - (barsBack - 1) * tl.barSeconds, tl.barSeconds * barsBack, { gain: s === 1 ? 0.1 : 0.04, seed: 30 + index });
    swell(buses.fx, lastBar.start, tl.barSeconds, { gain: s === 1 ? 0.1 : 0.045, seed: 40 + index });
  });
  // Texture accents for the forge: anvil strikes on strong bars.
  if (spec.palette.texture === "forge") {
    for (const bar of bars) {
      if (bar.hold || bar.energy[s] < 0.4 || bar.index % 2 === 1) continue;
      anvil(buses.fx, bar.start + tl.beat * 1.5, { gain: 0.06 + 0.06 * bar.energy[s], panning: bar.index % 4 === 0 ? 0.4 : -0.4, seed: 60 + bar.index });
    }
  }
  void kicks;
}

function renderTexture(spec, tl, s, buses) {
  const kind = spec.palette.texture ?? "air";
  const length = tl.totalSeconds;
  atmosphere(buses.texture, 0, length, { gain: s === 1 ? 0.018 : 0.03, seed: (spec.seed ?? 1) + 61 });
  if (kind === "fire") crackle(buses.texture, 0, length, { gain: 0.035, kind: "fire", seed: spec.seed ?? 1 });
  if (kind === "vinyl") crackle(buses.texture, 0, length, { gain: 0.02, kind: "vinyl", seed: spec.seed ?? 1 });
  if (kind === "ice") glints(buses.texture, 0, length, (spec.glints ?? ["E6", "B6", "F#6", "C#7"]).map(midi), { gain: 0.03, every: 1.1, seed: spec.seed ?? 1 });
  if (kind === "deep") {
    drone(buses.texture, 0, tl.musicEnd, bassNote(tl.bars[0].chords[0], 24, 35), { gain: 0.05, attack: 3, rel: 4, seed: spec.seed ?? 1 });
  }
}

// ---------------------------------------------------------------------------
// Mixing and mastering.
// ---------------------------------------------------------------------------

function scaleBus(bus, gain) {
  if (gain === 1) return;
  for (let index = 0; index < bus.frames; index += 1) {
    bus.l[index] *= gain;
    bus.r[index] *= gain;
  }
}

/** Sets a bus to its target loudness; returns the measured level (or null if silent). */
function balance(bus, target) {
  const measured = integratedLoudness(bus);
  if (!Number.isFinite(measured)) return null;
  scaleBus(bus, dbToGain(target - measured));
  return measured;
}

function copyBus(bus) {
  const copy = new Bus(bus.frames);
  copy.l.set(bus.l);
  copy.r.set(bus.r);
  return copy;
}

/** Master fade-in over the first half bar, fade-out across the held outro into the tail. */
function applyEnvelope(bus, tl) {
  const fadeIn = Math.max(0.8, tl.barSeconds * 0.5) * SAMPLE_RATE;
  const fadeStart = (tl.musicEnd - tl.barSeconds) * SAMPLE_RATE;
  const fadeEnd = bus.frames;
  for (let index = 0; index < bus.frames; index += 1) {
    let gain = 1;
    if (index < fadeIn) {
      const x = index / fadeIn;
      gain *= x * x * (3 - 2 * x);
    }
    if (index > fadeStart) {
      const x = Math.min(1, (index - fadeStart) / (fadeEnd - fadeStart));
      gain *= (1 - x) ** 2;
    }
    bus.l[index] *= gain;
    bus.r[index] *= gain;
  }
}

const PUMPING = new Set(["four", "drive", "shuffle"]);

export function mixStem(spec, stem, rendered, options = {}) {
  const { buses, kicks, frames, tl } = rendered;
  const s = stem === "intense" ? 1 : 0;
  const palette = spec.palette;
  const targets = { ...TARGETS[stem] };
  for (const [role, offset] of Object.entries(spec.balance?.[stem] ?? {})) targets[role] += offset;

  highPass(buses.pad, 150);
  highPass(buses.counter, 150);
  highPass(buses.arp, 240);
  highPass(buses.melody, 200);
  highPass(buses.echoLine, 220);
  highPass(buses.drums, 140);
  highPass(buses.texture, 120);

  const drumStyle = stemLevel(palette.drums, s);
  const pumping = PUMPING.has(drumStyle) || stemLevel(palette.bass, s) === "drive";
  if (kicks.length > 0) {
    sidechain(buses.pad, kicks, pumping ? (s === 1 ? 0.45 : 0.18) : 0.1, 0.22);
    sidechain(buses.counter, kicks, pumping ? 0.3 : 0.06, 0.22);
    sidechain(buses.bass, kicks, pumping ? 0.55 : 0.2, 0.12);
    sidechain(buses.arp, kicks, pumping ? 0.22 : 0.06, 0.16);
  }

  const measured = {};
  for (const role of ROLES) measured[role] = balance(buses[role], targets[role]);

  const delayIn = new Bus(frames);
  mixInto(delayIn, buses.arp, 0.34);
  mixInto(delayIn, buses.melody, s === 1 ? 0.2 : 0.28);
  mixInto(delayIn, buses.echoLine, 0.7);
  const delayBeats = tl.meter === 3 ? 1.5 : 0.75;
  const echo = pingPong(delayIn, tl.beat * delayBeats, 0.4, 3000);
  measured.echo = balance(echo, targets.echo);

  const verbIn = new Bus(frames);
  mixInto(verbIn, buses.pad, 0.3);
  mixInto(verbIn, buses.counter, 0.36);
  mixInto(verbIn, buses.arp, 0.28);
  mixInto(verbIn, buses.melody, s === 1 ? 0.3 : 0.45);
  mixInto(verbIn, buses.echoLine, 0.6);
  mixInto(verbIn, buses.drums, 0.12);
  mixInto(verbIn, buses.fx, 0.4);
  mixInto(verbIn, buses.texture, 0.2);
  mixInto(verbIn, echo, 0.3);
  const hall = reverb(verbIn, { room: palette.room ?? 0.86, damp: 0.42, width: 1 });
  highPass(hall, 220);
  measured.hall = balance(hall, targets.hall);

  const mix = new Bus(frames);
  for (const role of ROLES) mixInto(mix, buses[role], 1);
  mixInto(mix, echo, 1);
  mixInto(mix, hall, 1);
  applyEnvelope(mix, tl);

  const target = spec.loudness?.[stem] ?? (s === 1 ? -14.5 : -16);
  let gainDb = target - integratedLoudness(mix);
  let mastered = master(copyBus(mix), { gainDb, ceilingDb: -1.2 });
  let lufs = integratedLoudness(mastered);
  for (let pass = 0; pass < 4 && Math.abs(lufs - target) > 0.25; pass += 1) {
    gainDb += target - lufs;
    mastered = master(copyBus(mix), { gainDb, ceilingDb: -1.2 });
    lufs = integratedLoudness(mastered);
  }

  // Loudness per section: the song's rise and fall, for the report.
  const sections = spec.sections.map((section) => {
    const sectionBars = tl.bars.filter((bar) => bar.section === section);
    const from = Math.round(sectionBars[0].start * SAMPLE_RATE);
    const to = Math.min(mastered.frames, Math.round((sectionBars[sectionBars.length - 1].start + tl.barSeconds) * SAMPLE_RATE));
    const part = new Bus(to - from);
    part.l.set(mastered.l.subarray(from, to));
    part.r.set(mastered.r.subarray(from, to));
    const level = integratedLoudness(part);
    return section.name + " " + (Number.isFinite(level) ? level.toFixed(1) : "-inf");
  });

  void options;
  return {
    bus: mastered,
    lufs,
    peak: peakDb(mastered),
    gainDb,
    sections,
    balance: Object.fromEntries(Object.entries(measured).map(([role, value]) => [role, value === null ? null : Number(value.toFixed(1))])),
  };
}
