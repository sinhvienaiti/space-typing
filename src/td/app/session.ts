/**
 * Runs a world in real time: fixed 1/60 s steps at the world's game speed
 * (the sandbox's 0.75 / 1 / 2), at most 10 a frame (docs/td/TYPING_DEFENSE_DESIGN.md
 * 25.5). Input becomes commands stamped with the tick they act on, and every
 * command goes into the log a replay feeds back through the same step.
 */
import { MAX_STEPS_PER_FRAME, TICK_HZ } from "../content/rules";
import type { Command, CommandBody } from "../sim/commands";
import { createWorld, step, type World, type WorldOptions } from "../sim/world";

const STEP_MS = 1000 / TICK_HZ;
/** A frame later than this (a background tab) does not try to catch up. */
const MAX_FRAME_MS = 250;

export class Session {
  readonly world: World;
  readonly log: Command[] = [];
  paused = false;
  private readonly pending: CommandBody[] = [];
  private carry = 0;
  private last = -1;

  constructor(options: WorldOptions) {
    this.world = createWorld(options);
  }

  /** Queues a command for the next step. */
  send(body: CommandBody): void {
    this.pending.push(body);
  }

  /** Steps for the time since the last frame; returns how many steps ran. */
  frame(now: number): number {
    const elapsed = this.last < 0 ? 0 : Math.min(MAX_FRAME_MS, Math.max(0, now - this.last));
    this.last = now;
    if (this.paused) return 0;
    this.carry += elapsed * this.world.speed;
    let steps = Math.floor(this.carry / STEP_MS);
    if (steps > MAX_STEPS_PER_FRAME) {
      steps = MAX_STEPS_PER_FRAME;
      this.carry = 0;
    } else {
      this.carry -= steps * STEP_MS;
    }
    for (let index = 0; index < steps; index += 1) this.tick();
    return steps;
  }

  /** One step now, with every queued command stamped with this tick. */
  tick(): void {
    const commands = this.pending.splice(0).map((body) => ({ ...body, tick: this.world.tick }) as Command);
    this.log.push(...commands);
    step(this.world, commands);
  }
}
