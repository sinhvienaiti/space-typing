import { onlineRequest } from "../online/api";
import { ChatConnection, type ChatMessage } from "../online/chat-client";
import type { OnlineSession } from "../online/session";
import { holoConfirm } from "./holo-confirm";
import { lookFromIds, renderAvatar, renderTitle } from "./cosmetic-look";

/**
 * Chat drawer (#chatPanel) on the hangar screen: World, Groups, Friends
 * (private chat). A room connects only while it is on screen, so an idle
 * player costs the server nothing. The drawer closes when a stage starts;
 * nothing pops up during combat.
 */
type Tab = "world" | "groups" | "friends";
type Friend = { id: string; name: string; code: string; status: "pending-out" | "pending-in" | "accepted" | "blocked"; last_seen_at: string | null };
type Group = { id: string; name: string; invite_code: string; role: "owner" | "member"; members: number };

export type ChatPanelDeps = {
  session: OnlineSession;
  openAccount(): void;
  notice(text: string): void;
  sound: { tab(): void; error(): void; message(): void };
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function hue(text: string): number {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) % 360;
  return value;
}

function timeLabel(at: number): string {
  const date = new Date(at);
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { day: "2-digit", month: "2-digit" }) + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function installChatPanel(deps: ChatPanelDeps): { toggle(force?: boolean): void; close(): void; setLook(look: { avatar: string; frame: string; title: string }): void } {
  const panel = document.getElementById("chatPanel");
  const toggleButton = document.getElementById("titleChatButton");
  if (panel === null) return { toggle() {}, close() {}, setLook() {} };
  const { session } = deps;
  let tab: Tab = "world";
  /** The player's Style Shop look, sent with each message. */
  let myLook: { avatar: string; frame: string; title: string } | undefined;
  let room: { connection: ChatConnection; title: string; channel: string } | null = null;
  let friends: Friend[] = [];
  let groups: Group[] = [];
  let myCode = "";

  const head = el("header", "cp-head");
  const titleBox = el("div", "cp-title");
  const titleText = el("strong", "", "Comms");
  const online = el("span", "cp-online", "");
  titleBox.append(titleText, online);
  const close = el("button", "cp-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Close chat");
  close.addEventListener("click", () => toggle(false));
  head.append(titleBox, close);
  const tabs = el("nav", "cp-tabs");
  const tabButtons = new Map<Tab, HTMLButtonElement>();
  for (const [id, label, icon] of [["world", "World", "globe"], ["groups", "Groups", "users"], ["friends", "Friends", "heart"]] as const) {
    const button = el("button", "cp-tab", label);
    button.type = "button";
    button.dataset.icon = icon;
    button.addEventListener("click", () => {
      if (tab === id && room === null) return;
      tab = id;
      deps.sound.tab();
      show();
    });
    tabButtons.set(id, button);
    tabs.append(button);
  }
  const body = el("div", "cp-body");
  panel.append(head, tabs, body);

  function setOnline(text: string): void {
    online.textContent = text;
  }

  function leaveRoom(): void {
    room?.connection.close();
    room = null;
    setOnline("");
  }

  // ---------- A live room ----------
  function openRoom(channel: string, title: string, back?: () => void): void {
    leaveRoom();
    const view = el("div", "cp-room");
    const bar = el("div", "cp-room-bar");
    if (back) {
      const backButton = el("button", "cp-back", "‹ Back");
      backButton.type = "button";
      backButton.addEventListener("click", () => {
        leaveRoom();
        back();
      });
      bar.append(backButton);
    }
    bar.append(el("strong", "", title));
    const log = el("div", "cp-log");
    log.setAttribute("role", "log");
    log.setAttribute("aria-live", "polite");
    const status = el("div", "cp-room-status", "Connecting…");
    const form = el("form", "cp-compose");
    const input = el("input");
    input.type = "text";
    input.maxLength = 200;
    input.placeholder = "Say something…";
    input.setAttribute("aria-label", "Message");
    const count = el("span", "cp-count", "0/200");
    const send = el("button", "cp-send", "Send");
    send.type = "submit";
    form.append(input, count, send);
    input.addEventListener("input", () => {
      count.textContent = [...input.value].length + "/200";
    });
    // Typing in chat must never reach the game's keyboard handler.
    input.addEventListener("keydown", (event) => event.stopPropagation());
    view.append(bar, status, log, form);
    body.replaceChildren(view);

    const atBottom = (): boolean => log.scrollHeight - log.scrollTop - log.clientHeight < 40;
    const add = (message: ChatMessage, mine: boolean): void => {
      const stick = atBottom();
      const row = el("article", "cp-msg" + (mine ? " mine" : "") + (message.system ? " system" : ""));
      row.dataset.id = message.id;
      const look = message.from.look === undefined ? null : lookFromIds(message.from.look);
      if (!message.system && look !== null) {
        row.append(renderAvatar(look.avatar, look.frame, 34));
      } else if (!message.system) {
        const avatar = el("span", "cp-avatar", message.from.name.slice(0, 1).toUpperCase());
        avatar.style.setProperty("--h", String(hue(message.from.id)));
        row.append(avatar);
      }
      const content = el("div", "cp-msg-body");
      const meta = el("div", "cp-meta");
      meta.append(el("strong", "", message.system ? "★ " + message.from.name : message.from.name));
      if (look?.title && look.title.unlock.kind !== "default") meta.append(renderTitle(look.title));
      meta.append(el("time", "", timeLabel(message.at)));
      if (!mine && !message.system) {
        const report = el("button", "cp-report", "Report");
        report.type = "button";
        report.title = "Report this message to moderators";
        report.addEventListener("click", async () => {
          const reason = await holoConfirm({
            title: "Report " + message.from.name + "?",
            message: "“" + message.text + "”",
            icon: "warning",
            confirmLabel: "Report",
            input: { label: "Reason (optional)", placeholder: "Spam, insults, cheating…", maxLength: 200 },
          });
          if (reason !== null) room?.connection.report(message.id, reason);
        });
        meta.append(report);
      }
      content.append(meta, el("p", "", message.text));
      row.append(content);
      log.append(row);
      while (log.childElementCount > 120) log.firstElementChild?.remove();
      if (stick || mine) log.scrollTop = log.scrollHeight;
    };

    const selfId = session.account?.id ?? "";
    const connection = new ChatConnection(channel, selfId, {
      hello(history, people, canSend, mutedUntil) {
        log.replaceChildren();
        for (const message of history) add(message, message.from.id === selfId);
        setOnline(people + " online");
        status.replaceChildren();
        if (!canSend) {
          input.disabled = true;
          send.disabled = true;
          if (mutedUntil > Date.now()) {
            status.textContent = "You are muted until " + new Date(mutedUntil).toLocaleString() + ".";
          } else {
            const cta = el("button", "cp-cta", "Create a free account to chat");
            cta.type = "button";
            cta.addEventListener("click", deps.openAccount);
            status.append(el("span", "", "Guests can read. "), cta);
          }
        } else {
          input.disabled = false;
          send.disabled = false;
        }
        log.scrollTop = log.scrollHeight;
      },
      message(message, mine) {
        add(message, mine);
        if (!mine) deps.sound.message();
      },
      remove(id) {
        log.querySelector('[data-id="' + CSS.escape(id) + '"]')?.remove();
      },
      presence(people) {
        setOnline(people + " online");
      },
      problem(text) {
        deps.sound.error();
        status.textContent = text;
        window.setTimeout(() => {
          if (status.textContent === text) status.textContent = "";
        }, 4000);
      },
      notice(text) {
        status.textContent = text;
      },
      state(connected) {
        if (!connected) status.textContent = "Reconnecting…";
        else if (status.textContent === "Reconnecting…" || status.textContent === "Connecting…") status.textContent = "";
      },
    });
    room = { connection, title, channel };
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (text === "") return;
      if (connection.send(text, myLook) === null) {
        status.textContent = "Not connected yet.";
        return;
      }
      input.value = "";
      count.textContent = "0/200";
    });
    input.focus();
  }

  // ---------- Lists ----------
  async function loadSocial(): Promise<void> {
    const data = await onlineRequest<{ pilotCode: string; friends: Friend[]; groups: Group[] }>("/social");
    myCode = data.pilotCode;
    friends = data.friends;
    groups = data.groups;
    const requests = friends.filter((friend) => friend.status === "pending-in").length;
    for (const target of [tabButtons.get("friends"), toggleButton]) {
      if (!(target instanceof HTMLElement)) continue;
      if (requests > 0) target.dataset.badge = String(requests);
      else delete target.dataset.badge;
    }
  }

  function guestGate(): HTMLElement {
    const box = el("div", "cp-gate");
    box.append(el("strong", "", "Friends and groups need a free account"), el("p", "", "Your guest progress moves to the new account. It takes 20 seconds."));
    const cta = el("button", "holo-cta", "Create account");
    cta.type = "button";
    cta.addEventListener("click", deps.openAccount);
    box.append(cta);
    return box;
  }

  async function action(work: () => Promise<unknown>, done?: string): Promise<boolean> {
    try {
      await work();
      if (done) deps.notice(done);
      return true;
    } catch (error) {
      deps.sound.error();
      deps.notice(error instanceof Error ? error.message : "Failed");
      return false;
    }
  }

  function friendsView(): void {
    const view = el("div", "cp-list");
    const me = el("button", "cp-mycode", "Your pilot code · " + myCode);
    me.type = "button";
    me.title = "Copy";
    me.addEventListener("click", () => {
      void navigator.clipboard?.writeText(myCode);
      deps.notice("Pilot code copied");
    });
    const add = el("form", "cp-inline");
    const code = el("input");
    code.placeholder = "Friend's pilot code";
    code.maxLength = 6;
    code.addEventListener("keydown", (event) => event.stopPropagation());
    const addButton = el("button", "holo-ghost", "Add");
    addButton.type = "submit";
    add.append(code, addButton);
    add.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (await action(() => onlineRequest("/social/friends/request", { body: { code: code.value } }), "Friend request sent")) {
        code.value = "";
        await loadSocial();
        friendsView();
      }
    });
    view.append(me, add);
    const sections: [string, Friend[]][] = [
      ["Requests", friends.filter((friend) => friend.status === "pending-in")],
      ["Friends", friends.filter((friend) => friend.status === "accepted")],
      ["Sent", friends.filter((friend) => friend.status === "pending-out")],
    ];
    for (const [label, list] of sections) {
      if (list.length === 0) continue;
      view.append(el("h4", "cp-section", label + " · " + list.length));
      for (const friend of list) {
        const row = el("div", "cp-row");
        const avatar = el("span", "cp-avatar", friend.name.slice(0, 1).toUpperCase());
        avatar.style.setProperty("--h", String(hue(friend.id)));
        const recently = friend.last_seen_at !== null && Date.now() - new Date(friend.last_seen_at).getTime() < 15 * 60_000;
        const text = el("div", "cp-row-text");
        text.append(el("strong", "", friend.name), el("small", "", friend.code + (recently ? " · online recently" : "")));
        row.append(avatar, text);
        const actions = el("div", "cp-row-actions");
        const small = (labelText: string, run: () => Promise<void>): HTMLButtonElement => {
          const button = el("button", "cp-small", labelText);
          button.type = "button";
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            void run();
          });
          return button;
        };
        if (friend.status === "pending-in") {
          actions.append(
            small("Accept", async () => {
              await action(() => onlineRequest("/social/friends/" + friend.id + "/accept", { body: {} }), "You are now friends");
              await loadSocial();
              friendsView();
            }),
            small("Decline", async () => {
              await action(() => onlineRequest("/social/friends/" + friend.id + "/decline", { body: {} }));
              await loadSocial();
              friendsView();
            }),
          );
        } else if (friend.status === "accepted") {
          row.classList.add("clickable");
          row.addEventListener("click", () => openRoom("dm:" + friend.id, friend.name, friendsView));
          actions.append(
            small("⋯", async () => {
              const ok = await holoConfirm({ title: "Remove " + friend.name + "?", message: "You can add each other again with your pilot codes.", tone: "danger", confirmLabel: "Remove friend" });
              if (!ok) return;
              await action(() => onlineRequest("/social/friends/" + friend.id + "/remove", { body: {} }));
              await loadSocial();
              friendsView();
            }),
          );
        }
        row.append(actions);
        view.append(row);
      }
    }
    if (friends.length === 0) view.append(el("p", "cp-empty", "Share your pilot code. Friends can chat privately and see when you were online."));
    body.replaceChildren(view);
  }

  function groupsView(): void {
    const view = el("div", "cp-list");
    const create = el("form", "cp-inline");
    const name = el("input");
    name.placeholder = "New group name";
    name.maxLength = 32;
    name.addEventListener("keydown", (event) => event.stopPropagation());
    const createButton = el("button", "holo-ghost", "Create");
    createButton.type = "submit";
    create.append(name, createButton);
    create.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (await action(() => onlineRequest("/social/groups", { body: { name: name.value } }), "Group created · share its invite code")) {
        name.value = "";
        await loadSocial();
        groupsView();
      }
    });
    const join = el("form", "cp-inline");
    const code = el("input");
    code.placeholder = "Invite code";
    code.maxLength = 8;
    code.addEventListener("keydown", (event) => event.stopPropagation());
    const joinButton = el("button", "holo-ghost", "Join");
    joinButton.type = "submit";
    join.append(code, joinButton);
    join.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (await action(() => onlineRequest("/social/groups/join", { body: { code: code.value } }), "Joined the group")) {
        code.value = "";
        await loadSocial();
        groupsView();
      }
    });
    view.append(create, join);
    if (groups.length === 0) view.append(el("p", "cp-empty", "Make a squad with classmates or friends: group chat for up to 50 pilots."));
    for (const group of groups) {
      const row = el("div", "cp-row clickable");
      const avatar = el("span", "cp-avatar square", group.name.slice(0, 1).toUpperCase());
      avatar.style.setProperty("--h", String(hue(group.id)));
      const text = el("div", "cp-row-text");
      text.append(el("strong", "", group.name), el("small", "", group.members + " members · invite " + group.invite_code));
      row.append(avatar, text);
      row.addEventListener("click", () => openRoom("group:" + group.id, group.name, groupsView));
      const leave = el("button", "cp-small", "Leave");
      leave.type = "button";
      leave.addEventListener("click", async (event) => {
        event.stopPropagation();
        const ok = await holoConfirm({ title: "Leave " + group.name + "?", tone: "danger", confirmLabel: "Leave group" });
        if (!ok) return;
        await action(() => onlineRequest("/social/groups/" + group.id + "/leave", { body: {} }));
        await loadSocial();
        groupsView();
      });
      const actions = el("div", "cp-row-actions");
      actions.append(leave);
      row.append(actions);
      view.append(row);
    }
    body.replaceChildren(view);
  }

  function show(): void {
    for (const [id, button] of tabButtons) {
      button.classList.toggle("on", id === tab);
      button.setAttribute("aria-selected", String(id === tab));
    }
    leaveRoom();
    if (!session.online) {
      body.replaceChildren(el("p", "cp-empty", session.status === "banned" ? session.bannedMessage : "Chat needs a connection to the game server."));
      return;
    }
    if (tab === "world") {
      openRoom("world", "World channel");
      return;
    }
    if (!session.registered) {
      body.replaceChildren(guestGate());
      return;
    }
    body.replaceChildren(el("p", "cp-empty", "Loading…"));
    void loadSocial()
      .then(() => (tab === "friends" ? friendsView() : groupsView()))
      .catch((error: unknown) => body.replaceChildren(el("p", "cp-empty", error instanceof Error ? error.message : "Could not load.")));
  }

  function toggle(force?: boolean): void {
    const open = force ?? !panel!.classList.contains("open");
    panel!.classList.toggle("open", open);
    toggleButton?.setAttribute("aria-expanded", String(open));
    if (open) show();
    else leaveRoom();
  }

  toggleButton?.addEventListener("click", () => toggle());
  session.onChange(() => {
    if (panel.classList.contains("open")) show();
    if (session.registered) void loadSocial().catch(() => {});
  });

  return {
    toggle,
    close: () => toggle(false),
    setLook(look) {
      myLook = look;
    },
  };
}
