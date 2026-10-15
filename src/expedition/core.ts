import type { CompletionContribution } from "../combat/completion-events";
export const EXPEDITION_RUN_VERSION = 1 as const;
export const EXPEDITION_RULESET_VERSION = "expansion-v2-v1";
export const EXPEDITION_CONTENT_VERSION = "expansion-v2-world-01-v1";
export const EXPEDITION_START_KIT_ID = "loaner-vanguard-v1";

export type ExpeditionPhase =
  | "setup"
  | "draft"
  | "rest"
  | "encounter"
  | "settlement"
  | "victory"
  | "defeat"
  | "abandoned";

export type ExpeditionTerminalPhase = "victory" | "defeat" | "abandoned";

export type ExpeditionWordEntry = {
  id: string;
  en: string;
  vi: string;
  ipa: string;
};

export type ExpeditionWordPool = {
  hash: string;
  entries: ExpeditionWordEntry[];
};

export type ExpeditionProfile = {
  inputMode?: "typing" | "voice" | "hybrid";
  voicePolicy?: string;
  difficulty: string;
  assist: string;
  vocabularyLevel: number;
  difficultySettings?: unknown;
  gameplayMode?: string;
};

export type ExpeditionResources = {
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  power: number;
};

export type ExpeditionGhostPoint = {
  encounterIndex: number;
  activeSeconds: number;
  cumulativeScore: number;
};

export type ExpeditionEncounterPlanItem = {
  id: string;
  index: number;
  sourceStage: number;
  gameplaySeed: number;
  cosmeticSeed: number;
  design?: {
    recipe: string;
    pattern: string;
    condition: string | null;
    macro: string;
    briefing: string;
    workload: string;
    maxConcurrentTargets: number;
    objective: string;
  };
};

export type ExpeditionDraftChoice =
  | { id: string; kind: "relic"; relicId: string }
  | { id: "continue"; kind: "continue" };

export type ExpeditionDraftOffer = {
  id: string;
  choices: ExpeditionDraftChoice[];
  confirmedChoiceId: string | null;
  replacementRelicId: string | null;
};

export type ExpeditionRun = {
  version: typeof EXPEDITION_RUN_VERSION;
  runId: string;
  seed: number;
  rulesetVersion: string;
  contentVersion: string;
  startKitId: typeof EXPEDITION_START_KIT_ID;
  wordPool: ExpeditionWordPool;
  profile: ExpeditionProfile;
  challenge?: {
    kind: "prototype" | "daily" | "weekly" | "qa";
    dayKey: string | null;
    weekKey?: string | null;
    identityKey: string | null;
  };
  learning?: {
    wantedWordId: string | null;
  };
  ghostPoints?: ExpeditionGhostPoint[];
  phase: ExpeditionPhase;
  encounterPlan: ExpeditionEncounterPlanItem[];
  currentEncounterIndex: number;
  completedEncounters: number;
  draftOffer: ExpeditionDraftOffer | null;
  relics: {
    owned: string[];
    equipped: string[];
    maxEquipped: number;
    discarded?: string[];
  };
  resources: ExpeditionResources;
  totalScore: number;
  accuracySum: number;
  contributions: CompletionContribution;
  committedEncounterIds: string[];
  interrupted: boolean;
  retryCount: number;
  terminal: {
    phase: ExpeditionTerminalPhase;
    reason: string;
    completedEncounters: number;
  } | null;
  campaignFixture: unknown;
  campaignFixtureHash: string;
};

function fnv1a(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableJson).join(",") + "]";
  }
  const input = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(input)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + stableJson(input[key]))
      .join(",") +
    "}"
  );
}

export function hashText(text: string): string {
  return fnv1a(text).toString(16).padStart(8, "0");
}

export function hashSnapshot(value: unknown): string {
  return hashText(stableJson(value));
}

export function normalizeExpeditionSeed(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const seed = Math.floor(value) >>> 0;
  return seed === 0 ? 1 : seed;
}

function deriveSeed(seedInput: number, label: string): number {
  const seed = normalizeExpeditionSeed(seedInput);
  return (seed ^ fnv1a(label) ^ 0x9e3779b9) >>> 0 || 1;
}

function seededRandom(seedInput: number): () => number {
  let state = normalizeExpeditionSeed(seedInput);
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

export function sanitizeExpeditionResources(
  input: ExpeditionResources,
): ExpeditionResources {
  const maxHull = Math.max(1, Number.isFinite(input.maxHull) ? input.maxHull : 1);
  const maxShield = Math.max(0, Number.isFinite(input.maxShield) ? input.maxShield : 0);
  const maxEnergy = Math.max(0, Number.isFinite(input.maxEnergy) ? input.maxEnergy : 0);
  return {
    hull: Math.max(0, Math.min(maxHull, Number.isFinite(input.hull) ? input.hull : maxHull)),
    maxHull,
    shield: Math.max(0, Math.min(maxShield, Number.isFinite(input.shield) ? input.shield : maxShield)),
    maxShield,
    energy: Math.max(0, Math.min(maxEnergy, Number.isFinite(input.energy) ? input.energy : maxEnergy)),
    maxEnergy,
    power: Math.max(0, Math.min(100, Number.isFinite(input.power) ? input.power : 0)),
  };
}

export function createExpeditionEncounterPlan(
  seedInput: number,
  sourceStagesInput: readonly number[],
  countInput = 2,
): ExpeditionEncounterPlanItem[] {
  const sourceStages = [...new Set(
    sourceStagesInput.filter(
      (stage) => Number.isInteger(stage) && stage >= 1 && stage <= 1000,
    ),
  )];
  if (sourceStages.length === 0) {
    throw new Error("Expedition requires at least one normal production stage.");
  }
  const seed = normalizeExpeditionSeed(seedInput);
  const random = seededRandom(deriveSeed(seed, "encounter-order"));
  const pool = [...sourceStages];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap]!, pool[index]!];
  }
  const count = Math.max(1, Math.min(pool.length, Math.floor(countInput)));
  return pool.slice(0, count).map((sourceStage, index) => ({
    id: "enc-" + String(index + 1) + "-s" + String(sourceStage),
    index,
    sourceStage,
    gameplaySeed: deriveSeed(seed, "gameplay:" + String(index) + ":" + String(sourceStage)),
    cosmeticSeed: deriveSeed(seed, "cosmetic:" + String(index) + ":" + String(sourceStage)),
  }));
}

export function materializeExpeditionDraft(
  seedInput: number,
  offerIndex: number,
  eligibleRelicIds: readonly string[],
  ownedRelicIds: readonly string[],
  discardedRelicIds: readonly string[] = [],
): ExpeditionDraftOffer {
  const unavailable = new Set([...ownedRelicIds, ...discardedRelicIds]);
  const candidates = unique(eligibleRelicIds).filter((id) => !unavailable.has(id));
  const random = seededRandom(deriveSeed(seedInput, "offer:" + String(offerIndex)));
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [candidates[index], candidates[swap]] = [candidates[swap]!, candidates[index]!];
  }
  const choices: ExpeditionDraftChoice[] = candidates.slice(0, 3).map((relicId) => ({
    id: "relic:" + relicId,
    kind: "relic",
    relicId,
  }));
  return {
    id: "draft-" + String(offerIndex),
    choices: choices.length > 0 ? choices : [{ id: "continue", kind: "continue" }],
    confirmedChoiceId: null,
    replacementRelicId: null,
  };
}

export function createExpeditionRun(input: {
  runId: string;
  seed: number;
  wordPool: ExpeditionWordPool;
  profile: ExpeditionProfile;
  encounterPlan: ExpeditionEncounterPlanItem[];
  campaignFixture: unknown;
  startingResources: ExpeditionResources;
  maxEquippedRelics?: number;
  challenge?: ExpeditionRun["challenge"];
  learning?: ExpeditionRun["learning"];
}): ExpeditionRun {
  if (input.runId.trim().length === 0) throw new Error("Expedition runId is required.");
  if (
    input.wordPool.hash.length === 0 ||
    input.wordPool.entries.length === 0
  ) {
    throw new Error("Expedition requires a frozen non-empty word pool.");
  }
  if (input.encounterPlan.length === 0) {
    throw new Error("Expedition requires at least one encounter.");
  }
  const fixture = clonePlain(input.campaignFixture);
  return {
    version: EXPEDITION_RUN_VERSION,
    runId: input.runId,
    seed: normalizeExpeditionSeed(input.seed),
    rulesetVersion: EXPEDITION_RULESET_VERSION,
    contentVersion: EXPEDITION_CONTENT_VERSION,
    startKitId: EXPEDITION_START_KIT_ID,
    wordPool: {
      hash: input.wordPool.hash,
      entries: input.wordPool.entries.map((entry) => ({ ...entry })),
    },
    profile: { ...input.profile },
    challenge:
      input.challenge === undefined
        ? undefined
        : { ...input.challenge },
    learning:
      input.learning === undefined
        ? undefined
        : { ...input.learning },
    ghostPoints: [],
    phase: "setup",
    encounterPlan: input.encounterPlan.map((item) => ({ ...item })),
    currentEncounterIndex: 0,
    completedEncounters: 0,
    draftOffer: null,
    relics: {
      owned: [],
      equipped: [],
      maxEquipped: Math.max(0, Math.floor(input.maxEquippedRelics ?? 3)),
      discarded: [],
    },
    resources: sanitizeExpeditionResources(input.startingResources),
    totalScore: 0,
    accuracySum: 0,
    contributions: {
      typedCompletions: 0,
      perfectCompletions: 0,
      acceptedTypedLetters: 0,
      weightedEffort: 0,
      longWordCompletions: 0,
      solarStormBonuses: 0,
      solarStormEnergy: 0,
      relicProcs: 0,
      perkProcs: 0,
      synergyProcs: 0,
    },
    committedEncounterIds: [],
    interrupted: false,
    retryCount: 0,
    terminal: null,
    campaignFixture: fixture,
    campaignFixtureHash: hashSnapshot(fixture),
  };
}

export function campaignFixtureUnchanged(
  run: ExpeditionRun,
  fixture: unknown,
): boolean {
  return run.campaignFixtureHash === hashSnapshot(fixture);
}

export function openExpeditionDraft(
  run: ExpeditionRun,
  eligibleRelicIds: readonly string[],
): ExpeditionRun {
  if (run.terminal !== null) return run;
  if (run.phase !== "setup" && run.phase !== "settlement") return run;
  if (run.draftOffer !== null) return run;
  const offerIndex = run.completedEncounters;
  return {
    ...run,
    phase: "draft",
    draftOffer: materializeExpeditionDraft(
      run.seed,
      offerIndex,
      eligibleRelicIds,
      run.relics.owned,
      run.relics.discarded ?? [],
    ),
  };
}

export function confirmExpeditionDraft(
  run: ExpeditionRun,
  choiceId: string,
  replacementRelicId: string | null = null,
): { ok: true; run: ExpeditionRun } | { ok: false; reason: string; run: ExpeditionRun } {
  if (run.phase !== "draft" || run.draftOffer === null || run.terminal !== null) {
    return { ok: false, reason: "draft-not-active", run };
  }
  if (run.draftOffer.confirmedChoiceId !== null) {
    return { ok: false, reason: "offer-already-confirmed", run };
  }
  const choice = run.draftOffer.choices.find((item) => item.id === choiceId);
  if (choice === undefined) return { ok: false, reason: "unknown-choice", run };

  if (choice.kind === "continue") {
    return {
      ok: true,
      run: {
        ...run,
        phase: "setup",
        draftOffer: {
          ...run.draftOffer,
          confirmedChoiceId: choice.id,
        },
      },
    };
  }

  const owned = unique([...run.relics.owned, choice.relicId]);
  let equipped = unique(run.relics.equipped);
  let replaced: string | null = null;

  if (!equipped.includes(choice.relicId)) {
    if (equipped.length < run.relics.maxEquipped) {
      equipped = [...equipped, choice.relicId];
    } else if (run.relics.maxEquipped > 0) {
      if (replacementRelicId === null) {
        return { ok: false, reason: "replacement-required", run };
      }
      const index = equipped.indexOf(replacementRelicId);
      if (index < 0) return { ok: false, reason: "invalid-replacement", run };
      equipped = [...equipped];
      equipped[index] = choice.relicId;
      replaced = replacementRelicId;
    }
  }

  return {
    ok: true,
    run: {
      ...run,
      phase: "setup",
      relics: {
        ...run.relics,
        owned,
        equipped: unique(equipped).slice(0, run.relics.maxEquipped),
      },
      draftOffer: {
        ...run.draftOffer,
        confirmedChoiceId: choice.id,
        replacementRelicId: replaced,
      },
    },
  };
}

export function beginExpeditionEncounter(run: ExpeditionRun): ExpeditionRun {
  if (run.terminal !== null || run.phase !== "setup") {
    return run;
  }
  if (
    run.draftOffer !== null &&
    run.draftOffer.confirmedChoiceId === null
  ) {
    return run;
  }
  if (run.encounterPlan[run.currentEncounterIndex] === undefined) {
    return terminalExpeditionRun(run, "victory", "plan-complete");
  }
  return {
    ...run,
    phase: "encounter",
    draftOffer: null,
    interrupted: false,
  };
}

export type ExpeditionRestChoice =
  | { kind: "repair"; ratio?: number }
  | { kind: "salvage"; relicId: string };

export function markExpeditionRestBoundary(
  run: ExpeditionRun,
): ExpeditionRun {
  if (run.terminal !== null || run.phase !== "settlement") return run;
  return {
    ...run,
    phase: "rest",
    draftOffer: null,
  };
}

export function resolveExpeditionRest(
  run: ExpeditionRun,
  choice: ExpeditionRestChoice,
): ExpeditionRun {
  if (run.terminal !== null || run.phase !== "rest") return run;

  if (choice.kind === "repair") {
    const ratio = Math.max(0, Math.min(0.5, choice.ratio ?? 0.25));
    return {
      ...run,
      phase: "settlement",
      resources: {
        ...run.resources,
        hull: Math.min(
          run.resources.maxHull,
          run.resources.hull + run.resources.maxHull * ratio,
        ),
      },
    };
  }

  if (!run.relics.equipped.includes(choice.relicId)) return run;
  return {
    ...run,
    phase: "settlement",
    relics: {
      ...run.relics,
      equipped: run.relics.equipped.filter((id) => id !== choice.relicId),
      discarded: [
        ...new Set([
          ...(run.relics.discarded ?? []),
          choice.relicId,
        ]),
      ],
    },
  };
}

export function replayExpeditionBoundary(run: ExpeditionRun): ExpeditionRun {
  if (run.phase !== "encounter" || run.terminal !== null) return run;
  return {
    ...run,
    interrupted: true,
    retryCount: run.retryCount + 1,
  };
}

export function settleExpeditionEncounter(
  run: ExpeditionRun,
  result: {
    score: number;
    accuracy: number;
    resources: ExpeditionResources;
    activeSeconds?: number;
    contributions?: CompletionContribution;
  },
): ExpeditionRun {
  if (run.phase !== "encounter" || run.terminal !== null) return run;
  const encounter = run.encounterPlan[run.currentEncounterIndex];
  if (encounter === undefined) return terminalExpeditionRun(run, "victory", "plan-complete");

  const alreadyCommitted = run.committedEncounterIds.includes(encounter.id);
  const score = Math.max(0, Math.floor(result.score));
  const accuracy = Math.max(0, Math.min(100, result.accuracy));
  const completed = Math.max(run.completedEncounters, run.currentEncounterIndex + 1);
  const nextIndex = run.currentEncounterIndex + 1;
  const nextTotalScore = alreadyCommitted
    ? run.totalScore
    : run.totalScore + score;
  const activeSeconds =
    typeof result.activeSeconds === "number" &&
    Number.isFinite(result.activeSeconds)
      ? Math.max(0, result.activeSeconds)
      : null;
  const nextGhostPoints =
    alreadyCommitted || activeSeconds === null
      ? [...(run.ghostPoints ?? [])]
      : [
          ...(run.ghostPoints ?? []).filter(
            (point) => point.encounterIndex !== run.currentEncounterIndex,
          ),
          {
            encounterIndex: run.currentEncounterIndex,
            activeSeconds,
            cumulativeScore: nextTotalScore,
          },
        ]
          .sort((left, right) => left.encounterIndex - right.encounterIndex)
          .slice(-16);
  const encounterContribution =
    result.contributions ?? {
      typedCompletions: 0,
      perfectCompletions: 0,
      acceptedTypedLetters: 0,
      weightedEffort: 0,
      longWordCompletions: 0,
      solarStormBonuses: 0,
      solarStormEnergy: 0,
      relicProcs: 0,
      perkProcs: 0,
      synergyProcs: 0,
    };
  const nextContributions = alreadyCommitted
    ? run.contributions
    : {
        ...(run.contributions.voiceCompletions || encounterContribution.voiceCompletions ? { voiceCompletions: (run.contributions.voiceCompletions ?? 0) + (encounterContribution.voiceCompletions ?? 0), voiceEffort: (run.contributions.voiceEffort ?? 0) + (encounterContribution.voiceEffort ?? 0) } : {}),
        typedCompletions:
          run.contributions.typedCompletions +
          encounterContribution.typedCompletions,
        perfectCompletions:
          run.contributions.perfectCompletions +
          encounterContribution.perfectCompletions,
        acceptedTypedLetters:
          run.contributions.acceptedTypedLetters +
          encounterContribution.acceptedTypedLetters,
        weightedEffort:
          run.contributions.weightedEffort +
          encounterContribution.weightedEffort,
        longWordCompletions:
          run.contributions.longWordCompletions +
          encounterContribution.longWordCompletions,
        solarStormBonuses:
          run.contributions.solarStormBonuses +
          encounterContribution.solarStormBonuses,
        solarStormEnergy:
          run.contributions.solarStormEnergy +
          encounterContribution.solarStormEnergy,
        relicProcs:
          run.contributions.relicProcs +
          encounterContribution.relicProcs,
        perkProcs:
          run.contributions.perkProcs +
          encounterContribution.perkProcs,
        synergyProcs:
          run.contributions.synergyProcs +
          encounterContribution.synergyProcs,
      };

  const next: ExpeditionRun = {
    ...run,
    phase: "settlement",
    currentEncounterIndex: nextIndex,
    completedEncounters: completed,
    resources: sanitizeExpeditionResources(result.resources),
    totalScore: nextTotalScore,
    accuracySum: alreadyCommitted ? run.accuracySum : run.accuracySum + accuracy,
    contributions: nextContributions,
    ghostPoints: nextGhostPoints,
    committedEncounterIds: alreadyCommitted
      ? run.committedEncounterIds
      : [...run.committedEncounterIds, encounter.id],
    interrupted: false,
  };

  return nextIndex >= run.encounterPlan.length
    ? terminalExpeditionRun(next, "victory", "plan-complete")
    : next;
}

export function terminalExpeditionRun(
  run: ExpeditionRun,
  phase: ExpeditionTerminalPhase,
  reason: string,
): ExpeditionRun {
  if (run.terminal !== null) return run;
  return {
    ...run,
    phase,
    draftOffer: null,
    terminal: {
      phase,
      reason,
      completedEncounters: run.completedEncounters,
    },
  };
}

export function defeatExpeditionRun(run: ExpeditionRun): ExpeditionRun {
  return terminalExpeditionRun(run, "defeat", "player-defeat");
}

export function abandonExpeditionRun(run: ExpeditionRun): ExpeditionRun {
  return terminalExpeditionRun(run, "abandoned", "player-abandon");
}

export function currentExpeditionEncounter(
  run: ExpeditionRun,
): ExpeditionEncounterPlanItem | null {
  return run.encounterPlan[run.currentEncounterIndex] ?? null;
}
