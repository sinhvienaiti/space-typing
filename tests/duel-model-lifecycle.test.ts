import { afterEach, describe, expect, it, vi } from "vitest";
import { DuelCombatVisuals } from "../src/duel/combat-visuals";
import { DuelShip3D } from "../src/duel/ship3d";
import { setShipVisualOverride } from "../src/characters/ship-visual";
afterEach(()=>{vi.restoreAllMocks();setShipVisualOverride("vanguard",null);});
describe("leaving Duel while a hull loads",()=>{
  it("disposes the late result and can load again on a later visit",async()=>{
    let resolve!:(model:DuelShip3D)=>void;
    vi.spyOn(DuelShip3D,"loadFresh").mockImplementationOnce(()=>new Promise(done=>{resolve=done;})).mockResolvedValue(null);
    const state=Object.assign(Object.create(DuelCombatVisuals.prototype),{
      quality:"high",ship3dGeneration:0,rival3dGeneration:0,ship3d:null,rival3d:null,ship3dFor:null,rival3dFor:null,clear:vi.fn(),unsubscribeShipVisuals:vi.fn(),
    });
    const request=state.requestShip3D("vanguard");
    state.dispose();
    const old={dispose:vi.fn()} as unknown as DuelShip3D;resolve(old);await request;
    expect(old.dispose).toHaveBeenCalledTimes(1);expect(state.ship3d).toBeNull();
    await state.requestShip3D("vanguard");expect(DuelShip3D.loadFresh).toHaveBeenCalledTimes(2);
  });

  it("replaces a pending hull when its cosmetic identity changes without changing gameplay ID", async () => {
    let resolve!: (model: DuelShip3D) => void;
    const fresh = { dispose: vi.fn() } as unknown as DuelShip3D;
    vi.spyOn(DuelShip3D, "loadFresh").mockImplementationOnce(() => new Promise(done => { resolve = done; })).mockResolvedValueOnce(fresh);
    const state = Object.assign(Object.create(DuelCombatVisuals.prototype), {
      quality: "high", ship3dGeneration: 0, ship3d: null, ship3dFor: null,
    });
    const first = state.requestShip3D("vanguard");
    setShipVisualOverride("vanguard", "eternal-sovereign");
    await state.requestShip3D("vanguard");
    const stale = { dispose: vi.fn() } as unknown as DuelShip3D;
    resolve(stale);
    await first;
    expect(stale.dispose).toHaveBeenCalledTimes(1);
    expect(state.ship3d).toBe(fresh);
    expect(DuelShip3D.loadFresh).toHaveBeenCalledTimes(2);
  });

  it("does not start a hull load at Low quality", async () => {
    const load = vi.spyOn(DuelShip3D, "loadFresh").mockResolvedValue(null);
    const state = Object.assign(Object.create(DuelCombatVisuals.prototype), { quality: "low" });
    await state.requestShip3D("vanguard");
    state.requestRival3D("vanguard");
    expect(load).not.toHaveBeenCalled();
  });
});
