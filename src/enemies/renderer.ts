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
  glowScale?: number;
  fillBody?: boolean;
  drawFace?: boolean;
  bodyOutlineAlpha?: number;
  bodyOutlineGlowScale?: number;
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
  definition: EnemyDefinition,
  radius: number,
  age: number,
  palette: EnemyVisualPalette,
  glowScale: number,
): void {
  const aura = definition.visual.aura ?? "";
  const pulse = 1.34 + Math.sin(age * 2.4) * 0.04;

  context.save();
  context.strokeStyle = palette.aura;
  context.fillStyle = palette.outline;
  context.lineWidth = 2 + glowScale;
  context.shadowBlur = 8 * glowScale;
  context.shadowColor = palette.outline;

  if (aura.includes("shell")) {
    for (const scale of [1.22, 1.42]) {
      context.globalAlpha = scale > 1.3 ? 0.42 : 0.7;
      context.beginPath();
      context.arc(0, 0, radius * scale, 0, Math.PI * 2);
      context.stroke();
    }
  } else if (aura.includes("flame")) {
    context.setLineDash([3, 5]);
    context.lineDashOffset = -age * 18;
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8 + age * 0.35;
      const inner = radius * 1.14;
      const outer = radius * (1.38 + (index % 2) * 0.1);
      context.beginPath();
      context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      context.stroke();
    }
  } else {
    context.setLineDash(
      aura.includes("mist") || aura.includes("smoke") ? [9, 8] : [4, 7],
    );
    context.lineDashOffset = -age * (aura.includes("elite") ? 16 : 10);
    context.beginPath();
    context.arc(0, 0, radius * pulse, 0, Math.PI * 2);
    context.stroke();
  }

  if (glowScale >= 0.6 && (
    aura.includes("sparkle") ||
    aura.includes("stars") ||
    aura.includes("pollen")
  )) {
    const count = aura.includes("boss") || aura.includes("elite") ? 6 : 4;
    context.setLineDash([]);
    context.globalAlpha = 0.68;
    for (let index = 0; index < count; index += 1) {
      const angle = age * (0.4 + index * 0.03) + (Math.PI * 2 * index) / count;
      const distance = radius * (1.3 + (index % 2) * 0.12);
      context.beginPath();
      context.arc(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        Math.max(1.2, radius * 0.035),
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }

  context.restore();
}

function drawOrbit(
  context: CanvasRenderingContext2D,
  definition: EnemyDefinition,
  radius: number,
  age: number,
  palette: EnemyVisualPalette,
): void {
  const orbit = definition.visual.orbit;
  if (orbit === undefined) return;

  context.save();
  context.strokeStyle = palette.outline;
  context.fillStyle = palette.outline;
  context.lineWidth = 1.2;
  context.globalAlpha = 0.62;
  context.rotate(age * 0.28);

  if (orbit.includes("void")) {
    context.beginPath();
    context.ellipse(0, 0, radius * 1.5, radius * 0.58, 0, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(radius * 1.48, 0, Math.max(2, radius * 0.075), 0, Math.PI * 2);
    context.fill();
  } else {
    const rings =
      orbit.includes("rune") || orbit.includes("cosmic") ? 2 : 1;
    for (let index = 0; index < rings; index += 1) {
      context.save();
      context.rotate(index * 0.75);
      context.beginPath();
      context.ellipse(
        0,
        0,
        radius * (1.38 + index * 0.12),
        radius * (0.48 + index * 0.08),
        0.18,
        0,
        Math.PI * 2,
      );
      context.stroke();
      context.restore();
    }

    const points =
      orbit.includes("rainbow") ? 5 :
        orbit.includes("cosmic") ? 4 :
          orbit.includes("prism") ? 4 : 3;
    for (let index = 0; index < points; index += 1) {
      const angle = (Math.PI * 2 * index) / points + age * 0.72;
      const x = Math.cos(angle) * radius * 1.4;
      const y = Math.sin(angle) * radius * 0.52;
      const size = Math.max(1.7, radius * 0.055);
      if (orbit.includes("prism")) {
        context.save();
        context.translate(x, y);
        context.rotate(angle);
        context.fillRect(-size, -size, size * 2, size * 2);
        context.restore();
      } else {
        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
      }
    }
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
  const longWing = wingId.includes("large") || wingId.includes("four");
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
  } else if (wingId.includes("shadow")) {
    context.moveTo(0, 0);
    context.lineTo(width * 0.48, -height * 0.75);
    context.lineTo(width * 0.72, -height * 0.16);
    context.lineTo(width, -height * 0.38);
    context.lineTo(width * 0.78, height * 0.58);
    context.lineTo(width * 0.36, height * 0.22);
    context.closePath();
  } else if (wingId.includes("cosmic")) {
    context.moveTo(0, 0);
    context.quadraticCurveTo(width * 0.42, -height, width, -height * 0.5);
    context.quadraticCurveTo(width * 0.86, 0, width * 0.58, height * 0.62);
    context.quadraticCurveTo(width * 0.22, height * 0.22, 0, 0);
  } else if (wingId.includes("petal")) {
    context.moveTo(0, 0);
    context.bezierCurveTo(
      width * 0.34, -height,
      width * 0.95, -height * 0.78,
      width, -height * 0.08,
    );
    context.bezierCurveTo(
      width * 0.78, height * 0.5,
      width * 0.34, height * 0.48,
      0, 0,
    );
  } else if (wingId.includes("fairy")) {
    context.moveTo(0, 0);
    context.quadraticCurveTo(width * 0.3, -height * 1.2, width, -height * 0.52);
    context.quadraticCurveTo(width * 0.7, -height * 0.02, width * 0.88, height * 0.56);
    context.quadraticCurveTo(width * 0.3, height * 0.48, 0, 0);
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

function bodyPath(
  context: CanvasRenderingContext2D,
  definition: EnemyDefinition,
  radius: number,
): void {
  const body = definition.visual.body;
  context.beginPath();

  if (body.includes("prism")) {
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8 - Math.PI / 2;
      const scale = index % 2 === 0 ? 1 : 0.82;
      const x = Math.cos(angle) * radius * scale;
      const y = Math.sin(angle) * radius * 0.92 * scale;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    return;
  }

  if (body.includes("shadow")) {
    context.moveTo(0, -radius);
    context.bezierCurveTo(
      radius * 0.95, -radius * 0.6,
      radius * 0.86, radius * 0.62,
      radius * 0.18, radius * 0.84,
    );
    context.quadraticCurveTo(0, radius * 1.2, -radius * 0.18, radius * 0.84);
    context.bezierCurveTo(
      -radius * 0.86, radius * 0.62,
      -radius * 0.95, -radius * 0.6,
      0, -radius,
    );
    context.closePath();
    return;
  }

  if (body.includes("nature")) {
    const lobes = 8;
    for (let index = 0; index < lobes; index += 1) {
      const angle = (Math.PI * 2 * index) / lobes;
      const x = Math.cos(angle) * radius * 0.22;
      const y = Math.sin(angle) * radius * 0.2;
      context.moveTo(x + radius * 0.78, y);
      context.arc(x, y, radius * 0.78, 0, Math.PI * 2);
    }
    return;
  }

  context.ellipse(0, 0, radius, radius * 0.9, 0, 0, Math.PI * 2);
}

function drawBody(
  context: CanvasRenderingContext2D,
  definition: EnemyDefinition,
  radius: number,
  palette: EnemyVisualPalette,
  flash: number,
  targeted: boolean,
  glowScale: number,
  fillBody = true,
  outlineAlpha = 1,
  outlineGlowScale = 1,
): void {
  const body = definition.visual.body;
  context.save();
  context.fillStyle = flash > 0 ? "#ffffff" : palette.bodyB;
  context.strokeStyle = targeted ? "#8ff8ff" : palette.outline;
  context.lineWidth = targeted ? 2.8 : 1.7;
  context.shadowBlur =
    (targeted ? 18 : 10) * glowScale * outlineGlowScale;
  context.shadowColor = targeted ? "#74f2ff" : palette.outline;

  bodyPath(context, definition, radius);
  if (fillBody) context.fill();
  context.globalAlpha = Math.max(0, Math.min(1, outlineAlpha));
  context.stroke();
  context.globalAlpha = 1;

  if (!fillBody) {
    context.restore();
    return;
  }

  context.globalAlpha = 0.4;
  context.fillStyle = palette.bodyA;
  context.beginPath();
  context.ellipse(
    -radius * 0.2,
    -radius * 0.18,
    radius * 0.62,
    radius * 0.5,
    -0.35,
    0,
    Math.PI * 2,
  );
  context.fill();

  context.globalAlpha = 0.58;
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.ellipse(
    -radius * 0.32,
    -radius * 0.4,
    radius * 0.22,
    radius * 0.1,
    -0.4,
    0,
    Math.PI * 2,
  );
  context.fill();

  if (body.includes("frost") || body.includes("prism")) {
    context.globalAlpha = 0.38;
    context.strokeStyle = palette.bodyA;
    context.lineWidth = 1;
    for (const offset of [-0.42, 0.1, 0.48]) {
      context.beginPath();
      context.moveTo(radius * offset, -radius * 0.58);
      context.lineTo(radius * (offset * 0.55), radius * 0.6);
      context.stroke();
    }
  }

  if (body.includes("cosmic")) {
    context.globalAlpha = 0.78;
    context.fillStyle = "#ffffff";
    for (const [x, y, size] of [
      [-0.42, -0.12, 0.045],
      [0.28, -0.4, 0.035],
      [0.46, 0.18, 0.04],
      [-0.12, 0.44, 0.03],
    ] as const) {
      context.beginPath();
      context.arc(radius * x, radius * y, Math.max(1, radius * size), 0, Math.PI * 2);
      context.fill();
    }
  }

  if (body.includes("boss")) {
    context.globalAlpha = 0.55;
    context.strokeStyle = palette.outline;
    context.lineWidth = 1.3;
    context.beginPath();
    context.arc(0, 0, radius * 0.64, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

function drawFace(
  context: CanvasRenderingContext2D,
  definition: EnemyDefinition,
  radius: number,
  palette: EnemyVisualPalette,
  glowScale: number,
): void {
  const face = definition.visual.face;
  const eyeY = radius * 0.12;
  context.save();
  context.fillStyle = palette.eye;
  context.strokeStyle = palette.eye;
  context.lineWidth = Math.max(1.6, radius * 0.06);

  if (face === "cute-fierce") {
    for (const direction of [-1, 1] as const) {
      context.beginPath();
      context.moveTo(direction * radius * 0.36, eyeY - radius * 0.08);
      context.lineTo(direction * radius * 0.14, eyeY + radius * 0.04);
      context.stroke();
    }
  } else if (face === "star-eyes") {
    context.shadowBlur = 8 * glowScale;
    context.shadowColor = palette.eye;
    for (const eyeX of [-radius * 0.24, radius * 0.24]) {
      context.save();
      context.translate(eyeX, eyeY);
      context.rotate(Math.PI / 4);
      const size = Math.max(2, radius * 0.08);
      context.fillRect(-size, -size, size * 2, size * 2);
      context.restore();
    }
  } else {
    if (face === "bright-eyes") {
      context.shadowBlur = 10 * glowScale;
      context.shadowColor = palette.eye;
    }
    for (const eyeX of [-radius * 0.24, radius * 0.24]) {
      context.beginPath();
      context.ellipse(
        eyeX,
        eyeY,
        Math.max(1.8, radius * 0.075),
        face === "bright-eyes" ? Math.max(3, radius * 0.12) : Math.max(1.8, radius * 0.075),
        0,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }
  context.restore();
}

function drawSide(
  context: CanvasRenderingContext2D,
  definition: EnemyDefinition,
  radius: number,
  age: number,
  palette: EnemyVisualPalette,
): void {
  if (definition.visual.side !== "ember-tail") return;

  context.save();
  context.strokeStyle = palette.outline;
  context.lineWidth = Math.max(2, radius * 0.08);
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(radius * 0.7, radius * 0.28);
  context.quadraticCurveTo(
    radius * 1.45,
    radius * (0.38 + Math.sin(age * 5) * 0.08),
    radius * 1.18,
    radius * 0.92,
  );
  context.stroke();
  context.fillStyle = palette.bodyA;
  context.beginPath();
  context.arc(radius * 1.18, radius * 0.92, Math.max(2, radius * 0.12), 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawHead(
  context: CanvasRenderingContext2D,
  definition: EnemyDefinition,
  radius: number,
  age: number,
  palette: EnemyVisualPalette,
  glowScale: number,
): void {
  const head = definition.visual.head;
  if (head === undefined) return;

  if (head.includes("halo")) {
    const count = head.includes("triple") ? 3 : head.includes("double") ? 2 : 1;
    context.save();
    context.strokeStyle = palette.outline;
    context.lineWidth = 1.5;
    context.shadowBlur = 8 * glowScale;
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

  if (head.includes("void-eye")) {
    context.save();
    context.strokeStyle = palette.outline;
    context.fillStyle = palette.eye;
    context.lineWidth = 1.7;
    context.shadowBlur = 7 * glowScale;
    context.shadowColor = palette.outline;
    context.beginPath();
    context.ellipse(0, -radius * 0.94, radius * 0.5, radius * 0.2, 0, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(0, -radius * 0.94, Math.max(2, radius * 0.08), 0, Math.PI * 2);
    context.fill();
    context.restore();
    return;
  }

  if (head.includes("prism-ring")) {
    context.save();
    context.strokeStyle = palette.outline;
    context.lineWidth = 1.7;
    context.rotate(Math.sin(age * 0.8) * 0.08);
    context.beginPath();
    context.ellipse(0, -radius * 0.92, radius * 0.46, radius * 0.18, 0, 0, Math.PI * 2);
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

  if (head.includes("prism-crown")) {
    context.save();
    context.fillStyle = palette.outline;
    for (const x of [-0.35, 0, 0.35]) {
      context.beginPath();
      context.moveTo(radius * x - radius * 0.13, -radius * 0.7);
      context.lineTo(radius * x, -radius * 1.25);
      context.lineTo(radius * x + radius * 0.13, -radius * 0.7);
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
    const count = head.includes("flower") ? 5 : head.includes("star") ? 5 : 3;
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

export function rewardGlyph(marker: string): string {
  if (marker === "heart") return "♥";
  if (marker === "shield") return "◆";
  if (marker === "shield-star") return "✦";
  if (marker === "snowflake") return "❄";
  if (marker === "sword") return "↑";
  if (marker === "burst") return "✹";
  if (marker === "nova") return "◎";
  if (marker === "star-x2") return "★2";
  if (marker === "coin-x2") return "C2";
  if (marker === "clock") return "◷";
  if (marker === "clock-bolt") return "↻";
  if (marker === "energy") return "E";
  if (marker === "power") return "P";
  if (marker === "lightning") return "ϟ";
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
  context.fillStyle = "rgba(3, 10, 22, 0.94)";
  context.strokeStyle = palette.outline;
  context.lineWidth = 1.4;
  context.beginPath();
  context.arc(x, y, size, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#ffffff";
  context.font =
    "800 " + String(Math.max(8, Math.round(size * 0.95))) +
    "px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(rewardGlyph(marker), x, y + 0.5);
  context.restore();
}


/** Cache only the detailed glossy body and face; animate wings, aura, head,
 * telegraphs and text at full frame rate. This removes repeat shadow-blur
 * operations per enemy without making moving enemies look frame-stepped.
 * Entries are capped to bound Canvas memory across long Campaign sessions. */
export class StaticEnemyBodyCache {
  private readonly entries = new Map<
    string,
    { canvas: HTMLCanvasElement; padding: number; lastUsed: number }
  >();
  private accessTick = 0;

  constructor(private readonly limit = 54) {}

  clear(): void {
    this.entries.clear();
    this.accessTick = 0;
  }
  get size(): number { return this.entries.size; }

  draw(
    context: CanvasRenderingContext2D,
    definition: EnemyDefinition,
    radius: number,
    palette: EnemyVisualPalette,
    glowScale: number,
    targeted: boolean,
    deviceScale = 1,
  ): boolean {
    if (typeof document === "undefined") return false;
    const roundedRadius = Math.round(radius * 2) / 2;
    const roundedGlow = Math.round(glowScale * 10) / 10;
    const scale = Math.max(1, Math.min(2, Math.ceil(deviceScale * 4) / 4));
    const key = definition.id + ":" + roundedRadius + ":" + roundedGlow +
      ":" + targeted + ":" + scale;
    let entry = this.entries.get(key);
    if (entry === undefined) {
      const padding = Math.ceil(roundedRadius * 1.5 + 26);
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(padding * 2 * scale);
      canvas.height = Math.ceil(padding * 2 * scale);
      const offscreen = canvas.getContext("2d");
      if (offscreen === null) return false;
      offscreen.setTransform(scale, 0, 0, scale, 0, 0);
      offscreen.translate(padding, padding);
      drawBody(offscreen, definition, roundedRadius, palette, 0, targeted, roundedGlow);
      drawFace(offscreen, definition, roundedRadius, palette, roundedGlow);
      entry = { canvas, padding, lastUsed: ++this.accessTick };
      if (this.entries.size >= this.limit) {
        let oldestKey: string | null = null;
        let oldestTick = Number.POSITIVE_INFINITY;
        for (const [candidateKey, candidate] of this.entries) {
          if (candidate.lastUsed < oldestTick) {
            oldestKey = candidateKey;
            oldestTick = candidate.lastUsed;
          }
        }
        if (oldestKey !== null) this.entries.delete(oldestKey);
      }
      this.entries.set(key, entry);
    } else {
      // Keep real LRU semantics without delete+set Map mutations for every
      // enemy on every frame. Eviction scans only when a new cache entry is
      // created, which is rare compared with draw hits.
      entry.lastUsed = ++this.accessTick;
    }
    context.save();
    context.shadowBlur = 0;
    context.drawImage(entry.canvas, -entry.padding, -entry.padding,
      entry.padding * 2, entry.padding * 2);
    context.restore();
    return true;
  }
}

export function drawModularEnemy(
  context: CanvasRenderingContext2D,
  definition: EnemyDefinition,
  input: EnemyRenderInput,
  staticBodyCache?: StaticEnemyBodyCache,
  renderDpr = 1,
): boolean {
  if (!isReadableVisualProfile(definition.visual)) return false;

  const radius = Math.max(8, input.radius);
  const palette = enemyVisualPalette(definition.family);
  const glowScale = Math.max(0, input.glowScale ?? 1);

  context.save();
  context.globalCompositeOperation = "lighter";
  drawAura(context, definition, radius, input.age, palette, glowScale);
  drawOrbit(context, definition, radius, input.age, palette);
  context.restore();

  context.save();
  context.globalCompositeOperation = "source-over";
  drawSide(context, definition, radius, input.age, palette);
  drawWings(context, definition, radius, input.age, palette);
  const usesDefaultStaticBody =
    input.fillBody !== false && input.drawFace !== false;
  const cached = usesDefaultStaticBody &&
    input.flash <= 0.03 &&
    staticBodyCache?.draw(
      context, definition, radius, palette, glowScale, input.targeted, renderDpr,
    ) === true;
  if (!cached) {
    drawBody(
      context,
      definition,
      radius,
      palette,
      input.flash,
      input.targeted,
      glowScale,
      input.fillBody !== false,
      input.bodyOutlineAlpha ?? 1,
      input.bodyOutlineGlowScale ?? 1,
    );
    if (input.drawFace !== false) {
      drawFace(context, definition, radius, palette, glowScale);
    }
  }
  drawHead(context, definition, radius, input.age, palette, glowScale);
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
