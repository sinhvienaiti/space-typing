import { parseDetection, parseSnapshot, normalizeSpokenForm } from "./protocol.mjs";
import { matchSnapshot } from "./target-snapshot.mjs";

/** All clock arithmetic uses capture samples. The caller claims gameplay synchronously after acceptance. */
export class VoiceResultPolicy {
  constructor({ retentionSeconds = 10, resultTtlMs = 750, maxSnapshots = 512, maxReceipts = 4096 } = {}) {
    if (!Number.isFinite(retentionSeconds) || retentionSeconds < 10 || !Number.isFinite(resultTtlMs) || resultTtlMs <= 0 || retentionSeconds * 1000 <= resultTtlMs) throw new RangeError("invalid history/TTL policy");
    if (!Number.isSafeInteger(maxSnapshots) || maxSnapshots < 1 || !Number.isSafeInteger(maxReceipts) || maxReceipts < 1) throw new RangeError("invalid capacity policy");
    Object.assign(this, { retentionSeconds, resultTtlMs, maxSnapshots, maxReceipts });
    this.snapshots = new Map(); this.receipts = new Map(); this.blocked = false; this.context = null; this.latestSnapshotId = null;
  }
  barrier(context) {
    const { sessionId, inputEpoch, audioEpoch, sampleRate, fromSample, engineId, modelId } = context;
    // Reuse parsers rather than accepting a different, looser session schema.
    parseSnapshot({ sessionId, inputEpoch, audioEpoch, sampleRate, snapshotId: "barrier", registryRevision: 0, publishedAtSample: fromSample, targets: [] });
    if (typeof engineId !== "string" || !engineId.trim() || typeof modelId !== "string" || !modelId.trim()) throw new TypeError("engine/model identity required");
    const newSession = this.context?.sessionId !== sessionId;
    if (this.context && !newSession && (inputEpoch < this.context.inputEpoch || audioEpoch < this.context.audioEpoch || fromSample < this.context.fromSample)) throw new RangeError("barrier cannot move backwards");
    if (this.context && !newSession && (sampleRate !== this.context.sampleRate || engineId !== this.context.engineId || modelId !== this.context.modelId)) throw new RangeError("capture/engine change requires a new session");
    if (newSession) { this.snapshots.clear(); this.receipts.clear(); this.latestSnapshotId = null; }
    else if (this.latestSnapshotId && (inputEpoch !== this.context.inputEpoch || audioEpoch !== this.context.audioEpoch)) {
      this.snapshots.get(this.latestSnapshotId).supersededAtSample = fromSample;
      this.latestSnapshotId = null;
    }
    this.context = { ...context }; this.blocked = false;
  }
  prune(nowSample) {
    if (!this.context || !Number.isSafeInteger(nowSample)) return;
    const oldest = nowSample - this.retentionSeconds * this.context.sampleRate;
    // A stable live snapshot can remain current for a long boss word. Retention starts
    // when it is superseded, so churn does not erase an utterance's original mapping.
    for (const [id, s] of this.snapshots) if (s.supersededAtSample !== null && s.supersededAtSample < oldest) this.snapshots.delete(id);
    for (const [id, r] of this.receipts) if (r.atSample < oldest) this.receipts.delete(id);
  }
  publish(value) {
    const snapshot = parseSnapshot(value);
    const c = this.context;
    if (!c || snapshot.sessionId !== c.sessionId || snapshot.inputEpoch !== c.inputEpoch || snapshot.audioEpoch !== c.audioEpoch || snapshot.sampleRate !== c.sampleRate || snapshot.publishedAtSample < c.fromSample) throw new TypeError("snapshot does not belong to current barrier");
    if (this.snapshots.has(snapshot.snapshotId)) throw new TypeError("snapshotId must never be reused");
    const previous = this.snapshots.get(this.latestSnapshotId);
    if (previous && snapshot.publishedAtSample < previous.snapshot.publishedAtSample) throw new RangeError("snapshot sample clock cannot move backwards");
    this.prune(snapshot.publishedAtSample);
    if (this.snapshots.size >= this.maxSnapshots) { this.blocked = true; throw new RangeError("snapshot-history-capacity"); }
    if (previous) previous.supersededAtSample = snapshot.publishedAtSample;
    this.snapshots.set(snapshot.snapshotId, { snapshot, ready: new Set(), acknowledged: false, appliedAtSample: null, supersededAtSample: null });
    this.latestSnapshotId = snapshot.snapshotId;
  }
  acknowledge(snapshotId, ready, atSample) {
    const item = this.snapshots.get(snapshotId);
    if (!item || !Number.isSafeInteger(atSample) || atSample < item.snapshot.publishedAtSample || item.acknowledged) throw new TypeError("invalid/repeated targets ACK");
    const valid = new Set(item.snapshot.targets.map((t) => t.unitId));
    if (!Array.isArray(ready) || new Set(ready).size !== ready.length || ready.some((id) => !valid.has(id))) throw new TypeError("unknown/duplicate ready unit");
    item.ready = new Set(ready); item.acknowledged = true; item.appliedAtSample = atSample;
  }
  resolve(value, liveTargets, nowSample) {
    const d = parseDetection(value);
    if (!Number.isSafeInteger(nowSample) || nowSample < 0) throw new TypeError("invalid capture clock");
    this.prune(nowSample);
    const receiptKey = `${d.sessionId}\0${d.detectionId}`;
    const prior = this.receipts.get(receiptKey);
    if (prior) return { ...prior.outcome, duplicate: true };
    const finish = (accepted, reason) => {
      const outcome = { accepted, reason, detectionId: d.detectionId, unitId: d.unitId, duplicate: false };
      if (this.receipts.size >= this.maxReceipts) { this.blocked = true; return { ...outcome, accepted: false, reason: "receipt-capacity" }; }
      this.receipts.set(receiptKey, { outcome, detection: d, atSample: nowSample });
      return outcome;
    };
    const c = this.context;
    if (this.blocked) return finish(false, "history-unavailable");
    if (!c || d.sessionId !== c.sessionId) return finish(false, "stale-session");
    if (d.inputEpoch !== c.inputEpoch) return finish(false, "stale-input-epoch");
    if (d.audioEpoch !== c.audioEpoch) return finish(false, "stale-audio-epoch");
    if (d.engineId !== c.engineId || d.modelId !== c.modelId) return finish(false, "engine-mismatch");
    if (d.audioEndSample > nowSample || d.audioStartSample < c.fromSample) return finish(false, "invalid-audio-window");
    if (nowSample - d.audioEndSample > c.sampleRate * this.resultTtlMs / 1000) return finish(false, "expired-result");
    const item = this.snapshots.get(d.snapshotId);
    if (!item || !item.acknowledged || !item.ready.has(d.unitId)) return finish(false, "targets-not-ready");
    const s = item.snapshot;
    if (s.sessionId !== d.sessionId || s.inputEpoch !== d.inputEpoch || s.audioEpoch !== d.audioEpoch) return finish(false, "snapshot-epoch-mismatch");
    const suppressed = liveTargets.filter((t) => t.keyboardOwned).flatMap((t) => t.forms);
    const match = matchSnapshot(s, d.form, suppressed);
    if (match.status !== "matched") return finish(false, match.status);
    const old = match.targets[0];
    if (old.unitId !== d.unitId || old.unitVersion !== d.unitVersion || old.eligibilityVersion !== d.eligibilityVersion) return finish(false, "snapshot-unit-mismatch");
    const live = liveTargets.find((t) => t.unitId === d.unitId);
    if (!live || live.terminal || live.resolving) return finish(false, "unit-terminal");
    if (live.keyboardOwned) return finish(false, "keyboard-owned");
    if (!live.eligible || live.unitVersion !== old.unitVersion || live.eligibilityVersion !== old.eligibilityVersion) return finish(false, "eligibility-changed");
    if (d.audioStartSample < Math.max(old.eligibleFromSample, live.eligibleFromSample, item.appliedAtSample)) return finish(false, "audio-before-ready");
    const key = normalizeSpokenForm(d.form);
    if (!live.forms.some((f) => normalizeSpokenForm(f) === key)) return finish(false, "spoken-form-changed");
    if (liveTargets.filter((t) => t.eligible && !t.terminal && !t.keyboardOwned && t.forms.some((f) => normalizeSpokenForm(f) === key)).length !== 1) return finish(false, "ambiguous");
    for (const receipt of this.receipts.values()) {
      const priorDetection = receipt.detection;
      if (priorDetection.sessionId === d.sessionId && priorDetection.audioEpoch === d.audioEpoch && priorDetection.form === d.form && Math.max(priorDetection.audioStartSample, d.audioStartSample) < Math.min(priorDetection.audioEndSample, d.audioEndSample)) return finish(false, "replayed-audio");
    }
    return finish(true, "accepted");
  }
}
