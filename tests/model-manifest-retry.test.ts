import { afterEach, describe, expect, it, vi } from "vitest";
import { modelManifest, resetModelManifest } from "../src/render3d/model-loader";

afterEach(() => { resetModelManifest(); vi.useRealTimers(); });
describe("model manifest recovery", () => {
  it("reuses an in-flight fetch but retries a missing manifest after thirty seconds", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValueOnce(new Response("missing", { status: 404 })).mockResolvedValue(new Response(JSON.stringify({version:1,models:{}}), {headers:{"content-type":"application/json"}}));
    const first = modelManifest(fetcher);
    expect(modelManifest(fetcher)).toBe(first);
    expect(await first).toBeNull();
    await vi.advanceTimersByTimeAsync(29_999);
    expect(await modelManifest(fetcher)).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await modelManifest(fetcher)).toMatchObject({version:1,models:{}});
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
