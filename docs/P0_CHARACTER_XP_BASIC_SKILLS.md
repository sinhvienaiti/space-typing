# P0 — Character XP, Basic Skill Points, legacy M17 skill migration

This is an implementation companion to `SPACE_TYPING_UI_UX_CONTENT_PLAN.md`.
PR #92 is an incremental implementation, **not a claim that all other UI/UX batches are complete**.

## Single authoritative systems

- Existing `CharacterProgress` per character is the **only** XP/level/mastery source.
- Existing `UpgradeState` contains `basicSkills[characterId]`, not an independent Skill Engine.
  `BasicSkillProgress` only saves each Basic skill rank (Lv0–5) and spent point count.
- Earned Basic Points are derived from that character's existing `CharacterProgress.level`
  as `level-1` (up to 49). Available = earned - spent, and invalid or rapid duplicate purchases
  cannot consume past the current balance.
- Talent Points remain distinct, with original Lv10/Lv25/Lv40 milestone and rank caps.
- `characterProgressStatBonus` remains the single level/mastery input to
  `calculateEffectiveStats`. Existing six per-level gains are unchanged; the four new
  gains are Armor +0.08, Ward +0.08, Luck +0.015, Salvage +0.015. They are derived,
  **never persisted or granted by a second reward transaction**.
- Starter Basic skills are Barrier, EMP Burst, Emergency Repair at Lv1, with the other
  five core skills initially locked. Rank gates are Lv1, Lv2, Lv8, Lv18, Lv32
  (respectively for target Lv1–Lv5). Each learned rank costs 1 Basic Point.
  Existing character and Support skills retain their own distinct runtime definitions.

## PlayerSave v26 -> v27

- All eight global M17 skill ranks (Lv1–Lv5) had previously been shared between
  characters and paid for with Credits/materials. Migration **grandfathers the
  exact same ranks to every character**. Do not refund paid materials or remove skills.
- Legacy rank grants have `spent=0`; no Basic Points are retroactively awarded
  as mutable currency, because earned is always derived from the **existing** level.
  Thus repeated migration/reload cannot grant more points; players who paid for ranks
  keep that historical advantage rather than losing the original payment.
- The old `UpgradeState.skillLevels` field is retained for old-save compatibility
  but no longer offers a live Station skill-rank purchase route; the existing
  Skill Engine compiles ranks from `basicSkills[selectedCharacter].ranks`.
- Attribute upgrades are an entirely separate permanent paid lane. The v26
  active state, checkpoint, crash-recovery and stage-entry snapshots are sanitized
  through their existing migration paths. The v26 checkpoint migration retains
  the old route rather than resetting route choice.
- Nine old hotbar bindings remain nine slots; existing slot 9 data is **not discarded**.
  New saves use learned starter skills by default; old saved loadouts survive.

## Level pacing: 1,000-stage deterministic simulation

Input: one clear per stage in ascending order, no replay, constant accuracy 95% and
60 WPM. This is a **model**, not real gameplay timing or a user-hardware measurement.
The original `120 + level*35` XP curve reached Level 50 well before 500 stages.
The approved technical candidate preserves Lv1–10 thresholds and increases later
requirements by `9*(level-10)^2` for levels above 10. Existing Level/XP values
remain intact on load, and Lv50 legacy characters remain Lv50.

| Stage | Lv (95%/60 WPM) | Lv (80%/25 WPM) | Lv (99%/100 WPM) |
| ---: | ---: | ---: | ---: |
| 10 | 6 | 5 | 6 |
| 25 | 11 | 10 | 11 |
| 50 | 16 | 15 | 16 |
| 100 | 21 | 20 | 22 |
| 250 | 29 | 28 | 30 |
| 500 | 39 | 37 | 39 |
| 750 | 46 | 45 | 46 |
| 1000 | 50 | 50 | 50 |

At the 95%/60 WPM scenario, **1,000 consecutive replays of Stage 001**
only reach Level 41 under the new curve. Existing stage-clear performance XP
policy is preserved (replays are not silently disabled); optional hidden-encounter
clear currently uses a separate reward path and is **not** given fictitious XP.

## Verification and remaining QA

Unit/regression coverage: all ten stat gains, multi-level awards, level cap,
point earn/spend/gates, veteran paid-rank migration, checkpoint rollback, 1–9
hotbar slot preservation, 1,000-stage XP simulation, full Vitest suite/TS build.

Manual browser inspection remains necessary for responsive Basic Skill cards,
keyboard/screen-reader navigation, a real veteran exported save and repeated
checkpoint recovery. No claim of manual hardware QA or all P0 polish until done.
