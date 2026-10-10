# Admin Data Integration Plan

## Purpose

This document defines the persisted historical-data contract used by Space Typing admin/read-only analytics. Historical views must be reproducible from committed storage. Live combat telemetry must never be substituted for missing persisted fields.

## Current Sources of Truth

### Expansion / Expedition history

- Storage owner: `ExpansionV2Profile.history`.
- Event version: `HistoricalRunSettledEventV1` (`version: 1`).
- Retention: at most 512 newest events after stable chronological ordering.
- Same-run enrichment remains intentional and backward compatible; optional metadata may be added later without replacing valid older fields with missing values.
- Invalid optional additive metadata is discarded field-by-field. Invalid core identity/time/score rejects the event before profile counters or processed markers mutate.
- `HistoricalAnalyticsSummaryV1` is derived from the event store. It is not a second analytics database.

### Ranked Duel history

- Server-owned per-account Ranked history remains separate from Expansion profile history.
- Settlement uses the Ranked settlement journal/recovery path so profile state and history can recover after partial storage failure.
- Replaying an identical historical settlement is idempotent; conflicting replay payloads fail closed.
- History reads fail closed with typed unavailable behavior when storage cannot be read.

## Summary V1

`buildHistoricalAnalyticsSummary()` exposes additive read-only aggregates:

- lifetime and selected-period run aggregates;
- daily WPM / accuracy / score trend points when those fields were persisted;
- challenge kind;
- difficulty;
- input mode;
- gameplay mode;
- source stage;
- boss attempts, successes and damage samples when producer metadata exists;
- relic loadout usage;
- equipment loadout usage when producer metadata exists;
- skill usage counts when producer metadata exists;
- local-player profile scope.

The generic Expansion store does **not** claim cross-player aggregation. `crossPlayerSupported` is explicitly false until a canonical authenticated backend store exists.

## Producer Contract

`buildExpeditionHistoricalMetadata()` derives only values that already exist canonically in `ExpeditionRun`:

- terminal outcome;
- average accuracy across completed encounters;
- completed-encounter active time;
- challenge kind;
- retry count / retried state;
- difficulty;
- input mode;
- gameplay mode;
- completed source stages;
- equipped relic IDs;
- accepted typed letters;
- Voice completion count when known;
- typing WPM using the existing `stageWordsPerMinute()` formula.

Pure Voice runs keep typing WPM unknown rather than treating spoken completions as typed letters.

`recordExpeditionHistoricalRun()` writes this metadata through the existing `recordExpansionRun()` / `ExpansionV2Profile.history` path. There is no parallel event store.

## Coverage Semantics

Admin analytics surface exposes metadata coverage counts. Missing metadata is a first-class state, not zero and not inferred from current game state.

Examples:

- an older run without WPM contributes to run totals but not the WPM average;
- a run without persisted boss attempts does not count as a zero-damage boss attempt;
- a run without skill IDs does not create synthetic skill usage;
- a run without equipment IDs does not infer equipment from unrelated presentation/runtime state.

## Migration / Compatibility

- Existing V1 historical events remain readable.
- Newly added fields are optional and sanitized independently.
- Persisted profile version remains unchanged because the event extension is additive.
- Summary V1 is derived at read time, so no migration rewrite of older events is required.
- Unknown/newer profile versions remain fail-closed according to the existing profile-store rules.

## Read-only Admin Contract

`buildHistoricalAnalyticsAdminSurface()` remains read-only:

- `mode: "read-only"`;
- `canMutate: false`;
- `crossPlayerSupported: false`;
- diagnostics state when WPM/boss/dimension coverage is partial;
- missing historical data is never backfilled from live telemetry.

## Remaining Producer Gaps

The following are deliberately **not** fabricated:

1. **Production terminal call-site switch** — the canonical Expedition adapter exists, but the large `src/main.ts` terminal call site must still be switched from the legacy `recordExpansionRun()` payload to `recordExpeditionHistoricalRun()` in a safe source edit.
2. **Boss damage windows** — current Expedition persistence has no canonical per-boss damage accumulator. Summary support exists, but coverage remains zero until combat instrumentation persists boss attempt/damage records.
3. **Equipment IDs** — Expedition history currently has no canonical per-run equipment-ID snapshot beyond its separate start-kit identity. No equipment usage is inferred.
4. **Per-skill IDs/counts** — aggregate completion contribution counters do not identify individual skill IDs. Summary support remains empty until the combat producer supplies canonical identifiers.
5. **Cross-player Expansion analytics** — unsupported until an authenticated backend identity/store exists.

## Acceptance Rule

R05 may be called complete only when the remaining producer gaps required by the roadmap are either implemented from a canonical runtime source or explicitly accepted as unsupported by the roadmap owner. Schema-ready fields alone are not evidence that production data is being collected.
