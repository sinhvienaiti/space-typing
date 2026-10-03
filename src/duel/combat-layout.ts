/** Container dimensions, not monitor size: embedded/portrait games stay vertical. */
export function duelHorizontalLayout(width: number, height: number): boolean {
  return width >= 960 && width >= height * 1.25;
}

/**
 * "depth": the default chase view (your ship near at the bottom, the rival
 * far near the top, true perspective). "horizontal": the older side-on view,
 * kept for comparison with `?duelView=side` on wide containers.
 */
export type DuelArenaLayout = "depth" | "horizontal";

export function duelArenaLayout(
  width: number,
  height: number,
  preferSide = duelSideViewRequested(),
): DuelArenaLayout {
  return preferSide && duelHorizontalLayout(width, height) ? "horizontal" : "depth";
}

let sideViewRequested: boolean | null = null;

export function duelSideViewRequested(): boolean {
  if (sideViewRequested === null) {
    try {
      sideViewRequested =
        typeof location !== "undefined" &&
        new URLSearchParams(location.search).get("duelView") === "side";
    } catch {
      sideViewRequested = false;
    }
  }
  return sideViewRequested;
}
