import { environmentForWorld } from "../worlds/environment";
import {
  STAGES_PER_WORLD,
  WORLD_COUNT,
  plannedWorldStageRole,
  stageInWorld,
  worldById,
  worldForStage,
} from "../worlds/registry";
import { sceneProfileForWorld } from "../worlds/scene-registry";
import { WorldSceneRenderer } from "../worlds/scene-renderer";
import type { WorldProfile } from "../worlds/types";

type WorldStagePreviewDomain = "world" | "stage";

type WorldStagePreviewCandidate = Readonly<{
  domain: WorldStagePreviewDomain;
  world: WorldProfile;
  stage: number | null;
  stageInWorld: number | null;
  stageRole: string | null;
}>;

export class WorldStageAssetPreviewScene {
  private readonly renderer = new WorldSceneRenderer();
  private candidate: WorldStagePreviewCandidate | null = null;

  get activeCandidate(): WorldStagePreviewCandidate | null {
    return this.candidate;
  }

  loadWorld(worldId: string): Readonly<Record<string, unknown>> {
    const world = worldById(worldId);
    if (world === undefined) throw new Error(`Unknown World preview id: ${worldId}.`);
    this.renderer.invalidate();
    this.candidate = Object.freeze({
      domain: "world",
      world,
      stage: null,
      stageInWorld: null,
      stageRole: null,
    });
    return Object.freeze({
      worldId: world.id,
      name: world.name,
      galaxy: world.galaxy,
      stageStart: world.stageStart,
      stageEnd: world.stageEnd,
      sceneProfileId: sceneProfileForWorld(world).id,
      renderer: "WorldSceneRenderer",
      scenarios: ["idle"],
    });
  }

  loadStage(stage: number): Readonly<Record<string, unknown>> {
    const maxStage = WORLD_COUNT * STAGES_PER_WORLD;
    if (!Number.isSafeInteger(stage) || stage < 1 || stage > maxStage) {
      throw new Error(`Stage preview must be an integer from 1 to ${maxStage}.`);
    }
    const world = worldForStage(stage);
    const localStage = stageInWorld(stage);
    const role = plannedWorldStageRole(stage);
    this.renderer.invalidate();
    this.candidate = Object.freeze({
      domain: "stage",
      world,
      stage,
      stageInWorld: localStage,
      stageRole: role,
    });
    return Object.freeze({
      stage,
      stageInWorld: localStage,
      stageRole: role,
      worldId: world.id,
      worldName: world.name,
      galaxy: world.galaxy,
      sceneProfileId: sceneProfileForWorld(world).id,
      renderer: "WorldSceneRenderer",
      scenarios: ["idle"],
    });
  }

  draw(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    dpr: number,
    time: number,
  ): void {
    const active = this.candidate;
    if (active === null) return;
    this.renderer.draw(context, {
      profile: sceneProfileForWorld(active.world),
      environment: environmentForWorld(active.world),
      quality: "high",
      width,
      height,
      dpr,
      time,
      stars: [],
    });
  }

  reset(): void {
    this.candidate = null;
    this.renderer.invalidate();
  }

  destroy(): void {
    this.candidate = null;
    this.renderer.destroy();
  }
}
