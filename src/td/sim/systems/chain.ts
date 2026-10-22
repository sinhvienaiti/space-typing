/**
 * The chain (docs/td/TYPING_DEFENSE_DESIGN.md 6.8; BUILD_1A6 §5.4): one
 * count for the whole run. A word that is not sloppy adds 1, a sloppy one
 * halves it, and nothing else touches it: a call ignored, dimmed or closed
 * costs nothing. Its tier multiplies a whole Perfect call's bonus.
 */
import { CHAIN } from "../../content/rules";
import type { Grade } from "../../content/types";
import type { World } from "../world";

export function chainTier(chain: number): number {
  let tier = 0;
  for (let index = 1; index < CHAIN.tiers.length; index += 1) if (chain >= CHAIN.tiers[index]!.from) tier = index;
  return tier;
}

export const chainMul = (chain: number): number => CHAIN.tiers[chainTier(chain)]!.mul;

/** A finished word's grade moves the chain. */
export function chainStep(w: World, grade: Grade): void {
  const before = w.typing.chain;
  const value = grade === "sloppy" ? Math.floor(before / 2) : before + CHAIN.good;
  if (value === before) return;
  w.typing.chain = value;
  const callout = CHAIN.callouts.some((mark) => before < mark && value >= mark);
  w.events.rare.push({ t: "chain", tick: w.tick, chain: value, tier: chainTier(value), callout });
}
