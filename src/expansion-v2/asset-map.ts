import {
  expansionAssetUrl,
  type ExpansionAssetQuality,
} from "./assets";
import type { BossPartType } from "./boss-parts";
import type {
  EncounterRecipeId,
  SectorConditionId,
  TypingPatternId,
} from "./contracts";
import type { RelicId } from "../relics/registry";

// Campaign relics have no art yet (docs/art-requests/RELIC_ICONS_2026-10-04.md);
// a missing file returns null and the card shows its glyph.
const RELIC_FILES: Partial<Record<RelicId, string>> = {
  "first-light-seed": "relic-first-light-seed.webp",
  "storm-script": "relic-storm-script.webp",
  "frost-rhythm": "relic-frost-rhythm.webp",
  "giant-word-lens": "relic-giant-word-lens.webp",
  "mirror-vow": "relic-mirror-vow.webp",
  "cosmic-conductor": "relic-cosmic-conductor.webp",
  "precision-lens": "relic-precision-lens.webp",
  "perfect-capacitor": "relic-perfect-capacitor.webp",
  "combo-coil": "relic-combo-coil.webp",
  "heavy-core": "relic-heavy-core.webp",
  "syllable-forge": "relic-syllable-forge.webp",
  "echo-core": "relic-echo-core.webp",
};

const RECIPE_FILES: Record<EncounterRecipeId, string> = {
  "swarm-assault": "recipe-swarm-assault.webp",
  "sniper-ambush": "recipe-sniper-ambush.webp",
  "fortress-siege": "recipe-fortress-siege.webp",
  "escort-break": "recipe-escort-break.webp",
  "elite-hunt": "recipe-elite-hunt.webp",
  "recall-rupture": "recipe-recall-rupture.webp",
  "boss-prelude": "recipe-boss-prelude.webp",
};

const PATTERN_FILES: Record<TypingPatternId, string> = {
  "normal-word": "typing-normal-word.webp",
  "short-burst": "typing-short-burst.webp",
  "long-word": "typing-long-word.webp",
  phrase: "typing-phrase.webp",
  "shared-target": "typing-shared-target.webp",
  chain: "typing-chain.webp",
  "recall-word": "typing-recall-word.webp",
  "boss-sentence": "typing-boss-sentence.webp",
};

const CONDITION_FILES: Record<SectorConditionId, string> = {
  "solar-storm": "sector-solar-storm.webp",
  "meteor-shower": "sector-meteor-shower.webp",
  "gravity-well": "sector-gravity-well.webp",
  "time-fracture": "sector-time-fracture.webp",
};

const BOSS_PART_FILES: Record<BossPartType, string> = {
  engine: "boss-part-engine.webp",
  core: "boss-part-core.webp",
  cannon: "boss-part-cannon.webp",
  shield: "boss-part-shield.webp",
};

function icon(
  filename: string,
  quality: ExpansionAssetQuality,
): string | null {
  return expansionAssetUrl("icons/" + filename, quality);
}

export function relicIconUrl(
  id: RelicId,
  quality: ExpansionAssetQuality = "high",
): string | null {
  const filename = RELIC_FILES[id];
  return filename === undefined ? null : icon(filename, quality);
}

export function encounterRecipeIconUrl(
  id: EncounterRecipeId,
  quality: ExpansionAssetQuality = "high",
): string | null {
  return icon(RECIPE_FILES[id], quality);
}

export function typingPatternIconUrl(
  id: TypingPatternId,
  quality: ExpansionAssetQuality = "high",
): string | null {
  return icon(PATTERN_FILES[id], quality);
}

export function conditionIconUrl(
  id: SectorConditionId,
  quality: ExpansionAssetQuality = "high",
): string | null {
  return icon(CONDITION_FILES[id], quality);
}

export function bossPartIconUrl(
  type: BossPartType,
  quality: ExpansionAssetQuality = "high",
): string | null {
  return icon(BOSS_PART_FILES[type], quality);
}

export function expeditionIconUrl(
  kind: "mode" | "daily" | "score" | "reroll",
  quality: ExpansionAssetQuality = "high",
): string | null {
  const file = {
    mode: "expedition-emblem.webp",
    daily: "expedition-daily-seed.webp",
    score: "expedition-score-medal.webp",
    reroll: "expedition-reroll-chip.webp",
  }[kind];
  return icon(file, quality);
}

export function learningIconUrl(
  kind: "wanted" | "mastery" | "lexicon" | "review",
  quality: ExpansionAssetQuality = "high",
): string | null {
  const file = {
    wanted: "learning-wanted-word.webp",
    mastery: "learning-mastery-star.webp",
    lexicon: "learning-lexicon-boss.webp",
    review: "learning-review-token.webp",
  }[kind];
  return icon(file, quality);
}

export function metaIconUrl(
  kind: "nemesis" | "ghost",
  quality: ExpansionAssetQuality = "high",
): string | null {
  return icon(
    kind === "nemesis"
      ? "meta-nemesis.webp"
      : "meta-personal-ghost.webp",
    quality,
  );
}
