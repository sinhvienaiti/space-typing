import type {
  DuelClientRoomSnapshot,
} from "./authority";
import type { DuelBotPersonality } from "./bots";
import type { DuelMapId } from "./maps";
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
  onStartMatchRequest?(roomId: string): void;
  onLeaveRoomRequest?(roomId: string): void;
  onQueueRankedRequest?(): void;
  onLeaveRankedQueueRequest?(): void;
  onLocalPracticeReady?(snapshot: DuelRoomSnapshot): void;
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

  const title = document.createElement("strong");
  title.textContent =
    "Slot " +
    String(slot.slotIndex + 1) +
    " · " +
    (slot.kind === "empty"
      ? "Open"
      : slot.displayName) +
    (self ? " · YOU" : "");

  const meta = document.createElement("small");
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
  } else if (slot.kind === "human") {
    meta.textContent = slot.ready
      ? "Ready"
      : "Not ready";
  } else {
    meta.textContent = "Waiting for player";
  }

  root.append(title, meta);
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
    if (snapshot === null) {
      lobby.classList.add("hidden");
      return;
    }

    const newlyVisible = lobby.classList.contains("hidden");
    lobby.classList.remove("hidden");
    el("duelLobbyRoomCode").textContent =
      snapshot.roomId;
    el("duelLobbyRules").textContent =
      String(
        snapshot.settings.matchLengthSeconds /
          60,
      ) +
      " min · Bo" +
      String(snapshot.settings.roundFormat) +
      " · " +
      snapshot.settings.mapSelection.mode +
      " map · " +
      snapshot.settings.modifier;

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
  };

  const showPanel = (
    mode: "create" | "join",
  ): void => {
    createPanel.classList.toggle(
      "hidden",
      mode !== "create",
    );
    joinPanel.classList.toggle(
      "hidden",
      mode !== "join",
    );
    el<HTMLButtonElement>(
      "duelCreateTab",
    ).classList.toggle(
      "primary",
      mode === "create",
    );
    el<HTMLButtonElement>(
      "duelJoinTab",
    ).classList.toggle(
      "primary",
      mode === "join",
    );
  };

  el("duelModeButton").addEventListener(
    "click",
    () => {
      syncConditionalFields();
      renderRoom();
      hooks.onOpen?.();
      if (!dialog.open) dialog.showModal();
    },
  );

  el("duelCreateTab").addEventListener(
    "click",
    () => {
      showPanel("create");
    },
  );

  el("duelJoinTab").addEventListener(
    "click",
    () => {
      showPanel("join");
    },
  );

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

  showPanel("create");
  syncConditionalFields();

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
