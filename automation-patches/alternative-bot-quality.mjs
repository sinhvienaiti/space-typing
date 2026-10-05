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

edit("src/duel/authority.ts", [
  [
`    bot: null | { playerId: DuelPlayerId; reactionMs: number };`,
`    bot: null | {
      playerId: DuelPlayerId;
      wpm: number;
      accuracy: number;
      reactionMs: number;
    };`,
    "alternative bot context type",
  ],
  [
`          : { playerId: match.botPlayerId, reactionMs: botConfig.reactionMs },`,
`          : {
              playerId: match.botPlayerId,
              wpm: botConfig.wpm,
              accuracy: botConfig.accuracy,
              reactionMs: botConfig.reactionMs,
            },`,
    "alternative bot context value",
  ],
]);

edit("server/duel/alternative-match-runtime.ts", [
  [
`  private readonly botSequence: Record<DuelPlayerId, number> = {
    "player-1": 0,
    "player-2": 0,
  };`,
`  private readonly botSequence: Record<DuelPlayerId, number> = {
    "player-1": 0,
    "player-2": 0,
  };
  private readonly botAttemptSequence: Record<DuelPlayerId, number> = {
    "player-1": 0,
    "player-2": 0,
  };`,
    "bot attempt counters",
  ],
  [
`  /**
   * Server bot helper. It intentionally feeds the same public mode envelope
   * accepted from a human client. It never calls the combat port or engine.
   */
  runBotTurn(
    playerId: DuelPlayerId,
    nowMs: number,
  ): readonly DuelEngineEvent[] {
    const current = this.reconnectSnapshot(playerId);
    if (
      (current.gameMode === "reflex" && current.player.completed) ||
      (current.gameMode === "word-chain" && current.player.accepted)
    ) {
      return [];
    }
    const token =
      this.reflex !== null
        ? this.reflexBotToken
        : this.chooseWordChainBotToken(playerId);
    if (token === null || token.length === 0) return [];

    const events: DuelEngineEvent[] = [];
    for (const char of token) {
      const result = this.receive(
        playerId,
        this.botEnvelope(playerId, { type: "TYPE_CHAR", char }),
        nowMs,
      );
      events.push(...result.combatEvents);
      if (!result.ok) return events;
    }

    if (this.wordChain !== null) {
      const result = this.receive(
        playerId,
        this.botEnvelope(playerId, { type: "SUBMIT" }),
        nowMs,
      );
      events.push(...result.combatEvents);
    }
    return events;
  }
`,
`  /**
   * Completion delay for a server bot. The room's WPM now affects alternative
   * modes too: one word is estimated with the conventional 5 chars/word.
   * Reaction time stays additive and bounded by the normalized room config.
   */
  botTurnDelayMs(
    playerId: DuelPlayerId,
    wpm: number,
    reactionMs: number,
  ): number {
    const token = this.reflex !== null
      ? this.reflexBotToken
      : this.chooseWordChainBotToken(playerId);
    const chars = Math.max(1, token?.length ?? 1);
    const safeWpm = Math.max(10, Math.min(300, Number.isFinite(wpm) ? wpm : 60));
    const safeReaction = Math.max(
      0,
      Math.min(3000, Number.isFinite(reactionMs) ? reactionMs : 250),
    );
    return Math.round(safeReaction + (chars * 12_000) / safeWpm);
  }

  /**
   * Server bot helper. It intentionally feeds the same public mode envelope
   * accepted from a human client. It never calls the combat port or engine.
   * Accuracy is modeled as a failed typing/submission attempt followed by a
   * later retry, instead of silently scaling damage.
   */
  runBotTurn(
    playerId: DuelPlayerId,
    nowMs: number,
    accuracy = 1,
  ): readonly DuelEngineEvent[] {
    const current = this.reconnectSnapshot(playerId);
    if (
      (current.gameMode === "reflex" && current.player.completed) ||
      (current.gameMode === "word-chain" && current.player.accepted)
    ) {
      return [];
    }
    const token =
      this.reflex !== null
        ? this.reflexBotToken
        : this.chooseWordChainBotToken(playerId);
    if (token === null || token.length === 0) return [];

    const safeAccuracy = Math.max(
      0,
      Math.min(1, Number.isFinite(accuracy) ? accuracy : 0.95),
    );
    const attempt = ++this.botAttemptSequence[playerId];
    const roll = deterministicUnit(
      this.gameMode + ":" + this.modeRuntime.snapshot().modeEpoch + ":" + playerId + ":" + attempt,
    );
    const events: DuelEngineEvent[] = [];

    if (roll >= safeAccuracy) {
      if (this.reflex !== null) {
        const challenge = current.gameMode === "reflex" ? current.challenge : null;
        const starts = new Set(
          challenge?.candidates.map((candidate) => candidate.token.slice(0, 1)) ?? [],
        );
        const wrongChar = "abcdefghijklmnopqrstuvwxyz"
          .split("")
          .find((char) => !starts.has(char)) ?? "z";
        const result = this.receive(
          playerId,
          this.botEnvelope(playerId, { type: "TYPE_CHAR", char: wrongChar }),
          nowMs,
        );
        events.push(...result.combatEvents);
        return events;
      }

      const beat = current.gameMode === "word-chain" ? current.beat : null;
      const required = beat?.requiredInitial[playerId] ?? "a";
      const wrongChar = required === "z" ? "a" : "z";
      for (const payload of [
        { type: "CLEAR" },
        { type: "TYPE_CHAR", char: wrongChar },
        { type: "SUBMIT" },
      ]) {
        const result = this.receive(
          playerId,
          this.botEnvelope(playerId, payload),
          nowMs,
        );
        events.push(...result.combatEvents);
        if (!result.ok) return events;
      }
      return events;
    }

    if (this.wordChain !== null) {
      const cleared = this.receive(
        playerId,
        this.botEnvelope(playerId, { type: "CLEAR" }),
        nowMs,
      );
      events.push(...cleared.combatEvents);
      if (!cleared.ok) return events;
    }

    for (const char of token) {
      const result = this.receive(
        playerId,
        this.botEnvelope(playerId, { type: "TYPE_CHAR", char }),
        nowMs,
      );
      events.push(...result.combatEvents);
      if (!result.ok) return events;
    }

    if (this.wordChain !== null) {
      const result = this.receive(
        playerId,
        this.botEnvelope(playerId, { type: "SUBMIT" }),
        nowMs,
      );
      events.push(...result.combatEvents);
    }
    return events;
  }
`,
    "bot quality implementation",
  ],
  [
`const PLAYER_IDS: readonly DuelPlayerId[] = ["player-1", "player-2"];
`,
`const PLAYER_IDS: readonly DuelPlayerId[] = ["player-1", "player-2"];

function deterministicUnit(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash / 4294967296;
}
`,
    "deterministic bot roll",
  ],
]);

edit("server/duel/ws-server.ts", [
  [
`    botDueAtMs:
      context.value.bot === null
        ? null
        : nowMs + context.value.bot.reactionMs,`,
`    botDueAtMs:
      context.value.bot === null
        ? null
        : nowMs + runtime.botTurnDelayMs(
            context.value.bot.playerId,
            context.value.bot.wpm,
            context.value.bot.reactionMs,
          ),`,
    "initial alternative bot delay",
  ],
  [
`  if (record.botTurnKey !== key) {
    record.botTurnKey = key;
    record.botDueAtMs = nowMs + context.value.bot.reactionMs;
  }
  if (record.botDueAtMs === null || nowMs < record.botDueAtMs) return [];
  record.botDueAtMs = null;
  return record.runtime.runBotTurn(context.value.bot.playerId, nowMs);`,
`  if (record.botTurnKey !== key) {
    record.botTurnKey = key;
    record.botDueAtMs = nowMs + record.runtime.botTurnDelayMs(
      context.value.bot.playerId,
      context.value.bot.wpm,
      context.value.bot.reactionMs,
    );
  }
  if (record.botDueAtMs === null || nowMs < record.botDueAtMs) return [];

  const events = record.runtime.runBotTurn(
    context.value.bot.playerId,
    nowMs,
    context.value.bot.accuracy,
  );
  const nextKey = botTurnKey(record.runtime, context.value.bot.playerId);
  if (nextKey === key) {
    // A miss stays on the same public challenge/beat and retries after the
    // same reaction + WPM completion window. No direct bot damage shortcut.
    record.botDueAtMs = nowMs + record.runtime.botTurnDelayMs(
      context.value.bot.playerId,
      context.value.bot.wpm,
      context.value.bot.reactionMs,
    );
  } else {
    record.botTurnKey = nextKey;
    record.botDueAtMs = nextKey === null
      ? null
      : nowMs + record.runtime.botTurnDelayMs(
          context.value.bot.playerId,
          context.value.bot.wpm,
          context.value.bot.reactionMs,
        );
  }
  return events;`,
    "alternative bot retry scheduling",
  ],
]);

edit("src/ui/holo-lobby.css", [[
`.duel-lobby-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px; margin: 0; }`,
`.duel-lobby-mode {
  width: min(520px, 100%);
  margin: 2px auto 0;
  display: grid;
  grid-template-columns: auto minmax(180px, 1fr);
  align-items: center;
  gap: 6px 12px;
  padding: 10px 12px;
  border: 1px solid rgba(111, 231, 255, 0.16);
  background: rgba(4, 13, 28, 0.55);
}
.duel-lobby-mode label {
  color: var(--holo-accent);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.duel-lobby-mode select { height: 36px; }
.duel-lobby-mode small {
  grid-column: 1 / -1;
  color: var(--holo-dim);
  font-size: 0.7rem;
  text-align: center;
}
.duel-lobby-mode select:disabled { opacity: 0.55; }
.duel-lobby-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px; margin: 0; }`,
  "lobby gameplay mode styling",
]]);