import { onlineRequest, OnlineError } from "../online/api";
import type { CloudConflict } from "../online/cloud-save";
import type { OnlineSession } from "../online/session";
import { holoConfirm } from "./holo-confirm";

/**
 * Pilot account dialog (#accountDialog): guest → create account / sign in /
 * forgot password; signed in → profile, devices, security, data, sign out.
 * Also opens for ?verify=… and ?reset=… links and for cloud-save conflicts.
 */
type View = "auto" | "create" | "login" | "forgot" | "reset" | "conflict";

export type AccountDialogDeps = {
  session: OnlineSession;
  notice(text: string): void;
  sound: { tab(): void; error(): void; reveal(big: boolean): void };
  cloudStatus(): string;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function field(label: string, control: HTMLElement, hint?: string): HTMLLabelElement {
  const root = el("label", "ac-field");
  root.append(el("span", "ac-label", label), control);
  if (hint) root.append(el("small", "ac-hint", hint));
  return root;
}

function input(type: string, options: { autocomplete?: string; placeholder?: string; maxLength?: number; value?: string } = {}): HTMLInputElement {
  const node = el("input");
  node.type = type;
  if (options.autocomplete) node.autocomplete = options.autocomplete as AutoFill;
  if (options.placeholder) node.placeholder = options.placeholder;
  if (options.maxLength) node.maxLength = options.maxLength;
  if (options.value) node.value = options.value;
  return node;
}

function passwordInput(autocomplete: string): { root: HTMLElement; input: HTMLInputElement } {
  const wrap = el("div", "ac-password");
  const node = input("password", { autocomplete, maxLength: 128 });
  const toggle = el("button", "ac-eye", "Show");
  toggle.type = "button";
  toggle.addEventListener("click", () => {
    node.type = node.type === "password" ? "text" : "password";
    toggle.textContent = node.type === "password" ? "Show" : "Hide";
  });
  wrap.append(node, toggle);
  return { root: wrap, input: node };
}

function primary(label: string): HTMLButtonElement {
  const button = el("button", "holo-cta ac-submit", label);
  button.type = "submit";
  return button;
}

function ghost(label: string, onClick: () => void): HTMLButtonElement {
  const button = el("button", "holo-ghost ac-ghost", label);
  button.type = "button";
  button.addEventListener("click", onClick);
  return button;
}

export function installAccountDialog(deps: AccountDialogDeps): {
  open(view?: View): void;
  conflict(conflict: CloudConflict): void;
  handleLinks(): void;
} {
  const dialog = document.getElementById("accountDialog") as HTMLDialogElement | null;
  const body = document.getElementById("accountBody");
  const title = document.getElementById("accountTitle");
  const { session } = deps;
  let view: View = "auto";
  let resetToken = "";
  let pendingConflict: CloudConflict | null = null;

  function message(text: string, tone: "bad" | "good" | "info" = "bad"): HTMLElement {
    const box = el("p", "ac-message " + tone, text);
    box.setAttribute("role", tone === "bad" ? "alert" : "status");
    return box;
  }

  async function busy<T>(button: HTMLButtonElement, status: HTMLElement, work: () => Promise<T>): Promise<T | null> {
    button.disabled = true;
    const label = button.textContent;
    button.textContent = "Please wait…";
    status.replaceChildren();
    try {
      return await work();
    } catch (error) {
      deps.sound.error();
      status.replaceChildren(message(error instanceof Error ? error.message : "Something went wrong."));
      return null;
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  }

  // ---------- Guest views ----------
  function guestIntro(): HTMLElement {
    const box = el("div", "ac-intro");
    const name = session.account?.displayName ?? "Guest";
    box.append(
      el("div", "ac-avatar", name.slice(0, 1).toUpperCase()),
      el("div", "ac-intro-text"),
    );
    const text = box.lastElementChild as HTMLElement;
    text.append(
      el("strong", "", session.status === "offline" ? "Offline · progress is saved on this device" : "You are flying as " + name + " (guest)"),
      el("span", "", session.status === "offline"
        ? "Online features (cloud save, chat, friends) need a connection."
        : "Create a free account to keep your progress on every device, chat in world and group channels and add friends."),
    );
    return box;
  }

  function tabs(): HTMLElement {
    const bar = el("div", "holo-seg ac-tabs");
    for (const [id, label] of [["create", "Create account"], ["login", "Sign in"]] as const) {
      const button = el("button", view === id ? "on" : "", label);
      button.type = "button";
      button.addEventListener("click", () => {
        view = id;
        deps.sound.tab();
        render();
      });
      bar.append(button);
    }
    return bar;
  }

  function createForm(): HTMLElement {
    const form = el("form", "ac-form");
    const email = input("email", { autocomplete: "email", placeholder: "pilot@example.com", maxLength: 254 });
    const name = input("text", { autocomplete: "nickname", maxLength: 24, value: session.account?.kind === "guest" ? session.account.displayName : "" });
    const password = passwordInput("new-password");
    const birth = input("number", { placeholder: "e.g. 2008" });
    birth.min = "1900";
    birth.max = String(new Date().getFullYear());
    const terms = el("input");
    terms.type = "checkbox";
    const termsLabel = el("label", "ac-check");
    termsLabel.append(terms, el("span", "", "I agree to the terms of play and the privacy policy (we store your email, progress and chat; you can export or delete them any time)."));
    const status = el("div", "ac-status");
    const submit = primary("Create account");
    form.append(
      field("Email", email),
      field("Pilot name", name, "2–24 characters, shown in chat and rankings."),
      field("Password", password.root, "At least 8 characters. It never leaves your device in plain text."),
      field("Birth year (optional)", birth, "Used for age-appropriate play time limits."),
      termsLabel,
      status,
      submit,
    );
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const ok = await busy(submit, status, () =>
        session.register({ email: email.value, password: password.input.value, displayName: name.value, birthYear: birth.value, acceptTerms: terms.checked }),
      );
      if (ok !== null) {
        deps.sound.reveal(true);
        deps.notice("✓ Account created · check your email to confirm it");
        view = "auto";
        render();
      }
    });
    return form;
  }

  function loginForm(): HTMLElement {
    const form = el("form", "ac-form");
    const email = input("email", { autocomplete: "email", maxLength: 254 });
    const password = passwordInput("current-password");
    const status = el("div", "ac-status");
    const submit = primary("Sign in");
    const forgot = ghost("Forgot password?", () => {
      view = "forgot";
      render();
    });
    form.append(field("Email", email), field("Password", password.root), status, submit, forgot);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const ok = await busy(submit, status, () => session.login(email.value, password.input.value));
      if (ok !== null) {
        deps.notice("✓ Signed in · loading your cloud save");
        view = "auto";
        render();
      }
    });
    if (session.account?.kind === "guest") {
      form.prepend(message("Signing in switches to that account. Progress made as this guest stays on this device until you choose.", "info"));
    }
    return form;
  }

  function forgotForm(): HTMLElement {
    const form = el("form", "ac-form");
    const email = input("email", { autocomplete: "email", maxLength: 254 });
    const status = el("div", "ac-status");
    const submit = primary("Send reset link");
    form.append(message("We will email you a link to choose a new password. It works for 1 hour.", "info"), field("Email", email), status, submit, ghost("Back to sign in", () => {
      view = "login";
      render();
    }));
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const ok = await busy(submit, status, () => session.forgotPassword(email.value));
      if (ok !== null) status.replaceChildren(message("If an account uses that email, a link is on its way.", "good"));
    });
    return form;
  }

  function resetForm(): HTMLElement {
    const form = el("form", "ac-form");
    const password = passwordInput("new-password");
    const again = passwordInput("new-password");
    const status = el("div", "ac-status");
    const submit = primary("Save new password");
    form.append(field("New password", password.root), field("Repeat it", again.root), status, submit);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (password.input.value !== again.input.value) {
        status.replaceChildren(message("The two passwords are different."));
        return;
      }
      const ok = await busy(submit, status, () => session.resetPassword(resetToken, password.input.value));
      if (ok !== null) {
        deps.notice("✓ Password changed · sign in with it now");
        view = "login";
        render();
      }
    });
    return form;
  }

  // ---------- Signed-in view ----------
  function profile(): HTMLElement {
    const account = session.account!;
    const root = el("div", "ac-profile");
    const card = el("section", "ac-card ac-hero");
    const avatar = el("div", "ac-avatar big", account.displayName.slice(0, 1).toUpperCase());
    const who = el("div", "ac-who");
    const nameRow = el("div", "ac-name-row");
    const name = el("strong", "", account.displayName);
    nameRow.append(name, ghost("Rename", async () => {
      const next = await holoConfirm({ title: "Rename pilot", icon: "edit", confirmLabel: "Rename", input: { label: "Pilot name (2–24 characters)", value: account.displayName, maxLength: 24 } });
      if (next === null || next.trim() === account.displayName) return;
      try {
        await session.rename(next);
        render();
      } catch (error) {
        deps.notice(error instanceof Error ? error.message : "Rename failed");
      }
    }));
    const code = el("button", "ac-code", "Pilot code · " + account.pilotCode);
    code.type = "button";
    code.title = "Copy · friends add you with this code";
    code.addEventListener("click", () => {
      void navigator.clipboard?.writeText(account.pilotCode);
      deps.notice("Pilot code copied");
    });
    who.append(nameRow, el("span", "ac-email", account.email ?? ""), code);
    card.append(avatar, who);
    if (!account.emailVerified) {
      const verify = el("div", "ac-verify");
      verify.append(el("span", "", "Email not confirmed yet. Big rewards (starter day 7, 30-day streaks, special codes) wait until you confirm it."), ghost("Send again", async () => {
        try {
          await session.resendVerification();
          deps.notice("Confirmation email sent");
        } catch (error) {
          deps.notice(error instanceof Error ? error.message : "Try again later");
        }
      }));
      card.append(verify);
    }
    root.append(card);

    const cloud = el("section", "ac-card");
    cloud.append(el("h3", "", "Cloud save"), el("p", "ac-muted", deps.cloudStatus()));
    root.append(cloud);

    const devices = el("section", "ac-card");
    devices.append(el("h3", "", "Signed-in devices"));
    const list = el("div", "ac-devices", "Loading…");
    devices.append(list, ghost("Sign out other devices", async () => {
      try {
        const result = await onlineRequest<{ revoked: number }>("/sessions/revoke-others", { body: {} });
        deps.notice(result.revoked + " other device(s) signed out");
        render();
      } catch (error) {
        deps.notice(error instanceof Error ? error.message : "Failed");
      }
    }));
    void onlineRequest<{ sessions: { id: string; user_agent: string | null; last_seen_at: string }[]; current: string }>("/sessions")
      .then(({ sessions, current }) => {
        list.replaceChildren(
          ...sessions.map((item) => {
            const row = el("div", "ac-device" + (item.id === current ? " current" : ""));
            const agent = item.user_agent ?? "Browser";
            const kind = /iPhone|Android|Mobile/i.test(agent) ? "Phone" : /Mac/i.test(agent) ? "Mac" : /Windows/i.test(agent) ? "Windows PC" : "Browser";
            row.append(el("strong", "", kind + (item.id === current ? " · this device" : "")), el("small", "", "Last seen " + new Date(item.last_seen_at).toLocaleString()));
            return row;
          }),
        );
      })
      .catch(() => list.replaceChildren(el("small", "", "Could not load devices.")));
    root.append(devices);

    const security = el("section", "ac-card");
    security.append(el("h3", "", "Password"));
    const form = el("form", "ac-form inline");
    const current = passwordInput("current-password");
    const next = passwordInput("new-password");
    const status = el("div", "ac-status");
    const submit = primary("Change password");
    form.append(field("Current", current.root), field("New", next.root), status, submit);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const ok = await busy(submit, status, () => session.changePassword(current.input.value, next.input.value));
      if (ok !== null) status.replaceChildren(message("✓ Password changed. Other devices were signed out.", "good"));
    });
    security.append(form);
    root.append(security);

    const data = el("section", "ac-card");
    data.append(el("h3", "", "Your data"));
    const row = el("div", "ac-row");
    row.append(
      ghost("Download my data", () => {
        window.open("/api/account/export", "_blank", "noopener");
      }),
      ghost("Delete account…", async () => {
        const password =
          account.kind === "registered"
            ? await holoConfirm({
                title: "Delete " + account.displayName + "?",
                message: "Your account, cloud save, friends and chat history are removed for good. This cannot be undone.",
                tone: "danger",
                icon: "trash",
                confirmLabel: "Delete forever",
                input: { type: "password", label: "Type your password to confirm" },
              })
            : (await holoConfirm({ title: "Delete this guest pilot?", message: "Its cloud save is removed for good.", tone: "danger", icon: "trash", confirmLabel: "Delete" }))
              ? ""
              : null;
        if (password === null) return;
        try {
          await session.deleteAccount(password);
          deps.notice("Account deleted");
          render();
        } catch (error) {
          deps.notice(error instanceof Error ? error.message : "Delete failed");
        }
      }),
    );
    data.append(row);
    root.append(data);

    root.append(ghost("Sign out", async () => {
      try {
        await session.logout();
        deps.notice("Signed out · back to this device's guest pilot");
        render();
      } catch (error) {
        deps.notice(error instanceof Error ? error.message : "Sign out failed");
      }
    }));
    return root;
  }

  function conflictView(conflict: CloudConflict): HTMLElement {
    const root = el("div", "ac-conflict");
    root.append(el("p", "ac-muted", "This device and your cloud save have different progress. Choose which one to keep. The other is kept as a backup on the server."));
    const grid = el("div", "ac-choice-grid");
    const card = (label: string, data: { highestUnlockedStage?: unknown; clearedStages?: unknown; credits?: unknown; updatedAt?: unknown }, action: () => Promise<void>, cls: string) => {
      const box = el("section", "ac-choice " + cls);
      box.append(
        el("h3", "", label),
        el("strong", "ac-stage", "Stage " + String(data.highestUnlockedStage ?? "—").padStart(3, "0")),
        el("span", "", String(data.clearedStages ?? 0) + " stages cleared"),
        el("span", "", Number(data.credits ?? 0).toLocaleString() + " Credits"),
        el("small", "", data.updatedAt ? "Saved " + new Date(String(data.updatedAt)).toLocaleString() : ""),
      );
      const button = el("button", "holo-cta", "Keep " + label.toLowerCase());
      button.type = "button";
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await action();
          pendingConflict = null;
          dialog?.close();
        } catch (error) {
          button.disabled = false;
          deps.notice(error instanceof Error ? error.message : "Failed");
        }
      });
      box.append(button);
      return box;
    };
    grid.append(card("Cloud save", conflict.cloud, conflict.useCloud, "cloud"), card("This device", conflict.local, conflict.useLocal, "local"));
    root.append(grid);
    return root;
  }

  function render(): void {
    if (body === null || title === null) return;
    if (view === "conflict" && pendingConflict !== null) {
      title.textContent = "Choose your save";
      body.replaceChildren(conflictView(pendingConflict));
      return;
    }
    if (view === "reset") {
      title.textContent = "New password";
      body.replaceChildren(resetForm());
      return;
    }
    if (session.registered && (view === "auto" || view === "create" || view === "login")) {
      title.textContent = "Pilot account";
      body.replaceChildren(profile());
      return;
    }
    title.textContent = "Pilot account";
    if (session.status === "offline") {
      body.replaceChildren(guestIntro(), message("Could not reach the server. Try again later.", "info"));
      return;
    }
    if (session.status === "banned") {
      body.replaceChildren(message(session.bannedMessage || "This account is suspended."));
      return;
    }
    if (view === "auto") view = "create";
    if (view === "forgot") {
      body.replaceChildren(forgotForm());
      return;
    }
    body.replaceChildren(guestIntro(), tabs(), view === "login" ? loginForm() : createForm());
  }

  session.onChange(() => {
    if (dialog?.open) render();
  });

  function open(next: View = "auto"): void {
    if (dialog === null) return;
    view = next;
    render();
    if (!dialog.open) dialog.showModal();
  }

  return {
    open,
    conflict(conflict: CloudConflict) {
      pendingConflict = conflict;
      open("conflict");
    },
    handleLinks() {
      const params = new URLSearchParams(location.search);
      const verify = params.get("verify");
      const reset = params.get("reset");
      if (verify === null && reset === null) return;
      // Remove the token from the address bar right away.
      params.delete("verify");
      params.delete("reset");
      history.replaceState(null, "", location.pathname + (params.size > 0 ? "?" + params.toString() : "") + location.hash);
      if (verify !== null) {
        void session
          .verifyEmail(verify)
          .then(() => deps.notice("✓ Email confirmed"))
          .catch((error: unknown) => deps.notice(error instanceof OnlineError ? error.message : "This link has expired."));
      }
      if (reset !== null) {
        resetToken = reset;
        open("reset");
      }
    },
  };
}
