export const ASSET_PREVIEW_PROTOCOL_VERSION = 1 as const;

const TOKEN_PATTERN = /^[A-Za-z0-9._:-]{8,160}$/;
const ASSET_VERSION_ID_PATTERN = /^media-version\.[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const COMMAND_TYPES = new Set([
  "LOAD_CANDIDATE",
  "SET_SCENARIO",
  "SET_TUNING",
  "RESET",
  "PAUSE",
  "DISPOSE",
]);
const SCENARIOS = new Set(["idle", "move", "fire"]);

export type AssetPreviewScenario = "idle" | "move" | "fire";

export type AssetPreviewCommand = Readonly<{
  protocolVersion: typeof ASSET_PREVIEW_PROTOCOL_VERSION;
  previewSessionId: string;
  nonce: string;
  requestId: number;
  type:
    | "LOAD_CANDIDATE"
    | "SET_SCENARIO"
    | "SET_TUNING"
    | "RESET"
    | "PAUSE"
    | "DISPOSE";
  payload?: unknown;
}>;

export type AssetPreviewResponseType = "READY" | "APPLIED" | "ERROR" | "DISPOSED";

export class AssetPreviewProtocolError extends Error {
  constructor(
    readonly code:
      | "wrong-origin"
      | "wrong-source"
      | "bad-message"
      | "bad-protocol"
      | "wrong-session"
      | "wrong-nonce"
      | "stale-request",
    message: string,
  ) {
    super(message);
  }
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function requiredToken(value: unknown, label: string): string {
  if (typeof value !== "string" || !TOKEN_PATTERN.test(value)) {
    throw new AssetPreviewProtocolError("bad-message", `${label} is invalid.`);
  }
  return value;
}

export function parseAssetPreviewCommand(value: unknown): AssetPreviewCommand {
  const input = object(value);
  if (input === null) throw new AssetPreviewProtocolError("bad-message", "Preview message must be an object.");
  if (input.protocolVersion !== ASSET_PREVIEW_PROTOCOL_VERSION) {
    throw new AssetPreviewProtocolError("bad-protocol", "Unsupported preview protocol version.");
  }
  const previewSessionId = requiredToken(input.previewSessionId, "previewSessionId");
  const nonce = requiredToken(input.nonce, "nonce");
  if (!Number.isSafeInteger(input.requestId) || (input.requestId as number) < 1) {
    throw new AssetPreviewProtocolError("bad-message", "requestId must be a positive safe integer.");
  }
  if (typeof input.type !== "string" || !COMMAND_TYPES.has(input.type)) {
    throw new AssetPreviewProtocolError("bad-message", "Unknown preview command.");
  }

  if (input.type === "SET_SCENARIO") {
    const payload = object(input.payload);
    if (payload === null || typeof payload.scenario !== "string" || !SCENARIOS.has(payload.scenario)) {
      throw new AssetPreviewProtocolError("bad-message", "SET_SCENARIO payload is invalid.");
    }
  }
  if (input.type === "PAUSE") {
    const payload = object(input.payload);
    if (payload === null || typeof payload.paused !== "boolean") {
      throw new AssetPreviewProtocolError("bad-message", "PAUSE payload is invalid.");
    }
  }
  if (input.type === "LOAD_CANDIDATE") {
    const payload = object(input.payload);
    if (
      payload === null ||
      payload.domain !== "ship" ||
      typeof payload.characterId !== "string" ||
      object(payload.visual) === null ||
      (payload.imageAssetVersionId !== undefined &&
        (typeof payload.imageAssetVersionId !== "string" ||
          !ASSET_VERSION_ID_PATTERN.test(payload.imageAssetVersionId)))
    ) {
      throw new AssetPreviewProtocolError("bad-message", "LOAD_CANDIDATE payload is invalid.");
    }
  }
  if (input.type === "SET_TUNING") {
    const payload = object(input.payload);
    if (payload === null || object(payload.visual) === null) {
      throw new AssetPreviewProtocolError("bad-message", "SET_TUNING payload is invalid.");
    }
  }

  return Object.freeze({
    protocolVersion: ASSET_PREVIEW_PROTOCOL_VERSION,
    previewSessionId,
    nonce,
    requestId: input.requestId as number,
    type: input.type as AssetPreviewCommand["type"],
    ...(input.payload === undefined ? {} : { payload: input.payload }),
  });
}

export class AssetPreviewMessageGate {
  private lastRequestId = 0;

  constructor(
    private readonly expectedOrigin: string,
    private readonly expectedSource: MessageEventSource,
    private readonly previewSessionId: string,
    private readonly nonce: string,
  ) {
    requiredToken(previewSessionId, "previewSessionId");
    requiredToken(nonce, "nonce");
    if (!/^https?:\/\//.test(expectedOrigin)) {
      throw new TypeError("AssetPreviewMessageGate requires an exact http(s) origin.");
    }
  }

  accept(event: Pick<MessageEvent, "origin" | "source" | "data">): AssetPreviewCommand {
    if (event.origin !== this.expectedOrigin) {
      throw new AssetPreviewProtocolError("wrong-origin", "Preview command origin rejected.");
    }
    if (event.source !== this.expectedSource) {
      throw new AssetPreviewProtocolError("wrong-source", "Preview command source rejected.");
    }
    const command = parseAssetPreviewCommand(event.data);
    if (command.previewSessionId !== this.previewSessionId) {
      throw new AssetPreviewProtocolError("wrong-session", "Preview session rejected.");
    }
    if (command.nonce !== this.nonce) {
      throw new AssetPreviewProtocolError("wrong-nonce", "Preview nonce rejected.");
    }
    if (command.requestId <= this.lastRequestId) {
      throw new AssetPreviewProtocolError("stale-request", "Preview request is stale.");
    }
    this.lastRequestId = command.requestId;
    return command;
  }
}

export function createAssetPreviewResponse(
  previewSessionId: string,
  nonce: string,
  type: AssetPreviewResponseType,
  requestId: number,
  payload?: unknown,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    protocolVersion: ASSET_PREVIEW_PROTOCOL_VERSION,
    previewSessionId,
    nonce,
    requestId,
    type,
    ...(payload === undefined ? {} : { payload }),
  });
}

export function assetPreviewScenario(value: unknown): AssetPreviewScenario {
  if (typeof value === "string" && SCENARIOS.has(value)) return value as AssetPreviewScenario;
  throw new AssetPreviewProtocolError("bad-message", "Unsupported preview scenario.");
}
