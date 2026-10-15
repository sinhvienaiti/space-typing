import { sanitizeDuelActionQualityScale } from "./accuracy";
import type {
  DuelActionDefinition,
  DuelPlayerId,
} from "./model";
import type {
  DuelPrecisionBonus,
} from "./precision-firepower";

export type DuelThreatStatus =
  | "open"
  | "countered"
  | "expired"
  | "resolved";

export type DuelIncomingThreat = {
  id: string;
  sourcePlayerId: DuelPlayerId;
  targetPlayerId: DuelPlayerId;
  actionId: string;
  displayLabel: string;
  answerToken: string;
  typedPrefix: string;
  counterTags: readonly string[];
  remainingSeconds: number;
  effectScale: number;
  status: DuelThreatStatus;
};

type DuelThreatRecord = DuelIncomingThreat & {
  precisionBonus: DuelPrecisionBonus | null;
};

export type DuelThreatTypingResult =
  | { kind: "correct"; completed: boolean }
  | { kind: "wrong"; completed: false }
  | { kind: "unavailable"; completed: false };

export type DuelThreatTickEvent = {
  threatId: string;
  actionId: string;
  sourcePlayerId: DuelPlayerId;
  targetPlayerId: DuelPlayerId;
  effectScale: number;
  precisionBonus: DuelPrecisionBonus | null;
  outcome: "countered" | "expired";
};

export class DuelThreatSystem {
  private readonly threats: DuelThreatRecord[] = [];
  private sequence = 0;

  create(
    action: DuelActionDefinition,
    sourcePlayerId: DuelPlayerId,
    targetPlayerId: DuelPlayerId,
    responseWindowScale = 1,
    effectScale = 1,
    precisionBonus: DuelPrecisionBonus | null = null,
  ): DuelIncomingThreat | null {
    const response = action.responseOpportunity;
    if (response === undefined) return null;

    const threat: DuelThreatRecord = {
      id: "threat:" + String(++this.sequence),
      sourcePlayerId,
      targetPlayerId,
      actionId: action.id,
      displayLabel: response.displayLabel,
      answerToken: response.answerToken,
      typedPrefix: "",
      counterTags: [...response.counterTags],
      remainingSeconds:
        response.windowSeconds *
        Math.max(
          0.85,
          Math.min(
            1.65,
            Number.isFinite(responseWindowScale)
              ? responseWindowScale
              : 1,
          ),
        ),
      effectScale: sanitizeDuelActionQualityScale(effectScale),
      precisionBonus:
        precisionBonus === null ? null : { ...precisionBonus },
      status: "open",
    };
    this.threats.push(threat);
    const {
      precisionBonus: _precisionBonus,
      ...publicThreat
    } = threat;
    return {
      ...publicThreat,
      counterTags: [...publicThreat.counterTags],
    };
  }

  typeChar(
    targetPlayerId: DuelPlayerId,
    threatId: string,
    rawChar: string,
  ): DuelThreatTypingResult {
    const threat = this.threats.find(
      (candidate) =>
        candidate.id === threatId &&
        candidate.targetPlayerId === targetPlayerId,
    );
    if (threat === undefined || threat.status !== "open") {
      return { kind: "unavailable", completed: false };
    }

    const char = rawChar.toLocaleLowerCase("en-US");
    const expected = threat.answerToken[threat.typedPrefix.length];
    if (!/^[a-z]$/.test(char) || expected !== char) {
      return { kind: "wrong", completed: false };
    }

    threat.typedPrefix += char;
    if (threat.typedPrefix === threat.answerToken) {
      threat.status = "countered";
      return { kind: "correct", completed: true };
    }
    return { kind: "correct", completed: false };
  }

  update(dtSeconds: number): DuelThreatTickEvent[] {
    const dt = Math.max(
      0,
      Number.isFinite(dtSeconds) ? dtSeconds : 0,
    );
    const events: DuelThreatTickEvent[] = [];
    let write = 0;

    for (const threat of this.threats) {
      if (threat.status === "countered") {
        events.push({
          threatId: threat.id,
          actionId: threat.actionId,
          sourcePlayerId: threat.sourcePlayerId,
          targetPlayerId: threat.targetPlayerId,
          effectScale: threat.effectScale,
          precisionBonus:
            threat.precisionBonus === null
              ? null
              : { ...threat.precisionBonus },
          outcome: "countered",
        });
        continue;
      }

      threat.remainingSeconds = Math.max(
        0,
        threat.remainingSeconds - dt,
      );
      if (threat.remainingSeconds <= 0) {
        threat.status = "expired";
        events.push({
          threatId: threat.id,
          actionId: threat.actionId,
          sourcePlayerId: threat.sourcePlayerId,
          targetPlayerId: threat.targetPlayerId,
          effectScale: threat.effectScale,
          precisionBonus:
            threat.precisionBonus === null
              ? null
              : { ...threat.precisionBonus },
          outcome: "expired",
        });
        continue;
      }

      this.threats[write++] = threat;
    }

    this.threats.length = write;
    return events;
  }

  getOpenThreat(
    playerId: DuelPlayerId,
    threatId: string,
  ): DuelIncomingThreat | null {
    const threat = this.threats.find(
      (candidate) =>
        candidate.id === threatId &&
        candidate.targetPlayerId === playerId &&
        candidate.status === "open",
    );
    if (threat === undefined) return null;
    const {
      precisionBonus: _precisionBonus,
      ...publicThreat
    } = threat;
    return {
      ...publicThreat,
      counterTags: [...publicThreat.counterTags],
    };
  }

  snapshotFor(
    playerId: DuelPlayerId,
  ): readonly DuelIncomingThreat[] {
    return this.threats
      .filter(
        (threat) =>
          threat.targetPlayerId === playerId &&
          threat.status === "open",
      )
      .map((threat) => {
        const {
          precisionBonus: _precisionBonus,
          ...publicThreat
        } = threat;
        return {
          ...publicThreat,
          counterTags: [...publicThreat.counterTags],
        };
      });
  }

  clear(): void {
    this.threats.length = 0;
  }
}
