import type { VisualQuality } from "../types";
import { drawGlow } from "../vfx/light-sprites";
import {
  bossCounterOpen,
  bossCounterVerb,
  bossSkillProgress,
  type BossMeteor,
  type BossSkillState,
} from "./skills";

/**
 * Boss Depth View drawing (Canvas 2D): the boss far up the corridor, the
 * ship near. Draws skill telegraphs and hits, counter prompts, meteors, the
 * ultimate letterbox/banner and pop-up callouts. Game.ts owns the state.
 */
export type DepthGeometry = {
  width: number;
  height: number;
  bossX: number;
  bossY: number;
  /** On-screen box edge of the boss (CSS px). */
  bossSize: number;
  shipX: number;
  shipY: number;
};

export type DepthColors = { primary: string; accent: string };

const DISPLAY = "'Exo 2', 'Be Vietnam Pro', ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export const COUNTER_COLOR = { parry: "#6fe7ff", dodge: "#6dffb0", brace: "#ffd166", break: "#ff7ad9", intercept: "#ff8fb8" } as const;

/** Lane centre at the ship row: −1 left, 0 middle, +1 right. */
export function depthLaneX(geometry: DepthGeometry, lane: number): number {
  return geometry.width / 2 + lane * Math.min(280, geometry.width * 0.19);
}

/** Size factor for something travelling from the boss (far) to the ship (near). */
export function depthScaleAt(geometry: DepthGeometry, y: number): number {
  const span = Math.max(1, geometry.shipY - geometry.bossY);
  const u = Math.min(1, Math.max(0, (y - geometry.bossY) / span));
  // Perspective: far things shrink fast.
  return 0.42 + 0.78 * u * u;
}

/** Perspective-correct point along the far→near flight. */
export function depthFlight(
  u: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
  farScale = 0.38,
): { x: number; y: number; s: number } {
  const w = (1 - u) / farScale + u;
  return {
    x: ((1 - u) * from.x / farScale + u * to.x) / w,
    y: ((1 - u) * from.y / farScale + u * to.y) / w,
    s: 1 / w,
  };
}

function rgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return "rgba(" + String(r) + "," + String(g) + "," + String(b) + "," + String(Math.max(0, Math.min(1, alpha))) + ")";
}

function beam(
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  color: string,
  alpha: number,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 1 || alpha <= 0.01) return;
  context.save();
  context.translate(x1, y1);
  context.rotate(Math.atan2(dy, dx));
  context.globalCompositeOperation = "lighter";
  for (const [w, a, c] of [[width * 3, 0.22, color], [width, 0.8, color], [width * 0.34, 1, "#ffffff"]] as const) {
    const gradient = context.createLinearGradient(0, -w / 2, 0, w / 2);
    gradient.addColorStop(0, rgba(c, 0));
    gradient.addColorStop(0.5, rgba(c, a * alpha));
    gradient.addColorStop(1, rgba(c, 0));
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(0, -w * 0.3);
    context.lineTo(length, -w / 2);
    context.lineTo(length, w / 2);
    context.lineTo(0, w * 0.3);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function ellipseRing(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  width: number,
  color: string,
  alpha: number,
): void {
  if (alpha <= 0.01) return;
  context.save();
  context.globalCompositeOperation = "lighter";
  context.strokeStyle = rgba(color, alpha);
  context.lineWidth = width;
  context.beginPath();
  context.ellipse(x, y, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = rgba(color, alpha * 0.3);
  context.lineWidth = width * 4;
  context.stroke();
  context.restore();
}

/** Siphon chain: glowing links from the boss to the ship, light flowing back. */
function drawChain(
  context: CanvasRenderingContext2D,
  boss: { x: number; y: number },
  ship: { x: number; y: number },
  color: string,
  time: number,
  reach: number,
  rich: boolean,
): void {
  const end = depthFlight(reach, boss, ship);
  beam(context, boss.x, boss.y, end.x, end.y, 7, color, 0.55);
  const links = rich ? 18 : 11;
  context.save();
  context.globalCompositeOperation = "lighter";
  for (let index = 0; index < links; index += 1) {
    const u = (index + 0.5) / links;
    if (u > reach) break;
    const p = depthFlight(u, boss, ship);
    const sway = Math.sin(time * 9 + index * 0.9) * 5 * p.s;
    context.strokeStyle = rgba(color, 0.85);
    context.lineWidth = 1.5 + p.s * 1.6;
    context.beginPath();
    context.ellipse(p.x + sway, p.y, 7 * p.s + 2, 4 * p.s + 1.5, (index % 2) * Math.PI / 2 + 0.6, 0, Math.PI * 2);
    context.stroke();
  }
  // Stolen hull flowing up the chain to the boss.
  for (let index = 0; index < 4; index += 1) {
    const u = 1 - ((time * 0.9 + index / 4) % 1);
    if (u > reach) continue;
    const p = depthFlight(u, boss, ship);
    drawGlow(context, "#ff6b8a", p.x, p.y, 14 * p.s + 6, 0.9);
  }
  drawGlow(context, color, end.x, end.y, 40, 0.7);
  context.restore();
}

/** A rune orb carrying the letter to type (meteors, glyph shots). */
export function drawGlyphOrb(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  letter: string,
  size: number,
  color: string,
  alpha = 1,
): void {
  if (alpha <= 0.01) return;
  context.save();
  context.globalCompositeOperation = "lighter";
  drawGlow(context, color, x, y, size * 1.4, alpha * 0.85);
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = alpha;
  context.fillStyle = "rgba(6, 10, 24, 0.88)";
  context.strokeStyle = color;
  context.lineWidth = Math.max(1.6, size * 0.07);
  context.beginPath();
  context.arc(x, y, size * 0.5, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#ffffff";
  context.font = "800 " + String(Math.round(size * 0.56)) + "px " + DISPLAY;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(letter.toUpperCase(), x, y + size * 0.03);
  context.restore();
}

/** Where a meteor lands (its red target ring). */
export function depthMeteorTarget(geometry: DepthGeometry, meteor: BossMeteor): { x: number; y: number } {
  return {
    x: geometry.width / 2 + meteor.lane * Math.min(geometry.width * 0.4, 520),
    y: geometry.shipY - 40 - (1 - Math.abs(meteor.lane)) * 60,
  };
}

/** Seconds a meteor takes from the boss to its target. */
const METEOR_FALL = 0.9;

/** Meteors leave from across the boss, not all from its centre. */
function meteorStart(geometry: DepthGeometry, meteor: BossMeteor): { x: number; y: number } {
  return { x: geometry.bossX + meteor.lane * geometry.bossSize * 0.6, y: geometry.bossY + geometry.bossSize * 0.05 };
}

/** Where a falling meteor is now; null before it launches. */
export function depthMeteorPoint(
  geometry: DepthGeometry,
  state: BossSkillState,
  meteor: BossMeteor,
): { x: number; y: number; s: number } | null {
  if (state.stage !== "release" || meteor.state !== "falling") return null;
  const u = Math.min(1, Math.max(0, (state.t - (meteor.landsAt - (state.voiceMeteorFlightSeconds ?? METEOR_FALL))) / (state.voiceMeteorFlightSeconds ?? METEOR_FALL)));
  if (u <= 0) return null;
  return depthFlight(u * u, meteorStart(geometry, meteor), depthMeteorTarget(geometry, meteor));
}

/**
 * Wind-up light behind the boss (drawn before the relief, so the boss itself
 * stays readable): a growing glow, orbiting sparks for the lance, speed
 * lines converging for the rush.
 */
export function drawBossCharge(
  context: CanvasRenderingContext2D,
  state: BossSkillState,
  geometry: DepthGeometry,
  colors: DepthColors,
  time: number,
  quality: VisualQuality,
): void {
  if (state.stage !== "telegraph" || state.kind === "volley") return;
  const progress = bossSkillProgress(state);
  const x = geometry.bossX;
  const y = geometry.bossY;
  const size = geometry.bossSize;
  const rich = quality === "high" || quality === "ultra";
  const color = state.kind === "tether" || state.kind === "quake" ? colors.accent : colors.primary;
  context.save();
  context.globalCompositeOperation = "lighter";
  drawGlow(context, color, x, y, size * (0.4 + progress * 0.45), 0.3 + progress * 0.5);
  if (state.kind === "lance") {
    const sparks = rich ? 10 : 6;
    const orbit = size * 0.5 * (1 - progress) + size * 0.12;
    for (let index = 0; index < sparks; index += 1) {
      const angle = (index / sparks) * Math.PI * 2 + time * 3;
      drawGlow(context, colors.accent, x + Math.cos(angle) * orbit, y + Math.sin(angle) * orbit * 0.8, 12 + progress * 10, 0.4 + progress * 0.6);
    }
  } else if (state.kind === "surge") {
    // Speed lines rushing into the boss: it is about to charge.
    context.strokeStyle = rgba(colors.accent, 0.4 * progress);
    context.lineWidth = 2;
    for (let index = 0; index < 14; index += 1) {
      const angle = (index / 14) * Math.PI * 2 + time * 0.6;
      const r1 = size * 0.42 + ((time * 400 + index * 37) % (size * 0.9));
      context.beginPath();
      context.moveTo(x + Math.cos(angle) * r1, y + Math.sin(angle) * r1 * 0.7);
      context.lineTo(x + Math.cos(angle) * (r1 + 40), y + Math.sin(angle) * (r1 + 40) * 0.7);
      context.stroke();
    }
  } else if (state.kind === "cataclysm") {
    drawGlow(context, "#ff6a3c", x, y, size * (0.6 + progress * 0.5), 0.25 + progress * 0.4);
  }
  context.restore();
}

/** Telegraph + release visuals for the active skill (drawn over the boss). */
export function drawBossSkill(
  context: CanvasRenderingContext2D,
  state: BossSkillState,
  geometry: DepthGeometry,
  colors: DepthColors,
  time: number,
  quality: VisualQuality,
): void {
  const progress = bossSkillProgress(state);
  const boss = { x: geometry.bossX, y: geometry.bossY };
  const ship = { x: geometry.shipX, y: geometry.shipY - 34 };
  const pulse = 0.5 + 0.5 * Math.sin(time * 16);
  const rich = quality === "high" || quality === "ultra";

  if (state.kind === "lance") {
    if (state.stage === "telegraph") {
      context.save();
      context.setLineDash([12, 10]);
      context.lineDashOffset = -time * 160;
      context.strokeStyle = rgba("#ff5d8f", 0.3 + pulse * 0.45);
      context.lineWidth = 2 + progress * 2;
      context.beginPath();
      context.moveTo(boss.x, boss.y);
      context.lineTo(ship.x, ship.y);
      context.stroke();
      context.restore();
    } else if (state.stage === "release") {
      const fade = 1 - progress;
      if (state.result === "countered") {
        const back = Math.min(1, progress * 3);
        beam(context, boss.x, boss.y, ship.x, ship.y, 30 * (1 - back), colors.primary, (1 - back) * 0.9);
        beam(context, ship.x, ship.y, boss.x, boss.y, 40 * fade + 6, "#6fe7ff", Math.min(1, back * 1.4) * fade + 0.2 * fade);
        context.save();
        context.globalCompositeOperation = "lighter";
        drawGlow(context, "#9ff4ff", ship.x, ship.y, 160 * fade + 40, fade);
        drawGlow(context, "#ffffff", boss.x, boss.y, geometry.bossSize * 0.5 * back * fade, back * fade * 0.55);
        context.restore();
      } else {
        beam(context, boss.x, boss.y, ship.x, ship.y, (44 + 10 * Math.sin(time * 60)) * fade + 8, colors.primary, fade);
        context.save();
        context.globalCompositeOperation = "lighter";
        drawGlow(context, colors.primary, boss.x, boss.y, geometry.bossSize * 0.45 * fade, fade * 0.45);
        drawGlow(context, "#ffd2e6", ship.x, ship.y, 220 * fade, fade);
        context.restore();
      }
    }
  }

  if (state.kind === "quake") {
    const lanes = [-1, 0, 1];
    const safe = state.safeLane - 1;
    const showLanes = state.stage === "telegraph" || (state.stage === "release" && progress < 0.9);
    if (showLanes) {
      for (const lane of lanes) {
        const isSafe = lane === safe;
        const nearX = depthLaneX(geometry, lane);
        const farX = boss.x + lane * geometry.bossSize * 0.12;
        const half = Math.min(150, geometry.width * 0.09);
        const alpha = state.stage === "telegraph" ? 0.26 + pulse * 0.2 : 0.14;
        const farY = boss.y + geometry.bossSize * 0.2;
        context.save();
        context.globalCompositeOperation = "lighter";
        const gradient = context.createLinearGradient(0, boss.y, 0, geometry.height);
        const color = isSafe ? "#5dffaa" : "#ff4646";
        gradient.addColorStop(0, rgba(color, 0));
        gradient.addColorStop(0.35, rgba(color, alpha * 0.6));
        gradient.addColorStop(1, rgba(color, alpha * (isSafe ? 0.9 : 1.3)));
        context.fillStyle = gradient;
        context.beginPath();
        context.moveTo(farX - 14, farY);
        context.lineTo(farX + 14, farY);
        context.lineTo(nearX + half, geometry.height);
        context.lineTo(nearX - half, geometry.height);
        context.closePath();
        context.fill();
        // Lane edges, so the lanes read on a busy background.
        const edge = context.createLinearGradient(0, farY, 0, geometry.height);
        edge.addColorStop(0, rgba(color, 0));
        edge.addColorStop(1, rgba(color, alpha * 1.8));
        context.strokeStyle = edge;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(farX - 14, farY);
        context.lineTo(nearX - half, geometry.height);
        context.moveTo(farX + 14, farY);
        context.lineTo(nearX + half, geometry.height);
        context.stroke();
        context.restore();
        if (isSafe && state.stage === "telegraph") {
          context.save();
          context.font = "800 15px " + DISPLAY;
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.shadowColor = "#20ff90";
          context.shadowBlur = 12;
          context.fillStyle = rgba("#b9ffd9", 0.75 + pulse * 0.25);
          context.fillText((lane < 0 ? "◀ " : "") + "SAFE" + (lane > 0 ? " ▶" : ""), nearX, geometry.shipY - 96);
          context.restore();
        }
      }
    }
    if (state.stage === "release") {
      for (const lane of lanes) {
        if (lane === safe) continue;
        for (let wave = 0; wave < 3; wave += 1) {
          const u = Math.min(1, Math.max(0, (progress - wave * 0.12) / 0.62));
          if (u <= 0 || u >= 1) continue;
          const p = depthFlight(u, { x: boss.x + lane * geometry.bossSize * 0.12, y: boss.y + geometry.bossSize * 0.2 }, { x: depthLaneX(geometry, lane), y: geometry.shipY + 10 });
          ellipseRing(context, p.x, p.y, 160 * p.s, 48 * p.s, 5 * p.s + 1, "#ffb066", 1 - u * 0.35);
          context.save();
          context.globalCompositeOperation = "lighter";
          drawGlow(context, "#ffc58a", p.x, p.y, 200 * p.s, 0.8 - u * 0.5);
          context.restore();
        }
      }
    }
  }

  if (state.kind === "surge") {
    if (state.stage === "telegraph") {
      // Red edge warning.
      const vignette = context.createRadialGradient(geometry.width / 2, geometry.height / 2, geometry.height * 0.3, geometry.width / 2, geometry.height / 2, geometry.height * 0.9);
      vignette.addColorStop(0, "rgba(255,40,60,0)");
      vignette.addColorStop(1, rgba("#ff283c", 0.22 * progress * (0.6 + pulse * 0.4)));
      context.fillStyle = vignette;
      context.fillRect(0, 0, geometry.width, geometry.height);
    } else if (state.stage === "release" && progress > 0.25 && progress < 0.75) {
      const k = (progress - 0.25) / 0.5;
      ellipseRing(context, ship.x, ship.y + 10, 80 + k * 260, 26 + k * 80, 6 * (1 - k) + 1, state.result === "countered" ? "#6fe7ff" : colors.primary, 1 - k);
    }
  }

  if (state.kind === "tether") {
    if (state.stage === "telegraph") {
      // The chain aims at the ship while the boss winds up.
      context.save();
      context.setLineDash([4, 12]);
      context.lineDashOffset = time * 90;
      context.strokeStyle = rgba(COUNTER_COLOR.break, 0.25 + pulse * 0.4);
      context.lineWidth = 1.5 + progress * 1.5;
      context.beginPath();
      context.moveTo(boss.x, boss.y);
      context.lineTo(ship.x, ship.y);
      context.stroke();
      context.restore();
    } else if (state.stage === "release" && state.result !== "countered") {
      drawChain(context, boss, ship, colors.accent, time, Math.min(1, state.t / 0.18), rich);
    } else if (state.stage === "recovery" && state.result === "countered") {
      // Broken: the links scatter for a moment.
      const k = progress;
      context.save();
      context.globalCompositeOperation = "lighter";
      const links = rich ? 14 : 8;
      for (let index = 0; index < links; index += 1) {
        const u = (index + 0.5) / links;
        const p = depthFlight(u, boss, ship);
        const spread = (index % 2 === 0 ? 1 : -1) * k * (30 + index * 4);
        drawGlow(context, COUNTER_COLOR.break, p.x + spread, p.y + k * 30 * u, 10 * p.s + 4, 1 - k);
      }
      context.restore();
    }
  }

  if (state.kind === "cataclysm") {
    for (const meteor of state.meteors) {
      const target = depthMeteorTarget(geometry, meteor);
      if (meteor.state === "falling") {
        const ringAlpha = state.stage === "telegraph" ? progress : 1;
        ellipseRing(context, target.x, target.y, 58, 20, 2, "#ff5050", ringAlpha * (0.45 + pulse * 0.4));
        if (state.stage === "release") {
          const u = Math.min(1, Math.max(0, (state.t - (meteor.landsAt - (state.voiceMeteorFlightSeconds ?? METEOR_FALL))) / (state.voiceMeteorFlightSeconds ?? METEOR_FALL)));
          if (u > 0) {
            const from = meteorStart(geometry, meteor);
            const p = depthFlight(u * u, from, target);
            const trail = depthFlight(Math.max(0, u * u - 0.12), from, target);
            beam(context, trail.x, trail.y, p.x, p.y, 18 * p.s + 4, "#ff7a3c", 0.9);
            drawGlyphOrb(context, p.x, p.y, meteor.char, 30 + 34 * p.s, "#ff9a5a", 1);
          }
        }
      } else if (meteor.state === "landed") {
        const since = state.stage === "release" ? state.t - meteor.landsAt : 0;
        if (since >= 0 && since < 0.5) {
          const k = since / 0.5;
          ellipseRing(context, target.x, target.y, 40 + k * 130, 14 + k * 44, 5 * (1 - k) + 1, "#ffb066", 1 - k);
          context.save();
          context.globalCompositeOperation = "lighter";
          drawGlow(context, "#ffc58a", target.x, target.y, 220 * (1 - k * 0.5), 1 - k);
          context.restore();
        }
      }
    }
  }
}

/** Counter prompt chip: verb, the word (typed letters lit) and a timer bar. */
export function drawCounterPrompt(
  context: CanvasRenderingContext2D,
  state: BossSkillState,
  x: number,
  y: number,
  time: number,
): void {
  if (state.word === null || !bossCounterOpen(state)) return;
  const color = COUNTER_COLOR[state.spec.counter];
  const word = state.word.toUpperCase();
  const remaining = 1 - bossSkillProgress(state);
  context.save();
  context.font = "800 26px " + MONO;
  const width = Math.max(150, context.measureText(word).width + 46);
  const height = 62;
  const left = x - width / 2;
  const top = y - height / 2;
  const urgent = remaining < 0.3 ? 0.5 + 0.5 * Math.sin(time * 26) : 0;
  context.shadowColor = color;
  context.shadowBlur = 16 + urgent * 12;
  context.fillStyle = "rgba(4, 10, 22, 0.92)";
  context.strokeStyle = rgba(color, 0.85);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(left + 12, top);
  context.lineTo(left + width, top);
  context.lineTo(left + width, top + height - 12);
  context.lineTo(left + width - 12, top + height);
  context.lineTo(left, top + height);
  context.lineTo(left, top + 12);
  context.closePath();
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  // Verb tab above.
  context.font = "800 12px " + DISPLAY;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const verb = bossCounterVerb(state.spec.counter) + " · TYPE";
  const verbWidth = context.measureText(verb).width + 18;
  context.fillStyle = color;
  context.fillRect(x - verbWidth / 2, top - 11, verbWidth, 18);
  context.fillStyle = "#04121c";
  context.fillText(verb, x, top - 2);
  // Letters.
  context.font = "800 26px " + MONO;
  const typed = word.slice(0, state.typed);
  const rest = word.slice(state.typed);
  const total = context.measureText(word).width;
  const startX = x - total / 2;
  context.textAlign = "left";
  context.fillStyle = color;
  context.fillText(typed, startX, y - 3);
  context.fillStyle = "#ffffff";
  context.fillText(rest, startX + context.measureText(typed).width, y - 3);
  // Timer bar.
  context.fillStyle = "rgba(255,255,255,0.12)";
  context.fillRect(left + 10, top + height - 9, width - 20, 4);
  context.fillStyle = remaining < 0.3 ? "#ff5d6c" : color;
  context.fillRect(left + 10, top + height - 9, (width - 20) * remaining, 4);
  context.restore();
}

/** Skill name and what to do, under the boss while it winds up. */
export function drawSkillCallout(
  context: CanvasRenderingContext2D,
  name: string,
  hint: string,
  x: number,
  y: number,
  color: string,
): void {
  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "800 italic 22px " + DISPLAY;
  context.shadowColor = color;
  context.shadowBlur = 18;
  context.fillStyle = "#ffffff";
  context.fillText(name.toUpperCase(), x, y);
  context.shadowBlur = 0;
  context.font = "700 13px " + DISPLAY;
  context.fillStyle = color;
  context.fillText(hint, x, y + 22);
  context.restore();
}

/**
 * Ultimate: a dark tint and cinematic bars, `k` 0 … 1 eases them in. Drawn
 * under the combat layer so words and meteors stay bright.
 */
export function drawUltimateFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  k: number,
): void {
  if (k <= 0.001) return;
  context.save();
  context.fillStyle = "rgba(10, 0, 20, " + String(0.32 * k) + ")";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#000";
  const bar = Math.round(Math.min(70, height * 0.08) * k);
  context.fillRect(0, 0, width, bar);
  context.fillRect(0, height - bar, width, bar);
  context.restore();
}

/** The ultimate's name sliding in across the middle (over everything). */
export function drawUltimateBanner(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  banner: string,
  k: number,
): void {
  if (k <= 0.01) return;
  context.save();
  context.globalAlpha = k;
  const y = height * 0.47;
  context.fillStyle = "rgba(255, 60, 60, 0.16)";
  context.fillRect(0, y - 34, width, 68);
  const size = Math.round(Math.min(40, width / Math.max(8, banner.length) * 1.5));
  context.font = "800 italic " + String(size) + "px " + DISPLAY;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = "#ff4d4d";
  context.shadowBlur = 22;
  context.fillStyle = "#ffd8cf";
  context.fillText(banner, width / 2 + (1 - k) * 100, y + 2);
  context.restore();
}

type Callout = { text: string; color: string; x: number; y: number; t: number };

/** Pop-up words over the ship: PARRY!, DODGE!, BRACED, FLAWLESS… */
export class BossCallouts {
  private readonly items: Callout[] = [];

  add(text: string, color: string, x: number, y: number): void {
    this.items.push({ text, color, x, y, t: 0 });
    if (this.items.length > 6) this.items.shift();
  }

  update(dt: number): void {
    for (const item of this.items) item.t += Math.max(0, dt);
    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      if (this.items[index]!.t > 1.2) this.items.splice(index, 1);
    }
  }

  clear(): void {
    this.items.length = 0;
  }

  draw(context: CanvasRenderingContext2D): void {
    if (this.items.length === 0) return;
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (const item of this.items) {
      const pop = item.t < 0.14 ? 0.6 + (item.t / 0.14) * 0.6 : 1.2 - Math.min(0.2, (item.t - 0.14) * 0.6);
      const alpha = item.t > 0.8 ? Math.max(0, 1 - (item.t - 0.8) / 0.4) : 1;
      context.globalAlpha = alpha;
      context.font = "800 italic " + String(Math.round(34 * pop)) + "px " + DISPLAY;
      context.shadowColor = item.color;
      context.shadowBlur = 24;
      context.fillStyle = "#ffffff";
      context.fillText(item.text, item.x, item.y - item.t * 40);
      context.shadowBlur = 0;
      context.strokeStyle = item.color;
      context.lineWidth = 1.2;
      context.strokeText(item.text, item.x, item.y - item.t * 40);
    }
    context.restore();
  }
}
