import {
  validateReflexCandidates,
  type ReflexCandidate,
  type ReflexPublicChallenge,
} from "../../../src/duel/reflex";
import type { DuelModeEpoch } from "../../../src/duel/game-mode";

export type ReflexPrivateChallenge = Readonly<{
  publicChallenge: ReflexPublicChallenge;
  correctCandidateId: string;
}>;

type ReviewedReflexEntry = Readonly<{
  id: string;
  prompt: string;
  correctToken: string;
  distractors: readonly [string, string];
}>;

const REVIEWED_VN_EN_PILOT: readonly ReviewedReflexEntry[] = [
  { id: "vn-en-001", prompt: "con mèo", correctToken: "cat", distractors: ["dog", "sun"] },
  { id: "vn-en-002", prompt: "con chó", correctToken: "dog", distractors: ["cat", "book"] },
  { id: "vn-en-003", prompt: "quyển sách", correctToken: "book", distractors: ["chair", "milk"] },
  { id: "vn-en-004", prompt: "nước", correctToken: "water", distractors: ["bread", "train"] },
  { id: "vn-en-005", prompt: "quả táo", correctToken: "apple", distractors: ["grape", "table"] },
  { id: "vn-en-006", prompt: "trường học", correctToken: "school", distractors: ["garden", "river"] },
  { id: "vn-en-007", prompt: "bác sĩ", correctToken: "doctor", distractors: ["teacher", "driver"] },
  { id: "vn-en-008", prompt: "nhanh", correctToken: "fast", distractors: ["slow", "soft"] },
  { id: "vn-en-009", prompt: "màu xanh dương", correctToken: "blue", distractors: ["red", "green"] },
  { id: "vn-en-010", prompt: "ngủ", correctToken: "sleep", distractors: ["read", "write"] },
  { id: "vn-en-011", prompt: "ăn", correctToken: "eat", distractors: ["drink", "walk"] },
  { id: "vn-en-012", prompt: "chạy", correctToken: "run", distractors: ["sit", "sing"] },
] as const;

function rotate<T>(values: readonly T[], offset: number): T[] {
  if (values.length === 0) return [];
  const normalized = ((offset % values.length) + values.length) % values.length;
  return [...values.slice(normalized), ...values.slice(0, normalized)];
}

function candidateId(index: number): string {
  return ["alpha", "bravo", "charlie"][index] ?? `candidate-${index}`;
}

export function reviewedReflexPilotSize(): number {
  return REVIEWED_VN_EN_PILOT.length;
}

export function createReviewedReflexChallenge(input: {
  index: number;
  modeEpoch: DuelModeEpoch;
  issuedAtMs: number;
  durationMs?: number;
}): ReflexPrivateChallenge {
  const entry = REVIEWED_VN_EN_PILOT[
    Math.abs(Math.trunc(input.index)) % REVIEWED_VN_EN_PILOT.length
  ]!;
  const tokens = rotate(
    [entry.correctToken, ...entry.distractors],
    Math.abs(Math.trunc(input.index)) % 3,
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
  const issuedAtMs = Math.max(0, Math.trunc(input.issuedAtMs));

  return {
    publicChallenge: {
      challengeId: entry.id,
      modeEpoch: input.modeEpoch,
      kind: "translation-vn-en",
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
