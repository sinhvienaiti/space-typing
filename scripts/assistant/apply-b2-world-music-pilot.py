import json
from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file = Path(path)
    text = file.read_text()
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: anchor count={count}")
    file.write_text(text.replace(old, new, 1))


# ---------------------------------------------------------------------------
# Pilot B: first authored World-specific descriptor. It references an existing
# CC0 recording instead of copying audio into per-World folders.
# ---------------------------------------------------------------------------
descriptor_path = Path(
    "public/assets/audio/music/worlds/world-10/boss/battle-theme-b/track.json"
)
descriptor_path.parent.mkdir(parents=True, exist_ok=True)
descriptor = {
    "id": "world-10-boss-battle-theme-b",
    "title": "Battle Theme B",
    "playback": {
        "kind": "single",
        "sources": [
            {
                "src": "/assets/audio/music/battle-theme-b.mp3",
                "codec": "audio/mpeg",
            }
        ],
    },
    "durationSeconds": 66,
    "loop": True,
    "metadata": {
        "mood": "climactic",
        "provenance": "Battle Theme B for RPG — cynicmusic/pixelsphere — CC0",
    },
}
expected_descriptor = json.dumps(descriptor, ensure_ascii=False, indent=2) + "\n"
if descriptor_path.exists() and descriptor_path.read_text() != expected_descriptor:
    raise SystemExit(f"{descriptor_path}: unexpected existing content")
descriptor_path.write_text(expected_descriptor)


# ---------------------------------------------------------------------------
# Generated migration policy:
# - Pilot A world-01 keeps its existing ordered stem playlist.
# - Pilot B world-10 gains a dedicated single-file World boss assignment.
# - Pilot C world-11 explicitly inherits so canonical resolution reaches the
#   legacy World playlist fallback instead of a generated assignment.
# ---------------------------------------------------------------------------
policy_path = Path("src/audio/world-music-default-policy.ts")
policy_content = '''import { MUSIC_TRACKS, worldPlaylist } from "./music-library";
import { WORLD_IDS } from "../worlds/registry";
import type { WorldMusicPolicy } from "./world-music-model";

export const B2_PILOT_STEM_WORLD_ID = "world-01";
export const B2_PILOT_BOSS_WORLD_ID = "world-10";
export const B2_PILOT_BOSS_TRACK_ID = "world-10-boss-battle-theme-b";
export const B2_LEGACY_FALLBACK_WORLD_ID = "world-11";

/**
 * B2 three-World migration pilot layered over the pre-V2 Galaxy rotation.
 *
 * World-01 proves the existing calm/intense stem path, World-10 adds the first
 * authored single-file boss assignment, and World-11 deliberately inherits so
 * the canonical resolver must exercise the explicit legacy World fallback.
 * The remaining Worlds stay on generated stable-ID assignments until this
 * pilot is accepted; the catalog remains discovery-only, never policy storage.
 */
export const GENERATED_WORLD_MUSIC_POLICY: WorldMusicPolicy = {
  configRevision: "b2-three-world-pilot-v1",
  worlds: Object.fromEntries(
    WORLD_IDS.map((worldId) => [
      worldId,
      {
        normal:
          worldId === B2_LEGACY_FALLBACK_WORLD_ID
            ? { kind: "inherit" as const }
            : {
                kind: "replace" as const,
                trackIds: worldPlaylist(worldId),
                selectionMode: "ordered" as const,
              },
        ...(worldId === B2_PILOT_BOSS_WORLD_ID
          ? {
              boss: {
                world: {
                  kind: "replace" as const,
                  trackIds: [B2_PILOT_BOSS_TRACK_ID],
                  selectionMode: "ordered" as const,
                },
              },
            }
          : {}),
      },
    ]),
  ),
  global: {
    normal: {
      kind: "replace",
      trackIds: MUSIC_TRACKS.map((track) => track.id),
      selectionMode: "shuffle-bag",
    },
  },
};
'''
policy_path.write_text(policy_content)


# ---------------------------------------------------------------------------
# Official deterministic catalog command. This remains after the pilot so B3
# Admin/publish workflows have one supported generator entrypoint.
# ---------------------------------------------------------------------------
package_path = Path("package.json")
package = json.loads(package_path.read_text())
scripts = package.setdefault("scripts", {})
scripts["music:catalog"] = "node scripts/music/build-world-music-catalog.mjs"
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n")


# ---------------------------------------------------------------------------
# Policy regression coverage.
# ---------------------------------------------------------------------------
policy_test_path = Path("tests/world-music-default-policy.test.ts")
policy_test_content = '''import { describe, expect, it } from "vitest";
import { MUSIC_TRACKS, worldPlaylist } from "../src/audio/music-library";
import {
  B2_LEGACY_FALLBACK_WORLD_ID,
  B2_PILOT_BOSS_TRACK_ID,
  B2_PILOT_BOSS_WORLD_ID,
  GENERATED_WORLD_MUSIC_POLICY,
} from "../src/audio/world-music-default-policy";
import { WORLD_IDS } from "../src/worlds/registry";

describe("generated World music migration policy", () => {
  it("keeps all 50 Worlds explicit while reserving world-11 for the legacy fallback pilot", () => {
    expect(WORLD_IDS).toHaveLength(50);
    expect(Object.keys(GENERATED_WORLD_MUSIC_POLICY.worlds ?? {})).toHaveLength(50);
    for (const worldId of WORLD_IDS) {
      if (worldId === B2_LEGACY_FALLBACK_WORLD_ID) {
        expect(GENERATED_WORLD_MUSIC_POLICY.worlds?.[worldId]?.normal).toEqual({
          kind: "inherit",
        });
        continue;
      }
      expect(GENERATED_WORLD_MUSIC_POLICY.worlds?.[worldId]?.normal).toEqual({
        kind: "replace",
        trackIds: worldPlaylist(worldId),
        selectionMode: "ordered",
      });
    }
  });

  it("assigns the dedicated single-file boss only to the B2 boss pilot World", () => {
    expect(
      GENERATED_WORLD_MUSIC_POLICY.worlds?.[B2_PILOT_BOSS_WORLD_ID]?.boss?.world,
    ).toEqual({
      kind: "replace",
      trackIds: [B2_PILOT_BOSS_TRACK_ID],
      selectionMode: "ordered",
    });

    for (const worldId of WORLD_IDS) {
      if (worldId === B2_PILOT_BOSS_WORLD_ID) continue;
      expect(GENERATED_WORLD_MUSIC_POLICY.worlds?.[worldId]?.boss).toBeUndefined();
    }
  });

  it("uses the complete eligible legacy library only as the generated global normal fallback", () => {
    expect(GENERATED_WORLD_MUSIC_POLICY.global?.normal).toEqual({
      kind: "replace",
      trackIds: MUSIC_TRACKS.map((track) => track.id),
      selectionMode: "shuffle-bag",
    });
  });
});
'''
policy_test_path.write_text(policy_test_content)


# ---------------------------------------------------------------------------
# End-to-end resolver proof for the three pilot cases against the generated
# bundled catalog.
# ---------------------------------------------------------------------------
pilot_test_path = Path("tests/world-music-b2-pilot.test.ts")
pilot_test_content = '''import { describe, expect, it } from "vitest";
import { worldPlaylist } from "../src/audio/music-library";
import {
  B2_LEGACY_FALLBACK_WORLD_ID,
  B2_PILOT_BOSS_TRACK_ID,
  B2_PILOT_BOSS_WORLD_ID,
  B2_PILOT_STEM_WORLD_ID,
  GENERATED_WORLD_MUSIC_POLICY,
} from "../src/audio/world-music-default-policy";
import {
  BUNDLED_WORLD_MUSIC_CATALOG,
  resolveRuntimeWorldPlaylist,
} from "../src/audio/world-music-runtime";

function resolve(
  worldId: string,
  state: "WORLD_NORMAL" | "WORLD_BOSS",
  musicMode: "map" | "random" = "map",
) {
  return resolveRuntimeWorldPlaylist({
    worldId,
    state,
    musicMode,
    generatedPolicy: GENERATED_WORLD_MUSIC_POLICY,
    legacyWorldTrackIds: worldPlaylist(worldId),
    randomNormalTrackIds: BUNDLED_WORLD_MUSIC_CATALOG.tracks.map((track) => track.id),
  });
}

function descriptor(id: string) {
  return BUNDLED_WORLD_MUSIC_CATALOG.tracks.find((track) => track.id === id);
}

describe("B2 three-World music migration pilot", () => {
  it("Pilot A: world-01 resolves its ordered normal playlist to calm/intense stem tracks", () => {
    const resolved = resolve(B2_PILOT_STEM_WORLD_ID, "WORLD_NORMAL");

    expect(resolved?.trackIds).toEqual(worldPlaylist(B2_PILOT_STEM_WORLD_ID));
    expect(resolved?.selectionMode).toBe("ordered");
    expect(resolved?.resolvedFrom).toBe(`${B2_PILOT_STEM_WORLD_ID}.generated.normal`);
    expect(resolved?.trackIds.length).toBeGreaterThan(0);
    for (const trackId of resolved?.trackIds ?? []) {
      expect(descriptor(trackId)?.playback.kind).toBe("stems");
    }
  });

  it("Pilot B: world-10 resolves a dedicated catalog-only single-file boss in map and random modes", () => {
    for (const musicMode of ["map", "random"] as const) {
      const resolved = resolve(B2_PILOT_BOSS_WORLD_ID, "WORLD_BOSS", musicMode);
      expect(resolved?.trackIds).toEqual([B2_PILOT_BOSS_TRACK_ID]);
      expect(resolved?.selectionMode).toBe("ordered");
      expect(resolved?.resolvedFrom).toBe(`${B2_PILOT_BOSS_WORLD_ID}.generated.world`);
    }

    const track = descriptor(B2_PILOT_BOSS_TRACK_ID);
    expect(track).toBeDefined();
    expect(track?.playback.kind).toBe("single");
    if (track?.playback.kind === "single") {
      expect(track.playback.sources.map((source) => source.src)).toEqual([
        "/assets/audio/music/battle-theme-b.mp3",
      ]);
    }
    expect(track?.metadata?.provenance).toContain("CC0");
  });

  it("Pilot C: world-11 has no dedicated assignment and reaches the explicit legacy World fallback", () => {
    const resolved = resolve(B2_LEGACY_FALLBACK_WORLD_ID, "WORLD_NORMAL");

    expect(resolved?.trackIds).toEqual(worldPlaylist(B2_LEGACY_FALLBACK_WORLD_ID));
    expect(resolved?.resolvedFrom).toBe(`${B2_LEGACY_FALLBACK_WORLD_ID}.legacy.normal`);
    expect(resolved?.fallbackTrace.some((step) => step.startsWith(
      `${B2_LEGACY_FALLBACK_WORLD_ID}.none.normal:0`,
    ))).toBe(true);
    expect(resolved?.fallbackTrace.some((step) => step.startsWith(
      `${B2_LEGACY_FALLBACK_WORLD_ID}.legacy.normal:`,
    ))).toBe(true);
  });
});
'''
if pilot_test_path.exists() and pilot_test_path.read_text() != pilot_test_content:
    raise SystemExit(f"{pilot_test_path}: unexpected existing content")
pilot_test_path.write_text(pilot_test_content)
