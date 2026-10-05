import fs from "node:fs";

function edit(path, replacements) {
  let source = fs.readFileSync(path, "utf8");
  for (const [before, after, label] of replacements) {
    const first = source.indexOf(before);
    if (first < 0) throw new Error(`${path}: missing ${label}`);
    if (source.indexOf(before, first + before.length) >= 0) {
      throw new Error(`${path}: duplicate ${label}`);
    }
    source = source.replace(before, after);
  }
  fs.writeFileSync(path, source);
}

edit("src/duel/battle-ui.ts", [
  [
`    // Between rounds (K.O. and result) the authority ignores input anyway.
    if (view.round.status !== "active") return;

    // No manual item hotkeys: completion itself activates the effect.`,
`    // Between rounds (K.O. and result) the authority ignores input anyway.
    if (view.round.status !== "active") return;

    // Reflex and Word Chain own their keyboard contract. The separate
    // alternative overlay feeds MODE_INPUT; never leak those keys into the
    // Standard target/action intent path.
    if (view.gameMode !== "standard") return;

    // No manual item hotkeys: completion itself activates the effect.`,
    "alternative keyboard gate",
  ],
  [
`    setData(nodes.root, "mode", view.mode);
    setData(nodes.root, "quality", quality);`,
`    setData(nodes.root, "mode", view.mode);
    setData(nodes.root, "gameMode", view.gameMode);
    setData(nodes.root, "quality", quality);`,
    "battle game mode dataset",
  ],
  [
`    setText(nodes.mode,
      view.mode === "ranked"
        ? "RANKED · NORMALIZED"
        : view.mode === "practice"
          ? "PRACTICE VS BOT"
          : "FRIEND DUEL");`,
`    setText(nodes.mode,
      view.gameMode === "reflex"
        ? "REFLEX DUEL"
        : view.gameMode === "word-chain"
          ? "WORD CHAIN"
          : view.mode === "ranked"
            ? "RANKED · NORMALIZED"
            : view.mode === "practice"
              ? "PRACTICE VS BOT"
              : "FRIEND DUEL");`,
    "battle mode label",
  ],
]);

edit("src/duel/online-room-controller.ts", [
  [
`import type { DuelRoomListing } from "./protocol";`,
`import type { DuelRoomListing } from "./protocol";
import type { DuelAlternativeModePlayerView } from "./alternative-mode-view";
import type { DuelGameMode } from "./game-mode";`,
    "alternative controller imports",
  ],
  [
`  onPrediction?(prediction: DuelLocalPrediction): void;
  onLocalPracticeReady?(snapshot: DuelRoomSnapshot): void;`,
`  onPrediction?(prediction: DuelLocalPrediction): void;
  onAlternativeModeState?(view: DuelAlternativeModePlayerView | null): void;
  onLocalPracticeReady?(snapshot: DuelRoomSnapshot): void;`,
    "alternative controller callback type",
  ],
  [
`      onPrediction(prediction) {
        config.onPrediction?.(prediction);
      },
      onError(code, message) {`,
`      onPrediction(prediction) {
        config.onPrediction?.(prediction);
      },
      onAlternativeModeState(view) {
        config.onAlternativeModeState?.(view);
      },
      onError(code, message) {`,
    "alternative controller callback forwarding",
  ],
  [
`    onStartMatchRequest(roomId) {
      runOnline(() => {
        client.startMatch(roomId);
      });
    },`,
`    onStartMatchRequest(roomId, gameMode: DuelGameMode) {
      runOnline(() => {
        client.startMatch(roomId, gameMode);
      });
    },`,
    "game mode start forwarding",
  ],
]);

edit("src/duel/room-ui.ts", [
  [
`import type { DuelRoomListing } from "./protocol";`,
`import type { DuelRoomListing } from "./protocol";
import type { DuelGameMode } from "./game-mode";`,
    "room UI game mode import",
  ],
  [
`  onStartMatchRequest?(roomId: string): void;`,
`  onStartMatchRequest?(roomId: string, gameMode: DuelGameMode): void;`,
    "room UI start hook",
  ],
  [
`function inputValue(id: string): string {
  return el<HTMLInputElement>(id).value;
}
`,
`function inputValue(id: string): string {
  return el<HTMLInputElement>(id).value;
}

function gameModeFromUi(): DuelGameMode {
  const value = selectValue("duelGameMode");
  return value === "reflex" || value === "word-chain" ? value : "standard";
}
`,
    "room UI game mode helper",
  ],
  [
`    const isOwner =
      remoteRoom?.isOwner ?? true;
    addBotButton.disabled =`,
`    const isOwner =
      remoteRoom?.isOwner ?? true;
    const gameModeSelect = el<HTMLSelectElement>("duelGameMode");
    gameModeSelect.disabled = !isRemote() || !isOwner;
    gameModeSelect.title = isRemote() && isOwner
      ? "Host chooses the gameplay mode when the match starts."
      : "Friend Room host chooses the gameplay mode. Offline Practice remains Standard.";
    addBotButton.disabled =`,
    "room UI game mode ownership",
  ],
  [
`      hooks.onStartMatchRequest?.(
        remoteRoom.roomId,
      );`,
`      hooks.onStartMatchRequest?.(
        remoteRoom.roomId,
        gameModeFromUi(),
      );`,
    "room UI start mode",
  ],
]);

edit("index.html", [[
`            <div class="duel-lobby-actions">
              <button id="duelReadyButton" type="button" class="holo-ghost" data-icon="check">Ready</button>`,
`            <div class="duel-lobby-mode">
              <label for="duelGameMode">Gameplay</label>
              <select id="duelGameMode" aria-label="Friend Duel gameplay mode">
                <option value="standard" selected>Standard Combat</option>
                <option value="reflex">Reflex Challenge</option>
                <option value="word-chain">Word Chain</option>
              </select>
              <small>Host choice · Ranked and offline Practice stay Standard.</small>
            </div>
            <div class="duel-lobby-actions">
              <button id="duelReadyButton" type="button" class="holo-ghost" data-icon="check">Ready</button>`,
  "lobby game mode selector",
]]);

edit("src/main.ts", [
  [
`import { installDuelBattleUi } from "./duel/battle-ui";`,
`import { installDuelBattleUi } from "./duel/battle-ui";
import { installDuelAlternativeBattleUi } from "./duel/alternative-battle-ui";`,
    "main alternative battle import",
  ],
  [
`import "./duel/battle-holo.css";`,
`import "./duel/battle-holo.css";
import "./duel/alternative-battle.css";`,
    "main alternative battle styles",
  ],
  [
`const duelBattle = installDuelBattleUi(
  {`,
`const duelBattle = installDuelBattleUi(
  {`,
    "main duel battle anchor",
  ],
  [
`// Opening the Duel lobby starts loading the 3D hull, so the fight never waits on it.
// (after the dialog has painted).`,
`const duelAlternativeBattle = installDuelAlternativeBattleUi({
  sendModeInput(payload) {
    return duelOnlineController?.client.sendModeInput(payload) ?? null;
  },
});

// Opening the Duel lobby starts loading the 3D hull, so the fight never waits on it.
// (after the dialog has painted).`,
    "main alternative battle install",
  ],
  [
`      stopLocalDuel();
      lastDuelAudioPresentationKey = null;`,
`      stopLocalDuel();
      duelAlternativeBattle.clear();
      lastDuelAudioPresentationKey = null;`,
    "main alternative battle exit cleanup",
  ],
  [
`  const initial = localDuelMatch.initial();
  duelBattle.setQuality(settings.visualQuality);
  duelBattle.show(initial.view, initial.events);`,
`  const initial = localDuelMatch.initial();
  duelAlternativeBattle.setModeState(null);
  duelAlternativeBattle.setMatchView(initial.view);
  duelBattle.setQuality(settings.visualQuality);
  duelBattle.show(initial.view, initial.events);`,
    "local practice alternative reset",
  ],
  [
`    duelBattle.setQuality(settings.visualQuality);
    duelBattle.update(view, events);
  },
  onPrediction(prediction) {`,
`    duelAlternativeBattle.setMatchView(view);
    duelBattle.setQuality(settings.visualQuality);
    duelBattle.update(view, events);
  },
  onAlternativeModeState(view) {
    duelAlternativeBattle.setModeState(view);
  },
  onPrediction(prediction) {`,
    "online alternative mode state wiring",
  ],
]);

edit("src/duel/alternative-battle-ui.ts", [[
`    setMatchView(view) {
      matchView = view;
      if (view?.gameMode === "standard") modeView = null;
      render();
    },`,
`    setMatchView(view) {
      const roundChanged =
        matchView !== null &&
        view !== null &&
        matchView.roundId !== view.roundId;
      matchView = view;
      if (roundChanged || view?.gameMode === "standard") modeView = null;
      render();
    },`,
  "alternative round-state reset",
]]);
