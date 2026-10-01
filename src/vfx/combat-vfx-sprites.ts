export const COMBAT_VFX_IDS = [
  "explosion-core",
  "explosion-wide",
  "shockwave-ring",
  "fire-small",
  "fire-medium",
  "fire-critical",
  "smoke-dark",
  "smoke-hot",
  "spark-burst",
  "debris-burst",
  "missile-salvo",
  "bomb-impact",
  "precision-burst",
] as const;

export type CombatVfxId =
  (typeof COMBAT_VFX_IDS)[number];

export type CombatVfxSpriteSpec = {
  url: string;
  sha256: string;
  width: number;
  height: number;
};

export type CombatVfxManifest = {
  id: "combat-vfx";
  version: number;
  sprites: Partial<
    Record<CombatVfxId, CombatVfxSpriteSpec>
  >;
};

const ROOT = "/assets/space-typing/combat-vfx";
let manifest: CombatVfxManifest | null = null;
let loading: Promise<CombatVfxManifest | null> | null = null;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function validSpec(
  value: unknown,
): value is CombatVfxSpriteSpec {
  if (!isRecord(value)) return false;
  return (
    typeof value.url === "string" &&
    value.url.length > 0 &&
    !value.url.includes("/") &&
    !value.url.includes("..") &&
    typeof value.sha256 === "string" &&
    /^[0-9a-f]{64}$/.test(value.sha256) &&
    typeof value.width === "number" &&
    Number.isFinite(value.width) &&
    value.width > 0 &&
    typeof value.height === "number" &&
    Number.isFinite(value.height) &&
    value.height > 0
  );
}

export function parseCombatVfxManifest(
  value: unknown,
): CombatVfxManifest | null {
  if (
    !isRecord(value) ||
    value.id !== "combat-vfx" ||
    typeof value.version !== "number" ||
    !Number.isFinite(value.version) ||
    !isRecord(value.sprites)
  ) {
    return null;
  }

  const sprites: Partial<
    Record<CombatVfxId, CombatVfxSpriteSpec>
  > = {};
  for (const [id, raw] of Object.entries(value.sprites)) {
    if (
      !(COMBAT_VFX_IDS as readonly string[]).includes(id) ||
      !validSpec(raw)
    ) {
      return null;
    }
    sprites[id as CombatVfxId] = {
      url: raw.url,
      sha256: raw.sha256,
      width: raw.width,
      height: raw.height,
    };
  }

  return {
    id: "combat-vfx",
    version: value.version,
    sprites,
  };
}

export async function preloadCombatVfxSprites():
  Promise<CombatVfxManifest | null> {
  if (manifest !== null) return manifest;
  if (loading !== null) return loading;
  if (typeof fetch !== "function") return null;

  loading = (async () => {
    try {
      const response = await fetch(ROOT + "/vfx.json", {
        cache: "no-cache",
      });
      if (!response.ok) return null;
      const parsed = parseCombatVfxManifest(
        await response.json(),
      );
      if (parsed === null) return null;

      manifest = parsed;
      if (typeof Image !== "undefined") {
        for (const spec of Object.values(parsed.sprites)) {
          if (spec === undefined) continue;
          const image = new Image();
          image.decoding = "async";
          image.src =
            ROOT +
            "/" +
            spec.url +
            "?v=" +
            spec.sha256.slice(0, 16);
        }
      }
      return parsed;
    } catch {
      return null;
    } finally {
      loading = null;
    }
  })();

  return loading;
}

export function combatVfxUrl(
  id: CombatVfxId,
): string | null {
  const spec = manifest?.sprites[id];
  if (spec === undefined) return null;
  return (
    ROOT +
    "/" +
    spec.url +
    "?v=" +
    spec.sha256.slice(0, 16)
  );
}

export function hasCombatVfx(
  id: CombatVfxId,
): boolean {
  return combatVfxUrl(id) !== null;
}
