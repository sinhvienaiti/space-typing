import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  installWarpControls,
  WARP_CONTROL_ACTIONS,
} from "../src/ui/warp-controls";

class Button extends EventTarget {
  disabled = false;
  click() {
    this.dispatchEvent(new Event("click"));
  }
}
function fixture() {
  const buttons = new Map(
    Object.keys(WARP_CONTROL_ACTIONS).map((id) => [id, new Button()]),
  );
  const actions = {
    practice: vi.fn(async () => {}),
    retryPractice: vi.fn(async () => {}),
    refuel: vi.fn(async () => {}),
    reserve: vi.fn(async () => {}),
    abandon: vi.fn(async () => {}),
    clock: vi.fn(async () => {}),
  };
  const notice = vi.fn(),
    refresh = vi.fn();
  const dispose = installWarpControls(
    (id) => buttons.get(id)! as unknown as HTMLButtonElement,
    actions,
    notice,
    refresh,
  );
  return { buttons, actions, notice, refresh, dispose };
}
describe("Warp control wiring", () => {
  it.each(Object.entries(WARP_CONTROL_ACTIONS))(
    "%s in the actual page invokes %s",
    async (id, action) => {
      const html = readFileSync(
        new URL("../index.html", import.meta.url),
        "utf8",
      );
      expect(html).toContain(`id="${id}"`);
      const { buttons, actions, refresh, dispose } = fixture();
      buttons.get(id)!.click();
      await Promise.resolve();
      expect(actions[action]).toHaveBeenCalledOnce();
      expect(refresh).toHaveBeenCalledOnce();
      dispose();
    },
  );
  it("prevents double clicks and cross-control actions until commit completes", async () => {
    const { buttons, actions, dispose } = fixture();
    let done!: () => void;
    actions.refuel = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          done = resolve;
        }),
    );
    buttons.get("warpRefuelButton")!.click();
    buttons.get("warpRefuelButton")!.click();
    buttons.get("warpReserveToggle")!.click();
    expect(actions.refuel).toHaveBeenCalledOnce();
    expect(actions.reserve).not.toHaveBeenCalled();
    done();
    await Promise.resolve();
    buttons.get("warpReserveToggle")!.click();
    expect(actions.reserve).toHaveBeenCalledOnce();
    dispose();
  });
  it("surfaces storage errors, releases its gate and honors disabled controls", async () => {
    const { buttons, actions, notice, dispose } = fixture();
    actions.refuel = vi.fn(async () => {
      throw new Error("Storage full");
    });
    buttons.get("warpRefuelButton")!.click();
    await Promise.resolve();
    expect(notice).toHaveBeenCalledWith("Storage full");
    buttons.get("warpReserveToggle")!.disabled = true;
    buttons.get("warpReserveToggle")!.click();
    expect(actions.reserve).not.toHaveBeenCalled();
    buttons.get("practiceButton")!.click();
    expect(actions.practice).toHaveBeenCalledOnce();
    dispose();
  });
});
