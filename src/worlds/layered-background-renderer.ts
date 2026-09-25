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

export class LayeredBackgroundRenderer {
  private readonly assets = new Map<string, LoadedBackgroundAsset>();

  clear(): void {
    this.assets.clear();
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

  preload(profile: LayeredBackgroundProfile): void {
    for (const layer of profile.layers) {
      this.asset(layer.src);
    }
  }

  private drawImageLayer(
    context: CanvasRenderingContext2D,
    layer: LayeredBackgroundLayer,
    asset: LoadedBackgroundAsset,
    input: LayeredBackgroundDrawInput,
    index: number,
  ): void {
    if (!asset.loaded || asset.failed) return;

    const { width, height, time, flightIntensity, variant } = input;
    const image = asset.image;
    const naturalWidth = Math.max(1, image.naturalWidth || image.width);
    const naturalHeight = Math.max(1, image.naturalHeight || image.height);
    const viewportRatio = width / Math.max(1, height);
    const imageRatio = naturalWidth / naturalHeight;

    let drawWidth: number;
    let drawHeight: number;
    if (layer.fit === "cover") {
      if (imageRatio > viewportRatio) {
        drawHeight = height * layer.scale;
        drawWidth = drawHeight * imageRatio;
      } else {
        drawWidth = width * layer.scale;
        drawHeight = drawWidth / imageRatio;
      }
    } else if (imageRatio > viewportRatio) {
      drawWidth = width * layer.scale;
      drawHeight = drawWidth / imageRatio;
    } else {
      drawHeight = height * layer.scale;
      drawWidth = drawHeight * imageRatio;
    }

    const phase = index * 1.731 + variant * 0.71;
    const depth = layer.depth;
    const motion = 0.5 + flightIntensity * 0.72;

    let offsetX: number;
    let offsetY: number;

    const travelling =
      Math.abs(layer.driftX) >= 0.005 ||
      Math.abs(layer.driftY) >= 0.005;

    if (travelling) {
      const travelX =
        time * layer.driftX * width * motion;
      const travelY =
        time * layer.driftY * height * motion;
      offsetX =
        positiveModulo(
          travelX + width * 0.58,
          width * 1.16,
        ) - width * 0.58;
      offsetY =
        positiveModulo(
          travelY + height * 0.55,
          height * 1.1,
        ) - height * 0.55;
    } else {
      const amplitudeX =
        width * (0.008 + Math.abs(layer.driftX) * 7) * depth;
      const amplitudeY =
        height * (0.006 + Math.abs(layer.driftY) * 7) * depth;
      offsetX =
        Math.sin(time * (0.045 + depth * 0.055) + phase) *
        amplitudeX;
      offsetY =
        Math.cos(time * (0.04 + depth * 0.05) + phase) *
        amplitudeY;
    }

    const pulse =
      layer.pulseAmount <= 0
        ? 1
        : 1 +
          Math.sin(time * (0.32 + depth * 0.18) + phase) *
            layer.pulseAmount;
    const opacity = Math.max(
      0,
      Math.min(1, layer.opacity * pulse),
    );

    const x =
      width * layer.anchorX -
      drawWidth * 0.5 +
      offsetX;
    const y =
      height * layer.anchorY -
      drawHeight * 0.5 +
      offsetY;
    const rotation =
      time * layer.rotationSpeed +
      Math.sin(time * 0.07 + phase) * layer.rotationSpeed * 0.3;

    context.save();
    context.globalAlpha = opacity;
    context.globalCompositeOperation = blendMode(layer.blend);
    context.translate(
      x + drawWidth * 0.5,
      y + drawHeight * 0.5,
    );
    context.rotate(rotation);
    context.drawImage(
      image,
      -drawWidth * 0.5,
      -drawHeight * 0.5,
      drawWidth,
      drawHeight,
    );
    context.restore();
  }

  draw(
    context: CanvasRenderingContext2D,
    profile: LayeredBackgroundProfile,
    input: LayeredBackgroundDrawInput,
  ): void {
    this.preload(profile);

    for (let index = 0; index < profile.layers.length; index += 1) {
      const layer = profile.layers[index]!;
      if (layer.optional && !qualityAllowsOptional(input.quality)) {
        continue;
      }
      const asset = this.asset(layer.src);
      if (asset === null) continue;
      this.drawImageLayer(context, layer, asset, input, index);
    }
  }
}
