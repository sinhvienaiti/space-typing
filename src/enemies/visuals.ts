export type EnemyVisualProfile = {
  body: string;
  face: string;
  wings: string;
  head?: string;
  side?: string;
  aura?: string;
  orbit?: string;
  rewardMarker?: string;
  spawnFx: string;
  hitFx: string;
  deathFx: string;
};

function isNonEmpty(value: string | undefined): boolean {
  return value === undefined || value.trim().length > 0;
}

export function isReadableVisualProfile(
  visual: EnemyVisualProfile,
): boolean {
  return (
    visual.body.trim().length > 0 &&
    visual.face.trim().length > 0 &&
    visual.wings.trim().length > 0 &&
    isNonEmpty(visual.head) &&
    isNonEmpty(visual.side) &&
    isNonEmpty(visual.aura) &&
    isNonEmpty(visual.orbit) &&
    isNonEmpty(visual.rewardMarker) &&
    visual.spawnFx.trim().length > 0 &&
    visual.hitFx.trim().length > 0 &&
    visual.deathFx.trim().length > 0
  );
}
