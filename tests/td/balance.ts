/**
 * The bot report of `pnpm td:balance` (docs/td/BUILD_NOW.md §6.3; BUILD_1A6 §12 gates 4, 5, 7), cut to step
 * 1A.6 R1: the balanced plan plays the sandbox on the real vocabulary, a few seeds, once typing (35 WPM, 95 %)
 * and once never typing; the report prints Markdown tables in Vietnamese: nights held, lives, the three
 * resources at the end, the typing share by day and by night. R3 grows the bots and the gates. It never fails a build.
 */
import { runBot, type BotRun } from "./bot";
import { followCalls } from "./policies/hero";
import { BALANCED } from "./policies/layouts";
import { Plan } from "./policies/stand";
import { realDeck } from "./typing";

export type ReportOptions = { seeds: number; nights: number };

const pct = (part: number, whole: number): string => (whole > 0 ? Math.round((100 * part) / whole) + " %" : "–");

function row(name: string, runs: readonly BotRun[]): string {
  const sum = (pick: (run: BotRun) => number) => runs.reduce((total, run) => total + pick(run), 0);
  const mean = (pick: (run: BotRun) => number) => (sum(pick) / runs.length).toFixed(1);
  return `| ${name} | ${mean((run) => run.stats.wavesCleared)} | ${mean((run) => run.world.lives)} | ${mean((run) => run.world.gold / 1000)} | ${mean((run) => run.world.wood)} | ${mean((run) => run.world.food)} | ${mean((run) => run.stats.callWords)} | ${pct(sum((run) => run.typedTicks[0]), sum((run) => run.phaseTicks[0]))} | ${pct(sum((run) => run.typedTicks[1]), sum((run) => run.phaseTicks[1]))} |`;
}

export function balanceReport(options: ReportOptions, print: (text: string) => void): void {
  const deck = realDeck();
  const play = (hands: boolean) => Array.from({ length: options.seeds }, (_, k) => runBot({
    seed: k + 1, deck, hands: hands ? { wpm: 35, accuracy: 0.95, backspace: 0.3 } : null, expected: 35,
    plan: () => new Plan(BALANCED, [followCalls()]), nights: options.nights, check: true,
  }));
  const [typing, idle] = [play(true), play(false)];
  print(`## Typing Defense 1A.6 R1: bot Cân bằng, ${options.seeds} seed, ${options.nights} đêm\n`);
  print("| Bot | Đêm qua | Mạng | Vàng | Gỗ | Lúa | Từ gõ | Gõ ban ngày | Gõ ban đêm |");
  print("|---|---|---|---|---|---|---|---|---|");
  print(row("Gõ 35 WPM, 95 %", typing));
  print(row("Không gõ", idle));
  const problems = [...typing, ...idle].flatMap((run) => [...run.problems, ...run.rejected]);
  print(`\nBất biến vỡ và lệnh bị từ chối: ${problems.length === 0 ? "không có" : problems.slice(0, 5).join("; ")}.`);
}
