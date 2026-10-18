import * as three from "three";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildAuthoredShip } from "../src/duel/authored-ship";
import { MODEL_CONTRACTS, missingSockets, type ModelManifest } from "../src/render3d/model-contracts";
import { pickModelTier } from "../src/render3d/model-loader";
import { disposeBuiltShipResources } from "../src/duel/ship3d-lifecycle";

function fixture(): three.Group {
  const model = new three.Group();
  model.position.set(5, 2, -1);
  const hull = new three.Group(); hull.name = "hull"; model.add(hull);
  hull.add(new three.Mesh(new three.BoxGeometry(2, 0.4, 4), new three.MeshStandardMaterial()));
  const spots: Record<string, number[]> = {
    FX_ENGINE_L: [-0.4, 0, 1.6], FX_ENGINE_R: [0.4, 0, 1.6],
    FX_MUZZLE: [0, 0, -2], FX_CORE: [0, 0.2, 0],
    FX_MUZZLE_L: [-0.4, 0, -0.6], FX_MUZZLE_R: [0.4, 0, -0.6],
    FX_WING_L: [-1, 0, 0], FX_WING_R: [1, 0, 0],
  };
  for (const [name, at] of Object.entries(spots)) {
    const socket = new three.Object3D(); socket.name = name;
    socket.position.set(at[0]!, at[1]!, at[2]!); hull.add(socket);
  }
  return model;
}

describe("authored ship in title and Duel", () => {
  it("centres and normalizes the hull and all weapon/engine sockets together", () => {
    const ship = buildAuthoredShip(three, fixture())!;
    expect(ship).not.toBeNull();
    expect(ship.halfWidth).toBeCloseTo(0.25);
    expect(new three.Box3().setFromObject(ship.group).getCenter(new three.Vector3()).length()).toBeCloseTo(0);
    expect(ship.nozzles.map(n => n.at.toArray())).toEqual([[-0.1, 0, 0.4], [0.1, 0, 0.4]]);
    expect(ship.muzzles.map(p => p.toArray())).toEqual([[-0.1, 0, -0.15], [0.1, 0, -0.15]]);
    expect(ship.lights.nose?.z).toBeCloseTo(-0.5);
    disposeBuiltShipResources(ship);
  });

  it("keeps animated socket positions local while the outer hull banks", () => {
    const idle = new three.AnimationClip("Ship_Idle", 1, [new three.NumberKeyframeTrack("hull.position[y]", [0, 1], [0, 0.2])]);
    const ship = buildAuthoredShip(three, fixture(), [idle])!;
    ship.group.rotation.set(0.1, 0.2, 0.3);
    ship.tick(0, 0); ship.tick(0.1, 1);
    expect(ship.nozzles[0]!.at.y).toBeCloseTo(0.005);
    expect(ship.nozzles[0]!.at.x).toBeCloseTo(-0.1);
    expect(ship.nozzles[0]!.at.z).toBeCloseTo(0.4);
    disposeBuiltShipResources(ship);
  });

  it("rejects incomplete models so the existing relief fallback stays usable", () => {
    const model = fixture();
    model.getObjectByName("FX_ENGINE_L")!.removeFromParent();
    expect(buildAuthoredShip(three, model)).toBeNull();
  });
});

describe("prepared Vanguard Meshy asset", () => {
  const root = new URL("../public", import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL("./assets/space-typing/models/manifest.json", root.href + "/"), "utf8")) as ModelManifest;
  const entry = manifest.models["ships/vanguard"]!;

  it("provides validated High/Medium exports while retaining G01", () => {
    expect(entry.triangles).toBeLessThanOrEqual(18_000);
    expect(missingSockets(MODEL_CONTRACTS.ships, entry.sockets)).toEqual([]);
    expect(entry.clips).toContain("Ship_Idle");
    expect(manifest.models["bosses/tyrant-g01"]).toBeDefined();
    expect(pickModelTier(entry, "medium")).toBe(entry.tiers.medium!.url);
    expect(pickModelTier(entry, "low")).toBeNull();
  });

  it.each(["high", "medium"] as const)("preserves nonzero sockets and actual file bytes in the %s GLB", tier => {
    const artifact = entry.tiers[tier]!;
    const bytes = readFileSync(new URL("." + artifact.url, root.href + "/"));
    expect(bytes.length).toBe(artifact.bytes);
    expect(new URL("." + artifact.url, root.href + "/").searchParams.get("v")).toBe(createHash("sha256").update(bytes).digest("hex").slice(0, 10));
    expect(bytes.toString("ascii", 0, 4)).toBe("glTF");
    const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12))) as { nodes: Array<{ name?: string; translation?: number[] }> };
    const socket = (name: string) => gltf.nodes.find(node => node.name === name)!.translation!;
    expect(socket("FX_ENGINE_L")[0]).toBeLessThan(0);
    expect(socket("FX_ENGINE_R")[0]).toBeGreaterThan(0);
    expect(socket("FX_ENGINE_L")[2]).toBeGreaterThan(0.5);
    expect(socket("FX_MUZZLE")[2]).toBeLessThan(-0.8);
    expect(socket("FX_MUZZLE_L")[2]).toBeLessThan(0);
  });
});
