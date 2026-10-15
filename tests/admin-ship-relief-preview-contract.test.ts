import { describe, expect, it } from "vitest";
import {
  ASSET_PREVIEW_PROTOCOL_VERSION,
  parseAssetPreviewCommand,
} from "../src/admin/asset-preview-protocol";
import {
  createShipAssetPreviewCandidate,
  updateShipAssetPreviewCandidate,
} from "../src/admin/ship-asset-preview";

function command(reliefAssetVersionId: unknown) {
  return {
    protocolVersion: ASSET_PREVIEW_PROTOCOL_VERSION,
    previewSessionId: "preview-session-1234",
    nonce: "preview-nonce-5678",
    requestId: 1,
    type: "LOAD_CANDIDATE",
    payload: {
      domain: "ship",
      characterId: "vanguard",
      visual: { primary: "#123456" },
      reliefAssetVersionId,
    },
  } as const;
}

describe("A5.4 Ship relief preview contract", () => {
  it("accepts an exact immutable Media bundle as an ephemeral candidate", () => {
    const exact = "media-version.ship-vanguard-relief-v8";
    expect(parseAssetPreviewCommand(command(exact)).type).toBe("LOAD_CANDIDATE");

    const candidate = createShipAssetPreviewCandidate(
      "vanguard",
      { primary: "#123456" },
      undefined,
      undefined,
      exact,
    );
    expect(candidate.reliefPreviewRequested).toBe(true);
    expect(candidate.reliefAssetVersionId).toBe(exact);
    expect(candidate.session.activeRevision).toBe("admin-preview-ephemeral");
  });

  it("uses explicit null only for bundled relief preview without persisting a fake id", () => {
    expect(parseAssetPreviewCommand(command(null)).type).toBe("LOAD_CANDIDATE");
    const candidate = createShipAssetPreviewCandidate(
      "aegis",
      { glow: "#abcdef" },
      undefined,
      undefined,
      null,
    );
    expect(candidate.reliefPreviewRequested).toBe(true);
    expect(candidate.reliefAssetVersionId).toBeNull();
    expect(candidate.session.ships.aegis?.reliefAssetVersionId).toBeUndefined();
  });

  it.each([
    "latest",
    "media.ship-vanguard-relief",
    "/tmp/vanguard.glb",
    "https://cdn.example.test/vanguard.glb",
  ])("rejects non-exact relief preview input: %s", (value) => {
    expect(() => parseAssetPreviewCommand(command(value))).toThrow();
    expect(() => createShipAssetPreviewCandidate(
      "vanguard",
      { primary: "#123456" },
      undefined,
      undefined,
      value,
    )).toThrow();
  });

  it("retains exact relief ownership while visual tuning re-materializes an isolated session", () => {
    const exact = "media-version.ship-vanguard-relief-v9";
    const candidate = createShipAssetPreviewCandidate(
      "vanguard",
      { primary: "#123456" },
      undefined,
      undefined,
      exact,
    );
    const updated = updateShipAssetPreviewCandidate(candidate, { wingSpan: 1.3 });
    expect(updated.session).not.toBe(candidate.session);
    expect(updated.reliefPreviewRequested).toBe(true);
    expect(updated.reliefAssetVersionId).toBe(exact);
  });
});