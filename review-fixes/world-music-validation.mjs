import fs from "node:fs";

function replaceUnique(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Duplicate ${label}`);
  }
  return source.replace(before, after);
}

const modelPath = "src/audio/world-music-model.ts";
let model = fs.readFileSync(modelPath, "utf8");

model = replaceUnique(
  model,
  `  const catalogIds = new Set(input.catalog.tracks.map((track) => track.id));\n  const disabled = new Set(input.publishedPolicy?.disabledTrackIds ?? []);`,
  `  const catalogIds = new Set(input.catalog.tracks.map((track) => track.id));\n  // A generated safety disable is a lower-bound kill switch. A published\n  // policy may add disables but must never silently resurrect a generated\n  // disabled asset.\n  const disabled = new Set([\n    ...(input.generatedPolicy?.disabledTrackIds ?? []),\n    ...(input.publishedPolicy?.disabledTrackIds ?? []),\n  ]);`,
  "world music disabled policy union",
);

model = replaceUnique(
  model,
  `    if (!(track.durationSeconds > 0)) errors.push(\`${'${track.id}'}: invalid duration\`);\n    if (\n      track.mixOutSeconds !== undefined &&\n      (!(track.mixOutSeconds > 0) || track.mixOutSeconds >= track.durationSeconds)\n    ) {\n      errors.push(\`${'${track.id}'}: invalid mixOutSeconds\`);\n    }`,
  `    if (!Number.isFinite(track.durationSeconds) || !(track.durationSeconds > 0)) {\n      errors.push(\`${'${track.id}'}: invalid duration\`);\n    }\n    if (\n      track.mixOutSeconds !== undefined &&\n      (!Number.isFinite(track.mixOutSeconds) ||\n        !(track.mixOutSeconds > 0) ||\n        track.mixOutSeconds >= track.durationSeconds)\n    ) {\n      errors.push(\`${'${track.id}'}: invalid mixOutSeconds\`);\n    }\n    if (\n      track.trimGain !== undefined &&\n      (!Number.isFinite(track.trimGain) || track.trimGain < 0)\n    ) {\n      errors.push(\`${'${track.id}'}: invalid trimGain\`);\n    }`,
  "world music finite track validation",
);

fs.writeFileSync(modelPath, model);

const testPath = "tests/world-music-model.test.ts";
let test = fs.readFileSync(testPath, "utf8");

test = replaceUnique(
  test,
  `  it("globally disabled tracks never reappear through generated, legacy or global fallback", () => {\n    const published: WorldMusicPolicy = {\n      configRevision: "published-disabled",\n      disabledTrackIds: [ids[0], ids[1], ids[5], ids[3]],\n    };\n    const result = resolveWorldMusicPlaylist({\n      worldId: "world-01",\n      stageRole: "normal",\n      musicMode: "map",\n      catalog,\n      generatedPolicy: generated,\n      publishedPolicy: published,\n      legacyWorldTrackIds: [ids[5]],\n    });\n    expect(result.trackIds).toEqual([]);\n    expect(result.resolvedFrom).toBe("silence");\n  });`,
  `  it("globally disabled tracks never reappear through generated, legacy or global fallback", () => {\n    const published: WorldMusicPolicy = {\n      configRevision: "published-disabled",\n      disabledTrackIds: [ids[0], ids[1], ids[5], ids[3]],\n    };\n    const result = resolveWorldMusicPlaylist({\n      worldId: "world-01",\n      stageRole: "normal",\n      musicMode: "map",\n      catalog,\n      generatedPolicy: generated,\n      publishedPolicy: published,\n      legacyWorldTrackIds: [ids[5]],\n    });\n    expect(result.trackIds).toEqual([]);\n    expect(result.resolvedFrom).toBe("silence");\n  });\n\n  it("never lets a published policy resurrect a generated disabled track", () => {\n    const generatedDisabled: WorldMusicPolicy = {\n      ...generated,\n      disabledTrackIds: [ids[0]],\n    };\n    const published: WorldMusicPolicy = {\n      configRevision: "published-no-disabled-override",\n      worlds: {\n        "world-01": {\n          normal: { kind: "replace", trackIds: [ids[0], ids[1]] },\n        },\n      },\n    };\n    const result = resolveWorldMusicPlaylist({\n      worldId: "world-01",\n      stageRole: "normal",\n      musicMode: "map",\n      catalog,\n      generatedPolicy: generatedDisabled,\n      publishedPolicy: published,\n    });\n    expect(result.trackIds).toEqual([ids[1]]);\n  });\n\n  it("rejects non-finite duration, mix-out and trim values", () => {\n    const invalid: WorldMusicCatalog = {\n      ...catalog,\n      tracks: [\n        { ...catalog.tracks[0]!, durationSeconds: Number.POSITIVE_INFINITY },\n        { ...catalog.tracks[1]!, mixOutSeconds: Number.NaN },\n        { ...catalog.tracks[2]!, trimGain: Number.POSITIVE_INFINITY },\n      ],\n    };\n    const errors = validateWorldMusicCatalog(invalid);\n    expect(errors).toEqual(expect.arrayContaining([\n      \`${'${ids[0]}'}: invalid duration\`,\n      \`${'${ids[1]}'}: invalid mixOutSeconds\`,\n      \`${'${ids[2]}'}: invalid trimGain\`,\n    ]));\n  });`,
  "world music validation regression tests",
);

fs.writeFileSync(testPath, test);
