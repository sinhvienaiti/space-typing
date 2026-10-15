import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  AUDIT_INPUTS,
  auditCampaign,
  auditReplay,
  auditFailureBounds,
  auditHiddenBounds,
  auditPacing,
  type RewardScenario,
} from "../src/balance/warp-economy-audit";
import { WARP_POLICY } from "../src/economy/warp-charge";

const sources = [
  "src/balance/warp-economy-audit.ts",
  "src/economy/warp-charge.ts",
  "src/economy/currencies.ts",
  "src/rewards/campaign-rewards.ts",
  "src/campaign/difficulty.ts",
  "src/campaign/difficulty-modes.ts",
  "src/campaign/stage.ts",
  "src/progression/ascension.ts",
  "src/events/objectives.ts",
  "src/events/reward-choice.ts",
  "src/discovery/hidden-encounter.ts",
  "src/main.ts",
  "src/Game.ts",
  "src/input/voice-combat-policy.ts",
  "src/persistence/account-transactions.ts",
  "src/persistence/player-save.ts",
];
const hash = createHash("sha256");
for (const file of sources) {
  hash.update(file);
  hash.update(readFileSync(file));
}
const scenarios = AUDIT_INPUTS.flatMap(({ id, input }) =>
  [0, 1, 5, 10].flatMap((tier) =>
    [false, true].map((voice) => {
      const scenario: RewardScenario = {
        input,
        tier,
        voice,
        performance: true,
        objective: true,
        maxBossCache: true,
      };
      const replay = auditReplay(scenario);
      return {
        id,
        tier,
        input: voice ? "voice" : "typing-or-hybrid-with-keyboard-evidence",
        campaign: auditCampaign(scenario),
        bestUnlockedReplay: replay,
        failureBounds: [0, 0.05, 0.1, 0.2].flatMap((failure) =>
          [0, 0.25, 0.5, 1].map((phoenix) =>
            auditFailureBounds(replay, failure, phoenix),
          ),
        ),
      };
    }),
  ),
);
const baseline = ["balanced", "impossible"].flatMap((mode) =>
  [false, true].map((performance) => {
    const input = AUDIT_INPUTS.find((item) => item.id === mode)!.input;
    return {
      mode,
      performance,
      ...auditCampaign({
        input,
        tier: 0,
        voice: false,
        performance,
        objective: false,
        maxBossCache: false,
      }),
    };
  }),
);
console.log(
  JSON.stringify(
    {
      version: 1,
      sourceSHA256: hash.digest("hex"),
      policy: WARP_POLICY,
      baseline,
      scenarios,
      hidden: auditHiddenBounds(),
      pacing: auditPacing(),
      limits: [
        "Formula/pacing audit with 104 scenarios; not a measured human survival or completion-time simulation.",
        "Repeatable reward bounds assume the stage is unlocked and all relics are already owned; one-time sector/Ascension grants are excluded from replay.",
        "Voice never receives typing performance Crystals. Voice base accuracy 99 is a favorable reward bound, not a measured recognition score.",
        "Failure bounds bracket loss versus retention of an in-attempt committed boss cache. Phoenix assumes one defeat and successful revival per attempt.",
        "SC/min uses assumed 30/60/180-second durations, not gameplay measurements. Unlock/discovery frequency and all-summon gameplay are covered by game tests, not a human model here.",
        "Missions/achievements grant Credits, not Crystals. Equipment/treasure/minion credit drops add no direct refill currency. Expedition and Duel award no Campaign Crystals.",
        "8/12/18 are daily-limited acceleration prices; positive replay net is allowed and is not a proven SC sink.",
      ],
    },
    null,
    2,
  ),
);
