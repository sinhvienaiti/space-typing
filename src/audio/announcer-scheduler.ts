export type AnnouncerPriority = "critical" | "normal" | "flavor";

export type ScheduledAnnouncerEvent<TEvent extends string = string> = Readonly<{
  eventId: string;
  event: TEvent;
  priority: AnnouncerPriority;
  rank: number;
  sessionId: string;
  roundId?: string;
  createdAtMonotonicMs: number;
  ttlMs: number;
  coalesceKey?: string;
}>;

const PRIORITY_WEIGHT: Record<AnnouncerPriority, number> = {
  critical: 3,
  normal: 2,
  flavor: 1,
};

export class AnnouncerScheduler<TEvent extends string = string> {
  private readonly queue: ScheduledAnnouncerEvent<TEvent>[] = [];

  constructor(private readonly capacity = 8) {}

  enqueue(event: ScheduledAnnouncerEvent<TEvent>, nowMs: number): void {
    this.prune(nowMs);
    if (event.ttlMs <= 0) return;
    if (event.coalesceKey !== undefined) {
      const index = this.queue.findIndex((queued) => queued.coalesceKey === event.coalesceKey);
      if (index >= 0) {
        const queued = this.queue[index]!;
        if (queued.rank > event.rank) return;
        this.queue.splice(index, 1);
      }
    }
    this.queue.push(event);
    this.queue.sort((a, b) => {
      const priority = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
      return priority !== 0 ? priority : a.createdAtMonotonicMs - b.createdAtMonotonicMs;
    });
    while (this.queue.length > this.capacity) this.queue.pop();
  }

  takeNext(nowMs: number, pronunciationActive: boolean): ScheduledAnnouncerEvent<TEvent> | null {
    this.prune(nowMs);
    for (let index = 0; index < this.queue.length; index += 1) {
      const candidate = this.queue[index]!;
      if (pronunciationActive) {
        if (candidate.priority === "flavor") {
          this.queue.splice(index, 1);
          index -= 1;
          continue;
        }
        if (candidate.priority === "normal") continue;
      }
      this.queue.splice(index, 1);
      return candidate;
    }
    return null;
  }

  clearRound(roundId: string): void {
    for (let index = this.queue.length - 1; index >= 0; index -= 1) {
      if (this.queue[index]?.roundId === roundId) this.queue.splice(index, 1);
    }
  }

  clear(): void {
    this.queue.length = 0;
  }

  snapshot(): readonly ScheduledAnnouncerEvent<TEvent>[] {
    return [...this.queue];
  }

  private prune(nowMs: number): void {
    for (let index = this.queue.length - 1; index >= 0; index -= 1) {
      const item = this.queue[index]!;
      if (nowMs - item.createdAtMonotonicMs >= item.ttlMs) this.queue.splice(index, 1);
    }
  }
}
