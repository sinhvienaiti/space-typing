import {
  combatVfxSpec,
  combatVfxUrl,
  preloadCombatVfxSprites,
  type CombatVfxId,
} from "../vfx/combat-vfx-sprites";

/**
 * The owner's painted explosion sequences are animated WebP files. As CSS
 * backgrounds every instance shares one browser animation clock, so two
 * blasts a moment apart showed the same frame and late blasts started half
 * way through. Here each sequence is decoded once into a horizontal frame
 * atlas and every blast plays its own timeline on the combat canvas.
 *
 * Needs WebCodecs ImageDecoder (Chrome/Edge). Without it, or on Low/Medium,
 * nothing loads and the procedural particles carry the effect alone.
 */
export const DUEL_FLIPBOOK_IDS = [
  "explosion-core",
  "explosion-wide",
  "bomb-impact",
  "shockwave-ring",
  "spark-burst",
] as const satisfies readonly CombatVfxId[];

export type DuelFlipbookId = (typeof DUEL_FLIPBOOK_IDS)[number];

export type DuelFlipbook = {
  atlas: HTMLCanvasElement;
  cell: number;
  count: number;
};

/** Atlas cell size: blasts keep the source 256 px, rings/sparks need less. */
const CELL: Readonly<Record<DuelFlipbookId, number>> = {
  "explosion-core": 256,
  "explosion-wide": 256,
  "bomb-impact": 256,
  "shockwave-ring": 192,
  "spark-burst": 192,
};

type DecodedFrame = {
  image: CanvasImageSource & { close?: () => void };
};

type ImageDecoderLike = {
  tracks: {
    ready: Promise<void>;
    selectedTrack: { frameCount: number } | null;
  };
  decode(options: { frameIndex: number }): Promise<DecodedFrame>;
  close(): void;
};

type ImageDecoderConstructor = {
  new (init: { data: ArrayBuffer; type: string }): ImageDecoderLike;
  isTypeSupported?(type: string): Promise<boolean>;
};

const books = new Map<DuelFlipbookId, DuelFlipbook>();
let loading: Promise<number> | null = null;

function decoderConstructor(): ImageDecoderConstructor | null {
  const candidate = (globalThis as { ImageDecoder?: ImageDecoderConstructor }).ImageDecoder;
  return typeof candidate === "function" ? candidate : null;
}

async function decodeBook(
  Decoder: ImageDecoderConstructor,
  id: DuelFlipbookId,
): Promise<DuelFlipbook | null> {
  const url = combatVfxUrl(id);
  const spec = combatVfxSpec(id);
  if (url === null || spec === null || spec.frameCount < 2) return null;
  const response = await fetch(url);
  if (!response.ok) return null;
  const decoder = new Decoder({
    data: await response.arrayBuffer(),
    type: "image/webp",
  });
  try {
    await decoder.tracks.ready;
    const count = Math.min(
      spec.frameCount,
      decoder.tracks.selectedTrack?.frameCount ?? spec.frameCount,
    );
    if (count < 2) return null;
    const cell = CELL[id];
    const atlas = document.createElement("canvas");
    atlas.width = cell * count;
    atlas.height = cell;
    const context = atlas.getContext("2d");
    if (context === null) return null;
    for (let index = 0; index < count; index += 1) {
      const frame = await decoder.decode({ frameIndex: index });
      context.drawImage(frame.image, index * cell, 0, cell, cell);
      frame.image.close?.();
    }
    return { atlas, cell, count };
  } finally {
    decoder.close();
  }
}

/** Decodes the painted sequences once; resolves with how many are ready. */
export function loadDuelFlipbooks(): Promise<number> {
  if (books.size > 0) return Promise.resolve(books.size);
  if (loading !== null) return loading;
  const Decoder = decoderConstructor();
  if (Decoder === null || typeof document === "undefined") {
    return Promise.resolve(0);
  }
  loading = (async () => {
    try {
      const manifest = await preloadCombatVfxSprites();
      if (manifest === null) return 0;
      if (
        Decoder.isTypeSupported !== undefined &&
        !(await Decoder.isTypeSupported("image/webp"))
      ) {
        return 0;
      }
      for (const id of DUEL_FLIPBOOK_IDS) {
        try {
          const book = await decodeBook(Decoder, id);
          if (book !== null) books.set(id, book);
        } catch {
          // One broken sheet must not block the others.
        }
      }
      return books.size;
    } catch {
      return 0;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

export function duelFlipbook(id: DuelFlipbookId): DuelFlipbook | null {
  return books.get(id) ?? null;
}

/**
 * Draws a sequence at `progress` (0 = first frame, 1 = last). `blend`
 * cross-fades neighbouring frames, which smooths the 12-frame sheets in
 * slow motion at the cost of a second copy.
 */
export function drawDuelFlipbook(
  context: CanvasRenderingContext2D,
  book: DuelFlipbook,
  progress: number,
  x: number,
  y: number,
  size: number,
  rotation: number,
  alpha: number,
  blend: boolean,
): void {
  if (alpha <= 0.004 || size <= 1) return;
  const position = Math.max(0, Math.min(0.9999, progress)) * (book.count - 1);
  const index = Math.floor(position);
  const mix = blend ? position - index : 0;
  const half = size / 2;
  const previous = context.globalAlpha;
  context.save();
  context.translate(x, y);
  if (rotation !== 0) context.rotate(rotation);
  context.globalAlpha = previous * alpha * (1 - mix);
  context.drawImage(book.atlas, index * book.cell, 0, book.cell, book.cell, -half, -half, size, size);
  if (mix > 0.02 && index + 1 < book.count) {
    context.globalAlpha = previous * alpha * mix;
    context.drawImage(book.atlas, (index + 1) * book.cell, 0, book.cell, book.cell, -half, -half, size, size);
  }
  context.restore();
}

export function resetDuelFlipbooksForTests(): void {
  books.clear();
  loading = null;
}
