/** Suspense (hồi hộp) — World 01's original theme, now in song form. */
const THEME_A = [
  [["A4", 0.5], ["C5", 0.5], ["E5", 1], ["D5", 0.5], ["C5", 0.5], ["B4", 1]],
  [["C5", 0.5], ["A4", 0.5], ["F4", 1], ["A4", 1], ["C5", 1]],
  [["D5", 0.5], ["F5", 0.5], ["A5", 1], ["G5", 0.5], ["F5", 0.5], ["E5", 1]],
  [["G#4", 1], ["B4", 1], ["E5", 1.5], ["D5", 0.5]],
  [["E5", 1.5], ["D5", 0.5], ["C5", 1], ["E5", 1]],
  [["F5", 1.5], ["E5", 0.5], ["C5", 2]],
  [["D5", 0.5], ["E5", 0.5], ["F5", 1], ["A5", 1], ["F5", 1]],
  [["E5", 2], ["G#4", 1], ["B4", 1]],
];

const THEME_A_ANSWER = [
  ...THEME_A.slice(0, 6),
  [["D5", 0.5], ["E5", 0.5], ["F5", 0.5], ["G5", 0.5], ["A5", 2]],
  [["B5", 1], ["G#5", 1], ["E5", 2]],
];

const THEME_B = [
  [["A5", 1], ["G5", 0.5], ["F5", 0.5], ["E5", 1], ["C5", 1]],
  [["B4", 0.5], ["D5", 0.5], ["G5", 1], ["F5", 0.5], ["E5", 0.5], ["D5", 1]],
  [["E5", 2], ["C5", 1], ["A4", 1]],
  [["E5", 0.5], ["D5", 0.5], ["C5", 0.5], ["B4", 0.5], ["A4", 2]],
  [["A5", 1], ["G5", 0.5], ["F5", 0.5], ["E5", 1], ["F5", 1]],
  [["G5", 1.5], ["F5", 0.5], ["D5", 1], ["B4", 1]],
  [["G#5", 2], ["E5", 1], ["B4", 1]],
  [["E5", 4]],
];

const THEME_B_LIFT = [
  THEME_B[0],
  THEME_B[1],
  [["E5", 1], ["A5", 1], ["G5", 0.5], ["E5", 0.5], ["C5", 1]],
  [["E5", 0.5], ["G5", 0.5], ["C6", 1.5], ["B5", 0.5], ["G5", 1]],
  [["A5", 1], ["F5", 0.5], ["D5", 0.5], ["A5", 1], ["G5", 1]],
  [["G#5", 1.5], ["F5", 0.5], ["E5", 1], ["B4", 1]],
  [["A5", 2], ["E5", 1], ["C5", 1]],
  [["A4", 4]],
];

export default {
  id: "signal-in-the-void",
  title: "Signal in the Void",
  mood: "suspense",
  key: "A minor",
  bpm: 112,
  meter: 4,
  seed: 101,
  progressions: {
    drift: ["Am", "Am", "F", "F"],
    signal: ["Am", "F", "Dm", "E"],
    tension: ["F", "G", "Em", "Am", "F", "G", "E", "E"],
    surge: ["F", "G", "Am", "Am", "F", "G", "E", "E"],
    lift: ["F", "G", "Am", "C", "Dm", "E", "Am", "Am"],
    void: ["Am", "Am", "F", "F", "Dm", "Dm", "E", "E"],
    outro: ["Am", "F", "Dm", "E", "Am", "Am"],
  },
  themes: {
    A: THEME_A,
    A2: THEME_A_ANSWER,
    B: THEME_B,
    B2: THEME_B_LIFT,
    // Distant calls: the intro and the void breakdown.
    D: [[[null, 1], ["E5", 3]], [[null, 4]], [[null, 1], ["C5", 3]], [[null, 4]]],
    V: [[[null, 2], ["E6", 2]], [[null, 4]], [[null, 2], ["C6", 2]], [[null, 4]], [[null, 2], ["A5", 2]], [[null, 4]], [[null, 2], ["B5", 2]], [[null, 4]]],
  },
  sections: [
    { name: "drift", bars: 4, chords: "drift", theme: "D", echo: true, energy: [0.12, 0.34] },
    { name: "signal", bars: 8, chords: "signal", theme: "A", energy: [0.45, 0.68] },
    { name: "answer", bars: 8, chords: "signal", theme: "A2", energy: [0.5, 0.72] },
    { name: "tension", bars: 8, chords: "tension", energy: [0.36, 0.52], ramp: [0.2, 0.32], ticks: ["E5", "F5", "G5", "G#5"], build: true },
    { name: "surge", bars: 8, chords: "surge", theme: "B", energy: [0.68, 0.92] },
    { name: "lift", bars: 8, chords: "lift", theme: "B2", energy: [0.72, 0.96] },
    { name: "void", bars: 8, chords: "void", theme: "V", echo: true, heartbeat: true, energy: [0.22, 0.4] },
    { name: "return", bars: 8, chords: "signal", theme: "A", energy: [0.42, 0.64], ramp: [0.08, 0.14] },
    { name: "outro", bars: 6, chords: "outro", energy: [0.26, 0.3], ending: true },
  ],
  palette: {
    pad: { kind: "supersaw", cutoff: 1500 },
    arp: { kind: "pluck", min: [0.4, 0.3], fast: [0.62, 0.5] },
    melody: { kind: ["bell", "lead"], double: { intense: { kind: "bell", octave: 12, gain: 0.3 } } },
    bass: ["pulse", "drive"],
    drums: ["half", "four"],
    texture: "air",
    room: 0.88,
  },
  finalNote: "A5",
};
