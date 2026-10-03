/**
 * Music theory helpers for the song engine: chord symbols ("Am", "Fmaj7",
 * "Bb/D", "E7", "Csus4"), smooth voice leading and bass notes.
 */

const PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const QUALITIES = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  5: [0, 7],
  7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  add9: [0, 4, 7, 14],
  madd9: [0, 3, 7, 14],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  6: [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  9: [0, 4, 7, 10, 14],
  m9: [0, 3, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
};

function pitchClass(name) {
  const match = /^([A-G])(#|b)?$/.exec(name);
  if (match === null) throw new Error("Bad pitch name: " + name);
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  return (PITCH[match[1]] + accidental + 12) % 12;
}

/** "F#m7/C#" → { root: 6, intervals: [0,3,7,10], bass: 1, symbol }. */
export function parseChord(symbol) {
  const [main, slash] = symbol.split("/");
  const match = /^([A-G](?:#|b)?)(.*)$/.exec(main);
  if (match === null) throw new Error("Bad chord: " + symbol);
  const quality = match[2];
  if (!(quality in QUALITIES)) throw new Error("Unknown chord quality: " + symbol);
  const root = pitchClass(match[1]);
  return {
    symbol,
    root,
    intervals: QUALITIES[quality],
    bass: slash === undefined ? root : pitchClass(slash),
  };
}

/** Pitch classes of the chord, root first. */
export function chordClasses(chord) {
  return [...new Set(chord.intervals.map((interval) => (chord.root + interval) % 12))];
}

/** Every chord tone between low and high (inclusive), ascending. */
export function chordTones(chord, low, high) {
  const classes = chordClasses(chord);
  const tones = [];
  for (let note = low; note <= high; note += 1) {
    if (classes.includes(((note % 12) + 12) % 12)) tones.push(note);
  }
  return tones;
}

/** The chord's bass note (slash bass if given) inside [low, high]. */
export function bassNote(chord, low = 28, high = 43) {
  for (let note = low; note <= high; note += 1) {
    if (((note % 12) + 12) % 12 === chord.bass) return note;
  }
  return low + chord.bass;
}

/**
 * Close voicing of `count` notes within [low, high], chosen to move as
 * little as possible from `previous` (smooth voice leading).
 */
export function voiceChord(chord, previous = null, { low = 55, high = 74, count = 3 } = {}) {
  const classes = chordClasses(chord);
  // Tones to stack: chord tones, root doubled when more notes are needed.
  const order = [...classes];
  while (order.length < count) order.push(order[order.length % classes.length]);
  const candidates = [];
  for (let rotation = 0; rotation < classes.length; rotation += 1) {
    const stack = [...order.slice(rotation), ...order.slice(0, rotation)].slice(0, count);
    for (let base = low; base < low + 12; base += 1) {
      if (((base % 12) + 12) % 12 !== stack[0]) continue;
      const notes = [base];
      for (const pc of stack.slice(1)) {
        let next = notes[notes.length - 1] + 1;
        while (((next % 12) + 12) % 12 !== pc) next += 1;
        notes.push(next);
      }
      candidates.push(notes);
    }
  }
  const centre = (low + high) / 2;
  let best = candidates[0];
  let bestScore = Infinity;
  for (const notes of candidates) {
    const top = notes[notes.length - 1];
    let score = top > high ? (top - high) * 6 : 0;
    const middle = notes.reduce((sum, note) => sum + note, 0) / notes.length;
    if (previous !== null && previous.length > 0) {
      const size = Math.min(previous.length, notes.length);
      for (let index = 0; index < size; index += 1) score += Math.abs(notes[index] - previous[index]);
      score += Math.abs(middle - centre) * 0.25;
    } else {
      score += Math.abs(middle - centre);
    }
    if (score < bestScore) {
      bestScore = score;
      best = notes;
    }
  }
  return best;
}
