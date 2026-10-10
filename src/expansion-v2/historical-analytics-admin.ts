import {
  type HistoricalAggregate,
  type HistoricalPeriod,
} from "./historical-analytics";
import {
  buildHistoricalAnalyticsSummary,
  type HistoricalAnalyticsSummaryV1,
} from "./historical-analytics-summary";
import type { ExpansionV2Profile } from "./profile-store";

export const HISTORICAL_ANALYTICS_ADMIN_MODE = "read-only" as const;

export type HistoricalAnalyticsAdminSource =
  | "historical-persisted"
  | "no-historical-records";

export type HistoricalAnalyticsAdminRow = {
  id:
    | "runs"
    | "outcomes"
    | "score"
    | "accuracy"
    | "wpm"
    | "assist-retry"
    | "leaderboard"
    | "coverage";
  label: string;
  value: string;
  status: "neutral" | "good" | "warning";
};

export type HistoricalAnalyticsAdminSurface = {
  title: "Historical Analytics";
  mode: typeof HISTORICAL_ANALYTICS_ADMIN_MODE;
  canMutate: false;
  source: HistoricalAnalyticsAdminSource;
  crossPlayerSupported: false;
  aggregate: HistoricalAggregate;
  summary: HistoricalAnalyticsSummaryV1;
  rows: HistoricalAnalyticsAdminRow[];
  diagnostics: string[];
};

function decimal(value: number | null): string {
  return value === null ? "No historical data" : value.toFixed(1);
}

export function buildHistoricalAnalyticsAdminSurface(
  profile: ExpansionV2Profile,
  period: HistoricalPeriod,
): HistoricalAnalyticsAdminSurface {
  const summary = buildHistoricalAnalyticsSummary(profile.history, period);
  const aggregate = summary.selected;
  const hasHistory = aggregate.runCount > 0;
  const diagnostics = hasHistory
    ? ["Metrics are derived only from persisted historical events in the current player profile."]
    : ["No historical records exist for this period; live telemetry is not substituted."];
  if (aggregate.unknownRuns > 0) {
    diagnostics.push(
      "Some persisted terminal outcomes are intentionally unknown because the source did not distinguish defeat from abandon.",
    );
  }
  if (hasHistory && summary.coverage.wordsPerMinuteRuns < aggregate.runCount) {
    diagnostics.push(
      "WPM coverage is partial because older persisted run events predate additive performance metadata.",
    );
  }
  if (hasHistory && summary.coverage.bossAttemptRuns < aggregate.runCount) {
    diagnostics.push(
      "Boss analytics include only runs with persisted boss-attempt metadata; missing rows are not inferred from live combat state.",
    );
  }
  diagnostics.push("Cross-player analytics are unsupported without a canonical backend identity/store.");

  const averageWpm = summary.byPlayer[0]?.averageWordsPerMinute ?? null;
  const coverageText = [
    "difficulty " + String(summary.coverage.difficultyRuns),
    "stage " + String(summary.coverage.sourceStageRuns),
    "boss " + String(summary.coverage.bossAttemptRuns),
    "WPM " + String(summary.coverage.wordsPerMinuteRuns),
  ].join(" / ");

  return {
    title: "Historical Analytics",
    mode: HISTORICAL_ANALYTICS_ADMIN_MODE,
    canMutate: false,
    source: hasHistory ? "historical-persisted" : "no-historical-records",
    crossPlayerSupported: false,
    aggregate,
    summary,
    rows: [
      {
        id: "runs",
        label: "Persisted runs",
        value: String(aggregate.runCount),
        status: hasHistory ? "good" : "neutral",
      },
      {
        id: "outcomes",
        label: "Completed / Defeated / Abandoned / Unknown / Invalid",
        value: [
          aggregate.completedRuns,
          aggregate.defeatedRuns,
          aggregate.abandonedRuns,
          aggregate.unknownRuns,
          aggregate.invalidRuns,
        ].join(" / "),
        status:
          aggregate.unknownRuns > 0 || aggregate.invalidRuns > 0
            ? "warning"
            : "neutral",
      },
      {
        id: "score",
        label: "Average score",
        value: decimal(aggregate.averageScore),
        status: hasHistory ? "good" : "neutral",
      },
      {
        id: "accuracy",
        label: "Average accuracy",
        value: aggregate.averageAccuracyPercent === null
          ? "No historical data"
          : aggregate.averageAccuracyPercent.toFixed(1) + "%",
        status: aggregate.averageAccuracyPercent === null ? "neutral" : "good",
      },
      {
        id: "wpm",
        label: "Average WPM",
        value: decimal(averageWpm),
        status: averageWpm === null ? "neutral" : "good",
      },
      {
        id: "assist-retry",
        label: "Assisted / Retried",
        value: aggregate.assistedRuns + " / " + aggregate.retriedRuns,
        status: aggregate.assistedRuns > 0 || aggregate.retriedRuns > 0
          ? "warning"
          : "neutral",
      },
      {
        id: "leaderboard",
        label: "Leaderboard eligible",
        value: String(aggregate.leaderboardEligibleRuns),
        status: aggregate.leaderboardEligibleRuns > 0 ? "good" : "neutral",
      },
      {
        id: "coverage",
        label: "Metadata coverage",
        value: coverageText,
        status:
          !hasHistory ||
          (
            summary.coverage.difficultyRuns === aggregate.runCount &&
            summary.coverage.sourceStageRuns === aggregate.runCount &&
            summary.coverage.wordsPerMinuteRuns === aggregate.runCount
          )
            ? "neutral"
            : "warning",
      },
    ],
    diagnostics,
  };
}
