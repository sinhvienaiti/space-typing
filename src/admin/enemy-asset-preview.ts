import { familyStyle } from "../enemies/identity";
import {
  drawPaintedSprite,
  hasPaintedEnemy,
  paintedEnemySprite,
  preloadPaintedSprites,
} from "../enemies/painted-sprites";
import { drawModularEnemy, StaticEnemyBodyCache } from "../enemies/renderer";
import { enemyDefinition, type EnemyDefinition } from "../enemies/registry";
import type { EnemyKind } from "../types";
import { CombatFxSystem } from "../vfx/combat-fx";
import type { AssetPreviewScenario } from "./asset-preview-protocol";

export const ENEMY_ASSET_PREVIEW_SCENARIOS = ["idle", "hit", "death"] as const;
export type EnemyAssetPreviewScenario = (typeof ENEMY_ASSET_PREVIEW_SCENARIOS)[number];

const PAINTED_ENEMY_KINDS = [
  "scout",
  "mine",
  "tank",
  "destroyer",
  "oppressor",
  "shield",
  "carrier",
  "jammer",
  "cloaker",
  "healer",
  "splitter",
  "sniper",
  "leech",
  "commander",
] as const satisfies readonly EnemyKind[];

export function enemyAssetPreviewPaintedKind(definitionId: string): EnemyKind | null {
  for (const kind of PAINTED_ENEMY_KINDS) {
    if (definitionId === kind || definitionId.endsWith(`-${kind}`)) return kind;
  }
  return null;
}

export type EnemyAssetPreviewCandidate = Readonly<{
  definitionId: string;
  definition: EnemyDefinition;
  paintedKind: EnemyKind | null;
}>;

function isEnemyScenario(value: AssetPreviewScenario): value is EnemyAssetPreviewScenario {
  return (ENEMY_ASSET_PREVIEW_SCENARIOS as readonly string[]).includes(value);
}

export class EnemyAssetPreviewScene {
  private readonly fx = new CombatFxSystem();
  private readonly bodyCache = new StaticEnemyBodyCache(8);
  private candidate: EnemyAssetPreviewCandidate | null = null;
  private scenario: EnemyAssetPreviewScenario = "idle";
  private scenarioStartedAt = 0;
  private eventFired = false;

  get activeCandidate(): EnemyAssetPreviewCandidate | null {
    return this.candidate;
  }

  get activeScenario(): EnemyAssetPreviewScenario {
    return this.scenario;
  }

  load(definitionId: string, simulationSeconds: number): Readonly<Record<string, unknown>> {
    const definition = enemyDefinition(definitionId);
    if (definition === undefined) {
      throw new Error(`Unknown production Enemy definition: ${definitionId}.`);
    }
    const paintedKind = enemyAssetPreviewPaintedKind(definition.id);
    if (paintedKind !== null) {
      if (!hasPaintedEnemy(definition.family, paintedKind)) {
        throw new Error(
          `Enemy ${definition.id} expects production painted art ${definition.family}-${paintedKind}.webp, but this build does not contain it. Run pnpm art:prepare and rebuild Space Typing.`,
        );
      }
      preloadPaintedSprites([definition.family], [paintedKind], [], "high");
    }
    this.candidate = Object.freeze({ definitionId: definition.id, definition, paintedKind });
    this.scenario = "idle";
    this.scenarioStartedAt = simulationSeconds;
    this.eventFired = false;
    this.fx.clear();
    return Object.freeze({
      definitionId: definition.id,
      name: definition.name,
      family: definition.family,
      role: definition.role,
      rarity: definition.rarity,
      renderer: paintedKind === null ? "production-modular-enemy" : "production-painted-enemy",
      paintedKind,
      scenarios: ENEMY_ASSET_PREVIEW_SCENARIOS,
    });
  }

  setScenario(next: AssetPreviewScenario, simulationSeconds: number): void {
    if (!isEnemyScenario(next)) {
      throw new Error(`Enemy production preview does not support scenario: ${next}.`);
    }
    if (this.candidate === null) {
      throw new Error("SET_SCENARIO requires a loaded Enemy candidate.");
    }
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
    this.bodyCache.clear();
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

    const x = width * 0.5;
    const y = height * 0.47;
    const radius = Math.max(42, Math.min(86, Math.min(width, height) * 0.16));
    const scenarioAge = Math.max(0, simulationSeconds - this.scenarioStartedAt);
    const style = familyStyle(candidate.definition.family);

    if (!this.eventFired && this.scenario === "hit") {
      this.fx.hit(x, y, style.material, style, 1.25, "high");
      this.eventFired = true;
    } else if (!this.eventFired && this.scenario === "death") {
      this.fx.death(x, y, style.death, style, radius * 0.7, "high");
      this.eventFired = true;
    }

    if (!paused) this.fx.update(dt);

    const deathAlpha = this.scenario === "death"
      ? Math.max(0, 1 - scenarioAge / 0.32)
      : 1;
    if (deathAlpha > 0.01) {
      const flash = this.scenario === "hit"
        ? Math.max(0, 1 - scenarioAge / 0.2)
        : 0;
      context.save();
      context.translate(x, y);
      context.globalAlpha *= deathAlpha;

      let drew = false;
      if (candidate.paintedKind !== null) {
        const painted = paintedEnemySprite(candidate.definition.family, candidate.paintedKind, "high");
        if (painted !== null) {
          drew = drawPaintedSprite(
            context,
            painted,
            radius * 2.35,
            flash,
            Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
          );
        }
        // A definition that has a canonical painted mapping must never silently
        // fall back to the modular body: that hides missing/stale prepared art.
      } else {
        drew = drawModularEnemy(
          context,
          candidate.definition,
          {
            radius,
            age: simulationSeconds,
            flash,
            targeted: false,
            glowScale: 1,
          },
          this.bodyCache,
          Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
        );
      }
      context.restore();
      if (candidate.paintedKind === null && !drew) {
        throw new Error(`Production Enemy renderer rejected definition: ${candidate.definitionId}.`);
      }
    }

    this.fx.draw(context, "high");
  }
}
