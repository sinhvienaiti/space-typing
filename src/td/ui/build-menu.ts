/**
 * The dock over Build and Stop all (BUILD_NOW §5.3; §10 cut the ring menu to
 * this card, docs/td/BUILD_NOTES.md 1.2): the focused building's card, or the
 * build menu.
 */
import type { Selection } from "../app/selection";
import { ECONOMY, TEMPO, TICK_HZ } from "../content/rules";
import { densestFor } from "../sim/systems/stream";
import type { World } from "../sim/world";
import { STOP, stepTempo, tempoHint, tempoOpen } from "../typing/tempo";
import { button, seg } from "./hud";
import { agentView } from "./team-bar";

const head = (title: string, sub: string): string => `<div class="td-row"><span><b>${title}</b> <small>${sub}</small></span>${button("close", "×", "", ' class="td-x" title="Esc"')}</div>`;

function cardHtml(w: World, sel: Selection, b: number): string {
  const B = w.buildings;
  const densest = densestFor(w, b);
  const knob = TEMPO.flatMap((tempo, k) => {
    if ("easyOnly" in tempo && w.difficulty !== "easy") return [];
    const attrs = (k === B.tempo[b] ? ' class="is-on"' : "") + (tempoOpen(k, densest, w.difficulty) ? "" : ' disabled title="Chưa mở ở cấp này"');
    return [button("tempo:" + k, k === STOP ? "Dừng" : String(tempo.periodS), "", attrs)];
  });
  const assist = B.assist[b]!;
  const undoLeft = Math.ceil(ECONOMY.undoWindowS - (w.tick - B.builtTick[b]!) / TICK_HZ);
  const hint = tempoHint(B.resolved[b]!, B.hits[b]!, B.tempo[b]!, densest, w.difficulty);
  return (
    head(w.c.buildings[B.def[b]!]!.def.view.name, "Cấp " + B.level[b]) +
    `<p>${assist >= 0 ? agentView(w, assist).name + " trợ lực" : "Chưa ai trợ lực"}</p>` +
    `<p><small>Nhịp: một từ mỗi N giây <kbd>−</kbd><kbd>=</kbd></small></p><div class="td-row">${knob.join("")}</div><div class="td-row">` +
    (assist === sel.agent || w.agents.goal[sel.agent] === b ? "" : button("send", "Gửi " + agentView(w, sel.agent).name, "Enter")) +
    (b > 0 && (w.phase === "prep" || undoLeft > 0) ? button("undo", "Hoàn tác" + (w.phase === "prep" ? "" : " · " + undoLeft + " s"), "Del") : "") +
    `</div>` +
    (w.sandbox && b > 0 ? seg("Cấp", "sb:level", ["1", "2", "3"], ["L1", "L2", "L3"], String(B.level[b])) : "") +
    (hint === 0 ? "" : `<p class="td-hint">Bạn bắt ${Math.round((100 * B.hits[b]!) / B.resolved[b]!)} %. Thử ${TEMPO[stepTempo(B.tempo[b]!, hint < 0 ? -1 : 1, densest, w.difficulty)]!.periodS} s?</p>`)
  );
}

export function dockHtml(w: World, sel: Selection): string {
  const b = w.buildings.slotOf(sel.focus);
  if (!sel.building) return b >= 0 ? cardHtml(w, sel, b) : "";
  const rows = w.c.buildings.slice(1).map((spec, k) => {
    const attrs = ' class="td-kind' + (sel.kind === k + 1 ? " is-on" : "") + (w.gold < spec.costs[0] * 1000 ? " is-poor" : "") + '"';
    return button("pick:" + (k + 1), `<kbd>${k + 1}</kbd>${spec.def.view.name}<span>${spec.costs[0]} vàng</span>`, "", attrs);
  });
  const sub = w.c.buildings[sel.kind]!.placement === "node" ? "Mỏ chỉ đặt trên quặng" : "";
  return head("Xây nhà", sub) + rows.join("") + `<p><small>Tab: chỗ kế · Enter: xây · Esc: hủy</small></p>`;
}
