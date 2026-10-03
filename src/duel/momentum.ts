/**
 * Typing momentum: the run of correct keystrokes since the last miss. It is
 * presentation only (bigger bolts, ship aura, rising key pitch, call-outs)
 * and mirrors the engine's precision streak, whose ordnance milestones sit
 * on the same thresholds. It never changes damage.
 */
export type DuelMomentumTier = {
  streak: number;
  label: string;
  color: string;
  /** Announcer line (public/local-assets/announcer/<voice>.ogg). */
  voice: string;
};

/**
 * Labels follow the classic DotA announcer lines the owner supplied, so the
 * call-out on screen matches the voice. The first six thresholds are the
 * engine's precision-ordnance milestones.
 */
export const DUEL_MOMENTUM_TIERS: readonly DuelMomentumTier[] = [
  { streak: 0, label: "", color: "#8fe9ff", voice: "" },
  { streak: 10, label: "KILLING SPREE", color: "#7ff3ff", voice: "killing-spree" },
  { streak: 20, label: "DOMINATING", color: "#ffd166", voice: "dominating" },
  { streak: 35, label: "MEGA KILL", color: "#ff8a3d", voice: "mega-kill" },
  { streak: 50, label: "UNSTOPPABLE", color: "#ff4fd8", voice: "unstoppable" },
  { streak: 75, label: "WICKED SICK", color: "#b98bff", voice: "wicked-sick" },
  { streak: 100, label: "MONSTER KILL", color: "#ff5a5a", voice: "monster-kill" },
  { streak: 150, label: "GODLIKE", color: "#ffe28a", voice: "godlike" },
  { streak: 200, label: "HOLY SHIT", color: "#ffffff", voice: "holy-shit" },
];

export type DuelMomentumEvent =
  | { type: "tick"; streak: number; tier: number }
  | { type: "tier-up"; streak: number; tier: number }
  | { type: "break"; lost: number; tier: number };

export function duelMomentumTier(streak: number): number {
  let tier = 0;
  for (let index = 1; index < DUEL_MOMENTUM_TIERS.length; index += 1) {
    if (streak >= DUEL_MOMENTUM_TIERS[index]!.streak) tier = index;
  }
  return tier;
}

/** Share of the way from the current tier to the next (1 at the top tier). */
export function duelMomentumProgress(streak: number): number {
  const tier = duelMomentumTier(streak);
  const next = DUEL_MOMENTUM_TIERS[tier + 1];
  if (next === undefined) return 1;
  const base = DUEL_MOMENTUM_TIERS[tier]!.streak;
  return Math.max(0, Math.min(1, (streak - base) / (next.streak - base)));
}

/** Never emit more key ticks than this per observed update. */
const MAX_TICKS_PER_UPDATE = 4;

export class DuelMomentum {
  private roundId: string | null = null;
  private correct = 0;
  private wrong = 0;
  private current = 0;
  private bestStreak = 0;

  get streak(): number {
    return this.current;
  }

  get best(): number {
    return this.bestStreak;
  }

  get tier(): number {
    return duelMomentumTier(this.current);
  }

  /** 0 (cold) … 1 (UNSTOPPABLE and beyond), for bolt power and aura. */
  get heat(): number {
    return Math.min(1, this.tier / 5);
  }

  reset(roundId: string | null = null): void {
    this.roundId = roundId;
    this.correct = 0;
    this.wrong = 0;
    this.current = 0;
    this.bestStreak = 0;
  }

  /**
   * Feed the authoritative character counters of one view. The first view
   * of a round only sets the baseline. A miss is applied before the correct
   * characters of the same update.
   */
  observe(
    roundId: string,
    correctChars: number,
    wrongChars: number,
  ): DuelMomentumEvent[] {
    if (roundId !== this.roundId) {
      this.reset(roundId);
      this.correct = correctChars;
      this.wrong = wrongChars;
      return [];
    }
    const events: DuelMomentumEvent[] = [];
    if (wrongChars > this.wrong) {
      if (this.current > 0) {
        events.push({ type: "break", lost: this.current, tier: this.tier });
      }
      this.current = 0;
    }
    const gained = Math.max(0, correctChars - this.correct);
    let ticks = 0;
    for (let index = 0; index < gained; index += 1) {
      const before = this.tier;
      this.current += 1;
      const after = this.tier;
      if (after > before) {
        events.push({ type: "tier-up", streak: this.current, tier: after });
      } else if (ticks < MAX_TICKS_PER_UPDATE) {
        ticks += 1;
        events.push({ type: "tick", streak: this.current, tier: after });
      }
    }
    this.bestStreak = Math.max(this.bestStreak, this.current);
    this.correct = Math.max(this.correct, correctChars);
    this.wrong = Math.max(this.wrong, wrongChars);
    return events;
  }
}
