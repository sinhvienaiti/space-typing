import { describe, expect, it } from "vitest";
import { AdaptiveRenderBudget } from "../src/performance/adaptive-resolution";
describe("adaptive high-quality Canvas resolution", () => {
  it("preserves Medium, never touches combat simulation values", () => {
    const controller = new AdaptiveRenderBudget();
    for (let i = 0; i < 400; i++) controller.observe("medium", .033, 14);
    expect(controller.scale).toBe(1);
  });
  it("reduces effective resolution only after sustained expensive frames", () => {
    const controller = new AdaptiveRenderBudget();
    let changed = false;
    for (let i = 0; i < 270; i++) {
      if (controller.observe("ultra", .03, 13)) changed = true;
    }
    expect(changed).toBe(true);
    expect(controller.scale).toBeGreaterThanOrEqual(0.72);
    expect(controller.scale).toBeLessThan(1);
    const previous = controller.scale;
    expect(controller.observe("ultra", 2, 200)).toBe(false);
    expect(controller.scale).toBe(previous);
  });
  it("slowly recovers crispness after sustained smooth frames", () => {
    const controller = new AdaptiveRenderBudget();
    for (let i = 0; i < 250; i++) controller.observe("high", .027, 12);
    const reduced = controller.scale;
    expect(reduced).toBeLessThan(1);
    for (let i = 0; i < 1200; i++) controller.observe("high", .016, 3);
    expect(controller.scale).toBeGreaterThan(reduced);
    expect(controller.scale).toBeLessThanOrEqual(1);
    controller.reset();
    expect(controller.scale).toBe(1);
  });
});
