#!/usr/bin/env node
/**
 * BGV art pipeline (docs/BACKGROUND_VISUAL_REBOOT_PLAN.md §5.6).
 *
 *   pnpm bg:prepare g01-celestial
 *
 * Reads the owner's ChatGPT images from art-src/<dir>/ and writes the runtime
 * kit to public/assets/space-typing/backgrounds/<kit>/:
 *   - plate:      opaque WebP variants, readability (luma) report;
 *   - glow-a/b:   made seamless, opaque WebP (drawn additively on black);
 *   - dust:       black-on-white mask -> seamless alpha WebP;
 *   - hero-w0N:   alpha WebP (real alpha, or keyed flat green/magenta);
 *   - atlas-*:    objects detected, trimmed and packed into one atlas.
 * Also writes kit.json (hashes, frames) and previews in art-src/<dir>/_out/.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import sharp from "sharp";
import {
  borderStats,
  crop,
  findInput,
  median,
  option,
  rawImage,
  readArt,
  ROOT,
  sha256,
} from "./art-common.mjs";

const PUBLIC_ROOT = join(ROOT, "public/assets/space-typing/backgrounds");

const KITS = {
  "g01-celestial": {
    src: "art-src/g01",
    prefix: "g01-",
    heroWorlds: [1, 2, 3, 4, 5],
    plateNames: ["plate", "plate-b", "plate-c", "plate-d", "plate-e"],
    expectedAtlasObjects: null,
  },
  "g02-infernal": {
    src: "art-src/g02",
    prefix: "g02-",
    heroWorlds: [6, 7, 8, 9, 10],
    plateNames: ["plate", "plate-b", "plate-c", "plate-d", "plate-e"],
    expectedAtlasObjects: { rocks: 12, life: 11 },
  },
  "g03-frost-prism": {
    src: "art-src/g03",
    prefix: "g03-",
    heroWorlds: [11, 12, 13, 14, 15],
    plateNames: ["plate", "plate-b", "plate-c", "plate-d", "plate-e"],
    // G03 keeps its earlier approved atlas layout, while its World plates are
    // now upgraded to the same five-plate contract used by G04-G10.
    expectedAtlasObjects: null,
  },
  "g04-verdant": {
    src: "art-src/g04",
    prefix: "g04-",
    heroWorlds: [16, 17, 18, 19, 20],
    plateNames: ["plate", "plate-b", "plate-c", "plate-d", "plate-e"],
    expectedAtlasObjects: { rocks: 14, life: 12 },
  },
  "g05-shadow-nature": {
    src: "art-src/g05",
    prefix: "g05-",
    heroWorlds: [21, 22, 23, 24, 25],
    plateNames: ["plate", "plate-b", "plate-c", "plate-d", "plate-e"],
    expectedAtlasObjects: { rocks: 14, life: 12 },
  },
  "g06-cosmic-forge": {
    src: "art-src/g06",
    prefix: "g06-",
    heroWorlds: [26, 27, 28, 29, 30],
    plateNames: ["plate", "plate-b", "plate-c", "plate-d", "plate-e"],
    expectedAtlasObjects: { rocks: 14, life: 12 },
  },
  "g07-abyssal": {
    src: "art-src/g07",
    prefix: "g07-",
    heroWorlds: [31, 32, 33, 34, 35],
    plateNames: ["plate", "plate-b", "plate-c", "plate-d", "plate-e"],
    expectedAtlasObjects: { rocks: 14, life: 12 },
  },
  "g08-aurora-cosmic": {
    src: "art-src/g08",
    prefix: "g08-",
    heroWorlds: [36, 37, 38, 39, 40],
    plateNames: ["plate", "plate-b", "plate-c", "plate-d", "plate-e"],
    expectedAtlasObjects: { rocks: 14, life: 12 },
  },
  "g09-void-cathedral": {
    src: "art-src/g09",
    prefix: "g09-",
    heroWorlds: [41, 42, 43, 44, 45],
    plateNames: ["plate", "plate-b", "plate-c", "plate-d", "plate-e"],
    expectedAtlasObjects: { rocks: 14, life: 12 },
  },
  "g10-eternity": {
    src: "art-src/g10",
    prefix: "g10-",
    heroWorlds: [46, 47, 48, 49, 50],
    plateNames: ["plate", "plate-b", "plate-c", "plate-d", "plate-e"],
    expectedAtlasObjects: { rocks: 14, life: 12 },
  },
}

const PLATE_SIZES = [2880, 1920, 1280];
const TEXTURE_SIZES = [2048, 1024, 512];

// Readability thresholds (plan §3.3), measured on the plate's combat region.
const LUMA_LIMITS = { mean: 40, p95: 120, brightShare: 0.015, darkShare: 0.2 };

function fail(message) {
  console.error("✗ " + message);
  process.exitCode = 1;
}



/** Sizes to export: the source size (capped) plus smaller tiers, never upscaled. */
function exportSizes(sourceMax, candidates) {
  const top = Math.min(sourceMax, candidates[0]);
  const sizes = [top];
  for (const size of candidates) {
    if (size < top * 0.9 && size >= 256) sizes.push(size);
  }
  return sizes;
}







// ---------------------------------------------------------------------------
// Alpha: real transparency, flat chroma key, or a painted checkerboard.
// ---------------------------------------------------------------------------



/** Square max (dilate) or min (erode) filter of a 0/1 mask, separable. */
function morph(mask, width, height, radius, grow) {
  if (radius <= 0) return mask;
  const pass = (source, horizontal) => {
    const out = new Uint8Array(source.length);
    for (let line = 0; line < (horizontal ? height : width); line += 1) {
      const length = horizontal ? width : height;
      for (let k = 0; k < length; k += 1) {
        let value = grow ? 0 : 1;
        for (let d = -radius; d <= radius; d += 1) {
          const q = Math.min(length - 1, Math.max(0, k + d));
          const v = source[horizontal ? line * width + q : q * width + line];
          if (grow ? v === 1 : v === 0) {
            value = grow ? 1 : 0;
            break;
          }
        }
        out[horizontal ? line * width + k : k * width + line] = value;
      }
    }
    return out;
  };
  return pass(pass(mask, true), false);
}

/**
 * Cuts an object painted on black: a solid core (bright pixels, gaps closed)
 * keeps dark shadow sides opaque; a thin soft band keeps anti-aliasing and a
 * little glow (un-premultiplied from black). Stars, watermarks and background
 * glows touching the frame are dropped; the renderer adds the halo glow.
 */
function extractFromBlack(image, label, notes) {
  const { data, width, height } = image;
  const count = width * height;
  const bright = new Uint8Array(count);
  let mask = new Uint8Array(count);
  for (let p = 0; p < count; p += 1) {
    const offset = p * 4;
    bright[p] = Math.max(data[offset], data[offset + 1], data[offset + 2]);
    mask[p] = bright[p] > 20 ? 1 : 0;
  }
  mask = morph(morph(mask, width, height, 2, true), width, height, 2, false);

  const labels = new Int32Array(count).fill(-1);
  const components = [];
  const stack = [];
  for (let start = 0; start < count; start += 1) {
    if (mask[start] === 0 || labels[start] !== -1) continue;
    const component = { area: 0, border: 0 };
    labels[start] = components.length;
    stack.push(start);
    while (stack.length > 0) {
      const p = stack.pop();
      const x = p % width;
      const y = (p - x) / width;
      component.area += 1;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) component.border += 1;
      for (const next of [p - 1, p + 1, p - width, p + width]) {
        if (next < 0 || next >= count) continue;
        if ((next === p - 1 && x === 0) || (next === p + 1 && x === width - 1)) continue;
        if (mask[next] === 1 && labels[next] === -1) {
          labels[next] = components.length;
          stack.push(next);
        }
      }
    }
    components.push(component);
  }
  if (components.length === 0) throw new Error(label + ": nothing but black found.");
  const largest = components.reduce((best, component, index) =>
    component.area > components[best].area ? index : best, 0);
  const perimeter = 2 * (width + height);
  const keep = components.map((component, index) =>
    index === largest ||
    (component.area >= components[largest].area * 0.08 && component.border < perimeter * 0.02));
  const dropped = components.filter((_, index) => !keep[index]).length;

  const kept = new Uint8Array(count);
  for (let p = 0; p < count; p += 1) kept[p] = labels[p] >= 0 && keep[labels[p]] ? 1 : 0;

  // Opaque only where the paint is clearly bright; darker glows and rims fade
  // with brightness, so no black discs or outlines survive around objects.
  let solid = new Uint8Array(count);
  for (let p = 0; p < count; p += 1) solid[p] = kept[p] === 1 && bright[p] >= 70 ? 1 : 0;
  solid = morph(morph(solid, width, height, 3, true), width, height, 3, false);
  // Fill small holes fully enclosed by the object (a portal's dark centre),
  // but keep large openings (the inside of a halo ring) transparent.
  const outside = new Uint8Array(count);
  const queue = [];
  for (let p = 0; p < count; p += 1) {
    const x = p % width;
    const y = (p - x) / width;
    if ((x === 0 || y === 0 || x === width - 1 || y === height - 1) && solid[p] === 0) {
      outside[p] = 1;
      queue.push(p);
    }
  }
  while (queue.length > 0) {
    const p = queue.pop();
    const x = p % width;
    for (const next of [p - 1, p + 1, p - width, p + width]) {
      if (next < 0 || next >= count || outside[next] === 1 || solid[next] === 1) continue;
      if ((next === p - 1 && x === 0) || (next === p + 1 && x === width - 1)) continue;
      outside[next] = 1;
      queue.push(next);
    }
  }
  const holeLabel = new Int32Array(count).fill(-1);
  const holes = [];
  for (let start = 0; start < count; start += 1) {
    if (solid[start] === 1 || outside[start] === 1 || holeLabel[start] !== -1) continue;
    const members = [start];
    holeLabel[start] = holes.length;
    for (let k = 0; k < members.length; k += 1) {
      const p = members[k];
      const x = p % width;
      for (const next of [p - 1, p + 1, p - width, p + width]) {
        if (next < 0 || next >= count || solid[next] === 1 || outside[next] === 1 || holeLabel[next] !== -1) continue;
        if ((next === p - 1 && x === 0) || (next === p + 1 && x === width - 1)) continue;
        holeLabel[next] = holes.length;
        members.push(next);
      }
    }
    holes.push(members);
  }
  let filled = 0;
  for (const members of holes) {
    if (members.length > count * 0.015) continue;
    for (const p of members) solid[p] = 1;
    filled += 1;
  }

  const band = morph(kept, width, height, 6, true);
  const out = Buffer.from(data);
  for (let p = 0; p < count; p += 1) {
    const offset = p * 4;
    let alpha = 0;
    if (solid[p] === 1) alpha = 1;
    else if (band[p] === 1) {
      const t = Math.max(0, Math.min(1, (bright[p] - 8) / 62));
      alpha = t * t * (3 - 2 * t);
    }
    out[offset + 3] = Math.round(alpha * 255);
    if (alpha > 0.05 && alpha < 1) {
      for (let channel = 0; channel < 3; channel += 1) {
        out[offset + channel] = Math.min(255, Math.round(data[offset + channel] / alpha));
      }
    }
  }
  if (filled > 0) notes.push(label + ": filled " + filled + " small enclosed holes.");

  // Anything still touching the frame (a light beam, nebula) fades out before
  // the sprite edge, so no straight cut line can appear in the game.
  const feather = Math.max(8, Math.round(Math.min(width, height) * 0.05));
  let feathered = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edge = Math.min(x, y, width - 1 - x, height - 1 - y);
      if (edge >= feather) continue;
      const offset = (y * width + x) * 4 + 3;
      if (out[offset] === 0) continue;
      const t = edge / feather;
      out[offset] = Math.round(out[offset] * t * t * (3 - 2 * t));
      feathered += 1;
    }
  }
  if (feathered > width * 0.5) notes.push(label + ": faded content touching the image border.");
  notes.push(
    label + ": cut from black background (" + (components.length - dropped) + " parts kept, " +
      dropped + " stars/background glows dropped).",
  );
  return { data: out, width, height };
}

/** Key tint above which a pixel counts as showing the screen through it. */
const SPILL_EXCESS = 16;

/**
 * Translucent paint (water spray, mist, soft glows) takes on the screen colour
 * far beyond the object rim, and the keyer keeps it opaque and green. Pixels
 * tinted by the key and connected to the keyed-out background are un-mixed as
 * C = a·F + (1 - a)·K with a key-free F: a = 1 - excess / keyStrength and
 * F = (C - (1 - a)·K) / a. Key-coloured paint enclosed by the subject (moss on
 * an island) is not connected and stays as painted. Returns the pixel count.
 */
function unmixSpill(data, out, transparent, width, height, key, isGreen) {
  const count = width * height;
  const excessAt = (offset) =>
    isGreen
      ? data[offset + 1] - Math.max(data[offset], data[offset + 2])
      : Math.min(data[offset], data[offset + 2]) - data[offset + 1];
  const keyStrength = Math.max(
    1,
    isGreen ? key[1] - Math.max(key[0], key[2]) : Math.min(key[0], key[2]) - key[1],
  );
  const spill = new Uint8Array(count);
  const queue = [];
  for (let p = 0; p < count; p += 1) if (transparent[p] === 1) queue.push(p);
  while (queue.length > 0) {
    const p = queue.pop();
    const x = p % width;
    for (const next of [p - 1, p + 1, p - width, p + width]) {
      if (next < 0 || next >= count || spill[next] === 1 || transparent[next] === 1) continue;
      if ((next === p - 1 && x === 0) || (next === p + 1 && x === width - 1)) continue;
      if (excessAt(next * 4) <= SPILL_EXCESS) continue;
      spill[next] = 1;
      queue.push(next);
    }
  }
  let unmixed = 0;
  for (let p = 0; p < count; p += 1) {
    if (spill[p] === 0) continue;
    const offset = p * 4;
    const a = Math.max(0, Math.min(1, 1 - excessAt(offset) / keyStrength));
    const alpha = Math.min(out[offset + 3] / 255, a);
    if (a < 0.03 || alpha * 255 < 8) {
      out[offset + 3] = 0;
      continue;
    }
    for (let channel = 0; channel < 3; channel += 1) {
      const value = (data[offset + channel] - (1 - a) * key[channel]) / a;
      out[offset + channel] = Math.max(0, Math.min(255, Math.round(value)));
    }
    if (isGreen) {
      out[offset + 1] = Math.min(out[offset + 1], Math.max(out[offset], out[offset + 2]));
    } else {
      const limit = out[offset + 1] + 20;
      out[offset] = Math.min(out[offset], limit);
      out[offset + 2] = Math.min(out[offset + 2], limit);
    }
    out[offset + 3] = Math.round(alpha * data[offset + 3]);
    unmixed += 1;
  }
  return unmixed;
}

/**
 * Returns a keyed copy when the art has no usable alpha. Throws on a painted
 * checkerboard so the owner regenerates the image instead of shipping it.
 * `unmix` (heroes only) also un-mixes translucent spill such as waterfall
 * spray; atlas sprites are solid objects and keep the rim despill alone,
 * because un-mixing their teal glows and anti-aliased rims made rocks and
 * ships visibly less opaque (small ships dropped from 83% to 62% solid).
 */
function ensureTransparency(image, label, notes, unmix = false) {
  const border = borderStats(image);
  const transparentBorder = border.filter((pixel) => pixel[3] < 16).length / border.length;
  if (transparentBorder > 0.6) {
    notes.push(label + ": real alpha transparency.");
    return image;
  }

  const key = [0, 1, 2].map((channel) => median(border.map((pixel) => pixel[channel])));
  const isGreen = key[1] > 150 && key[0] < 110 && key[2] < 110;
  const isMagenta = key[0] > 150 && key[2] > 150 && key[1] < 110;
  if (!isGreen && !isMagenta && Math.max(...key) < 28) {
    return extractFromBlack(image, label, notes);
  }
  if (!isGreen && !isMagenta) {
    const neutral = border.filter(
      (pixel) => Math.max(pixel[0], pixel[1], pixel[2]) - Math.min(pixel[0], pixel[1], pixel[2]) < 14,
    );
    const levels = new Set(neutral.map((pixel) => Math.round((pixel[0] + pixel[1] + pixel[2]) / 48)));
    if (neutral.length / border.length > 0.8 && levels.size >= 2) {
      throw new Error(
        label + ": looks like a painted checkerboard, not real transparency. Regenerate it " +
          "(see 'Nếu ChatGPT không cho nền trong suốt thật' in the prompt pack).",
      );
    }
    throw new Error(
      label + ": no transparent or flat #00FF00 / #FF00FF background detected (border color " +
        key.join(",") + ").",
    );
  }

  notes.push(label + ": keyed flat " + (isGreen ? "green" : "magenta") + " background.");
  const { data, width, height } = image;
  const out = Buffer.from(data);
  const transparent = new Uint8Array(width * height);
  for (let p = 0; p < width * height; p += 1) {
    const offset = p * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    // Key strength: how much the pixel is dominated by the key hue. The high
    // threshold keeps saturated pinks/greens of the subject opaque.
    const keyAmount = isGreen ? g - Math.max(r, b) : Math.min(r, b) - g;
    const alpha = Math.max(0, Math.min(1, 1 - (keyAmount - 90) / 100));
    out[offset + 3] = Math.round(alpha * data[offset + 3]);
    if (out[offset + 3] < 8) transparent[p] = 1;
  }
  if (unmix) {
    const unmixed = unmixSpill(data, out, transparent, width, height, key, isGreen);
    if (unmixed > 0) notes.push(label + ": un-mixed the screen colour from " + unmixed + " translucent pixels.");
  }
  // Despill the key colour out of the object rim (6 px), where the tool
  // blended subject and screen; interior colours stay untouched.
  const rim = morph(transparent, width, height, 6, true);
  for (let p = 0; p < width * height; p += 1) {
    if (rim[p] === 0) continue;
    const offset = p * 4;
    if (isGreen) {
      out[offset + 1] = Math.min(out[offset + 1], Math.max(out[offset], out[offset + 2]));
    } else {
      const limit = out[offset + 1] + 20;
      out[offset] = Math.min(out[offset], limit);
      out[offset + 2] = Math.min(out[offset + 2], limit);
    }
  }
  return { data: out, width, height };
}

// ---------------------------------------------------------------------------
// Seamless tiling: sum of four half-offset copies weighted by sin², so each
// copy fades to zero exactly where its own wrap seam lies.
// ---------------------------------------------------------------------------

function makeSeamless(image) {
  const { data, width, height } = image;
  const out = Buffer.alloc(data.length);
  const wx = new Float32Array(width);
  const wy = new Float32Array(height);
  for (let x = 0; x < width; x += 1) wx[x] = Math.sin((Math.PI * x) / width) ** 2;
  for (let y = 0; y < height; y += 1) wy[y] = Math.sin((Math.PI * y) / height) ** 2;
  const halfW = Math.floor(width / 2);
  const halfH = Math.floor(height / 2);
  for (let y = 0; y < height; y += 1) {
    const y1 = (y + halfH) % height;
    for (let x = 0; x < width; x += 1) {
      const x1 = (x + halfW) % width;
      const weights = [
        [x, y, wx[x] * wy[y]],
        [x1, y, wx[x1] * wy[y]],
        [x, y1, wx[x] * wy[y1]],
        [x1, y1, wx[x1] * wy[y1]],
      ];
      const target = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        let sum = 0;
        for (const [sx, sy, weight] of weights) {
          sum += data[(sy * width + sx) * 4 + channel] * weight;
        }
        out[target + channel] = Math.round(sum);
      }
    }
  }
  return { data: out, width, height };
}

function cropSquare(image) {
  const size = Math.min(image.width, image.height);
  const left = Math.floor((image.width - size) / 2);
  const top = Math.floor((image.height - size) / 2);
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    image.data.copy(
      out,
      y * size * 4,
      ((y + top) * image.width + left) * 4,
      ((y + top) * image.width + left + size) * 4,
    );
  }
  return { data: out, width: size, height: size };
}

// ---------------------------------------------------------------------------
// Object detection for atlases.
// ---------------------------------------------------------------------------

/**
 * Finds separate sprites in an atlas image. Fragments closer than a few
 * pixels (fins, tentacles, debris) are grouped by growing the alpha mask, not
 * by bounding boxes, so a sprawling creature never swallows its neighbours.
 * Each box carries the label map so crops keep only their own pixels.
 */
function detectObjects(image, minAreaShare = 0.0015) {
  const { data, width, height } = image;
  const count = width * height;
  const mask = new Uint8Array(count);
  for (let p = 0; p < count; p += 1) mask[p] = data[p * 4 + 3] > 24 ? 1 : 0;
  const gap = Math.max(2, Math.round(Math.max(width, height) * 0.004));
  const grown = morph(mask, width, height, gap, true);

  const labels = new Int32Array(count).fill(-1);
  const boxes = [];
  const stack = [];
  for (let start = 0; start < count; start += 1) {
    if (grown[start] === 0 || labels[start] !== -1) continue;
    const box = { id: boxes.length, x0: width, y0: height, x1: -1, y1: -1, area: 0 };
    labels[start] = box.id;
    stack.push(start);
    while (stack.length > 0) {
      const p = stack.pop();
      const x = p % width;
      const y = (p - x) / width;
      if (mask[p] === 1) {
        box.x0 = Math.min(box.x0, x);
        box.y0 = Math.min(box.y0, y);
        box.x1 = Math.max(box.x1, x);
        box.y1 = Math.max(box.y1, y);
        box.area += 1;
      }
      if (x > 0 && grown[p - 1] === 1 && labels[p - 1] === -1) { labels[p - 1] = box.id; stack.push(p - 1); }
      if (x < width - 1 && grown[p + 1] === 1 && labels[p + 1] === -1) { labels[p + 1] = box.id; stack.push(p + 1); }
      if (y > 0 && grown[p - width] === 1 && labels[p - width] === -1) { labels[p - width] = box.id; stack.push(p - width); }
      if (y < height - 1 && grown[p + width] === 1 && labels[p + width] === -1) { labels[p + width] = box.id; stack.push(p + width); }
    }
    boxes.push(box);
  }

  const minArea = count * minAreaShare;
  return boxes
    .filter((box) => box.area >= minArea && box.x1 >= box.x0)
    .map((box) => {
      const pad = 2;
      const x0 = Math.max(0, box.x0 - pad);
      const y0 = Math.max(0, box.y0 - pad);
      const x1 = Math.min(width, box.x1 + 1 + pad);
      const y1 = Math.min(height, box.y1 + 1 + pad);
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, area: box.area, id: box.id, labels };
    })
    .sort((a, b) => b.area - a.area);
}

/** Crop of one detected object; pixels of other objects are made transparent. */
function cropObject(image, box) {
  const out = crop(image, box);
  for (let y = 0; y < box.h; y += 1) {
    for (let x = 0; x < box.w; x += 1) {
      if (box.labels[(y + box.y) * image.width + x + box.x] !== box.id) {
        out.data[(y * box.w + x) * 4 + 3] = 0;
      }
    }
  }
  return out;
}


function trim(image) {
  const { data, width, height } = image;
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
  }
  if (x1 < 0) return image;
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.01) + 2;
  const box = {
    x: Math.max(0, x0 - pad),
    y: Math.max(0, y0 - pad),
    w: Math.min(width, x1 + pad + 1) - Math.max(0, x0 - pad),
    h: Math.min(height, y1 + pad + 1) - Math.max(0, y0 - pad),
  };
  return crop(image, box);
}

/** Shelf packing, scaling every sprite by the same factor until they fit. */
function pack(sprites, atlasSize, padding) {
  const totalArea = sprites.reduce((sum, sprite) => sum + (sprite.width + padding) * (sprite.height + padding), 0);
  let scale = Math.min(1, Math.sqrt((atlasSize * atlasSize * 0.82) / totalArea));
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const placed = [];
    let x = padding;
    let y = padding;
    let shelf = 0;
    let fits = true;
    const order = sprites
      .map((sprite, index) => ({ sprite, index }))
      .sort((a, b) => b.sprite.height - a.sprite.height);
    for (const { sprite, index } of order) {
      const w = Math.max(1, Math.round(sprite.width * scale));
      const h = Math.max(1, Math.round(sprite.height * scale));
      if (x + w + padding > atlasSize) {
        x = padding;
        y += shelf + padding;
        shelf = 0;
      }
      if (y + h + padding > atlasSize || w + padding * 2 > atlasSize) {
        fits = false;
        break;
      }
      placed[index] = { x, y, w, h };
      x += w + padding;
      shelf = Math.max(shelf, h);
    }
    if (fits) return { placed, scale };
    scale *= 0.95;
  }
  throw new Error("atlas packing failed");
}

/**
 * Some tools answer "seamless tile" with a 2x2 grid of the same tile. Detect
 * it by comparing quadrants and keep a single tile.
 */
function untile2x2(image, label, notes) {
  const { data, width, height } = image;
  const halfW = Math.floor(width / 2);
  const halfH = Math.floor(height / 2);
  let diff = 0;
  let samples = 0;
  for (let y = 0; y < halfH; y += 3) {
    for (let x = 0; x < halfW; x += 3) {
      const a = (y * width + x) * 4;
      const b = (y * width + x + halfW) * 4;
      const c = ((y + halfH) * width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        diff += Math.abs(data[a + channel] - data[b + channel]) + Math.abs(data[a + channel] - data[c + channel]);
      }
      samples += 6;
    }
  }
  if (diff / samples > 6) return image;
  notes.push(label + ": image is a 2x2 grid of one tile; using a single tile (" + halfW + " px). Regenerate for more detail.");
  return crop(image, { x: 0, y: 0, w: halfW, h: halfH });
}

/** Linear levels on luma percentiles, applied to RGB. */
function levels(image, blackPercentile, whitePercentile) {
  const { data } = image;
  const lumas = [];
  for (let offset = 0; offset < data.length; offset += 16) {
    lumas.push(0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2]);
  }
  lumas.sort((a, b) => a - b);
  const black = lumas[Math.floor(lumas.length * blackPercentile)];
  const white = Math.max(black + 1, lumas[Math.min(lumas.length - 1, Math.floor(lumas.length * whitePercentile))]);
  const out = Buffer.from(data);
  for (let offset = 0; offset < out.length; offset += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      out[offset + channel] = Math.max(0, Math.min(255, Math.round(((data[offset + channel] - black) * 255) / (white - black))));
    }
  }
  return { data: out, width: image.width, height: image.height, black, white };
}

// ---------------------------------------------------------------------------
// Encoding helpers.
// ---------------------------------------------------------------------------

async function writeVariants(outDir, id, pipelineFor, sizes, options) {
  const variants = [];
  for (const size of sizes) {
    const buffer = await pipelineFor(size).webp(options).toBuffer();
    const file = id + "." + size + ".webp";
    writeFileSync(join(outDir, file), buffer);
    variants.push({ maxSize: size, url: file, sha256: sha256(buffer) });
  }
  return variants.sort((a, b) => a.maxSize - b.maxSize);
}

async function lumaReport(image) {
  const { data, info } = await rawImage(image)
    .resize({ width: 1280, kernel: "lanczos3" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const y0 = Math.floor(info.height * 0.1);
  const y1 = Math.floor(info.height * 0.85);
  const values = [];
  for (let y = y0; y < y1; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      values.push(0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2]);
    }
  }
  values.sort((a, b) => a - b);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const p95 = values[Math.floor(values.length * 0.95)];
  const brightShare = values.filter((value) => value >= 200).length / values.length;
  const darkShare = values.filter((value) => value <= 12).length / values.length;
  const warnings = [];
  if (mean > LUMA_LIMITS.mean) warnings.push("mean luma " + mean.toFixed(1) + " > " + LUMA_LIMITS.mean);
  if (p95 > LUMA_LIMITS.p95) warnings.push("p95 luma " + p95.toFixed(1) + " > " + LUMA_LIMITS.p95);
  if (brightShare > LUMA_LIMITS.brightShare) warnings.push("bright share " + (brightShare * 100).toFixed(1) + "% > 1.5%");
  if (darkShare < LUMA_LIMITS.darkShare) warnings.push("dark share " + (darkShare * 100).toFixed(1) + "% < 20%");
  return { mean, p95, brightShare, darkShare, warnings };
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------


async function main() {
  const kitId = process.argv[2];
  const kit = KITS[kitId];
  if (kit === undefined) {
    console.error(
      "Usage: pnpm bg:prepare <" + Object.keys(KITS).join("|") + "> [--tool=<name>] [--src=<dir>] [--out=<dir>]",
    );
    process.exit(2);
  }
  // --src / --out exist for pipeline tests; normal runs use the kit folders.
  const srcDir = option("src") ?? join(ROOT, kit.src);
  const outDir = option("out") ?? join(PUBLIC_ROOT, kitId);
  const reviewDir = join(srcDir, "_out");
  mkdirSync(outDir, { recursive: true });
  mkdirSync(reviewDir, { recursive: true });
  const written = new Set(["kit.json"]);
  const textures = {};
  const atlases = {};
  const report = { kit: kitId, inputs: {}, notes: [] };

  const input = (name) => {
    const file = findInput(srcDir, kit.prefix + name);
    report.inputs[name] = file === null ? "missing" : relative(ROOT, file);
    if (file === null) console.warn("• missing " + kit.prefix + name + " (skipped)");
    return file;
  };

  // Each Galaxy declares the plates that actually exist in its authored kit.
  // G03 intentionally keeps its completed one-plate source set; G04+ uses one
  // unique plate per World so variety comes from authored scenery, not recolor.
  for (const plateName of kit.plateNames) {
    const plateFile = input(plateName);
    if (plateFile === null) continue;
    const image = await readArt(plateFile, plateName, report.notes);
    const sizes = exportSizes(Math.max(image.width, image.height), PLATE_SIZES);
    const variants = await writeVariants(
      outDir,
      plateName,
      (size) => rawImage(image).flatten({ background: "#000000" }).resize({ width: size, height: size, fit: "inside", kernel: "lanczos3" }),
      sizes,
      { quality: 84, effort: 5, smartSubsample: true },
    );
    variants.forEach((variant) => written.add(variant.url));
    textures[plateName] = { variants, aspect: image.width / image.height, wrap: "clamp", mipmaps: false };
    const luma = await lumaReport(image);
    const lumaKey = (plateName === "plate"
      ? "plate"
      : plateName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())) + "Luma";
    report[lumaKey] = luma;
    for (const warning of luma.warnings) console.warn("• " + plateName + " readability: " + warning);
    if (image.width < 1920) console.warn("• " + plateName + " is " + image.width + " px wide; upscale 2x with Upscayl for sharper High/Ultra.");
  }

  // Glow sheets (opaque, additive).
  for (const name of ["glow-a", "glow-b"]) {
    const file = input(name);
    if (file === null) continue;
    // Additive layers need a true black background: lift the black point
    // to the 30th luma percentile when the tool painted a coloured backdrop.
    const source = untile2x2(cropSquare(await readArt(file, name, report.notes)), name, report.notes);
    const leveled = levels(source, 0.3, 0.998);
    if (leveled.black > 12) report.notes.push(name + ": background lifted to black (black point " + Math.round(leveled.black) + ").");
    const image = makeSeamless(leveled.black > 12 ? leveled : source);
    const sizes = exportSizes(Math.max(image.width, 1024), TEXTURE_SIZES).filter((size) => size >= 1024);
    const variants = await writeVariants(
      outDir,
      name,
      (size) => rawImage(image).flatten({ background: "#000000" }).resize({ width: size, height: size, kernel: "lanczos3" }),
      sizes,
      { quality: 88, effort: 5 },
    );
    variants.forEach((variant) => written.add(variant.url));
    textures[name] = { variants, aspect: 1, wrap: "repeat", mipmaps: true };
  }

  // Dust mask: black on white -> alpha.
  const dustFile = input("dust");
  if (dustFile !== null) {
    // Normalise so the lightest 8% is pure white (no haze) and the darkest
    // 2% pure black, whatever grey the tool used for "white".
    const source = levels(cropSquare(await readArt(dustFile, "dust", report.notes)), 0.02, 0.92);
    const data = Buffer.alloc(source.data.length);
    for (let offset = 0; offset < data.length; offset += 4) {
      const luma = (0.2126 * source.data[offset] + 0.7152 * source.data[offset + 1] + 0.0722 * source.data[offset + 2]) / 255;
      const alpha = Math.pow(Math.max(0, Math.min(1, (1 - luma - 0.03) / 0.97)), 1.1);
      data[offset] = 8;
      data[offset + 1] = 5;
      data[offset + 2] = 14;
      data[offset + 3] = Math.round(alpha * 255);
    }
    const image = makeSeamless({ data, width: source.width, height: source.height });
    const sizes = exportSizes(Math.max(image.width, 1024), TEXTURE_SIZES).filter((size) => size >= 1024);
    const variants = await writeVariants(
      outDir,
      "dust",
      (size) => rawImage(image).resize({ width: size, height: size, kernel: "lanczos3" }),
      sizes,
      { quality: 85, alphaQuality: 90, effort: 5 },
    );
    variants.forEach((variant) => written.add(variant.url));
    textures.dust = { variants, aspect: 1, wrap: "repeat", mipmaps: true };
  }

  // Heroes. Each Galaxy owns a five-World range; processing stays shared.
  for (const worldNumber of kit.heroWorlds) {
    const name = "hero-w" + String(worldNumber).padStart(2, "0");
    const file = input(name);
    if (file === null) continue;
    try {
      const image = trim(ensureTransparency(await readArt(file, name, report.notes), name, report.notes, true));
      const sizes = exportSizes(Math.max(image.width, image.height), TEXTURE_SIZES);
      const variants = await writeVariants(
        outDir,
        name,
        (size) => rawImage(image).resize({ width: size, height: size, fit: "inside", kernel: "lanczos3" }),
        sizes,
        { quality: 90, alphaQuality: 100, effort: 5 },
      );
      variants.forEach((variant) => written.add(variant.url));
      textures[name] = { variants, aspect: image.width / image.height, wrap: "clamp", mipmaps: true };
    } catch (error) {
      fail(error.message);
    }
  }

  // Atlases.
  for (const [atlasId, name] of [["rocks", "atlas-rocks"], ["life", "atlas-life"]]) {
    const file = input(name);
    if (file === null) continue;
    try {
      const image = ensureTransparency(await readArt(file, name, report.notes), name, report.notes);
      const boxes = detectObjects(image);
      if (boxes.length === 0) throw new Error(name + ": no separate objects found.");
      const expectedObjects = kit.expectedAtlasObjects?.[atlasId];
      if (expectedObjects !== undefined && boxes.length !== expectedObjects) {
        throw new Error(
          name + ": detected " + boxes.length + " objects; expected exactly " + expectedObjects +
            ". Check transparency, spacing and object separation in the source atlas.",
        );
      }
      const sprites = boxes.map((box) => trim(cropObject(image, box)));
      const padding = 8;
      // Prefer a 1024 atlas when every sprite fits at full resolution:
      // a 2048 atlas costs ~22 MB of GPU memory with mipmaps.
      const small = pack(sprites, 1024, padding);
      const atlasSize = small.scale >= 0.999 ? 1024 : 2048;
      const { placed, scale } = atlasSize === 1024 ? small : pack(sprites, 2048, padding);
      const layers = [];
      for (let spriteIndex = 0; spriteIndex < sprites.length; spriteIndex += 1) {
        const sprite = sprites[spriteIndex];
        const place = placed[spriteIndex];
        const buffer = await rawImage(sprite).resize({ width: place.w, height: place.h, fit: "fill", kernel: "lanczos3" }).raw().toBuffer();
        layers.push({ input: buffer, raw: { width: place.w, height: place.h, channels: 4 }, left: place.x, top: place.y });
      }
      const atlasBuffer = await sharp({
        create: { width: atlasSize, height: atlasSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      })
        .composite(layers)
        .png()
        .toBuffer();
      const variants = await writeVariants(
        outDir,
        name,
        (size) => sharp(atlasBuffer).resize({ width: size, height: size, kernel: "lanczos3" }),
        [atlasSize, atlasSize / 2],
        { quality: 90, alphaQuality: 100, effort: 5 },
      );
      variants.forEach((variant) => written.add(variant.url));
      textures[name] = { variants, aspect: 1, wrap: "clamp", mipmaps: true };
      const frames = placed.map((place, frameIndex) => ({
        id: atlasId + "-" + String(frameIndex).padStart(2, "0"),
        u0: place.x / atlasSize,
        v0: place.y / atlasSize,
        u1: (place.x + place.w) / atlasSize,
        v1: (place.y + place.h) / atlasSize,
        aspect: place.w / place.h,
        sizeRank: placed.length === 1 ? 0 : frameIndex / (placed.length - 1),
      }));
      atlases[atlasId] = { texture: name, frames };
      report.notes.push(name + ": " + frames.length + " objects packed at scale " + scale.toFixed(3) + ".");

      // Numbered preview so frame ids can be named / reviewed.
      const labels = frames
        .map((frame, frameIndex) => {
          const place = placed[frameIndex];
          return (
            '<rect x="' + place.x + '" y="' + place.y + '" width="' + place.w + '" height="' + place.h +
            '" fill="none" stroke="#35f" stroke-width="3"/><text x="' + (place.x + 6) + '" y="' + (place.y + 34) +
            '" font-size="32" font-family="Helvetica" fill="#fff" stroke="#000" stroke-width="1">' + frame.id + "</text>"
          );
        })
        .join("");
      await sharp({ create: { width: atlasSize, height: atlasSize, channels: 4, background: "#20242c" } })
        .composite([
          { input: atlasBuffer, left: 0, top: 0 },
          { input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + atlasSize + '" height="' + atlasSize + '">' + labels + "</svg>"), left: 0, top: 0 },
        ])
        .webp({ quality: 80 })
        .toFile(join(reviewDir, "preview-" + name + ".webp"));
    } catch (error) {
      fail(error.message);
    }
  }

  // Remove stale runtime files from previous runs.
  for (const file of readdirSync(outDir)) {
    if (!written.has(file)) rmSync(join(outDir, file));
  }

  const version = parseInt(
    sha256(Buffer.from(JSON.stringify({ textures, atlases }))).slice(0, 8),
    16,
  );
  writeFileSync(join(outDir, "kit.json"), JSON.stringify({ id: kitId, version, textures, atlases }, null, 2) + "\n");
  writeFileSync(join(reviewDir, "report.json"), JSON.stringify(report, null, 2) + "\n");

  // Provenance record (no url: the art preloader must not fetch kit.json as
  // an image). Skipped for --out test runs so the real manifest stays clean.
  if (option("out") === null) {
    const manifestPath = join(ROOT, "public/assets/space-typing/manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const tool = process.argv.find((argument) => argument.startsWith("--tool="))?.slice(7) ?? "ChatGPT Images";
    const entry = {
      id: "background-kit-" + kitId,
      category: "galaxy-theme",
      sourceType: "generated",
      source:
        "Owner-generated " + tool + " art from " + kit.src + ", processed by scripts/bg-art/prepare-kit.mjs on " +
        new Date().toISOString().slice(0, 10) + "; runtime kit /assets/space-typing/backgrounds/" + kitId + "/kit.json",
      author: "Space Typing project owner",
      license: "Personal use only; review the image tool's terms before any public distribution",
      attributionRequired: false,
    };
    const index = manifest.entries.findIndex((candidate) => candidate.id === entry.id);
    if (index >= 0) manifest.entries[index] = entry;
    else manifest.entries.push(entry);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  }

  console.log("✓ " + kitId + ": " + Object.keys(textures).length + " textures, " + Object.keys(atlases).length + " atlases → " + relative(ROOT, outDir));
  for (const note of report.notes) console.log("  " + note);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
