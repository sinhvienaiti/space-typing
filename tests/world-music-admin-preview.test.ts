import { describe, expect, it } from "vitest";
import {
  createWorldMusicAdminPreview,
  WORLD_MUSIC_ADMIN_PREVIEW_PROTOCOL_VERSION,
} from "../src/admin/world-music-preview";
import {
  B2_LEGACY_FALLBACK_WORLD_ID,
  B2_PILOT_BOSS_TRACK_ID,
  B2_PILOT_BOSS_WORLD_ID,
} from "../src/audio/world-music-default-policy";
import type { WorldMusicPolicy } from "../src/audio/world-music-model";

function world(preview: ReturnType<typeof createWorldMusicAdminPreview>, worldId: string) {
  const match = preview.worlds.find((item) => item.worldId === worldId);
  if (match === undefined) throw new Error(`Missing ${worldId}`);
  return match;
}

describe("World Music Admin preview V1", () => {
  it("exports one deterministic canonical preview for all 50 Worlds", () => {
    const preview = createWorldMusicAdminPreview();
    expect(preview.protocolVersion).toBe(WORLD_MUSIC_ADMIN_PREVIEW_PROTOCOL_VERSION);
    expect(preview.worlds).toHaveLength(50);
    expect(preview.configRevision).toBe("b2-three-world-pilot-v1");
    expect(preview.manifestRevision.length).toBeGreaterThan(0);
    expect(world(preview, "world-01").states.normal).toMatchObject({
      resolvedFrom: "world-01.generated.normal",
      badges: ["READY"],
    });
  });

  it("surfaces the dedicated World-10 single-file boss through the canonical resolver", () => {
    const resolved = world(
      createWorldMusicAdminPreview(),
      B2_PILOT_BOSS_WORLD_ID,
    ).states.world;
    expect(resolved.resolvedFrom).toBe("world-10.generated.world");
    expect(resolved.trackIds).toEqual([B2_PILOT_BOSS_TRACK_ID]);
    expect(resolved.tracks).toEqual([
      expect.objectContaining({
        id: B2_PILOT_BOSS_TRACK_ID,
        playbackKind: "single",
      }),
    ]);
    expect(resolved.badges).toEqual(["READY"]);
  });

  it("reports intentional legacy and same-World boss fallback without guessing in Admin", () => {
    const preview = createWorldMusicAdminPreview();
    const normal = world(preview, B2_LEGACY_FALLBACK_WORLD_ID).states.normal;
    const boss = world(preview, B2_LEGACY_FALLBACK_WORLD_ID).states.world;

    expect(normal.resolvedFrom).toBe("world-11.legacy.normal");
    expect(normal.badges).toContain("INHERIT");
    expect(normal.badges).toContain("LEGACY FALLBACK");

    expect(boss.resolvedFrom).toBe("world-11.legacy.normal");
    expect(boss.badges).toContain("LEGACY FALLBACK");
    expect(boss.badges).toContain("BOSS FALLBACK TO WORLD");
  });

  it("previews a published replacement through the exact runtime resolver", () => {
    const policy: WorldMusicPolicy = {
      configRevision: "admin-preview-test-v1",
      worlds: {
        "world-01": {
          normal: {
            kind: "replace",
            trackIds: ["signal-in-the-void"],
            selectionMode: "ordered",
          },
        },
      },
    };
    const preview = createWorldMusicAdminPreview({ publishedPolicy: policy });
    const resolved = world(preview, "world-01").states.normal;
    expect(preview.configRevision).toBe("admin-preview-test-v1");
    expect(resolved.resolvedFrom).toBe("world-01.published.normal");
    expect(resolved.trackIds).toEqual(["signal-in-the-void"]);
    expect(resolved.badges).toEqual(["REPLACED"]);
  });

  it("applies Stage scope only to the selected stage's owning World", () => {
    const policy: WorldMusicPolicy = {
      configRevision: "admin-stage-preview-test-v1",
      stages: {
        "101": {
          normal: {
            kind: "replace",
            trackIds: ["signal-in-the-void"],
            selectionMode: "ordered",
          },
        },
      },
    };
    const preview = createWorldMusicAdminPreview({ publishedPolicy: policy, stageNumber: 101 });
    expect(preview.stageNumber).toBe(101);
    expect(world(preview, "world-06").states.normal).toMatchObject({
      resolvedFrom: "stage-101.published.normal",
      trackIds: ["signal-in-the-void"],
      badges: expect.arrayContaining(["STAGE OVERRIDE"]),
    });
    expect(world(preview, "world-07").states.normal.resolvedFrom).not.toContain("stage-101");
  });
});
