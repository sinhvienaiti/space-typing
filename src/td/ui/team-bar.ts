/**
 * The team bar (BUILD_NOW §5.3, TK 23.5, 23.7): Draconis and the Thư Đồng with
 * their number keys and a badge for the building each assists (dashed while
 * on the way: the state), a closed slot's Bastion level, and the load chip.
 */
import { LOAD, TEMPO } from "../content/rules";
import type { ViewBlock } from "../content/types";
import { slotsOpen } from "../sim/systems/agents";
import { dealing } from "../sim/systems/heat";
import { expectedE } from "../sim/systems/words";
import type { World } from "../sim/world";
import { capacity, wordsPerMinute } from "../typing/tempo";

export const agentView = (w: World, a: number): ViewBlock => (a === 0 ? w.c.content.hero.view : w.c.content.helpers[a - 1]!.view);
const buildingView = (w: World, b: number): ViewBlock => w.c.buildings[w.buildings.def[b]!]!.def.view;

export function teamHtml(w: World, selected: number): string {
  const { agents: A, buildings: B } = w;
  const dealers = B.live().filter((b) => dealing(w, b));
  // Load: words a minute the dealing buildings ask over K; jade to 100 %, amber to 125 %, orange past (red is the enemy's).
  const load = wordsPerMinute(dealers.map((b) => B.tempo[b]!)) / capacity(expectedE(w), w.typing.meanLen);
  const tone = load <= LOAD.calm ? "#0b8a78" : load <= LOAD.busy ? "#c98a2e" : "#e2701e";
  const list = dealers.map((b) => buildingView(w, b).name + " · " + TEMPO[B.tempo[b]!]!.periodS + " s").join("&#10;") || "Chưa nhà nào phát chữ";
  const portraits = A.live().map((a) => {
    const view = agentView(w, a);
    const opensAt = w.c.content.buildings[0]!.keep!.levels.findIndex((level) => level.slots > a) + 1;
    if (a >= slotsOpen(w)) return `<button class="td-agent is-locked" disabled title="Mở ở Lũy cấp ${opensAt}">${view.short}<small>Lũy ${opensAt}</small></button>`;
    const goal = A.goal[a]!;
    const badge = goal < 0 ? "" : `<em class="${A.at[a] === goal ? "" : "is-going"}" style="--fam:${buildingView(w, goal).color}" title="${A.at[a] === goal ? "Trợ lực " : "Đang tới "}${buildingView(w, goal).name}">${buildingView(w, goal).short}</em>`;
    return `<button class="td-agent${a === selected ? " is-on" : ""}" data-act="agent:${a}" style="--c:${view.color}" title="${view.name}"><i>${a + 1}</i>${view.short}${badge}</button>`;
  });
  return (
    `<div class="td-row"><span><b>${selected + 1} · ${agentView(w, selected).name}</b></span><span class="td-load" style="background:${tone}" title="${list}">Tải ${Math.round(load * 100)} %</span></div>` +
    `<div class="td-agents">${portraits.join("")}</div>`
  );
}
