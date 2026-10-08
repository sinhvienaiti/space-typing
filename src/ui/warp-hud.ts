import { WARP_POLICY, type WarpCharge } from "../economy/warp-charge";

/** Pure display projection of already-reconciled account state, never a second wallet. */
export function warpHudView(warp: WarpCharge) {
  const activeFull = warp.current === WARP_POLICY.activeCap;
  const full = activeFull && warp.reserve === WARP_POLICY.reserveCap;
  const seconds = Math.ceil((activeFull
    ? WARP_POLICY.reserveMs - warp.reserveProgressMs
    : WARP_POLICY.activeMs - warp.activeProgressMs) / 1000);
  const countdown = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return {
    balance: `${warp.current} / ${WARP_POLICY.activeCap}`,
    reserve: `Reserve ${warp.reserve} / ${WARP_POLICY.reserveCap}`,
    regen: full ? "Storage full" : `${activeFull ? "Reserve" : "Warp"} +1 · ${countdown}`,
    value: warp.current,
    low: warp.current + (warp.reserveConsent ? warp.reserve : 0) < WARP_POLICY.cost,
  };
}

export function warpRefuelView(warp: WarpCharge, crystals: number) {
  const price = WARP_POLICY.prices[warp.refills];
  const room = WARP_POLICY.activeCap + WARP_POLICY.reserveCap - warp.current - warp.reserve;
  const active = Math.min(WARP_POLICY.activeCap - warp.current, WARP_POLICY.fuel);
  const reason = price === undefined ? "All 3 daily refills used · reset 04:00 Vietnam"
    : room < WARP_POLICY.fuel ? "Need room for all 20 Warp"
    : crystals < price ? `Need ${price} Star Crystals · you have ${crystals}` : "";
  return {
    disabled: !!reason,
    label: price === undefined ? "Refuel · daily limit" : `Refuel +20 · ${price} SC`,
    detail: reason || `Star Crystals ${crystals} · Active +${active} · Reserve +${WARP_POLICY.fuel - active}`,
  };
}
