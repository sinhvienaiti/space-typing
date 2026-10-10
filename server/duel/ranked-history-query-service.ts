import type { DuelAuthenticatedIdentity } from "../../src/duel/authority";
import {
  buildDuelRankedHistoryAdminSurface,
  type DuelRankedHistoryAdminSurface,
} from "../../src/duel/ranked-history-admin";
import type {
  DuelRankedHistoryPeriod,
  DuelRankedHistoryState,
} from "../../src/duel/ranked-history";

export type DuelRankedHistoryReadScope =
  | "self"
  | "authorized-cross-player";

export type DuelRankedHistoryReadErrorCode =
  | "UNAUTHENTICATED"
  | "INVALID_TARGET"
  | "INVALID_PERIOD"
  | "FORBIDDEN";

export type DuelRankedHistoryReadResult =
  | {
      ok: true;
      scope: DuelRankedHistoryReadScope;
      requesterAccountId: string;
      targetAccountId: string;
      surface: DuelRankedHistoryAdminSurface;
    }
  | {
      ok: false;
      code: DuelRankedHistoryReadErrorCode;
      message: string;
    };

export type DuelRankedHistoryCrossPlayerAuthorization = Readonly<{
  requester: DuelAuthenticatedIdentity;
  targetAccountId: string;
}>;

export interface DuelRankedHistoryReader {
  history(accountId: string): DuelRankedHistoryState;
}

export type DuelRankedHistoryAuthenticator = (
  credential: string,
) => DuelAuthenticatedIdentity | null;

export type DuelRankedHistoryCrossPlayerAuthorizer = (
  input: DuelRankedHistoryCrossPlayerAuthorization,
) => boolean;

function canonicalAccountId(value: string): string | null {
  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    normalized.length > 160 ||
    normalized !== value
  ) {
    return null;
  }
  return normalized;
}

function validPeriod(
  period: DuelRankedHistoryPeriod,
): DuelRankedHistoryPeriod | null {
  if (
    !Number.isSafeInteger(period.startMs) ||
    !Number.isSafeInteger(period.endMs) ||
    period.startMs < 0 ||
    period.endMs <= period.startMs
  ) {
    return null;
  }
  return {
    startMs: period.startMs,
    endMs: period.endMs,
  };
}

export class DuelRankedHistoryQueryService {
  constructor(
    private readonly reader: DuelRankedHistoryReader,
    private readonly authenticate: DuelRankedHistoryAuthenticator,
    private readonly authorizeCrossPlayer: DuelRankedHistoryCrossPlayerAuthorizer | null = null,
  ) {}

  read(input: {
    credential: string;
    targetAccountId?: string;
    period: DuelRankedHistoryPeriod;
  }): DuelRankedHistoryReadResult {
    const requester = this.authenticate(input.credential);
    if (requester === null) {
      return {
        ok: false,
        code: "UNAUTHENTICATED",
        message: "A valid authenticated identity is required.",
      };
    }

    const requesterAccountId = canonicalAccountId(requester.accountId);
    if (requesterAccountId === null) {
      return {
        ok: false,
        code: "UNAUTHENTICATED",
        message: "Authenticated account identity is invalid.",
      };
    }
    const targetAccountId = input.targetAccountId === undefined
      ? requesterAccountId
      : canonicalAccountId(input.targetAccountId);
    if (targetAccountId === null) {
      return {
        ok: false,
        code: "INVALID_TARGET",
        message: "Ranked history target account is invalid.",
      };
    }
    const period = validPeriod(input.period);
    if (period === null) {
      return {
        ok: false,
        code: "INVALID_PERIOD",
        message: "Ranked history period must be a valid non-empty time range.",
      };
    }

    let scope: DuelRankedHistoryReadScope = "self";
    if (targetAccountId !== requesterAccountId) {
      if (this.authorizeCrossPlayer === null) {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Cross-player Ranked history access is not configured.",
        };
      }
      let authorized = false;
      try {
        authorized = this.authorizeCrossPlayer({
          requester,
          targetAccountId,
        });
      } catch {
        authorized = false;
      }
      if (!authorized) {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Cross-player Ranked history access is forbidden.",
        };
      }
      scope = "authorized-cross-player";
    }

    const state = this.reader.history(targetAccountId);
    return {
      ok: true,
      scope,
      requesterAccountId,
      targetAccountId,
      surface: buildDuelRankedHistoryAdminSurface(
        state,
        period,
        {
          crossPlayerSupported:
            this.authorizeCrossPlayer !== null,
        },
      ),
    };
  }
}
