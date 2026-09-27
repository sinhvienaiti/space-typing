import {
  PLATE_SHAKE,
  POINT_FLOATS,
  POINT_SHAKE,
  SHEET_SHAKE,
  SPRITE_FLOATS,
  type DrawOp,
  type PointLayerData,
  type SceneDirector,
} from "../director";
import { FX_TEXTURE, textureKey } from "../kit";
import { gradeColorMatrix, plateAxisCenter, TAU } from "../math";
import type { SheetSpec, WorldComposition } from "../types";
import { drawFxAtlas } from "./fx-atlas";
import { createProgram, uniform, type GlProgram } from "./gl";
import {
  BACKDROP_FRAGMENT,
  FULLSCREEN_VERTEX,
  POINT_FRAGMENT,
  POINT_VERTEX,
  SHEET_FRAGMENT,
  SPRITE_FRAGMENT,
  SPRITE_VERTEX,
} from "./shaders";

type TextureRecord = {
  texture: WebGLTexture;
  width: number;
  height: number;
  bytes: number;
};

type Programs = {
  backdrop: GlProgram;
  sheet: GlProgram;
  sprite: GlProgram;
  point: GlProgram;
};

type Resources = {
  programs: Programs;
  emptyVao: WebGLVertexArrayObject;
  spriteVao: WebGLVertexArrayObject;
  pointVao: WebGLVertexArrayObject;
  corners: WebGLBuffer;
  spriteBuffer: WebGLBuffer;
  spriteCapacity: number;
};

type BlendMode = "none" | "normal" | "add" | "screen";

export type TextureSource = ImageBitmap | HTMLCanvasElement | OffscreenCanvas;

/**
 * WebGL2 renderer for the BGV layer stack. Owns GPU objects only; all scene
 * decisions come from SceneDirector.
 */
export class WebGLBackgroundRenderer {
  readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private resources: Resources | null = null;
  private readonly textures = new Map<string, TextureRecord>();
  private readonly pointBuffers = new Map<PointLayerData, WebGLBuffer>();
  private boundDirector: SceneDirector | null = null;
  private colorMatrix: Float32Array | null = null;
  private colorMatrixFor: WorldComposition | null = null;
  private contextLost = false;
  private allowFlow = true;
  private readonly onLost: () => void;
  private readonly onRestored: () => void;

  static create(
    canvas: HTMLCanvasElement,
    callbacks: { onLost: () => void; onRestored: () => void },
  ): WebGLBackgroundRenderer | null {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: "default",
    });
    if (gl === null) return null;
    try {
      return new WebGLBackgroundRenderer(canvas, gl, callbacks);
    } catch (error) {
      console.warn("BGV WebGL renderer unavailable:", error);
      return null;
    }
  }

  private constructor(
    canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    callbacks: { onLost: () => void; onRestored: () => void },
  ) {
    this.canvas = canvas;
    this.gl = gl;
    this.onLost = callbacks.onLost;
    this.onRestored = callbacks.onRestored;
    this.resources = this.createResources();
    canvas.addEventListener("webglcontextlost", this.handleLost);
    canvas.addEventListener("webglcontextrestored", this.handleRestored);
  }

  get lost(): boolean {
    return this.contextLost || this.resources === null;
  }

  get textureBytes(): number {
    let total = 0;
    for (const record of this.textures.values()) total += record.bytes;
    return total;
  }

  private readonly handleLost = (event: Event): void => {
    event.preventDefault();
    this.contextLost = true;
    this.resources = null;
    this.textures.clear();
    this.pointBuffers.clear();
    this.boundDirector = null;
    this.onLost();
  };

  private readonly handleRestored = (): void => {
    // Clear the flag first: createResources() uploads the FX atlas.
    this.contextLost = false;
    try {
      this.resources = this.createResources();
      this.onRestored();
    } catch (error) {
      this.contextLost = true;
      this.resources = null;
      console.warn("BGV WebGL restore failed:", error);
    }
  };

  private createResources(): Resources {
    const gl = this.gl;
    const programs: Programs = {
      backdrop: createProgram(gl, FULLSCREEN_VERTEX, BACKDROP_FRAGMENT),
      sheet: createProgram(gl, FULLSCREEN_VERTEX, SHEET_FRAGMENT),
      sprite: createProgram(gl, SPRITE_VERTEX, SPRITE_FRAGMENT),
      point: createProgram(gl, POINT_VERTEX, POINT_FRAGMENT),
    };
    const emptyVao = gl.createVertexArray();
    const spriteVao = gl.createVertexArray();
    const pointVao = gl.createVertexArray();
    const corners = gl.createBuffer();
    const spriteBuffer = gl.createBuffer();
    if (!emptyVao || !spriteVao || !pointVao || !corners || !spriteBuffer) {
      throw new Error("BGV: cannot allocate WebGL buffers.");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, corners);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]),
      gl.STATIC_DRAW,
    );
    for (const [vao, instanceAttributes] of [
      [spriteVao, 4],
      [pointVao, 3],
    ] as const) {
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, corners);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      for (let location = 1; location <= instanceAttributes; location += 1) {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribDivisor(location, 1);
      }
    }
    gl.bindVertexArray(null);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    const resources: Resources = {
      programs,
      emptyVao,
      spriteVao,
      pointVao,
      corners,
      spriteBuffer,
      spriteCapacity: 0,
    };
    this.resources = resources;
    const fx = drawFxAtlas();
    if (fx !== null) this.uploadTexture(FX_TEXTURE, fx, { wrap: "clamp", mipmaps: true });
    return resources;
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    const width = Math.max(1, Math.round(Math.max(1, cssWidth) * dpr));
    const height = Math.max(1, Math.round(Math.max(1, cssHeight) * dpr));
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  }

  uploadTexture(
    key: string,
    source: TextureSource,
    options: { wrap: "clamp" | "repeat"; mipmaps: boolean },
  ): void {
    if (this.lost) return;
    const gl = this.gl;
    this.deleteTexture(key);
    const texture = gl.createTexture();
    if (texture === null) return;
    const width = source.width;
    const height = source.height;
    const levels = options.mipmaps
      ? Math.floor(Math.log2(Math.max(width, height))) + 1
      : 1;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    // ImageBitmaps are decoded premultiplied; canvases need the flag.
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !(source instanceof ImageBitmap));
    gl.texStorage2D(gl.TEXTURE_2D, levels, gl.RGBA8, width, height);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
    if (options.mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
    const wrap = options.wrap === "repeat" ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      options.mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
    const bytes = width * height * 4 * (options.mipmaps ? 4 / 3 : 1);
    this.textures.set(key, { texture, width, height, bytes });
  }

  deleteTexture(key: string): void {
    const record = this.textures.get(key);
    if (record === undefined) return;
    if (!this.lost) this.gl.deleteTexture(record.texture);
    this.textures.delete(key);
  }

  private bindDirector(director: SceneDirector): void {
    if (this.boundDirector === director) return;
    const gl = this.gl;
    for (const buffer of this.pointBuffers.values()) gl.deleteBuffer(buffer);
    this.pointBuffers.clear();
    for (const layer of director.pointLayers) {
      const buffer = gl.createBuffer();
      if (buffer === null) continue;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, layer.data, gl.STATIC_DRAW);
      this.pointBuffers.set(layer, buffer);
    }
    this.boundDirector = director;
  }

  /** Draws one frame; `allowFlow` false skips flow samples (adaptive load). */
  draw(director: SceneDirector, allowFlow = true): void {
    const resources = this.resources;
    if (resources === null || this.contextLost) return;
    const gl = this.gl;
    this.bindDirector(director);
    this.uploadSprites(resources, director);
    this.allowFlow = allowFlow;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    for (const op of director.ops) this.drawOp(resources, director, op);
    gl.bindVertexArray(null);
  }

  private uploadSprites(resources: Resources, director: SceneDirector): void {
    const gl = this.gl;
    const floats = director.spriteCount * SPRITE_FLOATS;
    gl.bindBuffer(gl.ARRAY_BUFFER, resources.spriteBuffer);
    if (resources.spriteCapacity < floats) {
      gl.bufferData(gl.ARRAY_BUFFER, director.sprites.byteLength, gl.DYNAMIC_DRAW);
      resources.spriteCapacity = director.sprites.length;
    }
    if (floats > 0) gl.bufferSubData(gl.ARRAY_BUFFER, 0, director.sprites, 0, floats);
  }

  private setBlend(mode: BlendMode): void {
    const gl = this.gl;
    if (mode === "none") {
      gl.disable(gl.BLEND);
      return;
    }
    gl.enable(gl.BLEND);
    if (mode === "add") gl.blendFunc(gl.ONE, gl.ONE);
    else if (mode === "screen") gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  /** Binds a kit texture (or the FX atlas) of the director's kit to `unit`. */
  private bindTexture(director: SceneDirector, id: string, unit = 0): boolean {
    const record = this.textures.get(textureKey(director.kit.id, id));
    if (record === undefined) return false;
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, record.texture);
    return true;
  }

  private useProgram(
    program: GlProgram,
    director: SceneDirector,
    vao: WebGLVertexArrayObject,
  ): void {
    const gl = this.gl;
    gl.useProgram(program.program);
    gl.bindVertexArray(vao);
    gl.uniform2f(uniform(program, "uResolution"), this.canvas.width, this.canvas.height);
    gl.uniform2f(uniform(program, "uViewport"), director.viewW, director.viewH);
    gl.uniform1f(uniform(program, "uVignette"), director.composition.post.vignette);
    gl.uniform1f(uniform(program, "uDim"), director.dim);
  }

  /** Sets `<prefix>Shape`, `<prefix>Scroll` and `<prefix>Tint` for one sheet. */
  private setSheetUniforms(
    program: GlProgram,
    prefix: string,
    sheet: SheetSpec,
    director: SceneDirector,
    flow: boolean,
  ): void {
    const gl = this.gl;
    const rotation = (sheet.rotation * Math.PI) / 180;
    gl.uniform4f(
      uniform(program, prefix + "Shape"),
      Math.max(1, sheet.tileScale * director.viewH),
      flow && this.allowFlow ? sheet.flow : 0,
      Math.cos(rotation),
      Math.sin(rotation),
    );
    gl.uniform2f(
      uniform(program, prefix + "Scroll"),
      director.clock * sheet.lateral + director.shakeX * SHEET_SHAKE,
      director.flight * sheet.depth + director.shakeY * SHEET_SHAKE,
    );
    gl.uniform4f(
      uniform(program, prefix + "Tint"),
      sheet.tint[0],
      sheet.tint[1],
      sheet.tint[2],
      sheet.opacity,
    );
  }

  private drawOp(resources: Resources, director: SceneDirector, op: DrawOp): void {
    const gl = this.gl;
    const composition = director.composition;
    const height = director.viewH;

    if (op.kind === "backdrop") {
      const plate = composition.plate;
      const texture = director.kit.textures[plate.texture];
      const hasPlate = texture !== undefined && this.bindTexture(director, plate.texture, 0);
      if (this.colorMatrixFor !== composition) {
        this.colorMatrix = gradeColorMatrix(plate.grade);
        this.colorMatrixFor = composition;
      }
      const glow = op.glow >= 0 ? composition.sheets[op.glow]! : null;
      const dust = op.dust >= 0 ? composition.sheets[op.dust]! : null;
      const hasGlow = glow !== null && this.bindTexture(director, glow.texture, 1);
      const hasDust = dust !== null && this.bindTexture(director, dust.texture, 2);
      const program = resources.programs.backdrop;
      const phase = (director.clock / plate.driftPeriod) * TAU;
      this.setBlend("none");
      this.useProgram(program, director, resources.emptyVao);
      gl.uniform1i(uniform(program, "uPlate"), 0);
      gl.uniform1i(uniform(program, "uGlow"), 1);
      gl.uniform1i(uniform(program, "uDust"), 2);
      gl.uniform1f(uniform(program, "uHasPlate"), hasPlate ? 1 : 0);
      const texAspect = texture?.aspect ?? 16 / 9;
      const viewAspect = director.viewW / height;
      // Same cover fit as the shader: a screen wider than the plate crops its
      // top and bottom, and `focus` decides which part stays in view.
      const fitX = texAspect > viewAspect ? viewAspect / texAspect : 1;
      const fitY = texAspect > viewAspect ? 1 : texAspect / viewAspect;
      gl.uniform1f(uniform(program, "uTexAspect"), texAspect);
      gl.uniform1f(uniform(program, "uZoom"), plate.overscan);
      gl.uniform2f(
        uniform(program, "uCenter"),
        plateAxisCenter(fitX, plate.overscan, plate.drift[0], plate.focus?.[0] ?? 0.5),
        plateAxisCenter(fitY, plate.overscan, plate.drift[1], plate.focus?.[1] ?? 0.5),
      );
      gl.uniform2f(
        uniform(program, "uOffset"),
        Math.sin(phase) * plate.drift[0] * director.viewW + director.shakeX * PLATE_SHAKE,
        Math.cos(phase * 0.83 + 1.1) * plate.drift[1] * height + director.shakeY * PLATE_SHAKE,
      );
      gl.uniform1f(uniform(program, "uFlipX"), plate.flipX ? 1 : 0);
      gl.uniform1f(uniform(program, "uExposure"), plate.grade.exposure);
      gl.uniform1f(uniform(program, "uCurve"), Math.max(-0.5, Math.min(1, plate.grade.gamma - 1)));
      gl.uniformMatrix3fv(uniform(program, "uColor"), false, this.colorMatrix!);
      gl.uniform1f(uniform(program, "uHasGlow"), hasGlow ? 1 : 0);
      gl.uniform1f(uniform(program, "uHasDust"), hasDust ? 1 : 0);
      gl.uniform1f(uniform(program, "uTime"), director.clock);
      if (glow !== null) this.setSheetUniforms(program, "uGlow", glow, director, op.glowFlow);
      if (dust !== null) this.setSheetUniforms(program, "uDust", dust, director, op.dustFlow);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.activeTexture(gl.TEXTURE0);
      return;
    }

    if (op.kind === "sheet") {
      const sheet = composition.sheets[op.sheet]!;
      if (!this.bindTexture(director, sheet.texture)) return;
      const program = resources.programs.sheet;
      this.setBlend(sheet.blend === "mask" ? "normal" : sheet.blend);
      this.useProgram(program, director, resources.emptyVao);
      gl.uniform1i(uniform(program, "uTex"), 0);
      this.setSheetUniforms(program, "u", sheet, director, op.flow);
      gl.uniform1f(uniform(program, "uTime"), director.clock);
      gl.uniform1f(uniform(program, "uMask"), sheet.blend === "mask" ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return;
    }

    if (op.kind === "sprites") {
      if (op.count === 0 || !this.bindTexture(director, op.texture)) return;
      const program = resources.programs.sprite;
      this.setBlend(op.additive ? "add" : "normal");
      this.useProgram(program, director, resources.spriteVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, resources.spriteBuffer);
      const stride = SPRITE_FLOATS * 4;
      const base = op.start * stride;
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, base);
      gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, base + 16);
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, base + 32);
      gl.vertexAttribPointer(4, 4, gl.FLOAT, false, stride, base + 48);
      gl.uniform1i(uniform(program, "uTex"), 0);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, op.count);
      return;
    }

    const layer = director.pointLayers[op.layer];
    const buffer = layer === undefined ? undefined : this.pointBuffers.get(layer);
    if (layer === undefined || buffer === undefined) return;
    const program = resources.programs.point;
    const spec = layer.spec;
    this.setBlend("add");
    this.useProgram(program, director, resources.pointVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const stride = POINT_FLOATS * 4;
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 16);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, 32);
    gl.uniform1f(uniform(program, "uFlight"), director.flight);
    gl.uniform1f(uniform(program, "uTime"), director.clock);
    gl.uniform1f(uniform(program, "uTwinkle"), spec.twinkle);
    gl.uniform1f(uniform(program, "uWander"), spec.wander);
    gl.uniform1f(
      uniform(program, "uMinRadius"),
      0.6 * (director.viewW / Math.max(1, this.canvas.width)),
    );
    gl.uniform2f(
      uniform(program, "uShake"),
      director.shakeX * POINT_SHAKE,
      director.shakeY * POINT_SHAKE,
    );
    const dust = op.occluded ? composition.sheets[director.dustSheet] : undefined;
    const occluded = dust !== undefined && this.bindTexture(director, dust.texture, 3);
    gl.uniform1i(uniform(program, "uDust"), 3);
    gl.uniform1f(uniform(program, "uDustOcclusion"), occluded ? 1 : 0);
    if (dust !== undefined && occluded) {
      const rotation = (dust.rotation * Math.PI) / 180;
      gl.uniform4f(
        uniform(program, "uDustShape"),
        Math.max(1, dust.tileScale * height),
        0,
        Math.cos(rotation),
        Math.sin(rotation),
      );
      gl.uniform2f(
        uniform(program, "uDustScroll"),
        director.clock * dust.lateral + director.shakeX * SHEET_SHAKE,
        director.flight * dust.depth + director.shakeY * SHEET_SHAKE,
      );
      gl.uniform1f(uniform(program, "uDustOpacity"), dust.opacity);
    }
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, layer.count);
    gl.activeTexture(gl.TEXTURE0);
  }

  destroy(): void {
    this.canvas.removeEventListener("webglcontextlost", this.handleLost);
    this.canvas.removeEventListener("webglcontextrestored", this.handleRestored);
    for (const key of [...this.textures.keys()]) this.deleteTexture(key);
    const resources = this.resources;
    if (resources !== null && !this.gl.isContextLost()) {
      const gl = this.gl;
      for (const buffer of this.pointBuffers.values()) gl.deleteBuffer(buffer);
      gl.deleteBuffer(resources.corners);
      gl.deleteBuffer(resources.spriteBuffer);
      gl.deleteVertexArray(resources.emptyVao);
      gl.deleteVertexArray(resources.spriteVao);
      gl.deleteVertexArray(resources.pointVao);
      for (const program of Object.values(resources.programs)) {
        gl.deleteProgram(program.program);
      }
    }
    this.pointBuffers.clear();
    this.resources = null;
    // Release the GPU context eagerly instead of waiting for garbage collection.
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
