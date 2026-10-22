/**
 * window.__td: what the browser scenarios (scripts/visual/scenarios/td-1a-*.mjs)
 * read and drive. It changes the run only through the commands a player
 * sends, so a scenario's log replays like any other.
 */
import type { Command, CommandBody } from "../sim/commands";
import type { RareEvent } from "../sim/events";
import type { Placement } from "../sim/placement";
import type { StatName } from "../sim/stats";

export type TdState = {
  tick: number;
  phase: string;
  wave: number;
  nextWaveAt: number;
  lives: number;
  gold: number;
  enemies: number;
  projectiles: number;
  buildings: { id: number; def: string; level: number; x: number; z: number; ready: boolean }[];
  soldiers: { alive: boolean; contact: boolean; x: number; z: number }[];
};

export type TdDevHandle = {
  /** The page has booted and drawn its first frame. */
  ready(): boolean;
  /** What a Node replay of log() needs besides the log: the seed and the content hash. */
  flags(): { sandbox: boolean; seed: number; content: string };
  /** Queues a command for the next tick, as the player's input does. */
  send(command: CommandBody): void;
  stats(): Record<StatName, number>;
  state(): TdState;
  /** The world hash, 8 hex digits. */
  hash(): string;
  /** Building ids by definition index (the `def` of a build command). */
  defs(): string[];
  canPlace(id: string, x: number, z: number): Placement;
  /** Recent rare events, oldest first. */
  events(): RareEvent[];
  log(): Command[];
};

export function installDevHandle(handle: TdDevHandle): void {
  (window as unknown as { __td?: TdDevHandle }).__td = handle;
}
