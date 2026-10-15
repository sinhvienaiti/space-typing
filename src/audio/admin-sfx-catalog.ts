import {
  SAMPLE_SFX,
  type SampleSfxId,
} from "./sample-bank";

export type AdminSfxCatalogEntry = {
  id: SampleSfxId;
  eventBinding: SampleSfxId;
  source: string;
  group: (typeof SAMPLE_SFX)[SampleSfxId]["group"];
  runtimeGain: number;
  poolSize: number;
  authorable: false;
  preview: {
    kind: "production-sample-asset";
    source: string;
    playbackRate: {
      min: 0.72;
      max: 1.35;
      default: 1;
    };
    mutation: false;
  };
};

export type AdminSfxCatalog = {
  schemaVersion: 1;
  contractRevision: "space-typing-admin-sfx-v1";
  mode: "runtime-backed-readonly";
  runtimeOwner: "src/audio/sample-bank.ts";
  entries: AdminSfxCatalogEntry[];
};

function materializeEntry(id: SampleSfxId): AdminSfxCatalogEntry {
  const definition = SAMPLE_SFX[id];
  return {
    id,
    eventBinding: id,
    source: definition.path,
    group: definition.group,
    runtimeGain: definition.gain,
    poolSize: definition.poolSize,
    authorable: false,
    preview: {
      kind: "production-sample-asset",
      source: definition.path,
      playbackRate: {
        min: 0.72,
        max: 1.35,
        default: 1,
      },
      mutation: false,
    },
  };
}

export function createAdminSfxCatalog(): AdminSfxCatalog {
  const ids = (Object.keys(SAMPLE_SFX) as SampleSfxId[]).sort();
  return {
    schemaVersion: 1,
    contractRevision: "space-typing-admin-sfx-v1",
    mode: "runtime-backed-readonly",
    runtimeOwner: "src/audio/sample-bank.ts",
    entries: ids.map(materializeEntry),
  };
}

export function resolveAdminSfxPreview(
  id: string,
): AdminSfxCatalogEntry | null {
  if (!Object.prototype.hasOwnProperty.call(SAMPLE_SFX, id)) return null;
  return materializeEntry(id as SampleSfxId);
}
