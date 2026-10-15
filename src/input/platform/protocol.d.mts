export type InputMode = "typing" | "voice" | "hybrid";
export type VoiceTarget = {
  unitId: string; unitVersion: number; eligibilityVersion: number;
  capability: "word" | "phrase" | "action"; forms: string[];
  eligible: boolean; eligibleFromSample: number;
};
export type VoiceSnapshot = {
  sessionId: string; inputEpoch: number; audioEpoch: number; snapshotId: string;
  registryRevision: number; sampleRate: number; publishedAtSample: number; targets: VoiceTarget[];
};
export type VoiceDetection = {
  sessionId: string; inputEpoch: number; audioEpoch: number; snapshotId: string;
  detectionId: string; streamEpoch: number; unitId: string; unitVersion: number;
  eligibilityVersion: number; form: string; audioStartSample: number; audioEndSample: number;
  engineId: string; modelId: string; evidence: "final-utterance" | "validated-keyword";
  emittedAtMs: number; score?: number; scoreKind?: string;
};
export type VoiceMessage = Record<string, unknown> & {
  version: 1; type: string; gameId: string; gameInstanceId: string;
};
export type VoiceFeedback = {
  sessionId: string; inputEpoch: number; audioEpoch: number; feedbackId: string;
  streamEpoch: number; result: "recognized" | "unrecognized"; transcript: string | null;
  evidence: "final-utterance" | "validated-keyword";
  detectionId?: string; audioStartSample: number; audioEndSample: number;
  engineId: string; modelId: string; emittedAtMs: number;
};
export const VOICE_NAMESPACE: string;
export const VOICE_VERSION: 1;
export const VOICE_LIMITS: Readonly<{ targets: number; forms: number; text: number; id: number }>;
export function normalizeSpokenForm(value: string): string;
export function parseTarget(value: unknown): VoiceTarget;
export function parseSnapshot(value: unknown): VoiceSnapshot;
export function parseDetection(value: unknown): VoiceDetection;
export function parseFeedback(value: unknown): VoiceFeedback;
export function isVoiceMessage(value: unknown): boolean;
export function parseVoiceMessage(value: unknown): VoiceMessage;
