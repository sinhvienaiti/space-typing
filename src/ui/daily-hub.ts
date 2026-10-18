import type { LiveOpsController } from "../liveops/controller";
import { isBigClaim, type ClaimRequest } from "../liveops/claims";
import { DAILY_GOALS, LIVE_OPS_POLICY, type DailyGoal, type LiveOpsReward } from "../liveops/policy";
import { activityPoints, missionViews, warpWindowViews, type LiveOpsBadges } from "../liveops/state";
import { formatCountdown, gameMonth, nextDayResetMs, nextWeekResetMs } from "../liveops/time";
import { liveOpsArt, liveOpsArtElement, type LiveOpsArtName } from "./liveops-art";
import { rewardChips, showRewardReveal } from "./reward-reveal";

/**
 * Daily Hub: streak and daily goal, sign-in calendars, daily/weekly missions
 * with activity chests, play-time and Warp gifts, and the mailbox. Opened
 * from the title dock ("Daily") and the mail tool; red dots come from
 * LiveOpsController.badges().
 */
export type HubTab = "today" | "calendar" | "missions" | "gifts" | "mail";

export type DailyHubDeps = {
  controller: LiveOpsController;
  sound: {
    tab(): void;
    reveal(big: boolean): void;
    error(): void;
  };
  notice(text: string): void;
};

const TABS: readonly { id: HubTab; label: string; icon: string; badge: keyof LiveOpsBadges }[] = [
  { id: "today", label: "Today", icon: "flame", badge: "today" },
  { id: "calendar", label: "Sign-in", icon: "calendar", badge: "calendar" },
  { id: "missions", label: "Missions", icon: "target", badge: "missions" },
  { id: "gifts", label: "Gifts", icon: "gift", badge: "gifts" },
  { id: "mail", label: "Mail", icon: "mail", badge: "mail" },
];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== "") node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function minuteLabel(minute: number): string {
  return String(Math.floor(minute / 60)).padStart(2, "0") + ":" + String(minute % 60).padStart(2, "0");
}

function setBadge(element: Element | null, count: number): void {
  if (!(element instanceof HTMLElement)) return;
  if (count > 0) element.dataset.badge = count > 9 ? "9+" : String(count);
  else delete element.dataset.badge;
}

export function installDailyHub(deps: DailyHubDeps): {
  open(tab?: HubTab): void;
  render(): void;
  refreshBadges(): void;
} {
  const { controller } = deps;
  const dialog = document.getElementById("liveOpsDialog") as HTMLDialogElement | null;
  const tabsHost = document.getElementById("liveOpsTabs");
  const body = document.getElementById("liveOpsBody");
  const resetLabel = document.getElementById("liveOpsReset");
  let tab: HubTab = "today";
  let clock = 0;
  const banner = liveOpsArt("hub-banner");
  if (banner !== null) dialog?.style.setProperty("--lo-banner", 'url("' + banner + '")');

  const tabButtons = new Map<HubTab, HTMLButtonElement>();
  for (const item of TABS) {
    const button = el("button", "lo-tab");
    button.type = "button";
    button.dataset.icon = item.icon;
    button.setAttribute("role", "tab");
    button.textContent = item.label;
    button.addEventListener("click", () => {
      if (tab === item.id) return;
      tab = item.id;
      deps.sound.tab();
      render();
    });
    tabButtons.set(item.id, button);
    tabsHost?.append(button);
  }

  async function claim(
    button: HTMLButtonElement,
    request: ClaimRequest,
    reveal: { big?: boolean; art?: LiveOpsArtName } = {},
  ): Promise<void> {
    button.disabled = true;
    const result = await controller.claim(request);
    if (!result.ok) {
      deps.notice(result.reason);
      deps.sound.error();
      render();
      return;
    }
    if (result.note !== undefined) deps.notice(result.note);
    // A big reward held for a verified email: nothing to reveal yet.
    if (result.note !== undefined && Object.keys(result.reward).length === 0) {
      render();
      return;
    }
    showRewardReveal({
      title: result.label,
      reward: result.reward,
      big: reveal.big ?? isBigClaim(request),
      art: reveal.art,
      onSound: deps.sound.reveal,
    });
    render();
  }

  function claimButton(label: string, onClick: (button: HTMLButtonElement) => void, primary = true): HTMLButtonElement {
    const button = el("button", primary ? "holo-cta lo-claim" : "holo-ghost lo-claim", label);
    button.type = "button";
    button.addEventListener("click", () => onClick(button));
    return button;
  }

  function stateTag(text: string, kind: "done" | "locked" | "wait" | "open"): HTMLElement {
    return el("span", "lo-tag lo-tag-" + kind, text);
  }

  function rewardRow(reward: LiveOpsReward, extra?: string): HTMLElement {
    const row = el("div", "lo-rewards");
    row.append(...rewardChips(reward));
    if (extra !== undefined) row.append(el("span", "lo-points", extra));
    return row;
  }

  // ---------- Today ----------
  function renderToday(): HTMLElement {
    const state = controller.state();
    const root = el("div", "lo-today");
    const streak = el("section", "lo-panel lo-streak");
    streak.classList.toggle("lit", state.daily.goalMet);
    const flame = liveOpsArtElement("streak-flame", "lo-streak-flame");
    const count = el("div", "lo-streak-count");
    count.append(el("strong", "", String(state.streak.count)), el("span", "", state.streak.count === 1 ? "day streak" : "day streak"));
    const words = state.daily.counters.words;
    const goal = state.streak.goal;
    const status = el(
      "p",
      "lo-streak-status",
      state.daily.goalMet
        ? "Goal reached today. The streak is safe until tomorrow 04:00."
        : state.streak.count > 0
          ? "Type " + Math.max(0, goal - words) + " more words today to keep your streak."
          : "Reach today's goal to start a streak.",
    );
    const best = el("p", "lo-streak-best", "Best " + state.streak.best + " days" + (state.streak.shieldedDays > 0 ? " · " + state.streak.shieldedDays + " days saved by shields" : ""));
    const shields = el("div", "lo-shields");
    for (let index = 0; index < LIVE_OPS_POLICY.shield.max; index += 1) {
      const slot = liveOpsArtElement("streak-shield", "lo-shield");
      slot.classList.toggle("empty", index >= state.streak.shields);
      shields.append(slot);
    }
    const shieldText = el("span", "lo-shield-text", "Shields cover a missed day automatically.");
    shields.append(shieldText);
    if (state.streak.shields < LIVE_OPS_POLICY.shield.max) {
      const buy = claimButton("Buy shield · " + LIVE_OPS_POLICY.shield.price + " ✧", async (button) => {
        button.disabled = true;
        const result = await controller.buyShield();
        if (!result.ok) {
          deps.notice(result.reason ?? "Cannot buy a shield now.");
          deps.sound.error();
        } else deps.sound.reveal(false);
        render();
      }, false);
      shields.append(buy);
    }
    const text = el("div", "lo-streak-text");
    text.append(count, status, best);
    streak.append(flame, text, shields);

    const goalPanel = el("section", "lo-panel lo-goal");
    goalPanel.append(el("h3", "", "Daily goal"));
    const bar = el("div", "lo-bar");
    bar.style.setProperty("--p", String(Math.min(1, words / goal)));
    bar.append(el("i"));
    goalPanel.append(bar, el("p", "lo-goal-text", Math.min(words, goal) + " / " + goal + " words typed today"));
    const choices = el("div", "holo-seg lo-goal-choices");
    for (const option of DAILY_GOALS) {
      const button = el("button", option === goal ? "on" : "", option + " · " + LIVE_OPS_POLICY.dailyGoalLabels[option]);
      button.type = "button";
      button.addEventListener("click", () => {
        deps.sound.tab();
        void controller.setGoal(option as DailyGoal).then(render);
      });
      choices.append(button);
    }
    goalPanel.append(choices);

    const milestones = el("section", "lo-panel lo-milestones");
    milestones.append(el("h3", "", "Streak rewards"));
    const row = el("div", "lo-milestone-row");
    for (const milestone of LIVE_OPS_POLICY.streakMilestones) {
      const card = el("article", "lo-milestone");
      const done = state.streak.milestones.includes(milestone.days);
      const ready = !done && state.streak.count >= milestone.days;
      card.classList.toggle("done", done);
      card.classList.toggle("ready", ready);
      card.append(el("strong", "", milestone.days + " days"), rewardRow(milestone.reward));
      if (ready) {
        card.append(claimButton("Claim", (button) => void claim(button, { kind: "streak", days: milestone.days }, { big: true, art: "chest-milestone" })));
      } else {
        card.append(stateTag(done ? "Claimed" : state.streak.count + " / " + milestone.days, done ? "done" : "locked"));
      }
      row.append(card);
    }
    milestones.append(row);
    root.append(streak, goalPanel, milestones);
    return root;
  }

  // ---------- Sign-in ----------
  function calendarCell(
    index: number,
    reward: LiveOpsReward,
    claimed: number,
    lastDay: number,
    day: number,
    big: boolean,
    request: ClaimRequest,
  ): HTMLElement {
    const cell = el("article", "lo-cell");
    cell.classList.toggle("big", big);
    const isClaimed = index < claimed;
    const isNext = index === claimed;
    const ready = isNext && lastDay < day;
    cell.classList.toggle("done", isClaimed);
    cell.classList.toggle("ready", ready);
    cell.append(
      el("span", "lo-cell-day", "Day " + (index + 1)),
      liveOpsArtElement(big ? "calendar-gift-big" : "calendar-gift", "lo-cell-art"),
      rewardRow(reward),
    );
    if (ready) cell.append(claimButton("Sign in", (button) => void claim(button, request, { big })));
    else if (isClaimed) cell.append(stateTag("✓", "done"));
    else if (isNext) cell.append(stateTag("Tomorrow", "wait"));
    return cell;
  }

  function renderCalendar(): HTMLElement {
    const state = controller.state();
    const day = controller.today();
    const root = el("div", "lo-calendar");
    if (state.newbie.claimed < LIVE_OPS_POLICY.newbie.length) {
      const newbie = el("section", "lo-panel lo-newbie");
      newbie.append(el("h3", "", "Starter week"), el("p", "lo-note", "Sign in on 7 days, not necessarily in a row. Day 7 brings a Quantum Core."));
      const grid = el("div", "lo-grid lo-grid-7");
      LIVE_OPS_POLICY.newbie.forEach((reward, index) => {
        grid.append(calendarCell(index, reward, state.newbie.claimed, state.newbie.lastDay, day, index === 6, { kind: "newbie" }));
      });
      newbie.append(grid);
      root.append(newbie);
    }
    const month = el("section", "lo-panel lo-month");
    const [year, monthNumber] = gameMonth(day).split("-");
    const monthName = new Date(Date.UTC(Number(year), Number(monthNumber) - 1, 1)).toLocaleString("en", { month: "long", timeZone: "UTC" });
    month.append(
      el("h3", "", "Monthly sign-in · " + monthName),
      el("p", "lo-note", state.monthly.claimed + " / 28 collected. One cell per day you sign in; days 7, 14, 21 and 28 are the big ones."),
    );
    const grid = el("div", "lo-grid lo-grid-7");
    LIVE_OPS_POLICY.monthly.forEach((reward, index) => {
      grid.append(calendarCell(index, reward, state.monthly.claimed, state.monthly.lastDay, day, (index + 1) % 7 === 0, { kind: "monthly" }));
    });
    month.append(grid);
    root.append(month);
    return root;
  }

  // ---------- Missions ----------
  function chestTrack(scope: "daily" | "weekly", points: number, max: number): HTMLElement {
    const state = controller.state();
    const chests = scope === "daily" ? LIVE_OPS_POLICY.dailyChests : LIVE_OPS_POLICY.weeklyChests;
    const opened = scope === "daily" ? state.daily.chests : state.weekly.chests;
    const track = el("div", "lo-track");
    const bar = el("div", "lo-bar lo-track-bar");
    bar.style.setProperty("--p", String(Math.min(1, points / max)));
    bar.append(el("i"));
    track.append(bar, el("span", "lo-track-points", points + " pts"));
    for (const chest of chests) {
      const node = el("div", "lo-chest");
      node.style.setProperty("--at", String(chest.points / max));
      const done = opened.includes(chest.points);
      const ready = !done && points >= chest.points;
      node.classList.toggle("done", done);
      node.classList.toggle("ready", ready);
      const art = liveOpsArtElement(
        scope === "daily" ? (done ? "chest-daily-open" : "chest-daily-closed") : done ? "chest-weekly-open" : "chest-weekly-closed",
        "lo-chest-art",
      );
      const button = el("button", "lo-chest-button");
      button.type = "button";
      button.disabled = !ready;
      button.title = chest.points + " pts";
      button.append(art, el("span", "lo-chest-label", String(chest.points)));
      const tip = el("div", "lo-chest-tip");
      tip.append(...rewardChips(chest.reward));
      button.append(tip);
      if (ready) {
        button.addEventListener("click", () =>
          void claim(button, { kind: "chest", scope, points: chest.points }, {
            big: true,
            art: scope === "daily" ? "chest-daily-open" : "chest-weekly-open",
          }),
        );
      }
      node.append(button);
      track.append(node);
    }
    return track;
  }

  function missionList(scope: "daily" | "weekly"): HTMLElement {
    const state = controller.state();
    const list = el("div", "lo-missions");
    for (const view of missionViews(state, scope, controller.today())) {
      const row = el("article", "lo-mission");
      row.classList.toggle("done", view.claimed);
      row.classList.toggle("ready", view.claimable);
      const main = el("div", "lo-mission-main");
      const isTime = view.mission.counter === "activeSeconds";
      const progress = isTime ? Math.floor(view.progress / 60) + " / " + Math.floor(view.target / 60) + " min" : view.progress + " / " + view.target;
      main.append(el("strong", "", view.mission.title), el("span", "lo-mission-progress", progress));
      const bar = el("div", "lo-bar lo-bar-thin");
      bar.style.setProperty("--p", String(view.target > 0 ? view.progress / view.target : 0));
      bar.append(el("i"));
      main.append(bar);
      row.append(main, rewardRow(view.mission.reward, "+" + view.mission.points + " pts"));
      if (view.claimable) {
        row.append(claimButton("Claim", (button) => void claim(button, { kind: "mission", scope, id: view.mission.id })));
      } else {
        row.append(stateTag(view.claimed ? "Claimed" : "In progress", view.claimed ? "done" : "locked"));
      }
      list.append(row);
    }
    return list;
  }

  function renderMissions(): HTMLElement {
    const state = controller.state();
    const day = controller.today();
    const root = el("div", "lo-missions-tab");
    const daily = el("section", "lo-panel");
    daily.append(el("h3", "", "Daily missions"), chestTrack("daily", activityPoints(state, "daily", day), 100), missionList("daily"));
    const weekly = el("section", "lo-panel");
    weekly.append(
      el("h3", "", "Weekly missions"),
      el("p", "lo-note", "Resets Monday 04:00 · " + formatCountdown(nextWeekResetMs(controller.now()) - controller.now()) + " left"),
      chestTrack("weekly", activityPoints(state, "weekly", day), 120),
      missionList("weekly"),
    );
    root.append(daily, weekly);
    return root;
  }

  // ---------- Gifts ----------
  function renderGifts(): HTMLElement {
    const state = controller.state();
    const root = el("div", "lo-gifts");
    const play = el("section", "lo-panel");
    const minutes = Math.floor(state.daily.counters.activeSeconds / 60);
    play.append(
      el("h3", "", "Flight-time gifts"),
      el("p", "lo-note", "Played today: " + minutes + " / " + LIVE_OPS_POLICY.playtimeCapMinutes + " min. Only active play counts (typing or speaking in the last minute)."),
    );
    const row = el("div", "lo-grid lo-grid-5");
    for (const gift of LIVE_OPS_POLICY.playtime) {
      const card = el("article", "lo-cell");
      const done = state.playtime.includes(gift.minutes);
      const ready = !done && minutes >= gift.minutes;
      card.classList.toggle("done", done);
      card.classList.toggle("ready", ready);
      card.append(el("span", "lo-cell-day", gift.minutes + " min"), liveOpsArtElement("playtime-gift", "lo-cell-art"), rewardRow(gift.reward));
      if (ready) card.append(claimButton("Open", (button) => void claim(button, { kind: "playtime", minutes: gift.minutes })));
      else card.append(stateTag(done ? "✓" : gift.minutes - minutes + " min to go", done ? "done" : "locked"));
      row.append(card);
    }
    play.append(row);

    const supply = el("section", "lo-panel");
    supply.append(el("h3", "", "Free Warp supply"), el("p", "lo-note", "Vietnam time. Open the hub during a window to collect it."));
    const windows = el("div", "lo-grid lo-grid-2");
    for (const view of warpWindowViews(state, controller.now())) {
      const card = el("article", "lo-supply");
      card.classList.toggle("ready", view.state === "open");
      card.classList.toggle("done", view.state === "claimed");
      const text = el("div", "lo-supply-text");
      text.append(el("strong", "", view.label), el("span", "", minuteLabel(view.startMinute) + " – " + minuteLabel(view.endMinute)));
      card.append(liveOpsArtElement("supply-drop", "lo-supply-art"), text, rewardRow({ warp: view.warp }));
      if (view.state === "open") {
        card.append(claimButton("Collect", (button) => void claim(button, { kind: "warp-window", id: view.id }, { art: "supply-drop" })));
      } else {
        card.append(
          stateTag(
            view.state === "claimed" ? "Collected" : view.state === "upcoming" ? "Opens " + minuteLabel(view.startMinute) : "Missed today",
            view.state === "claimed" ? "done" : view.state === "upcoming" ? "wait" : "locked",
          ),
        );
      }
      windows.append(card);
    }
    supply.append(windows);
    root.append(play, supply);
    return root;
  }

  // ---------- Mail ----------
  function renderMail(): HTMLElement {
    const state = controller.state();
    const day = controller.today();
    const root = el("div", "lo-mail");
    const list = el("section", "lo-panel");
    list.append(el("h3", "", "Mailbox"));
    const items = [...state.inbox].reverse();
    if (items.length === 0) list.append(el("p", "lo-note", "No messages. Fleet news and gifts arrive here."));
    for (const item of items) {
      const row = el("article", "lo-message");
      row.classList.toggle("done", item.claimed);
      row.append(liveOpsArtElement("mail-crate", "lo-message-art"));
      const text = el("div", "lo-message-text");
      text.append(el("strong", "", item.title), el("p", "", item.body));
      if (item.expiresDay >= 0 && !item.claimed) text.append(el("small", "lo-expiry", "Expires in " + Math.max(0, item.expiresDay - day + 1) + " days"));
      row.append(text, rewardRow(item.reward));
      if (!item.claimed) row.append(claimButton("Claim", (button) => void claim(button, { kind: "message", id: item.id })));
      else row.append(stateTag("Claimed", "done"));
      list.append(row);
    }
    const code = el("section", "lo-panel lo-code");
    code.append(el("h3", "", "Gift code"));
    const form = el("form", "lo-code-form");
    const input = el("input");
    input.type = "text";
    input.maxLength = 40;
    input.placeholder = "Enter a code";
    input.autocomplete = "off";
    input.spellcheck = false;
    const submit = el("button", "holo-ghost", "Redeem");
    submit.type = "submit";
    form.append(input, submit);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      submit.disabled = true;
      const result = await controller.redeem(input.value);
      submit.disabled = false;
      if (!result.ok) {
        deps.notice(result.reason ?? "Code not accepted.");
        deps.sound.error();
        return;
      }
      deps.notice("✓ " + (result.title ?? "Gift") + " · check your mail");
      deps.sound.reveal(false);
      render();
    });
    code.append(form);
    root.append(list, code);
    return root;
  }

  function refreshBadges(): void {
    const badges = controller.badges();
    for (const item of TABS) setBadge(tabButtons.get(item.id) ?? null, badges[item.badge]);
    setBadge(document.getElementById("dailyHubButton"), badges.total - badges.mail);
    setBadge(document.getElementById("titleMailButton"), badges.mail);
  }

  function updateClock(): void {
    if (resetLabel === null) return;
    const now = controller.now();
    resetLabel.textContent = "New day in " + formatCountdown(nextDayResetMs(now) - now);
  }

  function render(): void {
    refreshBadges();
    if (dialog === null || body === null || !dialog.open) return;
    controller.sync();
    for (const [id, button] of tabButtons) {
      button.classList.toggle("on", id === tab);
      button.setAttribute("aria-selected", String(id === tab));
    }
    const scroll = body.scrollTop;
    const view =
      tab === "today"
        ? renderToday()
        : tab === "calendar"
          ? renderCalendar()
          : tab === "missions"
            ? renderMissions()
            : tab === "gifts"
              ? renderGifts()
              : renderMail();
    view.classList.add("lo-view");
    body.replaceChildren(view);
    body.scrollTop = scroll;
    updateClock();
  }

  function open(next?: HubTab): void {
    if (dialog === null) return;
    controller.sync();
    if (next !== undefined) tab = next;
    else {
      // Open on the first tab with something to collect.
      const badges = controller.badges();
      tab = TABS.find((item) => badges[item.badge] > 0)?.id ?? "today";
    }
    if (!dialog.open) dialog.showModal();
    render();
    // Online: show the server's latest state (mail, other devices) as soon as it arrives.
    if (controller.isOnline()) void controller.refresh().then(render);
    window.clearInterval(clock);
    let ticks = 0;
    clock = window.setInterval(() => {
      if (!dialog.open) {
        window.clearInterval(clock);
        return;
      }
      updateClock();
      // Day turnover, a supply window opening or play time changing.
      if (++ticks % 30 === 0 || controller.sync()) render();
    }, 1000);
  }

  return { open, render, refreshBadges };
}
