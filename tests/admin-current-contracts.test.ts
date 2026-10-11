import { describe, expect, it } from "vitest";
import dailyWeeklyContract from "../contracts/space-typing-admin-daily-weekly.v1.json";
import alternativeModesContract from "../contracts/space-typing-admin-alternative-modes.v1.json";
import telemetryContract from "../contracts/space-typing-admin-telemetry.v1.json";
import rankedContract from "../contracts/space-typing-admin-ranked.v1.json";
import qaContract from "../contracts/space-typing-admin-qa.v1.json";
import expeditionContract from "../contracts/space-typing-admin-expedition.v1.json";
import { WEEKLY_CHALLENGE_ADMIN_MODE } from "../src/expansion-v2/weekly-challenge-admin";
import { ALTERNATIVE_MODE_REGISTRY } from "../src/duel/alternative-modes";
import { HISTORICAL_ANALYTICS_ADMIN_MODE } from "../src/expansion-v2/historical-analytics-admin";
import { DUEL_RANKED_HISTORY_ADMIN_MODE } from "../src/duel/ranked-history-admin";

describe("current Admin contracts follow canonical runtime owners", () => {
  it("exposes Weekly as canonical read-only runtime state without inventing a control plane", () => {
    expect(dailyWeeklyContract.liveOps.weekly).toMatchObject({
      available: true,
      adminMode: WEEKLY_CHALLENGE_ADMIN_MODE,
      writeCapability: false,
      schedulerControlCapability: false,
      rewardAuthoringCapability: false,
      seedOverrideCapability: false,
    });
    expect(dailyWeeklyContract.liveOps.adminWriteCapability).toBe(false);
  });

  it("keeps the Expedition sidecar aligned with the runtime's Weekly challenge kind", () => {
    expect(expeditionContract.expedition.challengeKinds).toEqual([
      "prototype",
      "daily",
      "weekly",
      "qa",
    ]);
    expect(expeditionContract.expedition.safety).toMatchObject({
      adminWriteCapability: false,
      adminPublishCapability: false,
      adminRunMutationCapability: false,
      adminStorageMutationCapability: false,
    });
  });

  it("publishes only the real Reflex and Word Chain admission surface", () => {
    const contractModes = Object.fromEntries(
      alternativeModesContract.alternativeModes.implementations.map((mode) => [
        mode.id,
        mode,
      ]),
    );
    for (const [id, descriptor] of Object.entries(ALTERNATIVE_MODE_REGISTRY)) {
      expect(contractModes[id]).toMatchObject({
        id,
        available: true,
        supportedMatchTypes: descriptor.supportedMatchTypes,
        rankedEligible: descriptor.rankedEligible,
        persistence: descriptor.persistence,
        reconnect: descriptor.reconnect,
      });
    }
    expect(alternativeModesContract.alternativeModes.rankedAdmissionCapability).toBe(false);
  });

  it("keeps historical analytics read-only and scoped to the current local profile", () => {
    expect(HISTORICAL_ANALYTICS_ADMIN_MODE).toBe("read-only");
    expect(telemetryContract.telemetry.historical).toMatchObject({
      available: true,
      mode: "local-profile-persisted-readonly",
      scope: "current-local-profile",
      crossPlayerSupported: false,
      centralTelemetryBackendCapability: false,
      writeCapability: false,
      liveTelemetryFallbackWhenEmpty: false,
    });
  });

  it("keeps Ranked history authenticated, read-only and fail-closed for cross-player access", () => {
    expect(DUEL_RANKED_HISTORY_ADMIN_MODE).toBe("read-only");
    expect(rankedContract.ranked.history).toMatchObject({
      available: true,
      mode: "persisted-authoritative-readonly",
      defaultScope: "self",
      crossPlayerScope: "authorized-cross-player",
      authenticationRequired: true,
      crossPlayerAuthorizationRequired: true,
      crossPlayerFailClosedWhenUnconfigured: true,
      writeCapability: false,
    });
  });

  it("records new QA coverage without claiming automated microphone hardware acceptance", () => {
    expect(qaContract.qa.currentRuntimeCoverage).toMatchObject({
      weeklyChallenge: { mode: WEEKLY_CHALLENGE_ADMIN_MODE },
      alternativeModes: { modes: ["reflex", "word-chain"], rankedEligible: false },
      historicalAnalytics: { scope: "current-local-profile", crossPlayerSupported: false },
      rankedHistory: { authenticationRequired: true, crossPlayerAuthorizationRequired: true },
      voiceHybrid: { hardwareAcceptance: "manual" },
    });
    expect(qaContract.qa.productionPersistenceWriteCapability).toBe(false);
  });
});
