# Space Typing Code Review Report

Review date: 2026-09-22  
Reviewed repository: `/Users/jokerit/htdocs/typing-game`  
Review scope: `games/space-typing` plus direct parent-platform integration contracts only  
Reviewed child checkpoint: `82b55d6c0155377e8be129747154f847668d186a`

Report revision: third-pass audit, 2026-09-22. This version supersedes the earlier reports at this path. Original issue IDs are retained for traceability; a reclassified observation is not a confirmed bug.

## Audit outcome at a glance

The first report was not fully precise: four findings treated incompletely specified design decisions as confirmed defects, and the adaptive-difficulty gap was overstated as HIGH. Those conclusions remain corrected. The second pass added eight findings. The third pass adds three more findings and expands three existing ones, based on a final combined run of 32 targeted probes.

Latest additions: concurrent-import rollback can overwrite another import's in-memory state (Issue 22); phase-2 boss volleys miss the stationary ship at common desktop arena heights (Issue 23); a reflected boss kill can emit Stage Clear and then Game Over in the same frame (Issue 24). Existing Issues 2, 9 and 21 now include additional reproduced cases. Current total: 20 actionable findings, with 8 HIGH, 11 MEDIUM and 1 LOW.

| Original finding | Second-pass disposition |
| --- | --- |
| 1: vocabulary origin | Retained HIGH; source/configuration evidence, not a successful HTTP smoke test. |
| 2: recovery arbitration | Retained HIGH; reproduced both equal-rank data loss and resurrection of an older, higher-progress save after import. |
| 3: paused vocabulary | Retained HIGH; reproduced a clear with zero kills after deleting the final enemy. |
| 4: paused import | Retained HIGH; reproduced effect leakage and charge reset, including the actual failed-import handler. |
| 5: adaptive difficulty | Reduced to MEDIUM requirement/integration gap; Normal mode itself is not defective. |
| 6: zero-letter vocabulary | Retained MEDIUM; parser accepts an English value that normalizes to an empty target. |
| 7: projectile priority | Reclassified as a design question. Existing target lock may be intentional. |
| 8: boss shield bypass | Reclassified as a design question. Skill/reflection shield-piercing policy is not explicit. |
| 9: EMP usefulness | Retained MEDIUM; also found the inverse case: interference can be active while EMP is rejected. |
| 10: character base stats | Reclassified as a model/roadmap gap, not proof that existing kits are wrong. |
| 11: unused stage seed | Reclassified as a reproducibility/documentation gap; identical retries are not an unambiguous product requirement. |
| 12: paused WPM | Retained MEDIUM; wall-clock formula includes pause time. |
| 13: boss HUD | Retained LOW; redundant emissions reproduced, no FPS regression measured. |

Second-pass findings are Issues 14-21; third-pass findings are Issues 22-24. Additional conditional/design observations are separated from the severity totals. Recommendations in this report are proposals only: no fixes were implemented.

Unless a parent-platform path is explicitly given, shortened `src/...`, `Game.ts`, and `main.ts` references below are relative to `games/space-typing`. Line numbers refer to the reviewed checkpoint, not the report's own lines.

## 1. Scope and review constraints

This report reviews only Space Typing:

```text
games/space-typing
```

The following sibling games were explicitly excluded from source review:

- `games/monkeytype`
- `games/vocab-shooter`
- `games/recall-typing`
- `games/karaoke-typing`

Parent files were inspected only where they define contracts directly used by Space Typing, including the submodule, Portal route, nginx hosts, development/build commands, shared vocabulary and shared speech/music signaling.

This is a review-only task. No application source, repository tests, configuration, or other documentation was edited. Only this report was created/updated at the user's explicit request. No commit or push was performed. Existing unrelated worktree changes were preserved.

## 2. Sources of truth inspected

Primary source of truth:

```text
games/space-typing/docs/PROJECT_CONTEXT.md
```

Additional Space Typing context:

```text
games/space-typing/README.md
games/space-typing/docs/CHARACTERS_AND_COMBAT.md
games/space-typing/docs/DESIGN.md
```

Relevant parent-platform context:

```text
docs/PROJECT_CONTEXT.md
Section: # 86. Space Typing platform integration
```

Relevant parent integration files inspected:

```text
.gitmodules
dev.sh
play.sh
package.json
scripts/bootstrap.sh
scripts/play.sh
scripts/setup-nginx.sh
infra/nginx/typing-game.local.dev.conf
infra/nginx/typing-game.local.play.conf
portal/public/games.json
portal/src/main.ts
```

## 3. Verification results

### 3.1 Git checkpoint

The parent submodule points exactly to the requested checkpoint:

```text
82b55d6c0155377e8be129747154f847668d186a games/space-typing (heads/main)
```

The child is checked out at detached `HEAD` for that revision.

Recent implementation history confirms:

```text
51dfb17 feat: implement Vanguard combat kit
53fee7c feat: unlock characters at campaign milestones
b146dd4 feat: implement Aegis combat kit
4d173d1 feat: implement Volt combat kit
bf963e2 fix: block Volt EMP when no target exists
274b59d feat: implement Wraith combat kit
04eda5b chore: enable typing-game platform integration
82b55d6 fix: support pnpm 11 build approvals
```

Actual progress therefore matches the requested checkpoint summary:

- Step 40 Vanguard: implemented.
- Step 41 milestone character unlock framework: implemented.
- Step 42: in progress.
- Aegis: implemented.
- Volt: implemented.
- Wraith: implemented.
- Fortune onward: registry metadata and unlockability exist, but unique kits are not implemented.

### 3.2 Automated tests — first pass, same application checkpoint

Command:

```bash
pnpm --dir games/space-typing test
```

Result:

```text
25 test files passed
128 tests passed
0 failed
```

### 3.3 Production build — first pass, same application checkpoint

Command:

```bash
pnpm --dir games/space-typing build
```

Result:

```text
TypeScript noEmit check: PASS
Vite production build: PASS
38 modules transformed
```

Output observed:

```text
dist/index.html
dist/assets/index-ClacaxZf.css
dist/assets/index-Iy-pw7mE.js
```

The build output contains no shared vocabulary assets.

### 3.4 Worktree state

The parent already contained dirty/untracked state before review, including sibling submodule markers and lockfiles. Those files were not reviewed or modified. The child also already showed an untracked `pnpm-lock.yaml`. No tracked application files were changed by the review.

### 3.5 Runtime HTTP verification limitation

An attempt to bind the child Vite server to `127.0.0.1:3004` was rejected by the execution sandbox with `listen EPERM`. The shared-vocabulary integration finding below is therefore based on direct inspection of the client URLs, nginx server blocks and final build contents. Those three sources are sufficient to establish the route mismatch.

### 3.6 Second-pass diagnostic verification

Rechecked child HEAD and worktree: the checkpoint is unchanged, and no tracked child application file has been modified. The test/build results above are the actual first-pass results on this same source, not a claim of a second build. After the user's renewed no-modification instruction, no build or package installation was run.

A temporary diagnostic harness outside the repository executed 24 targeted probes successfully. It loaded the real TypeScript modules using the already-installed TypeScript transpiler in memory. For UI checks, it exposed selected `main.ts` bindings in memory and invoked the real handlers. Canvas/audio, DOM, animation scheduling, fetch, localStorage and IndexedDB were stubbed; storage failures were injected. No real browser profile or save was touched, and no test file was added to the repo.

These are targeted behavioral probes, not 24 new repository tests and not browser end-to-end coverage. Some deliberately confirm a bad state or a design observation; “confirmed” means the described behavior occurred, not that the game passed a correctness test. Private runtime state was arranged to make edge cases deterministic. Browser rendering, actual speech event ordering, real storage quota behavior and late-stage performance remain unverified.

Probe evidence and reproducible arrangements are included below and in Section 13, so this single report does not depend on access to the temporary harness.

### 3.7 Third-pass verification and boundaries

The final combined diagnostic run completed all 32 probes: the existing 24 plus 8 new checks. This is 32 distinct diagnostic cases, not 56 repository tests; repeated exploratory runs are not counted again. The new checks cover overlapping imports, capped offensive assistance, projectile geometry and actual 60 Hz collision updates at four arena heights, terminal-state ordering, stale vocabulary responses and corrupt-primary recovery selection.

New checks were appended to the existing temporary harness in memory only. Only this report was edited in the repository; no new test, source, configuration or build artifact was written. No browser storage was used. An intermediate vocabulary-race fixture failed because a fake-DOM element had not been created; the fixture was corrected in memory and the final combined run succeeded. That fixture error is not a game finding.

The boss collision check uses the real `fireBossProjectiles()` and `update()` methods, including actual projectile velocities and collision tests, not arbitrarily inserted colliding bullets. HP, skill timer, viewport dimensions and phase are arranged to reach the boundary condition. The last combined run uses the real `bossPosition()` as well. This strengthens the runtime evidence without claiming browser rendering or human playtesting.

## 4. Severity summary

| Severity | Count |
| --- | ---: |
| CRITICAL | 0 |
| HIGH | 8 |
| MEDIUM | 11 |
| LOW | 1 |

Total: 20 retained/new actionable findings (19 behavioral defects/inefficiencies and one requirement-integration gap, Issue 5). Reclassified Issues 7, 8, 10 and 11 and conditional observations are excluded.

The checkpoint is not ready for a clean review-pass result despite all current automated tests passing.

## 5. Detailed issues

### Issue 1 — Shared vocabulary is not served on the Space Typing origin

**Severity:** HIGH

**Location:**

- `games/space-typing/src/vocabulary.ts`, constants `INDEX_URL` and `LEVEL_BASE`, lines 7-8.
- `games/space-typing/src/vocabulary.ts`, `loadVocabularyIndex()` and `loadVocabularyLevel()`, lines 22-64.
- `infra/nginx/typing-game.local.dev.conf`, Portal server `/vocabulary/` alias, lines 7-17.
- `infra/nginx/typing-game.local.dev.conf`, Space Typing server, lines 126-144.
- `infra/nginx/typing-game.local.play.conf`, Portal server `/vocabulary/` alias, lines 7-23.
- `infra/nginx/typing-game.local.play.conf`, Space Typing server, lines 75-84.

**Problem:**

Space Typing fetches these same-origin URLs:

```text
/vocabulary/index.json
/vocabulary/<level file>
```

The Portal loads Space Typing in an iframe whose origin is:

```text
https://space.typing-game.local
```

However, the nginx `/vocabulary/` alias exists only in the `typing-game.local` server block. The Space Typing dev server proxies all paths to Vite, and the Space Typing play server falls back to its own `index.html`. Neither server exposes the shared vocabulary directory. The child build itself also contains no vocabulary files.

**Impact:**

The mandatory shared vocabulary contract does not work through the actual parent-platform route. Initial loading falls back to ten bundled entries, while the Class vocabulary dialog cannot load the 100 shared levels.

The dev server may return the SPA HTML with status 200 for `/vocabulary/index.json`, causing JSON parsing to fail rather than producing a clear HTTP 404.

**Scenario:**

1. Open `https://typing-game.local/space-typing`.
2. Portal creates an iframe for `https://space.typing-game.local`.
3. Space Typing requests `https://space.typing-game.local/vocabulary/index.json`.
4. The Space server does not route that path to `shared/vocabulary`.
5. Initial load logs the fallback warning and uses the bundled list.

**Recommended fix:**

Use an explicit configurable shared-asset origin, such as:

```text
https://typing-game.local/vocabulary/
```

The parent already adds permissive CORS for vocabulary. For standalone development, add a Vite proxy or environment-specific shared origin. Alternatively, add matching `/vocabulary/` aliases/proxies to the Space server in both dev and play configurations. Add an HTTP smoke test for `index.json` and one level file in both modes.

---

### Issue 2 — A newer recovery save can be discarded in favor of stale IndexedDB data

**Severity:** HIGH

**Location:**

- `games/space-typing/src/persistence/player-save.ts`, `progressRank()` and `chooseFurthestCampaign()`, lines 329-352.
- `games/space-typing/src/persistence/player-save.ts`, recovery selection in `loadPlayerSave()`, lines 472-507.
- `games/space-typing/src/persistence/player-save.ts`, fallback write in `savePlayerProgress()`, lines 540-573.

**Problem:**

If an IndexedDB write fails, `savePlayerProgress()` writes the whole current save to localStorage recovery and reports `localStorage` success.

On the next load, source arbitration compares only Campaign rank:

```text
highest unlocked stage
cleared-stage count
best-result count
```

If those values tie, `chooseFurthestCampaign()` returns the preferred IndexedDB Campaign. `loadPlayerSave()` then chooses inventory, equipment, support spells and characters from the same stale IndexedDB save, even if recovery storage has a newer `updatedAt` and newer permanent state.

**Impact:**

The UI can report that progress was saved to recovery storage, but a reload can silently lose:

- consumed or received inventory;
- equipment/loadout changes;
- support-spell loadout changes;
- selected/unlocked character changes;
- better results that do not change the Campaign rank tuple.

**Scenario:**

1. Campaign remains at Stage 120 in both stores.
2. Player changes character or equipment.
3. IndexedDB write fails; localStorage recovery succeeds.
4. Player reloads.
5. Campaign ranks tie.
6. IndexedDB wins the tie, and the new character/equipment state is discarded.

**Recommended fix:**

Choose the authoritative complete save using explicit revision/commit semantics, including intentional import replacement. Do not automatically merge “furthest Campaign” into an intentionally imported earlier backup: this can undo the user's restore. A validated timestamp may help arbitrate legacy saves, but should not blindly trust timestamps supplied by imported files. Test both equal-rank recovery updates and intentional lower-progress imports with a failed mirror write.

**Second-pass evidence:** With identical Campaign rank, an IndexedDB failure saved `repair-kit: 1` successfully to recovery. Reload selected stale IndexedDB `repair-kit: 2` and overwrote recovery with 2. The inverse scenario also reproduces: importing Stage-1 progress succeeds in IndexedDB, the recovery mirror fails, and the next load restores stale Stage-101 recovery over the imported Stage-1 save. The original recommendation to merge furthest progress independently was therefore insufficient.

**Third-pass extension — corrupt primary:** An IndexedDB record `{}` is normalized into a default save rather than excluded as an invalid candidate. If valid recovery is also at the initial Campaign rank but contains 5 repair kits, the normalized primary wins and replaces both loaded inventory and the recovery mirror with `{}`. This requires a malformed stored record; it is not a claim that ordinary gameplay creates `{}`. Recovery arbitration must consider candidate validity/provenance as well as freshness, and must not overwrite good recovery with a synthesized default merely because ranks tie.

---

### Issue 3 — Applying vocabulary while paused can delete enemies and clear a stage

**Severity:** HIGH

**Location:**

- `games/space-typing/src/Game.ts`, `setVocabulary()`, lines 749-755.
- `games/space-typing/src/main.ts`, pause-menu Vocabulary button wiring, lines 1911-1913.
- `games/space-typing/src/main.ts`, `applyClassLevel()`, lines 1749-1779.
- `games/space-typing/src/main.ts`, custom vocabulary apply handler, lines 1932-1947.
- `games/space-typing/src/Game.ts`, stage-finish condition, lines 1048-1063.

**Problem:**

The pause menu permits opening and applying a new vocabulary. Applying it calls `game.setVocabulary()`, which immediately performs:

```text
this.enemies = []
this.targetId = null
this.spawnTimer = 0.2
```

It does not restart the stage or restore the already-decremented `spawnRemaining` count.

**Impact:**

Live enemies can be deleted without typing them. This corrupts score/kills/learning behavior and can satisfy the stage-clear condition.

**Scenario:**

1. All enemies in the stage budget have spawned, so `spawnRemaining === 0`.
2. Several enemies are still alive.
3. Pause the game and apply a Class or Custom vocabulary.
4. `setVocabulary()` removes every enemy.
5. Resume the game.
6. On the next update, `spawnRemaining === 0 && enemies.length === 0`, so the stage clears.

**Recommended fix:**

Do not mutate live combat entities when changing the vocabulary source. Store the new vocabulary as pending and apply it at the next stage start/retry, or restrict vocabulary apply to the title phase. If changing it mid-stage is intentionally supported, explicitly restart the current stage.

**Second-pass evidence:** With one live enemy and no remaining spawns, pause → `setVocabulary()` → resume → one update produced `phase: stageclear`, `kills: 0`, and one stage-clear callback. Also audit asynchronous initial loading at `main.ts:1782-1797`: its eventual `setVocabulary()` call needs the same safe-stage-boundary policy.

---

### Issue 4 — Import during pause resets skills, leaks old effects and cannot fully roll back

**Severity:** HIGH

**Location:**

- `games/space-typing/src/main.ts`, `openData()`, lines 1614-1620.
- `games/space-typing/src/main.ts`, `importSaveFile()`, lines 1654-1735.
- `games/space-typing/src/main.ts`, pause Data button wiring, lines 1873-1875.
- `games/space-typing/src/Game.ts`, `setCharacter()`, lines 248-253.
- `games/space-typing/src/Game.ts`, `setSupportSpells()`, lines 259-265.
- `games/space-typing/src/Game.ts`, `setPlayerStats()`, lines 740-747.
- `games/space-typing/src/skills/engine.ts`, `setDefinitions()`, lines 82-93.

**Problem:**

The Data dialog and Import action are accessible while a stage is paused. Import immediately replaces app state and calls:

```text
applySelectedCharacter()
applyEquipmentStats()
applySupportSpells()
```

Changing the character or support loadout calls `SkillEngine.setDefinitions()`, which resets all cooldowns, charges and per-stage usage. Existing combat timers such as barrier, reflect, guardian, gravity well, time shell and cloak are not reset.

`setPlayerStats()` updates the underlying effective stats while a paused run retains its existing `GameStats` maxima. Damage and regeneration can therefore use new stats while the HUD/current resource caps still describe the previous run.

If the import storage write fails, the code restores the previous app objects and applies their character/support settings again. This resets SkillEngine a second time, but cannot reconstruct cooldowns, charges or stage usage from before the import. The rollback message therefore overstates what was restored.

**Impact:**

- Character effects can leak into another character.
- Skill cooldowns, charges and per-stage limits can be refreshed during a stage.
- Imported equipment can partially affect an existing run.
- Imported Campaign state can disagree with the active stage.
- Failed imports do not restore the actual combat runtime.

**Scenario:**

1. Start with Wraith and trigger Cloak.
2. Spend character/support skill charges.
3. Pause and import a save with Aegis selected.
4. Resume with Aegis selected, fresh skill states and the old Wraith Cloak timer still active.

**Recommended fix:**

Only permit import from the title phase, or force the current run to end before applying imported state. Persist the validated imported save first; only after a successful write should the app replace in-memory state and build a clean runtime. Avoid attempting to roll back a live combat engine from high-level persistence objects.

**Second-pass evidence:** A paused setter sequence changed Wraith to Aegis while retaining 5.5 seconds of Cloak; effective Shield became 140 while the live HUD cap stayed 40. Separately, the real `importSaveFile()` failure handler changed Barrier state from `{cooldown: 9, charges: 3, uses: 1}` to `{cooldown: 0, charges: 4, uses: 0}` while displaying “Previous progress was restored.” The injected storage failure and DOM were mocked; the import handler and skill engine were real.

---

### Issue 5 — Adaptive and selectable difficulty are not connected to gameplay

**Severity:** MEDIUM — requirement/integration gap, reduced from HIGH in the first report.

**Location:**

- `games/space-typing/src/main.ts`, `startSelectedStage()`, lines 1307-1322.
- `games/space-typing/src/campaign/difficulty.ts`, `difficultyFor()`, lines 52-125.
- `games/space-typing/docs/PROJECT_CONTEXT.md`, adaptive requirements around lines 740-835.
- `games/space-typing/docs/PROJECT_CONTEXT.md`, Step 15A around lines 2707-2711.
- `games/space-typing/docs/PROJECT_CONTEXT.md`, current-status claim around line 3018.

**Problem:**

Every stage is currently started with:

```text
mode: normal
recentWpm: 60
recentAccuracy: 96
```

There is no difficulty selection UI or persisted mode. Recent Campaign performance is not read or smoothed. Because the mode is `normal`, `difficultyFor()` ignores the WPM and accuracy fields entirely.

**Impact:**

The live behavior does not fulfill Step 15A or the current-status adaptive claim. A slow learner and an expert receive the same pressure at the same stage and vocabulary level. Equal pressure is appropriate for fixed Normal mode; the defect is the absent selectable/adaptive integration, not Normal's behavior itself. The Step 15A roadmap entry states the requirement; it is the current-status section that overstates delivery.

**Scenario:**

Run Stage 100 with a 30 WPM profile and a 150 WPM profile. Both calls to `difficultyFor()` receive the same hardcoded Normal inputs and produce the same profile.

**Recommended fix:**

Add a small persisted difficulty setting, derive recent valid WPM/accuracy from Campaign results, apply smoothing between stages and pass real values into `difficultyFor()`. No mid-word adjustment is needed.

---

### Issue 6 — Custom vocabulary permits targets with zero typeable letters

**Severity:** MEDIUM

**Location:**

- `games/space-typing/src/vocabulary.ts`, `isVocabularyEntry()`, lines 10-20.
- `games/space-typing/src/vocabulary.ts`, `parseCustomVocabulary()`, lines 67-94.
- `games/space-typing/src/logic.ts`, `typingText()`, lines 11-13.
- `games/space-typing/src/Game.ts`, target and boss entry selection, lines 1182-1191 and 1272-1287.

**Problem:**

Vocabulary validation only requires a non-empty English string. Combat strips every non-`a-z` character. An entry such as `123`, `---` or an emoji is accepted but produces an empty typing target.

If all entries are untypeable, the fallback inside `pickVocabularyEntry()` and `pickBossEntry()` still selects from the invalid source array.

**Impact:**

Normal enemies cannot be locked by first letter, and boss words can never advance. This can create a soft-locked or guaranteed-loss stage.

**Scenario:**

Save this custom row:

```text
123 | một hai ba | /.../
```

The entry is accepted, but `typingText("123")` is empty. Every letter typed at the boss is treated as a miss.

**Recommended fix:**

Require `typingText(en).length > 0` in both shared and custom entry validation. The custom UI should report ignored invalid rows instead of silently accepting them.

---

### Original Issue 7 — Locked-target projectile priority: reclassified

**Status:** Design clarification; not counted as a confirmed defect.

**Location:**

- `games/space-typing/src/Game.ts`, `handleKey()`, lines 836-887.
- `games/space-typing/src/Game.ts`, `findProjectileForKey()`, lines 1403-1409.

**Observed behavior and uncertainty:**

`handleKey()` routes letters to an existing enemy lock before checking projectiles. A direct runtime probe confirms that pressing a projectile's letter can record an enemy-word miss and leave the projectile intact. However, first-letter word locking is also an explicit mechanic. The reviewed requirements do not unambiguously require interrupting an existing word to intercept projectiles. The first report incorrectly treated one possible priority policy as mandatory.

**Scenario:**

1. Lock a 12-letter enemy word.
2. A Destroyer fires a projectile labeled `a`.
3. Pressing `a` is sent to the locked enemy.
4. If `a` is not the expected enemy letter, it records a miss; either way the projectile remains.

**Decision needed:**

Document whether lock commitment is intentional. If interception while locked is wanted, specify collision precedence when a projectile and the next word character are identical; unconditional projectile-first routing can steal a correct word input. Add a policy test before changing behavior. Do not implement the first report's suggested priority change without this decision.

---

### Original Issue 8 — Boss shield damage policy: reclassified

**Status:** Design clarification; not counted as a confirmed defect.

**Location:**

- `games/space-typing/src/Game.ts`, Chain Lightning boss damage, lines 570-583.
- `games/space-typing/src/Game.ts`, Meteor boss damage, lines 673-685.
- `games/space-typing/src/Game.ts`, Thunder Grid boss damage, lines 2027-2044.
- `games/space-typing/src/Game.ts`, reflected boss projectile damage, lines 2101-2113.
- `games/space-typing/src/Game.ts`, normal boss typing shield check, lines 1505-1516 and 1531-1546.

**Observed behavior and uncertainty:**

Typing prevents per-key HP damage while `boss.shieldActive`; Chain Lightning, Meteor, Thunder Grid and reflected projectiles subtract HP without that check. This is real behavior: a probe reduced a shielded boss from 600 to 542 HP with Chain Lightning while its shield remained active. However, the shield-phase descriptions do not clearly specify whether those special sources must be blocked or may pierce the shield. The previous report asserted an all-damage gate without sufficient evidence.

**Scenario:**

The major boss enters phase 2 and activates its shield. Volt uses Thunder Grid. Boss HP immediately drops despite the active shield, and a phase transition or death remains possible.

**Decision needed:**

Specify the shield policy per damage source, then test it. A small common boss-damage helper may reduce inconsistencies, but its rule must follow that decision. Do not silently nerf skills/reflection based on the earlier report.

---

### Issue 9 — Offensive-skill preflight does not match available gameplay effects

**Severity:** MEDIUM

**Location:**

- `games/space-typing/src/Game.ts`, `canUseSkill()` EMP preflight, lines 303-310.
- `games/space-typing/src/Game.ts`, `activateEmpPulse()`, lines 467-492.
- Third-pass extension: Chain Lightning/Meteor preflight at lines 312-318 and 333-339, effect application at lines 548-568 and 652-670; `src/skills/offensive.ts`, `chainTypingAdvance()`.

**Problem:**

EMP is considered useful whenever any enemy exists. Its actual gameplay effects are:

- clear projectiles;
- clear interference;
- delay enemies whose `actionCooldown` is non-null;
- delay the boss.

Scout, Mine, Tank, Shield and several other targets may have no action cooldown. With no projectile, interference or boss, the activation only creates flash/kick/VFX.

**Impact:**

Generic EMP or Volt EMP consumes Energy and starts cooldown even though no meaningful state changed.

**Scenario:**

Use EMP against a lone Scout in an early stage with no projectile and no Jammer interference. The skill succeeds but changes no hostile gameplay state: Volt's Energy falls to 70, its cooldown becomes 12 seconds, while the Scout's speed, position and null action timer are unchanged. `kick` is a drawing offset, not simulation knockback.

The inverse is also possible: after a Jammer is removed, interference may remain while there are no enemies/projectiles/boss. The preflight rejects EMP as `effect-not-needed`, even though `activateEmpPulse()` would clear that active interference. A probe with `interferenceTimer: 1` confirms this rejection.

**Recommended fix:**

Compute usefulness from the effects actually available: active interference, projectiles, boss, or enemies with an action timer. Test both false-positive and false-negative cases. Shield-layer removal is a separate design choice, not a required fix for this finding.

**Third-pass extension — capped Chain Lightning/Meteor:** A single-layer enemy with one letter remaining is already at the assistance cap. With that enemy as the only target and no boss, both skills still activate. Probes with a locked `testing` enemy at `typed: 6` left typed progress, layers and position unchanged, while Chain consumed 38 Energy plus one charge/use and started an 11-second cooldown; Meteor consumed 42 Energy plus one charge/use and started an 18-second cooldown. The remaining flash/kick/particles do not change collision position or combat timing. Valid one-letter enemies have the same no-assistance edge case.

For these abilities, preflight must inspect the effects on the actually selected targets: a removable layer or progress strictly below the assistance cap, or an applicable boss effect. Keep this separate from Issue 14's acquisition fix: restoring targetability does not prevent a capped assistance cast from consuming resources. These related no-effect checks are grouped in Issue 9 rather than counted as another issue.

---

### Original Issue 10 — Character base-stat/affinity model: reclassified

**Status:** Model/roadmap clarification; not counted as a confirmed gameplay defect.

**Location:**

- `games/space-typing/src/characters/registry.ts`, `CharacterDefinition`, lines 17-26.
- `games/space-typing/src/Game.ts`, `setCharacter()`, lines 248-253.
- `games/space-typing/src/main.ts`, `applyEquipmentStats()`, lines 1207-1212.

**Problem:**

The source of truth says each character owns base stats, equipment affinity, visual identity and play style. The registry stores only names, role text and ability names. Every character receives `DEFAULT_PLAYER_BASE_STATS`; selecting a character changes only runtime skill/passive branches.

**Qualification:**

The documentation describes character-owned base stats and affinity, but does not provide mandatory distinct numeric profiles for the four implemented kits. Aegis already has defensive identity through its passive, Reflect Field and Fortress Protocol; Volt already gains Energy through its kit. Identical base stats alone do not prove those roles are incorrectly implemented. The first report's role conclusion was too strong.

**Scenario:**

Start a stage with identical equipment as Vanguard and Aegis. Their maximum Hull, Shield and Energy values are identical despite the documented roles.

**Decision needed:**

Clarify whether base-stat differences/affinities are required now or later. If required, a small optional data profile can feed the existing stat pipeline; otherwise document shared defaults. Do not invent balance values or require a framework as part of fixing the actual runtime bugs.

---

### Original Issue 11 — Unused seed and determinism scope: reclassified

**Status:** Reproducibility/documentation gap; not counted as a confirmed gameplay defect.

**Location:**

- `games/space-typing/src/campaign/stage.ts`, `stageSeed()` and `StageConfig.seed`, lines 36-39 and 82-91.
- `games/space-typing/src/Game.ts`, `randomBetween()`, lines 151-153.
- `games/space-typing/src/Game.ts`, gameplay calls to `Math.random()` throughout spawning, words, elite rolls and projectile letters.
- `games/space-typing/src/enemies/kinds.ts`, `chooseEnemyKind()`, lines 149-177.
- `games/space-typing/src/enemies/elite.ts`, RNG functions, lines 17-46.

**Problem:**

The Stage model produces a deterministic seed, but the live combat runtime never consumes it. Enemy kinds, elite rolls, modifiers, word selection, positions, speed variance, projectile letters and spawn jitter use global randomness.

**Impact:**

Retrying a stage can create different combat conditions, and stage/seed alone cannot reproduce a runtime encounter. README's "deterministic Campaign model" can reasonably describe stage metadata rather than identical retries. The source of truth also asks for testable deterministic stage behavior, so the intended scope should be clarified; the first report overreached by treating encounter replay identity as settled.

**Scenario:**

Retry the same stage with the same vocabulary and loadout. The enemy sequence, elite status, words and projectile letters differ.

**Recommended fix:**

If reproducible encounters are required, inject a stage-scoped seeded gameplay RNG and keep cosmetic randomness separate. Otherwise narrow the documentation and inject controlled randomness for tests only. This is not an unconditional release blocker.

---

### Issue 12 — Saved WPM includes pause and dialog time

**Severity:** MEDIUM

**Location:**

- `games/space-typing/src/main.ts`, `stageStartedAt`, line 618.
- `games/space-typing/src/main.ts`, stage-clear WPM calculation, lines 1030-1042.
- `games/space-typing/src/main.ts`, start timestamp, lines 1320-1321.

**Problem:**

WPM is derived from wall-clock time between stage start and stage clear. The calculation does not subtract pause time or time spent in settings, vocabulary and data dialogs.

**Impact:**

Campaign best results can contain severely understated WPM. Once adaptive difficulty is connected, these invalid samples will reduce combat pressure incorrectly.

**Scenario:**

Pause for five minutes halfway through a stage, then resume and clear normally. Those five minutes are included in the recorded WPM denominator.

**Recommended fix:**

Track active combat elapsed time through the pause-safe game clock, or explicitly accumulate paused duration and subtract it from the stage result.

---

### Issue 13 — Boss HUD performs unnecessary DOM writes every stagger frame

**Severity:** LOW

**Location:**

- `games/space-typing/src/Game.ts`, `updateBoss()`, lines 1121-1124.
- `games/space-typing/src/main.ts`, `renderBoss()`, lines 984-1007.

**Problem:**

While a boss is staggered, `onBossUpdate()` is invoked on every animation frame. `renderBoss()` repeatedly updates boss text, HP text, CSS class state and HP bar width even though the visible stagger state remains unchanged until the timer expires.

**Impact:**

This adds avoidable DOM work during boss combat, when Canvas effects and projectile load are already highest.

**Scenario:**

A nonlethal perfect boss word creates roughly one second of boss-HUD updates at animation-frame frequency. The second-pass probe observed 30 callbacks during 30 stagger updates; this establishes redundant emission, not a measured frame-rate problem.

**Recommended fix:**

Emit only when stagger begins or ends, or throttle boss HUD refresh to the existing 100-150 ms HUD cadence.

### Issue 14 — Skill-assisted progress makes unlocked enemies impossible to target

**Severity:** HIGH — new, reproduced for all three affected abilities.

**Location:**

- `games/space-typing/src/logic.ts:54-56`, `chooseTarget()`.
- `games/space-typing/src/Game.ts:548-563`, Chain Lightning.
- `games/space-typing/src/Game.ts:652-665`, Meteor.
- `games/space-typing/src/Game.ts:2008-2018`, Volt Thunder Grid.
- `games/space-typing/src/Game.ts:836-887`, `handleKey()` routing.

**Problem:** These effects advance `enemy.typed` on multiple enemies, including enemies without the current target lock. Acquisition only accepts `enemy.typed === 0`. An affected single-layer enemy therefore no longer qualifies for acquisition, yet also has no existing lock through which typing could continue. Skill progress is capped short of completion, so another use does not resolve the final letters.

**Impact:** An offensive/support ability can remove the player's typing path for one or several live enemies. Those enemies can continue approaching and damage the player; this is not just a highlight/rendering problem. The currently locked enemy can still be typed, and enemies that only lose a layer without gaining typed progress are not affected by this specific bug.

**Scenario and evidence:** Arrange a live, single-layer `testing` enemy with `typed: 0` and no lock. Activate each ability with its resource/typing conditions met. Chain Lightning and Thunder Grid set `typed: 2`; Meteor sets `typed: 1`. Press both the first letter and the next expected letter. In each probe, `targetId` remains null, typed progress is unchanged and two misses are recorded.

**Recommended fix:** Make acquisition support partially advanced, unlocked words using a clearly displayed next-character rule; retain current first-letter behavior for untouched words. Alternatively represent skill assistance separately from actual typed progress. Do not merely remove the `typed === 0` guard while still matching `word[0]`: that can acquire a word using the wrong continuation character. Test multiple affected enemies, an existing lock and layered enemies.

### Issue 15 — “Replay stage” starts the next selected stage

**Severity:** MEDIUM — new, reproduced through the real UI handler.

**Location:** `src/main.ts:356` button label, `main.ts:1038-1043` clear handling, `main.ts:1307-1321` `startSelectedStage()`, `main.ts:1804-1805` Replay/Next handlers, and `src/campaign/progress.ts:93-111` `recordStageClear()`; all paths relative to `games/space-typing`.

**Problem:** Clearing a stage advances `campaign.selectedStage`. Both “Replay stage” and “Next stage” then call `startSelectedStage()`, which reads that advanced selection, not the stage just cleared.

**Impact:** Replay does not perform its advertised action. The user must return to Stage Select to replay the cleared stage. At the Campaign cap, this particular next-stage discrepancy is masked.

**Scenario and evidence:** Start Stage 1, trigger its real completion callback, then click `clearRetryButton`. The probe observes `selectedStage: 2` and a newly started `stats.stage: 2`.

**Recommended fix:** Keep the completed run's stage ID and pass it explicitly to a small start-stage function for Replay. Next/Continue can continue using the campaign selection. Test the two buttons separately.

### Issue 16 — Frenzy action-rate modifier disappears after the first action

**Severity:** MEDIUM — new, reproduced.

**Location:** `src/enemies/elite.ts:48-74`, `applyEliteModifiers()`; `src/Game.ts:1001-1012`, recurring enemy action reset.

**Problem:** The spawn-time Frenzy modifier multiplies a non-null action cooldown by 0.72. After the first action, `Game.update()` resets the timer using only the enemy profile and pressure, ignoring the modifier.

**Impact:** An elite retains its Frenzy designation but loses its accelerated recurring actions. This finding concerns action-bearing enemies; Frenzy's speed fallback on enemies with no action timer is a separate path.

**Scenario and evidence:** Arrange a Frenzy Destroyer just before firing. The tested difficulty yields a modified interval of approximately 2.7533 seconds, but its next cooldown is approximately 3.8240 seconds, the unmodified interval.

**Recommended fix:** Use the same small action-interval calculation for initial and recurring actions. Do not reapply the entire elite modifier function to an already modified enemy each tick, which would compound unrelated modifiers. Test at least two consecutive actions.

### Issue 17 — A lethal final boss letter skips actual word completion

**Severity:** MEDIUM — new, reproduced.

**Location:** `src/Game.ts:1490-1524` per-key progress/damage and early defeat return; `Game.ts:1527-1559` completion hook, passives and score.

**Problem:** Per-key damage can kill the boss on the exact keystroke that completes its word. The early death return executes before `onWordComplete`, Volt's long-word passive, Aegis's perfect-word passive, word count and completion score.

**Impact:** A genuinely completed English target misses its VI/IPA/pronunciation reveal and completion rewards. This is independent of the intentional case where the boss dies before the word is fully typed; an incomplete word should not be falsely revealed.

**Scenario and evidence:** Use Volt against a `testing` boss word with `typed: 6`, HP 1 and Energy 30. Press `g`. The probe observes Stage Clear and `typed: 7`, but zero word-complete callbacks and Energy still 30. An ordinary-enemy completion control grants the long-word Energy once; it is not a claim of exhaustive boss completion coverage.

**Recommended fix:** Determine whether this input completed the word and dispatch its completion/rewards exactly once before finalizing defeat. Avoid rotating to a new word or triggering duplicate defeat after death. Test final-letter lethal damage, mid-word lethal damage and lethal completion-bonus damage independently.

### Issue 18 — Thunder Grid loses its boss action delay when damage changes phase

**Severity:** MEDIUM — new, reproduced.

**Location:** `src/Game.ts:2027-2038`, Volt ultimate; `Game.ts:1582-1594`, `updateBossPhase()`.

**Problem:** Thunder Grid adds `VOLT_EMP_DELAY` to the boss timer before calling `updateBossPhase()`. When its damage crosses a phase boundary, that function replaces the timer with the new phase's normal interval, discarding the delay.

**Impact:** The same ultimate loses its intended action-suppression component depending on the boss's HP threshold. This does not require deciding whether skills pierce an already active shield: the reproduced transition starts in unshielded phase 1.

**Scenario and evidence:** Arrange a major boss at 70% HP in phase 1, with 1 second until its next action. Activate Thunder Grid at 100 Power. The boss enters phase 2 with approximately 2.7107 seconds, exactly the normal phase interval; the additional 3.5-second EMP delay is absent.

**Recommended fix:** Resolve damage/phase transition before applying the action delay, or preserve a separate suppression timer across transitions. Test damage that crosses a phase boundary and damage that does not.

### Issue 19 — Recovery fallback can reject a save after partially committing it

**Severity:** HIGH — new, fault-injected reproduction.

**Location:** `src/persistence/player-save.ts:384-386`, `saveRecovery()`; `player-save.ts:572-573`, fallback return; `src/main.ts:1654-1735`, import/rollback handling.

**Problem:** `saveRecovery()` first writes the complete recovery save and then writes the separate legacy Campaign key. These writes are not atomic. If the first succeeds and the second fails, `savePlayerProgress()` rejects even though the new full recovery save is already durable. The import handler restores only its old in-memory objects; it does not undo that persisted write.

**Impact:** The app can report a failed import and restoration of previous progress, but load the imported data after reload. This is a storage commit-status defect even when import occurs at the title screen, independent of Issue 4's paused-runtime mutation and Issue 2's competing-save arbitration.

**Scenario and evidence:** Disable/fail IndexedDB, keep an old Stage-1 Campaign, and import a save with Stage 101 unlocked. Allow the recovery-key write and inject failure only on the following legacy Campaign write. `savePlayerProgress()` rejects, yet a later `loadPlayerSave()` returns Stage 101. Real browser quota timing was not tested; the two-write failure path was exercised with in-memory storage.

**Recommended fix:** Define one full-save record as the authoritative fallback commit. Once it succeeds, a failed legacy mirror should not be reported as failure of that commit. Reconcile reads accordingly, including intentional earlier-backup imports from Issue 2. Do not promise an atomic rollback across independent storage writes unless it actually exists.

### Issue 20 — Valid empty backup collections are silently replaced with starter grants

**Severity:** MEDIUM — new, reproduced import-contract edge case.

**Location:** `src/equipment/loadout.ts:245-246` sanitizer and `loadout.ts:378-424` validator; `src/skills/support-loadout.ts:44-45` sanitizer and `support-loadout.ts:75-119` validator; `src/persistence/player-save.ts:175-176` save normalization; `src/persistence/backup.ts`, `parsePlayerSaveJson()`.

**Problem:** Current-version validation accepts equipment `{items: [], loadout: <all slots null>}` and support spells `{unlocked: [], loadout: [null, null]}`. Subsequent normalization treats these explicitly empty, validated collections as missing/invalid and substitutes starter state.

**Impact:** A backup accepted as valid does not preserve its contents: importing it grants and equips starter resources instead. This is not a demonstrated normal-play item-loss path; the current UI does not normally remove every owned item. It is an externally supplied, schema-valid backup edge case and a validator/sanitizer contract mismatch.

**Scenario and evidence:** Take a valid v8 backup, replace the two collections with the empty shapes above, then call the real parser. Result: `ok: true`, 8 equipment items and 4 unlocked support spells, instead of zero.

**Recommended fix:** Either preserve explicit valid emptiness or reject it clearly if the product requires starter ownership. Apply migration defaults to missing legacy fields without silently rewriting valid current-version values. Test validate → parse → export fidelity.

### Issue 21 — Vocabulary application can leave source metadata and words out of sync

**Severity:** MEDIUM — new, reproduced through the real handler.

**Location:** `src/main.ts:1749-1779`, `applyClassLevel()`; `main.ts:1303-1317`, source-derived difficulty; `main.ts:1782-1797`, asynchronous initial vocabulary; `main.ts:1932-1947`, Custom apply; startup calls at `main.ts:2131-2132`.

**Problem:** After fetching a level, the handler changes `sourceState` and `sourceTab` before writing localStorage. If that write throws, the catch reports failure, but the source variables remain changed while `game.setVocabulary(entries)` has never run.

**Impact:** The next stage uses the new level's difficulty factor with the previous level's words. The visible failure also does not reflect the partially changed in-memory selection.

**Scenario and evidence:** Begin with level 1, fetch level 2 successfully, and inject failure for `spaceTypingVocabularySourceV1`. The real handler returns with `sourceState.level: 2`, while the game's vocabulary is still the exact previous array.

**Recommended fix:** Prepare the next source locally, perform the write before committing in-memory selection, then apply it at the safe stage boundary from Issue 3. If nonpersistent session-only changes are intentionally allowed, apply metadata and vocabulary together and report the persistence limitation honestly. Audit the Custom handler's multi-write sequence with the same principle.

**Third-pass extension — stale successful fetch:** Initial Class loading is asynchronous and has no generation/source check when its response arrives. A user can successfully apply Custom vocabulary while that request is pending; the older Class response then overwrites the runtime vocabulary even though source metadata and localStorage still say Custom. The real handlers reproduced `source: custom`, stored `newword | new`, but runtime English `oldword` from the delayed Class response. No storage failure is needed. Introduce a small request/selection generation check, or otherwise ensure only the current selection's response can commit. This is distinct from Issue 3: it corrupts selection consistency even at the title screen, without clearing a live stage.

### Issue 22 — Overlapping imports can roll back another import's in-memory state

**Severity:** HIGH — third-pass, reproduced through the real import handlers.

**Location:** `src/main.ts:1654-1735`, `importSaveFile()`; import button/file-input handlers at `main.ts:1880-1897`; `src/persistence/autosave.ts:27-40`, `flush()` write serialization.

**Problem:** Import has no in-flight guard. Each invocation snapshots the current app objects, replaces them immediately, awaits its save, and independently rolls back on failure. The autosave queue serializes storage writes but not those higher-level mutations/rollbacks. A first import can therefore restore its older snapshot after a second import has already installed newer state.

**Impact:** A later import can report success and exist on disk while the UI/game use an older in-memory Campaign/inventory/loadout. Subsequent saves can overwrite the successful import with that old state. This remains possible at the title screen, so restricting import to title (Issue 4) alone is insufficient. It also does not require the partial-write condition from Issue 19.

**Scenario and evidence:** Begin with Stage 2 unlocked. Start import A with Stage 101; while A is unresolved, start B with Stage 201. Inject a failure for A's authoritative recovery write and let B's write succeed. After both real handlers settle, recovery contains Stage 201 and the notice says `✓ Save imported`, but in-memory Campaign is back at Stage 2. The probe used two asynchronous handler invocations and a one-time storage failure; no browser profile was touched.

**Recommended fix:** Allow only one import transaction at a time, disable the relevant controls while pending, and guard the handler itself. Prepare and persist imported data before publishing it to app state; keep the mutation/rollback boundary serialized, not only the writer. Closing the dialog or starting a run while an import is pending needs the same consistent policy. Test A-fails/B-succeeds and the reverse, plus repeated import attempts.

### Issue 23 — Phase-2 boss volleys miss the stationary player at common desktop heights

**Severity:** MEDIUM — third-pass, confirmed analytically and by real collision updates.

**Location:** `src/boss/model.ts:134-145`, `bossProjectileCount()`; `src/Game.ts:1136-1170`, `fireBossProjectiles()`; `Game.ts:1021-1035`, projectile collision; `Game.ts:2508-2513`, `bossPosition()`.

**Problem:** Phase 2 of both Boss and Major Boss uses two projectiles at offsets -0.08 and +0.08 radians around the player direction, with neither shot on the center line. The player cannot move and both boss and player are horizontally centered. As arena height increases, both trajectories miss the player's collision circle. Extra speed does not fix that geometric miss.

**Impact:** Transitioning from one aimed shot to two shots removes all direct projectile threat at common desktop arena heights. The same phase hits twice on a shorter arena. This is a large viewport-dependent combat difference, not a claim that every spread projectile must individually hit or that screen-size scaling is generally forbidden.

**Scenario and evidence:** For a 1280-wide logical arena, use the actual boss firing method and advance the real simulation at `dt = 1/60` until that volley is gone, with no typing/defensive skill. Observed player-impact counts:

| Arena height | Phase 1: one projectile | Phase 2: two projectiles |
| --- | ---: | ---: |
| 600 | 1 | 2 |
| 720 | 1 | 0 |
| 900 | 1 | 0 |
| 1080 | 1 | 0 |

At height 720, the boss fires from Y 241.2 toward a player at Y 648. Minimum path distance is `406.8 * sin(0.08) ≈ 32.509`, outside the phase-2 collision radius `13 + 15 = 28`. At heights 900/1080 it increases to approximately 43.154/57.539. The analytic check also confirms that Major Boss phase 3 restores a center-line shot.

**Recommended fix:** Keep at least one aimed projectile in damaging volleys, or adapt the fan/target points so the intended pressure remains meaningful across supported arena sizes. An odd projectile count is one simple option; the chosen count remains a balance decision. Add a viewport matrix that checks actual impact capability, not just projectile count.

### Issue 24 — A reflected boss kill can clear the stage and then kill the player in the same frame

**Severity:** HIGH — third-pass, reproduced with a naturally generated boss volley.

**Location:** `src/Game.ts:1021-1035`, projectile iteration in `update()`; `Game.ts:1172-1180`, `finishStage()`; `Game.ts:1611-1632`, `defeatBoss()`; `Game.ts:2076-2114`, `damageFromProjectile()` and reflected boss damage; `Game.ts:2137-2211`, `applyPlayerDamage()`.

**Problem:** The projectile loop continues iterating the old array after reflection kills the boss. `finishStage()` sets Stage Clear and replaces `this.projectiles` with an empty array, but that does not terminate the existing `for...of` iterator. A later colliding projectile from the old array is no longer found by `damageFromProjectile()`. Its null lookup bypasses the reflection branch, yet the method still calls `applyPlayerDamage()`. Neither path guards against the already-ended playing phase.

**Impact:** The stage-clear hook can save/unlock progress and then the same frame changes the game to Game Over, producing contradictory results. Even without lethal damage, resources can change after the clear snapshot. This is not a shield-piercing design ambiguity: an active Reflect effect is bypassed only because the entity was removed by the terminal transition.

**Scenario and evidence:** Stage 50 Boss in phase 2, 1280×600 arena, boss HP 1, player Hull 1/Shield 0, Reflect timer 4.5 seconds. Generate the real two-projectile volley with `fireBossProjectiles()`, suppress subsequent volleys for isolation, and run the real update at 60 Hz. Without overriding boss position or manually inserting projectiles, the phase hooks are `playing → stageclear → gameover`; the clear snapshot has Hull 1, final Hull is 0. This uses the two genuine hits shown in Issue 23's short-arena control.

**Recommended fix:** Stop simulation immediately when a collision causes a terminal phase transition. Make stale/missing projectile lookups return without applying damage, and guard damage application against non-playing phases as defense in depth. Check the enemy loop too, so additional same-frame collisions do not repeatedly emit Game Over. Test exactly one terminal outcome and an immutable result snapshot per run.

### Additional conditional/design observations — excluded from confirmed severity totals

**Speech cancellation race — conditional MEDIUM risk.** In `src/speech.ts:36-55`, a canceled utterance retains a callback that decrements the global `pendingSpeech`. If that old `onerror`/`onend` arrives after a new utterance has started, it can emit `active: false` while the new word is still speaking. A controlled callback-order probe produced `true → false → true → false` without completing the new utterance. The behavior under that ordering is confirmed, but actual browser delivery/timing was not verified. Test cancel → new speak → old callback in target browsers; a small generation token would isolate old callbacks without redesigning the queue.

**Shield transition on a completing key — design clarification.** In `Game.ts:1505-1532`, the last letter of an existing word can cross the phase-2 HP threshold, activate a shield, then immediately clear that shield through the completion branch in the same input. A runtime probe confirms this. Decide whether finishing the already-started word is intended to satisfy the shield or whether a fresh shield word is required. Do not count it as an established defect without that rule.

## 6. Docs / Code mismatches

### 6.1 Accurate progress documentation

The Step 40-42 section in `docs/PROJECT_CONTEXT.md` is accurate:

- Vanguard is implemented.
- Milestone unlock synchronization is implemented.
- Aegis, Volt and Wraith are implemented.
- Fortune is the next unimplemented character slice.

### 6.2 Stale current-status section

The `# 23. Current status` section still says:

```text
Next:
Step 39 Character registry + Character Select
```

That is stale; the source and Git history have progressed through Wraith in Step 42.

The same section says PlayerSave schema v7, while:

```ts
export const PLAYER_SAVE_VERSION = 8;
```

### 6.3 Stale README checkpoint

`README.md` still presents Step 39 as the next checkpoint and lists Steps 40-42 as future work.

### 6.4 Deterministic Campaign claim is only partially true

Stage metadata and difficulty curves are deterministic functions, but combat encounters are not seeded. Clarify whether the claim covers only that model or also runtime encounters. This is a scope ambiguity, not proof that randomized retries violate the intended game design; see reclassified Issue 11.

### 6.5 Adaptive difficulty claim is not true in live gameplay

The difficulty model supports adaptive input mathematically, but the app never selects Adaptive mode or supplies actual player performance.

### 6.6 Platform integration is structurally enabled but the vocabulary contract is incomplete

Submodule, Portal registry, host, dev/build commands and nginx Space server are present. The mandatory shared-vocabulary HTTP path is not available from the child origin.

### 6.7 Fortune onward status

Fortune through Zenith exist in the character registry and can become permanently unlocked and selected. They do not have unique runtime passives or active skills. Pressing Space at 100 Power uses the generic fallback Overdrive branch rather than their named ultimate.

This does not contradict the stated "Step 42 in progress" checkpoint, but the UI currently presents them as available characters rather than explicit implementation placeholders.

## 7. Architecture risks for future Step 42 characters

### 7.1 Central character branching is already growing

Character behavior is distributed across:

- `Game.refreshSkillDefinitions()`;
- `Game.useSkill()`;
- `Game.applyCharacterCorrectKeyPassive()`;
- `Game.applyCharacterWordCompletePassive()`;
- `Game.applyCharacterPerfectWordPassive()`;
- `Game.activateOverdrive()`;
- `main.selectedCharacterSkillId()`;
- character HUD rendering.

`Game.ts` is already approximately 3,182 lines and `main.ts` approximately 2,132 lines. Continuing with character-specific conditionals will make ordering, reset behavior and effect leakage harder to verify.

A small character hook contract would be sufficient. Useful hooks are:

```text
onCorrectKey
onWordComplete
onPerfectWord
onProjectileDestroyed
beforePlayerDamage
activateSkill
activateUltimate
onStageReset
```

This does not require an ECS, dependency-injection framework or large inheritance hierarchy.

### 7.2 Fortune is ordered before the systems it depends on

Fortune's design modifies:

- Supply chance;
- Treasure Drone chance;
- rare-event weighting;
- reward quality;
- Luck and Salvage outcomes.

The roadmap schedules Fortune inside Step 42, but Supply, drops, Treasure Drone, Luck, soft pity and event scheduling are Steps 45-51. A complete advertised reward/event kit depends on those foundations. This does not prevent work on a limited Fortune slice or its minimal hooks. Existing Luck/Salvage factors and loot helpers should not be mistaken for a fully wired live drop/event loop.

The simplest choices are:

1. move Fortune's complete slice after the relevant reward/event foundations; or
2. implement minimal typed reward-roll hooks first and explicitly document that broader content comes later.

### 7.3 Arsenal lacks a temporary weapon runtime

Arsenal's identity depends on weapon pickups, duration and extra effects. Persistent equipment exists, but temporary combat weapons/pickups do not.

### 7.4 Oracle needs reusable perfect-word events

Perfect-word tracking exists, but character-specific rewards are wired directly to Aegis. A small shared completion/perfect-word hook can support Oracle when needed; a larger event framework is not a prerequisite for fixing the present bugs.

Skill-assisted word progress currently does not mark a word as non-perfect. That policy must be decided before Oracle rewards perfect words or Perfect Sentence progression.

### 7.5 Bastion needs projectile-destroy events

Projectile destruction currently updates stats and hardcoded Vanguard/Wraith correct-key passives inside `destroyProjectile()`. Bastion needs a reusable event carrying projectile and typing context.

### 7.6 Reaper lacks a normal-enemy outgoing-damage model

Normal enemies use word completion and layers rather than HP. Reaper's streak-based damage and Execute cannot be expressed consistently without defining what damage means for normal targets, elites and bosses.

### 7.7 Celestial requires character-specific combat resources

`GameStats` has no extensible character resource. Celestial Charge would require state, reset rules, HUD presentation, persistence policy and interaction with perfect-word hooks.

### 7.8 Zenith does not fit the current one-shot ultimate branch

The source of truth requires Zenith Protocol to be multi-phase typing/combat, not an instant effect. The current `activateOverdrive()` architecture performs one synchronous branch and starts timers. A stateful ultimate lifecycle should exist before Zenith.

## 8. Things already clean or correct

### 8.1 Skill engine core

- Energy, cooldown, charges, per-stage limits and typing conditions are checked before mutation.
- Successful activation updates Energy once.
- Unknown skills do not mutate Energy.
- Cooldown ticking occurs only during the playing update, so pause does not consume cooldown time.
- New stages reset cooldown, charges and per-stage use counts.

### 8.2 Character runtime implemented so far

- Vanguard Shield Rhythm triggers at 20-key multiples and clamps Shield correctly.
- Vanguard Barrier Pulse uses the shared skill engine.
- Nova Overdrive consumes 100 Power, restores Shield and starts the longer Vanguard pressure-control window.
- Aegis perfect-word state is reset when normal enemies change word/layer and when bosses rotate words.
- Aegis Reflect Field and Fortress Protocol use bounded timers/blocks.
- On ordinary completion paths, Volt restores Energy for long words and clamps it to maximum. Issue 17 identifies the final-boss-letter exception.
- Volt EMP rejects completely empty battlefields with no interference; Issue 9 shows that the broader effect-availability predicate is incomplete.
- Wraith streak milestones use exact multiples and `Math.max()` timer refresh semantics.
- Wraith Phase Cloak blocks incoming damage without consuming additional resources per hit.
- Wraith Time Collapse clears current projectiles and applies bounded hostile-time effects.
- Stage start resets character timers and prevents effects from persisting into a newly started stage.

No clear double-trigger was found in the sampled normal per-key/word-completion paths for Vanguard, Aegis, Volt or Wraith. Second-pass control probes confirmed one ordinary passive trigger for each, paused Cloak timing and timer reset at a new stage. These controls are not exhaustive verification of every kit/skill combination, and they do not negate the boundary defects above.

### 8.3 Character persistence and milestone synchronization

- Starter state always includes Vanguard.
- Locked characters cannot be selected through normal state APIs.
- Invalid local selected-character state falls back to Vanguard.
- Current-version backup validation rejects selected locked characters.
- Milestone unlocks only add characters and do not relock on earlier replay.
- Old/imported saves synchronize from the highest actually cleared Campaign milestone.
- Stage-clear autosave includes milestone character changes.

### 8.4 Persistence foundations

- PlayerSave is versioned.
- Explicit migration branches exist from versions 1 through 7 to version 8.
- Unsupported numeric future versions are rejected rather than down-migrated.
- Backup import validates Campaign ranges, inventory IDs/counts, equipment/loadout references, support loadout uniqueness and character IDs.
- Autosave writes are serialized, preventing a later save from finishing ahead of an earlier one.
- That is a writer-order guarantee only, not an app-level import transaction guarantee; Issue 22 reproduces the distinction.
- Import has an attempted high-level rollback, although Issues 4 and 19 show that it does not fully restore paused runtime or guarantee storage rollback.

### 8.5 Learning and speech behavior

- Learning reveal is dispatched on normal word/layer and nonlethal boss-word completion, not on arbitrary skill progress. The lethal final-letter exception is Issue 17.
- Skill-based typing advancement stops before automatic completion, so it does not trigger learning reveal by itself.
- Browser speech uses `speechSynthesis.speak()` without cancelling previous words, allowing normal queueing.
- Speech active/inactive signals use the documented `typing-game:speech` shape. The cancellation callback ordering still needs the conditional check described above.
- The Portal validates both the sender origin and the active iframe window before applying shared-music ducking.

### 8.6 Performance controls already present

- Delta time is clamped.
- Particle count is capped per quality setting.
- Dead lasers and particles are cleaned up.
- Off-screen projectiles are removed.
- Visual quality affects VFX count without changing typing logic.
- Skill HUD updates are throttled rather than emitted every frame.

## 9. Performance and maintainability observations

These are not all standalone release blockers, but they should guide future work:

- `Game.ts` and `main.ts` have too many responsibilities: simulation, character behavior, skills, Canvas rendering, DOM coordination, persistence integration and learning feedback.
- Projectiles, lasers and particles use new filtered arrays during update. Current caps make this acceptable, but worst-case projectile stages should be profiled before adding more projectile-heavy characters.
- `findProjectileForKey()` filters and sorts the whole projectile list for every relevant keypress. A single-pass nearest-projectile lookup is simpler and allocation-free.
- Enemy selection and several skill effects repeatedly clone/sort enemy arrays. Current active-enemy caps keep this moderate.
- Vocabulary candidates are filtered at every enemy spawn and boss word selection. With roughly 180 entries per level this is currently small, but precomputed pools per enemy constraint would be easy if profiling shows pressure.
- Particles are capped but not pooled. Pooling is not necessary yet unless actual profiling shows garbage-collection spikes.
- The more immediate performance defect is unnecessary boss HUD DOM emission during stagger, documented as Issue 13.

## 10. Test gaps

The current 128 tests are useful for deterministic helper logic, but most character tests only assert constants and pure helper output. They do not execute the real `Game` combat runtime.

The second/third-pass external probes are diagnostic evidence only; they were not installed as regression tests. The repository still needs durable coverage for these paths after fixes are separately authorized.

Missing high-value tests include:

### Platform integration

- `space.typing-game.local/vocabulary/index.json` in dev mode.
- `space.typing-game.local/vocabulary/index.json` in play mode.
- One real level file through the same origins.
- Portal iframe plus speech ducking smoke test.

### Combat integration

- Target selection and completion across normal and layered enemies.
- Acquisition after Chain Lightning/Meteor/Thunder Grid advances an unlocked word; multiple assisted enemies and an existing lock.
- Replay versus Next after a clear.
- Frenzy's second and later actions.
- Projectile typing with and without an existing target lock.
- Boss per-key damage, word damage, shield phase and death.
- Boss damage from Chain Lightning, Meteor, Thunder Grid and Reflect.
- Exactly-once word completion when the final key is also lethal; no reveal for genuinely incomplete words.
- Thunder Grid action suppression across phase changes.
- Collision and multiple projectile hits in one frame.
- Real boss volley trajectories and impacts at 600/720/900/1080 arena heights.
- Reflection kills the boss with another projectile due to collide in the same frame: exactly one terminal outcome and no post-clear damage.
- Stage clear with remaining projectiles.
- Game over and restart state reset.

### Skill runtime

- `effect-not-needed` for each skill based on actual effect availability.
- No Energy/cooldown/charge consumption when effect preflight fails.
- Chain Lightning/Meteor with every selected enemy already at the assistance cap or on a one-letter word.
- Character and support loadout changes cannot refresh a live stage.
- All cooldown, charge and per-stage state resets at a legitimate new stage only.

### Character integration

- Vanguard passive, active and ultimate through real key events and damage.
- Aegis miss/perfect tracking for normal enemies, layers and bosses.
- Volt long-word Energy, meaningful EMP targets and Thunder Grid shield behavior.
- Wraith passive cloak milestones, active damage blocking and Time Collapse hostile-time behavior.
- Restart/new-stage reset.
- Switching characters without passive/effect leakage.

### Persistence

- IndexedDB write failure followed by successful recovery storage and reload.
- Campaign-rank ties where recovery has newer inventory/equipment/support/character state.
- Old-save milestone synchronization followed by successful autosave.
- Import while title versus import while paused.
- Import write failure and proof that runtime state remains unchanged.
- Recovery full-save write success followed by legacy-key failure.
- Intentional lower-progress import plus failed mirror, followed by reload.
- Overlapping imports with different failure orders; serialized disk writes must not allow stale app-state rollback.
- Malformed IndexedDB record plus valid same-rank recovery; no destruction of the good mirror.
- Explicit empty equipment/support collections through validation and normalization.
- Pagehide with a write already in flight.

### Vocabulary and learning

- Custom entries containing no `a-z` letters.
- Class source-key write failure without metadata/vocabulary divergence.
- Late initial Class response after a successful Custom selection; obsolete fetch must not commit.
- Phrase and punctuation display-to-typing mapping.
- Learning reveal only on actual completion.
- Rapid speech queue ordering and exactly balanced active true/false signaling.
- Canceled old utterance callbacks arriving after a new speech generation starts.

### Timing and performance

- WPM excludes paused time.
- Worst-case late-stage enemy/projectile/particle load.
- Boss HUD update count during stagger.
- No gameplay differences between visual quality settings.

## 11. Recommended repair order

### Priority 1 — Correctness and data safety blockers

1. Fix skill-assisted enemy acquisition (Issue 14).
2. Fix whole-save authority and fallback commit reporting together (Issues 2 and 19).
3. Restrict import to a clean runtime boundary and serialize the entire import transaction, not just its writes (Issues 4 and 22).
4. Prevent vocabulary changes from deleting live-stage enemies (Issue 3).
5. Fix the shared vocabulary route/origin (Issue 1).

Also stop same-frame combat immediately after a terminal transition and reject stale projectile collisions (Issue 24). This is a HIGH gameplay correctness fix, not a later polish task.

### Priority 2 — Reproducible gameplay and state defects

6. Separate Replay from Next (Issue 15).
7. Preserve final-boss-word completion and Thunder Grid suppression across transitions (Issues 17-18).
8. Match EMP/Chain/Meteor preflight to actual effects, retain recurring Frenzy behavior and make boss volley threat meaningful across supported arena heights (Issues 9, 16 and 23).
9. Reject untypeable vocabulary, keep vocabulary selection consistent on failure and align backup validation with normalization (Issues 6, 21 and 20).
10. Exclude pause time from WPM, connect the documented difficulty setting and reduce redundant HUD work (Issues 12, 5 and 13).

### Priority 3 — Clarify policy before making balance changes

11. Decide locked-target/projectile precedence and shield-piercing/transition rules. Do not apply the earlier report's unconditional changes.
12. Clarify runtime determinism and per-character base-stat/affinity scope.
13. Verify speech cancellation ordering in supported browsers.

### Priority 4 — Targeted foundations for subsequent Step 42 work

14. Add runtime regression coverage first. Extract small hooks only where a new character needs them; no broad rewrite is proposed.
15. Define the intended Fortune delivery slice and the reward/event hooks it needs, distinguishing existing pure helpers from live systems.

## 12. Final review summary

Automated status:

```text
Tests: PASS — 25 files, 128 tests
Build: PASS — TypeScript + Vite
```

Those automated results were obtained in the first pass on the same unchanged application source. The final third-pass combined run completed 32 targeted mocked-runtime probes, including the previous 24. No browser E2E or performance profiling was performed.

No CRITICAL issue was identified. There are eight HIGH findings:

- broken shared-vocabulary routing on the actual Space origin;
- stage bypass through paused vocabulary changes;
- unsafe mid-stage import/runtime mutation;
- incorrect IndexedDB/recovery arbitration, including undoing an intentional earlier-backup restore;
- skill-assisted enemies becoming unacquirable for typing;
- a failed fallback save/import leaving newly committed recovery data behind.
- overlapping-import rollback restoring old in-memory state despite a later successful import;
- a reflected boss kill followed by stale same-frame damage changing Stage Clear into Game Over.

Adaptive/selectable difficulty remains a MEDIUM requirement-integration gap. Projectile priority, universal shield blocking, distinct character base stats and identical seeded retries are not counted as confirmed bugs without clearer product rules. The first report's stronger conclusions on those points are withdrawn.

Step 40, Step 41 and the implemented Aegis/Volt/Wraith portions of Step 42 exist in source and broadly match their documented combat identities. Their pure helper tests pass, but the absence of `Game` integration tests leaves activation order, resource consumption, reset behavior and cross-character leakage under-tested.

Before treating this checkpoint as a stable foundation for Fortune, Arsenal, Oracle, Bastion, Reaper, Celestial or Zenith:

1. resolve the HIGH findings;
2. cover the reproducible target, boss-completion, replay and persistence boundaries with regression tests;
3. agree on the unresolved shield/projectile policies before changing them;
4. define the next character's minimal dependencies instead of requiring a general framework upfront.

The checkpoint should not receive a clean review pass yet. This is a corrected, evidence-bounded review, not a guarantee that every remaining defect has been found. Only this report was edited; no proposed application change was implemented, committed or pushed.

The third pass adds three independently actionable findings and expands Issues 2, 9 and 21 without counting their closely related variants as separate issues. The latest severity total is 20: 8 HIGH, 11 MEDIUM and 1 LOW.

## 13. Second-pass evidence ledger

All entries below executed against the real reviewed modules with in-memory fixtures/stubs. They deliberately assert observed behavior; they do not assert the behavior is desirable. “Control” and “design observation” entries are not new bugs. Together these rows account for the 24 probes.

| Probe(s) | Arrangement / observed output | Interpretation |
| --- | --- | --- |
| 1-3 | Untargeted `testing`; Chain/Thunder advance to 2, Meteor to 1; first/next keys leave null lock and add 2 misses. | Issue 14, three abilities. |
| 4 | Final live enemy, no remaining spawns; paused vocabulary apply; clear with 0 kills on resume. | Issue 3. |
| 5 | Paused Wraith → Aegis/settings sequence; Cloak remains 5.5s, Barrier charges reset, effective/HUD Shield 140/40. | Issue 4 runtime setters. |
| 6 | `parseCustomVocabulary('123 \| numbers')` accepts one entry; normalized target is empty. | Issue 6. |
| 7 | Locked enemy plus `z` projectile; `z` adds a miss and leaves projectile. | Reclassified Issue 7, policy observation. |
| 8 | Shielded major boss HP 600; Chain Lightning → 542, shield remains active. | Reclassified Issue 8, policy observation. |
| 9 | Volt EMP with lone inert Scout; Energy 70, cooldown 12s; no hostile gameplay change. | Issue 9 false-positive usefulness. |
| 10 | Only interference timer 1s; EMP returns `effect-not-needed`. | Issue 9 false-negative usefulness. |
| 11 | Frenzy Destroyer's next interval 3.8240s instead of modified 2.7533s. | Issue 16. |
| 12 | Boss `testing`, typed 6, HP 1; final `g` clears stage with 0 word events and no Volt Energy grant. | Issue 17. |
| 13 | Thunder Grid crosses major-boss phase threshold; timer is normal phase interval 2.7107s without +3.5s delay. | Issue 18. |
| 14 | Completing key crosses phase-2 threshold; shield turns on then off within that input. | Shield-transition policy observation. |
| 15 | 30 stagger updates → 30 boss HUD emissions. | Issue 13; no DOM timing/FPS measurement. |
| 16 | Same Campaign rank: recovery saves repair-kit count 1; reload returns stale IDB count 2 and rewrites recovery to 2. | Issue 2. |
| 17 | Recovery write succeeds, legacy-key write fails; save rejects, reload returns imported Stage 101. | Issue 19. |
| 18 | Earlier backup succeeds in IDB; recovery mirror fails; stale Stage 101 returns on reload. | Issue 2, intentional restore variant. |
| 19 | Valid v8 empty equipment/support import parses to 8 items and 4 unlocked spells. | Issue 20. |
| 20 | Old speak → stop → new speak → old error callback; parent signals true/false/true/false before new completion. | Conditional speech race; browser timing unverified. |
| 21 | Real completion and Replay handlers: Stage 1 clear → Stage 2 starts. | Issue 15; DOM mocked. |
| 22 | Real Class apply handler with failed source-key write: level becomes 2, word array stays old. | Issue 21; fetch/storage mocked. |
| 23 | Real failed-import handler: Barrier cooldown/charges/uses 9/3/1 → 0/4/0 despite rollback message. | Issue 4; DOM/storage mocked. |
| 24 | Ordinary Vanguard/Aegis/Volt/Wraith passive samples trigger once; pause freezes Cloak; stage start clears timers. | Positive controls, not exhaustive kit coverage. |

### Minimal reproduction recipes for an independent reviewer

For combat probes, instantiate `Game` with a minimal Canvas context and no-op audio/RAF, supply an English entry `testing`, and call `startStage(createStageConfig(n), difficultyFor(...))`. Arrange only the state relevant to the listed case (enemy/boss, skill eligibility and HP/timer boundary); call the real `useSkill()`, `handleKey()`, or update method. Record before/after state and hook calls. Rendering and network are not needed to reproduce those logic paths.

For storage probes, supply asynchronous IndexedDB open/get/put stubs and a Map-backed localStorage whose `setItem` can fail for one exact key. Call the real `savePlayerProgress()` and `loadPlayerSave()` in sequence. The relevant keys are `spaceTypingPlayerSaveRecoveryV3` and the exported `CAMPAIGN_STORAGE_KEY`; source metadata uses `spaceTypingVocabularySourceV1`. Do not use or alter a real user's browser storage to reproduce these tests.

For UI probes, execute the actual `main.ts` handlers with a stub DOM and successful initial vocabulary/persistence setup. Replay must be tested through `clearRetryButton`, and rollback through `importSaveFile()`; testing only pure Campaign helpers would miss the integration defects. The diagnostic harness exposed these lexical bindings in memory only; the repository source was never edited.

## 14. Third-pass evidence and remaining uncertainty

The final combined run reported `ALL 32 PROBES CONFIRMED`. Probes 1-24 are the Section 13 cases, re-executed without changing application source. The new cases are:

| Probe | Arrangement / observed output | Interpretation |
| --- | --- | --- |
| 25 | Two real title-screen import handlers; first recovery write fails, second succeeds; memory Stage 2, recovery Stage 201, notice `✓ Save imported`. | Issue 22. |
| 26 | Locked single-layer `testing` at typed 6; Chain succeeds, typed stays 6, Energy 62, cooldown/charges/uses 11/3/1. | Issue 9 extension. |
| 27 | Same capped target; Meteor succeeds, typed stays 6, Energy 58, cooldown/charges/uses 18/1/1. | Issue 9 extension. |
| 28 | Actual Major Boss shot vectors at four heights and phases 1/2/3; phase-2 minimum path distance exceeds radius at 720/900/1080. | Issue 23 analytic check. |
| 29 | Actual Stage-50 Boss volleys advanced at 60 Hz until removed; phase 1 hits once at all four heights; phase 2 hits twice at 600, zero at 720/900/1080. | Issue 23 runtime/control check. |
| 30 | Real phase-2 volley at height 600; low-HP boss/player, active Reflect; one clear snapshot at Hull 1 followed by Game Over at Hull 0. | Issue 24. |
| 31 | Delay initial Class fetch, apply Custom, release old response; metadata/persistence stay Custom while runtime uses Class words. | Issue 21 extension. |
| 32 | IndexedDB `{}` versus valid initial-rank recovery with 5 repair kits; load and mirrored inventory both become empty. | Issue 2 extension. |

### Reproduction details for the new boundary checks

For Issue 22, call the actual asynchronous import handler twice while both can be in flight; each `file.text()` returns a different valid backup. Make the first full recovery-key write throw exactly once, and allow the second to succeed. Wait for both handlers, then compare their shared app state, recovery record and success notice. A Map-backed localStorage and the real `AutosaveQueue` are sufficient to expose the ordering; no simultaneous disk transaction is required.

For Issue 23, keep `spawnRemaining = 0`, no normal enemies, a spawned boss and a long next-action cooldown to isolate one volley. Let `fireBossProjectiles()` create the bullets. Count calls into real player-damage handling while advancing `update(1 / 60)` until that volley leaves the arena. Use the real `bossPosition()`. Measuring only Hull would be misleading because phase-1 damage may be fully absorbed by Shield; the final probe counts impacts instead.

For Issue 24, use the same real firing path at 1280×600, Boss phase 2, boss HP 1, player Hull 1/Shield 0, `secondsSinceDamage = 0`, and Reflect 4.5 seconds. Advance at 60 Hz and record phase hooks and the clear snapshot. No custom projectile positions or rendering code are required.

For Issue 21's race, keep the initial level response unresolved, execute the Custom apply handler successfully, then resolve the older response. Compare source metadata, the stored Custom text and `game.vocabulary`. This is a successful-fetch ordering failure, not a network-error fallback test.

### Additional hypotheses checked without inflating findings

- The docs' 15 enemy categories are not sufficient evidence of a missing implementation merely because `EnemyKind` has 14 values: the candidate list separately includes Elite, implemented as a modifier on those kinds. No missing-fifteenth-enemy issue is asserted.
- The autosave queue really does order writes. The new import defect is outside that guarantee; the report does not withdraw the queue's writer-order property.
- Boss phase-2 miss behavior was checked against phase-1 controls and a short arena where both shots hit; it is not inferred solely from seeing a spread constant.
- The terminal-transition failure was rerun with the real boss position and naturally generated volley, replacing an earlier more explicitly arranged position fixture.
- Wraith Cloak has activation particles, but its active timer is not represented by a persistent ship/HUD indicator in the reviewed draw paths. This is a UI observability follow-up, not proof that Cloak's defensive runtime is broken or another counted HIGH issue.

Remaining validation gaps: real nginx/Vite HTTP smoke tests, supported-browser UI flows, actual IndexedDB/quota/event behavior, speech cancellation ordering, and late-stage frame-time profiling. A source review plus mocked-runtime probes cannot honestly certify that no defect remains. All confirmed claims above are limited to the stated checkpoint, paths and scenarios.
