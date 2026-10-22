/**
 * The HUD (docs/td/BUILD_NOW.md §5.3, BUILD_1A6 §9, TK 23.5): paper panels, each written only
 * when its HTML changes. A button runs its action on press, so a re-render
 * cannot swallow the click, and never takes focus: Enter and Space stay the game's.
 */
import { TICK_HZ } from "../content/rules";
import { chainTier } from "../sim/systems/chain";
import { earlyCallBonus } from "../sim/systems/waves";
import type { World } from "../sim/world";
import { wordText } from "../typing/decks";

/** In update() order; td-chip is the status panel the scenarios look for. */
export const PANELS = ["chip", "sandbox", "team", "strip", "dock", "actions"] as const;

export const REASON: Readonly<Record<string, string>> = {
  phase: "Ván đã kết thúc", capTotal: "Đã đủ 16 nhà", capType: "Đã đủ nhà loại này", bounds: "Ngoài sân", node: "Mỏ chỉ đặt trên quặng trống",
  water: "Không xây trên nước", road: "Sát đường quá", keep: "Trong vòng 11 m quanh Lũy", overlap: "Chạm nhà khác", tree: "Vướng cây", rally: "Trại Lính phải gần đường",
  path: "Chặn lối đi", gold: "Thiếu vàng", wood: "Thiếu gỗ", food: "Thiếu lúa", noSlot: "Ô này còn khóa", notDay: "Chỉ gọi đêm được ban ngày",
  undoWindow: "Hết 5 s hoàn tác", blocked: "Không đứng được ở đó", rallyFar: "Xa trại quá", rallyOffRoad: "Điểm tập kết phải ở đường",
  noBuilding: "Không có nhà đó", noBarracks: "Không phải Trại Lính", badValue: "Giá trị không hợp lệ", noSandbox: "Chỉ có trong hộp cát", badKey: "Phím không hợp lệ",
  noUpgrade: "Không nâng cấp được", notReady: "Nhà chưa xây xong", noTree: "Không có cây đó", villagerCap: "Đủ dân rồi", notRipe: "Ô này chưa chín",
};

export const button = (act: string, label: string, key = "", attrs = ""): string => `<button data-act="${act}"${attrs}>${label}${key === "" ? "" : `<kbd>${key}</kbd>`}</button>`;

export const seg = (label: string, act: string, values: readonly string[], labels: readonly string[], current: string): string =>
  `<div class="td-row"><small>${label}</small>${values.map((value, k) => button(act + ":" + value, labels[k]!, "", value === current ? ' class="is-on"' : "")).join("")}</div>`;

const stat = (label: string, value: string): string => `<span class="td-stat"><small>${label}</small><b>${value}</b></span>`;

/** Pause and sound; the resources and lives (BUILD_1A6 §9); "Ngày 2 · 0:41", "Đêm 2 · còn 12 quái" or dawn; the early night call's gold (§2). */
export function statusHtml(w: World, sandbox: boolean, paused: boolean, muted: boolean, notices: readonly string[]): string {
  const left = Math.max(0, Math.ceil((w.phaseEnd - w.tick) / TICK_HZ));
  const clock = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
  const enemies = w.enemies.count + w.spawnQueue.length;
  const phase = w.phase === "day" ? `Ngày ${w.day} · ${clock}` : w.phase === "night" ? `Đêm ${w.day} · còn ${enemies} quái` : w.phase === "dawn" ? `Bình minh ${w.day}` : "Thua";
  return (
    `<div class="td-row"><span class="td-title"><b>Typing Defense</b>${sandbox ? "<small>Hộp cát · bản thử 1A.6</small>" : ""}</span>` +
    button("pause", paused ? "▶" : "Ⅱ", "", ' class="td-x" title="Tạm dừng (Pause)"') + button("mute", muted ? "<s>Âm</s>" : "Âm", "", ' class="td-x"') + (sandbox ? button("sandbox", "F9", "", ' class="td-x" title="Hộp cát"') : "") + "</div>" +
    `<div class="td-row">${stat("Vàng", String(Math.floor(w.gold / 1000)))}${stat("Gỗ", String(w.wood))}${stat("Lúa", String(w.food))}${stat("Hạt", String(w.seeds))}${stat("Mạng", String(w.lives))}</div>` +
    `<p class="td-phase"><b>${phase}</b></p>` +
    (w.phase === "defeat" ? `<p class="td-warn">Lũy đã mất hết mạng</p>` : w.phase === "day" ? button("night", `Gọi đêm sớm · +${earlyCallBonus(w)} vàng`, "⇧ Enter", ' class="td-call"') : "") +
    notices.map((notice) => `<p class="td-warn">${notice}</p>`).join("")
  );
}

/** The compact word strip (TK 23.4): the locked word, its typed part in jade, or a note; the chain and its tier. */
export function stripHtml(w: World, note: string): string {
  const { router, deck, chain } = w.typing;
  const word = router.lock >= 0 ? wordText(deck, w.words.word[router.lock]!) : "";
  const typed = router.lock >= 0 ? w.words.typed[router.lock]! : 0;
  let main = `<em>Gõ chữ đầu của một thẻ để khóa từ</em>`;
  if (note !== "") main = `<em class="td-warn">${note}</em>`;
  else if (router.lock >= 0) main = `<b class="td-word"><span>${word.slice(0, typed)}</span>${word.slice(typed)}</b>`;
  else if (router.group >= 0) main = `<b class="td-word">${String.fromCharCode(97 + router.group)}…</b>`;
  const pips = [1, 2, 3, 4].map((tier) => `<i${tier <= chainTier(chain) ? ' class="on"' : ""}></i>`).join("");
  return main + `<span class="td-chain" title="Bậc Chuỗi ${chainTier(chain)}">Chuỗi <b>${chain}</b>${pips}</span>`;
}

export const actionsHtml = (): string => button("build", "Xây", "Insert / \\") + button("hire", "Thuê dân", "⇧ \\");

export class Hud {
  private readonly panels: HTMLElement[];
  private readonly html: string[] = [];

  constructor(root: HTMLElement, act: (action: string) => void) {
    this.panels = PANELS.map((name) => root.appendChild(Object.assign(document.createElement("div"), { className: "td-panel td-" + name })));
    root.addEventListener("pointerdown", (event) => {
      const target = (event.target as Element).closest<HTMLButtonElement>("button[data-act]");
      if (target === null || target.disabled || event.button !== 0) return;
      event.preventDefault();
      act(target.dataset.act!);
    });
  }

  update(html: readonly string[]): void {
    html.forEach((text, k) => {
      if (text === this.html[k]) return;
      this.html[k] = text;
      this.panels[k]!.innerHTML = text;
    });
  }
}
