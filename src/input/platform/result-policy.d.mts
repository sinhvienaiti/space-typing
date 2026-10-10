import type { VoiceTarget } from "./protocol.mjs";
export type LiveVoiceTarget = VoiceTarget & { keyboardOwned: boolean; resolving?: boolean; terminal?: boolean };
export type VoiceResolution = { accepted: boolean; reason: string; detectionId: string; unitId: string; duplicate: boolean };
export class VoiceResultPolicy {
  constructor(options?: { retentionSeconds?: number; resultTtlMs?: number; maxSnapshots?: number; maxReceipts?: number });
  barrier(context: { sessionId: string; inputEpoch: number; audioEpoch: number; sampleRate: number; fromSample: number; engineId: string; modelId: string }): void;
  publish(snapshot: unknown): void;
  acknowledge(snapshotId: string, ready: string[], atSample: number): void;
  resolve(detection: unknown, liveTargets: readonly LiveVoiceTarget[], nowSample: number): VoiceResolution;
}
