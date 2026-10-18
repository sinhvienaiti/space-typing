import { buildModelSheet, type ModelSheet } from "../render3d/model-sheet";
import type { VisualQuality } from "../types";

/**
 * 3D turntable icons for equipment and shop items. When an item model is
 * prepared (models/items/<id>), its icon becomes a lit 3D render that turns
 * while the pointer is over the card; otherwise the painted icon stays.
 * The model is rendered once into 24 frames (src/render3d/model-sheet.ts),
 * so a shelf of turning items costs no WebGL work per frame.
 */
const sheets = new Map<string, Promise<ModelSheet | null>>();

function sheetFor(id: string, quality: VisualQuality): Promise<ModelSheet | null> {
  const key = id + "@" + quality;
  let found = sheets.get(key);
  if (found === undefined) {
    found = buildModelSheet("items", [id], quality, {
      primary: "#5fe3ff",
      accent: "#a07bff",
      frames: 24,
      tilt: 0.75,
      spin: true,
    });
    sheets.set(key, found);
  }
  return found;
}

export function attachModelTurntable(element: HTMLElement, id: string, quality: VisualQuality): void {
  if (quality === "low") return;
  void sheetFor(id, quality).then((sheet) => {
    if (sheet === null || !element.isConnected) return;
    const first = sheet.frames[0]!;
    const canvas = document.createElement("canvas");
    canvas.width = first.width;
    canvas.height = first.height;
    canvas.className = "model-icon";
    canvas.setAttribute("aria-hidden", "true");
    const context = canvas.getContext("2d");
    if (context === null) return;
    let index = 0;
    const paint = (): void => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(sheet.frames[index]!, 0, 0);
    };
    paint();
    element.replaceChildren(canvas);
    element.classList.add("has-model-icon");
    const host = element.closest("article, button, .visual-card") ?? element;
    let raf = 0;
    let last = 0;
    const spin = (now: number): void => {
      if (now - last > 1000 / 18) {
        index = (index + 1) % sheet.frames.length;
        paint();
        last = now;
      }
      raf = requestAnimationFrame(spin);
    };
    host.addEventListener("pointerenter", () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(spin);
    });
    host.addEventListener("pointerleave", () => cancelAnimationFrame(raf));
  });
}
