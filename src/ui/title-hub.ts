import type { GameSettings } from "../types";

/**
 * Title hub controls (Holo Command layout in index.html #titleOverlay):
 * pilot card, status strip, quick tools (records, Duel lobby, music,
 * sound levels, voice, settings), the Shops menu and the Recall card.
 * All game actions still go through the original buttons and settings.
 */
export type TitleHubPilot = {
  shipId: string;
  shipName: string;
  level: number;
  credits: number;
  selectedStage: number;
  highestStage: number;
  maxStage: number;
  shipsUnlocked: number;
  shipsTotal: number;
  clearedStages: number;
};

export type TitleHubDeps = {
  getSettings(): GameSettings;
  /** Replace settings, apply them to the game and persist. */
  applySettings(next: GameSettings): void;
  getPilot(): TitleHubPilot;
  openSettings(): void;
  openDuel(): void;
  startRecall(): void;
};

type VolumeField =
  | "masterVolume"
  | "musicVolume"
  | "sfxVolume"
  | "creditVolume"
  | "pronunciationVolume"
  | "announcerVolume";

const QUICK_SLIDERS: ReadonlyArray<{
  field: VolumeField;
  input: string;
  fallback: number;
}> = [
  { field: "masterVolume", input: "quickMasterVolume", fallback: 1 },
  { field: "musicVolume", input: "quickMusicVolume", fallback: 0.26 },
  { field: "sfxVolume", input: "quickSfxVolume", fallback: 0.5 },
  { field: "creditVolume", input: "quickCreditVolume", fallback: 1 },
  { field: "pronunciationVolume", input: "quickVoiceVolume", fallback: 1 },
  { field: "announcerVolume", input: "quickAnnouncerVolume", fallback: 1 },
];

/** Galaxy background kits, one per 100 stages (public/assets/.../backgrounds). */
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

const RESTORE_KEY = "spaceTypingQuickRestoreV1";

export function galaxyPlateUrl(stage: number): string {
  const index = Math.min(
    GALAXY_KITS.length - 1,
    Math.max(0, Math.ceil(Math.max(1, stage) / 100) - 1),
  );
  return "/assets/space-typing/backgrounds/" + GALAXY_KITS[index] + "/plate-c.1280.webp";
}

export function shipArtUrl(shipId: string): string {
  return "/assets/space-typing/ships/3d/" + shipId + "/color.webp";
}

/** Time until the next UTC midnight (Daily Expedition reset) as HH:MM. */
export function dailyResetLabel(now = Date.now()): string {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  const minutes = Math.max(0, Math.ceil((next.getTime() - now) / 60_000));
  const hours = Math.floor(minutes / 60);
  return String(hours).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
}

function stageLabel(stage: number): string {
  return String(Math.max(1, Math.floor(stage))).padStart(3, "0");
}

function readRestore(): Partial<Record<VolumeField, number>> {
  try {
    const raw = localStorage.getItem(RESTORE_KEY);
    const parsed: unknown = raw === null ? null : JSON.parse(raw);
    return parsed !== null && typeof parsed === "object"
      ? (parsed as Partial<Record<VolumeField, number>>)
      : {};
  } catch {
    return {};
  }
}

function writeRestore(value: Partial<Record<VolumeField, number>>): void {
  try {
    localStorage.setItem(RESTORE_KEY, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the toggle still works for this session.
  }
}

export type TitleHub = {
  /** Refresh pilot card, strip, records and tool states. */
  render(): void;
  /** Close any open popover (e.g. when a match starts). */
  closePopovers(): void;
};

export function installTitleHub(deps: TitleHubDeps): TitleHub {
  const byId = <T extends HTMLElement = HTMLElement>(id: string): T | null =>
    document.getElementById(id) as T | null;

  const popovers: Array<{ button: HTMLElement; panel: HTMLElement }> = [];
  const restore = readRestore();

  function closePopovers(except?: HTMLElement): void {
    for (const { button, panel } of popovers) {
      if (panel === except) continue;
      panel.classList.add("hidden");
      button.setAttribute("aria-expanded", "false");
    }
  }

  function bindPopover(buttonId: string, panelId: string, onOpen?: () => void): void {
    const button = byId(buttonId);
    const panel = byId(panelId);
    if (button === null || panel === null) return;
    popovers.push({ button, panel });
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = panel.classList.contains("hidden");
      closePopovers(panel);
      panel.classList.toggle("hidden", !open);
      button.setAttribute("aria-expanded", String(open));
      if (open) onOpen?.();
    });
    panel.addEventListener("click", (event) => event.stopPropagation());
  }

  document.addEventListener("click", () => closePopovers());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePopovers();
  });

  function setVolume(field: VolumeField, value: number): void {
    const settings = deps.getSettings();
    deps.applySettings({ ...settings, [field]: value });
    renderTools();
  }

  function toggleVolume(field: VolumeField, fallback: number): void {
    const current = deps.getSettings()[field] ?? fallback;
    if (current > 0) {
      restore[field] = current;
      writeRestore(restore);
      setVolume(field, 0);
    } else {
      const back = restore[field];
      setVolume(field, typeof back === "number" && back > 0 ? back : fallback);
    }
  }

  // Quick sound sliders.
  for (const { field, input, fallback } of QUICK_SLIDERS) {
    const slider = byId<HTMLInputElement>(input);
    slider?.addEventListener("input", () => {
      setVolume(field, Number(slider.value));
    });
    const mute = document.querySelector<HTMLButtonElement>(
      '#titleSoundPopover [data-mute="' + field + '"]',
    );
    mute?.addEventListener("click", (event) => {
      event.preventDefault();
      toggleVolume(field, fallback);
    });
  }

  bindPopover("titleSoundButton", "titleSoundPopover", renderTools);
  bindPopover("titleRecordsButton", "titleRecordsPopover", renderRecords);
  bindPopover("titleShopsButton", "titleShopsMenu");

  byId("titleMusicButton")?.addEventListener("click", () =>
    toggleVolume("musicVolume", 0.26),
  );
  byId("titleVoiceButton")?.addEventListener("click", () => {
    const settings = deps.getSettings();
    deps.applySettings({
      ...settings,
      pronunciationEnabled: !settings.pronunciationEnabled,
    });
    renderTools();
  });
  byId("titleOnlineButton")?.addEventListener("click", deps.openDuel);
  byId("titleAllSettingsButton")?.addEventListener("click", () => {
    closePopovers();
    deps.openSettings();
  });
  byId("titleRecallStartButton")?.addEventListener("click", deps.startRecall);
  // Secondary card buttons (every mode card: one main action, two below).
  byId("titleRecallWordsButton")?.addEventListener("click", () => byId("vocabularyButton")?.click());
  byId("titleRecallSettingsButton")?.addEventListener("click", () => {
    deps.openSettings();
    // Scroll to the Recall section once the dialog has opened.
    window.requestAnimationFrame(() =>
      byId("recallDifficulty")?.closest(".settings-section")?.scrollIntoView({ block: "start", behavior: "smooth" }),
    );
  });
  byId("titleDuelPracticeButton")?.addEventListener("click", () => {
    deps.openDuel();
    window.setTimeout(() => byId("duelPracticeButton")?.click(), 60);
  });
  byId("titleDuelJoinButton")?.addEventListener("click", () => {
    deps.openDuel();
    window.setTimeout(() => byId<HTMLInputElement>("duelJoinCode")?.focus(), 60);
  });
  // A shop button opening its dialog closes the menu.
  byId("titleShopsMenu")?.addEventListener("click", (event) => {
    if ((event.target as Element).closest("button") !== null) closePopovers();
  });

  // Recall follows the Continue button's availability (save/vocabulary load).
  const start = byId<HTMLButtonElement>("startButton");
  const recallStart = byId<HTMLButtonElement>("titleRecallStartButton");
  if (start !== null && recallStart !== null) {
    const sync = (): void => {
      recallStart.disabled = start.disabled;
    };
    sync();
    new MutationObserver(sync).observe(start, {
      attributes: true,
      attributeFilter: ["disabled"],
    });
  }

  // Dot on Shops while a special shop (merchant, black market…) is open.
  const shopsButton = byId("titleShopsButton");
  const specialShops = [
    "travelingShopButton",
    "blackMarketButton",
    "hiddenShopButton",
    "eventShopButton",
  ]
    .map((id) => byId(id))
    .filter((element): element is HTMLElement => element !== null);
  const syncShopNews = (): void => {
    shopsButton?.classList.toggle(
      "has-news",
      specialShops.some((element) => !element.classList.contains("hidden")),
    );
  };
  syncShopNews();
  for (const element of specialShops) {
    new MutationObserver(syncShopNews).observe(element, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  function renderTools(): void {
    const settings = deps.getSettings();
    for (const { field, input, fallback } of QUICK_SLIDERS) {
      const value = settings[field] ?? fallback;
      const slider = byId<HTMLInputElement>(input);
      if (slider !== null && document.activeElement !== slider) {
        slider.value = String(value);
      }
      const output = byId<HTMLOutputElement>(input + "Value");
      if (output !== null) output.value = String(Math.round(value * 100)) + "%";
      document
        .querySelector('#titleSoundPopover [data-mute="' + field + '"]')
        ?.classList.toggle("is-off", value <= 0);
    }
    const musicOn = settings.musicVolume > 0;
    const music = byId("titleMusicButton");
    music?.classList.toggle("is-off", !musicOn);
    music?.setAttribute("aria-pressed", String(musicOn));
    byId("titleSoundButton")?.classList.toggle(
      "is-off",
      (settings.masterVolume ?? 1) <= 0 || settings.sfxVolume <= 0,
    );
    const voice = byId("titleVoiceButton");
    voice?.classList.toggle("is-off", !settings.pronunciationEnabled);
    voice?.setAttribute("aria-pressed", String(settings.pronunciationEnabled));
  }

  function renderRecords(): void {
    const list = byId("titleRecordsList");
    if (list === null) return;
    const pilot = deps.getPilot();
    const rows: Array<[string, string]> = [
      ["Highest stage", stageLabel(pilot.highestStage) + " / " + String(pilot.maxStage)],
      ["Stages cleared", pilot.clearedStages.toLocaleString()],
      ["Ships unlocked", String(pilot.shipsUnlocked) + " / " + String(pilot.shipsTotal)],
      [pilot.shipName + " level", String(pilot.level)],
      ["Credits", pilot.credits.toLocaleString()],
    ];
    list.replaceChildren(
      ...rows.flatMap(([label, value]) => {
        const dt = document.createElement("dt");
        dt.textContent = label;
        const dd = document.createElement("dd");
        dd.textContent = value;
        return [dt, dd];
      }),
    );
  }

  let lastShip = "";
  let lastPlate = "";

  function render(): void {
    const pilot = deps.getPilot();
    const name = byId("titlePilotName");
    if (name !== null) name.textContent = pilot.shipName;
    const level = byId("titlePilotLevel");
    if (level !== null) level.textContent = "Lv " + String(pilot.level);
    const credits = byId("titlePilotCredits");
    if (credits !== null) credits.textContent = pilot.credits.toLocaleString();
    const progress = byId("titlePilotProgress");
    if (progress !== null) {
      progress.textContent =
        "Stage " + stageLabel(pilot.highestStage) + " / " + String(pilot.maxStage);
    }
    const bar = byId("titlePilotBar");
    if (bar !== null) {
      bar.style.width =
        String(Math.max(1, Math.min(100, (pilot.highestStage / pilot.maxStage) * 100))) + "%";
    }
    if (pilot.shipId !== lastShip) {
      lastShip = pilot.shipId;
      const url = shipArtUrl(pilot.shipId);
      for (const id of ["titlePilotShip", "titleCampaignShip"]) {
        const image = byId<HTMLImageElement>(id);
        if (image !== null) image.src = url;
      }
    }
    const plate = galaxyPlateUrl(pilot.selectedStage);
    if (plate !== lastPlate) {
      lastPlate = plate;
      const image = byId<HTMLImageElement>("titleCampaignPlate");
      if (image !== null) image.src = plate;
    }
    const best = byId("titleBestStage");
    if (best !== null) best.textContent = stageLabel(pilot.highestStage);
    const ships = byId("titleShipCount");
    if (ships !== null) {
      ships.textContent = String(pilot.shipsUnlocked) + " / " + String(pilot.shipsTotal);
    }
    const reset = byId("titleDailyReset");
    if (reset !== null) reset.textContent = dailyResetLabel();
    renderTools();
  }

  // Keep the Daily countdown current while the hub is on screen.
  window.setInterval(() => {
    const overlay = byId("titleOverlay");
    if (overlay === null || overlay.classList.contains("hidden")) return;
    const reset = byId("titleDailyReset");
    if (reset !== null) reset.textContent = dailyResetLabel();
  }, 30_000);

  return { render, closePopovers: () => closePopovers() };
}
