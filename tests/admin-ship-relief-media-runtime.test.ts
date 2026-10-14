import { describe, expect, it } from "vitest";
import {
  ReliefRuntimeMediaError,
  resolveExactShipReliefBundle,
} from "../src/duel/relief-media-runtime";

const VERSION = "media-version.11111111-2222-3333-4444-555555555555";
const SHA = "a".repeat(64);
const FINGERPRINT = "b".repeat(64);

function runtimePayload(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    assetId: "runtime.ship-model.vanguard",
    assetVersionId: VERSION,
    kind: "model",
    provenance: "generated-runtime",
    contentFingerprint: FINGERPRINT,
    components: [
      { role: "color", mimeType: "image/webp", format: "webp", byteSize: 10, sha256: SHA, runtimeUrl: "/assets/space-typing/ships/3d/vanguard/color.webp" },
      { role: "emissive", mimeType: "image/webp", format: "webp", byteSize: 11, sha256: SHA, runtimeUrl: "/assets/space-typing/ships/3d/vanguard/emissive.webp" },
      { role: "height", mimeType: "application/octet-stream", format: "bin", byteSize: 12, sha256: SHA, runtimeUrl: "/assets/space-typing/ships/3d/vanguard/height.bin" },
      { role: "model", mimeType: "application/json", format: "json", byteSize: 13, sha256: SHA, runtimeUrl: "/assets/space-typing/ships/3d/vanguard/model.json" },
    ],
    ...overrides,
  };
}

function fetchJson(payload: unknown, status = 200): typeof fetch {
  return (async () => new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  })) as typeof fetch;
}

describe("A5.4 exact relief Media bundle resolver", () => {
  it("resolves the exact immutable four-component production relief bundle", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return new Response(JSON.stringify(runtimePayload()), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    const resolved = await resolveExactShipReliefBundle(fetchImpl, VERSION);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`/api/runtime/space-typing/media/versions/${VERSION}`);
    expect(calls[0]?.init).toMatchObject({ method: "GET", cache: "no-store", credentials: "same-origin" });
    expect(resolved.assetVersionId).toBe(VERSION);
    expect(resolved.contentFingerprint).toBe(FINGERPRINT);
    expect(Object.keys(resolved.components).sort()).toEqual(["color", "emissive", "height", "model"]);
    expect(resolved.components.model.runtimeUrl).toBe("/assets/space-typing/ships/3d/vanguard/model.json");
  });

  it("rejects logical/current aliases and arbitrary paths before network access", async () => {
    const fetchImpl = fetchJson(runtimePayload());
    await expect(resolveExactShipReliefBundle(fetchImpl, "runtime.ship-model.vanguard"))
      .rejects.toBeInstanceOf(ReliefRuntimeMediaError);
    await expect(resolveExactShipReliefBundle(fetchImpl, "/assets/space-typing/ships/3d/vanguard/model.json"))
      .rejects.toBeInstanceOf(ReliefRuntimeMediaError);
    await expect(resolveExactShipReliefBundle(fetchImpl, "https://example.test/model.json"))
      .rejects.toBeInstanceOf(ReliefRuntimeMediaError);
  });

  it("fails closed when a required bundle role is missing", async () => {
    const payload = runtimePayload();
    payload.components = payload.components.filter((component) => component.role !== "height");
    await expect(resolveExactShipReliefBundle(fetchJson(payload), VERSION))
      .rejects.toThrow(/missing required height component/);
  });

  it("rejects duplicate roles, unsafe URLs, wrong kind and wrong MIME", async () => {
    const duplicate = runtimePayload();
    duplicate.components = [...duplicate.components, { ...duplicate.components[0] }];
    await expect(resolveExactShipReliefBundle(fetchJson(duplicate), VERSION))
      .rejects.toThrow(/duplicate color components/);

    const unsafe = runtimePayload();
    unsafe.components = unsafe.components.map((component) =>
      component.role === "model" ? { ...component, runtimeUrl: "https://example.test/model.json" } : component,
    );
    await expect(resolveExactShipReliefBundle(fetchJson(unsafe), VERSION))
      .rejects.toThrow(/same-origin runtime path/);

    await expect(resolveExactShipReliefBundle(fetchJson(runtimePayload({ kind: "image" })), VERSION))
      .rejects.toThrow(/runtime response is incompatible/);

    const wrongMime = runtimePayload();
    wrongMime.components = wrongMime.components.map((component) =>
      component.role === "height" ? { ...component, mimeType: "application/json" } : component,
    );
    await expect(resolveExactShipReliefBundle(fetchJson(wrongMime), VERSION))
      .rejects.toThrow(/height component must use application\/octet-stream/);
  });

  it("requires immutable fingerprint and per-component SHA metadata", async () => {
    await expect(resolveExactShipReliefBundle(fetchJson(runtimePayload({ contentFingerprint: "not-a-sha" })), VERSION))
      .rejects.toThrow(/runtime response is incompatible/);

    const noSha = runtimePayload();
    noSha.components = noSha.components.map((component) =>
      component.role === "color" ? { ...component, sha256: undefined } : component,
    );
    await expect(resolveExactShipReliefBundle(fetchJson(noSha), VERSION))
      .rejects.toThrow(/color component requires SHA-256 metadata/);
  });
});
