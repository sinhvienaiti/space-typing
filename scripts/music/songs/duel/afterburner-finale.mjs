/**
 * Duel Cataclysm theme (2026-10-03): the last phase. Faster (168), heroic
 * minor-to-major lift, epic drums and brass so the finish feels like a
 * final strike rather than a dark drone.
 */
export default {
  id: "afterburner-finale",
  title: "Afterburner Finale",
  mood: "climactic",
  key: "A minor → C major",
  bpm: 168,
  meter: 4,
  seed: 1687,
  progressions: {
    intro: ["Am", "Am", "F", "G"],
    A: ["Am", "F", "C", "G", "Am", "F", "G", "E"],
    build: ["F", "G", "Am", "E"],
    B: ["F", "G", "C", "Am", "F", "G", "C", "C"],
    break: ["Am", "F", "C", "G", "Dm", "F", "G", "E"],
    outro: ["F", "G", "C", "C"],
  },
  themes: {
    A: [
      [["A5", 0.5], ["C6", 0.5], ["E6", 1], ["D6", 0.5], ["C6", 0.5], ["A5", 1]],
      [["F5", 0.5], ["A5", 0.5], ["C6", 1], ["B5", 0.5], ["A5", 0.5], ["F5", 1]],
      [["E5", 0.5], ["G5", 0.5], ["C6", 1], ["B5", 0.5], ["G5", 0.5], ["E5", 1]],
      [["D5", 0.5], ["G5", 0.5], ["B5", 1], ["D6", 1], ["B5", 1]],
      [["C6", 0.5], ["A5", 0.5], ["C6", 0.5], ["E6", 0.5], ["F6", 1], ["E6", 1]],
      [["F6", 1], ["E6", 0.5], ["C6", 0.5], ["A5", 1], ["F5", 1]],
      [["G5", 0.5], ["B5", 0.5], ["D6", 0.5], ["G6", 0.5], ["F6", 1], ["D6", 1]],
      [["E6", 1.5], ["D6", 0.5], ["B5", 1], ["G#5", 1]],
    ],
    B: [
      [["F6", 1], ["C6", 0.5], ["F6", 0.5], ["A5", 1], ["C6", 1]],
      [["G6", 1], ["D6", 0.5], ["G6", 0.5], ["B5", 1], ["D6", 1]],
      [["E6", 1], ["G6", 1], ["C6", 1], ["E6", 1]],
      [["E6", 1.5], ["D6", 0.5], ["C6", 1], ["A5", 1]],
      [["A5", 0.5], ["C6", 0.5], ["F6", 0.5], ["A5", 0.5], ["C6", 1], ["F6", 1]],
      [["B5", 0.5], ["D6", 0.5], ["G6", 0.5], ["B5", 0.5], ["D6", 1], ["G6", 1]],
      [["E6", 1], ["D6", 1], ["C6", 1], ["G5", 1]],
      [["C6", 3], ["G5", 1]],
    ],
  },
  sections: [
    { name: "intro", bars: 4, chords: "intro", energy: [0.42, 0.62] },
    { name: "verse", bars: 8, chords: "A", theme: "A", energy: [0.66, 0.9] },
    { name: "build", bars: 4, chords: "build", energy: [0.66, 0.9], ramp: [0.1, 0.16], build: true },
    { name: "chorus", bars: 8, chords: "B", theme: "B", energy: [0.84, 1] },
    { name: "chorus-2", bars: 8, chords: "B", theme: "B", energy: [0.86, 1] },
    { name: "break", bars: 8, chords: "break", energy: [0.56, 0.74] },
    { name: "verse-2", bars: 8, chords: "A", theme: "A", energy: [0.72, 0.94], build: true },
    { name: "chorus-3", bars: 8, chords: "B", theme: "B", energy: [0.88, 1] },
    { name: "chorus-4", bars: 8, chords: "B", theme: "B", energy: [0.9, 1] },
    { name: "outro", bars: 4, chords: "outro", energy: [0.44, 0.52], ending: true },
  ],
  palette: {
    pad: { kind: "supersaw", cutoff: 1700, detune: 18 },
    arp: { kind: "ostinato", min: [0.4, 0.34] },
    melody: { kind: ["brass", "dist"], double: { intense: { kind: "brass", octave: -12, gain: 0.36 } } },
    bass: ["drive", "drive"],
    drums: ["four", "epic"],
    texture: "air",
    room: 0.6,
  },
  loudness: { calm: -14.2, intense: -13.2 },
  finalNote: "C5",
};
