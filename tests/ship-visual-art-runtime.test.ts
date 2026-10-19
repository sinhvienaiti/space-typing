import { afterEach, describe, expect, it, vi } from "vitest";
import { loadShipVisualArt, shipVisualColors, shipVisualImage, shipVisualLightRig } from "../src/characters/ship-art";
import { setShipVisualOverride } from "../src/characters/ship-visual";
import { chaseSprite } from "../src/characters/chase-art";

afterEach(() => {
  setShipVisualOverride("vanguard", null);
  vi.unstubAllGlobals();
});

describe("canonical ship fallback art", () => {
  it("decodes one shared visual image and derives its own effect anchors", async () => {
    const images: Array<{ src: string; decoding: string; naturalWidth: number; naturalHeight: number }> = [];
    vi.stubGlobal("Image", class {
      src = "";
      decoding = "";
      naturalWidth = 640;
      naturalHeight = 1024;
      constructor() { images.push(this); }
      async decode(): Promise<void> {}
    });
    const colors = { hot: "#ffffff", plume: "#ffaa22", outer: "#dd3311", accent: "#ffee44" };
    const fetch = vi.fn(async () => new Response(JSON.stringify({
      color: "color.webp?v=abc123", nozzles: [[0.25, 0.8, 0.04], [0.75, 0.8, 0.04]],
      anchors: { canopy: [0.5, 0.3], nose: [0.5, 0.04], wingtips: [[0.1, 0.6], [0.9, 0.6]] }, colors,
    }), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetch);
    await Promise.all([loadShipVisualArt("eternal-sovereign"), loadShipVisualArt("eternal-sovereign")]);
    setShipVisualOverride("vanguard", "eternal-sovereign");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/assets/space-typing/ships/3d/eternal-sovereign/model.json", { cache: "no-cache" });
    expect(images).toHaveLength(1);
    expect(images[0]?.src).toBe("/assets/space-typing/ships/3d/eternal-sovereign/color.webp?v=abc123");
    expect(shipVisualImage("vanguard")).toBe(images[0]);
    expect(shipVisualColors("eternal-sovereign")).toEqual(colors);
    const rig = shipVisualLightRig("vanguard")!;
    expect(rig.nozzles[0]?.[0]).toBeCloseTo(-12.1875);
    expect(rig.nozzles[0]?.[1]).toBeCloseTo(23.4);
    expect(rig.plume).toBe("#ffaa22");
    // A missing rear view keeps the selected canonical top view available.
    expect(chaseSprite("vanguard")).toBeNull();
  });

  it("keeps legacy fallback available when a canonical image cannot be loaded", async () => {
    vi.stubGlobal("Image", class {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response("missing", { status: 404 })));
    await loadShipVisualArt("razorwing");
    expect(shipVisualImage("aegis")).toBeNull();
    expect(shipVisualLightRig("aegis")).toBeNull();
  });
});
