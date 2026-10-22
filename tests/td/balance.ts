/**
 * The bot report of `pnpm td:balance` (docs/td/BUILD_NOW.md §6.3, TK 19.7):
 * bots play the sandbox waves on the real vocabulary, a few seeds each, and
 * the report prints Markdown tables in Vietnamese for the owner: words caught
 * by tempo and by E, load, damage a second by source, gold by source, lives,
 * letter jams by vocabulary level, 1–4 slots at 25–100 WPM, careful against
 * fast and sloppy, and the TK 19.7 targets beside what 1A can measure. It
 * never fails a build: balance is not a gate of 1A (BUILD_NOW §7).
 */
import { STORE, TEMPO } from "../../src/td/content/rules";
import type { StatName } from "../../src/td/sim/stats";
import { tempoIndex } from "../../src/td/typing/tempo";
import { runBot, type BotRun, type BotSpec } from "./bot";
import type { HandsSpec } from "./keystrokes";
import { heroOut, pendulum } from "./policies/hero";
import { ARCHER_MERGE, BALANCED, BALANCED_3, LAYOUT_GOLD, MINE_N1, MINES_ONLY, slotsLayout } from "./policies/layouts";
import { Plan, type Layout, type Rule } from "./policies/stand";
import { fullWorld, loadedWorld, stepCost } from "./perf";
import { densestTempo, fixedTempo, hintTempo, loadTempo, tempoByBuild } from "./policies/tempo";
import { realDeck } from "./typing";

export type ReportOptions = { seeds: number; waves: number };

/** A bot to play: everything of a run but the seed and the deck. */
type Bot = Omit<BotSpec, "seed" | "deck">;

/** Runs summed over seeds: counters add up, rates are taken on the sums. */
export type Totals = {
  runs: number;
  stats: Record<StatName, number>;
  battleTicks: number;
  combatTicks: number;
  loadSum: number;
  done: number[];
  missed: number[];
  waves: number;
  livesLeft: number;
  /** Lives summed over the runs that saw wave n end, and how many did. */
  livesAt: number[];
  reached: number[];
  defeats: number;
  problems: number;
  rejected: number;
};

const DAMAGE: readonly StatName[] = ["damageTower", "damageCrossbow", "damageSoldier", "damageWordShot", "damageHero"];
const GOLD: readonly StatName[] = ["goldKill", "goldProduce", "goldWord", "goldWave", "goldEarly"];

export function totalsOf(runs: readonly BotRun[]): Totals {
  const t: Totals = { runs: runs.length, stats: {} as Record<StatName, number>, battleTicks: 0, combatTicks: 0, loadSum: 0, done: [], missed: [], waves: 0, livesLeft: 0, livesAt: [], reached: [], defeats: 0, problems: 0, rejected: 0 };
  for (const run of runs) {
    for (const [name, value] of Object.entries(run.stats) as [StatName, number][]) t.stats[name] = (t.stats[name] ?? 0) + value;
    t.battleTicks += run.battleTicks;
    t.combatTicks += run.combatTicks;
    t.loadSum += run.loadSum;
    run.doneByTempo.forEach((n, k) => (t.done[k] = (t.done[k] ?? 0) + n));
    run.missedByTempo.forEach((n, k) => (t.missed[k] = (t.missed[k] ?? 0) + n));
    t.waves += run.stats.wavesCleared;
    t.livesLeft += run.world.lives;
    run.livesAtWaveEnd.forEach((lives, wave) => {
      t.livesAt[wave] = (t.livesAt[wave] ?? 0) + lives;
      t.reached[wave] = (t.reached[wave] ?? 0) + 1;
    });
    t.defeats += run.defeat ? 1 : 0;
    t.problems += run.problems.length;
    t.rejected += run.rejected.length;
  }
  return t;
}

export const hitRate = (t: Totals): number => t.stats.streamDone / Math.max(1, t.stats.streamDone + t.stats.streamMissed);
export const perfectRate = (t: Totals): number => t.stats.streamPerfect / Math.max(1, t.stats.streamDone);
export const meanLoad = (t: Totals): number => t.loadSum / Math.max(1, t.battleTicks);
const combatS = (t: Totals): number => Math.max(1, t.combatTicks) / 60;
const battleMin = (t: Totals): number => Math.max(1, t.battleTicks) / 3600;
export const dps = (t: Totals, stat: StatName): number => t.stats[stat] / combatS(t);
export const goldTotal = (t: Totals): number => GOLD.reduce((sum, stat) => sum + t.stats[stat], 0);
export const damageTotal = (t: Totals): number => DAMAGE.reduce((sum, stat) => sum + t.stats[stat], 0);
/** TK 19.1: damage counts 0.05 gold a hit point; per minute of battle. */
export const valuePerMin = (t: Totals): number => (goldTotal(t) + 0.05 * damageTotal(t)) / battleMin(t);
export const jamRate = (t: Totals): number => t.stats.jams / Math.max(1, t.stats.streamSpawned + t.stats.jams);

const num = (value: number, digits = 1): string => value.toLocaleString("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const pct = (value: number): string => Math.round(value * 100) + " %";
const row = (cells: readonly (string | number)[]): string => "| " + cells.join(" | ") + " |";
const table = (head: readonly string[], rows: readonly (readonly (string | number)[])[]): string =>
  [row(head), row(head.map(() => "---")), ...rows.map(row)].join("\n");

export const hands = (wpm: number, accuracy = 0.95): HandsSpec => ({ wpm, accuracy, backspace: 0.3 });
/** Rules keep state (a knob's last turn, the pendulum's last move), so every run makes its own from `rules`. */
const plan = (layout: Layout, rules: () => Rule[] = () => []) => () => new Plan(layout, rules());
const S = (seconds: number): number => tempoIndex(seconds);

export function createReport(options: ReportOptions) {
  const deck = realDeck();
  const cache = new Map<string, Totals>();
  /** `bot` on seeds 1..n, each run on a plan and rules of its own. */
  const runs = (bot: Bot): BotRun[] => Array.from({ length: options.seeds }, (_, k) => runBot({ ...bot, seed: k + 1, deck, check: true }));
  /** The runs of `bot` summed (cached by name). */
  const play = (name: string, bot: Bot): Totals => {
    if (!cache.has(name)) cache.set(name, totalsOf(runs(bot)));
    return cache.get(name)!;
  };
  const waves = options.waves;
  const oneSlot = (wpm: number, accuracy: number, rules?: () => Rule[]): Bot => ({ hands: hands(wpm, accuracy), plan: plan(slotsLayout(1), rules), waves });
  /** The balanced bot (BALANCED, the hero's pendulum, tempos for a load ≤ 110 % unless `rules` says otherwise), E its own speed. */
  const balanced = (h: HandsSpec | null, extra: Partial<Bot> = {}, layout = BALANCED, rules = (): Rule[] => [loadTempo(1.1)]): Bot => ({
    hands: h, plan: plan(layout, () => [pendulum(0, 2), ...rules()]), waves, expected: h?.wpm ?? 35, ...extra,
  });
  return { play, runs, played: () => [...cache.values()], oneSlot, balanced, deck, waves };
}

/** Words dealt at each tempo, slowest first: "6 s: 12 · 4 s: 30". */
const byTempo = (t: Totals): string =>
  TEMPO.map((tempo, k) => [tempo.periodS, (t.done[k] ?? 0) + (t.missed[k] ?? 0)] as const)
    .filter(([, n]) => n > 0)
    .map(([seconds, n]) => seconds + " s: " + n)
    .join(" · ");

/** Waves cleared, lives left after wave 3 (or the last wave played, when fewer), and the runs lost. */
const outcome = (t: Totals): string => {
  const wave = Math.min(3, t.reached.length - 1);
  const after = wave < 1 ? "" : " · sau đợt " + wave + " còn " + num((t.livesAt[wave] ?? 0) / Math.max(1, t.reached[wave] ?? 0), 1) + " mạng";
  return "qua " + num(t.waves / t.runs, 1) + " đợt" + after + (t.defeats > 0 ? " · thua " + t.defeats + "/" + t.runs : " · cuối còn " + num(t.livesLeft / t.runs, 1));
};

/** The whole report, section by section (`log` gets each line as it is ready). */
export function balanceReport(options: ReportOptions, log: (text: string) => void): void {
  const { play, played, oneSlot, balanced, waves } = createReport(options);
  log(`# Báo cáo bot Typing Defense 1A\n\nMỗi dòng: ${options.seeds} seed, tối đa ${waves} đợt hộp cát (Thường, từ vựng cấp 1–3 thật), gọi đợt kế ngay khi sân trống. Bot gõ: nhận ra từ mới sau 0,35–0,6 s, mỗi lúc một từ, từ gấp nhất trước (nhà có quái trong tầm trước 1 s), phím trượt sang phím bên cạnh theo độ chuẩn, 30 % lần trượt bấm Backspace. Bot không rời mắt khỏi thẻ chữ để nhìn bản đồ, nên tỉ lệ trúng là mức trần của người gõ cùng tốc. Chỉ in, không chặn (BUILD_NOW §6.3, §7).\n`);

  // 1. Tempo.
  const tempoRows = [6, 4, 3, 2, 1].map((s) => {
    const t = play("tempo " + s, oneSlot(35, 0.95, () => [fixedTempo(S(s))]));
    return [s + " s", pct(hitRate(t)), pct(perfectRate(t)), pct(meanLoad(t)), num(dps(t, "damageWordShot")), outcome(t)];
  });
  log("## 1. Trúng theo nhịp\n\nMột ô: Draconis ở Tháp Cung khúc nhập, bot 35 WPM, 95 %. TK 6.16: 3 s trúng 92 %.\n\n" + table(["Nhịp", "Trúng", "Hoàn hảo", "Tải", "Phát Chữ (sát thương/s)", "Kết quả"], tempoRows) + "\n");

  // 2. E.
  const eRows = [20, 25, 35, 50, 70, 100].map((wpm) => {
    const t = play("e " + wpm, oneSlot(wpm, 0.95));
    return [wpm, (wpm < 30 ? 6 : 4) + " s", pct(hitRate(t)), pct(meanLoad(t)), num(dps(t, "damageWordShot")), outcome(t)];
  });
  const hintRows = [25, 35].map((wpm) => {
    const t = play("hint " + wpm, oneSlot(wpm, 0.95, () => [hintTempo()]));
    return [wpm, byTempo(t), pct(hitRate(t)), pct(meanLoad(t)), num(dps(t, "damageWordShot")), outcome(t)];
  });
  log(
    "## 2. Trúng theo E (nhịp mặc định, nhịp theo gợi ý)\n\nMột ô, E = tốc bot, nhịp mặc định (6 s dưới 30 WPM, 4 s từ 30). TK 19.7: 25 WPM trúng ≥ 85 %.\n\n" +
      table(["E (WPM)", "Nhịp", "Trúng", "Tải", "Phát Chữ (sát thương/s)", "Kết quả"], eRows) +
      "\n\nCùng ô, bot vặn nhịp theo gợi ý của game (TK 6.2: sau 10 từ ở một nhịp, trúng ≥ 95 % thì dày một nấc, dưới 70 % thì thưa một nấc), bắt đầu ở nhịp mặc định:\n\n" +
      table(["E (WPM)", "Từ phát theo nhịp", "Trúng", "Tải", "Phát Chữ (sát thương/s)", "Kết quả"], hintRows) +
      "\n",
  );

  // 3. The balanced bot: load, damage and gold by source.
  const bal = play("balanced", balanced(hands(35)));
  const gold = goldTotal(bal);
  const share = (stat: StatName) => (gold > 0 ? bal.stats[stat] / gold : 0);
  log(
    "## 3. Bot Cân bằng 35 WPM, 95 %\n\nXây trải đều từ 220 Vàng (Tháp Cung và Trại Lính khúc nhập, mỏ N2, rồi tháp hai làn, Pháo, mỏ N3); Lũy cấp 2 từ đợt 3 (hộp cát); Draconis con lắc giữa tháp và mỏ khi có một ô, sau đó Chấm giữ mỏ; nhịp theo tải ≤ 110 %.\n\n" +
      `Tải trung bình ${pct(meanLoad(bal))} (TK 19.7: 85–110 %). Trúng ${pct(hitRate(bal))}. Kết quả: ${outcome(bal)}. Mất ${num(bal.stats.livesLost / bal.runs)} mạng.\n\n` +
      table(["Nguồn sát thương", "Sát thương/s khi có quái"], [["Tháp tự bắn", num(dps(bal, "damageTower"))], ["Nỏ Lũy", num(dps(bal, "damageCrossbow"))], ["Lính", num(dps(bal, "damageSoldier"))], ["Phát Chữ", num(dps(bal, "damageWordShot"))], ["Draconis", num(dps(bal, "damageHero"))]]) +
      "\n\n" +
      table(["Nguồn vàng", "Vàng/phút", "Tỉ lệ", "TK 17.3"], [
        ["Hạ quái", num(bal.stats.goldKill / battleMin(bal)), pct(share("goldKill")), "45–55 %"],
        ["Nhà tự sản", num(bal.stats.goldProduce / battleMin(bal)), pct(share("goldProduce")), "18–25 %"],
        ["Phần thưởng từ (Mỏ, Lũy)", num(bal.stats.goldWord / battleMin(bal)), pct(share("goldWord")), "18–28 %"],
        ["Thưởng đợt, gọi sớm", num((bal.stats.goldWave + bal.stats.goldEarly) / battleMin(bal)), pct(share("goldWave") + share("goldEarly")), "5–10 %"],
      ]) +
      "\n",
  );

  // 4. Slots × WPM.
  const slotRows: (string | number)[][] = [];
  const base = new Map<number, number>();
  for (const wpm of [25, 35, 50, 70, 100]) {
    for (const slots of [1, 2, 3, 4] as const) {
      const t = play("slots " + slots + " " + wpm, { hands: hands(wpm), plan: plan(slotsLayout(slots), () => [loadTempo(1.1)]), waves });
      if (slots === 1) base.set(wpm, valuePerMin(t));
      slotRows.push([wpm, slots, pct(hitRate(t)), pct(meanLoad(t)), num(dps(t, "damageWordShot")), num(damageTotal(t) / combatS(t)), num(t.stats.goldWord / battleMin(t)), num(valuePerMin(t)), "×" + num(valuePerMin(t) / base.get(wpm)!, 2), outcome(t)]);
    }
  }
  const l2 = play("slots 4 L2 35", { hands: hands(35), plan: plan({ ...slotsLayout(4), levels: 2 }, () => [loadTempo(1.1)]), waves });
  const out = play("hero out 35", { hands: hands(35), plan: plan({ ...slotsLayout(4), assign: [null, 0, 2, 4] }, () => [heroOut(0, 12), loadTempo(1.1)]), waves });
  log(
    "## 4. So sánh 1–4 ô\n\nCùng năm nhà (Tháp Cung khúc nhập, Pháo, Trại Lính, Tháp Cung làn đông, mỏ N1), đặt ngay bằng vàng hộp cát; 1 ô: Draconis ở Tháp Cung; 2: thêm Chấm ở mỏ; 3: Draconis ở Pháo, Chấm ở Tháp Cung, Phẩy ở mỏ; 4: Phẩy ở Trại Lính, Gạch ở mỏ. Nhịp theo tải ≤ 110 % (nhà không vừa nhịp nào thì Dừng: chỉ còn có mặt). Giá trị: (vàng + 0,05 × sát thương) mỗi phút trận (TK 19.1).\n\n" +
      table(["WPM", "Ô", "Trúng", "Tải", "Phát Chữ/s", "Tổng sát thương/s", "Vàng gõ/phút", "Giá trị/phút", "So với 1 ô", "Kết quả"], slotRows) +
      `\n\nThêm, 35 WPM, 4 ô: nhà L2 (hộp cát) → ${outcome(l2)}, trúng ${pct(hitRate(l2))}; Draconis ra trận ở khúc nhập (không trợ lực, ba Thư Đồng trợ lực) → ${outcome(out)}, Draconis ${num(dps(out, "damageHero"))} sát thương/s.\n`,
  );

  // 5. Careful against fast and sloppy.
  const careful = (wpm: number, accuracy: number, name: string) => [
    play(name + " 3s", oneSlot(wpm, accuracy, () => [fixedTempo(S(3))])),
    play(name + " 2 slots", { hands: hands(wpm, accuracy), plan: plan(slotsLayout(2), () => [loadTempo(1.1)]), waves }),
  ];
  const [c1, c2] = careful(35, 0.98, "careful");
  const [f1, f2] = careful(50, 0.85, "sloppy");
  const careRow = (label: string, t: Totals) => [label, pct(hitRate(t)), pct(perfectRate(t)), num(dps(t, "damageWordShot")), num(t.stats.goldWord / battleMin(t)), outcome(t)];
  log(
    "## 5. Chuẩn 35 WPM 98 % so với Nhanh ẩu 50 WPM 85 %\n\nTK 6.16: ở cùng nhịp 3 s, Chuẩn 35 / 98 % ≥ Nhanh ẩu 50 / 85 % (24,9 so với 21,9 sát thương/s).\n\n" +
      table(["Bot", "Trúng", "Hoàn hảo", "Phát Chữ/s", "Vàng gõ/phút", "Kết quả"], [
        careRow("Chuẩn 35 / 98 %, 1 ô 3 s", c1!), careRow("Nhanh ẩu 50 / 85 %, 1 ô 3 s", f1!), careRow("Chuẩn 35 / 98 %, 2 ô theo tải", c2!), careRow("Nhanh ẩu 50 / 85 %, 2 ô theo tải", f2!),
      ]) +
      "\n",
  );

  // 6. Letter jams by vocabulary level.
  const jamRows = [1, 3, 5].map((vocab) => {
    const t = play("jam " + vocab, { hands: hands(70, 0.97), plan: plan(slotsLayout(4), () => [fixedTempo(S(1))]), waves, expected: 35, vocab });
    return [vocab === 1 ? "1" : "1–" + vocab, t.stats.streamSpawned, t.stats.jams, pct(jamRate(t)), t.stats.fullDrops];
  });
  log("## 6. Nghẽn chữ theo cấp từ vựng\n\nBốn ô nhịp 1 s, E = 35, bot 70 WPM, 97 %. TK 19.7: cấp ≥ 5 dưới 1 % lần phát; cấp 1–3 chỉ báo cáo.\n\n" + table(["Cấp từ vựng", "Từ phát", "Nghẽn", "Tỉ lệ nghẽn", "Bỏ vì đầy"], jamRows) + "\n");

  // 7. TK 19.7.
  const none = play("no typing", balanced(null));
  const mines = play("mines only", balanced(hands(35), {}, MINES_ONLY));
  const dense = play("dense sloppy", balanced(hands(35), {}, BALANCED, () => [densestTempo()]));
  const fast = play("fast 70", balanced(hands(70, 0.98), {}, BALANCED_3));
  // "Như Cân bằng", "ở cùng tải": both play the balanced bot with E their own speed, so each takes the tempos of a load ≤ 110 %.
  const sloppy80 = play("sloppy 80", balanced(hands(80, 0.85)));
  const good50 = play("good 50", balanced(hands(50, 0.96)));
  // The same two at one tempo (3 slots, 3 s): not TK's condition, printed beside it.
  const sloppy80At3 = play("sloppy 80 at 3 s", { hands: hands(80, 0.85), plan: plan(slotsLayout(3), () => [fixedTempo(S(3))]), waves, expected: 80 });
  const good50At3 = play("good 50 at 3 s", { hands: hands(50, 0.96), plan: plan(slotsLayout(3), () => [fixedTempo(S(3))]), waves, expected: 50 });
  const spot = play("one spot", { ...balanced(hands(35)), plan: plan(BALANCED, () => [loadTempo(1.1)]) });
  const extra = { builds: [ARCHER_MERGE, MINE_N1], keep: [[1, 2]], gold: LAYOUT_GOLD } as const;
  const one = play("extra 1", { hands: hands(35), plan: plan({ ...extra, name: "1 ô", assign: [0] }, () => [tempoByBuild(new Map([[0, S(3)]]))]), waves });
  const two = play("extra 2", { hands: hands(35), plan: plan({ ...extra, name: "2 ô", assign: [0, 1] }, () => [tempoByBuild(new Map([[0, S(4)], [1, S(6)]]))]), waves });
  const over = play("extra 2 over", { hands: hands(35), plan: plan({ ...extra, name: "2 ô quá tải", assign: [0, 1] }, () => [tempoByBuild(new Map([[0, S(3)], [1, S(6)]]))]), waves });
  const novice = play("novice 20", oneSlot(20, 0.97, () => [fixedTempo(S(6))]));
  const e25 = play("e 25", oneSlot(25, 0.95));
  const jam5 = play("jam 5", { hands: hands(70, 0.97), plan: plan(slotsLayout(4), () => [fixedTempo(S(1))]), waves, expected: 35, vocab: 5 });
  const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);
  const verdict = (ok: boolean) => (ok ? "đạt" : "chưa đạt");
  const typedShare = fast.stats.goldWord / Math.max(1, goldTotal(fast));
  const rows: (string | number)[][] = [
    ["Cân bằng 35 WPM, 95 %", "Tải trung bình 85–110 %", pct(meanLoad(bal)), verdict(meanLoad(bal) >= 0.85 && meanLoad(bal) <= 1.1)],
    ["Cân bằng 35 WPM, 95 %", "Thắng bản đồ 1–3, 2–3 sao", outcome(bal), "chưa có sao, bản đồ ở 1A"],
    ["Mới học 20 WPM, 1 ô, 6 s", "Thắng bản đồ 1 ≥ 1 sao", outcome(novice), "chưa có sao ở 1A"],
    ["25 WPM, nhịp mặc định", "Trúng ≥ 85 %", pct(hitRate(e25)), verdict(hitRate(e25) >= 0.85)],
    ["Không gõ", "Vàng ≥ 70 % bot Cân bằng", pct(ratio(goldTotal(none) / battleMin(none), gold / battleMin(bal))) + " (vàng/phút)", verdict(goldTotal(none) / battleMin(none) >= 0.7 * (gold / battleMin(bal)))],
    ["Đứng Mỏ", "Thua Thường hoặc ≤ 1 sao", outcome(mines), "chưa có sao; xem số đợt"],
    ["Nhịp dày ẩu 35 WPM", "Kém Cân bằng về sát thương và vàng", "sát thương " + pct(ratio(damageTotal(dense) / combatS(dense), damageTotal(bal) / combatS(bal))) + ", vàng " + pct(ratio(goldTotal(dense) / battleMin(dense), gold / battleMin(bal))), verdict(damageTotal(dense) / combatS(dense) < damageTotal(bal) / combatS(bal) && goldTotal(dense) / battleMin(dense) < gold / battleMin(bal))],
    ["Nhanh ẩu 80 WPM, 85 %, như Cân bằng", "Không vượt 50 WPM 96 % về Phát Chữ ở cùng tải", pct(ratio(dps(sloppy80, "damageWordShot"), dps(good50, "damageWordShot"))) + " (tải " + pct(meanLoad(sloppy80)) + " và " + pct(meanLoad(good50)) + ")", verdict(dps(sloppy80, "damageWordShot") <= dps(good50, "damageWordShot"))],
    ["Như trên, 3 ô cùng nhịp 3 s", "(cùng nhịp, không cùng tải: chỉ để so)", pct(ratio(dps(sloppy80At3, "damageWordShot"), dps(good50At3, "damageWordShot"))) + " (tải " + pct(meanLoad(sloppy80At3)) + " và " + pct(meanLoad(good50At3)) + ")", "—"],
    ["Nhanh 70 WPM, 98 %, 3 ô", "Vàng 140–200 % Cân bằng; vàng gõ ≤ 45 %", pct(ratio(goldTotal(fast) / battleMin(fast), gold / battleMin(bal))) + ", gõ " + pct(typedShare), verdict(ratio(goldTotal(fast) / battleMin(fast), gold / battleMin(bal)) >= 1.4 && typedShare <= 0.45)],
    ["Ô thêm 35 WPM", "2 ô (4 s + 6 s) ≥ ×1,15 so với 1 ô (3 s)", "×" + num(ratio(valuePerMin(two), valuePerMin(one)), 2), verdict(valuePerMin(two) >= 1.15 * valuePerMin(one))],
    ["Ô thêm 35 WPM", "2 ô ở tải 120 % (3 s + 6 s) ≥ ×1,0", "×" + num(ratio(valuePerMin(over), valuePerMin(one)), 2) + " (tải " + pct(meanLoad(over)) + ")", verdict(valuePerMin(over) >= valuePerMin(one))],
    ["Đứng Một Chỗ", "Kém Cân bằng ≥ 15 % Phát Chữ", pct(ratio(dps(spot, "damageWordShot"), dps(bal, "damageWordShot"))), verdict(dps(spot, "damageWordShot") <= 0.85 * dps(bal, "damageWordShot"))],
    ["Nghẽn chữ", "4 ô 1 s, cấp ≥ 5: < 1 % lần phát", pct(jamRate(jam5)), verdict(jamRate(jam5) < 0.01)],
    ["Boss, Toàn tháp, Không lính, Treo máy", "TK 19.6", "—", "chưa có ở 1A"],
  ];
  log("## 7. Bảng mục tiêu TK 19.7 (không chặn ở 1A)\n\n" + table(["Bot", "Mục tiêu", "Đo", ""], rows) + "\n");

  // 8. Step time on this machine.
  const loads = [[() => loadedWorld(300, 200), "300 quái, 9 lính, 200 đạn, 10 nhà (cổng 1A)"], [fullWorld, STORE.enemies + " quái, 64 lính, " + STORE.projectiles + " đạn, 20 nhà (TK 25.12; bỏ trần nhà của 1A)"]] as const;
  const perfRows = loads.map(([make, label]) => {
    const cost = stepCost(make(), 600, 120);
    return [label, num(cost.median, 3) + " ms", num(cost.p95, 3) + " ms", num(cost.max, 3) + " ms"];
  });
  log("## 8. Thời gian một bước sim (máy chạy báo cáo)\n\nSố nhà không tính Lũy; 4 ô nhịp 1 s trên từ vựng thật. BUILD_NOW §7: ≤ 0,5 ms trên máy chủ dự án, ≤ 2 ms trên CI.\n\n" + table(["Tải", "Trung vị", "p95", "Chậm nhất"], perfRows) + "\n");

  const broken = played().reduce((sum, t) => sum + t.problems + t.rejected, 0);
  log(`Kiểm thêm: ${broken === 0 ? "không" : broken} lệnh bị từ chối hay bất biến chữ bị vỡ trong các lượt trên.\n`);
}
