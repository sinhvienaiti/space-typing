/**
 * The chain (docs/td/TYPING_DEFENSE_DESIGN.md 6.8): one count for the whole
 * run. A Flash, Perfect or Good word adds 1 and an Ok word keeps it; a
 * sloppy word, or one that expires touched, halves it; one that expires
 * untouched costs 2, so dropping a word on purpose is cheap. Its tier gives
 * r_c, Flow's share. Losses wait out the order grace and a frozen pause.
 */
import { CHAIN } from "../../content/rules";
import type { Grade } from "../../content/types";
import type { World } from "../world";
import { penaltyFree } from "./heat";

export function chainTier(chain: number): number {
  let tier = 0;
  for (let index = 1; index < CHAIN.tiers.length; index += 1) if (chain >= CHAIN.tiers[index]!.from) tier = index;
  return tier;
}

export const chainRc = (chain: number): number => CHAIN.tiers[chainTier(chain)]!.rc;

function setChain(w: World, value: number): void {
  const before = w.typing.chain;
  if (value === before) return;
  w.typing.chain = value;
  const callout = CHAIN.callouts.some((mark) => before < mark && value >= mark);
  w.events.rare.push({ t: "chain", tick: w.tick, chain: value, tier: chainTier(value), callout });
}

/** A finished word's grade; `expired` with `touched` for a word that ran out. */
export function chainStep(w: World, grade: Grade, touched = false): void {
  const chain = w.typing.chain;
  if (grade === "flash" || grade === "perfect" || grade === "good") setChain(w, chain + CHAIN.good);
  else if (penaltyFree(w) || grade === "ok" || grade === "cancelled") return;
  else if (grade === "sloppy" || touched) setChain(w, Math.floor(chain / 2));
  else setChain(w, Math.max(0, chain + CHAIN.untouchedExpire));
}
