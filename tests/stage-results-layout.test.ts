import { describe, expect, it } from "vitest";
import html from "../index.html?raw";

describe("Stage clear desktop report presentation", () => {
  it("keeps the measured report in one wide dashboard with stable metric ids", () => {
    expect(html).toContain('id="stageClearOverlay"');
    expect(html).toContain('class="stage-results-dashboard"');
    expect(html).toContain('class="stage-results-overview"');
    expect(html).toContain('class="stage-results-detail-column"');
    expect(html).toContain('class="stage-results-footer"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');

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
      "wordReviewCount",
      "wordReviewTabs",
      "wordReviewList",
      "nextStageButton",
      "clearRetryButton",
      "clearStageSelectButton",
      "clearTitleButton",
    ]) {
      expect(html.match(new RegExp('id="' + id + '"', "g"))).toHaveLength(1);
    }
  });
});
