import { describe, expect, it, vi } from "vitest";
import {
  fetchPublishedBossRuntimeSession,
  materializeBossRuntimeSession,
} from "../src/admin/boss-runtime-policy";

describe("Boss Admin runtime policy", () => {
  it("materializes supported name/title overrides", () => {
    const session = materializeBossRuntimeSession({
      applyBoundary: "new-session",
      activeRevision: "rev-7",
      policy: {
        configRevision: "bosses-7",
        bosses: {
          "tyrant-g01": { name: "  Aurora  ", title: "Sovereign of Dawn" },
          "unknown-boss": { name: "Ignored" },
        },
      },
    });
    expect(session.source).toBe("published");
    expect(session.activeRevision).toBe("rev-7");
    expect(session.bosses["tyrant-g01"]).toEqual({ name: "Aurora", title: "Sovereign of Dawn" });
    expect(session.bosses["unknown-boss"]).toBeUndefined();
  });

  it("rejects unsupported fields and malformed envelopes", () => {
    expect(materializeBossRuntimeSession({
      applyBoundary: "new-session",
      policy: {
        configRevision: "bosses-8",
        bosses: { "warden-frost": { hp: 999999 } },
      },
    }).bosses["warden-frost"]).toBeUndefined();

    expect(materializeBossRuntimeSession({
      applyBoundary: "immediate",
      policy: { configRevision: "bosses-8", bosses: {} },
    }).source).toBe("bundled");
  });

  it("falls back to bundled policy when fetch fails", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    const session = await fetchPublishedBossRuntimeSession(fetchImpl as unknown as typeof fetch);
    expect(session.source).toBe("bundled");
    expect(session.bosses).toEqual({});
  });
});
