import { describe, expect, it } from "vitest";
import { DuelEngine } from "../src/duel/engine";
import { DUEL_CANNON_TRAVEL_MS } from "../src/duel/presentation-timing";
import {
  duelGameModeAllowedInChannel,
  duelGameModePolicy,
  parseDuelModeInputEnvelope,
} from "../src/duel/game-mode";
import {
  DuelModeRuntime,
  type DuelModeAttack,
  type DuelModeCombatPort,
} from "../server/duel/mode-runtime";

class RecordingCombatPort implements DuelModeCombatPort {
  readonly attacks: DuelModeAttack[] = [];

  scheduleModeAttack(attack: DuelModeAttack): void {
    this.attacks.push({ ...attack });
  }
}

describe("Duel game-mode contract", () => {
  it("keeps queue channel separate from gameplay mode", () => {
    expect(duelGameModeAllowedInChannel("standard", "ranked")).toBe(true);
    expect(duelGameModeAllowedInChannel("reflex", "friend")).toBe(true);
    expect(duelGameModeAllowedInChannel("reflex", "practice")).toBe(true);
    expect(duelGameModeAllowedInChannel("reflex", "ranked")).toBe(false);
    expect(duelGameModeAllowedInChannel("word-chain", "ranked")).toBe(false);
    expect(duelGameModePolicy("reflex").usesSharedBattlefield).toBe(true);
    expect(duelGameModePolicy("word-chain").usesSharedBattlefield).toBe(true);
  });

  it("locks the client input boundary and rejects authority-looking top-level fields", () => {
    const accepted = parseDuelModeInputEnvelope({
      gameMode: "reflex",
      modeEpoch: 3,
      inputId: "input-1",
      clientSequence: 9,
      kind: "mode-input",
      payload: { candidateId: "candidate-a" },
    });
    expect(accepted.ok).toBe(true);

    expect(
      parseDuelModeInputEnvelope({
        gameMode: "standard",
        modeEpoch: 3,
        inputId: "input-2",
        clientSequence: 10,
        kind: "mode-input",
        payload: {},
      }),
    ).toEqual({ ok: false, reason: "mode-kind-mismatch" });

    expect(
      parseDuelModeInputEnvelope({
        gameMode: "reflex",
        modeEpoch: 3,
        inputId: "input-3",
        clientSequence: 11,
        kind: "mode-input",
        payload: {},
        damage: 9999,
      }),
    ).toEqual({ ok: false, reason: "schema" });
  });

  it("invalidates stale mode inputs and stale internal attacks with modeEpoch", () => {
    const combat = new RecordingCombatPort();
    const runtime = new DuelModeRuntime(combat, "standard", 12);
    const reflex = runtime.switchMode("reflex");
    expect(reflex.modeEpoch).toBe(13);

    const staleInput = runtime.acceptClientInput({
      gameMode: "reflex",
      modeEpoch: 12,
      inputId: "stale",
      clientSequence: 1,
      kind: "mode-input",
      payload: {},
    });
    expect(staleInput).toEqual({ ok: false, reason: "stale-mode-epoch" });

    expect(
      runtime.scheduleServerAttack({
        modeEpoch: 12,
        attackId: "stale-shot",
        sourcePlayerId: "player-1",
        damage: 10,
        travelMs: 600,
        presentation: "primary-cannon",
      }),
    ).toEqual({ ok: false, reason: "stale-mode-epoch" });
    expect(combat.attacks).toHaveLength(0);

    expect(
      runtime.scheduleServerAttack({
        attackId: "reflex-shot",
        sourcePlayerId: "player-1",
        damage: 10,
        travelMs: 600,
        presentation: "primary-cannon",
      }),
    ).toEqual({ ok: true });
    expect(combat.attacks).toHaveLength(1);
    expect(combat.attacks[0]?.modeEpoch).toBe(13);
  });

  it("preserves the Standard Duel authority-clock projectile, impact and KO flow", () => {
    const engine = new DuelEngine({
      typingCannon: true,
      maxHull: 1,
      maxShield: 0,
      startingShield: 0,
      regulationSeconds: 240,
    });
    engine.setPrivateOffers("player-1", [
      {
        instanceId: "laser-offer",
        actionId: "laser",
        ownerId: "player-1",
        status: "available",
        typedPrefix: "",
        slotIndex: 0,
        shared: false,
        typingPrompt: {
          promptId: "prompt-laser",
          wordId: "laser",
          answerToken: "laser",
          lexiconVersion: "c1-spike",
          difficultyClass: "core",
        },
      },
    ]);

    engine.enqueueIntent({
      type: "TYPE_CHAR",
      playerId: "player-1",
      sequence: 1,
      char: "l",
    });
    engine.step(0);
    engine.enqueueIntent({
      type: "TYPE_CHAR",
      playerId: "player-1",
      sequence: 2,
      char: "a",
    });
    const fired = engine.step(0);

    expect(fired.some((event) => event.type === "cannon-fired")).toBe(true);
    expect(engine.snapshot().round.status).toBe("active");

    const beforeImpact = engine.step((DUEL_CANNON_TRAVEL_MS - 1) / 1000);
    expect(beforeImpact.some((event) => event.type === "cannon-hit")).toBe(false);
    expect(engine.snapshot().round.status).toBe("active");

    const impact = engine.step(0.001);
    expect(impact.some((event) => event.type === "cannon-hit")).toBe(true);
    expect(impact).toContainEqual({
      type: "round-ended",
      result: { status: "won", winnerId: "player-1" },
    });
  });
});
