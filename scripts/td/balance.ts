/**
 * `pnpm td:balance` (docs/td/BUILD_NOW.md §6.3, BUILD_1A6 §12): bots play the sandbox in every mode and the report
 * (tests/td/balance.ts) prints as Markdown, its gates first. Never fails a build (tests/td-balance-gates.test.ts does).
 *   node --import tsx scripts/td/balance.ts [--seeds=5] [--nights=4]
 */
import { balanceReport } from "../../tests/td/balance";

const arg = (name: string, fallback: number): number => Number(process.argv.find((a) => a.startsWith("--" + name + "="))?.split("=")[1] ?? fallback);
const started = performance.now();
balanceReport({ seeds: arg("seeds", 5), nights: arg("nights", 4) }, (text) => console.log(text));
console.log(`\n_${((performance.now() - started) / 1000).toFixed(1)} s, Node ${process.version}._`);
