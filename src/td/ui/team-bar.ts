/**
 * The team bar (BUILD_NOW §5.3, BUILD_1A6 §9, TK 23.5, 23.7): Draconis and
 * the Thư Đồng with their number keys and a badge for the building each was
 * sent to, a closed slot's Bastion level, and the "Đang gọi n/N" chip: open
 * calls against the mode's cap.
 */
import { MODES } from "../content/rules";
import type { ViewBlock } from "../content/types";
import { CALL_STATE } from "../sim/stores/calls";
import { slotsOpen } from "../sim/systems/agents";
import type { World } from "../sim/world";

export const agentView = (w: World, a: number): ViewBlock => (a === 0 ? w.c.content.hero.view : w.c.content.helpers[a - 1]!.view);
const buildingView = (w: World, b: number): ViewBlock => w.c.buildings[w.buildings.def[b]!]!.def.view;

export function teamHtml(w: World, selected: number): string {
  const { agents: A, calls: C } = w;
  const open = C.live().filter((c) => C.state[c] === CALL_STATE.open).length;
  const portraits = A.live().map((a) => {
    const view = agentView(w, a);
    const opensAt = w.c.content.buildings[0]!.keep!.levels.findIndex((level) => level.slots > a) + 1;
    if (a >= slotsOpen(w)) return `<button class="td-agent is-locked" disabled title="Mở ở Lũy cấp ${opensAt}">${view.short}<small>Lũy ${opensAt}</small></button>`;
    const goal = A.goal[a]!;
    const badge = goal < 0 ? "" : `<em style="--fam:${buildingView(w, goal).color}" title="${buildingView(w, goal).name}">${buildingView(w, goal).short}</em>`;
    return `<button class="td-agent${a === selected ? " is-on" : ""}" data-act="agent:${a}" style="--c:${view.color}" title="${view.name}"><i>${a + 1}</i>${view.short}${badge}</button>`;
  });
  return (
    `<div class="td-row"><span><b>${selected + 1} · ${agentView(w, selected).name}</b></span><span class="td-load" title="Lời gọi đang mở / tối đa">Đang gọi ${open}/${MODES[w.mode].open}</span></div>` +
    `<div class="td-agents">${portraits.join("")}</div>`
  );
}
