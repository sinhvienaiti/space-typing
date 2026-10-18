import { galaxyTyrant } from "../boss/identity";
import { paintedBossThumbUrl } from "../enemies/painted-sprites";
import type { VisualQuality } from "../types";
import { WORLD_REGISTRY } from "../worlds/registry";
import { iconSvg, type IconName } from "./icons";
import { installTitleGuide, type TitleGuide } from "./title-guide";
import { installTitleShip3D, type TitleShip3D } from "./title-ship3d";

/**
 * Command Deck sections of the title hub (styles: src/ui/title-home.css):
 * the "Today" panel, the ship showcase, the Galaxy route and the fleet, plus
 * the deck's scroll and pointer motion. It only shows numbers from the save;
 * every action goes through the existing buttons and dialogs.
 */

export type TitleHomeShip = {
  id: string;
  name: string;
  role: string;
  unlockStage: number;
  unlocked: boolean;
  selected: boolean;
  level: number;
};

export type TitleHomeWarpWindow = {
  label: string;
  warp: number;
  startMinute: number;
  endMinute: number;
  state: "open" | "upcoming" | "missed" | "claimed";
};

export type TitleHomeToday = {
  streak: { count: number; best: number; goal: number; words: number; goalMet: boolean; shields: number };
  lessons: { done: number; total: number; next: string | null; streak: number; rewardReady: boolean };
  missions: { points: number; maxPoints: number; claimable: number };
  signIn: { ready: boolean; newbieDay: number; newbieTotal: number; monthlyClaimed: number; monthlyTotal: number };
  warp: TitleHomeWarpWindow | null;
  /** Minute of the day (Vietnam time) the Warp windows are written in. */
  minuteOfDay: number;
  mail: number;
  /** "6h 31m" until the next game day. */
  newDayIn: string;
};

export type TitleHomeData = {
  highestStage: number;
  selectedStage: number;
  maxStage: number;
  clearedStages: readonly number[];
  ships: readonly TitleHomeShip[];
  /** Null while the save is still loading. */
  today: TitleHomeToday | null;
  /** Effects quality: Low keeps the painted showcase ship. */
  quality: VisualQuality;
};

export type TitleHomeDeps = {
  openLessons(): void;
  openDaily(tab: "today" | "calendar" | "missions" | "gifts" | "mail"): void;
  openStageSelect(stage: number): void;
  openHangar(): void;
};

const GALAXY_NAMES = [
  "Celestial",
  "Infernal",
  "Frost Prism",
  "Verdant",
  "Shadow Wilds",
  "Cosmic Forge",
  "Abyssal",
  "Aurora",
  "Void Cathedral",
  "Eternity",
] as const;

const GALAXY_KITS = [
  "g01-celestial",
  "g02-infernal",
  "g03-frost-prism",
  "g04-verdant",
  "g05-shadow-nature",
  "g06-cosmic-forge",
  "g07-abyssal",
  "g08-aurora-cosmic",
  "g09-void-cathedral",
  "g10-eternity",
] as const;

const STAGES_PER_GALAXY = 100;
/** Ship order in /assets/space-typing/ships/player-ships-v3.webp (4 × 3). */
const SHIP_ATLAS_ORDER = [
  "vanguard", "aegis", "volt", "wraith",
  "fortune", "arsenal", "oracle", "bastion",
  "reaper", "celestial", "zenith",
] as const;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => "&#" + char.charCodeAt(0) + ";");
}

function pad3(value: number): string {
  return String(Math.max(1, Math.floor(value))).padStart(3, "0");
}

function clockLabel(minute: number): string {
  const hours = Math.floor(minute / 60) % 24;
  return String(hours).padStart(2, "0") + ":" + String(minute % 60).padStart(2, "0");
}

function durationLabel(minutes: number): string {
  if (minutes < 60) return String(Math.max(1, minutes)) + "m";
  return String(Math.floor(minutes / 60)) + "h " + String(minutes % 60).padStart(2, "0") + "m";
}

function atlasPosition(shipId: string): string {
  const index = Math.max(0, SHIP_ATLAS_ORDER.indexOf(shipId as (typeof SHIP_ATLAS_ORDER)[number]));
  return String((index % 4) * 33.333) + "% " + String(Math.floor(index / 4) * 50) + "%";
}

/** Flame level of the streak badge: 0 cold, 1 lit, 2 hot (7+), 3 blazing (30+). */
export function streakHeat(count: number): 0 | 1 | 2 | 3 {
  if (count >= 30) return 3;
  if (count >= 7) return 2;
  return count > 0 ? 1 : 0;
}

/** Cleared-stage counts per Galaxy (index 0 = G01). */
export function clearedPerGalaxy(cleared: readonly number[]): number[] {
  const counts = new Array<number>(GALAXY_NAMES.length).fill(0);
  for (const stage of cleared) {
    const index = Math.floor((stage - 1) / STAGES_PER_GALAXY);
    if (index >= 0 && index < counts.length) counts[index] = (counts[index] ?? 0) + 1;
  }
  return counts;
}

function row(
  action: string,
  icon: IconName,
  title: string,
  detail: string,
  options: { badge?: number; extra?: string; tone?: string } = {},
): string {
  const badge = options.badge !== undefined && options.badge > 0
    ? '<span class="th-row-badge">' + String(Math.min(99, options.badge)) + "</span>"
    : "";
  return (
    '<button type="button" class="th-row" data-act="' + action + '"' +
    (options.tone ? ' data-tone="' + options.tone + '"' : "") + ">" +
    '<span class="th-row-icon">' + iconSvg(icon) + "</span>" +
    '<span class="th-row-text"><strong>' + escapeHtml(title) + "</strong><small>" + escapeHtml(detail) + "</small></span>" +
    (options.extra ?? "") +
    badge +
    '<span class="th-row-go">' + iconSvg("chevron") + "</span>" +
    "</button>"
  );
}

function renderToday(today: TitleHomeToday | null): string {
  if (today === null) {
    return '<header class="th-today-head"><p class="eyebrow">Today</p></header><p class="th-today-loading">Loading your day…</p>';
  }
  const { streak, lessons, missions, signIn, warp } = today;
  const goalRatio = Math.max(0, Math.min(1, streak.goal > 0 ? streak.words / streak.goal : 0));
  const heat = streakHeat(streak.count);
  const ring =
    '<svg class="th-ring" viewBox="0 0 44 44" aria-hidden="true">' +
    '<circle cx="22" cy="22" r="19" pathLength="100" class="th-ring-track"/>' +
    '<circle cx="22" cy="22" r="19" pathLength="100" class="th-ring-fill" style="stroke-dasharray:' +
    (goalRatio * 100).toFixed(1) + ' 100"/></svg>';
  const streakCard =
    '<button type="button" class="th-streak" data-act="today" data-heat="' + heat + '"' + (streak.goalMet ? ' data-done="true"' : "") + ">" +
    '<span class="th-flame" aria-hidden="true">' + iconSvg("flame") + "<i></i></span>" +
    '<span class="th-streak-count"><b>' + String(streak.count) + "</b><small>day streak" +
    (streak.best > streak.count ? " · best " + String(streak.best) : "") + "</small></span>" +
    '<span class="th-goal">' + ring +
    '<span class="th-goal-text"><b>' + String(Math.min(streak.words, 9999)) + "</b>/" + String(streak.goal) +
    "<small>" + (streak.goalMet ? "goal met" : "words") + "</small></span></span>" +
    (streak.shields > 0 ? '<span class="th-shields" title="Streak shields">' + iconSvg("shield") + String(streak.shields) + "</span>" : "") +
    "</button>";

  const dots = Array.from({ length: lessons.total }, (_, index) =>
    '<i class="' + (index < lessons.done ? "is-done" : index === lessons.done ? "is-next" : "") + '"></i>',
  ).join("");
  const lessonRow = row(
    "lessons",
    "calendar",
    "Daily lessons",
    lessons.next === null ? (lessons.rewardReady ? "Chain complete · claim your reward" : "Chain complete · see you tomorrow") : "Next: " + lessons.next,
    { badge: lessons.rewardReady ? 1 : 0, extra: '<span class="th-dots" aria-label="' + lessons.done + " of " + lessons.total + ' done">' + dots + "</span>" },
  );
  const missionRatio = missions.maxPoints > 0 ? Math.min(1, missions.points / missions.maxPoints) : 0;
  const missionRow = row(
    "missions",
    "target",
    "Daily missions",
    String(missions.points) + " / " + String(missions.maxPoints) + " activity",
    { badge: missions.claimable, extra: '<span class="th-meter"><i style="width:' + (missionRatio * 100).toFixed(1) + '%"></i></span>' },
  );
  const signInDetail = signIn.ready
    ? "Gift ready · day " + String(Math.min(signIn.newbieTotal, signIn.newbieDay + 1)) + (signIn.newbieDay < signIn.newbieTotal ? " of " + signIn.newbieTotal : "")
    : "Claimed today · " + String(signIn.monthlyClaimed) + " / " + String(signIn.monthlyTotal) + " this month";
  const signInRow = row("calendar", "gift", "Sign-in gift", signInDetail, { badge: signIn.ready ? 1 : 0, tone: signIn.ready ? "ready" : undefined });
  let warpDetail = "No supply windows today";
  let warpTone: string | undefined;
  if (warp !== null) {
    const window = clockLabel(warp.startMinute) + "–" + clockLabel(warp.endMinute);
    if (warp.state === "open") {
      warpDetail = "+" + warp.warp + " Warp · open now until " + clockLabel(warp.endMinute);
      warpTone = "ready";
    } else if (warp.state === "upcoming") {
      warpDetail = "+" + warp.warp + " Warp · " + window + " · in " + durationLabel(warp.startMinute - today.minuteOfDay);
    } else {
      // Every window of today has passed: the first one tomorrow.
      warpDetail = "+" + warp.warp + " Warp · tomorrow " + window;
    }
  }
  const warpRow = row("gifts", "zap", "Free Warp supply", warpDetail, { badge: warp?.state === "open" ? 1 : 0, tone: warpTone });
  const mailRow = today.mail > 0 ? row("mail", "mail", "Mail", String(today.mail) + (today.mail === 1 ? " gift waiting" : " gifts waiting"), { badge: today.mail, tone: "ready" }) : "";

  return (
    '<header class="th-today-head"><p class="eyebrow">Today</p><span class="th-today-reset">' +
    iconSvg("clock") + "New day in " + escapeHtml(today.newDayIn) + "</span></header>" +
    streakCard +
    '<div class="th-rows">' + lessonRow + missionRow + signInRow + warpRow + mailRow + "</div>"
  );
}

function renderRoute(data: TitleHomeData): string {
  const counts = clearedPerGalaxy(data.clearedStages);
  const currentGalaxy = Math.floor((Math.max(1, data.highestStage) - 1) / STAGES_PER_GALAXY);
  return GALAXY_NAMES.map((name, index) => {
    const first = index * STAGES_PER_GALAXY + 1;
    const last = first + STAGES_PER_GALAXY - 1;
    const unlocked = data.highestStage >= first;
    const cleared = counts[index] ?? 0;
    const state = !unlocked ? "locked" : cleared >= STAGES_PER_GALAXY ? "cleared" : index === currentGalaxy ? "current" : "open";
    const tyrant = galaxyTyrant(index + 1);
    const art = paintedBossThumbUrl(tyrant.id);
    const worlds = WORLD_REGISTRY.slice(index * 5, index * 5 + 5).map((world) => world.name);
    const plate = "/assets/space-typing/backgrounds/" + GALAXY_KITS[index] + "/plate.1280.webp";
    const label = state === "locked"
      ? "Galaxy " + String(index + 1) + " " + name + ", locked until stage " + pad3(first)
      : "Galaxy " + String(index + 1) + " " + name + ", " + String(cleared) + " of 100 stages cleared";
    return (
      '<button type="button" class="th-galaxy" data-galaxy="' + String(index + 1) + '" data-state="' + state + '"' +
      ' style="--g-primary:' + tyrant.primary + ";--g-accent:" + tyrant.accent + '" aria-label="' + escapeHtml(label) + '">' +
      '<span class="th-galaxy-art"><img src="' + plate + '" alt="" loading="lazy" decoding="async"></span>' +
      (art ? '<img class="th-galaxy-boss" src="' + art + '" alt="" loading="lazy" decoding="async">' : "") +
      '<span class="th-galaxy-top"><span class="th-galaxy-no">G' + String(index + 1).padStart(2, "0") + "</span>" +
      (state === "current" ? '<span class="th-galaxy-here">You are here</span>' : state === "cleared" ? '<span class="th-galaxy-here is-cleared">' + iconSvg("check") + "Cleared</span>" : state === "locked" ? '<span class="th-galaxy-lock">' + iconSvg("lock") + "</span>" : "") +
      "</span>" +
      '<span class="th-galaxy-body"><strong>' + escapeHtml(name) + "</strong>" +
      "<small>Stages " + pad3(first) + "–" + pad3(last) + "</small>" +
      '<span class="th-galaxy-worlds">' + escapeHtml(state === "locked" ? "5 worlds · unlock at stage " + pad3(first) : worlds.join(" · ")) + "</span>" +
      '<span class="th-galaxy-bar"><i style="width:' + String(cleared) + '%"></i></span>' +
      '<em class="th-galaxy-tyrant">' + (state === "locked" ? "Tyrant · unknown" : "Tyrant · " + escapeHtml(tyrant.name) + ", " + escapeHtml(tyrant.title)) + "</em>" +
      "</span></button>"
    );
  }).join("");
}

function renderFleet(ships: readonly TitleHomeShip[]): string {
  return ships.map((ship) => {
    const state = ship.selected ? "selected" : ship.unlocked ? "owned" : "locked";
    return (
      '<button type="button" class="th-ship-card" data-ship="' + escapeHtml(ship.id) + '" data-state="' + state + '"' +
      ' aria-label="' + escapeHtml(ship.name + (ship.unlocked ? ", " + ship.role : ", unlocks at stage " + pad3(ship.unlockStage))) + '">' +
      '<span class="th-ship-card-art" style="background-position:' + atlasPosition(ship.id) + '"></span>' +
      '<span class="th-ship-card-text"><strong>' + escapeHtml(ship.name) + "</strong>" +
      "<small>" + escapeHtml(ship.unlocked ? ship.role : "Stage " + pad3(ship.unlockStage)) + "</small></span>" +
      (ship.selected ? '<span class="th-ship-card-tag">Flying</span>' : ship.unlocked ? '<span class="th-ship-card-tag is-level">Lv ' + String(ship.level) + "</span>" : '<span class="th-ship-card-lock">' + iconSvg("lock") + "</span>") +
      "</button>"
    );
  }).join("");
}

/** The 20 stages of the selected World: cleared, next, mini boss (10) and World boss (20). */
function renderWorldProgress(data: TitleHomeData): string {
  const stage = Math.max(1, Math.min(data.maxStage, data.selectedStage));
  const first = Math.floor((stage - 1) / 20) * 20 + 1;
  const cleared = new Set(data.clearedStages);
  return Array.from({ length: 20 }, (_, index) => {
    const value = first + index;
    const classes = [
      cleared.has(value) ? "is-cleared" : "",
      value === stage ? "is-current" : "",
      value % 20 === 0 ? "is-boss" : value % 10 === 0 ? "is-mini" : "",
      value > data.highestStage ? "is-locked" : "",
    ].filter(Boolean).join(" ");
    return '<i class="' + classes + '"></i>';
  }).join("");
}

/** The next boss from the selected stage: mini boss, World boss or the Galaxy Tyrant. */
export function nextBossLabel(selectedStage: number): string {
  const stage = Math.max(1, Math.floor(selectedStage));
  const next = Math.ceil(stage / 10) * 10;
  const away = next - stage;
  const when = away === 0 ? "this stage" : "in " + String(away) + (away === 1 ? " stage" : " stages");
  if (next % STAGES_PER_GALAXY === 0) {
    const tyrant = galaxyTyrant(next / STAGES_PER_GALAXY);
    return "Galaxy Tyrant " + tyrant.name + " · " + when;
  }
  return (next % 20 === 0 ? "World boss" : "Mini boss") + " · " + when;
}

export type TitleHome = {
  render(data: TitleHomeData): void;
  /** Scrolls the deck back to the top (e.g. when returning from a stage). */
  resetScroll(): void;
  /** The deck is on screen (title phase): the 3D showcase renders only then. */
  setActive(active: boolean): void;
};

export function installTitleHome(deps: TitleHomeDeps): TitleHome {
  const byId = (id: string): HTMLElement | null => document.getElementById(id);
  const scroller = byId("titleScroll");
  const overlay = byId("titleOverlay");
  const today = byId("titleToday");
  const route = byId("titleRoute");
  const fleet = byId("titleFleet");
  const showcase = byId("titleShowcase");
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const worldProgress = byId("titleWorldProgress");
  const bossChip = byId("titleCampaignBoss");
  let lastToday = "";
  let lastRoute = "";
  let lastFleet = "";
  let lastWorld = "";

  today?.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLElement>("[data-act]");
    const action = button?.dataset.act;
    if (action === undefined) return;
    if (action === "lessons") deps.openLessons();
    else if (action === "today" || action === "calendar" || action === "missions" || action === "gifts" || action === "mail") deps.openDaily(action);
  });
  route?.addEventListener("click", (event) => {
    const tile = (event.target as Element).closest<HTMLElement>(".th-galaxy");
    if (tile === null || tile.dataset.state === "locked") return;
    const galaxy = Number(tile.dataset.galaxy ?? "1");
    deps.openStageSelect((galaxy - 1) * STAGES_PER_GALAXY + 1);
  });
  fleet?.addEventListener("click", (event) => {
    if ((event.target as Element).closest(".th-ship-card") !== null) deps.openHangar();
  });
  byId("titleHeroHangarButton")?.addEventListener("click", () => deps.openHangar());
  byId("titleScrollCue")?.addEventListener("click", () => {
    byId("titleRouteSection")?.scrollIntoView({ behavior: reduced?.matches ? "auto" : "smooth", block: "start" });
  });

  // Scroll: the top bar turns to glass, the live background dims, sections rise in.
  if (scroller !== null && overlay !== null) {
    let ticking = false;
    const onScroll = (): void => {
      ticking = false;
      const top = scroller.scrollTop;
      overlay.style.setProperty("--th-scroll", Math.min(1, top / 520).toFixed(3));
      overlay.classList.toggle("th-scrolled", top > 12);
    };
    scroller.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(onScroll);
    }, { passive: true });
    if (typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("th-in");
          observer.unobserve(entry.target);
        }
      }, { root: scroller, threshold: 0.12 });
      for (const section of scroller.querySelectorAll(".th-section, .th-foot")) observer.observe(section);
    } else {
      for (const section of scroller.querySelectorAll(".th-section, .th-foot")) section.classList.add("th-in");
    }
  }

  const shipWrap = showcase?.querySelector<HTMLElement>(".th-ship-wrap") ?? null;
  const heroImage = byId("titleHeroShip");
  const ship3d: TitleShip3D | null =
    shipWrap !== null && heroImage instanceof HTMLImageElement ? installTitleShip3D(shipWrap, heroImage) : null;
  // Draconis, the guide, stands by the ship and greets every visit.
  const guide: TitleGuide | null = showcase !== null ? installTitleGuide(showcase) : null;

  // The ship leans toward the pointer (one rAF per move burst, transform only).
  const hero = scroller?.querySelector<HTMLElement>(".th-hero") ?? null;
  if (hero !== null && showcase !== null) {
    let frame = 0;
    let nx = 0;
    let ny = 0;
    hero.addEventListener("pointermove", (event) => {
      if (reduced?.matches === true) return;
      const rect = hero.getBoundingClientRect();
      nx = (event.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
      ny = (event.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
      ship3d?.setPointer(nx, ny);
      guide?.setPointer(nx, ny);
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        showcase.style.setProperty("--th-tx", nx.toFixed(3));
        showcase.style.setProperty("--th-ty", ny.toFixed(3));
      });
    }, { passive: true });
    hero.addEventListener("pointerleave", () => {
      showcase.style.setProperty("--th-tx", "0");
      showcase.style.setProperty("--th-ty", "0");
      ship3d?.setPointer(0, 0);
      guide?.setPointer(0, 0);
    });
  }

  function render(data: TitleHomeData): void {
    if (worldProgress !== null) {
      const html = renderWorldProgress(data);
      if (html !== lastWorld) {
        lastWorld = html;
        worldProgress.innerHTML = html;
      }
    }
    if (bossChip !== null) {
      bossChip.hidden = false;
      bossChip.textContent = nextBossLabel(data.selectedStage);
    }
    if (today !== null) {
      const html = renderToday(data.today);
      if (html !== lastToday) {
        lastToday = html;
        today.innerHTML = html;
      }
    }
    if (route !== null) {
      const html = renderRoute(data);
      if (html !== lastRoute) {
        lastRoute = html;
        route.innerHTML = html;
      }
      const meta = byId("titleRouteMeta");
      if (meta !== null) {
        meta.textContent = String(data.clearedStages.length) + " of " + String(data.maxStage) + " stages cleared · highest " + pad3(data.highestStage);
      }
    }
    if (fleet !== null) {
      const html = renderFleet(data.ships);
      if (html !== lastFleet) {
        lastFleet = html;
        fleet.innerHTML = html;
      }
      const meta = byId("titleFleetMeta");
      if (meta !== null) {
        const owned = data.ships.filter((ship) => ship.unlocked).length;
        const next = data.ships.filter((ship) => !ship.unlocked).sort((a, b) => a.unlockStage - b.unlockStage)[0];
        meta.textContent = String(owned) + " of " + String(data.ships.length) + " ships" +
          (next ? " · next: " + next.name + " at stage " + pad3(next.unlockStage) : " · full fleet");
      }
    }
    const current = data.ships.find((ship) => ship.selected);
    if (current !== undefined) ship3d?.show(current.id, data.quality);
    guide?.setQuality(data.quality);
    if (current !== undefined) {
      const name = byId("titleHeroShipName");
      if (name !== null) name.textContent = current.name;
      const role = byId("titleHeroShipRole");
      if (role !== null) role.textContent = current.role;
      const level = byId("titleHeroShipLevel");
      if (level !== null) level.textContent = "Lv " + String(current.level);
    }
  }

  return {
    render,
    resetScroll: () => {
      if (scroller !== null) scroller.scrollTop = 0;
    },
    setActive: (active) => {
      ship3d?.setActive(active);
      guide?.setActive(active);
    },
  };
}
