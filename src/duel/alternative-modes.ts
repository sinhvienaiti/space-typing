export type AlternativeModeId = "reflex" | "word-chain";
export type AlternativeMatchType = "friend" | "practice" | "ranked";

export type AlternativeModeDescriptor = {
  id: AlternativeModeId;
  runtimeOwner: "AlternativeMatchRuntime";
  supportedMatchTypes: readonly AlternativeMatchType[];
  rankedEligible: false;
  persistence: "snapshot-v1";
  reconnect: true;
};

const FRIEND_PRACTICE = ["friend", "practice"] as const;

export const ALTERNATIVE_MODE_REGISTRY: Readonly<
  Record<AlternativeModeId, AlternativeModeDescriptor>
> = {
  reflex: {
    id: "reflex",
    runtimeOwner: "AlternativeMatchRuntime",
    supportedMatchTypes: FRIEND_PRACTICE,
    rankedEligible: false,
    persistence: "snapshot-v1",
    reconnect: true,
  },
  "word-chain": {
    id: "word-chain",
    runtimeOwner: "AlternativeMatchRuntime",
    supportedMatchTypes: FRIEND_PRACTICE,
    rankedEligible: false,
    persistence: "snapshot-v1",
    reconnect: true,
  },
};

export function alternativeModeDescriptor(
  mode: AlternativeModeId,
): AlternativeModeDescriptor {
  return ALTERNATIVE_MODE_REGISTRY[mode];
}

export function alternativeModeSupportsMatchType(
  mode: AlternativeModeId,
  matchType: AlternativeMatchType,
): boolean {
  return ALTERNATIVE_MODE_REGISTRY[mode].supportedMatchTypes.includes(matchType);
}

export function assertAlternativeModeAdmission(
  mode: AlternativeModeId,
  matchType: AlternativeMatchType,
): void {
  if (!alternativeModeSupportsMatchType(mode, matchType)) {
    throw new Error(
      `Alternative mode ${mode} does not support ${matchType}; ranked remains fail-closed.`,
    );
  }
}
