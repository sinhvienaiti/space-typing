import * as three from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShipModel3D, drawShip3D, setShip3DQuality } from "../src/render3d/ship-model";
import { loadModel } from "../src/render3d/model-loader";
import { renderShared } from "../src/render3d/shared-renderer";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

vi.mock("../src/render3d/model-loader", () => ({
  modelEntry: vi.fn(async () => ({tiers:{medium:{url:"ship.medium.glb"},high:{url:"ship.high.glb"}}})),
  pickModelTier: (entry: {tiers:Record<string,{url:string}>}, quality:string) => quality === "low" ? null : entry.tiers[quality]!.url,
  loadModel: vi.fn(),
}));
vi.mock("../src/render3d/shared-renderer", () => ({
  loadThree: () => import("three"), sharedRenderer: async () => ({}), sharedRendererLost: () => false,
  drawFrame3D: vi.fn(),
  renderShared: vi.fn((scene:three.Scene,camera:three.Camera) => {scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);return {source:{}};}),
}));
const pose = {size:78,banking:0,time:1,boost:.3,recoil:0};
const context = {save:vi.fn(),rotate:vi.fn(),restore:vi.fn()} as unknown as CanvasRenderingContext2D;
function fixture(): GLTF {
  const scene = new three.Group();
  scene.add(new three.Mesh(new three.BoxGeometry(1,.1,2),new three.MeshStandardMaterial()));
  for(const [name,x,z] of [["FX_ENGINE_L",-.3,.8],["FX_ENGINE_R",.3,.8],["FX_MUZZLE_L",-.25,-.7],["FX_MUZZLE_R",.25,-.7],["FX_MUZZLE",0,-1],["FX_CORE",0,0]] as const){const socket=new three.Object3D();socket.name=name;socket.position.set(x,0,z);scene.add(socket);}
  return {scene,animations:[]} as unknown as GLTF;
}
afterEach(() => {setShip3DQuality("low",1);vi.clearAllMocks();});
describe("Campaign model runtime", () => {
  it("uses Medium at High and reuses projected socket arrays across frames", async () => {
    const gltf=fixture();vi.mocked(loadModel).mockResolvedValue(gltf);
    const model=(await ShipModel3D.load("vanguard","high"))!;
    expect(loadModel).toHaveBeenCalledWith("ship.medium.glb");
    const first=model.draw(context,pose)!;
    expect(first.nozzles).toHaveLength(2);expect(first.muzzles).toHaveLength(2);
    expect(first.nozzles[0]![0]).toBeLessThan(0);expect(first.nozzles[0]![1]).toBeGreaterThan(0);
    expect(first.muzzle![1]).toBeLessThan(0);
    const point=first.nozzles[0];
    expect(model.draw(context,{...pose,banking:.1,time:2})).toBe(first);
    expect(first.nozzles[0]).toBe(point);
    expect(renderShared).toHaveBeenCalledTimes(2);
    model.dispose();expect(model.draw(context,pose)).toBeNull();
  });
  it("disposes an obsolete asynchronous load after quality changes", async () => {
    let resolve!: (model:GLTF)=>void;
    vi.mocked(loadModel).mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
    setShip3DQuality("high",1);
    expect(drawShip3D(context,"vanguard",pose)).toBeNull();
    await vi.waitFor(()=>expect(loadModel).toHaveBeenCalled());
    const gltf=fixture();const mesh=gltf.scene.children[0] as three.Mesh;
    const dispose=vi.spyOn(mesh.geometry,"dispose");
    setShip3DQuality("low",1);
    resolve(gltf);
    await vi.waitFor(()=>expect(dispose).toHaveBeenCalledTimes(1));
  });
});
