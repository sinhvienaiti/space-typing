import { afterEach, describe, expect, it, vi } from "vitest";
import { DuelCombatVisuals } from "../src/duel/combat-visuals";
import { DuelShip3D } from "../src/duel/ship3d";
afterEach(()=>vi.restoreAllMocks());
describe("leaving Duel while a hull loads",()=>{
  it("disposes the late result and can load again on a later visit",async()=>{
    let resolve!:(model:DuelShip3D)=>void;
    vi.spyOn(DuelShip3D,"loadFresh").mockImplementationOnce(()=>new Promise(done=>{resolve=done;})).mockResolvedValue(null);
    const state=Object.assign(Object.create(DuelCombatVisuals.prototype),{
      quality:"high",ship3dGeneration:0,rival3dGeneration:0,ship3d:null,rival3d:null,ship3dFor:null,rival3dFor:null,clear:vi.fn(),
    });
    const request=state.requestShip3D("vanguard");
    state.dispose();
    const old={dispose:vi.fn()} as unknown as DuelShip3D;resolve(old);await request;
    expect(old.dispose).toHaveBeenCalledTimes(1);expect(state.ship3d).toBeNull();
    await state.requestShip3D("vanguard");expect(DuelShip3D.loadFresh).toHaveBeenCalledTimes(2);
  });
});
