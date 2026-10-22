/**
 * The sandbox panel (docs/td/BUILD_NOW.md §5.3; on in 1A, F9 hides it). Its
 * buttons, and the level row of a building's card, are `sb:<op>:<value>`
 * actions that become `sandbox` commands, so a run's log replays them.
 */
import type { SandboxOp } from "../sim/commands";
import type { World } from "../sim/world";
import { button, seg } from "../ui/hud";

/** The level row sets the building in focus; gold is added to the treasury; the difficulty's value is a word. */
export function sandboxOp(op: string, value: string, w: World, focus: number): SandboxOp {
  if (op === "level") return { op, building: focus, value: Number(value) };
  if (op === "gold") return { op, value: Math.floor(w.gold / 1000) + Number(value) };
  return { op, value: op === "difficulty" ? value : Number(value) } as SandboxOp;
}

export function sandboxHtml(w: World): string {
  return (
    `<b>Hộp cát</b><kbd>F9</kbd>` +
    seg("Lũy", "sb:keepLevel", ["1", "2", "3", "4"], ["1", "2", "3", "4"], String(w.buildings.level[0])) +
    `<div class="td-row"><small>Vàng</small>${button("sb:gold:100", "+100")}${button("sb:gold:1000", "+1000")}</div>` +
    `<div class="td-row"><small>Tốc E</small>${[-5, -1, 1, 5].map((d) => button("sb:expected:" + Math.max(12, Math.min(140, w.expected + d)), (d > 0 ? "+" : "−") + Math.abs(d))).join("")}<b>${w.expected}</b></div>` +
    seg("Độ khó", "sb:difficulty", ["easy", "normal", "hard"], ["Dễ", "Thường", "Khó"], w.difficulty) +
    seg("Từ vựng", "sb:vocab", ["1", "3", "5"], ["Cấp 1", "1–3", "1–5"], String(w.vocab)) +
    seg("Tốc game", "sb:speed", ["0.75", "1", "2"], ["0,75×", "1×", "2×"], String(w.speed)) +
    `<div class="td-row">${button("sb:preset", "Đặt sẵn 4 ô")}${button("sb:wave", "Sinh đợt")}</div>`
  );
}
