export const ANNOUNCER_EVENTS = [
  "double-kill",
  "triple-kill",
  "ultra-kill",
  "rampage",
  "monster-kill",
  // Spree ladder and first blood (DotA lines; local files only).
  "first-blood",
  "killing-spree",
  "dominating",
  "mega-kill",
  "unstoppable",
  "wicked-sick",
  "godlike",
  "holy-shit",
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
 * Owner-supplied voice lines (DotA pack) live in the gitignored
 * public/local-assets/announcer/ with a manifest.json listing them. When a
 * line is there it replaces the generic base sound.
 */
export const LOCAL_ANNOUNCER_ROOT = "/local-assets/announcer/";

export function localAnnouncerAsset(event: AnnouncerEvent): string {
  return LOCAL_ANNOUNCER_ROOT + event + ".ogg";
}

/** Only the original chain events fall back to the generic base sound. */
export function announcerHasFallback(event: AnnouncerEvent): boolean {
  return event === "double-kill" || event === "triple-kill" || event === "ultra-kill" ||
    event === "rampage" || event === "monster-kill";
}

/** Higher interrupts lower; equal or lower waits for the current line. */
export function announcerPriority(event: AnnouncerEvent): number {
  if (event === "first-blood") return 4;
  if (announcerHasFallback(event)) return 3;
  return 2;
}

/** Kills (typed words) in a row without a mistake or a hit taken. */
export const KILL_SPREE_LADDER: readonly { streak: number; event: AnnouncerEvent }[] = [
  { streak: 10, event: "killing-spree" },
  { streak: 20, event: "dominating" },
  { streak: 30, event: "mega-kill" },
  { streak: 45, event: "unstoppable" },
  { streak: 60, event: "wicked-sick" },
  { streak: 80, event: "godlike" },
  { streak: 100, event: "holy-shit" },
];

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
