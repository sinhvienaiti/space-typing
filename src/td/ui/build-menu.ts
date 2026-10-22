/**
 * The dock over Build (BUILD_NOW §5.3, BUILD_1A6 §9): the focused building's
 * card (a site's progress, send, undo, upgrade; the farm's seeds; the
 * Bastion's villagers and food sale), or the build menu with gold and wood
 * prices. R1 keeps it plain: the cards' polish is R2.
 */
import type { Selection } from "../app/selection";
import { ECONOMY, FARM, TICK_HZ, VILLAGERS } from "../content/rules";
import { NPC_KIND } from "../sim/stores/npcs";
import { countNpcs, villagerCap } from "../sim/systems/economy";
import type { World } from "../sim/world";
import { button, seg } from "./hud";
import { agentView } from "./team-bar";

const head = (title: string, sub: string): string => `<div class="td-row"><span><b>${title}</b> <small>${sub}</small></span>${button("close", "×", "", ' class="td-x" title="Esc"')}</div>`;
const price = (gold: number, wood: number): string => `${gold} vàng · ${wood} gỗ`;

function cardHtml(w: World, sel: Selection, b: number): string {
  const B = w.buildings;
  const spec = w.c.buildings[B.def[b]!]!;
  const level = B.level[b]!;
  const undoLeft = Math.ceil(ECONOMY.undoWindowS - (w.tick - B.builtTick[b]!) / TICK_HZ);
  const site = B.upTo[b]! > 0 ? `<p>Đang xây ${Math.floor(B.progress[b]! * 100)} %${B.builder[b]! < 0 ? " · chờ thợ" : ""}</p>` : "";
  const up = b > 0 && B.ready[b] === 1 && B.upTo[b] === 0 && level < spec.gold.length;
  const extra =
    spec.farm ? `<p>Hạt: ${w.seeds}</p><div class="td-row">${button("seeds", "Mua " + FARM.pack.seeds + " hạt")}${button("autoSeeds", "Tự mua hạt", "", w.autoSeeds ? ' class="is-on"' : "")}</div>`
    : b === 0 ? `<p>Dân ${countNpcs(w, NPC_KIND.villager)}/${villagerCap(w)}</p><div class="td-row">${button("hire", "Thuê dân · " + VILLAGERS.gold + " vàng " + VILLAGERS.food + " lúa", "⇧ \\")}${button("sellFood", "Bán " + ECONOMY.sale.food + " Lúa")}</div>`
    : "";
  return (
    head(spec.def.view.name, "Cấp " + level + (B.sturdy[b] === 1 ? " · nền chắc" : "")) + site + extra +
    `<div class="td-row">` +
    (w.agents.goal[sel.agent] === b ? "" : button("send", "Gửi " + agentView(w, sel.agent).name, "Enter")) +
    (b > 0 && undoLeft > 0 ? button("undo", "Hoàn tác · " + undoLeft + " s", "Del") : "") +
    (up ? button("upgrade", "Nâng cấp · " + price(spec.gold[level]! - spec.gold[level - 1]!, spec.wood[level]! - spec.wood[level - 1]!)) : "") +
    `</div>` +
    (w.sandbox && b > 0 ? seg("Cấp", "sb:level", ["1", "2", "3"], ["L1", "L2", "L3"], String(level)) : "")
  );
}

export function dockHtml(w: World, sel: Selection): string {
  const b = w.buildings.slotOf(sel.focus);
  if (!sel.building) return b >= 0 ? cardHtml(w, sel, b) : "";
  const rows = w.c.buildings.slice(1).map((spec, k) => {
    const attrs = ' class="td-kind' + (sel.kind === k + 1 ? " is-on" : "") + (w.gold < spec.gold[0]! * 1000 || w.wood < spec.wood[0]! ? " is-poor" : "") + '"';
    return button("pick:" + (k + 1), `<kbd>${k + 1}</kbd>${spec.def.view.name}<span>${price(spec.gold[0]!, spec.wood[0]!)}</span>`, "", attrs);
  });
  const sub = w.c.buildings[sel.kind]!.placement === "node" ? "Mỏ chỉ đặt trên quặng" : "";
  return head("Xây nhà", sub) + rows.join("") + `<p><small>Tab: chỗ kế · Enter: xây · Esc: hủy</small></p>`;
}
