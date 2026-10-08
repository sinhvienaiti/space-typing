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

export type CombatVfxBlendMode =
  | "source-over"
  | "screen";

export type CombatVfxAlphaConvention =
  | "source-alpha"
  | "keyed-black-fallback"
  | "legacy-opaque";

export type CombatVfxSpriteSpec = {
  url: string;
  sha256: string;
  width: number;
  height: number;
  frameCount: number;
  fps: number;
  pivot: { x: number; y: number };
  alphaConvention: CombatVfxAlphaConvention;
  blendMode: CombatVfxBlendMode;
  loop: boolean;
  lifetimeMs: number;
  estimatedDecodedBytes: number;
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
const decodedImages = new Map<CombatVfxId, HTMLImageElement>();

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function numberInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function validSpec(
  value: unknown,
): value is Record<string, unknown> & {
  url: string;
  sha256: string;
  width: number;
  height: number;
} {
  if (!isRecord(value)) return false;
  return (
    typeof value.url === "string" &&
    value.url.length > 0 &&
    !value.url.includes("/") &&
    !value.url.includes("..") &&
    typeof value.sha256 === "string" &&
    /^[0-9a-f]{64}$/.test(value.sha256) &&
    numberInRange(value.width, 1, 8192) &&
    numberInRange(value.height, 1, 8192)
  );
}

function optionalString<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T | null {
  if (value === undefined) return fallback;
  return typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function parseSpec(
  raw: Record<string, unknown> & {
    url: string;
    sha256: string;
    width: number;
    height: number;
  },
): CombatVfxSpriteSpec | null {
  const blendMode = optionalString(
    raw.blendMode,
    ["source-over", "screen"] as const,
    "screen",
  );
  const alphaConvention = optionalString(
    raw.alphaConvention,
    [
      "source-alpha",
      "keyed-black-fallback",
      "legacy-opaque",
    ] as const,
    "legacy-opaque",
  );
  if (blendMode === null || alphaConvention === null) {
    return null;
  }

  const frameCount =
    raw.frameCount === undefined ? 1 : raw.frameCount;
  const fps = raw.fps === undefined ? 0 : raw.fps;
  const lifetimeMs =
    raw.lifetimeMs === undefined ? 0 : raw.lifetimeMs;
  const estimatedDecodedBytes =
    raw.estimatedDecodedBytes === undefined
      ? raw.width * raw.height * 4
      : raw.estimatedDecodedBytes;
  const loop = raw.loop === undefined ? false : raw.loop;
  const pivot =
    raw.pivot === undefined
      ? { x: 0.5, y: 0.5 }
      : raw.pivot;

  if (
    !numberInRange(frameCount, 1, 256) ||
    !Number.isInteger(frameCount) ||
    !numberInRange(fps, 0, 120) ||
    !numberInRange(lifetimeMs, 0, 60_000) ||
    !numberInRange(
      estimatedDecodedBytes,
      1,
      1024 * 1024 * 1024,
    ) ||
    typeof loop !== "boolean" ||
    !isRecord(pivot) ||
    !numberInRange(pivot.x, 0, 1) ||
    !numberInRange(pivot.y, 0, 1)
  ) {
    return null;
  }

  return {
    url: raw.url,
    sha256: raw.sha256,
    width: raw.width,
    height: raw.height,
    frameCount,
    fps,
    pivot: { x: pivot.x, y: pivot.y },
    alphaConvention,
    blendMode,
    loop,
    lifetimeMs,
    estimatedDecodedBytes,
  };
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
    const parsed = parseSpec(raw);
    if (parsed === null) return null;
    sprites[id as CombatVfxId] = parsed;
  }

  return {
    id: "combat-vfx",
    version: value.version,
    sprites,
  };
}

function spriteUrl(spec: CombatVfxSpriteSpec): string {
  return (
    ROOT +
    "/" +
    spec.url +
    "?v=" +
    spec.sha256.slice(0, 16)
  );
}

async function decodeSprite(
  id: CombatVfxId,
  spec: CombatVfxSpriteSpec,
): Promise<boolean> {
  if (typeof Image === "undefined") return true;
  const image = new Image();
  image.decoding = "async";
  image.src = spriteUrl(spec);

  try {
    if (typeof image.decode === "function") {
      await image.decode();
    } else {
      await new Promise<void>((resolve, reject) => {
        image.addEventListener("load", () => resolve(), {
          once: true,
        });
        image.addEventListener(
          "error",
          () => reject(new Error("combat VFX image failed")),
          { once: true },
        );
      });
    }
    decodedImages.set(id, image);
    return true;
  } catch {
    return false;
  }
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

      if (typeof Image === "undefined") {
        manifest = parsed;
        return parsed;
      }

      const entries = Object.entries(parsed.sprites) as Array<
        [CombatVfxId, CombatVfxSpriteSpec]
      >;
      const decoded = await Promise.all(
        entries.map(async ([id, spec]) => ({
          id,
          ok: await decodeSprite(id, spec),
        })),
      );
      const failed = new Set(
        decoded.filter((entry) => !entry.ok).map((entry) => entry.id),
      );
      const sprites: CombatVfxManifest["sprites"] = {};
      for (const [id, spec] of entries) {
        if (!failed.has(id)) sprites[id] = spec;
      }

      manifest = {
        ...parsed,
        sprites,
      };
      return manifest;
    } catch {
      return null;
    } finally {
      loading = null;
    }
  })();

  return loading;
}

export function combatVfxSpec(
  id: CombatVfxId,
): CombatVfxSpriteSpec | null {
  return manifest?.sprites[id] ?? null;
}

export function combatVfxUrl(
  id: CombatVfxId,
): string | null {
  const spec = combatVfxSpec(id);
  return spec === null ? null : spriteUrl(spec);
}

export function hasCombatVfx(
  id: CombatVfxId,
): boolean {
  return combatVfxSpec(id) !== null;
}

export function resetCombatVfxCacheForTests(): void {
  manifest = null;
  loading = null;
  decodedImages.clear();
}
