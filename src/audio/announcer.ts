export const ANNOUNCER_EVENTS = [
  "double-kill",
  "triple-kill",
  "ultra-kill",
  "rampage",
  "monster-kill",
] as const;

export type AnnouncerEvent = (typeof ANNOUNCER_EVENTS)[number];

export const DEFAULT_ANNOUNCER_ASSET =
  "/assets/audio/announcer-base.wav";

export const ANNOUNCER_ASSET_PATHS: Record<AnnouncerEvent, string> = {
  "double-kill": DEFAULT_ANNOUNCER_ASSET,
  "triple-kill": DEFAULT_ANNOUNCER_ASSET,
  "ultra-kill": DEFAULT_ANNOUNCER_ASSET,
  rampage: DEFAULT_ANNOUNCER_ASSET,
  "monster-kill": DEFAULT_ANNOUNCER_ASSET,
};

export function announcerAsset(event: AnnouncerEvent): string {
  return ANNOUNCER_ASSET_PATHS[event];
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
