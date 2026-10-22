/**
 * The bot report of `pnpm td:balance` (docs/td/BUILD_NOW.md §6.3; BUILD_1A6 §12 gates 3–7). The standard plan
 * (tests/td/policies: farm, marked trees, towers, barracks, the rich mine, the Bastion raised with gold, upgrades;
 * the hero where calls gather by day, at the towers by night) plays the sandbox on the real vocabulary, each seed
 * twice: typing at 35 WPM, 95 % (eyes 0.35–0.6 s late, a Backspace after 30 % of slips), and never typing; in each
 * mode. The report prints Markdown in Vietnamese: the gates, typing by day and night, the 20 s window at its
 * fullest, what became of the calls, what was earned day by day, the modes side by side, and the step's cost.
 * `gates` is what tests/td-balance-gates.test.ts holds; the report itself never fails a build.
 */
import { MODES } from "../../src/td/content/rules";
import type { Mode } from "../../src/td/content/types";
import { earned, runBot, type BotRun, type CallTally, type Earned } from "./bot";
import type { HandsSpec } from "./keystrokes";
import { heroDay, heroNight } from "./policies/hero";
import { STANDARD } from "./policies/layouts";
import { Plan } from "./policies/stand";
import { loadedWorld, stepCost } from "./perf";
import { realDeck } from "./typing";

export type ReportOptions = { seeds: number; nights: number; modes?: readonly Mode[] };

export const HANDS: HandsSpec = { wpm: 35, accuracy: 0.95, backspace: 0.3 };
export const MODE_NAMES: Record<Mode, string> = { relax: "Thư giãn", balanced: "Cân bằng", challenge: "Thử thách", learn: "Học" };
/** §12 gate 7: what is compared after this many days (at the third nightfall). */
export const AFTER_DAYS = 3;

/** One bot's runs over the report's seeds in one mode. */
export type Runs = { mode: Mode; typing: boolean; runs: BotRun[] };

export function play(mode: Mode, typing: boolean, seeds: number, nights: number): Runs {
  const deck = realDeck();
  const runs = Array.from({ length: seeds }, (_, k) => runBot({
    seed: k + 1, deck, hands: typing ? HANDS : null, expected: 35, mode, nights, check: true, timeSteps: true,
    plan: () => new Plan(STANDARD, [heroDay(), heroNight()]),
  }));
  return { mode, typing, runs };
}

const sum = (runs: readonly BotRun[], pick: (run: BotRun) => number): number => runs.reduce((total, run) => total + pick(run), 0);
/** Typing share by day and by night over every seed (ticks with a lock / ticks of the phase). */
export const shares = (r: Runs): [number, number] => [sum(r.runs, (run) => run.typedTicks[0]) / sum(r.runs, (run) => run.phaseTicks[0]), sum(r.runs, (run) => run.typedTicks[1]) / Math.max(1, sum(r.runs, (run) => run.phaseTicks[1]))];
/** The fullest 20 s window of any seed, in seconds. */
export const windowMax = (r: Runs): number => Math.max(...r.runs.map((run) => run.windowMax)) / 60;
const total = (e: Earned | undefined): number => (e === undefined ? NaN : e.gold + e.wood + e.food);
/** Gold + wood + food earned by the third nightfall, the mean over the seeds. */
export const earnedAfter = (r: Runs): number => sum(r.runs, (run) => total(run.atNightfall[AFTER_DAYS])) / r.runs.length;
export const survived = (r: Runs, nights: number): boolean => r.runs.every((run) => !run.defeat && run.stats.wavesCleared >= nights);

export type Gate = { id: string; name: string; target: string; measured: string; pass: boolean };

/** BUILD_1A6 §12 gates 4, 5, 6 (as the runs check them) and 7, from the balanced runs. */
export function gates(typing: Runs, idle: Runs, nights: number, mode: Mode = "balanced"): Gate[] {
  const [day, night] = shares(typing);
  const window = windowMax(typing);
  const ratio = earnedAfter(typing) / earnedAfter(idle);
  const pct = (value: number) => (100 * value).toFixed(1) + " %";
  const problems = [...typing.runs, ...idle.runs].reduce((n, run) => n + run.problems.length + run.rejected.length, 0);
  return [
    { id: "4", name: "Bot không gõ qua Đêm 1–" + nights + " (" + MODE_NAMES[mode] + ", mọi seed)", target: "không thua", measured: "mạng " + idle.runs.map((run) => (run.defeat ? "thua" : run.world.lives)).join(" / "), pass: survived(idle, nights) },
    { id: "5a", name: "Bot gõ 35 WPM 95 %: giây gõ trong mọi cửa sổ 20 s", target: "≤ 8 s", measured: window.toFixed(2) + " s", pass: window <= 8 + 1e-9 },
    { id: "5b", name: "Tỉ lệ gõ ban Ngày", target: "30–45 %", measured: pct(day), pass: day >= 0.3 && day <= 0.45 },
    { id: "5c", name: "Tỉ lệ gõ ban Đêm", target: "15–25 %", measured: pct(night), pass: night >= 0.15 && night <= 0.25 },
    { id: "6", name: "Bất biến lời gọi mỗi tick, lệnh bị từ chối", target: "0", measured: String(problems), pass: problems === 0 },
    { id: "7", name: "Vàng + Gỗ + Lúa làm ra sau " + AFTER_DAYS + " Ngày: gõ / không gõ", target: "≥ +25 %", measured: earnedAfter(typing).toFixed(0) + " / " + earnedAfter(idle).toFixed(0) + " = " + (ratio >= 1 ? "+" : "") + pct(ratio - 1), pass: ratio >= 1.25 },
  ];
}

const pct0 = (value: number): string => (Number.isFinite(value) ? Math.round(100 * value) + " %" : "–");
const mean = (runs: readonly BotRun[], pick: (run: BotRun) => number, digits = 1): string => (sum(runs, pick) / runs.length).toFixed(digits);

function callsLine(name: string, c: CallTally): string {
  return `| ${name} | ${c.made} | ${c.bright} | ${c.typed} | ${c.finished} | ${c.perfect} | ${c.ignored} | ${c.dark} |`;
}

const tallySum = (runs: readonly BotRun[], pick: (run: BotRun) => CallTally | undefined): CallTally => {
  const out: CallTally = { made: 0, bright: 0, typed: 0, finished: 0, perfect: 0, ignored: 0, dark: 0 };
  for (const run of runs) {
    const c = pick(run);
    if (c !== undefined) for (const key of Object.keys(out) as (keyof CallTally)[]) out[key] += c[key];
  }
  return out;
};

const KIND_NAMES = ["Bắn mạnh", "Xây", "Gặt", "Chặt", "Đào", "Hỏi bài"];

export function balanceReport(options: ReportOptions, print: (text: string) => void): Gate[] {
  const { seeds, nights } = options;
  const modes = options.modes ?? (["relax", "balanced", "challenge", "learn"] as const);
  const all = new Map<Mode, [Runs, Runs]>(modes.map((mode) => [mode, [play(mode, true, seeds, nights), play(mode, false, seeds, nights)]]));
  const [typing, idle] = all.get("balanced") ?? [play("balanced", true, seeds, nights), play("balanced", false, seeds, nights)];
  const result = gates(typing, idle, nights);
  print(`## Typing Defense 1A.6 R3: báo cáo bot (${seeds} seed, ${nights} đêm, sandbox, từ vựng thật)\n`);
  print("Bot gõ: 35 WPM, 95 % mỗi phím, 30 % lần trượt có Backspace; mắt thấy từ mới sau 0,35–0,6 s, từ kế của lời gọi đang khóa sau 0,15–0,3 s, nhớ từ Hỏi bài sau 0,8–1,6 s. Bot không gõ: cùng kế hoạch, không phím chữ nào. Kế hoạch chuẩn (`tests/td/policies`): Ruộng cạnh rừng đông nam, Tháp Cung và Trại Lính ở khúc nhập, Mỏ ★★★ N1, Lũy cấp 2 rồi 3 trả bằng Vàng và Gỗ, Tháp Cung đường đông, Tháp Pháo, nâng cấp; đánh dấu cây theo cụm, tối đa 4 dân, bán Lúa quá 20; Tướng ban Ngày tới chỗ lời gọi tụ nhiều nhất (lệnh như Tab + Enter), ban Đêm tới tháp có quái và lời gọi Bắn mạnh; không gọi Đêm sớm.\n");
  print("### Cổng `BUILD_1A6.md` §12 (Cân bằng)\n");
  print("| Cổng | Nội dung | Mục tiêu | Đo được | Kết quả |");
  print("|---|---|---|---|---|");
  for (const gate of result) print(`| ${gate.id} | ${gate.name} | ${gate.target} | ${gate.measured} | ${gate.pass ? "Đạt" : "**Hỏng**"} |`);

  print("\n### Cân bằng: từng bot\n");
  print("| Bot | Đêm qua | Mạng | Gõ Ngày | Gõ Đêm | Cửa sổ 20 s đầy nhất | Từ gõ | Lời gọi Hoàn hảo | Làm ra sau 3 Ngày (V + G + L) |");
  print("|---|---|---|---|---|---|---|---|---|");
  for (const r of [typing, idle]) {
    const [day, night] = shares(r);
    print(`| ${r.typing ? "Gõ 35 WPM, 95 %" : "Không gõ"} | ${mean(r.runs, (run) => run.stats.wavesCleared)} | ${mean(r.runs, (run) => run.world.lives)} | ${pct0(day)} | ${pct0(night)} | ${windowMax(r).toFixed(2)} s | ${mean(r.runs, (run) => run.stats.callWords, 0)} | ${mean(r.runs, (run) => run.stats.callsPerfect, 0)} | ${earnedAfter(r).toFixed(0)} |`);
  }
  print("\nTỉ lệ gõ theo Ngày (bot gõ, mọi seed): " + Array.from({ length: nights }, (_, k) => k + 1).map((d) => {
    const pick = (f: (b: BotRun["byDay"][number]) => number) => sum(typing.runs, (run) => (run.byDay[d] ? f(run.byDay[d]!) : 0));
    return `Ngày ${d} ${pct0(pick((b) => b.dayTyped) / pick((b) => b.dayTicks))}, Đêm ${d} ${pct0(pick((b) => b.nightTyped) / Math.max(1, pick((b) => b.nightTicks)))}`;
  }).join(" · ") + ".");

  print("\n### Lời gọi (Cân bằng, cộng mọi seed): tạo, từng sáng, có gõ, gõ xong việc, Hoàn hảo, sáng mà bỏ qua, chưa từng sáng\n");
  print("| Bot · loại | Tạo | Sáng | Có gõ | Gõ xong | Hoàn hảo | Bỏ qua | Không sáng |");
  print("|---|---|---|---|---|---|---|---|");
  for (const r of [typing, idle]) {
    print(callsLine(r.typing ? "**Gõ**" : "**Không gõ**", tallySum(r.runs, (run) => run.calls)));
    KIND_NAMES.forEach((kind, k) => {
      const c = tallySum(r.runs, (run) => run.callsByKind[k]);
      if (c.made > 0) print(callsLine(kind, c));
    });
  }

  print("\n### Làm ra mỗi Ngày (Cân bằng, trung bình seed; Ngày n là từ sáng Ngày n tới sáng Ngày n + 1, gồm Đêm n)\n");
  print("| Bot | Ngày | Vàng | Gỗ | Lúa | Tri thức |");
  print("|---|---|---|---|---|---|");
  for (const r of [typing, idle]) {
    for (let d = 1; d <= nights; d += 1) {
      const delta = (pick: (e: Earned) => number) => (sum(r.runs, (run) => pick(run.atDawn[d + 1] ?? earned(run.world)) - pick(run.atDawn[d]!)) / r.runs.length).toFixed(1);
      print(`| ${r.typing ? "Gõ" : "Không gõ"} | ${d} | ${delta((e) => e.gold)} | ${delta((e) => e.wood)} | ${delta((e) => e.food)} | ${delta((e) => e.knowledge)} |`);
    }
  }

  print("\n### Theo chế độ (mỗi chế độ " + seeds + " seed, " + nights + " đêm)\n");
  print("| Chế độ | Bot | Đêm qua | Mạng | Gõ Ngày | Gõ Đêm | Cửa sổ 20 s đầy nhất (trần) | Làm ra sau 3 Ngày | Gõ hơn không gõ |");
  print("|---|---|---|---|---|---|---|---|---|");
  for (const [mode, [t, i]] of all) {
    for (const r of [t, i]) {
      const [day, night] = shares(r);
      const plus = r.typing ? (earnedAfter(t) / earnedAfter(i) - 1 >= 0 ? "+" : "") + pct0(earnedAfter(t) / earnedAfter(i) - 1) : "";
      print(`| ${MODE_NAMES[mode]} | ${r.typing ? "Gõ" : "Không gõ"} | ${mean(r.runs, (run) => run.stats.wavesCleared)} | ${mean(r.runs, (run) => run.world.lives)} | ${pct0(day)} | ${pct0(night)} | ${windowMax(r).toFixed(2)} s (${MODES[mode].typeS} s) | ${earnedAfter(r).toFixed(0)} | ${plus} |`);
    }
  }

  const steps = [...all.values()].flat().flatMap((r) => r.runs).map((run) => run.stepMs!).filter(Boolean);
  const loaded = stepCost(loadedWorld(300, 200), 300, 100);
  print("\n### Giá một bước sim (Node " + process.version + ")\n");
  print(`- Trong các lượt bot: trung bình ${(steps.reduce((s, x) => s + x.mean, 0) / steps.length).toFixed(4)} ms, p95 cao nhất ${Math.max(...steps.map((x) => x.p95)).toFixed(4)} ms, chậm nhất ${Math.max(...steps.map((x) => x.max)).toFixed(3)} ms.`);
  print(`- Tải §12 cổng 3 (300 quái, 200 đạn, 10 nhà, 4 Ruộng, 9 dân, 20 cây, ban Đêm): trung vị ${loaded.median.toFixed(4)} ms, p95 ${loaded.p95.toFixed(4)} ms (mục tiêu ≤ 0,5 ms).`);
  const broken = [...all.values()].flat().flatMap((r) => r.runs).flatMap((run) => [...run.problems, ...run.rejected]);
  print(`\nBất biến vỡ và lệnh bị từ chối (mọi chế độ): ${broken.length === 0 ? "không có" : broken.slice(0, 5).join("; ")}.`);
  return result;
}
