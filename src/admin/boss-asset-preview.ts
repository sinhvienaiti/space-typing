import { allBossIdentities, type BossIdentity } from "../boss/identity";
import { familyStyle } from "../enemies/identity";
import {
  drawPaintedSprite,
  paintedBossArtUrl,
  paintedBossSprite,
  preloadPaintedSprites,
} from "../enemies/painted-sprites";
import { CombatFxSystem, drawBossAura } from "../vfx/combat-fx";
import type { AssetPreviewScenario } from "./asset-preview-protocol";

export const BOSS_ASSET_PREVIEW_SCENARIOS = ["idle", "phase", "hit", "death"] as const;
export type BossAssetPreviewScenario = (typeof BOSS_ASSET_PREVIEW_SCENARIOS)[number];

export type BossAssetPreviewCandidate = Readonly<{
  bossId: string;
  identity: BossIdentity;
}>;

function isBossScenario(value: AssetPreviewScenario): value is BossAssetPreviewScenario {
  return (BOSS_ASSET_PREVIEW_SCENARIOS as readonly string[]).includes(value);
}

export class BossAssetPreviewScene {
  private readonly fx = new CombatFxSystem();
  private candidate: BossAssetPreviewCandidate | null = null;
  private scenario: BossAssetPreviewScenario = "idle";
  private scenarioStartedAt = 0;
  private eventFired = false;

  get activeCandidate(): BossAssetPreviewCandidate | null {
    return this.candidate;
  }

  get activeScenario(): BossAssetPreviewScenario {
    return this.scenario;
  }

  load(bossId: string, simulationSeconds: number): Readonly<Record<string, unknown>> {
    const identity = allBossIdentities().find((candidate) => candidate.id === bossId);
    if (identity === undefined) throw new Error(`Unknown production Boss identity: ${bossId}.`);
    if (paintedBossArtUrl(identity.id) === undefined) {
      throw new Error(`Boss ${identity.id} has no production painted asset; preview is unsupported without stage context.`);
    }
    preloadPaintedSprites([], [], [identity.id], "high");
    this.candidate = Object.freeze({ bossId: identity.id, identity });
    this.scenario = "idle";
    this.scenarioStartedAt = simulationSeconds;
    this.eventFired = false;
    this.fx.clear();
    return Object.freeze({
      bossId: identity.id,
      name: identity.name,
      title: identity.title,
      family: identity.family,
      role: identity.role,
      renderer: "production-painted-boss",
      scenarios: BOSS_ASSET_PREVIEW_SCENARIOS,
    });
  }

  setScenario(next: AssetPreviewScenario, simulationSeconds: number): void {
    if (!isBossScenario(next)) throw new Error(`Boss production preview does not support scenario: ${next}.`);
    if (this.candidate === null) throw new Error("SET_SCENARIO requires a loaded Boss candidate.");
    this.scenario = next;
    this.scenarioStartedAt = simulationSeconds;
    this.eventFired = false;
    this.fx.clear();
  }

  reset(): void {
    this.candidate = null;
    this.scenario = "idle";
    this.scenarioStartedAt = 0;
    this.eventFired = false;
    this.fx.clear();
  }

  draw(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    simulationSeconds: number,
    dt: number,
    paused: boolean,
  ): void {
    const candidate = this.candidate;
    if (candidate === null) return;
    const identity = candidate.identity;
    const style = familyStyle(identity.family);
    const x = width * 0.5;
    const y = height * 0.47;
    const radius = Math.max(62, Math.min(115, Math.min(width, height) * 0.22));
    const age = Math.max(0, simulationSeconds - this.scenarioStartedAt);

    if (!this.eventFired) {
      if (this.scenario === "phase") {
        this.fx.bossPhase(x, y, radius, identity.primary, identity.accent);
        this.eventFired = true;
      } else if (this.scenario === "hit") {
        this.fx.bossHit(x, y, style.material, style, "high");
        this.eventFired = true;
      } else if (this.scenario === "death") {
        this.fx.bossDeath(x, y, radius, identity.primary, identity.accent, style.death, style);
        this.eventFired = true;
      }
    }
    if (!paused) this.fx.update(dt);

    const deathAlpha = this.scenario === "death" ? Math.max(0, 1 - age / 0.42) : 1;
    drawBossAura(context, identity.aura, x, y, radius, simulationSeconds, identity.primary, identity.accent, deathAlpha, "high");
    const sprite = paintedBossSprite(identity.id, "high");
    if (sprite !== null && deathAlpha > 0.01) {
      const flash = this.scenario === "hit" ? Math.max(0, 1 - age / 0.2) : 0;
      context.save();
      context.translate(x, y);
      context.globalAlpha *= deathAlpha;
      drawPaintedSprite(
        context,
        sprite,
        radius * 2.2,
        flash,
        Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
      );
      context.restore();
    }
    this.fx.draw(context, "high");
  }
}
