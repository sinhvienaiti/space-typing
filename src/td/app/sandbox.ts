/**
 * The sandbox panel (docs/td/BUILD_NOW.md §5.3, BUILD_1A6 §9; F9 hides it).
 * Its buttons, and the level row of a building's card, are `sb:<op>:<value>`
 * actions that become `sandbox` commands, so a run's log replays them.
 */
import { MODE_IDS, type SandboxOp } from "../sim/commands";
import type { World } from "../sim/world";
import { button, seg } from "../ui/hud";

/** The level row sets the building in focus; gold and wood are added; the mode's value is a word. */
export function sandboxOp(op: string, value: string, w: World, focus: number): SandboxOp {
  if (op === "level") return { op, building: focus, value: Number(value) };
  if (op === "gold") return { op, value: Math.floor(w.gold / 1000) + Number(value) };
  if (op === "wood") return { op, value: w.wood + Number(value) };
  return { op, value: op === "mode" ? value : Number(value) } as SandboxOp;
}

export function sandboxHtml(w: World): string {
  return (
    `<b>Hộp cát</b><kbd>F9</kbd>` +
    seg("Lũy", "sb:keepLevel", ["1", "2", "3", "4"], ["1", "2", "3", "4"], String(w.buildings.level[0])) +
    `<div class="td-row"><small>Kho</small>${button("sb:gold:100", "+100 vàng")}${button("sb:gold:1000", "+1000")}${button("sb:wood:50", "+50 gỗ")}</div>` +
    `<div class="td-row"><small>Tốc E</small>${[-5, -1, 1, 5].map((d) => button("sb:expected:" + Math.max(12, Math.min(140, w.expected + d)), (d > 0 ? "+" : "−") + Math.abs(d))).join("")}<b>${w.expected}</b></div>` +
    seg("Chế độ", "sb:mode", MODE_IDS, ["Thư giãn", "Cân bằng", "Thử thách", "Học"], w.mode, true) +
    seg("Từ vựng", "sb:vocab", ["1", "3", "5"], ["Cấp 1", "1–3", "1–5"], String(w.vocab)) +
    seg("Tốc game", "sb:speed", ["0.75", "1", "2"], ["0,75×", "1×", "2×"], String(w.speed)) +
    `<div class="td-row">${button("sb:preset", "Đặt sẵn")}${button("sb:night", "Sinh đêm")}</div>`
  );
}
