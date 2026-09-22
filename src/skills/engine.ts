import { accuracyPercent } from "../logic";

export type SkillTypingCondition = {
  minStreak?: number;
  minAccuracy?: number;
};

export type SkillDefinition = {
  id: string;
  name: string;
  energyCost: number;
  cooldown: number;
  charges: number | null;
  perStageLimit: number | null;
  typingCondition?: SkillTypingCondition;
  level?: number;
  effectScale?: number;
  masteryUnlocked?: boolean;
};

export type SkillRuntimeState = {
  cooldownRemaining: number;
  chargesRemaining: number | null;
  usesThisStage: number;
};

export type SkillCombatContext = {
  energy: number;
  streak: number;
  hits: number;
  misses: number;
};

export type SkillBlockReason =
  | "unknown-skill"
  | "cooldown"
  | "no-charges"
  | "stage-limit"
  | "energy"
  | "typing-condition"
  | "effect-not-needed"
  | "silenced";

export type SkillActivationResult =
  | {
      ok: true;
      energy: number;
      state: SkillRuntimeState;
    }
  | {
      ok: false;
      reason: SkillBlockReason;
      energy: number;
      state: SkillRuntimeState | null;
    };

function safeNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizeDefinition(
  definition: SkillDefinition,
): SkillDefinition {
  return {
    ...definition,
    energyCost: safeNonNegative(definition.energyCost),
    cooldown: safeNonNegative(definition.cooldown),
    charges:
      definition.charges === null
        ? null
        : Math.max(0, Math.floor(safeNonNegative(definition.charges))),
    perStageLimit:
      definition.perStageLimit === null
        ? null
        : Math.max(
            0,
            Math.floor(safeNonNegative(definition.perStageLimit)),
          ),
  };
}

export class SkillEngine {
  private definitions = new Map<string, SkillDefinition>();
  private states = new Map<string, SkillRuntimeState>();

  setDefinitions(definitions: readonly SkillDefinition[]): void {
    this.definitions.clear();

    for (const definition of definitions) {
      this.definitions.set(
        definition.id,
        normalizeDefinition(definition),
      );
    }

    this.resetStage();
  }

  resetStage(): void {
    this.states.clear();

    for (const definition of this.definitions.values()) {
      this.states.set(definition.id, {
        cooldownRemaining: 0,
        chargesRemaining: definition.charges,
        usesThisStage: 0,
      });
    }
  }

  tick(dt: number): void {
    const seconds = safeNonNegative(dt);
    if (seconds <= 0) return;

    for (const state of this.states.values()) {
      state.cooldownRemaining = Math.max(
        0,
        state.cooldownRemaining - seconds,
      );
    }
  }

  reduceCooldowns(seconds: number): number {
    const amount = safeNonNegative(seconds);
    if (amount <= 0) return 0;

    let changed = 0;
    for (const state of this.states.values()) {
      if (state.cooldownRemaining <= 0) continue;
      state.cooldownRemaining = Math.max(
        0,
        state.cooldownRemaining - amount,
      );
      changed += 1;
    }
    return changed;
  }

  getState(id: string): SkillRuntimeState | null {
    const state = this.states.get(id);
    return state === undefined ? null : { ...state };
  }

  getDefinition(id: string): SkillDefinition | null {
    const definition = this.definitions.get(id);
    return definition === undefined ? null : { ...definition };
  }

  getDefinitions(): SkillDefinition[] {
    return Array.from(this.definitions.values(), (definition) => ({
      ...definition,
    }));
  }

  canActivate(
    id: string,
    context: SkillCombatContext,
  ): SkillBlockReason | null {
    const definition = this.definitions.get(id);
    const state = this.states.get(id);

    if (definition === undefined || state === undefined) {
      return "unknown-skill";
    }

    if (state.cooldownRemaining > 0) return "cooldown";

    if (
      state.chargesRemaining !== null &&
      state.chargesRemaining <= 0
    ) {
      return "no-charges";
    }

    if (
      definition.perStageLimit !== null &&
      state.usesThisStage >= definition.perStageLimit
    ) {
      return "stage-limit";
    }

    if (context.energy < definition.energyCost) {
      return "energy";
    }

    const condition = definition.typingCondition;
    if (condition !== undefined) {
      if (
        condition.minStreak !== undefined &&
        context.streak < condition.minStreak
      ) {
        return "typing-condition";
      }

      if (
        condition.minAccuracy !== undefined &&
        accuracyPercent(context.hits, context.misses) <
          condition.minAccuracy
      ) {
        return "typing-condition";
      }
    }

    return null;
  }

  activate(
    id: string,
    context: SkillCombatContext,
  ): SkillActivationResult {
    const reason = this.canActivate(id, context);
    const state = this.states.get(id);

    if (reason !== null) {
      return {
        ok: false,
        reason,
        energy: context.energy,
        state: state === undefined ? null : { ...state },
      };
    }

    const definition = this.definitions.get(id);
    if (definition === undefined || state === undefined) {
      return {
        ok: false,
        reason: "unknown-skill",
        energy: context.energy,
        state: null,
      };
    }

    state.cooldownRemaining = definition.cooldown;
    state.usesThisStage += 1;

    if (state.chargesRemaining !== null) {
      state.chargesRemaining = Math.max(
        0,
        state.chargesRemaining - 1,
      );
    }

    return {
      ok: true,
      energy: Math.max(0, context.energy - definition.energyCost),
      state: { ...state },
    };
  }
}
