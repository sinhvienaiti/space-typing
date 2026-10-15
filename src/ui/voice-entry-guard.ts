import { showUserMessage } from "./user-message-dialog";

const VOICE_GATED_ACTION_IDS = new Set([
  "startButton",
  "practiceButton",
  "nextStageButton",
  "restartButton",
  "clearRetryButton",
  "titleRecallStartButton",
]);

let installed = false;
let lastVoiceError = "";

function byId<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function currentInputMode(): string {
  return byId<HTMLSelectElement>("voiceInputMode")?.value ?? "typing";
}

function microphoneState(): string {
  return byId("voiceInputControls")?.dataset.state ?? "off";
}

function microphoneStatus(): string {
  return byId("voiceInputStatus")?.textContent?.trim() || "Microphone off";
}

function requiresMicrophone(): boolean {
  return currentInputMode() !== "typing";
}

function microphoneReady(): boolean {
  const state = microphoneState();
  return state === "listening" || state === "suspended";
}

function isVoiceGatedAction(button: HTMLButtonElement): boolean {
  if (VOICE_GATED_ACTION_IDS.has(button.id)) return true;
  return button.closest("#titleExpeditionActions") !== null;
}

function retryButton(button: HTMLButtonElement): void {
  if (button.isConnected) {
    button.click();
    return;
  }
  if (button.id) byId<HTMLButtonElement>(button.id)?.click();
}

function switchToTypingAndRetry(button: HTMLButtonElement): void {
  const select = byId<HTMLSelectElement>("voiceInputMode");
  if (select === null) return;
  select.value = "typing";
  select.dispatchEvent(new Event("change", { bubbles: true }));

  window.setTimeout(() => {
    if (select.value !== "typing") {
      showUserMessage({
        tone: "warning",
        eyebrow: "Input mode locked",
        title: "Finish the current run first",
        message:
          "Space Typing cannot change input mode while this run is locked to another control method. Finish or abandon the current run, then switch to Typing.",
        detail: "Your current progress is unchanged.",
      });
      return;
    }
    retryButton(button);
  }, 0);
}

function showVoiceRequirement(button: HTMLButtonElement): void {
  const state = microphoneState();
  const status = microphoneStatus();
  const mode = currentInputMode() === "hybrid" ? "Hybrid" : "Voice";

  const preparing = state === "preparing";
  const failed = state === "error";
  const title = preparing
    ? "Microphone is still connecting"
    : failed
      ? "Microphone needs attention"
      : "Connect your microphone";
  const message = preparing
    ? `${mode} mode is selected, but voice input is not ready yet. Wait until the status says “Listening · English”, or switch to Typing and continue now.`
    : failed
      ? `${mode} mode is selected, but Space Typing could not start voice input. Retry the microphone, or switch to Typing so you can keep playing.`
      : `${mode} mode is selected, but the microphone is not connected yet. Connect it before starting, or switch to Typing and continue immediately.`;

  const actions = preparing
    ? [
        { label: "Keep waiting", primary: true },
        {
          label: "Switch to Typing & play",
          onSelect: () => switchToTypingAndRetry(button),
        },
      ]
    : [
        {
          label: failed ? "Retry microphone" : "Connect microphone",
          primary: true,
          onSelect: () => byId<HTMLButtonElement>("voiceMicToggle")?.click(),
        },
        {
          label: "Switch to Typing & play",
          onSelect: () => switchToTypingAndRetry(button),
        },
        { label: "Cancel" },
      ];

  showUserMessage({
    tone: failed ? "error" : "warning",
    eyebrow: `${mode} input not ready`,
    title,
    message,
    detail: `Current status: ${status}. No Warp or progress was consumed.`,
    actions,
  });
}

function showVoiceFailure(): void {
  if (!requiresMicrophone() || microphoneState() !== "error") return;
  const status = microphoneStatus();
  if (status === lastVoiceError) return;
  lastVoiceError = status;
  showUserMessage({
    tone: "error",
    eyebrow: "Voice input stopped",
    title: "Microphone connection failed",
    message:
      "Space Typing stopped voice input safely. Reconnect the microphone before continuing Voice or Hybrid play.",
    detail: status,
    actions: [
      {
        label: "Retry microphone",
        primary: true,
        onSelect: () => byId<HTMLButtonElement>("voiceMicToggle")?.click(),
      },
      { label: "Close" },
    ],
  });
}

export function installVoiceEntryGuard(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>("button");
      if (button === null || !isVoiceGatedAction(button)) return;
      if (!requiresMicrophone() || microphoneReady()) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      showVoiceRequirement(button);
    },
    true,
  );

  const controls = byId("voiceInputControls");
  if (controls !== null && typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(() => {
      if (microphoneState() !== "error") {
        if (microphoneState() !== "preparing") lastVoiceError = "";
        return;
      }
      showVoiceFailure();
    });
    observer.observe(controls, {
      attributes: true,
      attributeFilter: ["data-state"],
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
}
