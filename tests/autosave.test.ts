import { describe, expect, it } from "vitest";
import { AutosaveQueue } from "../src/persistence/autosave";

describe("AutosaveQueue", () => {
  it("keeps only the latest pending snapshot before flush", async () => {
    const writes: Array<{ value: number; reason: string }> = [];
    const queue = new AutosaveQueue<number, string>(
      async (value, reason) => {
        writes.push({ value, reason });
        return reason;
      },
    );

    queue.schedule(1, "first");
    queue.schedule(2, "latest");

    expect(queue.hasPending()).toBe(true);
    await expect(queue.flush()).resolves.toBe("latest");
    expect(queue.hasPending()).toBe(false);
    expect(writes).toEqual([{ value: 2, reason: "latest" }]);
  });

  it("serializes writes so a later save cannot finish before an older save", async () => {
    const order: string[] = [];
    let releaseFirst: (() => void) | null = null;
    let markFirstStarted: (() => void) | null = null;
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve;
    });

    const queue = new AutosaveQueue<number, number>(
      async (value) => {
        order.push("start-" + String(value));
        if (value === 1) {
          markFirstStarted?.();
          await new Promise<void>((resolve) => {
            releaseFirst = resolve;
          });
        }
        order.push("end-" + String(value));
        return value;
      },
    );

    queue.schedule(1, "first");
    const first = queue.flush();

    queue.schedule(2, "second");
    const second = queue.flush();

    await firstStarted;
    expect(order).toEqual(["start-1"]);

    releaseFirst?.();
    await expect(first).resolves.toBe(1);
    await expect(second).resolves.toBe(2);
    expect(order).toEqual([
      "start-1",
      "end-1",
      "start-2",
      "end-2",
    ]);
  });

  it("can override the reason when flushing for page hide", async () => {
    const reasons: string[] = [];
    const queue = new AutosaveQueue<number, void>(
      async (_value, reason) => {
        reasons.push(reason);
      },
    );

    queue.schedule(7, "stage-select");
    await queue.flush("pagehide");

    expect(reasons).toEqual(["pagehide"]);
  });
});
