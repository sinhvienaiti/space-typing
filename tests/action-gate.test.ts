import { describe, expect, it } from "vitest";
import { ActionGate } from "../src/ui/action-gate";

describe("UI async action gate", () => {
  it("allows one in-flight action and rejects repeats until released", () => {
    const gate = new ActionGate();

    expect(gate.active).toBe(false);
    expect(gate.tryEnter()).toBe(true);
    expect(gate.active).toBe(true);
    expect(gate.tryEnter()).toBe(false);

    gate.leave();
    expect(gate.active).toBe(false);
    expect(gate.tryEnter()).toBe(true);
  });

  it("can be safely released more than once", () => {
    const gate = new ActionGate();
    gate.leave();
    gate.leave();
    expect(gate.active).toBe(false);
    expect(gate.tryEnter()).toBe(true);
  });
});
