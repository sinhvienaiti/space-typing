import { describe, expect, it } from "vitest";
import html from "../index.html?raw";
import css from "../src/styles.css?raw";

describe("Stage clear desktop report presentation", () => {
  it("keeps the measured report in one wide dashboard with stable metric ids", () => {
    expect(html).toContain('id="stageClearOverlay"');
    expect(html).toContain('class="stage-results-dashboard"');
    expect(html).toContain('class="stage-results-overview"');
    expect(html).toContain('class="stage-results-detail-column"');
    expect(html).toContain('class="stage-results-footer"');

    for (const id of [
      "clearScore",
      "clearAccuracy",
      "clearWpm",
      "clearTime",
      "clearStreak",
      "clearKillRate",
      "clearCombatMetrics",
      "clearTypingMetrics",
      "clearCredits",
      "clearCharacterProgress",
      "clearDetails",
      "nextStageButton",
      "clearRetryButton",
      "clearStageSelectButton",
      "clearTitleButton",
    ]) {
      expect(html.match(new RegExp('id="' + id + '"', "g"))).toHaveLength(1);
    }
  });

  it("uses desktop-first width, two-column hierarchy and one report scroll region", () => {
    expect(css).toContain("width: min(1640px, calc(100vw - 40px));");
    expect(css).toContain(
      "grid-template-columns: minmax(360px, 0.82fr) minmax(0, 1.55fr);",
    );
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr));");
    expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr));");
    expect(css).toContain("backdrop-filter: blur(14px) saturate(0.72) brightness(0.68);");

    const wordReviewBlock = css.slice(
      css.indexOf(".word-review-list {"),
      css.indexOf(".word-review-row {"),
    );
    expect(wordReviewBlock).toContain("max-height: none;");
    expect(wordReviewBlock).toContain("overflow: visible;");
  });
});
