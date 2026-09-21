import type { GameSettings } from "./types";

let pendingSpeech = 0;

function notifyParent(active: boolean): void {
  if (window.parent === window) return;
  window.parent.postMessage({ type: "typing-game:speech", active }, "*");
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

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = settings.pronunciationRate;
  utterance.volume = settings.pronunciationVolume;

  const voice = englishVoice();
  if (voice !== null) utterance.voice = voice;

  pendingSpeech += 1;
  if (pendingSpeech === 1) notifyParent(true);

  let finished = false;
  const finish = (): void => {
    if (finished) return;
    finished = true;
    pendingSpeech = Math.max(0, pendingSpeech - 1);
    if (pendingSpeech === 0) notifyParent(false);
  };

  utterance.onend = finish;
  utterance.onerror = finish;
  speechSynthesis.speak(utterance);
}

export function stopSpeech(): void {
  pendingSpeech = 0;
  notifyParent(false);
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}
