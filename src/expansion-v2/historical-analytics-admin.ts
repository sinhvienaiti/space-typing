import {
  aggregateHistoricalRuns,
  type HistoricalAggregate,
  type HistoricalPeriod,
} from "./historical-analytics";
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
    | "assist-retry"
    | "leaderboard";
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
  const aggregate = aggregateHistoricalRuns(profile.history, period);
  const hasHistory = aggregate.runCount > 0;
  const diagnostics = hasHistory
    ? ["Metrics are derived only from persisted historical events in the current player profile."]
    : ["No historical records exist for this period; live telemetry is not substituted."];
  diagnostics.push("Cross-player analytics are unsupported without a canonical backend identity/store.");

  return {
    title: "Historical Analytics",
    mode: HISTORICAL_ANALYTICS_ADMIN_MODE,
    canMutate: false,
    source: hasHistory ? "historical-persisted" : "no-historical-records",
    crossPlayerSupported: false,
    aggregate,
    rows: [
      {
        id: "runs",
        label: "Persisted runs",
        value: String(aggregate.runCount),
        status: hasHistory ? "good" : "neutral",
      },
      {
        id: "outcomes",
        label: "Completed / Defeated / Abandoned / Invalid",
        value: [
          aggregate.completedRuns,
          aggregate.defeatedRuns,
          aggregate.abandonedRuns,
          aggregate.invalidRuns,
        ].join(" / "),
        status: "neutral",
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
    ],
    diagnostics,
  };
}
