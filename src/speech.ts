import type { GameSettings } from "./types";

let speechGeneration = 0;
let speechActive = false;

function notifyParent(active: boolean): void {
  if (window.parent === window) return;
  window.parent.postMessage({ type: "typing-game:speech", active }, "*");
}

function setSpeechActive(active: boolean): void {
  if (speechActive === active) return;
  speechActive = active;
  notifyParent(active);
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

  speechGeneration += 1;
  const generation = speechGeneration;

  // Latest pronunciation wins. Fast typing must not build a stale TTS queue.
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = settings.pronunciationRate;
  utterance.volume = settings.pronunciationVolume;

  const voice = englishVoice();
  if (voice !== null) utterance.voice = voice;

  setSpeechActive(true);

  let finished = false;
  const finish = (): void => {
    if (finished) return;
    finished = true;
    if (generation !== speechGeneration) return;
    setSpeechActive(false);
  };

  utterance.onend = finish;
  utterance.onerror = finish;
  speechSynthesis.speak(utterance);
}

export function stopSpeech(): void {
  speechGeneration += 1;
  setSpeechActive(false);
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}
