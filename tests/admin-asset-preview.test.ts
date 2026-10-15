import { describe, expect, it } from "vitest";
import { ACTIVE_SHIP_RUNTIME_SESSION } from "../src/admin/ship-runtime-policy";
import {
  createShipAssetPreviewCandidate,
  shipAssetPreviewPresentation,
  updateShipAssetPreviewCandidate,
  withShipAssetPreviewRuntime,
} from "../src/admin/ship-asset-preview";
import {
  AssetPreviewMessageGate,
  AssetPreviewProtocolError,
  ASSET_PREVIEW_PROTOCOL_VERSION,
  parseAssetPreviewCommand,
} from "../src/admin/asset-preview-protocol";
import { characterVisualProfile } from "../src/characters/visuals";

const sessionId = "preview-session-1234";
const nonce = "preview-nonce-5678";

function command(requestId = 1) {
  return {
    protocolVersion: ASSET_PREVIEW_PROTOCOL_VERSION,
    previewSessionId: sessionId,
    nonce,
    requestId,
    type: "LOAD_CANDIDATE",
    payload: {
      domain: "ship",
      characterId: "vanguard",
      visual: { primary: "#123456", wingSpan: 1.4 },
    },
  } as const;
}

describe("A5 child preview protocol", () => {
  it("accepts only exact origin/source/session/nonce with monotonic requests", () => {
    const source = {} as MessageEventSource;
    const gate = new AssetPreviewMessageGate("https://admin.example.test", source, sessionId, nonce);
    expect(gate.accept({
      origin: "https://admin.example.test",
      source,
      data: command(1),
    }).requestId).toBe(1);

    expect(() => gate.accept({
      origin: "https://evil.example.test",
      source,
      data: command(2),
    })).toThrowError(AssetPreviewProtocolError);
    expect(() => gate.accept({
      origin: "https://admin.example.test",
      source: {} as MessageEventSource,
      data: command(2),
    })).toThrowError(AssetPreviewProtocolError);
    expect(() => gate.accept({
      origin: "https://admin.example.test",
      source,
      data: command(1),
    })).toThrowError(expect.objectContaining({ code: "stale-request" }));
  });

  it("rejects malformed protocol and unsupported scenarios", () => {
    expect(() => parseAssetPreviewCommand({ ...command(), protocolVersion: 99 })).toThrowError(
      expect.objectContaining({ code: "bad-protocol" }),
    );
    expect(() => parseAssetPreviewCommand({
      ...command(),
      type: "SET_SCENARIO",
      payload: { scenario: "invented-skill-vfx" },
    })).toThrowError(expect.objectContaining({ code: "bad-message" }));
  });
});

describe("A5 isolated Ship visual preview candidate", () => {
  it("uses the same canonical presentation values as production without mutating ACTIVE session", () => {
    const activeBefore = ACTIVE_SHIP_RUNTIME_SESSION;
    const productionBefore = characterVisualProfile("vanguard");
    const candidate = createShipAssetPreviewCandidate("vanguard", {
      primary: "#123456",
      glow: "#abcdef",
      wingSpan: 1.4,
      engineCount: 3,
    });
    const explicit = shipAssetPreviewPresentation(candidate);

    const scoped = withShipAssetPreviewRuntime(candidate, () => characterVisualProfile("vanguard"));
    expect(scoped).toBe(explicit);
    expect(scoped).toMatchObject({
      primary: "#123456",
      glow: "#abcdef",
      wingSpan: 1.4,
      engineCount: 3,
    });
    expect(ACTIVE_SHIP_RUNTIME_SESSION).toBe(activeBefore);
    expect(characterVisualProfile("vanguard")).toBe(productionBefore);
  });

  it("restores the previous visual context even when production rendering throws", () => {
    const before = characterVisualProfile("aegis");
    const candidate = createShipAssetPreviewCandidate("aegis", { primary: "#010203" });
    expect(() => withShipAssetPreviewRuntime(candidate, () => {
      expect(characterVisualProfile("aegis").primary).toBe("#010203");
      throw new Error("render failed");
    })).toThrow("render failed");
    expect(characterVisualProfile("aegis")).toBe(before);
  });

  it("fails closed for raw paths, unsupported fields and invalid tuning patches", () => {
    expect(() => createShipAssetPreviewCandidate("vanguard", {
      primary: "#123456",
      arbitraryPath: "/tmp/not-runtime-owned.png",
    })).toThrow();

    const candidate = createShipAssetPreviewCandidate("vanguard", { wingSpan: 1.1 });
    expect(() => updateShipAssetPreviewCandidate(candidate, { wingSpan: 99 })).toThrow();
  });

  it("re-materializes tuning without changing candidate identity or published state", () => {
    const candidate = createShipAssetPreviewCandidate("volt", { glow: "#112233" });
    const updated = updateShipAssetPreviewCandidate(candidate, { wingSpan: 1.5 });
    expect(updated.characterId).toBe(candidate.characterId);
    expect(updated.session).not.toBe(candidate.session);
    expect(shipAssetPreviewPresentation(updated)).toMatchObject({ glow: "#112233", wingSpan: 1.5 });
    expect(updated.session.activeRevision).toBe("admin-preview-ephemeral");
  });
});
