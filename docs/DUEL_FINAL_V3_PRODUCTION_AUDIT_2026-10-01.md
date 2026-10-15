# Duel Mode FINAL V3 — Production Acceptance Audit (2026-10-01)

Branch: `feat/bgv-integration-current`

Audited gameplay HEAD before this documentation-only commit:

`6ee6807152f81fe61019063da5094763f51482e1`

Source of truth:

`docs/SPACE_TYPING_DUEL_MODE_MASTER_PLAN_FINAL_V3.md`

## Executive result

The FINAL V3 Duel implementation is wired through the live runtime rather than left as data-only contracts.

The final audit specifically re-checked the gaps most likely to survive a large feature implementation: room-rule wiring, action-effect coverage, map affinity, cooldowns, accuracy quality, Fate/Mystery runtime, Scan information, map-control impact, target freeze, hazard telegraph/protection, Bot decision paths, hidden information, opponent presentation, stress behavior and reconnect-visible shared state.

No known code-path blocker remains from that audit.

The remaining acceptance item is a **real browser High/Ultra visual-performance capture** on the target machine. That is a manual rendering/input-latency confirmation, not a missing Duel gameplay implementation.

## Runtime wiring verified

### Core typing and action loop

- One authoritative `DuelEngine` owns both logical players.
- Player and Bot actions go through semantic intents rather than a direct `WORD_COMPLETE` cheat path.
- Target acquisition is deterministic and prefix-aware.
- Existing locked targets can finish through Freeze Lock; Freeze Lock blocks only new private target acquisition.
- Offer lifetime expiration is authoritative.
- Action cooldowns are authoritative.
- Corrected typing remains valid while deterministic action quality is reduced.
- Stored inventory remains bounded at Attack 3 / Defense 2 / Tactical 2.

### Action and effect coverage

Every current Duel action `effectId` is handled by either the normal combat resolver or the dedicated Fate/Mystery runtime.

Current implemented actions cover:

- instant Attack;
- banked Attack;
- Defense;
- Support;
- Tactical;
- Fate;
- Mystery;
- major telegraphed attack / counter response.

Banked attacks are not publicly exposed while merely stored. When an instant attack actually fires, both clients receive a sanitized public fire event so the opponent renderer can show the projectile without receiving the private offer instance id.

### Strategy systems

Live runtime wiring exists for:

- all five FINAL V3 combo recipes;
- resource banking;
- counters;
- neutral objectives;
- map control;
- traps;
- Scan information;
- conversions;
- Initiative;
- adaptive strategy-path draft affinity.

Trap arming now enforces the Initiative cost through both the normal intent path and the direct engine API, closing the last bypass found during the production audit.

### Fate and Mystery

- Fate is deterministic from the authoritative seeded runtime.
- Pity state is round-local and reset correctly.
- Mystery public snapshots expose rarity/risk but not hidden exact outcomes.
- `SCAN` can reveal Mystery category before the same unresolved Mystery is consumed.
- Exact private reveal events are projected only to the owning player.
- Strong Mystery outcomes are bounded and do not directly delete a healthy player.
- Shared chaos effects alter battlefield conditions rather than silently deciding the winner.

### Maps, hazards and control

All six current Duel maps provide live gameplay identity through map-specific:

- category weighting;
- affinity words;
- hazard tables;
- control objectives;
- Fate/Mystery identity;
- audio profile;
- Cataclysm.

Room Hazard Level and rule modifiers reach the live `DuelMapDirector`.

Map-control pressure changes hazard impact, including contest tactical pressure.

Director hazards now:

1. emit an authoritative telegraph first;
2. preserve the pending warning in shared match state for reconnect;
3. apply the impact only after the telegraph time;
4. enforce target-protection cooldown for Freeze Lock;
5. allow earned map control to shorten contest Freeze Lock duration;
6. never remove the guaranteed incoming-threat counter channel.

The current hazard implementation does **not** destroy a partially typed private word. Therefore the FINAL V3 "partial effort compensation after destructive target removal" clause is not currently needed: the stronger Freeze Lock mechanic blocks new acquisition while allowing an already locked word to finish.

### Bot production behavior

The Bot uses the same intent path as a player and now actively handles:

- per-character timing;
- accuracy mistakes/recovery delay;
- reaction delay;
- personality-weighted target choice;
- authoritative cooldowns;
- incoming major-attack counter tokens;
- neutral-objective contests;
- banked items;
- ready combos;
- Initiative-funded traps.

Bot observation contains only information it is allowed to know. Hidden opponent inventory and hidden Mystery outcome are not supplied to Bot decision code.

### Networking and hidden information

- Duel server remains authoritative for combat state.
- Private target/typing/banking/combo-ready/Mystery reveal events are filtered by viewer.
- Trap type is hidden from the opponent; only the generic public hint is projected.
- Opponent instant attack launches are projected as public fire events without private offer ids.
- Shared pending hazard telegraphs are in the reconnect-visible match view.
- Ranked remains normalized rather than inheriting PvE progression stats.
- Disconnect/release, reconnect and protocol validation are covered by automated tests.

### Test Lab and stress

The Duel Test Lab exposes the production Duel engine for:

- action categories;
- phase forcing;
- map hazards;
- Fate;
- Mystery;
- Cataclysm;
- Bot WPM / accuracy / personality;
- player resources;
- banked weapon / Defense / Tactical;
- forced combos;
- real battle performance capture;
- Crisis and Cataclysm stress scenes.

A production stress test runs every current Duel map through High-Hazard Crisis/Cataclysm logic and also verifies deterministic replay of a stressed Celestial Void match.

## FINAL V3 acceptance-gate status

| Gate | Automated status | Notes |
| --- | --- | --- |
| Core | PASS | simultaneous players, deterministic target ownership, round/reset covered |
| Bot | PASS | typing timeline, accuracy/WPM, counters, objectives, strategy paths covered |
| Strategy | PASS | banking, combo, trap, conversion, Initiative and adaptive path runtime wired |
| Escalation | PASS | phase progression, Director, Cataclysm and production stress covered |
| Map | PASS | maps alter live draft/hazard/control behavior, not background only |
| Fate/Mystery | PASS | seeded, bounded, private information rules covered |
| Network | PASS | authority, projection, reconnect/state restoration and normalized Ranked covered |
| Build/typecheck | PASS | latest audited CI completed production build |
| High/Ultra browser capture | MANUAL | use existing live performance gate in a real browser |

## Latest automated baseline

CI for `6ee6807152f81fe61019063da5094763f51482e1`:

- 213 test files passed;
- 1,291 tests passed;
- TypeScript client and server checks passed;
- Vite production build passed;
- asset/integrity checks in the normal build pipeline passed.

## Manual High/Ultra acceptance procedure

Use Duel Test Lab on the target browser/machine:

1. Set visual quality to High, then Ultra.
2. Open Crisis Stress Scene on representative maps.
3. Open Cataclysm Stress Scene, especially Celestial Void and the visually busiest map.
4. Let the live renderer collect enough samples.
5. Read Live Performance.
6. Verify p95/p99 frame time, slow-frame ratio, UI update time, input-to-visible-feedback latency, projectile/FX caps and visual sharpness.
7. Confirm current target text, counter token, neutral objective and hazard telegraph remain readable.
8. Do not "pass" the gate by disabling approved FX or collapsing High/Ultra into a lower visual mode.

## Pull / test readiness

The branch is suitable for pulling for gameplay testing after the final documentation commit also receives green CI.

Do not call the entire FINAL V3 acceptance "fully closed" until the real-browser High/Ultra capture has been performed, because automated CI cannot measure the user's actual display/GPU/input-latency experience.
