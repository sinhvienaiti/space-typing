import type { DuelClientRoomSnapshot } from "./authority";
import type { AlternativeMatchView } from "./alternative-presentation";
import type { AlternativeModeId } from "./alternative-modes";

export type AlternativeRoomStartState = {
  canStart: boolean;
  reason: string;
};

export type AlternativeMatchUiState = {
  title: string;
  score: string;
  hull: string;
  challenge: string;
  projectiles: string;
  terminal: boolean;
  inputEnabled: boolean;
  inputPlaceholder: string;
};

export type AlternativeDuelRoomUiController = {
  setRoom(room: DuelClientRoomSnapshot | null): void;
  setMatch(view: AlternativeMatchView | null, serverSequence?: number): void;
  setInputResult(result: {
    sequence: number;
    accepted: boolean;
    reason: string;
  }): void;
  destroy(): void;
};

export type AlternativeDuelRoomUiConfig = {
  onStart(mode: AlternativeModeId): void;
  onPracticeStart(mode: AlternativeModeId): void;
  onInput(value: string): boolean;
};

export function alternativeRoomStartState(
  room: DuelClientRoomSnapshot | null,
): AlternativeRoomStartState {
  if (room === null) {
    return { canStart: false, reason: "Join or create a Friend Room first." };
  }
  if (!room.isOwner) {
    return { canStart: false, reason: "Only the room owner can start Alternative Duel." };
  }
  const humanCount = room.slots.filter((slot) => slot.kind === "human").length;
  if (humanCount !== 2) {
    return { canStart: false, reason: "Alternative Friend requires two human pilots." };
  }
  if (!room.canStart) {
    return { canStart: false, reason: "Both pilots must be ready before launch." };
  }
  return { canStart: true, reason: "Authoritative Friend runtime ready." };
}

export function alternativeMatchUiState(
  view: AlternativeMatchView,
): AlternativeMatchUiState {
  const terminal = view.status !== "active";
  const challenge = view.challenge.kind === "reflex"
    ? `Round ${view.challenge.round} · TYPE ${view.challenge.prompt.toUpperCase()}`
    : view.challenge.chain.length === 0
      ? `Word Chain · ${view.challenge.nextTurn === "self" ? "Your turn" : "Opponent turn"}`
      : `Chain ${view.challenge.chain.join(" → ")} · ${view.challenge.nextTurn === "self" ? "Your turn" : "Opponent turn"}`;
  const projectiles = view.projectiles.length === 0
    ? "Impact clock clear"
    : view.projectiles
        .map((projectile) =>
          `${projectile.direction === "outgoing" ? "OUT" : "IN"} ${projectile.damage} · ${projectile.remainingMs}ms`,
        )
        .join(" · ");
  const winner = view.winner === "self"
    ? " · VICTORY"
    : view.winner === "opponent"
      ? " · DEFEAT"
      : view.status === "draw"
        ? " · DRAW"
        : "";
  return {
    title: `${view.mode === "reflex" ? "Reflex" : "Word Chain"} · ${view.matchType.toUpperCase()}${winner}`,
    score: `Score ${view.self.score} — ${view.opponent.score}`,
    hull: `Hull ${view.self.hull} — ${view.opponent.hull}`,
    challenge,
    projectiles,
    terminal,
    inputEnabled:
      !terminal &&
      (view.challenge.kind === "reflex" || view.challenge.nextTurn === "self"),
    inputPlaceholder: view.mode === "reflex" ? "Type the reflex prompt" : "Enter next chain word",
  };
}

function inertController(): AlternativeDuelRoomUiController {
  return {
    setRoom() {},
    setMatch() {},
    setInputResult() {},
    destroy() {},
  };
}

export function installAlternativeDuelRoomUi(
  config: AlternativeDuelRoomUiConfig,
): AlternativeDuelRoomUiController {
  const lobby = document.querySelector<HTMLElement>("#duelLobbyPanel");
  if (lobby === null) return inertController();

  const root = document.createElement("section");
  root.id = "duelAlternativeModes";
  root.className = "holo-panel duel-alternative-panel";
  root.setAttribute("aria-label", "Alternative Duel modes");
  root.innerHTML = `
    <div class="holo-section-header">
      <div>
        <strong>Alternative Duel</strong>
        <div data-alt-capability></div>
      </div>
      <div data-alt-start-actions>
        <button type="button" data-alt-start="reflex">Friend Reflex</button>
        <button type="button" data-alt-start="word-chain">Friend Word Chain</button>
        <button type="button" data-alt-practice-start="reflex">Practice Reflex</button>
        <button type="button" data-alt-practice-start="word-chain">Practice Word Chain</button>
      </div>
    </div>
    <div data-alt-ranked-note>Ranked: disabled · separate rating policy required</div>
    <div data-alt-match hidden>
      <strong data-alt-title></strong>
      <div data-alt-score></div>
      <div data-alt-hull></div>
      <div data-alt-challenge></div>
      <div data-alt-projectiles></div>
      <form data-alt-form>
        <input data-alt-input autocomplete="off" spellcheck="false" />
        <button type="submit" data-alt-submit>Transmit</button>
      </form>
      <div data-alt-result aria-live="polite"></div>
    </div>
  `;
  lobby.appendChild(root);

  const capability = root.querySelector<HTMLElement>("[data-alt-capability]")!;
  const startButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-alt-start]")];
  const practiceButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-alt-practice-start]")];
  const matchPanel = root.querySelector<HTMLElement>("[data-alt-match]")!;
  const title = root.querySelector<HTMLElement>("[data-alt-title]")!;
  const score = root.querySelector<HTMLElement>("[data-alt-score]")!;
  const hull = root.querySelector<HTMLElement>("[data-alt-hull]")!;
  const challenge = root.querySelector<HTMLElement>("[data-alt-challenge]")!;
  const projectiles = root.querySelector<HTMLElement>("[data-alt-projectiles]")!;
  const form = root.querySelector<HTMLFormElement>("[data-alt-form]")!;
  const input = root.querySelector<HTMLInputElement>("[data-alt-input]")!;
  const submit = root.querySelector<HTMLButtonElement>("[data-alt-submit]")!;
  const result = root.querySelector<HTMLElement>("[data-alt-result]")!;

  let room: DuelClientRoomSnapshot | null = null;
  let match: AlternativeMatchView | null = null;
  let serverSequence = -1;

  const render = (): void => {
    const startState = alternativeRoomStartState(room);
    const active = match?.status === "active";
    capability.textContent = `Friend: ${startState.reason} · Practice: local/offline`;
    for (const button of startButtons) {
      button.disabled = !startState.canStart || active;
    }
    for (const button of practiceButtons) {
      button.disabled = active;
    }

    matchPanel.hidden = match === null;
    if (match === null) return;
    const state = alternativeMatchUiState(match);
    title.textContent = match.matchType === "practice"
      ? `${state.title} · local`
      : `${state.title} · server #${String(serverSequence)}`;
    score.textContent = state.score;
    hull.textContent = state.hull;
    challenge.textContent = state.challenge;
    projectiles.textContent = state.projectiles;
    input.placeholder = state.inputPlaceholder;
    input.disabled = !state.inputEnabled;
    submit.disabled = !state.inputEnabled;
    if (state.terminal) input.value = "";
  };

  for (const button of startButtons) {
    button.addEventListener("click", () => {
      const mode = button.dataset.altStart;
      if (mode === "reflex" || mode === "word-chain") config.onStart(mode);
    });
  }
  for (const button of practiceButtons) {
    button.addEventListener("click", () => {
      const mode = button.dataset.altPracticeStart;
      if (mode === "reflex" || mode === "word-chain") config.onPracticeStart(mode);
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (value === "" || input.disabled) return;
    if (config.onInput(value)) {
      result.textContent = match?.matchType === "practice"
        ? "Input applied · local practice"
        : "Input sent · awaiting authority";
      input.value = "";
    } else {
      result.textContent = match?.matchType === "practice"
        ? "Input not applied · practice inactive"
        : "Input not sent · Duel connection unavailable";
    }
  });

  render();
  return {
    setRoom(nextRoom) {
      room = nextRoom;
      if (nextRoom === null && match?.matchType !== "practice") {
        match = null;
        serverSequence = -1;
        result.textContent = "";
      }
      render();
    },
    setMatch(nextMatch, nextServerSequence = -1) {
      match = nextMatch;
      serverSequence = nextServerSequence;
      result.textContent = nextMatch === null
        ? ""
        : nextMatch.matchType === "practice"
          ? "Local practice state synchronized"
          : "Authoritative state synchronized";
      render();
    },
    setInputResult(nextResult) {
      result.textContent = nextResult.accepted
        ? `#${String(nextResult.sequence)} accepted`
        : `#${String(nextResult.sequence)} rejected · ${nextResult.reason}`;
    },
    destroy() {
      root.remove();
    },
  };
}
