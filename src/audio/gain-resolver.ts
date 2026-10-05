import { clamp } from "../logic";
import type { AudioFocusReason } from "./focus-manager";

export type GainInput = Readonly<{
  masterPreference?: number;
  parentPreference?: number;
  childPreference?: number;
  publishedDefault?: number;
  busCalibration?: number;
  assetTrim?: number;
  eventGain?: number;
  focusGain?: number;
  transitionGain?: number;
  policyCap?: number;
}>;

export function finiteGain(value: number | undefined, fallback = 1): number {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(value, 0, 2)
    : fallback;
}

export function effectivePreference(
  saved: number | undefined,
  publishedDefault: number,
): number {
  return finiteGain(saved, finiteGain(publishedDefault, 1));
}

/** Each documented factor is applied exactly once. Explicit zero is preserved. */
export function resolveGain(input: GainInput): number {
  const preference = effectivePreference(input.childPreference, input.publishedDefault ?? 1);
  const uncapped =
    finiteGain(input.masterPreference, 1) *
    finiteGain(input.parentPreference, 1) *
    preference *
    finiteGain(input.busCalibration, 1) *
    finiteGain(input.assetTrim, 1) *
    finiteGain(input.eventGain, 1) *
    finiteGain(input.focusGain, 1) *
    finiteGain(input.transitionGain, 1);
  const cap = finiteGain(input.policyCap, 1);
  return Math.min(cap, Math.max(0, uncapped));
}

/** Focus reasons compete by strongest attenuation; they are not multiplied. */
export function resolveFocusGain(
  reasons: readonly AudioFocusReason[],
  targets: Partial<Record<AudioFocusReason, number>>,
): number {
  let result = 1;
  for (const reason of reasons) {
    const target = targets[reason];
    if (typeof target !== "number" || !Number.isFinite(target)) continue;
    result = Math.min(result, clamp(target, 0, 1));
  }
  return result;
}
