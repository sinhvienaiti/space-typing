import { familyStyle } from "../enemies/identity";
import {
  drawPaintedSprite,
  hasPaintedEnemy,
  paintedEnemySprite,
  preloadPaintedSprites,
} from "../enemies/painted-sprites";
import { enemyDefinition, type EnemyDefinition } from "../enemies/registry";
import type { EnemyRoleId } from "../enemies/roles";
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

/**
 * Registry identities and painted combat kinds are separate production taxonomies.
 * Admin needs a deterministic presentation-only bridge so every canonical registry
 * identity can be inspected with the painted family art already prepared for the
 * production renderer. This mapping is never consumed by spawn/admission gameplay.
 */
const PREVIEW_KIND_BY_ID: Readonly<Partial<Record<string, EnemyKind>>> = Object.freeze({
  "angel-guard": "shield",
  "bomb-imp": "mine",
  "freeze-burst-sprite": "jammer",
  "frost-keeper": "shield",
  "shade-wisp": "cloaker",
  "night-wisp": "jammer",
  "prism-sentinel": "shield",
  "star-core": "carrier",
  "archangel-core": "carrier",
  "nova-core": "destroyer",
  "berserk-devil": "destroyer",
  "glacier-oracle": "jammer",
  "void-eye": "oppressor",
  "demon-lord-orb": "oppressor",
});

const PREVIEW_KIND_BY_ROLE: Readonly<Record<EnemyRoleId, EnemyKind>> = Object.freeze({
  normal: "scout",
  swift: "scout",
  tank: "tank",
  support: "healer",
  burst: "destroyer",
  control: "jammer",
  reward: "scout",
  elite: "commander",
  "mini-boss": "commander",
  boss: "commander",
});

export function enemyAssetPreviewPaintedKind(
  definitionId: string,
  role?: EnemyRoleId,
): EnemyKind | null {
  for (const kind of PAINTED_ENEMY_KINDS) {
    if (definitionId === kind || definitionId.endsWith(`-${kind}`)) return kind;
  }
  const explicit = PREVIEW_KIND_BY_ID[definitionId];
  if (explicit !== undefined) return explicit;
  return role === undefined ? null : PREVIEW_KIND_BY_ROLE[role];
}

export type EnemyAssetPreviewCandidate = Readonly<{
  definitionId: string;
  definition: EnemyDefinition;
  paintedKind: EnemyKind;
}>;

function isEnemyScenario(value: AssetPreviewScenario): value is EnemyAssetPreviewScenario {
  return (ENEMY_ASSET_PREVIEW_SCENARIOS as readonly string[]).includes(value);
}

export class EnemyAssetPreviewScene {
  private readonly fx = new CombatFxSystem();
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
    const paintedKind = enemyAssetPreviewPaintedKind(definition.id, definition.role);
    if (paintedKind === null) {
      throw new Error(
        `Enemy ${definition.id} has no Admin painted-preview presentation mapping. Add an explicit preview-kind mapping instead of silently using the modular base renderer.`,
      );
    }
    if (!hasPaintedEnemy(definition.family, paintedKind)) {
      throw new Error(
        `Enemy ${definition.id} expects production painted art ${definition.family}-${paintedKind}.webp, but this build does not contain it. Run pnpm art:prepare and rebuild Space Typing; Enemy Admin preview never silently falls back to the modular base renderer.`,
      );
    }
    preloadPaintedSprites([definition.family], [paintedKind], [], "high");
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
      renderer: "production-painted-enemy",
      paintedKind,
      previewMapping: "admin-presentation-only",
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

      const painted = paintedEnemySprite(candidate.definition.family, candidate.paintedKind, "high");
      if (painted !== null) {
        drawPaintedSprite(
          context,
          painted,
          radius * 2.35,
          flash,
          Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
        );
      }
      context.restore();
    }

    this.fx.draw(context, "high");
  }
}
