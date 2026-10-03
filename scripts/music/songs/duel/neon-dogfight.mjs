/**
 * Duel PvP main theme (2026-10-03): bright, fast and fun. D major pop-rock
 * progressions, a driving beat, pumping bass, pluck/ostinato arps and a
 * distorted lead doubled by brass on the intense stem. The owner asked for
 * PvP music that is "nhịp độ cao hơn, vui vẻ hơn" than the old Duel pack.
 */
export default {
  id: "neon-dogfight",
  title: "Neon Dogfight",
  mood: "fiery",
  key: "D major",
  bpm: 158,
  meter: 4,
  seed: 1601,
  progressions: {
    intro: ["D", "D", "A", "A"],
    A: ["D", "A", "Bm", "G", "D", "A", "G", "A"],
    build: ["Em", "F#m", "G", "A"],
    B: ["G", "A", "F#m", "Bm", "G", "A", "D", "D"],
    break: ["Bm", "G", "D", "A", "Bm", "G", "Em", "A"],
    outro: ["G", "A", "D", "D"],
  },
  themes: {
    A: [
      [["F#5", 0.5], ["A5", 0.5], ["D6", 1], ["C#6", 0.5], ["A5", 0.5], ["F#5", 1]],
      [["E5", 0.5], ["A5", 0.5], ["C#6", 1], ["B5", 0.5], ["A5", 0.5], ["E5", 1]],
      [["D5", 0.5], ["F#5", 0.5], ["B5", 1], ["A5", 0.5], ["F#5", 0.5], ["D5", 1]],
      [["B4", 0.5], ["D5", 0.5], ["G5", 1], ["A5", 1], ["B5", 1]],
      [["A5", 0.5], ["F#5", 0.5], ["A5", 0.5], ["D6", 0.5], ["E6", 1], ["D6", 1]],
      [["C#6", 1], ["B5", 0.5], ["A5", 0.5], ["E5", 1], ["C#5", 1]],
      [["D5", 0.5], ["G5", 0.5], ["B5", 0.5], ["D6", 0.5], ["C#6", 1], ["B5", 1]],
      [["A5", 1.5], ["B5", 0.5], ["C#6", 1], ["E6", 1]],
    ],
    B: [
      [["D6", 1], ["B5", 0.5], ["D6", 0.5], ["G5", 1], ["B5", 1]],
      [["E6", 1], ["C#6", 0.5], ["E6", 0.5], ["A5", 1], ["C#6", 1]],
      [["F#6", 1], ["E6", 0.5], ["C#6", 0.5], ["A5", 1], ["C#6", 1]],
      [["D6", 1.5], ["C#6", 0.5], ["B5", 1], ["F#5", 1]],
      [["G5", 0.5], ["B5", 0.5], ["D6", 0.5], ["G5", 0.5], ["B5", 1], ["D6", 1]],
      [["A5", 0.5], ["C#6", 0.5], ["E6", 0.5], ["A5", 0.5], ["C#6", 1], ["E6", 1]],
      [["F#6", 1], ["E6", 1], ["D6", 1], ["A5", 1]],
      [["D6", 3], ["A5", 1]],
    ],
  },
  sections: [
    { name: "intro", bars: 4, chords: "intro", energy: [0.34, 0.56] },
    { name: "verse", bars: 8, chords: "A", theme: "A", energy: [0.6, 0.84] },
    { name: "verse-2", bars: 8, chords: "A", theme: "A", energy: [0.64, 0.88] },
    { name: "build", bars: 4, chords: "build", energy: [0.6, 0.84], ramp: [0.1, 0.16], build: true },
    { name: "chorus", bars: 8, chords: "B", theme: "B", energy: [0.78, 0.98] },
    { name: "chorus-2", bars: 8, chords: "B", theme: "B", energy: [0.8, 1] },
    { name: "break", bars: 8, chords: "break", energy: [0.48, 0.66] },
    { name: "verse-3", bars: 8, chords: "A", theme: "A", energy: [0.66, 0.9], build: true },
    { name: "chorus-3", bars: 8, chords: "B", theme: "B", energy: [0.82, 1] },
    { name: "chorus-4", bars: 8, chords: "B", theme: "B", energy: [0.84, 1] },
    { name: "outro", bars: 4, chords: "outro", energy: [0.4, 0.5], ending: true },
  ],
  palette: {
    pad: { kind: "supersaw", cutoff: 1900, detune: 16 },
    arp: { kind: ["pluck", "ostinato"], min: [0.4, 0.35] },
    melody: { kind: ["lead", "dist"], double: { intense: { kind: "brass", octave: -12, gain: 0.32 } } },
    bass: ["bounce", "drive"],
    drums: ["rock", "four"],
    texture: "air",
    room: 0.55,
  },
  loudness: { calm: -14.6, intense: -13.4 },
  finalNote: "D5",
};
