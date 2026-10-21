/**
 * window.__td: what the browser scenarios (scripts/visual/scenarios/td-1a-*.mjs)
 * read and drive. It grows with each 1A milestone (stats, hash, liveWords…)
 * and changes the run only through the same commands a player sends.
 */
export type TdDevHandle = {
  /** The page has booted and drawn its first frame. */
  ready(): boolean;
  flags(): { sandbox: boolean };
};

export function installDevHandle(handle: TdDevHandle): void {
  (window as unknown as { __td?: TdDevHandle }).__td = handle;
}
