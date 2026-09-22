# M16 — Stage Objectives + World Boss Typing Mechanics

M16 adds event-driven Stage Objectives and World-family boss typing mechanics on top of the existing Campaign/Game/BossState runtime.

It does not create a second objective polling loop or a parallel boss architecture.

## Stage Objectives

The shared objective model supports:

- Survive for N seconds;
- maintain Accuracy >= target;
- No-Miss clear;
- protect convoy/beacon integrity;
- Commander First;
- destroy a Marked Target before escape;
- defeat an Elite quota;
- clear before an objective timer.

Objectives are deterministic from the numbered Campaign StageConfig and current M12 DifficultyProfile.

Hidden M15 side encounters intentionally do not receive normal Campaign Stage Objectives.

## Event-driven objective runtime

Objective state is reduced only from explicit gameplay events:

```text
tick
correct-key
miss
enemy-spawn
enemy-kill
enemy-escaped
stage-clear
```

The objective system does not scan the full Game state each frame.

The regular Game update supplies only a bounded tick event for timer objectives.

Spawn/kill/escape/miss paths publish their own events.

Stage-clear accuracy is evaluated from the existing aggregate GameStats hit/miss counters.

## Required vs bonus objectives

Special / Hazard stages use a required Survive objective.

Gauntlet stages use a required Elite quota.

Other eligible stages may receive optional objectives.

Boss stages do not receive a Stage Objective so boss typing pressure remains readable.

Required objectives gate `finishStage()`.

The Game reuses its existing spawn path to keep required contracts achievable:

- Commander-first can force the Commander before ordinary random spawns;
- Elite Hunt can force Elite spawns until the quota is reached;
- random formation spawning is suppressed while a forced Commander/Elite requirement is pending.

Pressure admission and all M09-M13 enemy systems remain active.

## Objective targeting

Marked Target captures a concrete enemy id from the existing enemy-spawn event.

The existing enemy typing label adds an `OBJECTIVE` marker for that target.

No extra target entity/rendering system is introduced.

Protect uses bounded integrity state and enemy-escaped events.

## Objective HUD

Game exposes objective updates through the existing Hooks object.

The main HUD renders:

- REQUIRED or BONUS;
- objective label;
- progress;
- ACTIVE / COMPLETE / FAILED state.

Updates use event changes plus a bounded 150ms timer refresh for live timer objectives.

## Objective rewards

Completed objectives produce a reward factor.

That factor is multiplied by the current M12 difficulty reward multiplier.

Normal numbered Campaign stage-clear rewards apply the combined multiplier to:

- Credits;
- expansion currencies.

Failed optional objectives do not block stage clear and produce no objective bonus.

Required objective completion is necessary before stage clear.

No new objective currency is introduced.

## Persistence and recovery

Objective state is encounter-runtime state.

It is deterministic from:

- StageConfig;
- DifficultyProfile;
- gameplay events after encounter start.

No PlayerSave schema change is required.

Stage Revival / checkpoint / technical recovery use the existing stage-entry and Campaign recovery paths; the encounter objective is reconstructed when the stage restarts.

No objective progress is stored in a separate persistence domain.

---

# Boss typing mechanics

M16 extends the existing `BossState`.

Each active boss phase has at most one typing mechanic.

The mechanic is selected from the boss visual's existing enemy family plus:

- BossRole;
- current phase;
- current M12 DifficultyProfile.

Boss HP, phase transitions, projectiles, drops, SFX/VFX and death remain on the existing BossState/Game path.

## Mechanics

### Interrupt Charge

The boss exposes a visible countdown.

Completing the current full word before expiry:

- interrupts the charge;
- adds a bounded damage bonus;
- staggers the boss.

If the timer expires:

- the mechanic ends;
- the boss immediately fires an extra double projectile response.

Timer values are derived from current difficulty/reaction pressure and remain bounded.

### Shield Sequence

The boss shield remains active until a complete word sequence is finished.

Required word count:

- Mini Boss: 1;
- World Boss: 2;
- Galaxy Major Boss: 3.

Each completed word consumes one sequence step.

No word damage is applied while the shield sequence remains active.

The final word breaks the existing boss shield and triggers existing shield-break feedback.

### Weak Point

The current boss word is selected from the long-word band of the existing configured vocabulary source.

Completing it grants a high word-damage multiplier and stagger.

No special vocabulary source is introduced.

### Rapid Rage

The current boss word is selected from the short-word band.

Boss action interval is reduced while the mechanic remains active.

This creates rapid typing pressure without fake keyboard latency or dropped input.

### Accuracy Curse

Perfect completion grants higher boss word damage and stagger.

A word completed after a miss receives a much lower damage multiplier.

The mechanic uses the existing per-word miss flag.

## World-family phase language

The mechanic sequence is deterministic per existing enemy family.

Examples:

- Rainbow emphasizes Shield Sequence / Weak Point / Rapid Rage;
- Devil emphasizes Interrupt Charge / Accuracy Curse / Rapid Rage;
- Frost emphasizes Shield Sequence / Interrupt Charge / Accuracy Curse;
- Shadow emphasizes Interrupt Charge / Accuracy Curse / Rapid Rage;
- Cosmic emphasizes Weak Point / Rapid Rage / Interrupt Charge.

Mini Boss uses one family mechanic.

World Boss may expose two phase mechanics.

Galaxy Major Boss may expose three.

A new phase replaces the previous mechanic; mechanics are not stacked simultaneously.

## Boss vocabulary

`pickBossEntry()` still reads only the current configured vocabulary source.

Preference modes:

- Rapid Rage -> short words;
- Weak Point -> long words;
- other mechanics -> normal boss word band.

This preserves parent vocabulary contracts.

## Boss HUD

BossState exposes optional mechanic HUD fields through `toBossHud()`:

- mechanic label;
- countdown timer;
- sequence progress.

Existing BossHud fields remain compatible for states without an active mechanic.

Interrupt Charge live timer updates are throttled to 100ms so the DOM HUD stays readable without a per-frame DOM write.

## Phase transition

When BossState enters a new phase:

1. resolve the current boss visual family;
2. select the family/phase typing mechanic;
3. reset the current boss typing word;
4. set shield state only when the new mechanic is Shield Sequence;
5. choose a word matching the new mechanic preference;
6. recompute boss action interval.

The previous hardcoded "phase 2 always shield" assumption is removed.

## Validation

Automated coverage verifies:

- deterministic Stage Objective assignment;
- boss stages remain objective-free;
- required Survive completion and finish gating;
- aggregate Accuracy evaluation;
- No-Miss failure;
- Protect integrity;
- Commander-first success/failure;
- Marked Target escape failure;
- Elite quota and forced-spawn helper behavior;
- Speed Clear timing;
- objective reward scaling by global difficulty;
- World-family boss mechanic mapping;
- one mechanic per phase;
- complete Shield Sequence behavior;
- counterable Interrupt Charge and timeout result;
- Weak Point long-word damage window;
- Rapid Rage short-word/action-pressure contract;
- Accuracy Curse perfect/missed damage split;
- mechanic data through the existing Boss HUD contract.

CI #268 passes Test + Build after updating the existing Game hook test fixture for the new objective callback.

M17 owns Skill Lv1-Lv5, permanent attributes, equipment service expansion, dismantling, optional grade evolution and later affix groundwork. It must extend the current SkillEngine/stat/equipment/ShopState/PlayerSave systems rather than create parallel upgrade domains.
