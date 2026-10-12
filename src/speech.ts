import type { GameSettings } from "./types";

let speechGeneration = 0;
let speechActive = false;
let speechGate: (play: () => Promise<void>) => Promise<void> = play => play();
let cancelPlayback: (() => void) | null = null;
const PRONUNCIATION_WATCHDOG_MS = 20_000;

export function setSpeechGate(gate: (play: () => Promise<void>) => Promise<void>): void {
  speechGate = gate;
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function setSpeechActive(active: boolean): void {
  if (speechActive === active) return;
  speechActive = active;
  // Keep speech state inside Space Typing. Local SFX can yield to vocabulary
  // audio, but neither the game's music nor the portal's shared music should.
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

  // A rejected gate means this invocation never owned pronunciation playback.
  // Do not deactivate a newer pronunciation that may already be running.
  void speechGate(() => playEnglish(text, settings)).catch(() => undefined);
}

function playEnglish(text: string, settings: GameSettings): Promise<void> {
  return new Promise((resolve) => {
    speechGeneration += 1;
    const generation = speechGeneration;

    // Latest pronunciation wins. Fast typing must not build a stale TTS queue.
    // Resolve the previous owner first; because generation has already advanced,
    // its completion callback cannot release the new pronunciation lifecycle.
    cancelPlayback?.();
    try {
      speechSynthesis.cancel();
    } catch {
      // Native speech cancellation is best-effort. Lifecycle cleanup below must
      // remain usable even on browsers with a broken speechSynthesis backend.
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = settings.pronunciationRate;
    utterance.volume = clampVolume(settings.pronunciationVolume);

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
        try {
          speechSynthesis.cancel();
        } catch {
          // The watchdog owns lifecycle cleanup even when native cancel fails.
        }
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
  if ("speechSynthesis" in window) {
    try {
      speechSynthesis.cancel();
    } catch {
      // Stop is fail-soft; local lifecycle state has already been released.
    }
  }
}
