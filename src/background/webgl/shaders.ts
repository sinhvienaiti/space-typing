/**
 * GLSL ES 3.00 sources of the BGV renderer.
 *
 * Coordinates: fragment shaders convert gl_FragCoord to CSS pixels with a
 * top-left origin so every pass shares the director's coordinate space.
 *
 * Fill-rate budget: integrated GPUs (Intel UHD 630 on the owner's MacBook)
 * are the constraint, and full-screen passes dominate the cost. So the plate,
 * one glow sheet and the dust mask are composited in ONE opaque pass; stars
 * read the dust mask in their vertex shader to stay occluded; vignette and
 * the global dim are applied inside every shader instead of a post pass.
 */

export const FULLSCREEN_VERTEX = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

/** Shared uniforms/helpers for every fragment shader. */
const COMMON = `
uniform vec2 uResolution;
uniform vec2 uViewport;
uniform float uVignette;
uniform float uDim;

vec2 cssCoord() {
  return vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) * (uViewport / uResolution);
}

// Corner darkening times the global dim (boss telegraphs, brightness setting).
float shade() {
  vec2 uv = gl_FragCoord.xy / uResolution - 0.5;
  vec2 aspect = vec2(uViewport.x / uViewport.y, 1.0);
  float distance = length(uv * aspect) / length(aspect * 0.5);
  return (1.0 - uVignette * smoothstep(0.35, 1.0, distance)) * uDim;
}
`;

/** Sheet placement: q = rotate(css - center - scroll) / tile. */
const SHEET_UV = `
// shape: x = tile px, y = flow (tile units), z = cos(rotation), w = sin(rotation)
vec2 sheetUv(vec2 css, vec4 shape, vec2 scroll) {
  vec2 q = css - uViewport * 0.5 - scroll;
  q = vec2(q.x * shape.z - q.y * shape.w, q.x * shape.w + q.y * shape.z);
  return q / shape.x;
}
`;

/** Two-phase flow with a cheap two-term field (trig is slow on iGPUs). */
const FLOW = `
uniform float uTime;
vec4 flowSample(sampler2D tex, vec2 uv, float flow) {
  if (flow <= 0.0) return texture(tex, uv);
  vec2 direction = vec2(sin(uv.y * 5.3 + 1.7), cos(uv.x * 4.7 + 0.9));
  float phase0 = fract(uTime * 0.045);
  float phase1 = fract(uTime * 0.045 + 0.5);
  float weight = abs((0.5 - phase0) / 0.5);
  return mix(
    texture(tex, uv - direction * phase0 * flow),
    texture(tex, uv - direction * phase1 * flow),
    weight
  );
}
`;

/**
 * Opaque backdrop: plate (graded, drifting) + optional glow (added) +
 * optional dust mask (normal blend), vignette, dim and dither.
 */
export const BACKDROP_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uPlate;
uniform float uHasPlate;
uniform sampler2D uGlow;
uniform sampler2D uDust;
uniform float uTexAspect;
uniform float uZoom;
uniform vec2 uCenter;
uniform vec2 uOffset;
uniform float uFlipX;
uniform float uExposure;
uniform float uCurve;
uniform mat3 uColor;
uniform float uHasGlow;
uniform float uHasDust;
uniform vec4 uGlowShape;
uniform vec4 uDustShape;
uniform vec2 uGlowScroll;
uniform vec2 uDustScroll;
uniform vec4 uGlowTint;
uniform vec4 uDustTint;
out vec4 outColor;
${COMMON}
${SHEET_UV}
${FLOW}
void main() {
  vec2 css = cssCoord();
  float viewAspect = uViewport.x / uViewport.y;
  vec2 fit = uTexAspect > viewAspect
    ? vec2(viewAspect / uTexAspect, 1.0)
    : vec2(1.0, uTexAspect / viewAspect);
  vec2 uv = ((css - uOffset) / uViewport - 0.5) * fit / uZoom + uCenter;
  uv.x = mix(uv.x, 1.0 - uv.x, uFlipX);
  // A kit without a plate still renders: deep black space under the sheets.
  vec3 color = uHasPlate > 0.5 ? texture(uPlate, uv).rgb * uExposure : vec3(0.0);
  // Cheap contrast curve instead of pow(): > 0 deepens shadows, < 0 lifts them.
  color = uCurve >= 0.0 ? mix(color, color * color, uCurve) : mix(color, sqrt(color), -uCurve);
  color = max(uColor * color, vec3(0.0));
  if (uHasGlow > 0.5) {
    color += flowSample(uGlow, sheetUv(css, uGlowShape, uGlowScroll), uGlowShape.y).rgb
      * uGlowTint.rgb * uGlowTint.a;
  }
  if (uHasDust > 0.5) {
    vec4 dust = flowSample(uDust, sheetUv(css, uDustShape, uDustScroll), uDustShape.y) * uDustTint.a;
    color = color * (1.0 - dust.a) + dust.rgb * uDustTint.rgb;
  }
  color *= shade();
  float noise = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5;
  outColor = vec4(color + noise / 255.0, 1.0);
}
`;

/**
 * A single sheet (front sheets, or extra back sheets). Additive output unless
 * uMask is set, then premultiplied normal blend.
 */
export const SHEET_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec4 uShape;
uniform vec2 uScroll;
uniform vec4 uTint;
uniform float uMask;
out vec4 outColor;
${COMMON}
${SHEET_UV}
${FLOW}
void main() {
  vec4 sampleColor = flowSample(uTex, sheetUv(cssCoord(), uShape, uScroll), uShape.y);
  if (uMask > 0.5) {
    vec4 mask = sampleColor * uTint.a;
    outColor = vec4(mask.rgb * uTint.rgb * shade(), mask.a);
  } else {
    outColor = vec4(sampleColor.rgb * uTint.rgb * uTint.a * shade(), 0.0);
  }
}
`;

export const SPRITE_VERTEX = `#version 300 es
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 iPosSize;
layout(location = 2) in vec4 iRotLod;
layout(location = 3) in vec4 iUv;
layout(location = 4) in vec4 iColor;
uniform vec2 uViewport;
out vec2 vUv;
out vec4 vColor;
out float vLod;
void main() {
  float c = cos(iRotLod.x);
  float s = sin(iRotLod.x);
  vec2 local = aCorner * iPosSize.zw;
  vec2 css = iPosSize.xy + vec2(local.x * c - local.y * s, local.x * s + local.y * c);
  gl_Position = vec4(css.x / uViewport.x * 2.0 - 1.0, 1.0 - css.y / uViewport.y * 2.0, 0.0, 1.0);
  vUv = mix(iUv.xy, iUv.zw, aCorner + 0.5);
  vColor = iColor;
  vLod = iRotLod.y;
}
`;

export const SPRITE_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uTex;
in vec2 vUv;
in vec4 vColor;
in float vLod;
out vec4 outColor;
${COMMON}
void main() {
  vec4 color = texture(uTex, vUv, vLod) * vColor;
  // Darken color only: premultiplied alpha (occlusion) stays intact.
  outColor = vec4(color.rgb * shade(), color.a);
}
`;

export const POINT_VERTEX = `#version 300 es
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 iA;
layout(location = 2) in vec4 iB;
layout(location = 3) in vec4 iC;
uniform vec2 uViewport;
uniform float uFlight;
uniform float uTime;
uniform float uTwinkle;
uniform float uWander;
uniform float uMinRadius;
uniform vec2 uShake;
// Dust occlusion: stars behind the dust mask read it once per vertex.
uniform sampler2D uDust;
uniform float uDustOcclusion;
uniform vec4 uDustShape;
uniform vec2 uDustScroll;
uniform float uDustOpacity;
out vec2 vLocal;
out vec3 vColor;
out float vSpike;
void main() {
  float margin = 24.0;
  float span = uViewport.y + margin * 2.0;
  float y = mod(iA.y * span + uFlight * iA.w, span) - margin;
  float x = iA.x * uViewport.x + sin(uTime * 0.07 + iC.w) * uWander;
  float twinkle = 1.0 - uTwinkle * 0.5 + uTwinkle * 0.5 * sin(uTime * iC.y + iC.x);
  float radius = max(iA.z, uMinRadius);
  // Tiny points are drawn at least ~one device pixel wide; scale their
  // brightness down so they keep the same total light instead of blinking.
  float energy = (iA.z * iA.z) / (radius * radius);
  float visible = 1.0;
  if (uDustOcclusion > 0.5) {
    vec2 q = vec2(x, y) - uViewport * 0.5 - uDustScroll;
    q = vec2(q.x * uDustShape.z - q.y * uDustShape.w, q.x * uDustShape.w + q.y * uDustShape.z);
    visible = 1.0 - textureLod(uDust, q / uDustShape.x, 0.0).a * uDustOpacity;
  }
  float extent = iC.z > 0.0 ? 7.0 : 3.0;
  vec2 css = vec2(x, y) + uShake + aCorner * 2.0 * radius * extent;
  gl_Position = vec4(css.x / uViewport.x * 2.0 - 1.0, 1.0 - css.y / uViewport.y * 2.0, 0.0, 1.0);
  vLocal = aCorner * 2.0 * extent;
  vColor = iB.rgb * iB.a * twinkle * energy * visible;
  vSpike = iC.z;
}
`;

export const POINT_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vLocal;
in vec3 vColor;
in float vSpike;
out vec4 outColor;
${COMMON}
void main() {
  float r2 = dot(vLocal, vLocal);
  float core = exp(-r2 * 1.4);
  float halo = exp(-r2 * 0.18) * 0.22;
  float spikes = 0.0;
  if (vSpike > 0.0) {
    vec2 a = abs(vLocal);
    spikes = (exp(-a.y * 2.6 - a.x * 0.42) + exp(-a.x * 2.6 - a.y * 0.42)) * 0.55 * vSpike;
  }
  outColor = vec4(vColor * (core + halo + spikes) * shade(), 0.0);
}
`;
