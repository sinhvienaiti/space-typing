# M15 — Hidden Challenge / Hidden World / Champion Hunt

M15 extends the persisted M14 route system with optional high-risk encounters. It reuses the production Campaign combat, World roster, boss, difficulty, Active Typing Pressure, Threat Budget, audio, reward and recovery systems.

Hidden encounters are outside the numbered Campaign progression. Clearing or failing one does not create a second stage counter.

## Hidden Signal route node

M14 RouteState now supports one additional deterministic side node:

- Hidden Signal.

Hidden Signal can appear on optional route lanes after the early Campaign.

It is generated from the same deterministic ten-stage route seed as Combat / Shop / Station. Existing persisted v21 route graphs remain valid and do not reroll; a player may first see Hidden Signal when a new sector graph is generated.

Selecting Hidden Signal locks the route choice exactly like every other M14 node.

The player must then:

1. decode the offer;
2. choose Tier I / II / III; or
3. Skip and continue the normal Campaign encounter.

Once a tier starts, both Tier and Skip are locked.

## Challenge kinds

A deterministic offer resolves one of:

- Hidden Challenge;
- Hidden World;
- Champion Hunt;
- Apex Gauntlet.

Offer identity derives from the numbered Campaign stage plus route-node id.

Reloading cannot reroll the same offer.

## Tier I–III

Challenge tier is independent from the global difficulty mode.

The selected global mode remains the base profile, then the challenge tier adds bounded relative pressure.

Current tier contracts:

| Tier | Pressure | Premium reward | Word-score bias | Elite bonus |
| --- | ---: | ---: | ---: | ---: |
| I | 1.12x | 1.35x | +4 | +0.08 |
| II | 1.28x | 1.80x | +9 | +0.16 |
| III | 1.48x | 2.45x | +15 | +0.26 |

This preserves the intended relationship:

- Relax Tier III is still based on Relax;
- Impossible Tier I is still based on Impossible;
- challenge difficulty never assumes one fixed WPM.

M12 safety systems remain active:

- max active enemies;
- pressure budget;
- urgent-threat cap;
- controller/support cap;
- reaction-window floor;
- hard-CC guard.

## Hidden World

Some Hidden Signal offers resolve a Hidden World.

Hidden World rules:

- 1–5 encounters;
- numbered Campaign stage does not advance;
- deterministic hidden World theme;
- production World environment;
- production World enemy roster;
- production M10 Rank/word/layer pipeline;
- production M11 skill/Threat Budget runtime;
- final Hidden World encounter uses a production boss encounter;
- premium rewards after every successful encounter;
- deterministic challenge state is persisted after each transition.

The current hidden-theme pool reuses authored late-World identities rather than inventing an unrelated visual/combat registry.

## Champion Hunt / Apex Gauntlet

Champion Hunt and Apex Gauntlet reuse the existing Priority Kill Chain foundation.

Eligible announcer-chain targets remain:

- Elite;
- Champion;
- Apex.

Ordinary enemies do not advance the chain.

Champion and Apex targets are explicitly labeled in the existing enemy typing UI.

Apex receives a higher bounded priority-target cadence than Champion Hunt.

The announcer milestones remain the existing contract:

- 2 — Double Kill;
- 3 — Triple Kill;
- 4 — Ultra Kill;
- 5 — Rampage;
- 6 — Monster Kill.

M15 does not add a second announcer engine.

## Difficulty-aware kill-chain window

The PriorityKillChain window is now resolved from the active global difficulty profile.

Higher expected typing cadence receives a shorter bounded chain window.

The result remains clamped to a safe range so the system is readable at low WPM and does not become unbounded at high WPM.

## Audio

M15 consumes the music states already implemented by M08:

- CHAMPION_HUNT;
- HIDDEN_CHALLENGE;
- HIDDEN_WORLD.

Hidden World swaps the MusicController World profile to the hidden theme.

Existing announcer ducking continues to lower music during callouts.

No direct scattered audio playback is added.

## Runtime integration

Optional encounters call the same:

```text
Game.startStage(stage, difficulty, encounterContext)
```

The encounter context may override only optional-encounter identity:

- hidden World stage used for environment/roster/boss visuals;
- challenge kind/tier;
- priority-target mode;
- final Hidden World boss flag;
- premium reward multiplier.

The numbered Campaign stage remains the original frontier stage.

Normal Campaign starts pass `null` and keep existing behavior.

## Challenge clear

Challenge clear intentionally does not call:

- `recordStageClear`;
- Campaign frontier advancement;
- ten-stage checkpoint commit;
- Adaptive difficulty result recording.

It awards premium encounter rewards, persists the next challenge transition, and either:

- starts the next Hidden World encounter; or
- returns to the same numbered Campaign stage.

## Rewards

Challenge rewards reuse the existing economy functions.

The resolved stage-start reward multiplier is:

```text
global difficulty reward multiplier
× challenge tier premium multiplier
```

Credits and expansion currencies flow through the same production reward/sanitization functions as normal Campaign rewards.

M19 may later add dedicated cosmetic/title/banner reward layers without replacing the M15 encounter state.

## Death / resurrection / crash behavior

Hidden encounters use the normal M02–M04 rules.

Technical crash:

- restores the last safe Hidden Challenge transition;
- keeps active offer, tier and encounter index.

Gameplay death:

- invalidates ordinary recovery;
- applies the existing resurrection/protection choice;
- otherwise rolls back to the committed ten-stage checkpoint.

No Hidden Challenge exception bypasses gameplay death.

## Persistence

M15 bumps PlayerSave:

```text
v21 -> v22
```

PlayerSave v22 adds `HiddenChallengeState`.

The state is part of `RunPersistentState`, so it participates in:

- checkpoint snapshots;
- stage-entry snapshots;
- crash recovery;
- death rollback;
- recovery mirror reconciliation;
- IndexedDB save/load;
- JSON backup/import.

v21 migration:

- preserves RouteState;
- preserves ShopState;
- creates an empty challenge domain;
- migrates legacy checkpoint/recovery snapshots additively.

No challenge state is stored in a separate localStorage system.

## Performance

Offer generation and route selection happen only at route transitions.

Challenge profile/difficulty resolution happens at encounter entry.

Champion/Apex tagging happens at enemy spawn.

No new full-registry scan is added to the combat/render frame loop.

## Validation

Automated coverage verifies:

- deterministic offers;
- 1–5 Hidden World encounters;
- deterministic Hidden World theme;
- immutable Tier after start;
- Skip disabled after start;
- tier pressure/reward monotonicity;
- global-difficulty scaling;
- bounded Elite chance;
- bounded difficulty-derived kill-chain windows;
- Champion/Apex priority-target cadence;
- Hidden Signal route eligibility;
- PlayerSave v21 -> v22 migration;
- checkpoint challenge persistence;
- active challenge crash recovery;
- challenge death rollback to committed checkpoint.

M16 owns Stage Objectives + boss typing mechanics and must extend the existing Game/BossState paths instead of introducing parallel stage/boss engines.
