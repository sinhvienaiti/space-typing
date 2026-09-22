import { clamp } from "../logic";

export const STATUS_IDS = [
  "shielded",
  "fortified",
  "lucky",
  "overcharged",
  "cloaked",
  "combo-protected",
  "regeneration",
  "frozen",
  "burning",
  "silenced",
  "jammed",
  "cursed",
  "weakened",
  "armor-broken",
  "slowed",
  "marked",
] as const;

export type StatusId = (typeof STATUS_IDS)[number];
export type StatusPolarity = "positive" | "negative";
export type StatusStackRule = "refresh" | "stack";

export type StatusDefinition = {
  id: StatusId;
  label: string;
  polarity: StatusPolarity;
  stackRule: StatusStackRule;
  maxStacks: number;
  cleanseable: boolean;
};

export type ActiveStatus = {
  id: StatusId;
  remaining: number;
  stacks: number;
  source: string;
};

export type StatusState = ActiveStatus[];

export type ApplyStatusInput = {
  id: StatusId;
  duration: number;
  source: string;
};

export type ApplyStatusResult = {
  state: StatusState;
  applied: boolean;
  resisted: boolean;
};

function positive(
  id: StatusId,
  label: string,
  maxStacks = 1,
  stackRule: StatusStackRule = "refresh",
): StatusDefinition {
  return {
    id,
    label,
    polarity: "positive",
    stackRule,
    maxStacks,
    cleanseable: false,
  };
}

function negative(
  id: StatusId,
  label: string,
  maxStacks = 1,
  stackRule: StatusStackRule = "refresh",
): StatusDefinition {
  return {
    id,
    label,
    polarity: "negative",
    stackRule,
    maxStacks,
    cleanseable: true,
  };
}

export const STATUS_REGISTRY: Record<StatusId, StatusDefinition> = {
  shielded: positive("shielded", "Shielded"),
  fortified: positive("fortified", "Fortified", 2, "stack"),
  lucky: positive("lucky", "Lucky"),
  overcharged: positive("overcharged", "Overcharged"),
  cloaked: positive("cloaked", "Cloaked"),
  "combo-protected": positive("combo-protected", "Combo Protected"),
  regeneration: positive("regeneration", "Regeneration", 3, "stack"),
  frozen: negative("frozen", "Frozen"),
  burning: negative("burning", "Burning", 3, "stack"),
  silenced: negative("silenced", "Silenced"),
  jammed: negative("jammed", "Jammed"),
  cursed: negative("cursed", "Cursed", 2, "stack"),
  weakened: negative("weakened", "Weakened", 2, "stack"),
  "armor-broken": negative("armor-broken", "Armor Broken", 2, "stack"),
  slowed: negative("slowed", "Slowed", 2, "stack"),
  marked: negative("marked", "Marked"),
};

export function createStatusState(): StatusState {
  return [];
}

export function statusResistance(ward: number): number {
  return clamp(Math.max(0, ward) * 0.008, 0, 0.65);
}

export function applyStatus(
  state: readonly ActiveStatus[],
  input: ApplyStatusInput,
  ward = 0,
  random: () => number = Math.random,
): ApplyStatusResult {
  const definition = STATUS_REGISTRY[input.id];
  const duration = Math.max(0, input.duration);
  if (duration <= 0) {
    return { state: [...state], applied: false, resisted: false };
  }

  if (
    definition.polarity === "negative" &&
    random() < statusResistance(ward)
  ) {
    return { state: [...state], applied: false, resisted: true };
  }

  const current = state.find((status) => status.id === input.id);
  if (current === undefined) {
    return {
      state: [
        ...state,
        {
          id: input.id,
          remaining: duration,
          stacks: 1,
          source: input.source,
        },
      ],
      applied: true,
      resisted: false,
    };
  }

  const next: ActiveStatus = {
    ...current,
    source: input.source,
    remaining: Math.max(current.remaining, duration),
    stacks:
      definition.stackRule === "stack"
        ? Math.min(definition.maxStacks, current.stacks + 1)
        : current.stacks,
  };

  return {
    state: state.map((status) =>
      status.id === input.id ? next : { ...status },
    ),
    applied: true,
    resisted: false,
  };
}

export function tickStatuses(
  state: readonly ActiveStatus[],
  dt: number,
): StatusState {
  const delta = Math.max(0, dt);
  return state
    .map((status) => ({
      ...status,
      remaining: Math.max(0, status.remaining - delta),
    }))
    .filter((status) => status.remaining > 0);
}

export function cleanseNegativeStatuses(
  state: readonly ActiveStatus[],
): StatusState {
  return state
    .filter((status) => {
      const definition = STATUS_REGISTRY[status.id];
      return !(
        definition.polarity === "negative" &&
        definition.cleanseable
      );
    })
    .map((status) => ({ ...status }));
}

export function hasCleanseableNegativeStatus(
  state: readonly ActiveStatus[],
): boolean {
  return state.some((status) => {
    const definition = STATUS_REGISTRY[status.id];
    return (
      definition.polarity === "negative" &&
      definition.cleanseable
    );
  });
}

export function statusRemaining(
  state: readonly ActiveStatus[],
  id: StatusId,
): number {
  return state.find((status) => status.id === id)?.remaining ?? 0;
}

export function statusIncomingDamageMultiplier(
  state: readonly ActiveStatus[],
): number {
  const fortified =
    state.find((status) => status.id === "fortified")?.stacks ?? 0;
  const cursed =
    state.find((status) => status.id === "cursed")?.stacks ?? 0;

  return clamp(1 - fortified * 0.08 + cursed * 0.08, 0.7, 1.4);
}

export function statusLabel(status: ActiveStatus): string {
  const definition = STATUS_REGISTRY[status.id];
  return (
    definition.label +
    (status.stacks > 1 ? " x" + String(status.stacks) : "")
  );
}
