export const VOICE_NAMESPACE = "typing-game:voice:v1";
export const VOICE_VERSION = 1;
export const VOICE_LIMITS = Object.freeze({ targets: 64, forms: 5, text: 200, id: 160 });

export function normalizeSpokenForm(value) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}
function object(value, name = "message") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name}: expected object`);
  return value;
}
function text(value, name, limit = VOICE_LIMITS.id) {
  if (typeof value !== "string" || !value.trim() || value.length > limit) throw new TypeError(`${name}: invalid text`);
  return value;
}
function integer(value, name, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new TypeError(`${name}: invalid integer`);
  return value;
}
function boolean(value, name) {
  if (typeof value !== "boolean") throw new TypeError(`${name}: expected boolean`);
  return value;
}
function milliseconds(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${name}: invalid time`);
  return value;
}
function oneOf(value, name, values) {
  if (!values.includes(value)) throw new TypeError(`${name}: unsupported value`);
  return value;
}
function list(value, name, max, parse) {
  if (!Array.isArray(value) || value.length > max) throw new TypeError(`${name}: oversized or invalid array`);
  return value.map((item) => parse(item, name));
}
export function parseTarget(value) {
  const v = object(value, "target");
  const forms = list(v.forms, "forms", VOICE_LIMITS.forms, (f) => normalizeSpokenForm(text(f, "form", VOICE_LIMITS.text)));
  if (!forms.length || new Set(forms).size !== forms.length) throw new TypeError("forms: empty or duplicate");
  return {
    unitId: text(v.unitId, "unitId"),
    unitVersion: integer(v.unitVersion, "unitVersion", 1),
    eligibilityVersion: integer(v.eligibilityVersion, "eligibilityVersion", 1),
    capability: oneOf(v.capability, "capability", ["word", "phrase", "action"]),
    forms,
    eligible: boolean(v.eligible, "eligible"),
    eligibleFromSample: integer(v.eligibleFromSample, "eligibleFromSample"),
  };
}
export function parseSnapshot(value) {
  const v = object(value, "snapshot");
  const targets = list(v.targets, "targets", VOICE_LIMITS.targets, parseTarget);
  if (new Set(targets.map((t) => t.unitId)).size !== targets.length) throw new TypeError("duplicate unitId");
  return {
    sessionId: text(v.sessionId, "sessionId"), inputEpoch: integer(v.inputEpoch, "inputEpoch"),
    audioEpoch: integer(v.audioEpoch, "audioEpoch"), snapshotId: text(v.snapshotId, "snapshotId"),
    registryRevision: integer(v.registryRevision, "registryRevision"),
    sampleRate: integer(v.sampleRate, "sampleRate", 8000, 192000),
    publishedAtSample: integer(v.publishedAtSample, "publishedAtSample"), targets,
  };
}
export function parseDetection(value) {
  const v = object(value, "detection");
  const start = integer(v.audioStartSample, "audioStartSample");
  const end = integer(v.audioEndSample, "audioEndSample", start + 1);
  const result = {
    sessionId: text(v.sessionId, "sessionId"), inputEpoch: integer(v.inputEpoch, "inputEpoch"),
    audioEpoch: integer(v.audioEpoch, "audioEpoch"), snapshotId: text(v.snapshotId, "snapshotId"),
    detectionId: text(v.detectionId, "detectionId"), streamEpoch: integer(v.streamEpoch, "streamEpoch"),
    unitId: text(v.unitId, "unitId"), unitVersion: integer(v.unitVersion, "unitVersion", 1),
    eligibilityVersion: integer(v.eligibilityVersion, "eligibilityVersion", 1),
    form: normalizeSpokenForm(text(v.form, "form", VOICE_LIMITS.text)),
    audioStartSample: start, audioEndSample: end,
    engineId: text(v.engineId, "engineId"), modelId: text(v.modelId, "modelId"),
    evidence: oneOf(v.evidence, "evidence", ["final-utterance", "validated-keyword"]),
    emittedAtMs: milliseconds(v.emittedAtMs, "emittedAtMs"),
  };
  if (v.score !== undefined) {
    if (!Number.isFinite(v.score)) throw new TypeError("score: non-finite");
    result.score = v.score;
    result.scoreKind = text(v.scoreKind, "scoreKind", 64);
  } else if (v.scoreKind !== undefined) throw new TypeError("scoreKind without score");
  return result;
}
export function isVoiceMessage(value) {
  return value !== null && typeof value === "object" && typeof value.type === "string" && value.type.startsWith("typing-game:voice:");
}
export function parseVoiceMessage(value) {
  const v = object(value);
  if (v.version !== VOICE_VERSION) throw new TypeError("unsupported voice protocol version");
  if (typeof v.type !== "string" || !v.type.startsWith(`${VOICE_NAMESPACE}:`)) throw new TypeError("unsupported voice namespace");
  if (Object.hasOwn(v, "pcm") || Object.hasOwn(v, "audio") || Object.hasOwn(v, "samples")) throw new TypeError("raw audio is not an iframe payload");
  const base = { version: 1, type: v.type, gameId: text(v.gameId, "gameId", 64), gameInstanceId: text(v.gameInstanceId, "gameInstanceId") };
  const op = v.type.slice(VOICE_NAMESPACE.length + 1);
  const session = () => ({ sessionId: text(v.sessionId, "sessionId"), inputEpoch: integer(v.inputEpoch, "inputEpoch") });
  switch (op) {
    case "hello": {
      const versions = list(v.versions, "versions", 4, (x) => integer(x, "version", 1, 100));
      if (!versions.length || new Set(versions).size !== versions.length) throw new TypeError("invalid versions");
      return { ...base, versions };
    }
    case "configure": return { ...base, mode: oneOf(v.mode, "mode", ["typing", "voice", "hybrid"]), language: oneOf(v.language, "language", ["en"]), policyVersion: text(v.policyVersion, "policyVersion", 64), inputEpoch: integer(v.inputEpoch, "inputEpoch") };
    case "start": return { ...base, inputEpoch: integer(v.inputEpoch, "inputEpoch") };
    case "capabilities": return { ...base, offlineEngineAvailable: boolean(v.offlineEngineAvailable, "offlineEngineAvailable"), reason: text(v.reason, "reason", 300) };
    case "ready": return { ...base, ...session(), audioEpoch: integer(v.audioEpoch, "audioEpoch"), engineId: text(v.engineId, "engineId"), modelId: text(v.modelId, "modelId"), sampleRate: integer(v.sampleRate, "sampleRate", 8000, 192000) };
    case "targets": return { ...base, ...parseSnapshot(v) };
    case "targets-applied": {
      const ready = list(v.ready, "ready", VOICE_LIMITS.targets, (x) => text(x, "unitId"));
      const unsupported = list(v.unsupported, "unsupported", VOICE_LIMITS.targets, (x) => text(x, "unitId"));
      const all = [...ready, ...unsupported];
      if (all.length > VOICE_LIMITS.targets || new Set(all).size !== all.length) throw new TypeError("invalid target classifications");
      return { ...base, ...session(), audioEpoch: integer(v.audioEpoch, "audioEpoch"), snapshotId: text(v.snapshotId, "snapshotId"), ready, unsupported, appliedAtSample: integer(v.appliedAtSample, "appliedAtSample") };
    }
    case "detection": return { ...base, ...parseDetection(v) };
    case "resolution": return { ...base, ...session(), detectionId: text(v.detectionId, "detectionId"), accepted: boolean(v.accepted, "accepted"), reason: text(v.reason, "reason", 64) };
    case "suspend": case "resume": case "stop": case "stopped": return { ...base, ...session() };
    case "listening": case "listening-resumed": return { ...base, ...session(), audioEpoch: integer(v.audioEpoch, "audioEpoch"), fromSample: integer(v.fromSample, "fromSample") };
    case "audio-output-intent": case "audio-output-ended": return { ...base, ...session(), generation: integer(v.generation, "generation", 1) };
    case "gate-closed": return { ...base, ...session(), generation: integer(v.generation, "generation", 1), fromSample: integer(v.fromSample, "fromSample") };
    case "error": return { ...base, code: text(v.code, "code", 64), message: text(v.message, "message", 300) };
    default: throw new TypeError(`unsupported voice operation: ${op}`);
  }
}
