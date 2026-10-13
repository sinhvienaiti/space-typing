import { describe, expect, it } from "vitest";
import { materializeShipRuntimeSession } from "../src/admin/ship-runtime-policy";
import {
  characterShipRuntimeImage,
  preloadShipRuntimeImages,
  releaseShipRuntimeImages,
  resolveExactShipImageComponent,
  withCharacterShipMediaRuntimeSession,
} from "../src/characters/ship-media-runtime";

const VERSION_ID = "media-version.11111111-2222-3333-4444-555555555555";

type MutableImageStub = {
  decoding: HTMLImageElement["decoding"];
  naturalWidth: number;
  naturalHeight: number;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  _src: string;
  src: string;
};

function sessionWithImage(assetVersionId: string = VERSION_ID) {
  return materializeShipRuntimeSession({
    activeRevision: "revision-test",
    applyBoundary: "new-session",
    policy: {
      configRevision: "ships-image-test",
      ships: {
        vanguard: {
          imageAssetVersionId: assetVersionId,
          visual: { wingSpan: 1.1 },
        },
      },
    },
  });
}

function runtimeResponse(overrides: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({
    schemaVersion: 1,
    assetVersionId: VERSION_ID,
    assetId: "media.ship-vanguard",
    kind: "image",
    provenance: "admin-upload",
    components: [
      {
        role: "primary",
        mimeType: "image/webp",
        runtimeUrl: `/api/runtime/space-typing/media/blobs/${VERSION_ID}/primary?v=abc123`,
        width: 1024,
        height: 1024,
      },
    ],
    ...overrides,
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("A5.2 exact-version Ship image runtime", () => {
  it("materializes only exact immutable Media V2 version identifiers", () => {
    const accepted = sessionWithImage();
    expect(accepted.source).toBe("published");
    expect(accepted.ships.vanguard?.imageAssetVersionId).toBe(VERSION_ID);

    const rawUrl = sessionWithImage("https://example.test/ship.webp");
    expect(rawUrl.ships.vanguard).toBeUndefined();

    const rawPath = sessionWithImage("/assets/ship.webp");
    expect(rawPath.ships.vanguard).toBeUndefined();
  });

  it("resolves the exact version through the public runtime Media boundary", async () => {
    const calls: Array<{ input: string; init?: RequestInit }> = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input: String(input), init });
      return runtimeResponse();
    }) as typeof fetch;

    const component = await resolveExactShipImageComponent(fetchImpl, VERSION_ID);
    expect(component).toMatchObject({
      role: "primary",
      mimeType: "image/webp",
      width: 1024,
      height: 1024,
    });
    expect(component.runtimeUrl).toMatch(/^\/api\/runtime\/space-typing\/media\/blobs\//);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toContain(encodeURIComponent(VERSION_ID));
    expect(calls[0]?.init?.credentials).toBe("same-origin");
  });

  it("fails closed for non-image versions and unsafe component URLs", async () => {
    const wrongKind = (async () => runtimeResponse({ kind: "model" })) as typeof fetch;
    await expect(resolveExactShipImageComponent(wrongKind, VERSION_ID)).rejects.toThrow(
      "incompatible",
    );

    const unsafeUrl = (async () => runtimeResponse({
      components: [{ role: "primary", mimeType: "image/png", runtimeUrl: "https://evil.example/ship.png" }],
    })) as typeof fetch;
    await expect(resolveExactShipImageComponent(unsafeUrl, VERSION_ID)).rejects.toThrow(
      "same-origin runtime path",
    );
  });

  it("loads image bytes into an isolated runtime session and releases them", async () => {
    const session = sessionWithImage();
    const fetchImpl = (async () => runtimeResponse()) as typeof fetch;

    const imageStub: MutableImageStub = {
      decoding: "auto",
      naturalWidth: 0,
      naturalHeight: 0,
      onload: null,
      onerror: null,
      _src: "",
      set src(value: string) {
        this._src = value;
        if (value.length === 0) return;
        this.naturalWidth = 1024;
        this.naturalHeight = 1024;
        queueMicrotask(() => this.onload?.());
      },
      get src() {
        return this._src;
      },
    };
    const fake = imageStub as unknown as HTMLImageElement;

    await preloadShipRuntimeImages(session, fetchImpl, () => fake);
    expect(characterShipRuntimeImage("vanguard", session)).toBe(fake);
    expect(withCharacterShipMediaRuntimeSession(session, () => characterShipRuntimeImage("vanguard"))).toBe(fake);

    releaseShipRuntimeImages(session);
    expect(characterShipRuntimeImage("vanguard", session)).toBeNull();
    expect(fake.src).toBe("");
  });
});