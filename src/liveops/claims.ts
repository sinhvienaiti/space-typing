import {
  claimChest,
  claimMessage,
  claimMission,
  claimMonthly,
  claimNewbie,
  claimPlaytime,
  claimStreakMilestone,
  claimWarpWindow,
  type LiveOpsClaim,
  type LiveOpsState,
} from "./state";

/**
 * A Daily Hub claim as plain data, so the same request runs offline (here)
 * or on the server (cloud/src/liveops.ts) with identical rules.
 */
export type ClaimRequest =
  | { kind: "mission"; scope: "daily" | "weekly"; id: string }
  | { kind: "chest"; scope: "daily" | "weekly"; points: number }
  | { kind: "newbie" }
  | { kind: "monthly" }
  | { kind: "playtime"; minutes: number }
  | { kind: "warp-window"; id: string }
  | { kind: "streak"; days: number }
  | { kind: "message"; id: string };

export function runClaim(request: ClaimRequest, state: LiveOpsState, day: number, now: number): LiveOpsClaim {
  switch (request?.kind) {
    case "mission":
      return claimMission(state, request.scope === "weekly" ? "weekly" : "daily", String(request.id), day);
    case "chest":
      return claimChest(state, request.scope === "weekly" ? "weekly" : "daily", Number(request.points), day);
    case "newbie":
      return claimNewbie(state, day);
    case "monthly":
      return claimMonthly(state, day);
    case "playtime":
      return claimPlaytime(state, Number(request.minutes), day);
    case "warp-window":
      return claimWarpWindow(state, String(request.id), now, day);
    case "streak":
      return claimStreakMilestone(state, Number(request.days));
    case "message":
      return claimMessage(state, String(request.id), day);
    default:
      return { ok: false, reason: "Unknown claim." };
  }
}

/** Big rewards get the large reveal. */
export function isBigClaim(request: ClaimRequest): boolean {
  return request.kind === "chest" || request.kind === "streak";
}
