export const ANNOUNCER_EVENTS = [
  "double-kill",
  "triple-kill",
  "ultra-kill",
  "rampage",
  "monster-kill",
  "first-blood",
] as const;

export type AnnouncerEvent = (typeof ANNOUNCER_EVENTS)[number];

export const DEFAULT_ANNOUNCER_ASSET =
  "/assets/audio/announcer-base.wav";

export const ANNOUNCER_ASSET_PATHS: Record<AnnouncerEvent, string> = Object.fromEntries(
  ANNOUNCER_EVENTS.map((event) => [event, DEFAULT_ANNOUNCER_ASSET]),
) as Record<AnnouncerEvent, string>;

export function announcerAsset(event: AnnouncerEvent): string {
  return ANNOUNCER_ASSET_PATHS[event];
}

/**
 * Announcer overrides are intentionally sourced only from the committed game
 * asset tree. The manifest is empty by default, so the built-in generic cue
 * remains the only runtime announcer audio unless we add owned/licensed lines.
 */
export const LOCAL_ANNOUNCER_ROOT = "/assets/audio/announcer/";

export function localAnnouncerAsset(event: AnnouncerEvent): string {
  return LOCAL_ANNOUNCER_ROOT + event + ".ogg";
}

/** Every supported event has the in-repo generic cue as a safe fallback. */
export function announcerHasFallback(_event: AnnouncerEvent): boolean {
  return true;
}

/** Higher interrupts lower; equal or lower waits for the current line. */
export function announcerPriority(event: AnnouncerEvent): number {
  if (event === "first-blood") return 4;
  return 3;
}

/**
 * Voice-pack-specific spree lines were removed. Keep an empty ladder so the
 * existing gameplay integration remains source-compatible without scheduling
 * any external announcer clips.
 */
export const KILL_SPREE_LADDER: readonly { streak: number; event: AnnouncerEvent }[] = [];

/** Index+1 of the highest spree rung reached (0 = none). */
export function killSpreeRung(streak: number): number {
  let rung = 0;
  KILL_SPREE_LADDER.forEach((step, index) => {
    if (streak >= step.streak) rung = index + 1;
  });
  return rung;
}

export function announcerEventForChainCount(
  count: number,
): AnnouncerEvent | null {
  if (count === 2) return "double-kill";
  if (count === 3) return "triple-kill";
  if (count === 4) return "ultra-kill";
  if (count === 5) return "rampage";
  if (count === 6) return "monster-kill";
  return null;
}

export class PriorityKillChain {
  private count = 0;
  private lastKillAt = Number.NEGATIVE_INFINITY;

  constructor(private windowSeconds = 8) {
    this.setWindowSeconds(windowSeconds);
  }

  setWindowSeconds(windowSeconds: number): void {
    if (!Number.isFinite(windowSeconds) || windowSeconds <= 0) {
      throw new Error("Kill-chain window must be greater than 0.");
    }
    this.windowSeconds = windowSeconds;
  }

  reset(): void {
    this.count = 0;
    this.lastKillAt = Number.NEGATIVE_INFINITY;
  }

  registerKill(nowSeconds: number): AnnouncerEvent | null {
    if (!Number.isFinite(nowSeconds)) return null;

    const elapsed = nowSeconds - this.lastKillAt;
    if (elapsed < 0 || elapsed > this.windowSeconds) {
      this.count = 0;
    }

    this.count += 1;
    this.lastKillAt = nowSeconds;

    return announcerEventForChainCount(this.count);
  }

  getCount(): number {
    return this.count;
  }
}
