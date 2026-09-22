import { describe, expect, it } from "vitest";
import type { EnemyKind } from "../src/types";
import {
  ENEMY_RANKS,
  enemyRankNumber,
} from "../src/enemies/rank";
import { enemyLayerCount } from "../src/enemies/layers";
import {
  auditThreatBudget,
  calculateThreatBudget,
  THREAT_AXES,
} from "../src/enemies/threat";
import { resolveEnemyRuntimeProfile } from "../src/enemies/runtime-profile";
import { enemySkillDefinition } from "../src/enemies/skills";
import { worldForStage } from "../src/worlds/registry";

const KINDS: EnemyKind[] = [
  "scout",
  "mine",
  "tank",
  "destroyer",
  "oppressor",
  "shield",
  "carrier",
  "jammer",
  "cloaker",
  "healer",
  "splitter",
  "sniper",
  "leech",
  "commander",
];

describe("M11 Threat Budget", () => {
  it("calculates all required threat axes", () => {
    const budget = calculateThreatBudget({
      kind: "jammer",
      rank: "VI",
      elite: false,
      wordDifficultyScore: 58,
      layers: 2,
      skills: ["signal-jam"],
    });

    expect(Object.keys(budget.axes).sort()).toEqual(
      [...THREAT_AXES].sort(),
    );
    expect(budget.used).toBeGreaterThan(0);
    expect(budget.cap).toBeGreaterThan(0);
  });

  it("rejects an obviously over-budget normal enemy", () => {
    const budget = calculateThreatBudget({
      kind: "oppressor",
      rank: "I",
      elite: false,
      wordDifficultyScore: 100,
      layers: 3,
      skills: [
        "burst-volley",
        "frost-lock",
        "silence-field",
        "repair-wave",
      ],
    });

    expect(auditThreatBudget(budget, false).length).toBeGreaterThan(0);
  });

  it("resolves production skill sets inside budget across Worlds, kinds and Ranks", () => {
    const stages = [1, 101, 201, 401, 501, 701, 901, 1000];

    for (const stage of stages) {
      const world = worldForStage(stage);
      for (const kind of KINDS) {
        for (const rank of ENEMY_RANKS) {
          const layers = enemyLayerCount(rank);
          const profile = resolveEnemyRuntimeProfile({
            stage,
            kind,
            rank,
            elite: false,
            wordDifficultyScore:
              enemyRankNumber(rank) * 10 - 5,
            layers,
            random: () => 0.37,
          });

          expect(
            auditThreatBudget(profile.threatBudget, false),
            [
              world.id,
              kind,
              rank,
              JSON.stringify(profile.threatBudget),
            ].join(" "),
          ).toEqual([]);

          for (const id of profile.skills) {
            expect(
              enemySkillDefinition(id).minRank,
            ).toBeLessThanOrEqual(enemyRankNumber(rank));
          }
        }
      }
    }
  });

  it("allows stronger Elite profiles but still enforces a bounded cap", () => {
    const profile = resolveEnemyRuntimeProfile({
      stage: 900,
      kind: "commander",
      rank: "IX",
      elite: true,
      wordDifficultyScore: 88,
      layers: 3,
      random: () => 0.6,
    });

    expect(auditThreatBudget(profile.threatBudget, true)).toEqual([]);
    expect(profile.threatBudget.used).toBeLessThanOrEqual(
      profile.threatBudget.cap,
    );
    expect(profile.skills.length).toBeLessThanOrEqual(3);
  });
});
