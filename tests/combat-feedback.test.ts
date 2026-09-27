import { describe, expect, it } from "vitest";
import {
  advanceKillScorePopups,
  killScorePopupOpacity,
  scorePopupSafeY,
  SCORE_POPUP_FLOAT_DISTANCE,
  SCORE_POPUP_PROTECTED_TOP_Y,
  type KillScorePopup,
} from "../src/combat/score-popup";

describe("combat feedback lifetimes", () => {
  it("fades and removes kill score popups after about two seconds", () => {
    const popup: KillScorePopup = {
      x: 100,
      y: 100,
      value: 250,
      life: 2,
      maxLife: 2,
    };
    const popups = [popup];
    const initial = killScorePopupOpacity(popup);

    advanceKillScorePopups(popups, 1.2);
    expect(popups).toHaveLength(1);
    expect(popups[0]?.value).toBe(250);
    expect(killScorePopupOpacity(popups[0]!)).toBeLessThan(initial);

    advanceKillScorePopups(popups, 0.81);
    expect(popups).toHaveLength(0);
  });

  it("keeps score popup travel below the protected top learning zone", () => {
    const safeY = scorePopupSafeY(40, 720);
    expect(safeY).toBeGreaterThanOrEqual(
      SCORE_POPUP_PROTECTED_TOP_Y + SCORE_POPUP_FLOAT_DISTANCE,
    );
    expect(safeY - SCORE_POPUP_FLOAT_DISTANCE).toBeGreaterThanOrEqual(
      SCORE_POPUP_PROTECTED_TOP_Y,
    );

    const bottomClamped = scorePopupSafeY(900, 720);
    expect(bottomClamped).toBeLessThan(720);
    expect(bottomClamped).toBeGreaterThanOrEqual(safeY);
  });


});
