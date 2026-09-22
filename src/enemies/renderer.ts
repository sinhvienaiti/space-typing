import type { EnemyDefinition } from "./registry";
import { isReadableVisualProfile } from "./visuals";

export type EnemyVisualPalette = {
  bodyA: string;
  bodyB: string;
  outline: string;
  wing: string;
  aura: string;
  eye: string;
};

export type EnemyRenderInput = {
  radius: number;
  age: number;
  flash: number;
  targeted: boolean;
};

const PALETTES: Record<EnemyDefinition["family"], EnemyVisualPalette> = {
  rainbow: {
    bodyA: "#76f7ff",
    bodyB: "#ff7bd5",
    outline: "#fff2a6",
    wing: "rgba(226, 247, 255, 0.82)",
    aura: "rgba(111, 239, 255, 0.22)",
    eye: "#10213c",
  },
  angel: {
    bodyA: "#f8fbff",
    bodyB: "#7cecff",
    outline: "#ffe899",
    wing: "rgba(249, 253, 255, 0.92)",
    aura: "rgba(255, 238, 158, 0.24)",
    eye: "#18324c",
  },
  devil: {
    bodyA: "#ff5879",
    bodyB: "#9b4dff",
    outline: "#ff9adf",
    wing: "rgba(120, 49, 139, 0.88)",
    aura: "rgba(255, 76, 144, 0.22)",
    eye: "#fff0b8",
  },
  frost: {
    bodyA: "#dffcff",
    bodyB: "#58bfff",
    outline: "#c9f8ff",
    wing: "rgba(188, 245, 255, 0.88)",
    aura: "rgba(102, 218, 255, 0.22)",
    eye: "#17466b",
  },
  prism: {
    bodyA: "#fff29e",
    bodyB: "#91a4ff",
    outline: "#fff7dc",
    wing: "rgba(219, 207, 255, 0.88)",
    aura: "rgba(196, 126, 255, 0.22)",
    eye: "#242658",
  },
  nature: {
    bodyA: "#c9ff9a",
    bodyB: "#68d99b",
    outline: "#fff0a3",
    wing: "rgba(216, 255, 183, 0.88)",
    aura: "rgba(125, 235, 144, 0.2)",
    eye: "#244b36",
  },
  shadow: {
    bodyA: "#7356c9",
    bodyB: "#172347",
    outline: "#bda5ff",
    wing: "rgba(78, 66, 126, 0.86)",
    aura: "rgba(112, 80, 196, 0.22)",
    eye: "#eef1ff",
  },
  cosmic: {
    bodyA: "#4fd9ff",
    bodyB: "#6f49d9",
    outline: "#ffd9ff",
    wing: "rgba(111, 124, 231, 0.84)",
    aura: "rgba(104, 172, 255, 0.22)",
    eye: "#fff6db",
  },
};

export function enemyVisualPalette(
  family: EnemyDefinition["family"],
): EnemyVisualPalette {
  return PALETTES[family];
}

function drawAura(
  context: CanvasRenderingContext2D,
  radius: number,
  age: number,
  palette: EnemyVisualPalette,
): void {
  context.save();
  context.strokeStyle = palette.aura;
  context.lineWidth = 3;
  context.setLineDash([4, 7]);
  context.lineDashOffset = -age * 10;
  context.beginPath();
  context.arc(
    0,
    0,
    radius * (1.34 + Math.sin(age * 2.4) * 0.04),
    0,
    Math.PI * 2,
  );
  context.stroke();
  context.restore();
}


function drawOrbit(
  context: CanvasRenderingContext2D,
  definition: EnemyDefinition,
  radius: number,
  age: number,
  palette: EnemyVisualPalette,
): void {
  if (definition.visual.orbit === undefined) return;

  context.save();
  context.strokeStyle = palette.outline;
  context.fillStyle = palette.outline;
  context.lineWidth = 1.2;
  context.globalAlpha = 0.58;
  context.rotate(age * 0.34);
  context.beginPath();
  context.ellipse(0, 0, radius * 1.42, radius * 0.52, 0.2, 0, Math.PI * 2);
  context.stroke();

  for (let index = 0; index < 3; index += 1) {
    const angle = (Math.PI * 2 * index) / 3 + age * 0.7;
    context.beginPath();
    context.arc(
      Math.cos(angle) * radius * 1.42,
      Math.sin(angle) * radius * 0.52,
      Math.max(1.8, radius * 0.06),
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.restore();
}

function drawWing(
  context: CanvasRenderingContext2D,
  x: number,
  direction: -1 | 1,
  radius: number,
  age: number,
  wingId: string,
  palette: EnemyVisualPalette,
): void {
  const flap = Math.sin(age * 7.4 + direction) * radius * 0.08;
  const longWing =
    wingId.includes("large") || wingId.includes("four");
  const width = radius * (longWing ? 1.18 : 0.88);
  const height = radius * (longWing ? 0.68 : 0.52);

  context.save();
  context.translate(x, flap * 0.28);
  context.scale(direction, 1);
  context.fillStyle = palette.wing;
  context.strokeStyle = palette.outline;
  context.lineWidth = 1.2;

  context.beginPath();
  if (wingId.includes("bat")) {
    context.moveTo(0, 0);
    context.quadraticCurveTo(width * 0.55, -height, width, -height * 0.35);
    context.lineTo(width * 0.68, height * 0.12);
    context.lineTo(width * 0.92, height * 0.56);
    context.quadraticCurveTo(width * 0.38, height * 0.34, 0, 0);
  } else if (wingId.includes("crystal")) {
    context.moveTo(0, 0);
    context.lineTo(width * 0.72, -height);
    context.lineTo(width, -height * 0.1);
    context.lineTo(width * 0.6, height * 0.62);
    context.closePath();
  } else {
    context.moveTo(0, 0);
    context.quadraticCurveTo(width * 0.5, -height, width, -height * 0.24);
    context.quadraticCurveTo(width * 0.78, height * 0.56, 0, 0);
  }

  context.fill();
  context.stroke();
  context.restore();
}

function drawWings(
  context: CanvasRenderingContext2D,
  definition: EnemyDefinition,
  radius: number,
  age: number,
  palette: EnemyVisualPalette,
): void {
  const x = radius * 0.68;
  drawWing(context, -x, -1, radius, age, definition.visual.wings, palette);
  drawWing(context, x, 1, radius, age, definition.visual.wings, palette);

  if (definition.visual.wings.includes("four")) {
    context.save();
    context.scale(0.78, 0.78);
    context.translate(0, radius * 0.42);
    drawWing(context, -x, -1, radius, age + 0.2, definition.visual.wings, palette);
    drawWing(context, x, 1, radius, age + 0.2, definition.visual.wings, palette);
    context.restore();
  }
}

function drawBody(
  context: CanvasRenderingContext2D,
  radius: number,
  palette: EnemyVisualPalette,
  flash: number,
  targeted: boolean,
): void {
  const gradient = context.createRadialGradient(
    -radius * 0.34,
    -radius * 0.42,
    radius * 0.08,
    0,
    0,
    radius,
  );
  gradient.addColorStop(0, flash > 0 ? "#ffffff" : palette.bodyA);
  gradient.addColorStop(0.68, palette.bodyB);
  gradient.addColorStop(1, "rgba(14, 28, 55, 0.9)");

  context.fillStyle = gradient;
  context.strokeStyle = targeted ? "#8ff8ff" : palette.outline;
  context.lineWidth = targeted ? 2.8 : 1.7;
  context.shadowBlur = targeted ? 22 : 14;
  context.shadowColor = targeted ? "#74f2ff" : palette.outline;

  context.beginPath();
  context.ellipse(0, 0, radius, radius * 0.9, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.save();
  context.globalAlpha = 0.5;
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.ellipse(
    -radius * 0.3,
    -radius * 0.38,
    radius * 0.24,
    radius * 0.12,
    -0.4,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
}

function drawFace(
  context: CanvasRenderingContext2D,
  radius: number,
  palette: EnemyVisualPalette,
): void {
  context.save();
  context.fillStyle = palette.eye;
  const eyeY = radius * 0.12;
  for (const eyeX of [-radius * 0.24, radius * 0.24]) {
    context.beginPath();
    context.arc(eyeX, eyeY, Math.max(1.8, radius * 0.075), 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawHead(
  context: CanvasRenderingContext2D,
  definition: EnemyDefinition,
  radius: number,
  age: number,
  palette: EnemyVisualPalette,
): void {
  const head = definition.visual.head;
  if (head === undefined) return;

  if (head.includes("halo")) {
    const count = head.includes("triple") ? 3 : head.includes("double") ? 2 : 1;
    context.save();
    context.strokeStyle = palette.outline;
    context.lineWidth = 1.5;
    context.shadowBlur = 10;
    context.shadowColor = palette.outline;
    for (let index = 0; index < count; index += 1) {
      context.beginPath();
      context.ellipse(
        0,
        -radius * (1.08 + index * 0.16),
        radius * (0.5 + index * 0.09),
        radius * 0.13,
        Math.sin(age * 0.9 + index) * 0.08,
        0,
        Math.PI * 2,
      );
      context.stroke();
    }
    context.restore();
    return;
  }

  if (head.includes("prism") || head.includes("void-eye")) {
    context.save();
    context.strokeStyle = palette.outline;
    context.lineWidth = 1.7;
    context.shadowBlur = 8;
    context.shadowColor = palette.outline;
    context.rotate(Math.sin(age * 0.8) * 0.08);
    context.beginPath();
    context.ellipse(
      0,
      -radius * 0.92,
      radius * 0.46,
      radius * 0.18,
      0,
      0,
      Math.PI * 2,
    );
    context.stroke();
    context.restore();
    return;
  }

  if (head.includes("ice")) {
    context.save();
    context.fillStyle = palette.outline;
    for (const x of [-0.34, 0, 0.34]) {
      context.beginPath();
      context.moveTo(radius * x - radius * 0.13, -radius * 0.68);
      context.lineTo(radius * x, -radius * 1.28);
      context.lineTo(radius * x + radius * 0.13, -radius * 0.68);
      context.closePath();
      context.fill();
    }
    context.restore();
    return;
  }

  if (
    head.includes("leaf") ||
    head.includes("flower") ||
    head.includes("star")
  ) {
    context.save();
    context.fillStyle = palette.outline;
    const count = head.includes("flower") ? 5 : 3;
    for (let index = 0; index < count; index += 1) {
      const angle =
        -Math.PI / 2 +
        (index - (count - 1) / 2) * 0.34 +
        Math.sin(age * 1.4) * 0.02;
      context.beginPath();
      context.ellipse(
        Math.cos(angle) * radius * 0.42,
        -radius * 0.78 + Math.sin(angle) * radius * 0.24,
        radius * 0.13,
        radius * 0.25,
        angle,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
    context.restore();
    return;
  }

  if (head.includes("horn") || head.includes("crown")) {
    context.save();
    context.fillStyle = palette.outline;
    const hornScale = head.includes("large") || head.includes("crown") ? 0.5 : 0.34;
    for (const direction of [-1, 1] as const) {
      context.beginPath();
      context.moveTo(direction * radius * 0.38, -radius * 0.64);
      context.quadraticCurveTo(
        direction * radius * 0.7,
        -radius * 0.95,
        direction * radius * hornScale,
        -radius * 1.25,
      );
      context.lineTo(direction * radius * 0.16, -radius * 0.72);
      context.closePath();
      context.fill();
    }
    context.restore();
  }
}

function rewardGlyph(marker: string): string {
  if (marker === "heart") return "♥";
  if (marker === "shield" || marker === "shield-star") return "◆";
  if (marker === "snowflake") return "❄";
  if (marker === "sword") return "↑";
  if (marker === "burst" || marker === "nova") return "✹";
  if (marker.includes("x2")) return "×2";
  if (marker.includes("clock")) return "◷";
  if (marker === "energy" || marker === "power" || marker === "lightning") {
    return "ϟ";
  }
  if (marker === "luck-star") return "★";
  return "•";
}

function drawRewardMarker(
  context: CanvasRenderingContext2D,
  marker: string,
  radius: number,
  palette: EnemyVisualPalette,
): void {
  const x = radius * 0.9;
  const y = -radius * 0.72;
  const size = Math.max(8, radius * 0.3);

  context.save();
  context.globalCompositeOperation = "source-over";
  context.fillStyle = "rgba(3, 10, 22, 0.92)";
  context.strokeStyle = palette.outline;
  context.lineWidth = 1.4;
  context.beginPath();
  context.arc(x, y, size, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#ffffff";
  context.font =
    "800 " + String(Math.max(9, Math.round(size * 1.15))) +
    "px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(rewardGlyph(marker), x, y + 0.5);
  context.restore();
}

export function drawModularEnemy(
  context: CanvasRenderingContext2D,
  definition: EnemyDefinition,
  input: EnemyRenderInput,
): boolean {
  if (!isReadableVisualProfile(definition.visual)) return false;

  const radius = Math.max(8, input.radius);
  const palette = enemyVisualPalette(definition.family);

  context.save();
  context.globalCompositeOperation = "lighter";
  drawAura(context, radius, input.age, palette);
  drawOrbit(context, definition, radius, input.age, palette);
  drawWings(context, definition, radius, input.age, palette);
  drawBody(
    context,
    radius,
    palette,
    input.flash,
    input.targeted,
  );
  drawFace(context, radius, palette);
  drawHead(context, definition, radius, input.age, palette);
  context.restore();

  if (definition.visual.rewardMarker !== undefined) {
    drawRewardMarker(
      context,
      definition.visual.rewardMarker,
      radius,
      palette,
    );
  }

  return true;
}
