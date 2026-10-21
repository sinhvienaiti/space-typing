import { describe, expect, it } from "vitest";
import { resetCanvas2D } from "../src/platform/canvas-state";
import { fakeContext2D } from "./helpers/fake-context-2d";

/** A draw that threw midway: one save() left open, shifted and faded. */
function brokenDraw(context: ReturnType<typeof fakeContext2D>["context"]): void {
  context.setTransform(2, 0, 0, 2, 0, 0);
  context.save();
  context.translate(6, -4);
  context.globalAlpha = 0.3;
}

describe("canvas state after a throwing draw", () => {
  it.each([
    ["with context.reset", true],
    ["by resetting the canvas width (older browsers)", false],
  ])("puts the context back to its first state at the DPR scale, %s", (_name, reset) => {
    const { canvas, context } = fakeContext2D({ reset });
    brokenDraw(context);

    resetCanvas2D(canvas, context as unknown as CanvasRenderingContext2D, 2);

    expect(context.transform).toEqual([2, 0, 0, 2, 0, 0]);
    expect(context.globalAlpha).toBe(1);
    expect(context.stack).toHaveLength(0);
    expect(canvas.width).toBe(1280);
  });
});
