# Credit Crystal FINAL V3 — Kill / Removal Audit (2026-10-01)

Branch: `feat/bgv-integration-current`

This audit classifies every direct live-enemy removal path in `src/Game.ts`. The rule is explicit: only authoritative combat kills may claim Combat Credits. Cleanup, escape, rollback and scripted conversion paths never claim Credits.

| Removal path | Classification | Combat Credit behavior | Automated coverage |
| --- | --- | --- | --- |
| `resolveSkillEnemyKill()` | rewarded kill | claim once through the central ledger before removal | integration test |
| final-layer `completeWord()` | rewarded typed kill | claim once; layer breaks do not claim | integration test |
| `defeatBoss()` | rewarded boss kill | one premium boss receipt from the central boss path | integration test |
| `damagePlayer(enemyId,...)` | enemy escape | no claim | integration test |
| reward effect `clearNormalEnemies` | scripted non-kill clear | no claim | integration test |
| `testLabClearEnemies()` | QA cleanup | no claim | integration test |
| `testLabResetArena()` | QA cleanup | no new claim; pending pickup presentation is flushed | transition/API tests |
| `setVocabulary()` enemy reset | configuration cleanup | no claim | integration test |
| `startStage()` enemy reset | attempt transition cleanup | old pickup presentation flushed before new attempt | transition behavior |
| `backToTitle()` enemy reset | navigation cleanup | no claim; pending pickup presentation flushed | transition behavior |
| formation rollback `enemies.splice(initialEnemyCount)` | atomic spawn rollback | no claim and spawn accounting is rolled back | code-path audit |
| Carrier repeatable child | spawned helper enemy | explicitly `combatCreditEligible=false` | integration test |
| finite Splitter fragment | finite combat enemy | independently eligible | integration test |

Additional FINAL V3 safeguards now present:

- stage-clear and game-over transitions compact-sync pending pickup receipts;
- boss reward modal is deferred for a short premium crystal battlefield beat, then any remaining receipt presentation is flushed before the modal covers the canvas;
- moving ship target is followed continuously;
- resize reframes existing pickup coordinates and velocities into the new viewport;
- max lifetime remains a no-loss failsafe;
- Low/Medium/High/Ultra visual counts are bounded;
- repeated Boss/Major Boss stress coalesces without losing logical reward IDs or wallet value;
- Test Lab has selected-tier spawn, 10 mixed, 50 stress, Force Magnet, Collect All and Clear Pickup FX controls;
- Test Lab production enemy kills now use a simulated `CombatCreditRewardLedger`.

Remaining acceptance work after this audit:

1. 1000-stage economy sampling must be reviewed against an approved tuning range (the plan intentionally does not define that range).
2. Browser High/Ultra manual capture still needs the existing performance gate with 50-drop stress active.
3. Final full regression must run after the Duel production audit is complete.
