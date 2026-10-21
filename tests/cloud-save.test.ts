import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chooseCopy, CloudSave, type CloudConflict } from "../src/online/cloud-save";
import type { OnlineSession } from "../src/online/session";

/** Cloud save sync on the client (src/online/cloud-save.ts) against a fake /api/account/save. */

type Call = { method: string; body: Record<string, unknown> | null };

function fakeServer(initial: { revision: number; data: Record<string, unknown>; uploadId?: string } | null) {
  let cloud = initial;
  const calls: Call[] = [];
  let next: ((body: Record<string, unknown>) => Response | null) | null = null;
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const fetch = vi.fn(async (_url: string, init: RequestInit) => {
    const method = init.method ?? "GET";
    const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    calls.push({ method, body });
    if (method === "GET") return cloud === null ? json(404, { error: "no-save" }) : json(200, { ...cloud, updatedAt: "2026-10-16T16:10:00.000Z", uploadId: cloud.uploadId ?? null });
    const override = next?.(body!) ?? null;
    if (override !== null) return override;
    const base = Number(body!.baseRevision);
    if ((cloud?.revision ?? 0) !== base && body!.force !== true) {
      const data = cloud!.data as { credits?: number; campaign?: { highestUnlockedStage?: number; clearedStages?: unknown[] } };
      return json(409, {
        error: "save-conflict",
        message: "Another device saved newer progress.",
        details: { revision: cloud!.revision, summary: { credits: data.credits, highestUnlockedStage: data.campaign?.highestUnlockedStage, clearedStages: data.campaign?.clearedStages?.length ?? 0 } },
      });
    }
    cloud = { revision: (cloud?.revision ?? 0) + 1, data: body!.data as Record<string, unknown>, uploadId: String(body!.uploadId) };
    return json(200, { revision: cloud.revision });
  });
  return {
    fetch,
    calls,
    puts: () => calls.filter((call) => call.method === "PUT"),
    cloud: () => cloud,
    setCloud: (value: typeof cloud) => (cloud = value),
    respond: (fn: typeof next) => (next = fn),
  };
}

const FRESH = { version: 28, credits: 0, campaign: { highestUnlockedStage: 1, clearedStages: [] } };
const PLAYED = { version: 28, credits: 900, campaign: { highestUnlockedStage: 6, clearedStages: [1, 2, 3, 4, 5] } };

function setup(local: Record<string, unknown> | null, server: ReturnType<typeof fakeServer>, stored?: unknown) {
  const memory = new Map<string, string>();
  if (stored !== undefined) memory.set("spaceTypingCloudSaveV1:acc", JSON.stringify(stored));
  vi.stubGlobal("localStorage", { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value) });
  vi.stubGlobal("window", { setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms), clearTimeout: (id: number) => clearTimeout(id) });
  vi.stubGlobal("navigator", { userAgent: "vitest" });
  vi.stubGlobal("fetch", server.fetch);
  const listeners: (() => void)[] = [];
  const session = { online: true, account: { id: "acc" }, onChange: (fn: () => void) => listeners.push(fn) } as unknown as OnlineSession;
  const conflicts: CloudConflict[] = [];
  const restored: unknown[] = [];
  const statuses: string[] = [];
  const host = { refuse: false, reloads: 0 };
  const sync = new CloudSave(session, {
    currentSave: () => local as { version: number },
    restore: async (save) => {
      if (host.refuse) throw new Error("Finish the current sortie first.");
      restored.push(save);
    },
    reload: () => {
      host.reloads += 1;
    },
    canSync: () => true,
    conflict: (conflict) => conflicts.push(conflict),
    status: (text) => statuses.push(text),
  });
  const attach = async () => {
    listeners.forEach((fn) => fn());
    await vi.advanceTimersByTimeAsync(100);
  };
  return { sync, conflicts, restored, statuses, attach, memory, host };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("cloud save: which copy to keep", () => {
  it("asks only when both copies have campaign progress", () => {
    expect(chooseCopy({ highestUnlockedStage: 1, clearedStages: 0, credits: 0 }, { highestUnlockedStage: 1, clearedStages: 0, credits: 0 })).toBe("local");
    expect(chooseCopy({ highestUnlockedStage: 1, clearedStages: 0, credits: 0 }, { highestUnlockedStage: 1, clearedStages: 0, credits: 300 })).toBe("cloud");
    expect(chooseCopy({ highestUnlockedStage: 1, clearedStages: 0 }, { highestUnlockedStage: 6, clearedStages: 5 })).toBe("cloud");
    expect(chooseCopy({ highestUnlockedStage: 6, clearedStages: 5 }, { highestUnlockedStage: 1, clearedStages: 0 })).toBe("local");
    expect(chooseCopy({ highestUnlockedStage: 6, clearedStages: 5 }, { highestUnlockedStage: 9, clearedStages: 8 })).toBe("ask");
  });
});

describe("cloud save sync", () => {
  it("a brand-new guest uploads its first copy without any prompt", async () => {
    const server = fakeServer(null);
    const t = setup(FRESH, server);
    await t.attach();
    expect(server.puts().map((call) => call.body?.baseRevision)).toEqual([0]);
    expect(t.conflicts).toEqual([]);
    expect(JSON.parse(t.memory.get("spaceTypingCloudSaveV1:acc")!).revision).toBe(1);
  });

  it("a fresh device that finds another fresh copy (other tab, other port, other device) keeps going without a prompt", async () => {
    const server = fakeServer({ revision: 1, data: FRESH });
    const t = setup(FRESH, server);
    await t.attach();
    expect(t.conflicts).toEqual([]);
    expect(t.restored).toEqual([]);
    expect(server.puts().map((call) => call.body?.baseRevision)).toEqual([1]);
  });

  it("a fresh device takes a cloud copy with progress", async () => {
    const server = fakeServer({ revision: 4, data: PLAYED });
    const t = setup(FRESH, server);
    await t.attach();
    expect(t.restored).toEqual([PLAYED]);
    expect(t.conflicts).toEqual([]);
    expect(t.host.reloads).toBe(1);
    expect(JSON.parse(t.memory.get("spaceTypingCloudSaveV1:acc")!).revision).toBe(4);
  });

  it("a refused restore keeps the old revision, so this device cannot overwrite the other device's progress", async () => {
    const server = fakeServer({ revision: 4, data: PLAYED });
    const t = setup(FRESH, server);
    t.host.refuse = true; // The local account is still loading, or a sortie runs.
    await t.attach();
    expect(t.restored).toEqual([]);
    expect(t.memory.has("spaceTypingCloudSaveV1:acc")).toBe(false);
    t.sync.noteCommitted();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(server.puts().map((call) => call.body?.baseRevision)).toEqual([0]);
    expect(server.cloud()).toMatchObject({ revision: 4, data: PLAYED });
    expect(t.host.reloads).toBe(0);
    t.host.refuse = false; // Next try a minute later, once the sortie has ended.
    await vi.advanceTimersByTimeAsync(61_000);
    expect(server.puts().map((call) => call.body?.baseRevision)).toEqual([0, 0]);
    expect(server.cloud()).toMatchObject({ revision: 4, data: PLAYED });
    expect(t.restored).toEqual([PLAYED]);
    expect(t.host.reloads).toBe(1);
    expect(JSON.parse(t.memory.get("spaceTypingCloudSaveV1:acc")!).revision).toBe(4);
  });

  it("asks when both copies have progress", async () => {
    const server = fakeServer({ revision: 4, data: { ...PLAYED, credits: 50 } });
    const t = setup(PLAYED, server, { revision: 2 });
    await t.attach();
    expect(t.conflicts).toHaveLength(1);
    expect(server.puts()).toEqual([]);
  });

  it("an upload that meets a fresh cloud copy goes on top of it instead of prompting", async () => {
    const server = fakeServer({ revision: 1, data: FRESH });
    const t = setup(PLAYED, server, { revision: 1 });
    await t.attach(); // Uploads on top of revision 1 → revision 2.
    // Another tab or device writes a fresh copy in between (revision 3).
    server.setCloud({ revision: 3, data: FRESH });
    t.sync.noteCommitted();
    await vi.advanceTimersByTimeAsync(61_000);
    expect(t.conflicts).toEqual([]);
    expect(server.puts().map((call) => call.body?.baseRevision)).toEqual([1, 2, 3]);
  });

  it("recognises its own page-close upload whose answer never came", async () => {
    const server = fakeServer({ revision: 3, data: PLAYED, uploadId: "tag-1" });
    const t = setup(PLAYED, server, { revision: 2, pending: { from: 2, tag: "tag-1", uploaded: "x" } });
    await t.attach();
    expect(t.conflicts).toEqual([]);
    expect(t.restored).toEqual([]);
    expect(server.puts().map((call) => call.body?.baseRevision)).toEqual([3]);
  });

  it("stops uploading when the cloud save comes from a newer game version", async () => {
    const server = fakeServer(null);
    server.respond(() => new Response(JSON.stringify({ error: "client-outdated", message: "Reload the page to update." }), { status: 409, headers: { "content-type": "application/json" } }));
    const t = setup(FRESH, server);
    await t.attach();
    t.sync.noteCommitted();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(server.puts()).toHaveLength(1);
    expect(t.statuses.some((text) => /paused/.test(text))).toBe(true);
  });
});
