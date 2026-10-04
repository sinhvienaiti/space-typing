# Warp Charge V3 — implementation and verification

Updated: 2026-10-04. Branch: `feat/bgv-integration-current`.
Player-save schema is now 28. The current policy is `warp-v3-1`.

## Policy and UI

| Rule | Implementation |
| --- | --- |
| Active | Capacity 100; regenerates 1 per 6 minutes. |
| Reserve | Capacity 300; regenerates 1 per 12 minutes only while Active is full. |
| Campaign / Ascension / replay / Hidden | 10 per deployment, including each rewarded Hidden encounter step. |
| Reserve spending | Off by default; explicit consent covers only the Active deficit. |
| Instant refill | +20, fills Active then Reserve; no overflow waste purchase; at most 3 per fixed day. |
| Refill prices / reset | 8 / 12 / 18 Star Crystals; 04:00 UTC+7. Explicit purchase confirmation with current quote. |
| Practice / Smart Review | Free; learning persists, economic changes stay in a disposable overlay. |
| Expedition / Duel | Zero Warp; their existing isolated progression rules remain. No Campaign Crystals from Expedition. |
| Quit / defeat / crash | No automatic refund or restart; committed gains retained. |

Title and HUD display Active/Reserve. The title depot exposes Refuel, Reserve consent,
prepared-sortie abandonment and clock correction when needed. Practice and Retry
Practice show a compact learning-only banner. Pending actions disable duplicate
clicks. Campaign start charges only after assets, input, vocabulary and context are
prepared. A prepared sortie resumes only the exact recorded context without a
second fee; an active/defeat-pending sortie on restart becomes interrupted.

## Persistence and isolation

The canonical account is in IndexedDB. Each economic action reads, validates and
mutates the latest save in one strict transaction. Success is returned only after
transaction completion. Payload-bound receipts, sequence numbers, generation,
writer fence and financial barriers prevent duplicate/stale replay and late
autosaves overwriting spending or rewards. Receipts are bounded to 64.

An origin Web Lock holds the writer lease. Another tab can read the latest canonical
balance through coalesced BroadcastChannel notifications but cannot spend or save
Campaign rewards. Without Web Locks, the economic account stays read-only and free
Practice remains available. Broadcast messages are advisory; IndexedDB checks are
authoritative.

Stage clear commits rewards, terminal receipt and one-time sector/Ascension keys
together. Phoenix consumes the item and returns the attempt to active before the
game resumes. A failed disk transaction changes neither the canonical wallet nor
the attempt/receipt. Critical clear settlement blocks ordinary reward autosaves.

Practice, Review, QA and Expedition snapshots cannot enter the Campaign economy
writer. Ending Practice discards its overlay and reloads the latest canonical
account before another paid deployment. Expedition's auxiliary profile is stored
separately from Campaign currency/progression.

Old save schemas migrate once to 100 Active at the current time, with previous
one-time progress seeded. Current corrupt/missing-account and future-version saves
are rejected rather than regenerated. A committed mirror with missing canonical
storage requires explicit recovery. Whole-profile restore warns that spending may
roll back and starts a new generation; legacy imports retain current Warp and cannot
repeatedly obtain migration fuel. Current valid canonical saves and future schemas
are protected from the recovery path.

Regeneration uses constant-time pool arithmetic and wall/monotonic clock anchoring.
It does not loop over elapsed minutes. The HUD reconciles at sparse intervals;
ordinary gameplay writes are batched when Credits actually change. No per-frame
IndexedDB writes were added.

## Verification completed

- Full game suite: **253 files / 1,623 tests passed**; TypeScript, Vite build and
  asset checks passed on 2026-10-04.
- Warp arithmetic: 18 tests, including carry boundaries, sequential pools, full
  caps, Reserve consent, 04:00 reset, backward clock, sleep and 500 randomized
  split-time reconciliation cases.
- Account transactions: 40 tests covering duplicate/lost ACK, payload mismatch,
  concurrent tabs, writer takeover, crash/prepared context, receipt compaction,
  stale autosaves, capabilities, quota/disk aborts, clear and Phoenix atomicity,
  refill quote/limits, migration, backup/recovery and read-only tab updates.
- UI controls: 8 tests covering actual markup bindings, confirmation pending state,
  duplicate clicks, disabled actions and visible errors.
- Economy audit: 7 regression tests plus a reproducible production-formula report
  with 104 scenarios. Existing backup/persistence/gameplay suites also passed.

The environment did not permit local browser acceptance. Real browser IndexedDB,
page crash/BFcache, multi-tab UI and narrow-layout acceptance remain manual checks;
fake-indexeddb transaction tests do not certify every browser's storage behavior.

## Economy audit and bounds

Run from this repository:

```bash
pnpm --silent stamina:audit > /tmp/warp-economy-audit.json
```

The report hashes production source and policy. Verified source SHA-256:
`80df13fd6471a22ac2a20716828170bbbb3419724ac097da459d48949251a261`.
Scenarios cover fixed/adaptive/custom difficulty, tiers 0/1/5/10, Typing/Voice,
objectives, performance, boss-cache bounds, failure/Phoenix bounds, Hidden content,
daily sessions, idle stock and all three refill prices.

| Baseline, first clear stages 1–1000 | Base stage + sector SC | Including typing performance SC |
| --- | ---: | ---: |
| Balanced | 350 | 1,251 |
| Impossible | 479 | 2,281 |

Repeatable stage 100, excluding one-time sector awards and cache, yields 5 SC in the
favorable Balanced typing case and 9 SC in Impossible. A +20 refill funds two
attempts, so net earnings at the three prices are respectively `[2, -2, -8]` and
`[10, 6, 0]`. The maximum audited favorable replay bound is 27 SC at stage 1000,
including an owned-relic premium cache. **Prices 8/12/18 are preserved as daily
limited acceleration, not asserted to be a net SC sink.**

Starting at zero in both pools and idling: 24 h gives 100/70 (17 attempts); 3 or
7 days reaches 100/300 (40 attempts). Filling both pools takes 70 h. With initial
100 Active, an idealized 1,000 clears without refills needs 990 h of additional
regeneration, before failures. Free Practice remains available during this pacing.

These are formula and scheduling bounds, not measured human survival, recognition
accuracy or completion-time simulations. SC/min values assume 30/60/180 s attempts.
Full gameplay pacing/balance still needs measured local sessions.
