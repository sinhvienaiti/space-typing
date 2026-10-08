import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { createWarpCharge } from "../src/economy/warp-charge";
import { warpHudView, warpRefuelView } from "../src/ui/warp-hud";

describe("pilot-card Warp HUD", () => {
  it("shows refuel price and disables unaffordable purchases", () => {
    const warp = createWarpCharge(0);
    expect(warpRefuelView(warp, 0)).toMatchObject({ disabled: true, label: "Refuel +20 · 8 SC", detail: "Need 8 Star Crystals · you have 0" });
    expect(warpRefuelView({ ...warp, refills: 1 }, 100).label).toBe("Refuel +20 · 12 SC");
    expect(warpRefuelView({ ...warp, refills: 2 }, 100).label).toBe("Refuel +20 · 18 SC");
  });
  it("explains spill into Reserve and blocks full storage or daily quota", () => {
    const warp = createWarpCharge(0);
    expect(warpRefuelView(warp, 100)).toMatchObject({ disabled: false, detail: "Star Crystals 100 · Active +0 · Reserve +20" });
    expect(warpRefuelView({ ...warp, current: 95 }, 100).detail).toContain("Active +5 · Reserve +15");
    expect(warpRefuelView({ ...warp, reserve: 281 }, 100)).toMatchObject({ disabled: true, detail: "Need room for all 20 Warp" });
    expect(warpRefuelView({ ...warp, refills: 3 }, 100).detail).toContain("04:00 Vietnam");
    expect(warpRefuelView({ ...warp, refills: 3 }, 100).disabled).toBe(true);
  });
  it("puts a real stamina bar inside the pilot card, not only the hidden old HUD", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const pilot = html.slice(html.indexOf('id="titlePilotCard"'), html.indexOf('class="holo-strip'));
    for (const id of ["titleWarpBar", "titleWarpBalance", "titleWarpReserve", "titleWarpRegen", "titleWarpManage"])
      expect(pilot).toContain(`id="${id}"`);
    expect(pilot).toContain('<progress id="titleWarpBar" max="100"');
  });
  it("keeps depot controls in an accessible dialog outside the clipped Campaign card", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const dialog = html.slice(html.indexOf('<dialog id="warpDialog"'), html.indexOf('<section id="titleOverlay"'));
    for (const id of ["warpRefuelButton", "warpReserveToggle", "warpAbandonButton", "warpClockButton", "warpStatus"])
      expect(dialog).toContain(`id="${id}"`);
    expect(dialog).toContain('method="dialog"');
  });
  it("projects the same current balance without mutating account state", () => {
    const warp = { ...createWarpCharge(0), current: 90, activeProgressMs: 120_000 };
    expect(warpHudView(warp)).toMatchObject({ balance: "90 / 100", value: 90, regen: "Warp +1 · 4:00", low: false });
    expect(warp.current).toBe(90);
  });
  it("shows reserve regeneration/full storage and respects reserve consent for low balance", () => {
    const warp = createWarpCharge(0);
    expect(warpHudView(warp).regen).toBe("Reserve +1 · 12:00");
    expect(warpHudView({ ...warp, reserve: 300 }).regen).toBe("Storage full");
    expect(warpHudView({ ...warp, current: 5, reserve: 10 }).low).toBe(true);
    expect(warpHudView({ ...warp, current: 5, reserve: 10, reserveConsent: true }).low).toBe(false);
  });
});
