import type { DuelPlayerId } from "../../src/duel/model";
import {
  duelGameModePolicy,
  nextDuelModeEpoch,
  parseDuelModeInputEnvelope,
  type DuelGameMode,
  type DuelModeEpoch,
  type DuelModeInputEnvelope,
} from "../../src/duel/game-mode";

export type DuelModeAttackPresentation =
  | "primary-cannon"
  | "missile"
  | "bomb"
  | "railgun";

export type DuelModeAttack = Readonly<{
  modeEpoch: DuelModeEpoch;
  attackId: string;
  sourcePlayerId: DuelPlayerId;
  damage: number;
  travelMs: number;
  presentation: DuelModeAttackPresentation;
}>;

export type DuelModeCombatPort = {
  /**
   * Authority-owned seam only. Implementations must schedule through the
   * existing Duel projectile/impact clock; callers must never apply damage
   * from browser animation callbacks.
   */
  scheduleModeAttack(attack: DuelModeAttack): void;
};

export type DuelModeRuntimeSnapshot = Readonly<{
  gameMode: DuelGameMode;
  modeEpoch: DuelModeEpoch;
}>;

export type DuelModeInputAcceptance =
  | { ok: true; input: DuelModeInputEnvelope }
  | {
      ok: false;
      reason:
        | "invalid-input"
        | "mode-mismatch"
        | "stale-mode-epoch";
    };

export type DuelModeAttackScheduleResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "standard-mode"
        | "stale-mode-epoch"
        | "invalid-attack";
    };

export class DuelModeRuntime {
  private gameMode: DuelGameMode;
  private modeEpoch: DuelModeEpoch;

  constructor(
    private readonly combat: DuelModeCombatPort,
    initialMode: DuelGameMode = "standard",
    initialEpoch: DuelModeEpoch = 1,
  ) {
    this.gameMode = initialMode;
    this.modeEpoch =
      Number.isSafeInteger(initialEpoch) && initialEpoch > 0
        ? initialEpoch
        : 1;
  }

  snapshot(): DuelModeRuntimeSnapshot {
    return {
      gameMode: this.gameMode,
      modeEpoch: this.modeEpoch,
    };
  }

  switchMode(nextMode: DuelGameMode): DuelModeRuntimeSnapshot {
    if (nextMode === this.gameMode) return this.snapshot();
    this.gameMode = nextMode;
    this.modeEpoch = nextDuelModeEpoch(this.modeEpoch);
    return this.snapshot();
  }

  rotateEpoch(): DuelModeRuntimeSnapshot {
    this.modeEpoch = nextDuelModeEpoch(this.modeEpoch);
    return this.snapshot();
  }

  acceptClientInput(raw: unknown): DuelModeInputAcceptance {
    const parsed = parseDuelModeInputEnvelope(raw);
    if (!parsed.ok) return { ok: false, reason: "invalid-input" };
    if (parsed.value.gameMode !== this.gameMode) {
      return { ok: false, reason: "mode-mismatch" };
    }
    if (parsed.value.modeEpoch !== this.modeEpoch) {
      return { ok: false, reason: "stale-mode-epoch" };
    }
    return { ok: true, input: parsed.value };
  }

  scheduleServerAttack(
    attack: Omit<DuelModeAttack, "modeEpoch"> & {
      modeEpoch?: DuelModeEpoch;
    },
  ): DuelModeAttackScheduleResult {
    if (duelGameModePolicy(this.gameMode).challengeFamily === "none") {
      return { ok: false, reason: "standard-mode" };
    }
    const epoch = attack.modeEpoch ?? this.modeEpoch;
    if (epoch !== this.modeEpoch) {
      return { ok: false, reason: "stale-mode-epoch" };
    }
    if (
      attack.attackId.length === 0 ||
      attack.attackId.length > 96 ||
      !Number.isFinite(attack.damage) ||
      attack.damage <= 0 ||
      !Number.isFinite(attack.travelMs) ||
      attack.travelMs < 1 ||
      attack.travelMs > 30_000
    ) {
      return { ok: false, reason: "invalid-attack" };
    }

    this.combat.scheduleModeAttack({
      ...attack,
      modeEpoch: this.modeEpoch,
      damage: Math.min(10_000, attack.damage),
      travelMs: Math.round(attack.travelMs),
    });
    return { ok: true };
  }
}
