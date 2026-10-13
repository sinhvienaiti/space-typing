import { describe, expect, it, vi } from "vitest";
import {
  RUNTIME_MEDIA_BASE,
  RuntimeMediaValidationError,
  fetchExactRuntimeMediaVersion,
  resolveCurrentReliefRuntimeBundle,
  validateRuntimeMediaVersion,
} from "../src/media/runtime-media";

const fingerprint = "a".repeat(64);
const versionId = "media-version.ship-vanguard-a";

function reliefEnvelope() {
  return {
    schemaVersion: 1,
    assetId: "runtime.ship-model.vanguard",
    assetVersionId: versionId,
    kind: "model",
    provenance: "generated-runtime",
    contentFingerprint: fingerprint,
    components: [
      {
        role: "color",
        mimeType: "image/webp",
        format: "webp",
        storageClass: "runtime-reference",
        runtimeUrl: "/assets/space-typing/ships/3d/vanguard/color.webp",
      },
      {
        role: "emissive",
        mimeType: "image/webp",
        format: "webp",
        storageClass: "runtime-reference",
        runtimeUrl: "/assets/space-typing/ships/3d/vanguard/emissive.webp",
      },
      {
        role: "height",
        mimeType: "application/octet-stream",
        format: "bin",
        storageClass: "runtime-reference",
        runtimeUrl: "/assets/space-typing/ships/3d/vanguard/height.bin",
      },
      {
        role: "model",
        mimeType: "application/json",
        format: "json",
        storageClass: "runtime-reference",
        runtimeUrl: "/assets/space-typing/ships/3d/vanguard/model.json",
      },
    ],
  };
}

describe("runtime media exact-version resolution", () => {
  it("validates the exact requested version and keeps only runtime-safe component fields", () => {
    const input = reliefEnvelope();
    const resolved = validateRuntimeMediaVersion(input, versionId);

    expect(resolved.assetVersionId).toBe(versionId);
    expect(resolved.components).toHaveLength(4);
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.components)).toBe(true);
  });

  it("rejects mismatched exact versions and cross-origin component URLs", () => {
    expect(() => validateRuntimeMediaVersion(reliefEnvelope(), "media-version.other")).toThrow(
      RuntimeMediaValidationError,
    );

    const external = reliefEnvelope();
    external.components[0] = {
      ...external.components[0],
      runtimeUrl: "https://cdn.example.invalid/color.webp",
    };
    expect(() => validateRuntimeMediaVersion(external, versionId)).toThrow(RuntimeMediaValidationError);
  });

  it("fetches only the exact immutable runtime endpoint and rejects current/latest aliases", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(reliefEnvelope()), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));

    const resolved = await fetchExactRuntimeMediaVersion(versionId, { fetchImpl: fetchImpl as typeof fetch });
    expect(resolved.assetVersionId).toBe(versionId);
    expect(fetchImpl).toHaveBeenCalledWith(
      `${RUNTIME_MEDIA_BASE}/versions/${encodeURIComponent(versionId)}`,
      expect.objectContaining({ cache: "no-store" }),
    );

    await expect(fetchExactRuntimeMediaVersion("current", { fetchImpl: fetchImpl as typeof fetch })).rejects.toThrow(
      RuntimeMediaValidationError,
    );
    await expect(fetchExactRuntimeMediaVersion("latest", { fetchImpl: fetchImpl as typeof fetch })).rejects.toThrow(
      RuntimeMediaValidationError,
    );
  });
});

describe("current relief runtime profile", () => {
  it("accepts only the four generated relief components used by production", () => {
    expect(resolveCurrentReliefRuntimeBundle(reliefEnvelope(), versionId)).toEqual({
      assetId: "runtime.ship-model.vanguard",
      assetVersionId: versionId,
      modelUrl: "/assets/space-typing/ships/3d/vanguard/model.json",
      colorUrl: "/assets/space-typing/ships/3d/vanguard/color.webp",
      emissiveUrl: "/assets/space-typing/ships/3d/vanguard/emissive.webp",
      heightUrl: "/assets/space-typing/ships/3d/vanguard/height.bin",
    });
  });

  it("rejects arbitrary GLB, missing relief components and non-generated profiles", () => {
    const glb = {
      ...reliefEnvelope(),
      components: [{
        role: "primary",
        mimeType: "model/gltf-binary",
        format: "glb",
        storageClass: "runtime-reference",
        runtimeUrl: "/assets/ships/arbitrary.glb",
      }],
    };
    expect(() => resolveCurrentReliefRuntimeBundle(glb, versionId)).toThrow(RuntimeMediaValidationError);

    const missing = reliefEnvelope();
    missing.components = missing.components.filter((item) => item.role !== "height");
    expect(() => resolveCurrentReliefRuntimeBundle(missing, versionId)).toThrow(RuntimeMediaValidationError);

    const uploaded = { ...reliefEnvelope(), provenance: "admin-upload" };
    expect(() => resolveCurrentReliefRuntimeBundle(uploaded, versionId)).toThrow(RuntimeMediaValidationError);
  });
});
