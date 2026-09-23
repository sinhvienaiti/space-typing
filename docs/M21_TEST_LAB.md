# M21 — Developer QA / Test Lab

Status: COMPLETE on the M21 feature branch.

## Architecture

M21 adds one configurable Test Lab outside Campaign Stage 001-1000.

The Test Lab does **not** create:

- a second combat engine;
- a second checkpoint/death-recovery implementation;
- a second shop/reward/equipment/relic system;
- a second music runtime;
- a second production PlayerSave.

Instead it creates a disposable in-memory `TestLabSession` and a dedicated `Game` instance with debug-only APIs gated by `testLabEnabled`.

Normal Campaign code never enables those APIs.

## Isolation contract

`Production PlayerSave != TestLab Session State`.

The Test Lab:

- never writes the production PlayerSave;
- never advances the real Campaign;
- never consumes production inventory;
- never mutates production shop stock;
- never unlocks Codex/achievements through its hooks;
- uses localStorage only for optional **Test Lab preset configuration**, not gameplay persistence;
- destroys its Game/Music runtime when the dialog closes.

Sandbox state includes the same production run domains needed for QA:

- Campaign;
- inventory;
- equipment;
- support spells;
- characters;
- Luck/Pity;
- hidden discovery;
- Credits and expansion currencies;
- progression;
- shops;
- route;
- upgrades;
- Relics;
- Ascension;
- committed checkpoint;
- stage-entry snapshot;
- crash-recovery snapshot;
- CampaignExpansionState.

## Single-screen controls

The title screen exposes one `Developer Test Lab` dialog.

### World / stage / difficulty

Supports:

- all 50 registered Worlds;
- Stage / checkpoint context;
- vocabulary level;
- Relax/Balanced/Hard/Extreme/Nightmare/Impossible/Adaptive/Custom modes;
- recent WPM / accuracy;
- Custom target WPM / pressure;
- World-normal, Mini Boss, World Boss and Galaxy Boss quick actions;
- resolved production `DifficultyProfile` in State Inspector.

World rules, hazards, rosters, boss identities and music identity are read from the production World registry.

### Enemy runtime

Supports:

- any registered enemy definition;
- multiple enemy selections;
- Spawn Selected ×N;
- Spawn All Selected;
- Spawn World Roster;
- Rank I-X;
- 1-3 typing layers;
- exact production visual definition;
- forced skill list / immediate skill execution;
- runtime speed / action cooldown / elite / Threat Budget override;
- force word completion / next layer;
- kill selected;
- clear enemies;
- production formation spawn;
- Active Typing Pressure / urgent threats / controller-support counts in inspector.

Manual formation spawn reuses the same production formation admission and atomic spawn path as the Campaign scheduler.

### Boss runtime

Boss selection maps the selected production boss definition back to its canonical World/stage, then starts the normal stage and invokes the production boss spawner.

Supports:

- Mini Boss / World Boss / Galaxy Boss selection through stage mapping;
- boss HP ratio;
- phase 1/2/3;
- shield state;
- stagger duration;
- reset/clear without resetting the Test Lab session.

Boss rendering, typing mechanics, projectile pressure and phase state are the normal Game runtime.

### Player / build

Supports direct QA configuration for:

- Character;
- Hull;
- Shield;
- Firepower;
- Armor;
- Energy;
- Reactor;
- Focus;
- Ward;
- Luck;
- Salvage;
- current Hull/Shield/Energy/Power;
- player skill;
- support spell;
- equipment definition / grade / enhancement;
- Relics;
- currencies.

Equipment uses `EquipmentState`, `addEquipmentInstance`, `equipInstance` and `equipmentStatBonus`.

Relics use `RelicState`, `grantRelic`, `equipRelic` and `compileRelicEffects`.

Player effective stats are still resolved by `calculateEffectiveStats`.

### Inventory / items

Supports every registered item:

- Give ×1;
- Give ×5;
- Give ×99;
- set exact quantity;
- remove;
- clear;
- item-definition preview;
- use combat-usable recovery items through `Game.useConsumable`.

The sandbox also has direct QA grants for:

- Salvage Anchor;
- Stage Revival Core;
- Phoenix Core;
- Star Crystal;
- Quantum Core.

### Death / checkpoint / recovery

Two explicit Game death modes exist.

Immortal:

- normal damage is applied;
- Shield/Hull/status/skills continue normally;
- lethal hit count increments;
- Hull is clamped to 1;
- Game Over is not entered.

Real Death:

- production Game may reach Hull 0 and enter Game Over;
- recovery actions are then exercised against the isolated sandbox.

Acceptance actions reuse production persistence functions:

- no-item death -> invalidate + `resolveCrashRecovery`;
- Salvage Anchor -> `resolveSalvageAnchor`;
- Stage Revival Core -> `resolveStageRevivalCore`;
- Phoenix Core -> `consumePhoenixCore` + `Game.reviveCurrentEncounter`;
- crash capture -> `captureCrashRecoverySnapshot`;
- crash restore -> `resolveCrashRecovery`;
- Return to Checkpoint -> `restoreCheckpointSnapshot`.

No fake Test-Lab-only rollback algorithm exists.

### Status / CC

Supports:

- every registered production status;
- apply / stack attempt;
- configurable duration;
- clear selected;
- clear all.

Inspector exposes the production `HardCcState`, including active hard CC and freeze/silence immunity timers.

### Skills / scheduler / pressure

Supports:

- production skill activation;
- support spell activation;
- cooldown/charge reset;
- time scale 0.25×-4×;
- freeze automatic scheduler;
- single scheduler step;
- max active enemies;
- spawn interval;
- pressure budget;
- urgent-threat cap;
- formation complexity;
- attack interval factor;
- clear projectiles;
- clear particles.

The normal production scheduler is factored into one shared method used by Campaign auto-spawn and Test Lab single-step.

### Shop / economy

Supports all registered shop types:

- normal;
- station;
- traveling;
- black market;
- hidden;
- event;
- service.

Shop stock is created through `resolveShopInstance`.

Purchases use `buyShopStockEntry`, including Credits/material checks, finite stock decrement, inventory/equipment grant and deterministic ShopState.

Explicit QA reroll is isolated to the Test Lab session.

### Reward / loot

Supports:

- production equipment-drop rolls by LootSource;
- Luck / Salvage inputs;
- normal reward-choice preview;
- boss reward-choice preview;
- currency grants;
- resurrection-item grants.

The Test Lab does not permanently grant Campaign rewards.

### Music / audio

Uses a separate production `MusicController`.

Supports:

- every `MUSIC_STATES` entry;
- World profile selection through stage/World;
- crossfade duration;
- Music/Ambient volume;
- SFX/Announcer volume;
- pronunciation volume;
- boss music phase;
- announcer events;
- real `speakEnglish` pronunciation;
- warning SFX;
- manual duck/release for announcer/pronunciation/warning;
- Stop/Reset Music.

`MusicController.getDebugSnapshot()` exposes read-only:

- current state / World / boss phase;
- duck reasons and resolved duck multiplier;
- active/retiring music assets;
- active/retiring ambient assets;
- candidate fallback paths;
- mix values;
- resolved element volume.

This debug method does not scan registries every combat frame.

### Keyboard / typing

The Test Lab canvas is focusable.

When focused, key input is routed to the isolated Test Lab `Game.handleKey` and propagation is stopped so the production title Game does not receive those keystrokes.

### Presets

Built-in templates include:

- World Enemy Showcase;
- World Boss Showcase;
- Rank X / 3-layer enemy;
- formation pressure stress;
- low-WPM Relax;
- Impossible;
- checkpoint 181 -> death at 190;
- Salvage Anchor death;
- Stage Revival Core death;
- Phoenix Core boss-phase test;
- World -> boss music transition.

A local Test Lab preset can also be saved/reloaded without touching PlayerSave.

## State Inspector

The live inspector reports:

- last Test Lab action;
- current World profile;
- active stage;
- checkpoint stage and committed economic snapshot;
- RouteState;
- active sandbox currencies/inventory/equipment/Relics;
- CampaignExpansionState;
- stage-entry snapshot;
- crash-recovery snapshot;
- production GameStats;
- resolved player stats;
- current enemies;
- Rank/layers/skills/Threat Budget;
- boss state;
- statuses;
- HardCcState/immunity;
- projectiles/particles;
- Active Typing Pressure;
- resolved DifficultyProfile;
- scheduler state;
- skill cooldown/charge states;
- current objective;
- MusicController debug snapshot;
- shop stock;
- reward preview.

## Completeness audit

`createTestLabRegistry()` is derived directly from production registries.

CI verifies discovery of:

- all 50 Worlds;
- all registered enemies;
- every World Mini Boss;
- every World Boss;
- every enemy skill;
- every supported status;
- every item;
- every equipment definition;
- every Character;
- every player core skill;
- every support spell;
- every shop type;
- Credits + expansion currencies;
- all Grades;
- all Relics;
- all music states;
- every WorldMusicProfile.

It also runs the production `validateWorldMusicProfiles()` contract, including required asset/fallback mappings.

## Regression coverage

M21 adds coverage for:

- Test Lab registry completeness;
- sandbox deep-copy isolation;
- isolated checkpoint / stage-entry / crash snapshots;
- no-item death rollback through production crash/death resolver;
- gated Game debug APIs being dormant outside Test Lab;
- Immortal lethal-hit behavior;
- scheduler / pressure overrides;
- production enemy force-word/layer/kill path;
- MusicController debug snapshot;
- existing music fallback/duck/crossfade lifecycle tests.


## Validation

Final implementation checkpoint before merge:

- CI #376 PASS;
- 111 test files PASS;
- 561/561 tests PASS;
- TypeScript no-emit check PASS;
- Vite production build PASS.

The final docs/source-of-truth commit is required to pass the same workflow before PR merge.

## M22 manual-gate extension

M22 extends the existing Test Lab with one QA-only **Manual Gate Recorder**. This is not a second Test Lab and does not change the completed M21 gameplay sandbox architecture.

The recorder:

- mirrors all 43 rows in `docs/M22_MANUAL_PLAYTEST_MATRIX.md`;
- records PASS / FAIL / PENDING plus notes;
- supports one default browser/device and a per-row device override;
- stores only manual QA observations under `spaceTypingM22ManualGateV1`;
- exports a paste-ready Markdown report;
- never writes PlayerSave or any Campaign/checkpoint/crash/reward/equipment/Relic state.

It is a recording aid only. It cannot replace the real browser, audio-device and human-paced checks required to close M22.

