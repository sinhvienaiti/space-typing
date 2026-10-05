import type { DuelAlternativeModePlayerView } from "./alternative-mode-view";
import type { DuelClientMatchView } from "./authority";
import type { DuelPlayerId } from "./model";

export type DuelAlternativeBattleUiHooks = {
  sendModeInput(payload: unknown): number | null;
};

export type DuelAlternativeBattleUiController = {
  setMatchView(view: DuelClientMatchView | null): void;
  setModeState(view: DuelAlternativeModePlayerView | null): void;
  clear(): void;
  destroy(): void;
};

export type DuelAlternativeBattlePresentation = Readonly<{
  mode: "reflex" | "word-chain";
  kicker: string;
  title: string;
  instruction: string;
  buffer: string;
  accepted: boolean;
  meta: readonly string[];
  choices: readonly string[];
  deadlineAtMs: number | null;
}>;

function opponentOf(playerId: DuelPlayerId): DuelPlayerId {
  return playerId === "player-1" ? "player-2" : "player-1";
}

export function alternativeBattlePresentation(
  view: DuelAlternativeModePlayerView,
  playerId: DuelPlayerId,
): DuelAlternativeBattlePresentation {
  if (view.gameMode === "reflex") {
    const challenge = view.challenge;
    return {
      mode: "reflex",
      kicker: "REFLEX DUEL",
      title: challenge?.prompt ?? "Waiting for the next challenge…",
      instruction: "Type one full answer. Backspace edits · Esc clears.",
      buffer: view.player.buffer,
      accepted: view.player.completed,
      meta: [
        "Typing misses " + String(view.player.physicalTypingMistakes),
        "Meaning misses " + String(view.player.semanticMistakes),
        "Retries " + String(view.player.retries),
      ],
      choices: challenge?.candidates.map((candidate) => candidate.token) ?? [],
      deadlineAtMs: challenge?.deadlineAtMs ?? null,
    };
  }

  const beat = view.beat;
  const rivalId = opponentOf(playerId);
  const requiredInitial = beat?.requiredInitial[playerId] ?? "?";
  const rivalWord = beat?.acceptedWord[rivalId];
  return {
    mode: "word-chain",
    kicker: "WORD CHAIN",
    title: "Start with “" + requiredInitial.toUpperCase() + "”",
    instruction: "Type a valid word · Enter or Space submits · Backspace edits · Esc clears.",
    buffer: view.player.buffer,
    accepted: view.player.accepted,
    meta: [
      "Legal moves " + String(beat?.legalMoveCount[playerId] ?? 0),
      "Chain resets " + String(beat?.resetCount ?? 0),
      rivalWord == null ? "Rival thinking…" : "Rival: " + rivalWord,
    ],
    choices: [],
    deadlineAtMs: beat?.deadlineAtMs ?? null,
  };
}

function createNode<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  return node;
}

export function installDuelAlternativeBattleUi(
  hooks: DuelAlternativeBattleUiHooks,
): DuelAlternativeBattleUiController {
  const battle = document.getElementById("duelBattle");
  if (battle === null) {
    throw new Error("Alternative Duel UI requires #duelBattle.");
  }
  const arena = battle.querySelector<HTMLElement>(".duel-arena");
  if (arena === null) {
    throw new Error("Alternative Duel UI requires .duel-arena.");
  }

  const root = createNode("section", "duel-alternative-mode hidden");
  root.setAttribute("aria-live", "polite");
  root.setAttribute("aria-label", "Alternative Duel challenge");

  const head = createNode("header", "duel-alternative-head");
  const kicker = createNode("span", "duel-alternative-kicker");
  const clock = createNode("strong", "duel-alternative-clock");
  head.append(kicker, clock);

  const prompt = createNode("h2", "duel-alternative-prompt");
  const choices = createNode("div", "duel-alternative-choices");
  const input = createNode("div", "duel-alternative-input");
  const instruction = createNode("small", "duel-alternative-instruction");
  const meta = createNode("div", "duel-alternative-meta");
  root.append(head, prompt, choices, input, instruction, meta);
  arena.append(root);

  let matchView: DuelClientMatchView | null = null;
  let modeView: DuelAlternativeModePlayerView | null = null;
  let timer: number | null = null;
  let lastPresentationKey = "";

  const renderClock = (): void => {
    if (modeView === null || matchView === null) {
      clock.textContent = "";
      return;
    }
    const presentation = alternativeBattlePresentation(
      modeView,
      matchView.self.playerId,
    );
    if (presentation.deadlineAtMs === null) {
      clock.textContent = "";
      return;
    }
    const remainingMs = Math.max(0, presentation.deadlineAtMs - Date.now());
    clock.textContent = (remainingMs / 1000).toFixed(1) + "s";
    root.dataset.urgent = remainingMs <= 3000 ? "true" : "false";
  };

  const stopTimer = (): void => {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  };

  const ensureTimer = (): void => {
    if (timer !== null) return;
    timer = window.setInterval(renderClock, 100);
  };

  const render = (): void => {
    const compatible =
      matchView !== null &&
      modeView !== null &&
      matchView.gameMode === modeView.gameMode &&
      matchView.round.status === "active";
    if (!compatible || matchView === null || modeView === null) {
      root.classList.add("hidden");
      delete battle.dataset.alternativeMode;
      stopTimer();
      return;
    }

    const presentation = alternativeBattlePresentation(
      modeView,
      matchView.self.playerId,
    );
    battle.dataset.alternativeMode = presentation.mode;
    root.dataset.mode = presentation.mode;
    root.dataset.accepted = String(presentation.accepted);
    root.classList.remove("hidden");

    const key = JSON.stringify([
      presentation.mode,
      presentation.kicker,
      presentation.title,
      presentation.instruction,
      presentation.buffer,
      presentation.accepted,
      presentation.meta,
      presentation.choices,
    ]);
    if (key !== lastPresentationKey) {
      lastPresentationKey = key;
      kicker.textContent = presentation.kicker;
      prompt.textContent = presentation.title;
      instruction.textContent = presentation.instruction;
      input.textContent = presentation.buffer === ""
        ? "_"
        : presentation.buffer + (presentation.accepted ? " ✓" : "_");

      choices.replaceChildren();
      for (const token of presentation.choices) {
        const chip = createNode("span", "duel-alternative-choice");
        chip.textContent = token;
        chip.dataset.match = token.startsWith(presentation.buffer) ? "true" : "false";
        choices.append(chip);
      }

      meta.replaceChildren();
      for (const value of presentation.meta) {
        const chip = createNode("span");
        chip.textContent = value;
        meta.append(chip);
      }
    }
    renderClock();
    ensureTimer();
  };

  const send = (payload: unknown): void => {
    if (
      modeView === null ||
      matchView === null ||
      matchView.round.status !== "active" ||
      matchView.gameMode !== modeView.gameMode
    ) {
      return;
    }
    hooks.sendModeInput(payload);
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (modeView === null || matchView === null || root.classList.contains("hidden")) {
      return;
    }
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      event.isComposing ||
      event.repeat
    ) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      send({ type: "CLEAR" });
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      event.stopPropagation();
      send({ type: "BACKSPACE" });
      return;
    }
    if (
      modeView.gameMode === "word-chain" &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      event.stopPropagation();
      send({ type: "SUBMIT" });
      return;
    }
    if (!/^[a-zA-Z]$/.test(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    send({ type: "TYPE_CHAR", char: event.key.toLocaleLowerCase("en-US") });
  };

  document.addEventListener("keydown", handleKeyDown, true);

  const controller: DuelAlternativeBattleUiController = {
    setMatchView(view) {
      matchView = view;
      if (view?.gameMode === "standard") modeView = null;
      render();
    },
    setModeState(view) {
      modeView = view;
      render();
    },
    clear() {
      matchView = null;
      modeView = null;
      lastPresentationKey = "";
      render();
    },
    destroy() {
      stopTimer();
      document.removeEventListener("keydown", handleKeyDown, true);
      root.remove();
    },
  };

  return controller;
}
