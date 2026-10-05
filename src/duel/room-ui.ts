import { DUEL_MAP_BACKDROPS } from "./map-backdrop";
import type {
  DuelClientRoomSnapshot,
} from "./authority";
import type { DuelBotPersonality } from "./bots";
import type { DuelMapId } from "./maps";
import type { DuelNetworkStatus } from "./network-client";
import type { DuelRoomListing } from "./protocol";
import type { DuelGameMode } from "./game-mode";
import { iconSvg } from "../ui/icons";
import { shipArtUrl } from "../ui/title-hub";
import {
  DuelRoom,
  createPracticeDuelRoom,
  validateDuelRoomSettings,
  type DuelRoomBotConfig,
  type DuelRoomMapSelection,
  type DuelRoomSettingsInput,
  type DuelRoomSnapshot,
} from "./room";

export type DuelJoinRequest = {
  roomId: string;
  password: string;
  displayName: string;
};

export type DuelCreateRequest = {
  settings: DuelRoomSettingsInput;
  displayName: string;
};

export type DuelRoomUiHooks = {
  onOpen?(): void;
  onCreateRequest?(request: DuelCreateRequest): void;
  onJoinRequest?(request: DuelJoinRequest): void;
  onReadyRequest?(roomId: string, ready: boolean): void;
  onBotRequest?(roomId: string, bot: DuelRoomBotConfig): void;
  onRemoveBotRequest?(roomId: string): void;
  onStartMatchRequest?(roomId: string, gameMode: DuelGameMode): void;
  onLeaveRoomRequest?(roomId: string): void;
  onQueueRankedRequest?(): void;
  onLeaveRankedQueueRequest?(): void;
  onLocalPracticeReady?(snapshot: DuelRoomSnapshot): void;
  /** Start (true) or stop (false) the public waiting-room list. */
  onRoomListWatch?(watch: boolean): void;
  /** The hull this player flies, for the pilot card. */
  selfShipId?(): string;
  /** "Change ship" on the pilot card. */
  onChangeShip?(): void;
};

export type DuelRoomUiController = {
  currentLocalRoom(): DuelRoomSnapshot | null;
  currentRemoteRoom(): DuelClientRoomSnapshot | null;
  setRemoteRoom(snapshot: DuelClientRoomSnapshot): void;
  clearRemoteRoom(reason?: string): void;
  setStatus(message: string, error?: boolean): void;
  setConnectionLabel(label: string): void;
  setRankedQueueStatus(input: {
    status: "idle" | "queued";
    matchmakingRating?: number;
  }): void;
  setRankedProfile(input: {
    typingRating: number;
    duelRating: number;
    matchmakingRating: number;
  }): void;
  setRankedMatchFound(matchId: string): void;
  /** Replace the waiting-room list (full list each time). */
  setRoomList(rooms: readonly DuelRoomListing[]): void;
  /** Connection state: the list is only live while connected. */
  setConnectionState(status: DuelNetworkStatus): void;
  /** Re-read the pilot's ship (after Change ship). */
  refreshSelf(): void;
};

type RenderRoom =
  | DuelRoomSnapshot
  | DuelClientRoomSnapshot;

const ALL_MAPS: readonly DuelMapId[] = [
  "frost-wastes",
  "inferno-rift",
  "tempest-prime",
  "ocean-abyss",
  "terra-core",
  "celestial-void",
];

const MAP_ART = DUEL_MAP_BACKDROPS;

function mapLabel(selection: DuelRoomMapSelection): string {
  if (selection.mode === "fixed") return MAP_ART[selection.mapId].name;
  return selection.mode === "vote" ? "Map vote" : "Random map";
}

function mapThumbUrl(mapId: DuelMapId): string {
  return "/assets/space-typing/backgrounds/" + MAP_ART[mapId].kit + "/plate-c.1280.webp";
}

const MODIFIER_LABEL: Readonly<Record<string, string>> = {
  standard: "Standard",
  "high-hazard": "High hazard",
  "mystery-storm": "Mystery storm",
  "weapon-frenzy": "Weapon frenzy",
  "support-rich": "Support rich",
  "sudden-death": "Sudden death",
  "cataclysm-rush": "Cataclysm rush",
};

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) {
    throw new Error(
      "Missing Duel room UI element #" + id,
    );
  }
  return found as T;
}

function selectValue(id: string): string {
  return el<HTMLSelectElement>(id).value;
}

function inputValue(id: string): string {
  return el<HTMLInputElement>(id).value;
}

function gameModeFromUi(): DuelGameMode {
  const value = selectValue("duelGameMode");
  return value === "reflex" || value === "word-chain" ? value : "standard";
}

function numberValue(
  id: string,
  fallback: number,
): number {
  const parsed = Number(inputValue(id));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapSelectionFromUi(): DuelRoomMapSelection {
  const mode = selectValue("duelMapMode");
  const mapId = selectValue("duelMap") as DuelMapId;
  if (mode === "fixed") {
    return { mode: "fixed", mapId };
  }
  return {
    mode: mode === "vote" ? "vote" : "random",
    pool: [...ALL_MAPS],
  };
}

function specialFrequency(
  id: string,
): DuelRoomSettingsInput["mysteryFrequency"] {
  const value = selectValue(id);
  if (
    value === "off" ||
    value === "low" ||
    value === "high"
  ) {
    return value;
  }
  return "standard";
}

function botConfigFromUi(): DuelRoomBotConfig {
  return {
    wpm: numberValue("duelBotWpm", 55),
    accuracy:
      numberValue("duelBotAccuracy", 94) / 100,
    reactionMs: numberValue(
      "duelBotReaction",
      320,
    ),
    personality: selectValue(
      "duelBotPersonality",
    ) as DuelBotPersonality,
  };
}

export function duelRoomSettingsFromUi(): DuelRoomSettingsInput {
  const seedMode = selectValue("duelSeedMode");
  return {
    roomName: inputValue("duelRoomName"),
    visibility:
      selectValue("duelVisibility") === "public"
        ? "public"
        : "private",
    password: inputValue("duelPassword"),
    matchLengthSeconds:
      Number(selectValue("duelMatchLength")) === 180
        ? 180
        : Number(selectValue("duelMatchLength")) ===
            300
          ? 300
          : 240,
    roundFormat:
      Number(selectValue("duelRounds")) === 1
        ? 1
        : Number(selectValue("duelRounds")) === 5
          ? 5
          : 3,
    mapSelection: mapSelectionFromUi(),
    hazardLevel:
      selectValue("duelHazardLevel") === "low"
        ? "low"
        : selectValue("duelHazardLevel") ===
            "high"
          ? "high"
          : "standard",
    mysteryFrequency: specialFrequency(
      "duelMysteryFrequency",
    ),
    fateFrequency: specialFrequency(
      "duelFateFrequency",
    ),
    botAllowed:
      selectValue("duelBotAllowed") === "true",
    seedMode:
      seedMode === "fixed" ? "fixed" : "random",
    fixedSeed:
      seedMode === "fixed"
        ? numberValue("duelFixedSeed", 1)
        : undefined,
    modifier: selectValue(
      "duelRuleModifier",
    ) as DuelRoomSettingsInput["modifier"],
  };
}

function roomCode(counter: number): string {
  return (
    "LOCAL-" +
    String(counter).padStart(3, "0")
  );
}

function renderSlot(
  root: HTMLElement,
  slot: RenderRoom["slots"][number],
  self: boolean,
): void {
  root.replaceChildren();
  root.dataset.kind = slot.kind;
  root.dataset.self = String(self);

  if (self) {
    const badge = document.createElement("span");
    badge.className = "duel-slot-badge";
    badge.textContent = "YOU";
    root.append(badge);
  }

  const shipId = slot.characterId ?? slot.shipId;
  if (slot.kind !== "empty" && shipId !== null) {
    const ship = document.createElement("img");
    ship.className = "duel-slot-ship";
    ship.alt = "";
    ship.src = shipArtUrl(shipId);
    root.append(ship);
  } else {
    const empty = document.createElement("span");
    empty.className = "duel-slot-empty-icon";
    empty.innerHTML = iconSvg(slot.kind === "bot" ? "bot" : "users");
    root.append(empty);
  }

  const title = document.createElement("strong");
  title.textContent =
    slot.kind === "empty" ? "Open slot" : slot.displayName;

  const meta = document.createElement("small");
  const state = document.createElement("span");
  state.className = "duel-slot-state";
  if (
    slot.kind === "bot" &&
    slot.bot !== null
  ) {
    meta.textContent =
      "Bot · " +
      String(slot.bot.wpm) +
      " WPM · " +
      String(
        Math.round(slot.bot.accuracy * 100),
      ) +
      "% · " +
      slot.bot.personality;
    state.textContent = "Bot ready";
    state.dataset.ready = "true";
  } else if (slot.kind === "human") {
    meta.textContent = "Slot " + String(slot.slotIndex + 1);
    state.textContent = slot.ready
      ? "Ready"
      : "Not ready";
    state.dataset.ready = String(slot.ready);
  } else {
    meta.textContent = "Waiting for a pilot";
    state.textContent = "Open";
  }

  root.append(title, meta, state);
}

export function installDuelRoomUi(
  hooks: DuelRoomUiHooks = {},
): DuelRoomUiController {
  const dialog =
    el<HTMLDialogElement>("duelRoomDialog");
  const lobby = el("duelLobbyPanel");
  const createPanel = el("duelCreatePanel");
  const joinPanel = el("duelJoinPanel");
  const readyButton =
    el<HTMLButtonElement>("duelReadyButton");
  const addBotButton =
    el<HTMLButtonElement>("duelAddBotButton");
  const removeBotButton =
    el<HTMLButtonElement>(
      "duelRemoveBotButton",
    );
  const startButton =
    el<HTMLButtonElement>("duelStartMatchButton");
  const leaveButton =
    el<HTMLButtonElement>("duelLeaveRoomButton");
  const rankedQueueButton =
    el<HTMLButtonElement>("duelRankedQueueButton");
  const rankedLeaveButton =
    el<HTMLButtonElement>("duelRankedLeaveButton");

  let localCounter = 0;
  let localRoom: DuelRoom | null = null;
  let remoteRoom: DuelClientRoomSnapshot | null =
    null;
  let localReady = false;
  let rankedQueued = false;
  const browser = el("duelRoomBrowser");
  let roomListings: DuelRoomListing[] = [];
  let connection: DuelNetworkStatus = "idle";
  let roomFilter: "all" | "open" | "unlocked" = "all";
  let roomSearch = "";
  let watching = false;

  const setWatching = (watch: boolean): void => {
    if (watch === watching) return;
    watching = watch;
    hooks.onRoomListWatch?.(watch);
  };

  /**
   * Turns a <select> into a row of segmented buttons. The select stays in
   * the DOM (duelRoomSettingsFromUi reads it) and receives "change" events.
   */
  const enhanceSegmented = (id: string): void => {
    const select = el<HTMLSelectElement>(id);
    if (select.dataset.enhanced === "true") return;
    select.dataset.enhanced = "true";
    select.classList.add("holo-native-hidden");
    select.tabIndex = -1;
    const group = document.createElement("div");
    group.className = "holo-seg";
    group.setAttribute("role", "group");
    const buttons = [...select.options].map((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = option.textContent;
      button.addEventListener("click", () => {
        if (select.value === option.value) return;
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      group.append(button);
      return { button, value: option.value };
    });
    const sync = (): void => {
      for (const { button, value } of buttons) {
        const on = select.value === value;
        button.classList.toggle("on", on);
        button.setAttribute("aria-pressed", String(on));
        button.disabled = select.disabled;
      }
    };
    select.addEventListener("change", sync);
    select.after(group);
    sync();
  };

  /** Map thumbnails in place of the #duelMap select. */
  let syncMapPicker = (): void => undefined;
  const enhanceMapPicker = (): void => {
    const select = el<HTMLSelectElement>("duelMap");
    if (select.dataset.enhanced === "true") return;
    select.dataset.enhanced = "true";
    select.classList.add("holo-native-hidden");
    select.tabIndex = -1;
    const grid = document.createElement("div");
    grid.className = "holo-map-grid";
    const cards = [...select.options].map((option) => {
      const mapId = option.value as DuelMapId;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "holo-map";
      card.setAttribute("aria-label", MAP_ART[mapId]?.name ?? option.text);
      const image = document.createElement("img");
      image.alt = "";
      image.loading = "lazy";
      image.src = mapThumbUrl(mapId);
      const label = document.createElement("span");
      label.textContent = MAP_ART[mapId]?.name ?? option.text;
      card.append(image, label);
      card.addEventListener("click", () => {
        select.value = mapId;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      grid.append(card);
      return { card, value: mapId };
    });
    syncMapPicker = (): void => {
      for (const { card, value } of cards) {
        const on = select.value === value;
        card.classList.toggle("on", on);
        card.setAttribute("aria-pressed", String(on));
      }
      grid.classList.toggle("is-disabled", select.disabled);
    };
    select.addEventListener("change", syncMapPicker);
    select.after(grid);
    syncMapPicker();
  };

  /** One-line summary of the Advanced settings. */
  const renderAdvancedSummary = (): void => {
    const option = (id: string): string => {
      const select = el<HTMLSelectElement>(id);
      return select.options[select.selectedIndex]?.text ?? select.value;
    };
    el("duelAdvancedSummary").textContent =
      "Hazards " +
      option("duelHazardLevel") +
      " · Mystery " +
      option("duelMysteryFrequency") +
      " · Fate " +
      option("duelFateFrequency") +
      " · Bots " +
      (selectValue("duelBotAllowed") === "true" ? "allowed" : "off") +
      " · " +
      option("duelRuleModifier");
  };
  for (const id of [
    "duelHazardLevel",
    "duelMysteryFrequency",
    "duelFateFrequency",
    "duelBotAllowed",
    "duelRuleModifier",
  ]) {
    el<HTMLSelectElement>(id).addEventListener("change", renderAdvancedSummary);
  }

  const joinListed = (listing: DuelRoomListing): void => {
    if (listing.hasPassword) {
      el<HTMLInputElement>("duelJoinCode").value = listing.roomId;
      const password = el<HTMLInputElement>("duelJoinPassword");
      password.value = "";
      password.focus();
      setStatus(
        "\u201c" + listing.roomName + "\u201d is private. Enter its password, then press Join.",
      );
      return;
    }
    if (hooks.onJoinRequest === undefined) {
      setStatus("Friend Room service is not configured.", true);
      return;
    }
    hooks.onJoinRequest({
      roomId: listing.roomId,
      password: "",
      displayName:
        inputValue("duelDisplayName").trim() || "Pilot",
    });
  };

  const renderRoomList = (): void => {
    const list = el("duelRoomList");
    const live = connection === "connected";
    const query = roomSearch.trim().toLowerCase();
    const visible = roomListings.filter((room) => {
      const joinable = room.status === "waiting" && room.playerCount < room.capacity;
      if (roomFilter === "open" && !joinable) return false;
      if (roomFilter === "unlocked" && room.hasPassword) return false;
      if (query === "") return true;
      return (
        room.roomName.toLowerCase().includes(query) ||
        room.hostDisplayName.toLowerCase().includes(query)
      );
    });
    const waiting = roomListings.filter((room) => room.status === "waiting").length;
    el("duelRoomListMeta").textContent = live
      ? String(waiting) + " waiting · " + String(roomListings.length - waiting) + " in match"
      : connection === "idle" || connection === "closed"
        ? "Offline · the list needs the Duel server"
        : "Connecting to the Duel server…";
    list.classList.toggle("is-stale", !live);

    list.replaceChildren(
      ...visible.map((room) => {
        const row = document.createElement("div");
        row.className = "holo-room";
        row.setAttribute("role", "listitem");
        row.dataset.status = room.status;
        const joinable = room.status === "waiting" && room.playerCount < room.capacity;
        const fixedMap =
          room.mapSelection.mode === "fixed" ? room.mapSelection.mapId : null;
        const mine = remoteRoom?.roomId === room.roomId;

        const thumb = document.createElement("div");
        thumb.className = "holo-room-thumb";
        if (fixedMap !== null) {
          const image = document.createElement("img");
          image.alt = "";
          image.loading = "lazy";
          image.src = mapThumbUrl(fixedMap);
          thumb.append(image);
        }
        const mapName = document.createElement("span");
        mapName.textContent = mapLabel(room.mapSelection);
        thumb.append(mapName);

        const name = document.createElement("div");
        name.className = "holo-room-name";
        const title = document.createElement("strong");
        if (room.hasPassword) title.dataset.icon = "lock";
        title.textContent = room.roomName;
        const rules = document.createElement("div");
        rules.className = "holo-room-rules";
        for (const text of [
          "Bo" + String(room.roundFormat),
          String(room.matchLengthSeconds / 60) + " min",
          "Hazards " + room.hazardLevel,
          MODIFIER_LABEL[room.modifier] ?? room.modifier,
        ]) {
          const chip = document.createElement("span");
          chip.textContent = text;
          rules.append(chip);
        }
        name.append(title, rules);

        const host = document.createElement("div");
        host.className = "holo-room-host";
        if (room.hostCharacterId !== null) {
          const ship = document.createElement("img");
          ship.alt = "";
          ship.loading = "lazy";
          ship.src = shipArtUrl(room.hostCharacterId);
          host.append(ship);
        }
        const hostText = document.createElement("span");
        const hostName = document.createElement("b");
        hostName.textContent = room.hostDisplayName;
        const hostMeta = document.createElement("small");
        hostMeta.textContent = room.hasBot ? "Host · bot in slot 2" : "Host";
        hostText.append(hostName, hostMeta);
        host.append(hostText);

        const slots = document.createElement("div");
        slots.className = "holo-room-slots";
        for (let index = 0; index < room.capacity; index += 1) {
          const dot = document.createElement("i");
          if (index < room.playerCount) dot.className = "full";
          slots.append(dot);
        }
        slots.append(
          String(room.playerCount) + "/" + String(room.capacity),
        );
        const state = document.createElement("em");
        state.textContent =
          room.status === "in-match" ? "in match" : joinable ? "waiting" : "full";
        slots.append(state);

        const action = document.createElement("button");
        action.type = "button";
        if (mine) {
          action.className = "holo-ghost";
          action.textContent = "Your room";
          action.disabled = true;
        } else if (joinable) {
          action.className = "primary holo-cta";
          action.dataset.icon = room.hasPassword ? "lock" : "door";
          action.textContent = "Join";
          action.disabled = !live;
          action.addEventListener("click", () => joinListed(room));
        } else {
          action.className = "holo-ghost";
          action.textContent = room.status === "in-match" ? "In match" : "Full";
          action.disabled = true;
        }
        row.append(thumb, name, host, slots, action);
        return row;
      }),
    );

    const empty = el("duelRoomListEmpty");
    empty.classList.toggle("hidden", visible.length > 0);
    el("duelRoomListEmptyTitle").textContent =
      roomListings.length > 0
        ? "No rooms match this filter"
        : live
          ? "No open rooms yet"
          : connection === "idle" || connection === "closed"
            ? "Duel server offline"
            : "Connecting…";
    el("duelRoomListEmptyText").textContent =
      live || roomListings.length > 0
        ? "Create a room for a friend, queue for Ranked, or practice against a bot."
        : "Practice vs bot works offline. Rooms and Ranked need the Duel server (pnpm duel:local).";
  };

  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-room-filter]")) {
    button.addEventListener("click", () => {
      const value = button.dataset.roomFilter;
      roomFilter = value === "open" || value === "unlocked" ? value : "all";
      for (const other of document.querySelectorAll<HTMLButtonElement>("[data-room-filter]")) {
        const on = other === button;
        other.classList.toggle("on", on);
        other.setAttribute("aria-pressed", String(on));
      }
      renderRoomList();
    });
  }
  el<HTMLInputElement>("duelRoomSearch").addEventListener("input", (event) => {
    roomSearch = (event.currentTarget as HTMLInputElement).value;
    renderRoomList();
  });
  el("duelRoomRefresh").addEventListener("click", () => {
    // Re-subscribing makes the server send the current list right away.
    if (watching) {
      hooks.onRoomListWatch?.(false);
      hooks.onRoomListWatch?.(true);
    } else {
      hooks.onOpen?.();
    }
  });

  const setStatus = (
    message: string,
    error = false,
  ): void => {
    const node = el("duelRoomStatus");
    node.textContent = message;
    node.classList.toggle("error", error);
  };

  const setConnectionLabel = (
    label: string,
  ): void => {
    el("duelConnectionStatus").textContent =
      label;
  };

  const activeRoom = (): RenderRoom | null =>
    remoteRoom ?? localRoom?.snapshot() ?? null;

  const isRemote = (): boolean =>
    remoteRoom !== null;

  const remoteSelfReady = (): boolean => {
    if (
      remoteRoom === null ||
      remoteRoom.selfSlotIndex === null
    ) {
      return false;
    }
    return (
      remoteRoom.slots[
        remoteRoom.selfSlotIndex
      ].ready
    );
  };

  const renderRoom = (): void => {
    const snapshot = activeRoom();
    // The waiting-room list shows while you are not in a room.
    browser.classList.toggle("hidden", snapshot !== null);
    setWatching(dialog.open && snapshot === null);
    if (snapshot === null) {
      lobby.classList.add("hidden");
      return;
    }

    const newlyVisible = lobby.classList.contains("hidden");
    lobby.classList.remove("hidden");
    el("duelLobbyRoomCode").textContent =
      snapshot.roomId;
    el("duelLobbyRules").textContent =
      "Bo" +
      String(snapshot.settings.roundFormat) +
      " · " +
      String(
        snapshot.settings.matchLengthSeconds /
          60,
      ) +
      " min · " +
      mapLabel(snapshot.settings.mapSelection) +
      " · " +
      (MODIFIER_LABEL[snapshot.settings.modifier] ?? snapshot.settings.modifier);

    const selfSlotIndex =
      remoteRoom?.selfSlotIndex ?? 0;
    renderSlot(
      el("duelSlotOne"),
      snapshot.slots[0],
      selfSlotIndex === 0,
    );
    renderSlot(
      el("duelSlotTwo"),
      snapshot.slots[1],
      selfSlotIndex === 1,
    );

    const ready = isRemote()
      ? remoteSelfReady()
      : localReady;
    readyButton.textContent = ready
      ? "Unready"
      : "Ready";
    readyButton.disabled =
      remoteRoom?.selfSlotIndex === null;

    const isOwner =
      remoteRoom?.isOwner ?? true;
    const gameModeSelect = el<HTMLSelectElement>("duelGameMode");
    gameModeSelect.disabled = !isRemote() || !isOwner;
    gameModeSelect.title = isRemote() && isOwner
      ? "Host chooses the gameplay mode when the match starts."
      : "Friend Room host chooses the gameplay mode. Offline Practice remains Standard.";
    addBotButton.disabled =
      !isOwner ||
      !snapshot.settings.botAllowed ||
      snapshot.slots[1].kind === "human";
    removeBotButton.disabled =
      !isOwner ||
      snapshot.slots[1].kind !== "bot";

    startButton.classList.remove("hidden");
    startButton.disabled =
      !isOwner || !snapshot.canStart;
    leaveButton.classList.remove("hidden");

    el("duelRoomReadyMeta").textContent =
      snapshot.canStart
        ? isRemote()
          ? isOwner
            ? "Room ready · host can start the match."
            : "Room ready · waiting for host to start."
          : "Practice room ready."
        : "Both occupied slots must be ready.";
    if (newlyVisible && dialog.open) lobby.scrollIntoView({ block: "nearest" });
  };

  const syncConditionalFields = (): void => {
    const privateRoom =
      selectValue("duelVisibility") ===
      "private";
    el<HTMLInputElement>(
      "duelPassword",
    ).disabled = !privateRoom;

    const fixedMap =
      selectValue("duelMapMode") === "fixed";
    el<HTMLSelectElement>(
      "duelMap",
    ).disabled = !fixedMap;

    const fixedSeed =
      selectValue("duelSeedMode") === "fixed";
    el<HTMLInputElement>(
      "duelFixedSeed",
    ).disabled = !fixedSeed;
    syncMapPicker();
  };

  const createScrim = el("duelCreateScrim");
  const openCreateSheet = (): void => {
    syncConditionalFields();
    createPanel.classList.remove("hidden");
    createScrim.classList.remove("hidden");
    el<HTMLInputElement>("duelRoomName").focus();
  };
  const closeCreateSheet = (): void => {
    createPanel.classList.add("hidden");
    createScrim.classList.add("hidden");
  };

  const refreshSelf = (): void => {
    const shipId = hooks.selfShipId?.();
    const image = el<HTMLImageElement>("duelSelfShip");
    if (shipId !== undefined) image.src = shipArtUrl(shipId);
  };

  el("duelModeButton").addEventListener(
    "click",
    () => {
      syncConditionalFields();
      refreshSelf();
      hooks.onOpen?.();
      if (!dialog.open) dialog.showModal();
      renderRoom();
    },
  );

  dialog.addEventListener("close", () => {
    closeCreateSheet();
    setWatching(false);
  });

  el("duelCreateTab").addEventListener("click", openCreateSheet);
  el("duelCreateClose").addEventListener("click", closeCreateSheet);
  el("duelCreateCancel").addEventListener("click", closeCreateSheet);
  createScrim.addEventListener("click", closeCreateSheet);
  createPanel.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    // Escape closes the sheet, not the whole lobby.
    event.preventDefault();
    event.stopPropagation();
    closeCreateSheet();
  });
  dialog.addEventListener("cancel", (event) => {
    if (createPanel.classList.contains("hidden")) return;
    event.preventDefault();
    closeCreateSheet();
  });

  el("duelJoinTab").addEventListener(
    "click",
    () => {
      el<HTMLInputElement>("duelJoinCode").focus();
    },
  );

  el("duelChangeShipButton").addEventListener("click", () => {
    hooks.onChangeShip?.();
  });

  for (const id of [
    "duelVisibility",
    "duelMapMode",
    "duelSeedMode",
  ]) {
    el<HTMLSelectElement>(id).addEventListener(
      "change",
      syncConditionalFields,
    );
  }

  el("duelCreateRoomButton").addEventListener(
    "click",
    () => {
      const settings =
        duelRoomSettingsFromUi();
      const validation =
        validateDuelRoomSettings(settings);
      if (!validation.ok) {
        setStatus(
          validation.errors.join(" "),
          true,
        );
        return;
      }

      closeCreateSheet();
      if (hooks.onCreateRequest !== undefined) {
        hooks.onCreateRequest({
          settings: validation.settings,
          displayName:
            inputValue(
              "duelDisplayName",
            ).trim() || "Pilot",
        });
        return;
      }

      localCounter += 1;
      localRoom = new DuelRoom({
        roomId: roomCode(localCounter),
        ownerParticipantId: "local-player",
        ownerDisplayName:
          inputValue(
            "duelDisplayName",
          ).trim() || "Pilot",
        settings: validation.settings,
      });
      remoteRoom = null;
      localReady = false;
      setStatus("Local lobby created.");
      renderRoom();
    },
  );

  el("duelPracticeButton").addEventListener(
    "click",
    () => {
      if (remoteRoom !== null) {
        setStatus("Leave the Friend Room before starting local practice.", true);
        return;
      }
      if (rankedQueued) {
        setStatus("Leave the Ranked queue before starting local practice.", true);
        return;
      }
      localCounter += 1;
      localRoom = createPracticeDuelRoom({
        roomId: roomCode(localCounter),
        participantId: "local-player",
        displayName:
          inputValue(
            "duelDisplayName",
          ).trim() || "Pilot",
        mapId: selectValue(
          "duelMap",
        ) as DuelMapId,
        // Honour the lobby: Random/Vote map mode, rounds, length, hazards…
        settings: duelRoomSettingsFromUi(),
        bot: botConfigFromUi(),
      });
      remoteRoom = null;
      localReady = true;
      setStatus("Practice room ready.");
      renderRoom();
      hooks.onLocalPracticeReady?.(
        localRoom.snapshot(),
      );
    },
  );

  readyButton.addEventListener(
    "click",
    () => {
      if (remoteRoom !== null) {
        hooks.onReadyRequest?.(
          remoteRoom.roomId,
          !remoteSelfReady(),
        );
        return;
      }
      if (localRoom === null) return;
      localReady = !localReady;
      localRoom.setReady(
        "local-player",
        localReady,
      );
      renderRoom();
    },
  );

  addBotButton.addEventListener(
    "click",
    () => {
      if (remoteRoom !== null) {
        hooks.onBotRequest?.(
          remoteRoom.roomId,
          botConfigFromUi(),
        );
        return;
      }
      if (localRoom === null) return;
      const added = localRoom.setBot({
        requesterId: "local-player",
        config: botConfigFromUi(),
      });
      if (!added) {
        setStatus(
          "Bot cannot occupy the second slot.",
          true,
        );
      }
      renderRoom();
    },
  );

  removeBotButton.addEventListener(
    "click",
    () => {
      if (remoteRoom !== null) {
        hooks.onRemoveBotRequest?.(
          remoteRoom.roomId,
        );
        return;
      }
      localRoom?.removeSecondSlot(
        "local-player",
      );
      renderRoom();
    },
  );

  startButton.addEventListener(
    "click",
    () => {
      if (remoteRoom === null) {
        const snapshot = localRoom?.snapshot();
        if (snapshot?.canStart) hooks.onLocalPracticeReady?.(snapshot);
        return;
      }
      hooks.onStartMatchRequest?.(
        remoteRoom.roomId,
        gameModeFromUi(),
      );
    },
  );

  leaveButton.addEventListener(
    "click",
    () => {
      if (remoteRoom === null) {
        localRoom = null;
        localReady = false;
        renderRoom();
        setStatus("Left local practice. You can create/join a Friend Room or enter Ranked.");
        return;
      }
      hooks.onLeaveRoomRequest?.(
        remoteRoom.roomId,
      );
    },
  );

  rankedQueueButton.addEventListener(
    "click",
    () => {
      if (activeRoom() !== null) {
        setStatus(
          "Leave the current room before entering Ranked.",
          true,
        );
        return;
      }
      hooks.onQueueRankedRequest?.();
    },
  );

  rankedLeaveButton.addEventListener(
    "click",
    () => {
      hooks.onLeaveRankedQueueRequest?.();
    },
  );

  el("duelJoinRoomButton").addEventListener(
    "click",
    () => {
      const request: DuelJoinRequest = {
        roomId:
          inputValue(
            "duelJoinCode",
          ).trim(),
        password: inputValue(
          "duelJoinPassword",
        ),
        displayName:
          inputValue(
            "duelDisplayName",
          ).trim() || "Pilot",
      };
      if (request.roomId.length < 4) {
        setStatus(
          "Enter a valid room code.",
          true,
        );
        return;
      }
      if (
        hooks.onJoinRequest === undefined
      ) {
        setStatus(
          "Friend Room service is not configured.",
          true,
        );
        return;
      }
      hooks.onJoinRequest(request);
    },
  );

  enhanceSegmented("duelVisibility");
  enhanceSegmented("duelRounds");
  enhanceSegmented("duelMatchLength");
  enhanceSegmented("duelMapMode");
  enhanceMapPicker();
  syncConditionalFields();
  renderAdvancedSummary();
  renderRoomList();

  return {
    currentLocalRoom: () =>
      localRoom?.snapshot() ?? null,
    currentRemoteRoom: () =>
      remoteRoom,
    setRemoteRoom(snapshot) {
      remoteRoom = snapshot;
      localRoom = null;
      renderRoom();
    },
    clearRemoteRoom(reason) {
      remoteRoom = null;
      renderRoom();
      if (reason !== undefined) {
        setStatus(reason);
      }
    },
    setStatus,
    setConnectionLabel,
    setRankedQueueStatus(input) {
      const queued = input.status === "queued";
      rankedQueued = queued;
      rankedQueueButton.classList.toggle(
        "hidden",
        queued,
      );
      rankedLeaveButton.classList.toggle(
        "hidden",
        !queued,
      );
      el("duelRankedStatus").textContent = queued
        ? "Queued" +
          (input.matchmakingRating === undefined
            ? ""
            : " · MMR " +
              String(input.matchmakingRating))
        : "Not queued · normalized combat profile";
    },
    setRankedProfile(input) {
      el("duelRankedProfile").textContent =
        "Typing " +
        String(Math.round(input.typingRating)) +
        " · Duel " +
        String(Math.round(input.duelRating)) +
        " · Matchmaking " +
        String(Math.round(input.matchmakingRating));
    },
    setRoomList(rooms) {
      roomListings = [...rooms];
      renderRoomList();
    },
    setConnectionState(status) {
      connection = status;
      el("duelConnectionStatus").dataset.state =
        status === "connected"
          ? "online"
          : status === "connecting" || status === "authenticating" || status === "reconnecting"
            ? "connecting"
            : "offline";
      renderRoomList();
    },
    refreshSelf,
    setRankedMatchFound(matchId) {
      rankedQueued = false;
      rankedQueueButton.classList.remove("hidden");
      rankedLeaveButton.classList.add("hidden");
      el("duelRankedStatus").textContent =
        "Match found · " + matchId;
      setStatus("Ranked match found. Loading Duel battlefield.");
      if (dialog.open) dialog.close();
    },
  };
}
