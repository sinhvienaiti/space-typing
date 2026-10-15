import { describe, expect, it, vi } from "vitest";
import { AssetPreviewResourceScope } from "../src/admin/asset-preview-lifecycle";

describe("A5 asset preview resource lifecycle", () => {
  it("cancels RAF, aborts listeners/fetches and disposes owned resources exactly once", () => {
    const scope = new AssetPreviewResourceScope();
    const cancel = vi.fn();
    const dispose = vi.fn();

    expect(scope.signal.aborted).toBe(false);
    scope.setAnimationFrame(42, cancel);
    scope.addDisposer(dispose);

    scope.dispose();
    scope.dispose();

    expect(scope.signal.aborted).toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledWith(42);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(scope.isDisposed).toBe(true);
  });

  it("immediately cancels a frame and disposes a resource registered after teardown", () => {
    const scope = new AssetPreviewResourceScope();
    const cancel = vi.fn();
    const dispose = vi.fn();
    scope.dispose();

    scope.setAnimationFrame(7, cancel);
    scope.addDisposer(dispose);

    expect(cancel).toHaveBeenCalledWith(7);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("allows a disposer to be detached before teardown", () => {
    const scope = new AssetPreviewResourceScope();
    const dispose = vi.fn();
    const remove = scope.addDisposer(dispose);
    remove();

    scope.dispose();
    expect(dispose).not.toHaveBeenCalled();
  });
});
