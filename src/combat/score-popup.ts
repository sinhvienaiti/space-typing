export const SCORE_POPUP_PROTECTED_TOP_Y = 148;
export const SCORE_POPUP_FLOAT_DISTANCE = 26;
export const SCORE_POPUP_BOTTOM_MARGIN = 72;

export type KillScorePopup = {
  x: number;
  y: number;
  value: number;
  life: number;
  maxLife: number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function scorePopupSafeY(
  requestedY: number,
  canvasHeight: number,
): number {
  const safeMax = Math.max(
    SCORE_POPUP_PROTECTED_TOP_Y,
    canvasHeight - SCORE_POPUP_BOTTOM_MARGIN,
  );
  const safeMin = Math.min(
    safeMax,
    SCORE_POPUP_PROTECTED_TOP_Y + SCORE_POPUP_FLOAT_DISTANCE,
  );
  return Math.max(safeMin, Math.min(safeMax, requestedY));
}

export function killScorePopupOpacity(popup: KillScorePopup): number {
  const ratio = clamp01(popup.life / Math.max(0.001, popup.maxLife));
  return Math.min(1, ratio * 1.55);
}

export function advanceKillScorePopups(
  popups: KillScorePopup[],
  dt: number,
): void {
  let live = 0;
  for (const popup of popups) {
    popup.life -= dt;
    if (popup.life > 0) popups[live++] = popup;
  }
  popups.length = live;
}

export function drawKillScorePopup(
  context: CanvasRenderingContext2D,
  popup: KillScorePopup,
): void {
  const alpha = killScorePopupOpacity(popup);
  if (alpha <= 0) return;

  const progress =
    1 - clamp01(popup.life / Math.max(0.001, popup.maxLife));
  const y = popup.y - progress * SCORE_POPUP_FLOAT_DISTANCE;

  context.save();
  context.globalAlpha = alpha;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font =
    "800 17px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.lineWidth = 4;
  context.strokeStyle = "rgba(4, 8, 20, 0.82)";
  context.fillStyle = "#ffe48a";
  const label = "+" + String(Math.max(0, Math.round(popup.value)));
  context.strokeText(label, popup.x, y);
  context.fillText(label, popup.x, y);
  context.restore();
}
