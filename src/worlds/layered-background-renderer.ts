import type {
  LayeredBackgroundDrawInput,
  LayeredBackgroundLayer,
  LayeredBackgroundProfile,
  LoadedBackgroundAsset,
} from "./layered-background-types";

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function qualityAllowsOptional(
  quality: LayeredBackgroundDrawInput["quality"],
): boolean {
  return quality === "high" || quality === "ultra";
}

function blendMode(
  blend: LayeredBackgroundLayer["blend"],
): GlobalCompositeOperation {
  if (blend === "lighter") return "lighter";
  if (blend === "screen") return "screen";
  if (blend === "multiply") return "multiply";
  return "source-over";
}

type LayeredBackgroundInstance = {
  layer: LayeredBackgroundLayer;
  index: number;
  anchorX: number;
  anchorY: number;
  scaleMultiplier: number;
  opacityMultiplier: number;
  speedMultiplier: number;
  phaseOffset: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function stringSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: number, index: number, salt = 0): number {
  let value =
    seed ^
    Math.imul(index + 1, 0x9e3779b1) ^
    Math.imul(salt + 1, 0x85ebca6b);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 0xffffffff;
}

function qualityInstanceFactor(
  quality: LayeredBackgroundDrawInput["quality"],
): number {
  if (quality === "low") return 0.45;
  if (quality === "medium") return 0.65;
  if (quality === "high") return 0.85;
  return 1;
}

export class LayeredBackgroundRenderer {
  private readonly assets = new Map<string, LoadedBackgroundAsset>();
  private readonly treatedAssets = new Map<string, HTMLCanvasElement>();
  private readonly instanceCache = new Map<
    string,
    readonly LayeredBackgroundInstance[]
  >();

  clear(): void {
    this.assets.clear();
    this.treatedAssets.clear();
    this.instanceCache.clear();
  }

  private asset(src: string): LoadedBackgroundAsset | null {
    if (typeof Image === "undefined") return null;

    const cached = this.assets.get(src);
    if (cached !== undefined) return cached;

    const state: LoadedBackgroundAsset = {
      image: new Image(),
      loaded: false,
      failed: false,
    };
    state.image.decoding = "async";
    state.image.onload = () => {
      state.loaded = true;
    };
    state.image.onerror = () => {
      state.failed = true;
    };
    state.image.src = src;
    this.assets.set(src, state);
    return state;
  }

  preload(
    profile: LayeredBackgroundProfile,
    quality: LayeredBackgroundDrawInput["quality"],
  ): void {
    for (const layer of profile.layers) {
      if (layer.optional && !qualityAllowsOptional(quality)) continue;
      this.asset(layer.src);
    }
  }

  private treatedAsset(
    layer: LayeredBackgroundLayer,
    asset: LoadedBackgroundAsset,
  ): CanvasImageSource {
    if (
      layer.artTreatment !== "asteroid" ||
      typeof document === "undefined" ||
      !asset.loaded ||
      asset.failed
    ) {
      return asset.image;
    }

    const cacheKey = layer.src + ":asteroid-v2";
    const cached = this.treatedAssets.get(cacheKey);
    if (cached !== undefined) return cached;

    const sourceWidth = Math.max(
      1,
      asset.image.naturalWidth || asset.image.width,
    );
    const sourceHeight = Math.max(
      1,
      asset.image.naturalHeight || asset.image.height,
    );
    const longest = Math.max(sourceWidth, sourceHeight);
    const upscale = clamp(176 / longest, 1, 4);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceWidth * upscale));
    canvas.height = Math.max(1, Math.round(sourceHeight * upscale));
    const context = canvas.getContext("2d");
    if (context === null) return asset.image;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      asset.image,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    // Enrich the very small arcade meteor sprites once, at load time. The
    // resulting canvas is cached and becomes an ordinary drawImage source in
    // the frame loop: no blur, crater generation or new canvas allocation per
    // frame.
    context.save();
    context.globalCompositeOperation = "source-atop";

    const light = context.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    light.addColorStop(0, "rgba(218, 231, 255, 0.24)");
    light.addColorStop(0.38, "rgba(117, 138, 177, 0.04)");
    light.addColorStop(0.7, "rgba(23, 21, 38, 0.08)");
    light.addColorStop(1, "rgba(3, 4, 10, 0.46)");
    context.fillStyle = light;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const seed = stringSeed(layer.src);
    const craterCount = 4 + Math.floor(seededUnit(seed, 0, 91) * 4);
    for (let index = 0; index < craterCount; index += 1) {
      const x = canvas.width * (0.2 + seededUnit(seed, index, 92) * 0.6);
      const y =
        canvas.height * (0.2 + seededUnit(seed, index, 93) * 0.58);
      const radius =
        Math.min(canvas.width, canvas.height) *
        (0.035 + seededUnit(seed, index, 94) * 0.075);
      const squash = 0.48 + seededUnit(seed, index, 95) * 0.34;
      const angle = seededUnit(seed, index, 96) * Math.PI;

      context.save();
      context.translate(x, y);
      context.rotate(angle);
      context.scale(1, squash);
      context.fillStyle =
        "rgba(4, 5, 12, " +
        String(0.16 + seededUnit(seed, index, 97) * 0.14) +
        ")";
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle =
        "rgba(226, 234, 255, " +
        String(0.08 + seededUnit(seed, index, 98) * 0.08) +
        ")";
      context.lineWidth = Math.max(0.8, radius * 0.12);
      context.beginPath();
      context.arc(
        -radius * 0.08,
        -radius * 0.14,
        radius * 0.78,
        Math.PI * 1.06,
        Math.PI * 1.78,
      );
      context.stroke();
      context.restore();
    }

    const specks = 8;
    for (let index = 0; index < specks; index += 1) {
      const x = canvas.width * seededUnit(seed, index, 101);
      const y = canvas.height * seededUnit(seed, index, 102);
      const radius =
        0.6 + seededUnit(seed, index, 103) * 1.3;
      context.fillStyle =
        "rgba(238, 242, 255, " +
        String(0.05 + seededUnit(seed, index, 104) * 0.07) +
        ")";
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
    this.treatedAssets.set(cacheKey, canvas);
    return canvas;
  }

  private instancesFor(
    profile: LayeredBackgroundProfile,
    quality: LayeredBackgroundDrawInput["quality"],
  ): readonly LayeredBackgroundInstance[] {
    const cacheKey = profile.id + ":" + quality;
    const cached = this.instanceCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const generated: LayeredBackgroundInstance[] = [];
    const qualityFactor = qualityInstanceFactor(quality);

    for (const layer of profile.layers) {
      if (layer.optional && !qualityAllowsOptional(quality)) continue;

      const requested = clamp(Math.round(layer.instances ?? 1), 1, 12);
      const count =
        requested === 1
          ? 1
          : Math.max(1, Math.round(requested * qualityFactor));
      const seed = stringSeed(profile.id + ":" + layer.id);
      const spreadX = clamp(layer.spreadX ?? 0, 0, 1);
      const spreadY = clamp(layer.spreadY ?? 0, 0, 1);
      const scaleJitter = clamp(layer.scaleJitter ?? 0, 0, 0.8);
      const opacityJitter = clamp(layer.opacityJitter ?? 0, 0, 0.8);
      const speedJitter = clamp(layer.speedJitter ?? 0, 0, 0.8);

      for (let index = 0; index < count; index += 1) {
        const ux = seededUnit(seed, index, 1);
        const uy = seededUnit(seed, index, 2);
        const us = seededUnit(seed, index, 3);
        const uo = seededUnit(seed, index, 4);
        const uv = seededUnit(seed, index, 5);

        let anchorX = layer.anchorX;
        if (layer.placement === "edges") {
          const left = ux < 0.5;
          const local = left ? ux * 2 : (ux - 0.5) * 2;
          anchorX = left ? 0.035 + local * 0.285 : 0.68 + local * 0.285;
        } else if (layer.placement === "wide") {
          anchorX += (ux - 0.5) * spreadX;
        } else {
          anchorX += (ux - 0.5) * spreadX;
        }

        const anchorY =
          layer.anchorY + (uy - 0.5) * spreadY;

        generated.push({
          layer,
          index,
          anchorX: clamp(anchorX, 0.02, 0.98),
          anchorY: clamp(anchorY, 0.02, 0.98),
          scaleMultiplier: clamp(
            1 + (us - 0.5) * 2 * scaleJitter,
            0.35,
            1.8,
          ),
          opacityMultiplier: clamp(
            1 + (uo - 0.5) * 2 * opacityJitter,
            0.35,
            1.35,
          ),
          speedMultiplier: clamp(
            1 + (uv - 0.5) * 2 * speedJitter,
            0.35,
            1.8,
          ),
          phaseOffset: seededUnit(seed, index, 6) * Math.PI * 2,
        });
      }
    }

    this.instanceCache.set(cacheKey, generated);
    return generated;
  }

  private drawImageLayer(
    context: CanvasRenderingContext2D,
    instance: LayeredBackgroundInstance,
    asset: LoadedBackgroundAsset,
    input: LayeredBackgroundDrawInput,
  ): boolean {
    if (!asset.loaded || asset.failed) return false;

    const { width, height, time, flightIntensity, variant } = input;
    const { layer, index } = instance;
    const image = asset.image;
    const renderSource = this.treatedAsset(layer, asset);
    const treatedCanvas =
      typeof HTMLCanvasElement !== "undefined" &&
      renderSource instanceof HTMLCanvasElement
        ? renderSource
        : null;
    const naturalWidth = Math.max(
      1,
      layer.sourceRect?.width ??
        treatedCanvas?.width ??
        Math.max(1, image.naturalWidth || image.width),
    );
    const naturalHeight = Math.max(
      1,
      layer.sourceRect?.height ??
        treatedCanvas?.height ??
        Math.max(1, image.naturalHeight || image.height),
    );
    const viewportRatio = width / Math.max(1, height);
    const imageRatio = naturalWidth / naturalHeight;
    const authoredScale = layer.scale * instance.scaleMultiplier;

    let drawWidth: number;
    let drawHeight: number;
    if (layer.fit === "cover") {
      if (imageRatio > viewportRatio) {
        drawHeight = height * authoredScale;
        drawWidth = drawHeight * imageRatio;
      } else {
        drawWidth = width * authoredScale;
        drawHeight = drawWidth / imageRatio;
      }
    } else if (imageRatio > viewportRatio) {
      drawWidth = width * authoredScale;
      drawHeight = drawWidth / imageRatio;
    } else {
      drawHeight = height * authoredScale;
      drawWidth = drawHeight * imageRatio;
    }

    const phase =
      index * 1.731 +
      variant * 0.71 +
      instance.phaseOffset;
    const depth = layer.depth;
    const motionStrength = 0.5 + flightIntensity * 0.72;
    const driftX = layer.driftX * instance.speedMultiplier;
    const driftY = layer.driftY * instance.speedMultiplier;
    const dominantDrift = Math.max(Math.abs(driftX), Math.abs(driftY));
    const legacyTravelling =
      Math.abs(driftX) >= 0.005 || Math.abs(driftY) >= 0.005;
    const motionKind =
      layer.motion === undefined || layer.motion === "auto"
        ? legacyTravelling
          ? "wrap"
          : "float"
        : layer.motion;

    let offsetX = 0;
    let offsetY = 0;
    let travelFade = 1;
    let motionScale = 1;
    let travelling = false;

    if (motionKind === "wrap") {
      travelling = true;
      const travelPhase = positiveModulo(
        time * Math.max(0.0001, dominantDrift) * motionStrength +
          phase * 0.137,
        1,
      );
      const edge = Math.min(travelPhase, 1 - travelPhase);
      travelFade = clamp(edge / 0.085, 0, 1);

      const travelX = time * driftX * width * motionStrength;
      const travelY = time * driftY * height * motionStrength;
      offsetX =
        positiveModulo(travelX + width * 0.58, width * 1.16) -
        width * 0.58;
      offsetY =
        positiveModulo(travelY + height * 0.55, height * 1.1) -
        height * 0.55;
    } else if (motionKind === "orbit") {
      const angularSpeed =
        0.035 +
        dominantDrift * 3.5 +
        Math.abs(layer.rotationSpeed) * 0.65;
      const angle =
        phase +
        time *
          angularSpeed *
          instance.speedMultiplier *
          Math.max(0.5, motionStrength);
      const radiusX =
        width * (0.025 + Math.max(0.04, layer.spreadX ?? 0.08)) * depth;
      const radiusY =
        height * (0.018 + Math.max(0.03, layer.spreadY ?? 0.06)) * depth;
      offsetX = Math.cos(angle) * radiusX;
      offsetY = Math.sin(angle) * radiusY;
    } else if (motionKind === "flyby") {
      const cycle = positiveModulo(
        time *
          (0.0045 + dominantDrift * 0.26) *
          motionStrength *
          instance.speedMultiplier +
          phase * 0.071,
        1,
      );
      const visibleStart = 0.16;
      const visibleEnd = 0.84;
      if (cycle < visibleStart || cycle > visibleEnd) {
        travelFade = 0;
      } else {
        const progress =
          (cycle - visibleStart) / (visibleEnd - visibleStart);
        const direction = instance.anchorX < 0.5 ? 1 : -1;
        const eased = progress * progress * (3 - 2 * progress);
        offsetX =
          direction *
          (-width * 0.9 + eased * width * 1.8);
        offsetY =
          Math.sin(progress * Math.PI + phase) *
          height *
          (0.025 + depth * 0.035);
        motionScale =
          0.82 +
          Math.sin(progress * Math.PI) *
            (0.08 + depth * 0.08);
        travelFade = clamp(
          Math.min(progress / 0.08, (1 - progress) / 0.08),
          0,
          1,
        );
      }
    } else if (motionKind === "approach") {
      const cycleSpeed =
        0.008 +
        dominantDrift * 0.8 +
        Math.abs(layer.rotationSpeed) * 0.08;
      const progress = positiveModulo(
        time * cycleSpeed * motionStrength * instance.speedMultiplier +
          phase * 0.047,
        1,
      );
      const eased = Math.pow(progress, 1.42);
      const directionX = instance.anchorX - 0.5;
      const directionY = instance.anchorY - 0.34;
      offsetX = directionX * width * 0.28 * eased;
      offsetY = directionY * height * 0.22 * eased;
      motionScale = 0.58 + eased * 0.78;
      travelFade = clamp(
        Math.min(progress / 0.1, (1 - progress) / 0.12),
        0,
        1,
      );
    } else if (motionKind === "float") {
      const amplitudeX =
        width * (0.008 + Math.abs(driftX) * 7) * depth;
      const amplitudeY =
        height * (0.006 + Math.abs(driftY) * 7) * depth;
      offsetX =
        Math.sin(time * (0.045 + depth * 0.055) * instance.speedMultiplier + phase) *
        amplitudeX;
      offsetY =
        Math.cos(time * (0.04 + depth * 0.05) * instance.speedMultiplier + phase) *
        amplitudeY;
    }

    drawWidth *= motionScale;
    drawHeight *= motionScale;

    const pulse =
      layer.pulseAmount <= 0
        ? 1
        : 1 +
          Math.sin(time * (0.32 + depth * 0.18) + phase) *
            layer.pulseAmount;
    const opacity = clamp(
      layer.opacity *
        instance.opacityMultiplier *
        pulse *
        travelFade,
      0,
      1,
    );

    const centerX = width * instance.anchorX + offsetX;
    const centerY = height * instance.anchorY + offsetY;
    const rotation =
      time * layer.rotationSpeed * instance.speedMultiplier +
      phase * 0.08 +
      Math.sin(time * 0.07 + phase) * layer.rotationSpeed * 0.3;

    const drawAt = (x: number, y: number): void => {
      context.save();
      context.globalAlpha = opacity;
      context.globalCompositeOperation = blendMode(layer.blend);
      context.translate(x, y);
      context.rotate(rotation);
      if (layer.sourceRect !== undefined && renderSource === image) {
        context.drawImage(
          image,
          layer.sourceRect.x,
          layer.sourceRect.y,
          layer.sourceRect.width,
          layer.sourceRect.height,
          -drawWidth * 0.5,
          -drawHeight * 0.5,
          drawWidth,
          drawHeight,
        );
      } else {
        context.drawImage(
          renderSource,
          -drawWidth * 0.5,
          -drawHeight * 0.5,
          drawWidth,
          drawHeight,
        );
      }
      context.restore();
    };

    drawAt(centerX, centerY);

    if (travelling) {
      const wrapX = width * 1.16;
      const wrapY = height * 1.1;
      const marginX = drawWidth * 0.65;
      const marginY = drawHeight * 0.65;

      const leftWrap = centerX - marginX < 0;
      const rightWrap = centerX + marginX > width;
      const topWrap = centerY - marginY < 0;
      const bottomWrap = centerY + marginY > height;
      const dx = leftWrap ? wrapX : rightWrap ? -wrapX : 0;
      const dy = topWrap ? wrapY : bottomWrap ? -wrapY : 0;

      if (dx !== 0) drawAt(centerX + dx, centerY);
      if (dy !== 0) drawAt(centerX, centerY + dy);
      if (dx !== 0 && dy !== 0) drawAt(centerX + dx, centerY + dy);
    }

    return true;
  }

  draw(
    context: CanvasRenderingContext2D,
    profile: LayeredBackgroundProfile,
    input: LayeredBackgroundDrawInput,
  ): boolean {
    this.preload(profile, input.quality);
    let drewAny = false;

    for (const instance of this.instancesFor(profile, input.quality)) {
      const asset = this.asset(instance.layer.src);
      if (asset === null) continue;
      drewAny =
        this.drawImageLayer(context, instance, asset, input) ||
        drewAny;
    }

    return drewAny;
  }
}
