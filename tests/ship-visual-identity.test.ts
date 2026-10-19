import { afterEach, describe, expect, it, vi } from "vitest";
import { CHARACTER_IDS } from "../src/characters/registry";
import catalog from "../src/characters/ship-visual-catalog.json";

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
describe("cosmetic ship identity", () => {
  it("maps all existing gameplay slots in order without introducing a twelfth CharacterId", async () => {
    const { resolveShipVisualId, defaultShipVisualId } = await import("../src/characters/ship-visual");
    expect(CHARACTER_IDS).toHaveLength(11);
    for (const [index,id] of CHARACTER_IDS.entries()) {
      expect(defaultShipVisualId(id)).toBe(catalog[index]!.id);
      expect(resolveShipVisualId(id)).toBe(catalog[index]!.id);
    }
  });
  it("persists Eternal independently, notifies renderers and supports restore to the default", async () => {
    const data = new Map<string,string>();
    vi.stubGlobal("localStorage",{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)});
    const visual = await import("../src/characters/ship-visual");
    const changed = vi.fn(); const unsubscribe=visual.subscribeShipVisuals(changed);
    expect(visual.setShipVisualOverride("aegis","eternal-sovereign")).toBe(true);
    expect(visual.resolveShipVisualId("aegis")).toBe("eternal-sovereign");
    expect(visual.resolveShipVisualId("vanguard")).toBe("vanguard");
    expect([...data.keys()]).toEqual(["space-typing.ship-visuals.v1"]);
    expect(visual.setShipVisualOverride("aegis","unknown")).toBe(false);
    expect(changed).toHaveBeenCalledTimes(1);
    visual.setShipVisualOverride("aegis",null);
    expect(visual.resolveShipVisualId("aegis")).toBe("razorwing");
    unsubscribe();
  });
  it("ignores corrupt/unknown cosmetic saves and works when storage is unavailable", async () => {
    vi.stubGlobal("localStorage",{getItem:()=>'{"aegis":"not-a-model","unknown":"vanguard"}',setItem:()=>{throw Error("disabled");}});
    const visual = await import("../src/characters/ship-visual");
    expect(visual.resolveShipVisualId("aegis")).toBe("razorwing");
    expect(visual.setShipVisualOverride("aegis","eternal-sovereign")).toBe(true);
    expect(visual.shipVisualImageUrl("aegis")).toContain("/eternal-sovereign/color.webp");
  });
});
