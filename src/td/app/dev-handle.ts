/**
 * window.__td: what the browser scenarios (scripts/visual/scenarios/td-1a-*.mjs)
 * read and drive; main.ts builds it, and its shape is what main.ts returns. It
 * changes the run only through the commands a player sends, so a scenario's
 * log replays like any other.
 */
export function installDevHandle(handle: object): void {
  (window as unknown as { __td?: object }).__td = handle;
}
