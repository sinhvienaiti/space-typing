import { onlineRequest, OnlineError } from "../online/api";
import { checkFeedback, FEEDBACK_MAX, FEEDBACK_MIN, type FeedbackCategory } from "../online/feedback-rules";
import type { OnlineSession } from "../online/session";
import { safeLocalStorage } from "../platform/safe-storage";

/**
 * Feedback dialog (#feedbackDialog): players send an idea, a bug report or a
 * contact message to the team (POST /api/account/feedback; Admins read them
 * in Admin > Feedback). Opened from the title deck (Feedback button), the
 * pause menu ("Report a bug") and ?feedback=bug links (Campaign 3D).
 *
 * The draft is kept while typing. Offline, a message waits in a small outbox
 * and goes when the game is online again. With the player's consent the
 * report carries game details (screen, stage, ship, graphics, browser and
 * the last few script errors), listed in the dialog before sending.
 */
export type FeedbackContext = Record<string, string | number>;

export type FeedbackDialogDeps = {
  session: OnlineSession;
  notice(text: string): void;
  sound: { tab(): void; error(): void; reveal(big: boolean): void };
  /** What the game is doing now (screen, phase, stage, mode, ship, quality…). */
  context(): FeedbackContext;
};

type Draft = { category: FeedbackCategory; message: string; contactEmail: string; attach: boolean };
type Queued = { body: Record<string, unknown>; at: number };

const DRAFT_KEY = "spaceTypingFeedbackDraftV1";
const OUTBOX_KEY = "spaceTypingFeedbackOutboxV1";
const OUTBOX_MAX = 3;
const ERRORS_KEPT = 5;
const GAME_VERSION = "0.1.0";

const KINDS: readonly { id: FeedbackCategory; label: string; hint: string; placeholder: string }[] = [
  {
    id: "bug",
    label: "Report a bug",
    hint: "Something broke or looks wrong.",
    placeholder: "What happened, and what did you expect? If you can: the steps to make it happen again.",
  },
  { id: "idea", label: "Idea", hint: "A wish, an improvement, praise.", placeholder: "What would make the game better for you?" },
  { id: "contact", label: "Contact", hint: "A question for the team.", placeholder: "Write your question or message to the team." },
];

// The last few script errors, from the very start (this module loads with the game).
const recentErrors: string[] = [];
function remember(text: string): void {
  const line = text.replace(/\s+/g, " ").trim().slice(0, 300);
  if (line === "" || recentErrors[recentErrors.length - 1] === line) return;
  recentErrors.push(line);
  if (recentErrors.length > ERRORS_KEPT) recentErrors.shift();
}
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    const where = event.filename ? " (" + event.filename.split("/").pop() + ":" + event.lineno + ")" : "";
    remember((event.message || "Script error") + where);
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as unknown;
    remember("Unhandled: " + (reason instanceof Error ? reason.message : String(reason)));
  });
}

function readJson<T>(key: string): T | null {
  return safeLocalStorage.readJson(key) as T | null;
}

/** Storage blocked or full: the draft lives only in this page. */
function writeJson(key: string, value: unknown): void {
  if (value === null) safeLocalStorage.removeItem(key);
  else safeLocalStorage.writeJson(key, value);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** The page address without its query (links may carry one-time tokens). */
function pageName(): string {
  return location.pathname.split("/").pop() || "index.html";
}

export function installFeedbackDialog(deps: FeedbackDialogDeps): { open(category?: FeedbackCategory, from?: string): void; handleLinks(): void } {
  const dialog = document.getElementById("feedbackDialog") as HTMLDialogElement | null;
  const body = document.getElementById("feedbackBody");
  const { session } = deps;
  let from = "";
  let sending = false;

  function details(): Record<string, unknown> {
    const context: Record<string, unknown> = {
      ...deps.context(),
      page: pageName(),
      version: GAME_VERSION,
      viewport: window.innerWidth + "x" + window.innerHeight,
      language: navigator.language,
      online: session.status,
      userAgent: navigator.userAgent,
    };
    if (from) context.screen = from;
    if (recentErrors.length > 0) context.errors = [...recentErrors];
    return context;
  }

  function message(text: string, tone: "bad" | "good" | "info" = "bad"): HTMLElement {
    const box = el("p", "ac-message " + tone, text);
    box.setAttribute("role", tone === "bad" ? "alert" : "status");
    return box;
  }

  async function post(payload: Record<string, unknown>): Promise<void> {
    await onlineRequest("/feedback", { method: "POST", body: payload });
  }

  /** Sends what waited offline, oldest first; stops at the first failure. */
  async function flushOutbox(): Promise<void> {
    const queue = readJson<Queued[]>(OUTBOX_KEY) ?? [];
    if (queue.length === 0 || !session.online) return;
    while (queue.length > 0) {
      try {
        await post(queue[0]!.body);
        queue.shift();
        writeJson(OUTBOX_KEY, queue.length === 0 ? null : queue);
        if (queue.length === 0) deps.notice("Your saved feedback was sent. Thank you!");
      } catch (error) {
        // A refused message (too long, rate limit…) would block the rest forever.
        if (error instanceof OnlineError && error.status >= 400 && error.status < 500 && error.status !== 401) {
          queue.shift();
          writeJson(OUTBOX_KEY, queue.length === 0 ? null : queue);
          continue;
        }
        return;
      }
    }
  }

  function thanks(queued: boolean): void {
    if (body === null) return;
    const card = el("div", "fb-thanks");
    card.append(
      el("strong", "", queued ? "Saved, it will be sent soon" : "Thank you, pilot!"),
      el(
        "p",
        "",
        queued
          ? "You are offline right now. Your message is kept on this device and goes to the team as soon as the game is online again."
          : "Your message reached the team. If you left an email or play with an account, we may answer you, often in your in-game mailbox.",
      ),
    );
    const close = el("button", "holo-cta ac-submit", "Close");
    close.type = "button";
    close.addEventListener("click", () => dialog?.close());
    const another = el("button", "holo-ghost ac-ghost", "Send another");
    another.type = "button";
    another.addEventListener("click", () => render());
    const actions = el("div", "fb-actions");
    actions.append(close, another);
    card.append(actions);
    body.replaceChildren(card);
    close.focus();
  }

  function render(category?: FeedbackCategory): void {
    if (body === null) return;
    const saved = readJson<Draft>(DRAFT_KEY);
    const draft: Draft = {
      category: category ?? saved?.category ?? "bug",
      message: saved?.message ?? "",
      contactEmail: saved?.contactEmail ?? (session.registered ? (session.account?.email ?? "") : ""),
      attach: saved?.attach ?? true,
    };
    const save = (): void => writeJson(DRAFT_KEY, draft);
    const form = el("form", "ac-form fb-form");
    form.noValidate = true;

    // Kind
    const kinds = el("div", "fb-kinds");
    kinds.setAttribute("role", "radiogroup");
    kinds.setAttribute("aria-label", "Kind of message");
    const hint = el("small", "ac-hint");
    const text = el("textarea", "fb-text");
    const paint = (): void => {
      const kind = KINDS.find((item) => item.id === draft.category) ?? KINDS[0]!;
      for (const button of kinds.querySelectorAll<HTMLButtonElement>("button")) {
        const on = button.dataset.kind === draft.category;
        button.setAttribute("aria-checked", String(on));
        button.classList.toggle("is-on", on);
      }
      hint.textContent = kind.hint;
      text.placeholder = kind.placeholder;
    };
    for (const kind of KINDS) {
      const button = el("button", "fb-kind", kind.label);
      button.type = "button";
      button.dataset.kind = kind.id;
      button.setAttribute("role", "radio");
      button.addEventListener("click", () => {
        draft.category = kind.id;
        deps.sound.tab();
        paint();
        save();
      });
      kinds.append(button);
    }

    // Message
    text.maxLength = FEEDBACK_MAX;
    text.rows = 6;
    text.value = draft.message;
    const count = el("small", "fb-count");
    const showCount = (): void => {
      const n = [...text.value.trim()].length;
      count.textContent = n + " / " + FEEDBACK_MAX;
      count.classList.toggle("is-short", n > 0 && n < FEEDBACK_MIN);
    };
    text.addEventListener("input", () => {
      draft.message = text.value;
      showCount();
      save();
    });
    const messageField = el("label", "ac-field");
    messageField.append(el("span", "ac-label", "Your message"), text, count);

    // Contact
    const email = el("input");
    email.type = "email";
    email.autocomplete = "email";
    email.maxLength = 254;
    email.placeholder = "you@example.com";
    email.value = draft.contactEmail;
    email.addEventListener("input", () => {
      draft.contactEmail = email.value;
      save();
    });
    const emailField = el("label", "ac-field");
    emailField.append(el("span", "ac-label", "Email for a reply (optional)"), email, el("small", "ac-hint", "Only if you would like an answer by email. We can also reply in your in-game mailbox."));

    // Game details
    const attach = el("input");
    attach.type = "checkbox";
    attach.checked = draft.attach;
    attach.addEventListener("change", () => {
      draft.attach = attach.checked;
      save();
    });
    const attachRow = el("label", "ac-check");
    attachRow.append(attach, el("span", "", "Attach game details to help us find the problem"));
    const what = el("details", "fb-details");
    what.append(el("summary", "", "What is attached"));
    const list = el("dl", "fb-list");
    what.addEventListener("toggle", () => {
      if (!what.open) return;
      list.replaceChildren();
      for (const [key, value] of Object.entries(details())) {
        list.append(el("dt", "", key), el("dd", "", Array.isArray(value) ? value.join(" · ") : String(value)));
      }
    });
    what.append(list, el("small", "ac-hint", "No password, save data or personal files. Your pilot name and account id are sent with every message."));

    const status = el("div", "ac-status");
    const submit = el("button", "holo-cta ac-submit", "Send to the team");
    submit.type = "submit";
    form.append(kinds, hint, messageField, emailField, attachRow, what, status, submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void send();
    });

    async function send(): Promise<void> {
      if (sending) return;
      const payload: Record<string, unknown> = {
        category: draft.category,
        message: text.value,
        contactEmail: email.value,
        context: attach.checked ? details() : { screen: from || deps.context().screen || "unknown" },
      };
      const check = checkFeedback(payload);
      if (!check.ok) {
        deps.sound.error();
        status.replaceChildren(message(check.reason));
        (check.field === "contactEmail" ? email : text).focus();
        return;
      }
      sending = true;
      submit.disabled = true;
      const label = submit.textContent;
      submit.textContent = "Sending…";
      status.replaceChildren();
      try {
        await post(payload);
        writeJson(DRAFT_KEY, null);
        deps.sound.reveal(false);
        thanks(false);
      } catch (error) {
        const offline = error instanceof OnlineError && (error.status === 0 || error.status === 503 || error.status === 401);
        if (offline) {
          const queue = (readJson<Queued[]>(OUTBOX_KEY) ?? []).slice(-(OUTBOX_MAX - 1));
          queue.push({ body: payload, at: Date.now() });
          writeJson(OUTBOX_KEY, queue);
          writeJson(DRAFT_KEY, null);
          thanks(true);
        } else {
          deps.sound.error();
          status.replaceChildren(message(error instanceof Error ? error.message : "Something went wrong. Please try again."));
        }
      } finally {
        sending = false;
        submit.disabled = false;
        submit.textContent = label;
      }
    }

    paint();
    showCount();
    body.replaceChildren(form);
    window.setTimeout(() => text.focus(), 30);
  }

  session.onChange(() => void flushOutbox());
  window.setTimeout(() => void flushOutbox(), 5000);

  function open(category?: FeedbackCategory, origin?: string): void {
    if (dialog === null) return;
    from = origin ?? "";
    render(category);
    if (!dialog.open) dialog.showModal();
  }

  return {
    open,
    /** ?feedback=bug|idea|contact[&from=…] opens the dialog (Campaign 3D links here). */
    handleLinks() {
      const params = new URLSearchParams(location.search);
      const asked = params.get("feedback");
      if (asked === null) return;
      const category = (["bug", "idea", "contact"] as const).find((item) => item === asked);
      const origin = (params.get("from") ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 40);
      params.delete("feedback");
      params.delete("from");
      const query = params.toString();
      history.replaceState(history.state, "", location.pathname + (query ? "?" + query : "") + location.hash);
      // After the boot splash has lifted, so the dialog opens over the deck.
      const started = Date.now();
      const wait = (): void => {
        if (document.getElementById("bootSplash") !== null && Date.now() - started < 15_000) window.setTimeout(wait, 300);
        else open(category, origin || undefined);
      };
      window.setTimeout(wait, 300);
    },
  };
}
