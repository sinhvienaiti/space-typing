import type { GameSettings } from "./types";

let speechGeneration = 0;
let speechActive = false;
let speechGate: (play: () => Promise<void>) => Promise<void> = play => play();
let cancelPlayback: (() => void) | null = null;
const PRONUNCIATION_WATCHDOG_MS = 20_000;

export function setSpeechGate(gate: (play: () => Promise<void>) => Promise<void>): void { speechGate = gate; }

function setSpeechActive(active: boolean): void {
  if (speechActive === active) return;
  speechActive = active;
  // This is the production pronunciation-focus lifecycle signal. Audio owners
  // may yield while native TTS is actually speaking; the output gate still
  // runs before playback/focus begins.
  window.dispatchEvent(
    new CustomEvent("space-typing:pronunciation", {
      detail: { active },
    }),
  );
}

function englishVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang.toLowerCase() === "en-us") ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
    null
  );
}

export function speakEnglish(text: string, settings: GameSettings): void {
  if (
    !settings.pronunciationEnabled ||
    !("speechSynthesis" in window) ||
    text.trim() === ""
  ) {
    return;
  }
  void speechGate(() => playEnglish(text, settings)).catch(() => setSpeechActive(false));
}

function playEnglish(text: string, settings: GameSettings): Promise<void> {
  return new Promise(resolve => {
    speechGeneration += 1;
    const generation = speechGeneration;

    // Latest pronunciation wins. Fast typing must not build a stale TTS queue.
    speechSynthesis.cancel();
    cancelPlayback?.();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = settings.pronunciationRate;
    utterance.volume = settings.pronunciationVolume;

    const voice = englishVoice();
    if (voice !== null) utterance.voice = voice;

    setSpeechActive(true);

    let finished = false;
    let watchdog: ReturnType<typeof setTimeout> | null = null;
    const finish = (): void => {
      if (finished) return;
      finished = true;
      if (watchdog !== null) {
        clearTimeout(watchdog);
        watchdog = null;
      }
      resolve();
      if (generation === speechGeneration) {
        setSpeechActive(false);
        cancelPlayback = null;
      }
    };
    cancelPlayback = finish;

    utterance.onend = finish;
    utterance.onerror = finish;
    watchdog = setTimeout(() => {
      if (generation === speechGeneration) {
        try { speechSynthesis.cancel(); } catch { /* focus cleanup must still run */ }
      }
      finish();
    }, PRONUNCIATION_WATCHDOG_MS);

    try {
      speechSynthesis.speak(utterance);
    } catch {
      finish();
    }
  });
}

export function stopSpeech(): void {
  cancelPlayback?.();
  cancelPlayback = null;
  speechGeneration += 1;
  setSpeechActive(false);
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}
