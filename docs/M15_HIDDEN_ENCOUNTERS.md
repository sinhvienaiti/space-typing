# M15 — Hidden Challenge / Hidden World / Champion Hunt

M15 extends the existing M14 route/persistence contract with optional secret encounters.

It does not create a second Campaign, navigation layer, combat runtime, status system, announcer, music controller, or save domain.

## Discovery and route integration

Existing HiddenDiscoveryState remains the source of discovery knowledge.

Discovered entries unlock optional encounter offers:

- Echo Rift -> Hidden Challenge;
- Ghost Contract -> Champion Hunt on deterministic eligible sectors;
- Void Warden -> Hidden World on deterministic eligible sectors.

Offers are rendered inside the existing Route Map after the normal route choice is locked.

The player may:

- enter Tier I;
- enter Tier II;
- enter Tier III;
- skip that offer for the current persisted sector state.

Skipping and accepting are persisted immediately through the existing autosave/crash-recovery path.

## Backward compatibility

PlayerSave remains version 21.

HiddenDiscoveryState receives an optional encounter field.

Old v21 saves that do not contain the field remain valid. The sanitizer adds the default empty encounter state.

The field is already inside RunPersistentState through HiddenDiscoveryState, so it automatically participates in:

- checkpoint snapshots;
- crash recovery;
- stage-entry recovery;
- death rollback;
- JSON backup/import.

No localStorage-only hidden progress is introduced.

## Hidden transition persistence

A hidden encounter selection is saved with:

```text
SaveReason: hidden-transition
CrashRecoveryReason: hidden-transition
```

The stage-entry snapshot is captured with the active hidden encounter before combat begins.

Crash recovery therefore resumes the same selected encounter/tier/step.

Normal gameplay death rollback returns to the committed checkpoint state. Existing knowledge merge keeps discovered hidden knowledge while economic/active encounter progress follows normal rollback rules.

## Tier I-III

Tier choice is independent of the global difficulty mode but scales from it.

M15 first resolves the current M12 DifficultyProfile, then layers the selected tier on top.

Higher tiers increase bounded:

- combat pressure;
- enemy speed;
- projectile/boss pressure;
- pressure budget;
- word pressure inside the existing Rank band;
- premium reward multiplier.

Reaction windows remain bounded.

Changing hidden tier does not change:

- Campaign stage access;
- World Rank distribution;
- vocabulary source;
- checkpoint sector.

## Hidden Challenge

Hidden Challenge is a one-encounter optional detour.

It uses the current numbered Campaign stage only as the source for:

- vocabulary context;
- base World context;
- base global difficulty.

Clearing it does not call recordStageClear and does not advance Campaign stage.

It awards premium Credits and expansion currencies through the existing economy systems.

## Hidden World

Hidden World is a deterministic 3-4 encounter mini-run.

It does not create numbered Campaign stages.

Each profile reuses existing registries to compose its own identity:

- environment source World;
- enemy roster source World;
- boss visual source World;
- encounter count.

Initial profiles:

- Rift Expanse;
- Prism Abyss;
- Frozen Void.

Non-final encounters use the shared normal combat path.

The final encounter uses the shared boss architecture with the Hidden World boss visual source.

The active step is persisted. Completing an intermediate encounter advances only Hidden World step state.

Premium reward is granted when the mini-run completes.

## Champion Hunt

Champion Hunt reuses the Priority Kill Chain announcer foundation.

During Champion Hunt:

- production enemies are priority targets;
- regular random formations are disabled so priority kills remain readable and bounded;
- targets still pass M11 skill/Threat Budget and M12 Active Typing Pressure;
- kill-chain window derives from active difficulty + selected tier.

Existing announcer thresholds remain authoritative:

- 2 -> Double Kill;
- 3 -> Triple Kill;
- 4 -> Ultra Kill;
- 5 -> Rampage;
- 6 -> Monster Kill.

The Game kill path still advances the chain only for Elite/priority definitions.

Normal Campaign enemies do not advance the chain.

Boss defeat continues to use its separate boss presentation.

## Shared Game runtime

Game.startStage accepts an optional HiddenEncounterRuntime.

The runtime may override:

- environment stage source;
- World roster stage source;
- boss visual stage source;
- priority-target mode;
- enemy budget multiplier;
- kill-chain window.

All other systems stay shared:

- EnemyKind mechanics;
- M09 World roster resolver;
- M10 Rank/WordDifficulty/layers;
- M11 skills and Threat Budget;
- M12 spawn pressure scheduler;
- boss state/model;
- status engine;
- SFX/VFX;
- equipment drops;
- recovery items.

Carrier children and Splitter fragments use the same hidden roster override.

Boss intro/phase/death rendering uses the same hidden boss source.

## Music

M15 uses the M08 states already present in MusicController:

- HIDDEN_CHALLENGE;
- HIDDEN_WORLD;
- CHAMPION_HUNT.

Pause/resume and Phoenix revival preserve the special state instead of falling back to normal World music.

The existing announcer event still ducks music through the shared audio lifecycle.

## Stage clear behavior

Hidden encounter clear is handled before normal Campaign stage-clear progression.

Therefore a hidden clear does not:

- mark the numbered Campaign stage cleared;
- unlock the next Campaign stage;
- commit a checkpoint;
- update Adaptive difficulty history as if it were a numbered Campaign clear.

Intermediate Hidden World steps save hidden progress and offer the next hidden encounter.

Final completion clears the active hidden state, records the offer as resolved, and grants premium rewards.

The normal route-selected Campaign stage remains ready afterward.

## Death / resurrection behavior

M15 intentionally reuses normal death protection:

- Phoenix Core resumes the current in-memory hidden encounter;
- Stage Revival restores the stage-entry snapshot containing active hidden state;
- checkpoint rollback returns to the committed sector state;
- technical crash recovery resumes the saved hidden transition.

No special resurrection inventory or hidden-only rollback path is added.

## Backup correctness

M15 persistence review found and fixed an M14 backup regression:

exportPlayerSaveJson previously omitted the persisted RouteState argument and could regenerate a default route in exported backups.

Backup export now passes the actual RouteState into createPlayerSave.

## Performance

Hidden offer generation is a small deterministic calculation at Route Map render.

Hidden runtime profile resolution occurs at encounter start.

The combat frame loop consumes already-resolved context.

No new registry scan is added per frame.

## Validation

Automated coverage verifies:

- legacy HiddenDiscoveryState without encounter field remains valid;
- hidden encounter state sanitization;
- discovery-driven deterministic offers;
- sector eligibility;
- tier selection;
- skip persistence;
- resolved offer replay prevention;
- Hidden World deterministic profile selection;
- Tier I-III difficulty scaling from global difficulty;
- Champion Hunt priority-only runtime;
- bounded kill-chain window;
- premium reward production;
- Hidden discovery rolls preserve active encounter state.

CI #262 passes Test + Build on the implementation head.

M16 owns Stage Objectives and World-specific boss typing mechanics. It must extend the existing StageConfig/BossState typing runtime rather than create parallel objective or boss combat engines.
