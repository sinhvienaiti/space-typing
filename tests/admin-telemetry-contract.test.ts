import { describe, expect, it } from "vitest";
import contract from "../contracts/space-typing-admin-telemetry.v1.json";

describe("Admin telemetry contract", () => {
  it("maps Overview and Analytics to canonical runtime session telemetry", () => {
    expect(contract.contractRevision).toBe("space-typing-admin-telemetry-v1");
    expect(contract.capability).toBe("telemetry.read");
    expect(contract.routes).toEqual([
      { id: "overview", path: "/admin/space-typing", label: "Overview" },
      { id: "analytics", path: "/admin/space-typing/analytics", label: "Analytics" },
    ]);
    expect(contract.telemetry.mode).toBe("runtime-derived-session-readonly");
    expect(contract.telemetry.runtimeSources).toContain("src/results/stage-session.ts");
    expect(contract.telemetry.runtimeSources).toContain("src/Game.ts");
  });

  it("does not invent historical or centralized analytics", () => {
    expect(contract.telemetry.persistence).toBe("session-memory-only");
    expect(contract.telemetry.writeCapability).toBe(false);
    expect(contract.telemetry.publishCapability).toBe(false);
    expect(contract.telemetry.historicalAggregationCapability).toBe(false);
    expect(contract.telemetry.centralTelemetryBackendCapability).toBe(false);
    expect(contract.telemetry.unsupportedAdminOperations).toContain(
      "query historical player analytics",
    );
    expect(contract.telemetry.unsupportedAdminOperations).toContain(
      "query cross-session aggregates",
    );
  });

  it("exposes only truthful runtime signal ownership", () => {
    expect(contract.telemetry.overviewSignals).toContain("typing-accuracy-inputs");
    expect(contract.telemetry.overviewSignals).toContain("stage-words-per-minute-inputs");
    expect(contract.telemetry.analyticsSignals).toContain("word-attempts");
    expect(contract.telemetry.analyticsSignals).toContain("word-groups");
    expect(contract.telemetry.performanceDiagnostics.available).toBe(true);
    expect(contract.telemetry.performanceDiagnostics.adminReadableSnapshot).toBe(false);
  });
});
