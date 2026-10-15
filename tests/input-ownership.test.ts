import { describe, expect, it, vi } from "vitest";
import { TargetOwnership } from "../src/input/target-ownership";
import { InputController } from "../src/input/input-controller";
import { sanitizeInputMode } from "../src/input/mode";

describe("input unit ownership", () => {
  it("latches accepted keyboard ownership independently of reset progress and rejects voice on A only", () => {
    const ownership = new TargetOwnership(); const a = { typed: 0 }, b = { typed: 0 };
    ownership.beginEncounter(); const unit = ownership.current(a);
    expect(ownership.claimKeyboard(a)).toBe(true); a.typed = 0;
    expect(ownership.isKeyboardOwned(a)).toBe(true); expect(ownership.claimVoice(a)).toBe(false);
    expect(ownership.claimVoice(b)).toBe(true); expect(ownership.claimKeyboard(b)).toBe(false);
    expect(ownership.current(a)).toBe(unit);
  });
  it("a new generation, even with the same text/object, invalidates the old identity", () => {
    const ownership = new TargetOwnership(); const a = { text: "orbit", typed: 4 };
    const first = ownership.current(a); expect(first.owner).toBe("available");
    ownership.claimKeyboard(a); const next = ownership.beginUnit(a);
    expect(first.owner).toBe("invalidated"); expect(next.unitId).not.toBe(first.unitId); expect(next.owner).toBe("available");
    ownership.finish(a, "completed"); expect(ownership.claimVoice(a)).toBe(false);
    ownership.beginEncounter(); expect(ownership.current(a).unitId).not.toBe(next.unitId);
  });
});
describe("keyboard seam", () => {
  it("keeps every key on the existing route in Typing and Hybrid, while Voice retains controls", () => {
    const route = vi.fn(), controller = new InputController(route); const keys = ["a", "A", "Escape", " ", "1", "Tab", "é"];
    for (const mode of ["typing", "hybrid"] as const) {
      controller.setMode(mode); keys.forEach((key) => controller.handleKey(key));
      expect(route.mock.calls.map(([key]) => key)).toEqual(keys); route.mockClear();
    }
    controller.setMode("voice"); keys.forEach((key) => controller.handleKey(key));
    expect(route.mock.calls.map(([key]) => key)).toEqual(keys.slice(2));
    expect(sanitizeInputMode(undefined)).toBe("typing"); expect(sanitizeInputMode("unknown")).toBe("typing");
  });
});
