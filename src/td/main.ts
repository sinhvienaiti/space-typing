/**
 * Typing Defense (td.html), step 1A "Cổng vui" (docs/td/BUILD_NOW.md): a
 * top-down 2D test field. This is the frame: the canvas, the word-card and
 * HUD layers, and the dev handle; the simulation and its 2D view come next.
 */
import "./ui/td.css";
import { installDevHandle } from "./app/dev-handle";

const GRASS = "#7dba5a";

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error("typing defense: missing #" + id);
  return element as T;
}

// 1A is the sandbox build: on unless ?sandbox=0.
const sandbox = new URLSearchParams(window.location.search).get("sandbox") !== "0";
const canvas = byId<HTMLCanvasElement>("tdCanvas");
const context = canvas.getContext("2d", { alpha: false });
if (context === null) throw new Error("typing defense: no 2D canvas");
let painted = false;

const resize = (): void => {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(window.innerWidth * ratio);
  canvas.height = Math.round(window.innerHeight * ratio);
  context.fillStyle = GRASS;
  context.fillRect(0, 0, canvas.width, canvas.height);
  painted = true;
};

const title = document.createElement("div");
title.className = "td-chip";
title.textContent = "Typing Defense";
if (sandbox) title.insertAdjacentHTML("beforeend", "<small>Hộp cát · bản thử 1A</small>");
byId("tdHud").append(title);

window.addEventListener("resize", resize);
resize();
installDevHandle({ ready: () => painted, flags: () => ({ sandbox }) });
