import { describe, expect, it } from "vitest";
import {
  AssetPreviewMutationQueue,
  AssetPreviewSupersededError,
} from "../src/admin/asset-preview-mutation-queue";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("AssetPreviewMutationQueue", () => {
  it("serializes mutations and keeps the lane usable after a superseded rejection", async () => {
    const queue = new AssetPreviewMutationQueue();
    const firstGate = deferred<void>();
    const order: string[] = [];

    const first = queue.run(async () => {
      order.push("first:start");
      await firstGate.promise;
      order.push("first:end");
      throw new AssetPreviewSupersededError();
    });
    const second = queue.run(async () => {
      order.push("second");
      return 2;
    });

    await Promise.resolve();
    expect(order).toEqual(["first:start"]);
    firstGate.resolve();
    await expect(first).rejects.toBeInstanceOf(AssetPreviewSupersededError);
    await expect(second).resolves.toBe(2);
    expect(order).toEqual(["first:start", "first:end", "second"]);

    await expect(queue.run(async () => 3)).resolves.toBe(3);
  });
});
