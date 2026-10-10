import {
  aggregateDuelRankedHistory,
  type DuelRankedHistoryPeriod,
  type DuelRankedHistoryState,
} from "./ranked-history";

export const DUEL_RANKED_HISTORY_ADMIN_MODE = "read-only" as const;

export type DuelRankedHistoryAdminSurface = {
  title: "Ranked Duel Historical Analytics";
  mode: typeof DUEL_RANKED_HISTORY_ADMIN_MODE;
  canMutate: false;
  source: "historical-persisted" | "no-historical-records";
  accountId: string;
  crossPlayerSupported: boolean;
  rows: readonly {
    id: "matches" | "record" | "rating" | "rating-delta";
    label: string;
    value: string;
    status: "neutral" | "good" | "warning";
  }[];
  diagnostics: readonly string[];
};

export type DuelRankedHistoryAdminSurfaceOptions = {
  crossPlayerSupported?: boolean;
};

export function buildDuelRankedHistoryAdminSurface(
  state: DuelRankedHistoryState,
  period: DuelRankedHistoryPeriod,
  options: DuelRankedHistoryAdminSurfaceOptions = {},
): DuelRankedHistoryAdminSurface {
  const aggregate = aggregateDuelRankedHistory(state, period);
  const hasHistory = aggregate.matchCount > 0;
  const crossPlayerSupported = options.crossPlayerSupported === true;
  const diagnostics = hasHistory
    ? [
        "Metrics are derived only from persisted authoritative Ranked settlements for this account.",
      ]
    : [
        "No persisted Ranked settlements exist for this period; live rating/profile values are not substituted.",
      ];
  diagnostics.push(
    crossPlayerSupported
      ? "Cross-player lookup is available only through the authenticated server authorization boundary."
      : "Cross-player lookup remains disabled until an authenticated server authorization boundary is configured.",
  );

  const rating = aggregate.ratingStart === null || aggregate.ratingEnd === null
    ? "No historical data"
    : String(aggregate.ratingStart) + " → " + String(aggregate.ratingEnd);
  const delta = aggregate.ratingDelta === 0
    ? "0"
    : (aggregate.ratingDelta > 0 ? "+" : "") + String(aggregate.ratingDelta);

  return {
    title: "Ranked Duel Historical Analytics",
    mode: DUEL_RANKED_HISTORY_ADMIN_MODE,
    canMutate: false,
    source: hasHistory ? "historical-persisted" : "no-historical-records",
    accountId: aggregate.accountId,
    crossPlayerSupported,
    rows: [
      {
        id: "matches",
        label: "Persisted Ranked matches",
        value: String(aggregate.matchCount),
        status: hasHistory ? "good" : "neutral",
      },
      {
        id: "record",
        label: "Wins / Losses / Draws",
        value: [aggregate.wins, aggregate.losses, aggregate.draws].join(" / "),
        status: "neutral",
      },
      {
        id: "rating",
        label: "Historical Duel rating",
        value: rating,
        status: hasHistory ? "good" : "neutral",
      },
      {
        id: "rating-delta",
        label: "Rating delta",
        value: delta,
        status: aggregate.ratingDelta < 0 ? "warning" : aggregate.ratingDelta > 0 ? "good" : "neutral",
      },
    ],
    diagnostics,
  };
}
