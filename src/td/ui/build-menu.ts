/**
 * The dock over Build (BUILD_NOW §5.3, BUILD_1A6 §9): the focused building's
 * card (a site's progress, send, undo, upgrade; the farm's seeds and plots;
 * the Bastion's villagers, builders and food sale), the card of the dim call
 * Tab is on (send the agent there), or the build menu with gold and wood prices.
 */
import type { Selection } from "../app/selection";
import { ECONOMY, FARM, POWER, TICK_HZ, VILLAGERS } from "../content/rules";
import { NPC_KIND } from "../sim/stores/npcs";
import { inRing } from "../sim/systems/agents";
import { countNpcs, villagerCap } from "../sim/systems/economy";
import type { World } from "../sim/world";
import { CALL_ICON, CALL_NAME } from "../view/words/cards";
import { button, seg } from "./hud";
import { agentView } from "./team-bar";

const head = (title: string, sub: string): string => `<div class="td-row"><span><b>${title}</b> <small>${sub}</small></span>${button("close", "×", "", ' class="td-x" title="Esc"')}</div>`;
const price = (gold: number, wood: number): string => `${gold} vàng · ${wood} gỗ`;

/** A farm's plots by stage (§4.1): "Chín 1 · Lớn 2 · Trống 1". */
function plotsLine(w: World, b: number): string {
  const count = [0, 0, 0];
  for (let p = 0; p < FARM.plots; p += 1) count[w.buildings.plot[b * FARM.plots + p]!]! += 1;
  return ["Trống", "Lớn", "Chín"].map((name, stage) => `${name} <b>${count[stage]}</b>`).reverse().join(" · ");
}

function cardHtml(w: World, sel: Selection, b: number): string {
  const B = w.buildings;
  const spec = w.c.buildings[B.def[b]!]!;
  const level = B.level[b]!;
  const undoLeft = Math.ceil(ECONOMY.undoWindowS - (w.tick - B.builtTick[b]!) / TICK_HZ);
  const site = B.upTo[b]! > 0 ? `<p>Đang xây ${Math.floor(B.progress[b]! * 100)} %${B.builder[b]! < 0 ? " · chờ thợ" : ""}</p>` : "";
  const up = b > 0 && B.ready[b] === 1 && B.upTo[b] === 0 && level < spec.gold.length;
  const extra =
    spec.farm && B.ready[b] === 1 ? `<p>${plotsLine(w, b)}</p><p>Hạt giống <b>${w.seeds}</b> · tự mua ${FARM.seedGold} vàng một hạt</p>` +
      `<div class="td-row">${button("seeds", "Mua " + FARM.pack.seeds + " hạt · " + FARM.pack.gold + " vàng")}${button("autoSeeds", "Tự mua hạt", "", w.autoSeeds ? ' class="is-on"' : "")}</div>`
    : b === 0 ? `<p>Dân <b>${countNpcs(w, NPC_KIND.villager)}/${villagerCap(w)}</b> · Thợ xây <b>${countNpcs(w, NPC_KIND.builder)}</b> · Lúa <b>${w.food}</b></p>` +
      `<div class="td-row">${button("hire", "Thuê dân · " + VILLAGERS.gold + " vàng, " + VILLAGERS.food + " lúa", "⇧ \\")}</div><div class="td-row">${button("sellFood", "Bán " + ECONOMY.sale.food + " Lúa · +" + ECONOMY.sale.gold + " vàng")}</div>`
    : spec.attack !== null && B.ready[b] === 1 ? `<p>Lượt mạnh <b>${B.charges[b]}/${POWER.max}</b> · ban đêm gõ lời gọi Bắn mạnh để nạp</p>`
    : "";
  return (
    head(spec.def.view.name, "Cấp " + level + (B.sturdy[b] === 1 ? " · nền chắc" : "")) + site + extra +
    `<div class="td-row">` +
    (w.agents.goal[sel.agent] === b ? "" : button("send", "Gửi " + agentView(w, sel.agent).name, "Enter")) +
    (b > 0 && undoLeft > 0 ? button("undo", "Hoàn tác · " + undoLeft + " s", "Del") : "") +
    `</div>` +
    (up ? `<div class="td-row">${button("upgrade", "Nâng cấp · " + price(spec.gold[level]! - spec.gold[level - 1]!, spec.wood[level]! - spec.wood[level - 1]!))}</div>` : "") +
    (w.sandbox && b > 0 ? seg("Cấp", "sb:level", ["1", "2", "3"], ["L1", "L2", "L3"], String(level)) : "")
  );
}

/**
 * The dim call Tab is on: what it asks, and Enter to send the agent, whose help ring would light it (§8). One already
 * in a ring waits for room under the cap (or a quiz gave its place), so sending someone would not light it (review R2).
 */
function callHtml(w: World, sel: Selection, c: number): string {
  const C = w.calls;
  const kind = C.kind[c]!;
  const why = inRing(w, C.x[c]!, C.z[c]!) ? "Trong vòng giúp: sáng khi bớt lời gọi đang sáng." : "Ngoài vòng giúp: đưa người tới gần để thẻ sáng và gõ được.";
  return (
    head(CALL_ICON[kind] + " " + CALL_NAME[kind], C.words[c]! - C.done[c]! + " từ · đang mờ") +
    `<p>${why}</p><div class="td-row">${button("send", "Gửi " + agentView(w, sel.agent).name, "Enter")}</div>`
  );
}

export function dockHtml(w: World, sel: Selection): string {
  const b = w.buildings.slotOf(sel.focus);
  const c = w.calls.slotOf(sel.call);
  if (!sel.building) return b >= 0 ? cardHtml(w, sel, b) : c >= 0 ? callHtml(w, sel, c) : "";
  const rows = w.c.buildings.slice(1).map((spec, k) => {
    const attrs = ' class="td-kind' + (sel.kind === k + 1 ? " is-on" : "") + (w.gold < spec.gold[0]! * 1000 || w.wood < spec.wood[0]! ? " is-poor" : "") + '"';
    return button("pick:" + (k + 1), `<kbd>${k + 1}</kbd>${spec.def.view.name}<span>${price(spec.gold[0]!, spec.wood[0]!)}</span>`, "", attrs);
  });
  const sub = w.c.buildings[sel.kind]!.placement === "node" ? "Mỏ chỉ đặt trên quặng" : "";
  return head("Xây nhà", sub) + rows.join("") + `<p><small>Tab: chỗ kế · Enter: xây · Esc: hủy</small></p>`;
}
