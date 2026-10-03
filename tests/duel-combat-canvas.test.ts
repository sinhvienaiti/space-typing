import { afterEach, describe, expect, it, vi } from "vitest";
import { DuelCombatVisuals } from "../src/duel/combat-visuals";
import { duelArenaLayout } from "../src/duel/combat-layout";
import { drawCharacterShip } from "../src/characters/renderer";

vi.mock("../src/characters/renderer", () => ({
  activeShipLightRig: () => null,
  characterShipAngle: () => 0,
  characterShipPoint: vi.fn(),
  drawCharacterShip: vi.fn(),
}));

function context() {
  return {
    clearRect: vi.fn(), setTransform: vi.fn(), save: vi.fn(), restore: vi.fn(),
    scale: vi.fn(), drawImage: vi.fn(), globalCompositeOperation: "source-over",
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(),
    translate: vi.fn(), rotate: vi.fn(), closePath: vi.fn(), fillRect: vi.fn(),
  };
}

function setup(width = 390, height = 350) {
  let onResize = () => {};
  vi.stubGlobal("window", { devicePixelRatio: 2, matchMedia: () => ({ matches: true }) });
  vi.stubGlobal("document", { createElement: () => {
    const ctx = context();
    return { style: {}, dataset: {}, width: 0, height: 0, setAttribute: vi.fn(), getContext: () => ctx };
  } });
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { onResize = callback; }
    observe() {}
  });
  const bounds = { width, height, left: 0, top: 0 };
  const arena = { getBoundingClientRect: () => bounds, append: vi.fn(), classList: { add: vi.fn() } };
  const ship = (y: number) => ({ append: vi.fn(), getBoundingClientRect: () => ({ left: width / 2 - 40, top: y, width: 80, height: 80 }) });
  const visuals = new DuelCombatVisuals(arena as unknown as HTMLElement,
    ship(height - 100) as unknown as HTMLElement, ship(20) as unknown as HTMLElement, vi.fn(), true);
  const output = context();
  return { visuals, output, bounds, resize: () => onResize(), ctx: output as unknown as CanvasRenderingContext2D };
}

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("Duel canvas composition", () => {
  it("maps CSS positions into the minimum logical Game viewport and restores the context", () => {
    const { visuals, output, ctx } = setup();
    visuals.render(1000, "high", ctx, { width: 640, height: 420 });
    expect(output.scale).toHaveBeenCalledWith(640 / 390, 420 / 350);
    // Two opaque hulls; bolts and light are drawn straight onto the Game
    // canvas, so there is no intermediate surface to composite (2026-10-03).
    expect(output.drawImage).toHaveBeenCalledTimes(2);
    expect(output.save.mock.calls.length).toBe(output.restore.mock.calls.length);
    expect(visuals.canvas.width).toBe(1);
  });

  it("repaints cached hulls at most 30 Hz while composing every frame, and invalidates on clear", () => {
    const { visuals, output, ctx } = setup(1642, 799);
    for (const now of [1000, 1016, 1032]) visuals.render(now, "high", ctx);
    expect(drawCharacterShip).toHaveBeenCalledTimes(2);
    expect(output.drawImage).toHaveBeenCalledTimes(6);
    visuals.render(1034, "high", ctx);
    expect(drawCharacterShip).toHaveBeenCalledTimes(4);
    visuals.clear();
    visuals.render(1035, "high", ctx);
    expect(drawCharacterShip).toHaveBeenCalledTimes(6);
  });

  it("remeasures after a viewport resize without allocating a full-screen FX surface", () => {
    const { visuals, output, ctx, bounds, resize } = setup();
    visuals.render(1000, "high", ctx, { width: 640, height: 420 });
    bounds.width = 1642;
    bounds.height = 799;
    resize();
    visuals.render(1040, "high", ctx, { width: 1642, height: 799 });
    expect(output.scale).toHaveBeenLastCalledWith(1, 1);
    // Shared-canvas mode keeps no FX surface of its own at any size.
    expect(visuals.canvas.width).toBe(1);
    expect(visuals.canvas.height).toBe(1);
    // Depth View is the default on wide screens too (side view: ?duelView=side).
    expect(visuals.diagnostics().layout).toBe("depth");
    expect(vi.mocked(drawCharacterShip).mock.calls.at(-2)?.[2].aim).toBe(0);
    expect(vi.mocked(drawCharacterShip).mock.calls.at(-1)?.[2].aim).toBe(Math.PI);
    bounds.width = 390;
    bounds.height = 700;
    resize();
    visuals.render(1080, "high", ctx, { width: 640, height: 700 });
    expect(visuals.diagnostics().layout).toBe("depth");
    expect(vi.mocked(drawCharacterShip).mock.calls.at(-2)?.[2].aim).toBe(0);
    expect(vi.mocked(drawCharacterShip).mock.calls.at(-1)?.[2].aim).toBe(Math.PI);
  });

  it("keeps the side view only as an explicit wide-screen preference", () => {
    expect(duelArenaLayout(1642, 799, false)).toBe("depth");
    expect(duelArenaLayout(1642, 799, true)).toBe("horizontal");
    expect(duelArenaLayout(390, 700, true)).toBe("depth");
  });
});
