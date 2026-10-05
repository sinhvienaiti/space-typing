import {
  validateReflexCandidates,
  type ReflexCandidate,
  type ReflexChallengeKind,
  type ReflexPublicChallenge,
} from "../../../src/duel/reflex";
import type { DuelModeEpoch } from "../../../src/duel/game-mode";

export type ReflexPrivateChallenge = Readonly<{
  publicChallenge: ReflexPublicChallenge;
  correctCandidateId: string;
}>;

type ReviewedReflexEntry = Readonly<{
  id: string;
  kind: ReflexChallengeKind;
  prompt: string;
  correctToken: string;
  distractors: readonly [string, string];
}>;

const REVIEWED_REFLEX_PILOT: readonly ReviewedReflexEntry[] = [
  { id: "vn-en-001", kind: "translation-vn-en", prompt: "con mèo", correctToken: "cat", distractors: ["dog", "sun"] },
  { id: "vn-en-002", kind: "translation-vn-en", prompt: "con chó", correctToken: "dog", distractors: ["cat", "book"] },
  { id: "vn-en-003", kind: "translation-vn-en", prompt: "quyển sách", correctToken: "book", distractors: ["chair", "milk"] },
  { id: "vn-en-004", kind: "translation-vn-en", prompt: "nước", correctToken: "water", distractors: ["bread", "train"] },
  { id: "vn-en-005", kind: "translation-vn-en", prompt: "quả táo", correctToken: "apple", distractors: ["grape", "table"] },
  { id: "vn-en-006", kind: "translation-vn-en", prompt: "trường học", correctToken: "school", distractors: ["garden", "river"] },
  { id: "vn-en-007", kind: "translation-vn-en", prompt: "bác sĩ", correctToken: "doctor", distractors: ["teacher", "driver"] },
  { id: "vn-en-008", kind: "translation-vn-en", prompt: "nhanh", correctToken: "fast", distractors: ["slow", "soft"] },
  { id: "vn-en-009", kind: "translation-vn-en", prompt: "màu xanh dương", correctToken: "blue", distractors: ["red", "green"] },
  { id: "vn-en-010", kind: "translation-vn-en", prompt: "ngủ", correctToken: "sleep", distractors: ["read", "write"] },
  { id: "vn-en-011", kind: "translation-vn-en", prompt: "ăn", correctToken: "eat", distractors: ["drink", "walk"] },
  { id: "vn-en-012", kind: "translation-vn-en", prompt: "chạy", correctToken: "run", distractors: ["sit", "sing"] },
  { id: "definition-001", kind: "definition", prompt: "A place where you can borrow books", correctToken: "library", distractors: ["hospital", "market"] },
  { id: "definition-002", kind: "definition", prompt: "A person whose job is to teach students", correctToken: "teacher", distractors: ["doctor", "farmer"] },
  { id: "definition-003", kind: "definition", prompt: "A vehicle that flies through the sky", correctToken: "airplane", distractors: ["bicycle", "subway"] },
  { id: "definition-004", kind: "definition", prompt: "Feeling pleased because something good happened", correctToken: "happy", distractors: ["angry", "tired"] },
  { id: "synonym-001", kind: "synonym", prompt: "Synonym of: quick", correctToken: "fast", distractors: ["slow", "heavy"] },
  { id: "synonym-002", kind: "synonym", prompt: "Synonym of: begin", correctToken: "start", distractors: ["finish", "carry"] },
  { id: "synonym-003", kind: "synonym", prompt: "Synonym of: large", correctToken: "big", distractors: ["tiny", "early"] },
  { id: "synonym-004", kind: "synonym", prompt: "Synonym of: silent", correctToken: "quiet", distractors: ["noisy", "bright"] },
  { id: "antonym-001", kind: "antonym", prompt: "Antonym of: hot", correctToken: "cold", distractors: ["tall", "clean"] },
  { id: "antonym-002", kind: "antonym", prompt: "Antonym of: early", correctToken: "late", distractors: ["near", "open"] },
  { id: "antonym-003", kind: "antonym", prompt: "Antonym of: strong", correctToken: "weak", distractors: ["fresh", "empty"] },
  { id: "antonym-004", kind: "antonym", prompt: "Antonym of: empty", correctToken: "full", distractors: ["tall", "deep"] },
  { id: "cloze-001", kind: "cloze-one-token", prompt: "She ___ to school every day.", correctToken: "goes", distractors: ["eats", "sleeps"] },
  { id: "cloze-002", kind: "cloze-one-token", prompt: "I ___ water when I am thirsty.", correctToken: "drink", distractors: ["write", "drive"] },
  { id: "cloze-003", kind: "cloze-one-token", prompt: "They ___ football on Sundays.", correctToken: "play", distractors: ["read", "cook"] },
  { id: "cloze-004", kind: "cloze-one-token", prompt: "The sun ___ in the east.", correctToken: "rises", distractors: ["falls", "sits"] },
] as const;

function rotate<T>(values: readonly T[], offset: number): T[] {
  if (values.length === 0) return [];
  const normalized = ((offset % values.length) + values.length) % values.length;
  return [...values.slice(normalized), ...values.slice(0, normalized)];
}

function candidateId(index: number): string {
  return ["alpha", "bravo", "charlie"][index] ?? `candidate-${index}`;
}

function safeIndex(value: number, length: number): number {
  if (!Number.isFinite(value) || length <= 0) return 0;
  return Math.abs(Math.trunc(value)) % length;
}

export function reviewedReflexPilotSize(): number {
  return REVIEWED_REFLEX_PILOT.length;
}

export function reviewedReflexKinds(): readonly ReflexChallengeKind[] {
  return [...new Set(REVIEWED_REFLEX_PILOT.map((entry) => entry.kind))];
}

export function createReviewedReflexChallenge(input: {
  index: number;
  modeEpoch: DuelModeEpoch;
  issuedAtMs: number;
  durationMs?: number;
}): ReflexPrivateChallenge {
  const entryIndex = safeIndex(input.index, REVIEWED_REFLEX_PILOT.length);
  const entry = REVIEWED_REFLEX_PILOT[entryIndex]!;
  const tokens = rotate(
    [entry.correctToken, ...entry.distractors],
    entryIndex % 3,
  );
  const candidates: ReflexCandidate[] = tokens.map((token, index) => ({
    candidateId: candidateId(index),
    token,
  }));
  const validationErrors = validateReflexCandidates(candidates);
  if (validationErrors.length > 0) {
    throw new Error(`Invalid reviewed Reflex challenge ${entry.id}: ${validationErrors.join(" ")}`);
  }

  const correct = candidates.find((candidate) => candidate.token === entry.correctToken);
  if (correct === undefined) {
    throw new Error(`Correct answer missing from Reflex challenge ${entry.id}.`);
  }
  const durationMs = Math.max(2_000, Math.min(60_000, input.durationMs ?? 12_000));
  const issuedAtMs = Number.isFinite(input.issuedAtMs)
    ? Math.max(0, Math.trunc(input.issuedAtMs))
    : 0;

  return {
    publicChallenge: {
      challengeId: entry.id,
      modeEpoch: input.modeEpoch,
      kind: entry.kind,
      prompt: entry.prompt,
      candidates,
      issuedAtMs,
      deadlineAtMs: issuedAtMs + durationMs,
    },
    correctCandidateId: correct.candidateId,
  };
}

export function correctReflexToken(
  challenge: ReflexPrivateChallenge,
): string {
  const candidate = challenge.publicChallenge.candidates.find(
    (item) => item.candidateId === challenge.correctCandidateId,
  );
  if (candidate === undefined) throw new Error("Private Reflex answer bank is inconsistent.");
  return candidate.token;
}
