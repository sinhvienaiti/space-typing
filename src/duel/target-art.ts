export const DUEL_TARGET_IDS = [
  "laser",
  "missile",
  "railgun",
  "bomb",
  "siege-lance",
  "shield",
  "reflect",
  "barrier",
  "repair",
  "energy",
  "amplify",
  "drone",
  "lock-on",
  "gravity",
  "disrupt",
  "scan",
  "fate-crystal",
  "black-hole",
] as const;

export type DuelTargetId =
  (typeof DUEL_TARGET_IDS)[number];

export type DuelTargetSpriteSpec = {
  url: string;
  sha256: string;
  width: number;
  height: number;
  pivot: { x: number; y: number };
  alphaConvention: "source-alpha";
  blendMode: "source-over";
  estimatedDecodedBytes: number;
};

export type DuelTargetManifest = {
  id: "duel-targets";
  version: number;
  sprites: Partial<
    Record<DuelTargetId, DuelTargetSpriteSpec>
  >;
};

const ROOT = "/assets/space-typing/duel-targets";
let manifest: DuelTargetManifest | null = null;
let loading: Promise<DuelTargetManifest | null> | null = null;
const decodedImages = new Map<
  DuelTargetId,
  HTMLImageElement
>();

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function finiteBetween(
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

function parseSpec(
  value: unknown,
): DuelTargetSpriteSpec | null {
  if (
    !isRecord(value) ||
    typeof value.url !== "string" ||
    value.url.length === 0 ||
    value.url.includes("/") ||
    value.url.includes("..") ||
    typeof value.sha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(value.sha256) ||
    !finiteBetween(value.width, 1, 4096) ||
    !finiteBetween(value.height, 1, 4096) ||
    value.alphaConvention !== "source-alpha" ||
    value.blendMode !== "source-over" ||
    !finiteBetween(
      value.estimatedDecodedBytes,
      1,
      512 * 1024 * 1024,
    ) ||
    !isRecord(value.pivot) ||
    !finiteBetween(value.pivot.x, 0, 1) ||
    !finiteBetween(value.pivot.y, 0, 1)
  ) {
    return null;
  }

  return {
    url: value.url,
    sha256: value.sha256,
    width: value.width,
    height: value.height,
    pivot: {
      x: value.pivot.x,
      y: value.pivot.y,
    },
    alphaConvention: "source-alpha",
    blendMode: "source-over",
    estimatedDecodedBytes:
      value.estimatedDecodedBytes,
  };
}

export function parseDuelTargetManifest(
  value: unknown,
): DuelTargetManifest | null {
  if (
    !isRecord(value) ||
    value.id !== "duel-targets" ||
    !finiteBetween(value.version, 0, 0xffff_ffff) ||
    !isRecord(value.sprites)
  ) {
    return null;
  }

  const sprites: DuelTargetManifest["sprites"] = {};
  for (const [id, raw] of Object.entries(value.sprites)) {
    if (
      !(DUEL_TARGET_IDS as readonly string[]).includes(id)
    ) {
      return null;
    }
    const spec = parseSpec(raw);
    if (spec === null) return null;
    sprites[id as DuelTargetId] = spec;
  }

  return {
    id: "duel-targets",
    version: value.version,
    sprites,
  };
}

function spriteUrl(spec: DuelTargetSpriteSpec): string {
  return (
    ROOT +
    "/" +
    spec.url +
    "?v=" +
    spec.sha256.slice(0, 16)
  );
}

async function decodeSprite(
  id: DuelTargetId,
  spec: DuelTargetSpriteSpec,
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
        image.addEventListener(
          "load",
          () => resolve(),
          { once: true },
        );
        image.addEventListener(
          "error",
          () => reject(new Error("target sprite failed")),
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

export async function preloadDuelTargetSprites():
  Promise<DuelTargetManifest | null> {
  if (manifest !== null) return manifest;
  if (loading !== null) return loading;
  if (typeof fetch !== "function") return null;

  loading = (async () => {
    try {
      const response = await fetch(
        ROOT + "/targets.json",
        { cache: "no-cache" },
      );
      if (!response.ok) return null;
      const parsed = parseDuelTargetManifest(
        await response.json(),
      );
      if (parsed === null) return null;

      if (typeof Image === "undefined") {
        manifest = parsed;
        return parsed;
      }

      const entries = Object.entries(
        parsed.sprites,
      ) as Array<[DuelTargetId, DuelTargetSpriteSpec]>;
      const decoded = await Promise.all(
        entries.map(async ([id, spec]) => ({
          id,
          ok: await decodeSprite(id, spec),
        })),
      );
      const failed = new Set(
        decoded
          .filter((entry) => !entry.ok)
          .map((entry) => entry.id),
      );
      const sprites: DuelTargetManifest["sprites"] = {};
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

export function duelTargetSpriteUrl(
  id: string,
): string | null {
  if (
    !(DUEL_TARGET_IDS as readonly string[]).includes(id)
  ) {
    return null;
  }
  const spec =
    manifest?.sprites[id as DuelTargetId];
  return spec === undefined ? null : spriteUrl(spec);
}

export function resetDuelTargetSpriteCacheForTests(): void {
  manifest = null;
  loading = null;
  decodedImages.clear();
}
