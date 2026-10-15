export type RuntimeTestingPolicy = Readonly<{
  unlockAllStages: boolean;
  unlockAllShips: boolean;
}>;

export const DEFAULT_RUNTIME_TESTING_POLICY: RuntimeTestingPolicy = Object.freeze({
  unlockAllStages: false,
  // Ship selection is currently independent of Campaign unlock milestones.
  // Keep the existing product behavior unless an authored Admin policy says
  // otherwise.
  unlockAllShips: true,
});

const RUNTIME_ENDPOINT = "/api/runtime/space-typing/worlds";
let activePolicy: RuntimeTestingPolicy = DEFAULT_RUNTIME_TESTING_POLICY;

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function sanitizeRuntimeTestingPolicy(value: unknown): RuntimeTestingPolicy {
  const root = object(value);
  const testing = object(root?.testing);
  if (testing === null) return DEFAULT_RUNTIME_TESTING_POLICY;

  return Object.freeze({
    unlockAllStages: testing.unlockAllStages === true,
    unlockAllShips:
      typeof testing.unlockAllShips === "boolean"
        ? testing.unlockAllShips
        : DEFAULT_RUNTIME_TESTING_POLICY.unlockAllShips,
  });
}

export function runtimeTestingPolicy(): RuntimeTestingPolicy {
  return activePolicy;
}

export async function loadRuntimeTestingPolicy(
  fetcher: typeof fetch = fetch,
): Promise<RuntimeTestingPolicy> {
  try {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), 1800);
    try {
      const response = await fetcher(RUNTIME_ENDPOINT, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (!response.ok) return activePolicy;
      activePolicy = sanitizeRuntimeTestingPolicy(await response.json());
      return activePolicy;
    } finally {
      globalThis.clearTimeout(timeout);
    }
  } catch {
    return activePolicy;
  }
}
