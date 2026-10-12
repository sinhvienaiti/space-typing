import "./user-message-dialog.css";

export type UserMessageTone = "info" | "warning" | "error";

export type UserMessageAction = {
  label: string;
  primary?: boolean;
  close?: boolean;
  onSelect?: () => void;
};

export type UserMessageOptions = {
  tone?: UserMessageTone;
  eyebrow?: string;
  title: string;
  message: string;
  detail?: string;
  actions?: readonly UserMessageAction[];
};

type DialogUi = {
  dialog: HTMLDialogElement;
  eyebrow: HTMLElement;
  title: HTMLElement;
  message: HTMLElement;
  detail: HTMLElement;
  actions: HTMLElement;
};

let ui: DialogUi | null = null;

function ensureDialog(): DialogUi {
  if (ui !== null) return ui;

  const dialog = document.createElement("dialog");
  dialog.id = "spaceUserMessageDialog";
  dialog.className = "user-message-dialog";
  dialog.setAttribute("role", "alertdialog");
  dialog.setAttribute("aria-labelledby", "spaceUserMessageTitle");
  dialog.setAttribute("aria-describedby", "spaceUserMessageBody");

  const card = document.createElement("section");
  card.className = "user-message-card";

  const head = document.createElement("header");
  head.className = "user-message-head";

  const icon = document.createElement("span");
  icon.className = "user-message-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "!";

  const heading = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = "user-message-eyebrow";
  const title = document.createElement("h2");
  title.id = "spaceUserMessageTitle";
  heading.append(eyebrow, title);

  const close = document.createElement("button");
  close.className = "user-message-close";
  close.type = "button";
  close.setAttribute("aria-label", "Close message");
  close.textContent = "×";
  close.addEventListener("click", () => dialog.close());

  head.append(icon, heading, close);

  const message = document.createElement("p");
  message.id = "spaceUserMessageBody";
  message.className = "user-message-body";

  const detail = document.createElement("p");
  detail.className = "user-message-detail";

  const actions = document.createElement("footer");
  actions.className = "user-message-actions";

  card.append(head, message, detail, actions);
  dialog.append(card);
  document.body.append(dialog);

  ui = { dialog, eyebrow, title, message, detail, actions };
  return ui;
}

export function closeUserMessage(): void {
  if (ui?.dialog.open) ui.dialog.close();
}

export function showUserMessage(options: UserMessageOptions): void {
  const current = ensureDialog();
  current.dialog.dataset.tone = options.tone ?? "warning";
  current.eyebrow.textContent = options.eyebrow ?? "Action needed";
  current.title.textContent = options.title;
  current.message.textContent = options.message;
  current.detail.textContent = options.detail ?? "";
  current.detail.hidden = !options.detail;
  current.actions.replaceChildren();

  const actions = options.actions?.length
    ? options.actions
    : [{ label: "Got it", primary: true } satisfies UserMessageAction];

  let preferredFocus: HTMLButtonElement | null = null;
  for (const action of actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action.primary
      ? "user-message-action user-message-action-primary"
      : "user-message-action";
    button.textContent = action.label;
    button.addEventListener("click", () => {
      if (action.close !== false && current.dialog.open) current.dialog.close();
      action.onSelect?.();
    });
    current.actions.append(button);
    if (preferredFocus === null && action.primary) preferredFocus = button;
  }

  if (!current.dialog.open) current.dialog.showModal();
  window.requestAnimationFrame(() =>
    (preferredFocus ?? current.actions.querySelector<HTMLButtonElement>("button"))?.focus(),
  );
}
