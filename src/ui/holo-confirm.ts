/**
 * In-game confirm / prompt dialogs in the Holo Command style, replacing the
 * browser's window.confirm and window.prompt (which show "An embedded page
 * at … says" in the portal and cannot be styled). Stacks above any open
 * dialog; Enter confirms, Esc cancels.
 */
export type HoloConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "normal" | "danger" | "warp";
  /** Painted or CSS icon class shown above the title. */
  icon?: "warp" | "warning" | "edit" | "trash" | "info";
  /** Ask for text instead of a yes/no. */
  input?: { type?: "text" | "password" | "number"; placeholder?: string; value?: string; maxLength?: number; label?: string };
};

let sequence = 0;

export function holoConfirm(options: HoloConfirmOptions & { input: NonNullable<HoloConfirmOptions["input"]> }): Promise<string | null>;
export function holoConfirm(options: HoloConfirmOptions): Promise<boolean>;
export function holoConfirm(options: HoloConfirmOptions): Promise<boolean | string | null> {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    const id = "holoConfirm" + ++sequence;
    dialog.id = id;
    dialog.className = "settings-dialog hc-dialog " + (options.tone ?? "normal");
    dialog.setAttribute("aria-labelledby", id + "-title");
    const form = document.createElement("form");
    form.method = "dialog";
    form.className = "hc-form";
    if (options.icon) {
      const icon = document.createElement("span");
      icon.className = "hc-icon hc-icon-" + options.icon;
      icon.setAttribute("aria-hidden", "true");
      form.append(icon);
    }
    const title = document.createElement("h2");
    title.id = id + "-title";
    title.textContent = options.title;
    form.append(title);
    if (options.message) {
      const message = document.createElement("p");
      message.className = "hc-message";
      message.textContent = options.message;
      form.append(message);
    }
    let field: HTMLInputElement | null = null;
    if (options.input) {
      const label = document.createElement("label");
      label.className = "hc-field";
      if (options.input.label) {
        const text = document.createElement("span");
        text.textContent = options.input.label;
        label.append(text);
      }
      field = document.createElement("input");
      field.type = options.input.type ?? "text";
      field.placeholder = options.input.placeholder ?? "";
      field.value = options.input.value ?? "";
      if (options.input.maxLength) field.maxLength = options.input.maxLength;
      field.autocomplete = options.input.type === "password" ? "current-password" : "off";
      label.append(field);
      form.append(label);
    }
    const actions = document.createElement("div");
    actions.className = "hc-actions";
    const cancel = document.createElement("button");
    cancel.type = "submit";
    cancel.value = "cancel";
    cancel.className = "holo-ghost";
    cancel.textContent = options.cancelLabel ?? "Cancel";
    const confirm = document.createElement("button");
    confirm.type = "submit";
    confirm.value = "ok";
    confirm.className = "holo-cta" + (options.tone === "danger" ? " hc-danger" : "");
    confirm.textContent = options.confirmLabel ?? "Confirm";
    actions.append(cancel, confirm);
    form.append(actions);
    dialog.append(form);
    document.body.append(dialog);

    let answer: boolean | string | null = options.input ? null : false;
    form.addEventListener("submit", (event) => {
      const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
      if (submitter?.value === "ok") answer = field !== null ? field.value : true;
    });
    dialog.addEventListener("close", () => {
      dialog.remove();
      resolve(answer);
    });
    dialog.showModal();
    (field ?? confirm).focus();
    field?.select();
  });
}
