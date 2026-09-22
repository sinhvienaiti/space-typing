import type { EnemyFamilyId } from "../enemies/families";

export type EnemyFxEvent =
  | "spawn"
  | "hit"
  | "death"
  | "boss-intro"
  | "boss-phase"
  | "boss-death";

export type EnemyFxProfile = {
  count: number;
  hue: number;
  pitch: number;
};

const FAMILY_HUES: Record<EnemyFamilyId, number> = {
  rainbow: 318,
  angel: 48,
  devil: 344,
  frost: 196,
  prism: 282,
  nature: 124,
  shadow: 264,
  cosmic: 216,
};

const FAMILY_PITCH: Record<EnemyFamilyId, number> = {
  rainbow: 1,
  angel: 1.16,
  devil: 0.86,
  frost: 1.08,
  prism: 1.22,
  nature: 0.95,
  shadow: 0.78,
  cosmic: 0.9,
};

const EVENT_COUNTS: Record<EnemyFxEvent, number> = {
  spawn: 12,
  hit: 18,
  death: 30,
  "boss-intro": 46,
  "boss-phase": 52,
  "boss-death": 82,
};

export function enemyFxProfile(
  family: EnemyFamilyId,
  event: EnemyFxEvent,
): EnemyFxProfile {
  return {
    count: EVENT_COUNTS[event],
    hue: FAMILY_HUES[family],
    pitch: FAMILY_PITCH[family],
  };
}
