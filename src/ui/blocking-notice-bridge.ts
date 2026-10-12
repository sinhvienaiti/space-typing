import { showUserMessage, type UserMessageAction } from "./user-message-dialog";

let installed = false;
let lastEscalatedMessage = "";
let lastEscalatedAt = 0;

const FLOW_BLOCK_PATTERNS = [
  /\bunable\b/i,
  /\bcannot\b/i,
  /\bfailed\b/i,
  /\bfailure\b/i,
  /\bunavailable\b/i,
  /\bnot ready\b/i,
  /\bread-only\b/i,
  /\bnot enough\b/i,
  /\bdisabled\b/i,
  /\bblocked\b/i,
  /\btimed out\b/i,
  /\btimeout\b/i,
  /\bneeds recovery\b/i,
  /\bfinish .* first\b/i,
  /\bend .* before\b/i,
  /\bwait for .* before\b/i,
  /\bselect .* then\b/i,
  /\bchoose .* to continue\b/i,
  /\breload before\b/i,
  /\bupdate .* before playing\b/i,
  /\bis still active\b/i,
] as const;

const NON_BLOCKING_PATTERNS = [
  /^✓/,
  /\bactivated$/i,
  /\bapplied\b/i,
  /\bready ·/i,
  /\brestored\b/i,
  /\bresumed from\b/i,
  /\bearned\b/i,
  /\bsignal reacquired\b/i,
  /^Solar Storm ·/i,
  /^Phoenix consumed/i,
  /^No more letters to reveal$/i,
  /^No Recall replay available$/i,
  /^Item cannot be used right now$/i,
  /^Skill unavailable for the selected character$/i,
] as const;

function byId<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function isFlowBlocking(message: string): boolean {
  if (message.length === 0) return false;
  if (NON_BLOCKING_PATTERNS.some((pattern) => pattern.test(message))) return false;
  return FLOW_BLOCK_PATTERNS.some((pattern) => pattern.test(message));
}

function clickIfAvailable(id: string): void {
  const button = byId<HTMLButtonElement>(id);
  if (button !== null && !button.disabled) button.click();
}

function friendlyPresentation(message: string): {
  eyebrow: string;
  title: string;
  body: string;
  detail?: string;
  actions?: UserMessageAction[];
} {
  if (/read-only/i.test(message)) {
    return {
      eyebrow: "Progress protected",
      title: "This tab is read-only",
      body:
        "Space Typing is protecting your saved progress because another tab or session owns the writable account state.",
      detail: message,
      actions: [
        {
          label: "Practice · Free",
          primary: true,
          onSelect: () => clickIfAvailable("practiceButton"),
        },
        { label: "Close" },
      ],
    };
  }

  if (/Expedition is still active/i.test(message)) {
    return {
      eyebrow: "Run already active",
      title: "Finish or resume your Expedition first",
      body:
        "Campaign cannot start while an Expedition still owns the active run. Resume the Expedition, or leave it safely before deploying Campaign.",
      detail: message,
    };
  }

  if (/No active Expedition to resume/i.test(message)) {
    return {
      eyebrow: "Nothing to resume",
      title: "No Expedition is currently active",
      body: "Start a new Expedition from the Expedition card when you are ready.",
      detail: message,
    };
  }

  if (/This Expedition uses .*Select that input mode/i.test(message)) {
    return {
      eyebrow: "Input mode mismatch",
      title: "Select the Expedition's input mode",
      body:
        "This saved Expedition was started with a different input method. Select the mode shown below, then resume the run.",
      detail: message,
    };
  }

  if (/Account storage needs recovery|Save is from a newer game version|Cannot reload the committed account/i.test(message)) {
    return {
      eyebrow: "Save protection",
      title: "Your progress needs attention",
      body:
        "Space Typing stopped the action to avoid writing unsafe progress. Review Save data or reload/update the game as indicated below before deploying again.",
      detail: message,
      actions: [
        {
          label: "Open Save data",
          primary: true,
          onSelect: () => clickIfAvailable("dataButton"),
        },
        { label: "Close" },
      ],
    };
  }

  if (/Stage Select is disabled during an Ascension run/i.test(message)) {
    return {
      eyebrow: "Ascension restriction",
      title: "Stage Select is unavailable right now",
      body:
        "Ascension keeps its own stage route. Finish or leave the Ascension run before choosing another Campaign stage.",
      detail: message,
    };
  }

  if (/End the sortie before changing its vocabulary/i.test(message)) {
    return {
      eyebrow: "Current sortie locked",
      title: "Finish the sortie before changing vocabulary",
      body:
        "Vocabulary is locked for the current encounter so targets and saved results stay consistent.",
      detail: message,
    };
  }

  if (/Continue or abandon the prepared sortie before changing input mode|Change input mode after finishing or abandoning this Expedition|Change input mode between encounters/i.test(message)) {
    return {
      eyebrow: "Input mode locked",
      title: "Finish the current run first",
      body:
        "The current run is already bound to an input mode. Continue or safely leave it before switching controls.",
      detail: message,
    };
  }

  if (/Wait for vocabulary to load before enabling the microphone/i.test(message)) {
    return {
      eyebrow: "Still loading",
      title: "Vocabulary is not ready yet",
      body:
        "Voice input needs the vocabulary list before it can connect safely. Wait a moment, then try the microphone again.",
      detail: message,
    };
  }

  if (/not enough/i.test(message)) {
    return {
      eyebrow: "Action unavailable",
      title: "You do not have enough resources",
      body: "This action was not completed. Check the required currency or resource and try again.",
      detail: message,
    };
  }

  return {
    eyebrow: /failed|failure|unable|cannot|recovery/i.test(message)
      ? "Action failed safely"
      : "Action needed",
    title: /failed|failure|unable|cannot/i.test(message)
      ? "Space Typing could not complete that action"
      : "This action cannot continue yet",
    body:
      "The game stopped here rather than continuing in an invalid state. Follow the message below, then try again.",
    detail: message,
  };
}

function escalate(message: string): void {
  if (!isFlowBlocking(message)) return;
  const now = Date.now();
  if (message === lastEscalatedMessage && now - lastEscalatedAt < 1500) return;
  lastEscalatedMessage = message;
  lastEscalatedAt = now;

  const friendly = friendlyPresentation(message);
  showUserMessage({
    tone: /failed|failure|unable|cannot|recovery|newer game version/i.test(message)
      ? "error"
      : "warning",
    eyebrow: friendly.eyebrow,
    title: friendly.title,
    message: friendly.body,
    detail: friendly.detail,
    actions: friendly.actions,
  });
}

export function installBlockingNoticeBridge(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;

  const notice = byId("notice");
  if (notice === null || typeof MutationObserver === "undefined") return;

  const inspect = (): void => {
    if (!notice.classList.contains("visible")) return;
    const message = notice.textContent?.trim() ?? "";
    if (message.length === 0) return;
    escalate(message);
  };

  new MutationObserver(inspect).observe(notice, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    subtree: true,
    characterData: true,
  });
  inspect();
}
