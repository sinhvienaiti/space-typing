/**
 * The HUD (docs/td/BUILD_NOW.md §5.3, TK 23.5): paper panels, each written only
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
  water: "Không xây trên nước", road: "Sát đường quá", keep: "Trong vòng 11 m quanh Lũy", overlap: "Chạm nhà khác", rally: "Trại Lính phải gần đường",
  path: "Chặn lối đi", gold: "Thiếu vàng", noSlot: "Ô này còn khóa", tempoClosed: "Nhịp này chưa mở", notCounting: "Chưa gọi đợt được",
  undoWindow: "Hết 5 s hoàn tác", blocked: "Không đứng được ở đó", rallyFar: "Xa trại quá", rallyOffRoad: "Điểm tập kết phải ở đường",
  noBuilding: "Không có nhà đó", noBarracks: "Không phải Trại Lính", badValue: "Giá trị không hợp lệ", noSandbox: "Chỉ có trong hộp cát", badKey: "Phím không hợp lệ",
};

export const button = (act: string, label: string, key = "", attrs = ""): string => `<button data-act="${act}"${attrs}>${label}${key === "" ? "" : `<kbd>${key}</kbd>`}</button>`;

export const seg = (label: string, act: string, values: readonly string[], labels: readonly string[], current: string): string =>
  `<div class="td-row"><small>${label}</small>${values.map((value, k) => button(act + ":" + value, labels[k]!, "", value === current ? ' class="is-on"' : "")).join("")}</div>`;

const stat = (label: string, value: string): string => `<span class="td-stat"><small>${label}</small><b>${value}</b></span>`;

/** Pause and sound; lives, gold, the wave (n/N, n alone in the sandbox's endless waves past the list) and the count to the next; the early call's gold (TK 18.3). */
export function statusHtml(w: World, sandbox: boolean, paused: boolean, muted: boolean, notices: readonly string[]): string {
  const left = w.nextWaveAt >= 0 ? Math.ceil((w.nextWaveAt - w.tick) / TICK_HZ) : -1;
  const call = w.phase === "prep" ? "Bắt đầu đợt 1" : left >= 0 ? `Gọi đợt ${w.wave + 1} sớm · +${earlyCallBonus(w)} vàng` : "";
  const listed = w.c.content.waves.list.length;
  const wave = w.wave + (w.wave > listed ? "" : "/" + listed) + (left >= 0 ? ` <small>${left} s</small>` : "");
  return (
    `<div class="td-row"><span class="td-title"><b>Typing Defense</b>${sandbox ? "<small>Hộp cát · bản thử 1A</small>" : ""}</span>` +
    button("pause", paused ? "▶" : "Ⅱ", "", ' class="td-x" title="Tạm dừng (Pause)"') + button("mute", muted ? "<s>Âm</s>" : "Âm", "", ' class="td-x"') + (sandbox ? button("sandbox", "F9", "", ' class="td-x" title="Hộp cát"') : "") + "</div>" +
    `<div class="td-row">${stat("Mạng", String(w.lives))}${stat("Vàng", String(Math.floor(w.gold / 1000)))}${stat("Đợt", wave)}</div>` +
    (w.phase === "defeat" ? `<p class="td-warn">Lũy đã mất hết mạng</p>` : call === "" ? "" : button("wave", call, "⇧ Enter", ' class="td-call"')) +
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

export const actionsHtml = (w: World): string =>
  button("build", "Xây", "Insert") + (w.typing.allStopped ? button("restore", "Trả lại nhịp", "⇧ =") : button("stopAll", "Dừng tất cả", "⇧ −"));

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
