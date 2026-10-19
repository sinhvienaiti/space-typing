import * as three from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadAuthoredShip } from "../src/duel/authored-ship";
import { loadModel, modelUrl } from "../src/render3d/model-loader";
import { loadShipVisualArt } from "../src/characters/ship-art";
import { disposeBuiltShipResources } from "../src/duel/ship3d-lifecycle";

vi.mock("../src/render3d/model-loader", () => ({ modelUrl: vi.fn(), loadModel: vi.fn() }));
vi.mock("../src/characters/ship-art", () => ({
  loadShipVisualArt: vi.fn(() => new Promise<void>(() => {})),
  shipVisualColors: () => undefined,
}));

function fixture() {
  const scene = new three.Group();
  scene.add(new three.Mesh(new three.BoxGeometry(1, 0.2, 2), new three.MeshStandardMaterial()));
  for (const name of ["FX_ENGINE_L", "FX_ENGINE_R", "FX_MUZZLE", "FX_CORE"]) {
    const socket = new three.Object3D(); socket.name = name; scene.add(socket);
  }
  return { scene, animations: [] } as unknown as Awaited<ReturnType<typeof loadModel>>;
}

afterEach(() => vi.clearAllMocks());

describe("authored ship and independent fallback loading", () => {
  it("shows a valid canonical GLB while fallback image decoding is still pending", async () => {
    vi.mocked(modelUrl).mockResolvedValue("razorwing.high.glb");
    vi.mocked(loadModel).mockResolvedValue(fixture());
    const ship = await loadAuthoredShip(three, "aegis", "high");
    expect(loadShipVisualArt).toHaveBeenCalledWith("razorwing");
    expect(modelUrl).toHaveBeenCalledWith("ships", "razorwing", "high");
    expect(ship?.group.userData.modelUrl).toBe("razorwing.high.glb");
    disposeBuiltShipResources(ship!);
  });

  it("starts canonical fallback preparation even when no GLB is available", async () => {
    vi.mocked(modelUrl).mockResolvedValue(null);
    expect(await loadAuthoredShip(three, "aegis", "high")).toBeNull();
    expect(loadShipVisualArt).toHaveBeenCalledWith("razorwing");
    expect(loadModel).not.toHaveBeenCalled();
  });

  it("does not start model or fallback preparation through the Low 3D path", async () => {
    expect(await loadAuthoredShip(three, "aegis", "low")).toBeNull();
    expect(modelUrl).not.toHaveBeenCalled();
    expect(loadShipVisualArt).not.toHaveBeenCalled();
  });
});
