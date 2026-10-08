import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

function runPreview(input: unknown): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync("pnpm", ["exec", "tsx", "scripts/admin/boss-registry-preview.ts"], {
    cwd: rootDir,
    input: JSON.stringify(input),
    encoding: "utf8",
    timeout: 10000,
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe("Boss Admin preview protocol", () => {
  it("returns bundled registry metadata when no policy is supplied", () => {
    const result = runPreview({});
    expect(result.status, result.stderr).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      protocolVersion: number;
      configRevision: string;
      authorableFields: string[];
      bosses: Array<{ id: string; overridden: boolean }>;
    };
    expect(payload.protocolVersion).toBe(1);
    expect(payload.configRevision).toBe("bundled-boss-registry");
    expect(payload.authorableFields).toEqual(["name", "title"]);
    expect(payload.bosses).toHaveLength(26);
    expect(payload.bosses.every((boss) => boss.overridden === false)).toBe(true);
  });

  it("applies supported name/title overrides without mutating canonical metadata", () => {
    const result = runPreview({
      policy: {
        configRevision: "bosses-admin-test",
        bosses: {
          "tyrant-g01": { name: "Aurora Tyrant", title: "Sovereign of Dawn" },
        },
      },
    });
    expect(result.status, result.stderr).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      configRevision: string;
      bosses: Array<{ id: string; name: string; title: string; role: string; rank: string; family: string; overridden: boolean }>;
    };
    expect(payload.configRevision).toBe("bosses-admin-test");
    const boss = payload.bosses.find((entry) => entry.id === "tyrant-g01");
    expect(boss).toMatchObject({
      id: "tyrant-g01",
      name: "Aurora Tyrant",
      title: "Sovereign of Dawn",
      overridden: true,
    });
    expect(boss?.role).toBeTruthy();
    expect(boss?.rank).toBeTruthy();
    expect(boss?.family).toBeTruthy();
  });

  it("rejects malformed policies instead of silently previewing bundled data", () => {
    const result = runPreview({
      policy: {
        configRevision: "bosses-admin-bad",
        bosses: { "warden-frost": { hp: 999999 } },
      },
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Boss Admin preview policy is malformed or incompatible");
  });
});
