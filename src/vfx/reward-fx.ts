import {
  ENEMY_REWARD_DEFINITIONS,
  type EnemyRewardId,
} from "../enemies/rewards";

export type RewardFxProfile = {
  count: number;
  hue: number;
  audio: "support" | "power" | "rare-drop";
};

export function rewardFxProfile(
  reward: EnemyRewardId,
): RewardFxProfile {
  const category = ENEMY_REWARD_DEFINITIONS[reward].category;

  if (category === "sustain") {
    return { count: 34, hue: 132, audio: "support" };
  }
  if (category === "control") {
    return { count: 38, hue: 196, audio: "support" };
  }
  if (category === "economy") {
    return { count: 42, hue: 48, audio: "rare-drop" };
  }
  if (category === "resource") {
    return { count: 36, hue: 210, audio: "power" };
  }
  if (category === "burst") {
    return { count: 44, hue: 344, audio: "power" };
  }
  return { count: 38, hue: 18, audio: "power" };
}
