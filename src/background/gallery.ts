/**
 * Dev-only background gallery (bg-gallery.html). Renders BGV compositions with
 * the production BackgroundStage so art and tuning can be reviewed without
 * playing: `/bg-gallery.html?world=world-01&q=high&grid=1&labels=1`.
 */
import { BACKGROUND_COMPOSITIONS } from "./compositions";
import { BackgroundStage } from "./stage";
import type { BackgroundTier } from "./types";

type Cell = {
  stage: BackgroundStage;
  overlay: HTMLCanvasElement;
  element: HTMLElement;
};

const params = new URLSearchParams(window.location.search);
const grid = document.getElementById("grid") as HTMLDivElement;
const worldSelect = document.getElementById("world") as HTMLSelectElement;
const qualitySelect = document.getElementById("quality") as HTMLSelectElement;
const timeScaleInput = document.getElementById("timeScale") as HTMLInputElement;
const gridToggle = document.getElementById("gridToggle") as HTMLInputElement;
const labelsToggle = document.getElementById("labels") as HTMLInputElement;
const stats = document.getElementById("stats") as HTMLDivElement;
const panel = document.getElementById("panel") as HTMLDivElement;

for (const composition of BACKGROUND_COMPOSITIONS) {
  const option = document.createElement("option");
  option.value = composition.worldId;
  option.textContent = composition.worldId;
  worldSelect.append(option);
}
worldSelect.value = params.get("world") ?? BACKGROUND_COMPOSITIONS[0]?.worldId ?? "world-01";
qualitySelect.value = params.get("q") ?? "high";
timeScaleInput.value = params.get("t") ?? "1";
gridToggle.checked = params.get("grid") === "1";
labelsToggle.checked = params.get("labels") === "1";
if (params.get("panel") === "0") panel.classList.add("hidden");

let cells: Cell[] = [];

const MOCK_WORDS = ["shield", "laser", "orbit", "nebula", "comet", "stellar", "gravity"];

/** Draws word plates like the game's enemy labels, to judge readability. */
function drawMockLabels(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext("2d");
  if (context === null) return;
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  if (!labelsToggle.checked) return;
  const scale = Math.max(0.5, height / 900);
  context.font = "800 " + Math.round(20 * scale) + "px ui-monospace, Menlo, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  MOCK_WORDS.forEach((word, index) => {
    const x = width * (0.1 + ((index * 0.37) % 0.8));
    const y = height * (0.18 + ((index * 0.23) % 0.5));
    const textWidth = context.measureText(word).width;
    context.fillStyle = "rgba(4, 10, 20, 0.82)";
    context.fillRect(x - textWidth / 2 - 10 * scale, y - 16 * scale, textWidth + 20 * scale, 32 * scale);
    context.fillStyle = "#ffe8a3";
    context.fillText(word, x, y);
    context.fillStyle = "rgba(255, 150, 210, 0.95)";
    context.beginPath();
    context.arc(x, y + 44 * scale, 18 * scale, 0, Math.PI * 2);
    context.fill();
  });
}

function build(): void {
  for (const cell of cells) cell.stage.destroy();
  cells = [];
  grid.replaceChildren();
  const worlds = gridToggle.checked
    ? BACKGROUND_COMPOSITIONS.map((composition) => composition.worldId)
    : [worldSelect.value];
  const columns = worlds.length === 1 ? 1 : worlds.length <= 4 ? 2 : 3;
  grid.style.gridTemplateColumns = "repeat(" + columns + ", 1fr)";
  grid.style.gridAutoRows = worlds.length === 1 ? "100%" : "calc((100% - 4px) / " + Math.ceil(worlds.length / columns) + ")";

  for (const world of worlds) {
    const element = document.createElement("div");
    element.className = "cell";
    const canvas = document.createElement("canvas");
    const overlay = document.createElement("canvas");
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = world;
    element.append(canvas, overlay, label);
    grid.append(element);
    const stage = new BackgroundStage(canvas, {
      presentation: "layered",
      quality: qualitySelect.value as BackgroundTier,
    });
    cells.push({ stage, overlay, element });
    stage.setWorld(world);
  }
  resize();
}

function resize(): void {
  for (const cell of cells) {
    const rect = cell.element.getBoundingClientRect();
    cell.stage.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    drawMockLabels(cell.overlay);
  }
}

function frame(now: number): void {
  const time = now / 1000;
  const scale = Number(timeScaleInput.value);
  for (const cell of cells) {
    cell.stage.setTimeScale(scale);
    cell.stage.render(time, 0, 0);
  }
  const first = cells[0]?.stage.diagnostics();
  if (first !== undefined) {
    stats.textContent =
      "active      " + String(first.active) + "\n" +
      "world       " + first.world + "\n" +
      "tier / dpr  " + first.tier + " / " + first.dpr.toFixed(2) + "\n" +
      "textures    " + first.textureMB.toFixed(1) + " MB\n" +
      "sprites     " + String(first.sprites) + "\n" +
      "uploads     " + String(first.pendingUploads) + "\n" +
      "cpu p95     " + first.renderP95Ms.toFixed(2) + " ms";
  }
  const debug = window as unknown as { __bgGallery: unknown; __bgGalleryCells: unknown };
  debug.__bgGallery = first;
  debug.__bgGalleryCells = cells;
  requestAnimationFrame(frame);
}

worldSelect.addEventListener("change", build);
qualitySelect.addEventListener("change", () => {
  for (const cell of cells) cell.stage.setQuality(qualitySelect.value as BackgroundTier);
});
gridToggle.addEventListener("change", build);
labelsToggle.addEventListener("change", resize);
document.getElementById("shower")!.addEventListener("click", () => {
  for (const cell of cells) cell.stage.triggerMeteorShower();
});
document.getElementById("pass")!.addEventListener("click", () => {
  for (const cell of cells) cell.stage.triggerPass();
});
window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  if (event.key === "h" || event.key === "H") panel.classList.toggle("hidden");
});

build();
requestAnimationFrame(frame);
