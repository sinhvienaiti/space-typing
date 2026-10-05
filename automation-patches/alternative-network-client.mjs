import fs from "node:fs";

function edit(path, transforms) {
  let text = fs.readFileSync(path, "utf8");
  for (const [before, after, label] of transforms) {
    const count = text.split(before).length - 1;
    if (count !== 1) throw new Error(`${path}: ${label}: expected 1, found ${count}`);
    text = text.replace(before, after);
  }
  fs.writeFileSync(path, text);
}

edit("src/duel/network-client.ts", [
[
`import type { DuelRoomBotConfig, DuelRoomSettingsInput } from "./room";`,
`import type { DuelRoomBotConfig, DuelRoomSettingsInput } from "./room";
import type { DuelGameMode } from "./game-mode";
import {
  isDuelAlternativeModePlayerView,
  type DuelAlternativeModePlayerView,
} from "./alternative-mode-view";`,
"alternative imports"
],
[
`  onMatchUpdate?(
    view: DuelClientMatchView,
    events: readonly DuelClientEvent[],
  ): void;
  onPrediction?(prediction: DuelLocalPrediction): void;`,
`  onMatchUpdate?(
    view: DuelClientMatchView,
    events: readonly DuelClientEvent[],
  ): void;
  /** Player-scoped alternative-mode state; null when leaving that round/mode. */
  onAlternativeModeState?(view: DuelAlternativeModePlayerView | null): void;
  onPrediction?(prediction: DuelLocalPrediction): void;`,
"alternative callback"
],
[
`  private requestSequence = 0;
  private intentSequence = 0;
  private lastServerSequence = -1;
  private view: DuelClientMatchView | null = null;`,
`  private requestSequence = 0;
  private intentSequence = 0;
  private modeInputSequence = 0;
  private lastServerSequence = -1;
  private view: DuelClientMatchView | null = null;
  private alternativeView: DuelAlternativeModePlayerView | null = null;`,
"alternative state fields"
],
[
`  currentView(): DuelClientMatchView | null {
    return this.view;
  }

  currentPrediction(): DuelLocalPrediction {`,
`  currentView(): DuelClientMatchView | null {
    return this.view;
  }

  currentAlternativeModeView(): DuelAlternativeModePlayerView | null {
    return this.alternativeView;
  }

  currentPrediction(): DuelLocalPrediction {`,
"alternative view getter"
],
[
`  startMatch(roomId: string): boolean {
    return this.sendMessage({
      type: "START_MATCH",
      requestId: this.nextRequestId(),
      roomId,
    });
  }`,
`  startMatch(
    roomId: string,
    gameMode: DuelGameMode = "standard",
  ): boolean {
    return this.sendMessage({
      type: "START_MATCH",
      requestId: this.nextRequestId(),
      roomId,
      ...(gameMode === "standard" ? {} : { gameMode }),
    });
  }`,
"startMatch gameMode"
],
[
`    if (
      view === null ||
      this.socket === null ||`,
`    if (
      view === null ||
      view.gameMode !== "standard" ||
      this.socket === null ||`,
"standard intent mode gate"
],
[
`    return sent ? sequence : null;
  }

  private openSocket(`,
`    return sent ? sequence : null;
  }

  sendModeInput(payload: unknown): number | null {
    const view = this.view;
    const alternative = this.alternativeView;
    if (
      view === null ||
      alternative === null ||
      view.gameMode === "standard" ||
      alternative.gameMode !== view.gameMode ||
      this.socket === null ||
      this.socket.readyState !== SOCKET_OPEN ||
      this.status !== "connected"
    ) {
      return null;
    }

    this.modeInputSequence = Math.max(
      this.modeInputSequence + 1,
      alternative.player.lastAcceptedSequence + 1,
    );
    const sequence = this.modeInputSequence;
    const sent = this.sendMessage({
      type: "MODE_INPUT",
      matchId: view.matchId,
      roundId: view.roundId,
      envelope: {
        gameMode: alternative.gameMode,
        modeEpoch: alternative.modeEpoch,
        inputId: "mode:" + view.roundId + ":" + String(sequence),
        clientSequence: sequence,
        kind: "mode-input",
        payload,
      },
    });
    return sent ? sequence : null;
  }

  private openSocket(`,
"mode input sender"
],
[
`      case "PING":
        if (typeof parsed.nonce === "string") {`,
`      case "MODE_STATE": {
        if (
          typeof parsed.matchId !== "string" ||
          typeof parsed.roundId !== "string" ||
          !isDuelAlternativeModePlayerView(parsed.view)
        ) {
          return;
        }
        const current = this.view;
        if (
          current === null ||
          current.matchId !== parsed.matchId ||
          current.roundId !== parsed.roundId ||
          current.gameMode === "standard" ||
          current.gameMode !== parsed.view.gameMode
        ) {
          return;
        }
        this.alternativeView = parsed.view;
        this.modeInputSequence = Math.max(
          this.modeInputSequence,
          parsed.view.player.lastAcceptedSequence,
        );
        this.callbacks.onAlternativeModeState?.(parsed.view);
        return;
      }

      case "PING":
        if (typeof parsed.nonce === "string") {`,
"MODE_STATE handler"
],
[
`    this.view = view;
    if (roundChanged) {
      this.intentSequence = 0;
      this.prediction.pendingSequences.clear();
    }`,
`    this.view = view;
    if (
      roundChanged ||
      view.gameMode === "standard" ||
      (this.alternativeView !== null &&
        this.alternativeView.gameMode !== view.gameMode)
    ) {
      this.modeInputSequence = 0;
      if (this.alternativeView !== null) {
        this.alternativeView = null;
        this.callbacks.onAlternativeModeState?.(null);
      }
    }
    if (roundChanged) {
      this.intentSequence = 0;
      this.prediction.pendingSequences.clear();
    }`,
"alternative reconcile reset"
]
]);

console.log("Applied alternative Duel browser network client wiring.");
