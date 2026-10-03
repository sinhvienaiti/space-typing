# Space Typing — 1000-Stage Expansion V2 Implementation Report

## Status

- Source plan: `SPACE_TYPING_1000_STAGE_EXPANSION_V2_FINAL_2.md`
- Implementation branch: `feat/1000-stage-expansion-v2-full`
- Baseline branch/commit: `feat/bgv-integration-current` @ `8023beac88e1cb4e5a30b22f1a95edb45b5c89ca`
- Latest automated-gate code commit in this report:
  `0e228327dba0925bc27f114d2092cbc11b2433b2`
- Full CI run: `36677943720`
- Automated status: **PASS**
- Browser/manual/fun/performance acceptance: **OPEN — owner will run locally**

This report distinguishes implemented runtime behavior from design registry entries and
from source art that exists only on the owner's Mac mini.

## Automated evidence

At commit `0e228327dba0925bc27f114d2092cbc11b2433b2`:

- `pnpm test`: **178 / 178 test files PASS**
- `pnpm test`: **1004 / 1004 tests PASS**
- `pnpm build`: **PASS**
- TypeScript `tsc --noEmit`: PASS as part of build
- Vite production build: PASS
- audio asset integrity: PASS
- background reference/integrity: PASS
- ship art integrity: PASS
- Expansion V2 art validator: executed; Git CI had no
  `art-src/expansion-v2` source art, so it correctly reported a no-source skip

The Expansion V2 art validator becomes strict when source art exists. On the Mac mini,
run `pnpm expansion:prepare` first; then `pnpm build` verifies standard and @2x
runtime WebP outputs for every source file.

## P10 — isolated Expedition run

Implemented:

- separate Expedition run envelope and revision/writer ownership
- frozen vocabulary snapshot/hash
- deterministic run ID/seed/ruleset/content identity
- isolated loaner kit and run-local resources
- Campaign autosave/pagehide/reward/progression isolation
- safe reload/resume boundary
- materialized deterministic Relic draft
- explicit 3-slot replacement
- storage failure handling without fake state advance
- terminal victory/defeat/abandon behavior
- Test Lab fixed seed / phase / storage-failure controls

Campaign death protection is not used by Expedition defeat.

## P20 — completion semantics and build choice

Implemented:

- stable typed `completionId`
- explicit completion `origin`
- direct-typing eligibility
- short-word `effortWeight` bounded to 1.0
- direct completion facts feed learning/Solar Storm without proc re-entry
- contribution accounting is persisted once per committed encounter
- draft cadence before encounters 1/3/5/7, equivalent to before 1 and after 2/4/6
- rest/salvage boundaries are durable
- summary shows typed/perfect/letters/weighted effort/long-word/Solar contribution

Legacy Campaign Relic reward selection excludes run-only V2 Relics.

## P30 — eight-encounter vertical slice

Implemented production run length: **8 encounters**.

Reference macro:

1. normal introduction
2. Swarm Assault + Short Burst
3. Sniper Ambush + Long Word
4. lower-workload recovery
5. Fortress Siege
6. Fortress Siege + Solar Storm
7. Swarm callback with mature build
8. reference boss + Long Word

Runtime behavior:

- deterministic gameplay/cosmetic seed separation
- recipe-specific enemy composition for the reference recipes
- deterministic Short/Long vocabulary selection
- Solar Storm cycle/cue/window
- Solar Storm reward only from eligible direct typed completions
- one bounded Solar reward per pulse
- safe encounter replay after interruption

## P40 — roster and controlled pattern expansion

Relic roster is now 12 total:

Existing Campaign Relics:

- `first-light-seed`
- `storm-script`
- `frost-rhythm`
- `giant-word-lens`
- `mirror-vow`
- `cosmic-conductor`

New run-only Relics:

- `precision-lens`
- `perfect-capacitor`
- `combo-coil`
- `heavy-core`
- `syllable-forge`
- `echo-core`

Run-only Relics cannot leak into normal Campaign Relic rewards.

Typing-pattern runtime:

- NORMAL_WORD
- SHORT_BURST
- LONG_WORD
- PHRASE — deterministic two-word prompt
- SHARED_TARGET — bounded linked typing progress; no additional fake completion or learning event
- CHAIN — sequential multi-layer target using the existing target/layer owner
- RECALL_WORD contract
- BOSS_SENTENCE — deterministic three-word boss prompt

Compatibility contracts exist for Guardian/Chrono/Berserker/Phase/Anchored. New
affix behavior is **not force-enabled** in the reference slice. This follows FINAL 2's
explicit default that the slice does not require a new affix merely to satisfy the
roadmap; existing protection/role behavior is reused first.

## P50 — reference boss parts

Implemented reference parts:

- Cannon
- Core

Behavior:

- Cannon is vulnerable first
- Core unlocks after Cannon destruction
- parts belong to the canonical Boss state/target flow
- parts do not count as normal enemies
- parts do not grant normal loot
- parts do not count toward normal kill objectives
- part destruction does not independently complete the boss encounter
- HUD exposes part state and optional prepared part icons
- Test Lab can spawn the reference boss-parts setup through production `Game` logic

## P60 — Campaign rollout

Implemented:

- deterministic 1–1000 stage V2 band/profile mapping
- 1000-stage audit contract
- small production rollout on Campaign stages 11–100
- stage preview exposes V2 route/pressure intent while enabled
- Ancient Gate reference route event before Stage 036 after Stage 035 is cleared
- Risky path → Short Burst follow-up
- Stable path → Normal Word follow-up
- choice is stored in V2 profile flags and is not Campaign currency/equipment state

The runtime rollout intentionally remains a small band rather than blindly rewriting
all 1000 production stages at once. All 1000 stages are mapped/audited for later
controlled expansion.

## P70A — learning / Wanted Word

Implemented:

- typed learning evidence with stable completion identity
- Recall evidence has its own activity/source semantics
- hint/replay facts stay distinct
- idempotent evidence commit
- Wanted Word chooses weak evidence deterministically
- a normal prototype Expedition may surface one Wanted Word in the lower-pressure
  opening encounter
- Daily fixed challenge does not inject Wanted Word, preserving fairness

Mastery Constellation and full Lexicon Boss are not silently claimed as implemented;
they remain later/deeper learning presentation work under the source plan.

## P70B — fixed Daily challenge

Implemented:

- UTC day key
- fixed Daily seed
- ruleset/content/word-pool/start-kit/difficulty/assist identity
- PB comparison by identical challenge identity
- retry/interruption metadata retained
- Daily button uses the fixed identity
- QA/Test Lab runs use `kind: "qa"` and do not project into PB/meta progression

## P70C — Personal Ghost

Implemented:

- run-local safe-boundary ghost points
- previous PB Ghost is not overwritten mid-run
- Ghost is promoted atomically only when the matching PB improves
- Ghost compatibility uses exact challenge identity
- player can turn Ghost cue on/off
- briefing shows PB checkpoint cue only when comparable

## P80 — Evolution presentation and Nemesis

Implemented Evolution tiers E0–E3 from completed Expedition runs.

Evolution is presentation-only:

- title button evolution treatment
- High/Ultra Rage presentation enhancement
- no hidden damage/stat bonus from Evolution
- reduced-motion disables the animated max-tier Rage halo

Implemented bounded Nemesis reference chain:

- one active chain
- defeat/return/resolution state
- one-time resolution marker
- no duplicate reward flag

Hunter Fleet and Quantum Echo remain HOLD as required by FINAL 2.

## P90 — reference cinematic

Implemented one production reference cinematic before the final Expedition encounter:

- intro → focus → resolve → cleanup state machine
- replayable
- explicit Skip
- abort/cleanup support
- Test Lab start/stop controls

This is the reference procedural/greybox cinematic. Full cinematic plate rollout
remains HOLD until owner visual/performance approval, as required by the source plan.

## Art/runtime pipeline

New scripts:

- `pnpm expansion:prepare`
- `pnpm expansion:check`

Source:

`art-src/expansion-v2/**`

Runtime:

`src/assets/expansion-v2/**`

Preparation rules:

- icons/enemies: 256 standard + 512 @2x
- bosses: 640 standard + 1024 @2x
- transparent WebP runtime output
- High/Ultra prefers @2x when present

Optional consumers are wired for:

- Expedition mode/Daily/Ghost
- new Relics
- Encounter Recipes
- Typing Patterns
- Sector Conditions
- boss parts
- learning/Wanted Word
- Nemesis/Ghost metadata

If an optional V2 runtime image is absent, the UI falls back to text rather than
crashing.

## Persistence and rollback

Campaign PlayerSave remains the Campaign authority.

Expansion profile:

- key: `spaceTypingExpansionV2ProfileV1`
- profile version: 1
- learning/PB/Ghost/Nemesis/Evolution/event flags are separate from Campaign economy
- future-version V2 profile bytes are not overwritten
- corrupt V2 profile bytes are not silently overwritten
- writes are read-verified

Feature rollback:

- key: `spaceTypingExpansionV2Enabled`
- default: enabled
- persistent off: set value to `false`
- query override: `?expansionV2=off`
- explicit query enable: `?expansionV2=on`
- disabling V2 does **not** delete Expedition run/profile data
- Campaign rollout/event/Nemesis/user-facing V2 entry are disabled while OFF
- Test Lab QA may still exercise production paths explicitly

## Test Lab

Production-path QA controls now include:

- fixed seed Expedition
- force draft/rest/encounter/defeat
- force exact Encounter 1–8
- artificial next-save failure
- exact Typing Pattern
- exact Encounter Recipe
- reference boss parts
- cinematic start/stop
- run/revision/writer/resume snapshot

QA run kind is isolated from normal PB/meta progression.

## P100 release-candidate checks

Automated:

- full regression: PASS
- production build: PASS
- TypeScript: PASS
- existing asset validators: PASS
- V2 profile migration/future/corrupt-storage protection: tested
- Campaign 1–1000 mapping audit: tested with no ERROR-severity profile
- P10 save/reload/storage failure/two-writer suite: covered by full regression
- existing backup/checkpoint/crash-recovery/persistence suites: covered by full regression
- advanced patterns/recipes/contribution tests: covered by full regression

## Manual gates still OPEN

The cloud CI cannot replace the owner's real browser/device acceptance. These are
intentionally **NOT RUN**, not assumed PASS:

1. Mac mini full browser run from title:
   Expedition → drafts → encounters → rest → Solar Storm → final boss → return.
2. Reload during an active encounter and Resume.
3. Campaign fixture comparison before/after Expedition.
4. Daily retry/PB/Ghost visual behavior.
5. Stage 035 → Ancient Gate → Stage 036 both route choices.
6. Wanted Word and Recall evidence UX.
7. boss Cannon/Core readability and targeting.
8. all prepared V2 images opened/visually inspected after `pnpm expansion:prepare`.
9. High/Ultra Rage/Evolution visual quality and reduced-motion behavior.
10. reference cinematic layout/Skip/cleanup.
11. audio balance.
12. official visual baseline viewport/performance capture on the owner's device.
13. qualitative/fun/build-choice gate.

Failures from these manual gates should be reported as bugs/tuning feedback; they do
not require redoing the run-state architecture unless evidence points to it.

## Explicit HOLD / not falsely claimed

Per FINAL 2, the following are not implemented as completed production systems:

- Lost Signal
- Gravity Inversion
- Champion 4-affix
- POS-based build before audit
- Hunter Fleet
- Quantum Echo
- literal punctuation input
- full cinematic rollout
- 20-encounter standard Expedition before duration evidence
- full Mastery Constellation / full Lexicon Boss

## Local Mac mini order

After the final handoff is merged into the local
`feat/bgv-integration-current` tree:

```bash
cd /Users/toandx7651/htdocs/typing-game/games/space-typing

pnpm sprites:prepare
pnpm expansion:prepare
pnpm expansion:check
pnpm test
pnpm build

cd /Users/toandx7651/htdocs/typing-game
./play.sh
```

`pnpm sprites:prepare` handles current top-level enemy/boss source art.
`pnpm expansion:prepare` handles `art-src/expansion-v2/**`.

## Release ownership

Code and automated gates are ready for local acceptance. The owner remains the
release decision maker after the open browser/visual/audio/performance/fun gates.
