/**
 * The part of a 2D context's drawing state a frame can leak: the transform,
 * the alpha and the save() stack. `reset` is left out to model an older
 * browser; there, setting the canvas width resets the context instead.
 */
export type FakeContext2D = {
  transform: number[];
  globalAlpha: number;
  stack: { transform: number[]; globalAlpha: number }[];
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  reset?(): void;
};

export function fakeContext2D(options: { reset: boolean }): {
  canvas: HTMLCanvasElement;
  context: FakeContext2D;
} {
  const context: FakeContext2D = {
    transform: [1, 0, 0, 1, 0, 0],
    globalAlpha: 1,
    stack: [],
    save() {
      context.stack.push({ transform: [...context.transform], globalAlpha: context.globalAlpha });
    },
    restore() {
      const saved = context.stack.pop();
      if (saved === undefined) return;
      context.transform = saved.transform;
      context.globalAlpha = saved.globalAlpha;
    },
    translate(x, y) {
      const [a, b, c, d, e, f] = context.transform as [number, number, number, number, number, number];
      context.transform = [a, b, c, d, e + a * x + c * y, f + b * x + d * y];
    },
    setTransform(a, b, c, d, e, f) {
      context.transform = [a, b, c, d, e, f];
    },
  };
  const initial = (): void => {
    context.transform = [1, 0, 0, 1, 0, 0];
    context.globalAlpha = 1;
    context.stack = [];
  };
  if (options.reset) context.reset = initial;
  let width = 1280;
  const canvas = {
    get width() {
      return width;
    },
    set width(value: number) {
      width = value;
      initial();
    },
    height: 720,
  } as unknown as HTMLCanvasElement;
  return { canvas, context };
}
