import type { EnemyFamilyId } from "../enemies/families";
import type { BossRole } from "./model";
import type { DifficultyProfile } from "../campaign/types";
import { clamp } from "../logic";

export const BOSS_TYPING_MECHANICS = [
  "interrupt-charge",
  "shield-sequence",
  "weak-point",
  "rapid-rage",
  "accuracy-curse",
] as const;

export type BossTypingMechanicId =
  (typeof BOSS_TYPING_MECHANICS)[number];

export type BossTypingMechanicState = {
  id: BossTypingMechanicId;
  label: string;
  phase: number;
  active: boolean;
  timer: number;
  maxTimer: number;
  wordsRemaining: number;
  maxWords: number;
};

export type BossWordMechanicResult = {
  state: BossTypingMechanicState;
  damageMultiplier: number;
  shieldBroken: boolean;
  interrupted: boolean;
  staggerSeconds: number;
};

const FAMILY_SEQUENCE: Record<
  EnemyFamilyId,
  readonly BossTypingMechanicId[]
> = {
  rainbow: [
    "shield-sequence",
    "weak-point",
    "rapid-rage",
  ],
  angel: [
    "accuracy-curse",
    "weak-point",
    "shield-sequence",
  ],
  devil: [
    "interrupt-charge",
    "accuracy-curse",
    "rapid-rage",
  ],
  frost: [
    "shield-sequence",
    "interrupt-charge",
    "accuracy-curse",
  ],
  prism: [
    "shield-sequence",
    "weak-point",
    "accuracy-curse",
  ],
  nature: [
    "accuracy-curse",
    "shield-sequence",
    "weak-point",
  ],
  shadow: [
    "interrupt-charge",
    "accuracy-curse",
    "rapid-rage",
  ],
  cosmic: [
    "weak-point",
    "rapid-rage",
    "interrupt-charge",
  ],
};

export function bossTypingMechanicFor(
  family: EnemyFamilyId,
  role: BossRole,
  phase: number,
): BossTypingMechanicId {
  const sequence = FAMILY_SEQUENCE[family];
  if (role === "mini-boss") return sequence[0]!;
  const index = clamp(
    Math.floor(phase) - 1,
    0,
    role === "major-boss" ? 2 : 1,
  );
  return sequence[index] ?? sequence[0]!;
}

export function bossMechanicLabel(
  id: BossTypingMechanicId,
): string {
  if (id === "interrupt-charge") return "Interrupt Charge";
  if (id === "shield-sequence") return "Shield Sequence";
  if (id === "weak-point") return "Weak Point";
  if (id === "rapid-rage") return "Rapid Rage";
  return "Accuracy Curse";
}

export function createBossTypingMechanicState(
  family: EnemyFamilyId,
  role: BossRole,
  phase: number,
  difficulty: DifficultyProfile,
): BossTypingMechanicState {
  const id = bossTypingMechanicFor(
    family,
    role,
    phase,
  );
  const words =
    id === "shield-sequence"
      ? role === "mini-boss"
        ? 1
        : role === "major-boss"
          ? 3
          : 2
      : 1;
  const maxTimer =
    id === "interrupt-charge"
      ? clamp(
          4.8 +
            difficulty.reactionWindow * 2 -
            difficulty.bossPressure * 0.28,
          3.4,
          6.8,
        )
      : 0;

  return {
    id,
    label: bossMechanicLabel(id),
    phase,
    active: true,
    timer: maxTimer,
    maxTimer,
    wordsRemaining: words,
    maxWords: words,
  };
}

export function tickBossTypingMechanic(
  stateInput: BossTypingMechanicState,
  dt: number,
): {
  state: BossTypingMechanicState;
  expiredInterrupt: boolean;
} {
  const state = { ...stateInput };
  if (
    !state.active ||
    state.id !== "interrupt-charge"
  ) {
    return { state, expiredInterrupt: false };
  }

  state.timer = Math.max(
    0,
    state.timer - Math.max(0, dt),
  );
  if (state.timer > 0) {
    return { state, expiredInterrupt: false };
  }

  state.active = false;
  return {
    state,
    expiredInterrupt: true,
  };
}

export function resolveBossWordMechanic(
  stateInput: BossTypingMechanicState,
  perfectWord: boolean,
): BossWordMechanicResult {
  const state = { ...stateInput };
  let damageMultiplier = 1;
  let shieldBroken = false;
  let interrupted = false;
  let staggerSeconds = perfectWord ? 1.05 : 0;

  if (!state.active) {
    return {
      state,
      damageMultiplier,
      shieldBroken,
      interrupted,
      staggerSeconds,
    };
  }

  if (state.id === "shield-sequence") {
    state.wordsRemaining = Math.max(
      0,
      state.wordsRemaining - 1,
    );
    shieldBroken = state.wordsRemaining === 0;
    if (shieldBroken) {
      state.active = false;
      staggerSeconds = Math.max(staggerSeconds, 1.15);
    }
    damageMultiplier = 0;
  } else if (state.id === "interrupt-charge") {
    state.active = false;
    state.timer = 0;
    interrupted = true;
    damageMultiplier = 1.15;
    staggerSeconds = Math.max(staggerSeconds, 1.35);
  } else if (state.id === "weak-point") {
    damageMultiplier = perfectWord ? 1.85 : 1.35;
    state.wordsRemaining = 0;
    state.active = false;
    staggerSeconds = Math.max(staggerSeconds, 1.2);
  } else if (state.id === "rapid-rage") {
    damageMultiplier = perfectWord ? 1.3 : 1;
  } else if (state.id === "accuracy-curse") {
    damageMultiplier = perfectWord ? 1.55 : 0.45;
    if (perfectWord) {
      staggerSeconds = Math.max(staggerSeconds, 1.2);
    }
  }

  return {
    state,
    damageMultiplier,
    shieldBroken,
    interrupted,
    staggerSeconds,
  };
}

export function bossActionIntervalMultiplier(
  state: BossTypingMechanicState,
): number {
  return state.active &&
    state.id === "rapid-rage"
    ? 0.72
    : 1;
}

export function bossWordLengthPreference(
  state: BossTypingMechanicState,
): "short" | "long" | "normal" {
  if (
    state.active &&
    state.id === "rapid-rage"
  ) {
    return "short";
  }
  if (
    state.active &&
    state.id === "weak-point"
  ) {
    return "long";
  }
  return "normal";
}
