import type { LiveOpsRemote } from "../liveops/controller";
import { onlineRequest } from "./api";

/** The Daily Hub on the server (cloud/src/liveops.ts). */
export const liveOpsRemote: LiveOpsRemote = {
  fetch: (after) => onlineRequest("/liveops" + (after === undefined ? "" : "?after=" + after)),
  importLocal: (state) => onlineRequest("/liveops/import", { body: { state } }),
  claim: (request) => onlineRequest("/liveops/claim", { body: request }),
  progress: (progress, options) => onlineRequest("/liveops/progress", { body: { progress }, keepalive: options?.keepalive === true }),
  goal: (goal) => onlineRequest("/liveops/goal", { body: { goal } }),
  shield: (starCrystals) => onlineRequest("/liveops/shield", { body: { starCrystals } }),
  redeem: (code) => onlineRequest("/liveops/redeem", { body: { code } }),
};
