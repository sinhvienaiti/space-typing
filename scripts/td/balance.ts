/**
 * `pnpm td:balance` (docs/td/BUILD_NOW.md §6.3): bots play the 1A sandbox and
 * the report (tests/td/balance.ts) prints as Markdown. Never fails a build.
 *   node --import tsx scripts/td/balance.ts [--seeds=3] [--waves=6]
 */
import { balanceReport } from "../../tests/td/balance";

const arg = (name: string, fallback: number): number => Number(process.argv.find((a) => a.startsWith("--" + name + "="))?.split("=")[1] ?? fallback);
const started = performance.now();
balanceReport({ seeds: arg("seeds", 3), waves: arg("waves", 6) }, (text) => console.log(text));
console.log(`_${((performance.now() - started) / 1000).toFixed(1)} s, Node ${process.version}._`);
