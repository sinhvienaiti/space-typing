import {
  loadRuntimeTestingPolicy,
  runtimeTestingPolicy,
} from "./game-testing-policy";

/**
 * Stored player settings (spaceTypingSettingsV1) as the game reads them:
 * Stage testing access always comes from the Admin testing policy, never
 * from what the browser stored.
 */
export function settingsWithAdminStagePolicy(raw: string | null): string {
  let parsed: Record<string, unknown> = {};
  if (raw !== null) {
    try {
      const value = JSON.parse(raw) as unknown;
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        parsed = value as Record<string, unknown>;
      }
    } catch {
      parsed = {};
    }
  }
  return JSON.stringify({
    ...parsed,
    unlockAllStages: runtimeTestingPolicy().unlockAllStages,
  });
}

/** Player settings as the game stores them: without the Admin testing policy. */
export function settingsWithoutTestingOverrides(raw: string): string {
  try {
    const value = JSON.parse(raw) as unknown;
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return raw;
    }
    const next = { ...(value as Record<string, unknown>) };
    delete next.unlockAllStages;
    return JSON.stringify(next);
  } catch {
    return raw;
  }
}

function hideLegacyPlayerTestingControl(): void {
  const legacy = document.getElementById("unlockAllStages");
  // Testing policy belongs to Admin. Hide only the obsolete player-preference
  // row; never hide the surrounding Settings section or unrelated controls.
  legacy?.closest(".setting-row")?.setAttribute("hidden", "");
}

if (typeof window !== "undefined") {
  await loadRuntimeTestingPolicy();
  hideLegacyPlayerTestingControl();
}
