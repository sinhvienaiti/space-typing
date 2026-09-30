import {
  DuelRoom,
  createPracticeDuelRoom,
  defaultDuelRoomSettings,
  validateDuelRoomSettings,
  type DuelRoomMapSelection,
  type DuelRoomSettingsInput,
  type DuelRoomSnapshot,
} from "./room";
import type { DuelMapId } from "./maps";
import type { DuelBotPersonality } from "./bots";

export type DuelJoinRequest = {
  roomId: string;
  password: string;
  displayName: string;
};

export type DuelRoomUiHooks = {
  onJoinRequest?(request: DuelJoinRequest): void;
  onRoomReady?(snapshot: DuelRoomSnapshot): void;
};

const ALL_MAPS: readonly DuelMapId[] = [
  "frost-wastes",
  "inferno-rift",
  "tempest-prime",
  "ocean-abyss",
  "terra-core",
  "celestial-void",
];

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) {
    throw new Error("Missing Duel room UI element #" + id);
  }
  return found as T;
}

function selectValue(id: string): string {
  return el<HTMLSelectElement>(id).value;
}

function inputValue(id: string): string {
  return el<HTMLInputElement>(id).value;
}

function numberValue(id: string, fallback: number): number {
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
        : Number(selectValue("duelMatchLength")) === 300
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
        : selectValue("duelHazardLevel") === "high"
          ? "high"
          : "standard",
    mysteryFrequency: specialFrequency("duelMysteryFrequency"),
    fateFrequency: specialFrequency("duelFateFrequency"),
    botAllowed: selectValue("duelBotAllowed") === "true",
    seedMode: seedMode === "fixed" ? "fixed" : "random",
    fixedSeed:
      seedMode === "fixed"
        ? numberValue("duelFixedSeed", 1)
        : undefined,
    modifier: selectValue(
      "duelRuleModifier",
    ) as DuelRoomSettingsInput["modifier"],
  };
}

function specialFrequency(
  id: string,
): DuelRoomSettingsInput["mysteryFrequency"] {
  const value = selectValue(id);
  if (value === "off" || value === "low" || value === "high") {
    return value;
  }
  return "standard";
}

function setStatus(message: string, error = false): void {
  const node = el("duelRoomStatus");
  node.textContent = message;
  node.classList.toggle("error", error);
}

function roomCode(counter: number): string {
  return "LOCAL-" + String(counter).padStart(3, "0");
}

function renderSlot(
  root: HTMLElement,
  slot: DuelRoomSnapshot["slots"][number],
): void {
  root.replaceChildren();
  const title = document.createElement("strong");
  title.textContent =
    "Slot " +
    String(slot.slotIndex + 1) +
    " · " +
    (slot.kind === "empty" ? "Open" : slot.displayName);

  const meta = document.createElement("small");
  if (slot.kind === "bot" && slot.bot !== null) {
    meta.textContent =
      "Bot · " +
      String(slot.bot.wpm) +
      " WPM · " +
      String(Math.round(slot.bot.accuracy * 100)) +
      "% · " +
      slot.bot.personality;
  } else if (slot.kind === "human") {
    meta.textContent = slot.ready ? "Ready" : "Not ready";
  } else {
    meta.textContent = "Waiting for player";
  }
  root.append(title, meta);
}

export function installDuelRoomUi(
  hooks: DuelRoomUiHooks = {},
): {
  currentRoom(): DuelRoomSnapshot | null;
} {
  const dialog = el<HTMLDialogElement>("duelRoomDialog");
  const lobby = el("duelLobbyPanel");
  const createPanel = el("duelCreatePanel");
  const joinPanel = el("duelJoinPanel");
  const readyButton = el<HTMLButtonElement>("duelReadyButton");
  const addBotButton = el<HTMLButtonElement>("duelAddBotButton");
  const removeBotButton =
    el<HTMLButtonElement>("duelRemoveBotButton");

  let localCounter = 0;
  let room: DuelRoom | null = null;
  let hostReady = false;

  const renderRoom = (): void => {
    if (room === null) {
      lobby.classList.add("hidden");
      return;
    }
    const snapshot = room.snapshot();
    lobby.classList.remove("hidden");
    el("duelLobbyRoomCode").textContent = snapshot.roomId;
    el("duelLobbyRules").textContent =
      String(snapshot.settings.matchLengthSeconds / 60) +
      " min · Bo" +
      String(snapshot.settings.roundFormat) +
      " · " +
      snapshot.settings.mapSelection.mode +
      " map · " +
      snapshot.settings.modifier;
    renderSlot(el("duelSlotOne"), snapshot.slots[0]);
    renderSlot(el("duelSlotTwo"), snapshot.slots[1]);
    readyButton.textContent = hostReady ? "Unready" : "Ready";
    addBotButton.disabled =
      !snapshot.settings.botAllowed ||
      snapshot.slots[1].kind === "human";
    removeBotButton.disabled =
      snapshot.slots[1].kind !== "bot";
    el("duelRoomReadyMeta").textContent = snapshot.canStart
      ? "Room ready · both slots are prepared."
      : "Both occupied slots must be ready.";
    if (snapshot.canStart) {
      hooks.onRoomReady?.(snapshot);
    }
  };

  const syncConditionalFields = (): void => {
    const privateRoom = selectValue("duelVisibility") === "private";
    el<HTMLInputElement>("duelPassword").disabled = !privateRoom;
    const fixedMap = selectValue("duelMapMode") === "fixed";
    el<HTMLSelectElement>("duelMap").disabled = !fixedMap;
    const fixedSeed = selectValue("duelSeedMode") === "fixed";
    el<HTMLInputElement>("duelFixedSeed").disabled = !fixedSeed;
  };

  const showPanel = (mode: "create" | "join"): void => {
    createPanel.classList.toggle("hidden", mode !== "create");
    joinPanel.classList.toggle("hidden", mode !== "join");
    el<HTMLButtonElement>("duelCreateTab").classList.toggle(
      "primary",
      mode === "create",
    );
    el<HTMLButtonElement>("duelJoinTab").classList.toggle(
      "primary",
      mode === "join",
    );
  };

  el("duelModeButton").addEventListener("click", () => {
    syncConditionalFields();
    renderRoom();
    if (!dialog.open) dialog.showModal();
  });
  el("duelCreateTab").addEventListener("click", () => {
    showPanel("create");
  });
  el("duelJoinTab").addEventListener("click", () => {
    showPanel("join");
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

  el("duelCreateRoomButton").addEventListener("click", () => {
    const settings = duelRoomSettingsFromUi();
    const validation = validateDuelRoomSettings(settings);
    if (!validation.ok) {
      setStatus(validation.errors.join(" "), true);
      return;
    }
    localCounter += 1;
    try {
      room = new DuelRoom({
        roomId: roomCode(localCounter),
        ownerParticipantId: "local-player",
        ownerDisplayName:
          inputValue("duelDisplayName").trim() || "Pilot",
        settings: validation.settings,
      });
      hostReady = false;
      setStatus(
        "Local lobby created. Online authority is added in the Friend Room service milestone.",
      );
      renderRoom();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not create room.",
        true,
      );
    }
  });

  el("duelPracticeButton").addEventListener("click", () => {
    localCounter += 1;
    const personality = selectValue(
      "duelBotPersonality",
    ) as DuelBotPersonality;
    room = createPracticeDuelRoom({
      roomId: roomCode(localCounter),
      participantId: "local-player",
      displayName:
        inputValue("duelDisplayName").trim() || "Pilot",
      mapId: selectValue("duelMap") as DuelMapId,
      bot: {
        wpm: numberValue("duelBotWpm", 55),
        accuracy: numberValue("duelBotAccuracy", 94) / 100,
        reactionMs: numberValue("duelBotReaction", 320),
        personality,
      },
    });
    hostReady = true;
    setStatus("Practice room ready.");
    renderRoom();
  });

  readyButton.addEventListener("click", () => {
    if (room === null) return;
    hostReady = !hostReady;
    room.setReady("local-player", hostReady);
    renderRoom();
  });

  addBotButton.addEventListener("click", () => {
    if (room === null) return;
    const added = room.setBot({
      requesterId: "local-player",
      config: {
        wpm: numberValue("duelBotWpm", 55),
        accuracy: numberValue("duelBotAccuracy", 94) / 100,
        reactionMs: numberValue("duelBotReaction", 320),
        personality: selectValue(
          "duelBotPersonality",
        ) as DuelBotPersonality,
      },
    });
    if (!added) {
      setStatus("Bot cannot occupy the second slot.", true);
    }
    renderRoom();
  });

  removeBotButton.addEventListener("click", () => {
    room?.removeSecondSlot("local-player");
    renderRoom();
  });

  el("duelJoinRoomButton").addEventListener("click", () => {
    const request: DuelJoinRequest = {
      roomId: inputValue("duelJoinCode").trim(),
      password: inputValue("duelJoinPassword"),
      displayName:
        inputValue("duelDisplayName").trim() || "Pilot",
    };
    if (request.roomId.length < 4) {
      setStatus("Enter a valid room code.", true);
      return;
    }
    if (hooks.onJoinRequest === undefined) {
      setStatus(
        "Friend Room authority is not connected in this local build yet.",
      );
      return;
    }
    hooks.onJoinRequest(request);
  });

  showPanel("create");
  syncConditionalFields();

  return {
    currentRoom: () => room?.snapshot() ?? null,
  };
}
