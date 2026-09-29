# SPACE TYPING — 1000 STAGE EXPANSION V2 FINAL

**Project:** `sinhvienaiti/space-typing`  
**Document role:** FINAL design / architecture / implementation source of truth for the 1000-stage expansion  
**Status:** Approved planning source of truth — implement phase-by-phase, never all at once  
**Baseline reviewed:** `feat/bgv-integration-current`, Claude code review at commit `996be26` on 2026-09-29  
**Supersedes for this initiative:** the original `SPACE_TYPING_1000_STAGE_EXPANSION_MASTER_PROPOSAL.md` plus the standalone Claude review notes  
**Important:** Before implementation, inspect the latest active branch. Newer code and newer explicit project decisions override stale filenames or line counts in this document.

---

# 0. FINAL DECISION

Space Typing does **not** need a second parallel set of gameplay systems.

The real code already contains early forms of most proposed ideas:

- stage events and galaxy hazards;
- elite variants and many enemy-specific behaviors;
- relics, perks, ship passives and synergies;
- equipment progression and skill mastery;
- Rage ultimates;
- boss typing mechanics and phases;
- combo / streak systems;
- adaptive profile and active pressure;
- route, shop and station progression;
- Codex / meta progression;
- Recall and learning hooks;
- WebGL backgrounds and large background objects;
- Test Lab;
- a large automated regression suite.

Therefore V2 changes the implementation philosophy from:

```text
new idea
→ new subsystem
```

to:

```text
new idea
→ inspect existing system
→ extend / unify / expose it
→ add a new subsystem only if ownership is truly different
```

The long-term target remains:

> Create a system capable of keeping ~1000 campaign stages meaningfully different without manually authoring 1000 unique stages.

The four long-term pillars are:

```text
Typing Mastery
+ Buildcraft
+ Encounter Variety
+ Long-Term Surprise
```

Cinematic presentation, art quality and audio are multipliers for those pillars. They are not substitutes for gameplay variety.

---

# 1. CORE DESIGN PRINCIPLES

## 1.1 Typing remains the combat system

Every major combat addition should interact with at least one of:

- typing accuracy;
- perfect words;
- streak / combo consistency;
- word length;
- typing rhythm;
- reaction time;
- Recall performance;
- vocabulary mastery;
- target priority;
- typing under pressure.

Good:

```text
Perfect 9-letter word
→ heavy shot
→ Flow increases
→ a relic reacts
→ a discovered synergy can trigger
```

Weak:

```text
+12% damage
+8% HP
+5% fire rate
```

Numeric modifiers may exist, but they must support rather than replace the typing loop.

## 1.2 Reuse-first architecture

Before adding a new manager, state store, target system, renderer, UI panel, progression tree or event engine:

1. identify the current owner;
2. check whether it can safely be extended;
3. extend it if ownership matches;
4. create a new subsystem only when responsibility is genuinely separate.

No duplicate target system for boss parts.  
No duplicate evolution tree.  
No duplicate adaptive director.  
No duplicate archive.  
No duplicate anomaly manager.

## 1.3 Systems combine through controlled composition

Variety is not equivalent to uncontrolled randomness.

Preferred:

```text
Encounter Recipe
+ Sector Condition
+ Enemy Roles
+ Elite Affixes
+ Typing Pattern
+ Objective
+ World Theme
+ Threat Envelope
```

The combination must pass compatibility rules and pacing rules.

## 1.4 Readability beats spectacle

Render / UX priority:

```text
1. active typing target
2. immediate danger
3. mechanic indicators
4. player ship
5. combat VFX
6. cinematic / background spectacle
```

A mechanic must not become “difficult” merely because the required letters are hard to see.

## 1.5 High / Ultra never change gameplay

Low / Medium / High / Ultra must not change:

- damage;
- hitboxes;
- enemy speed;
- spawn logic;
- target logic;
- typing strings;
- cooldown logic;
- boss state transitions;
- condition rules;
- adaptive pressure logic.

They may change:

- particle density;
- trail fidelity;
- glow / bloom composition;
- secondary animation;
- lighting;
- debris;
- distortion quality;
- background richness;
- non-gameplay cinematic detail.

Ultra means **more sophisticated composition**, not “4× every particle”.

## 1.6 Player agency is mandatory

The current game already contains many modifiers. Long-term retention requires the player to make meaningful choices about them.

Core rule:

> Important build rewards should often use **Choose 1 of 3** instead of automatic assignment.

## 1.7 Variety must be measurable

A full 1000-stage simulation must be able to report:

- exact encounter repeats;
- near repeats;
- repeated Sector Conditions;
- repeated Elite Affix pairs;
- repeated Typing Patterns;
- repeated Encounter Recipes;
- repeated boss-mechanic combinations;
- recovery spacing;
- milestone spacing.

“Feels repetitive” must become measurable enough to diagnose.

---

# 2. CANONICAL V2 TERMINOLOGY

| Original / ambiguous concept | Canonical V2 name | Decision |
|---|---|---|
| Stage Anomaly | **Sector Condition** | avoids conflict with the existing anomaly chest/event naming |
| Elite mutation | **Elite Affix** | extends the existing elite system |
| Overdrive flow | **Flow** | avoids collision with existing Overdrive/Rage naming |
| Adaptive Combat Director | **Threat / Adaptive Pressure** | extend existing adaptive systems, not a new director |
| Encounter composition | **Encounter Recipe** | new lightweight composition layer |
| Multi-stage rhythm | **Macro Pacing** | controls 5–10 stage arcs |
| Awakening | **Rage Awakening** | visual/presentation extension of Rage |
| Evolution | **Existing progression + projectile evolution** | no second progression tree |
| Archive | **Codex / Mastery** | extend existing meta systems |
| Short replay mode | **Expedition** | separate from campaign progression |
| Weak vocabulary target | **Wanted Word** | learning-driven elite target |
| End-of-world learning boss | **Lexicon Boss** | curated from weak vocabulary |

---

# 3. CURRENT-CODE FIT: FINAL DECISIONS

## 3.1 Sector Conditions — IMPLEMENT BY EXTENSION

Reuse:

- `events/stage-scheduler.ts`;
- `events/galaxy-hazards.ts`;
- current stage-event definitions;
- existing meteor background effects;
- existing Singularity / black-hole visual resources;
- existing boss/title presentation patterns where appropriate.

Do **not** create another anomaly manager.

Extend the existing stage-event data model with the equivalent of:

```text
tags
incompatibleWith
runtimeRules
visualProfile
audioProfile
briefing
weight
minStage
maxStage
worldRestrictions
```

MVP set:

1. Solar Storm
2. Meteor Shower
3. Gravity Well
4. Time Fracture

Hold:

- Word Corruption;
- Lost Signal;
- Gravity Inversion.

Reason: readability, learning quality and target-order risk.

### Sector Condition acceptance rules

Each condition must:

- change gameplay, not only decoration;
- be understandable within several seconds;
- have an unmistakable visual/audio cue;
- keep required text readable;
- use the same logic at all graphics tiers;
- be selectable in Test Lab;
- be globally disable-able;
- declare incompatibilities.

---

## 3.2 Elite Affix — MERGE INTO CURRENT ELITE SYSTEM

Reuse:

- `enemies/elite.ts`;
- `enemies/threat.ts`;
- existing enemy behaviors;
- `vfx/combat-fx.ts`.

First, make current elite variants visually legible:

- Swift;
- Armored;
- Frenzy;
- Volatile.

Then add only behaviors that are not already represented by enemy kinds:

- **Chrono** — accelerates when the player stops typing;
- **Guardian** — protects nearby allies;
- **Berserker** — accelerates near the player ship;
- **Phase** — shifts lane / position by a readable rule;
- **Anchored** — resists pull/stun control effects.

Do **not** create these affixes:

- Splitter;
- Leech;
- Cloaked;
- Commander;
- Summoner.

Those are enemy identities/behaviors already present in the game.

Affix quantity and rarity must consume the existing threat budget instead of creating an unrelated second scale.

### Elite Affix acceptance rules

- each affix changes target priority or typing behavior;
- every affix has a readable visual signature;
- no affix makes the word unreadable;
- no duplicated enemy-kind behavior;
- entity multiplication is capped;
- incompatible stacks cannot spawn;
- Test Lab can force exact combinations.

---

## 3.3 Typing Build & Synergy — IMPLEMENT BY UNIFICATION

Reuse:

- relic registry;
- equipment perks;
- ship passives;
- existing synergy logic;
- Recall hooks;
- adaptive profile where player-relative thresholds are needed.

Primary work:

1. deterministic combat-event pipeline;
2. Choose-1-of-3 reward flow;
3. centralized trigger resolution;
4. visible synergy discovery;
5. controlled relic expansion.

### Initial build families

- Precision
- Combo
- Long Word
- Recall

### Initial content size

Do **not** jump directly to 24 new relics.

Start with:

```text
4 families
× 3 core relics
= 12 core relics
```

Then scale only if telemetry / manual play confirms real run diversity:

```text
12 → 16 → 20 → 24
```

### Speed-related rules

Any speed build should compare the player against their own adaptive baseline or percentile, not against one universal WPM threshold.

### Vocabulary-category build

Hold until word metadata quality is audited. Do not assume every active word has reliable part-of-speech metadata.

---

## 3.4 Evolution / Rage Awakening — MERGE

Evolution is not a new tree.

Canonical interpretation:

```text
equipment Mk progression
+ rarity / grade
+ skill rank / mastery
+ projectile evolution where useful
```

Rage Awakening is not a second resource meter.

Canonical interpretation:

```text
existing Rage ultimate
+ temporary visual transformation
+ stronger audiovisual presentation
+ optional music climax layer
```

Gameplay behavior remains owned by the existing Rage / skill system.

---

## 3.5 Space Events — IMPLEMENT LATER

Add an `event` route node only after combat variety and player-choice systems stabilize.

Events should be data-driven with:

```text
requirements
choices
effects
flags
followUpEvent
worldRestrictions
stageRange
rarity
cooldown
```

Good initial event families:

- Derelict Ship;
- Distress Signal;
- Merchant;
- Ancient Gate;
- Memory Fragment.

At least two should support follow-up flags so event chains can be validated.

---

## 3.6 Cinematic Events — HOLD UNTIL PERFORMANCE BASELINE PASSES

Do not scale cinematic content before background performance issues are fixed.

First cinematic target:

> One polished reference event in one World.

It must prove:

- deterministic sequencing;
- cleanup;
- repeated playback without leak;
- High/Ultra profiling;
- gameplay input stability;
- target readability;
- independent enable/disable.

Only after that may cinematic content scale.

---

## 3.7 Boss Mechanics 2.0 — EXTEND EXISTING BOSS SYSTEM

Reuse:

- interrupt-charge;
- shield sequence;
- weak-point concepts;
- rapid-rage;
- current boss phases;
- identity art/VFX/audio;
- current target / typing pipeline.

Primary new mechanic:

> **Targetable boss parts.**

Implementation direction:

> Represent each targetable boss part as an enemy-like combat target attached to the boss, reusing existing target selection, typing, damage, rendering and FX.

Do **not** create a second target-acquisition system.

Boss-part metadata must explicitly suppress normal enemy side effects. Equivalent fields/rules should cover:

```text
parentBossId
bossPartType
countsForKillObjective = false
dropsLoot = false
eligibleForNormalAffix = false unless explicitly allowed
spawnBudgetCost handled by boss encounter
detachOnParentDeath
destroyedState
rewardDisabled
```

Reference boss prototype:

- Vorgrath / G02 (or latest equivalent Tyrant if the branch changed);
- 2 targetable parts;
- 1 interruptible ultimate;
- 1 rage phase.

---

## 3.8 Flow — IMPLEMENT EARLY, MERGE WITH EXISTING STREAK / AUDIO

Flow should be derived from existing streak/combo state, not a completely separate independent meter.

Flow controls:

- ship aura;
- projectile/trail richness;
- impact presentation;
- calm → intense music layering;
- one carefully balanced gameplay bonus.

Avoid a “one typo destroys everything” model. Use existing combo-protection mechanisms and soft decay where appropriate.

Do not reuse the word **Overdrive** for Flow tiers.

Initial four tiers:

```text
NORMAL
FOCUS
FLOW
HYPER
```

A fifth spectacle tier may be added later only if it remains readable.

---

## 3.9 Threat / Adaptive Pressure — SMALL EXTENSION ONLY

Reuse:

- adaptive profile;
- difficulty;
- active pressure.

Do **not** build a new large Director system.

Add:

- visible Threat Level;
- slow bounded spawn-interval adjustment;
- small bounded simultaneous-enemy adjustment if needed;
- small bounded elite-probability adjustment if needed.

Never secretly compensate by massively changing current-enemy HP or other invisible cheats.

Every adjustment is clamped by the stage / World threat envelope.

---

## 3.10 Codex / Meta / Mastery — EXTEND EXISTING SYSTEMS

Extend Codex instead of building a second Archive.

Long-term Codex sections may include:

- World;
- enemy;
- boss;
- reward;
- vocabulary;
- mastered words;
- discovered synergy;
- secrets.

Track learning data early even if the final UI arrives later.

---

# 4. TYPING PATTERN SYSTEM — CORE V2 ADDITION

The most important missing form of variety is not more VFX. It is **changing what typing feels like**.

Create a declarative concept:

```text
Typing Pattern
```

Canonical initial patterns:

1. `NORMAL_WORD`
2. `SHORT_BURST`
3. `LONG_WORD`
4. `PHRASE`
5. `SHARED_TARGET`
6. `CHAIN`
7. `RECALL_WORD`
8. `BOSS_SENTENCE`

### Examples

**SHORT_BURST**

- weak swarm units;
- one letter or very short token;
- rapid tempo;
- strict entity cap.

**LONG_WORD**

- sniper / heavy threat;
- long real vocabulary word;
- slower encounter tempo;
- large payoff.

**PHRASE**

- elite or special target;
- real two-word collocation / short phrase;
- no fake punctuation complexity unless the learning dataset supports it.

**SHARED_TARGET**

- a formation shares one target;
- typing once damages/clears the linked formation according to encounter rules.

**CHAIN**

- successful completion determines or rewards the next target;
- use real words;
- never transform letters into unreadable gimmicks.

**BOSS_SENTENCE**

- short sentence for a major interrupt / finisher;
- rare;
- readable;
- designed so failure is a controlled penalty, not an unavoidable instant death.

### Pattern ownership rule

Enemy kind, Encounter Recipe or boss mechanic selects the pattern.  
Do not independently randomize a pattern on every spawn.

### Acceptance rules

- text remains authentic and readable;
- learning data remains meaningful;
- pattern has a gameplay reason;
- pattern frequency is controlled;
- Test Lab can force each pattern;
- pattern length can be deterministically seeded for tests.

---

# 5. ENCOUNTER RECIPE SYSTEM — CORE V2 ADDITION

Randomness alone does not create good encounters.

`Encounter Recipe` is a lightweight composition layer deciding which existing systems are allowed and how they form a coherent battle.

It is **not** a replacement for stage scheduling.

Example schema intent:

```text
id
tags
stageRange
worldCompatibility
enemyRoleWeights
typingPatternPool
allowedConditions
allowedAffixes
forbiddenCombinations
objectivePool
threatEnvelope
pacingProfile
rewardProfile
recentRepeatCooldown
```

Initial recipe candidates:

1. **Swarm Assault**
2. **Sniper Ambush**
3. **Fortress Siege**
4. **Escort Break**
5. **Elite Hunt**
6. **Recall Rupture**
7. **Boss Prelude**

### Example: Sniper Ambush

```text
Enemy roles:
- sniper heavy
- escort medium
- guardian rare

Typing:
- LONG_WORD favored
- SHORT_BURST forbidden

Affixes:
- Chrono allowed
- Berserker low weight

Conditions:
- Time Fracture allowed
- Meteor Shower low weight

Pacing:
- low simultaneous count
- high individual threat
```

### Example: Swarm Assault

```text
Enemy roles:
- small units dominant
- splitter limited
- commander rare

Typing:
- SHORT_BURST favored

Affixes:
- entity-multiplying combinations capped

Pacing:
- fast waves
- short recovery
- AoE builds feel valuable
```

### Encounter Recipe rules

- recipes compose existing systems, they do not duplicate them;
- each recipe must have a recognizable gameplay identity;
- recent-history cooldown prevents immediate repeats;
- incompatible systems are filtered before runtime;
- recipe selection must be reproducible from a seed for tests / daily Expedition.

---

# 6. MACRO PACING — CORE CAMPAIGN ADDITION

The 1000-stage campaign needs rhythm, not just variety.

Macro Pacing operates across roughly 5–10 stages and controls the **shape** of the journey.

Example arc:

```text
CALM
→ BUILDUP
→ PRESSURE
→ SURPRISE
→ RECOVERY
→ ELITE
→ CLIMAX
```

It does not directly implement combat mechanics. It tells the stage scheduler what kind of intensity/novelty slot is needed next.

Example:

```text
311 baseline
312 swarm
313 Sector Condition
314 recovery / reward
315 elite
316 unusual Typing Pattern
317 baseline
318 route event
319 boss prelude
320 boss
```

### Macro Pacing rules

- no endless escalation;
- mandatory recovery windows;
- no back-to-back high-complexity encounters unless intentionally curated;
- milestone stages can override the normal arc;
- World transitions should reset or reshape the arc;
- late game means better combinations, not “everything enabled at once”.

---

# 7. CHOOSE 1 OF 3 — PLAYER AGENCY FOUNDATION

Important build progression should frequently present three valid choices.

Use at:

- boss reward;
- major chest;
- station;
- Expedition stage reward;
- selected route events.

Rules:

- choices must differ mechanically, not only numerically;
- avoid offering three items from the same exact build niche too often;
- avoid one universally dominant dominant choice;
- show synergy hints only if already discovered, unless discovery is the purpose;
- deterministic seed support for Expedition;
- reroll is optional and should be limited if introduced.

This system is what converts “the game has relics” into “the player is building a run”.

---

# 8. EXPEDITION — REPLAYABILITY MODE

Expedition is separate from the 1000-stage campaign.

Initial target:

```text
~20 encounters per run
```

Composition:

- Worlds sampled from unlocked/allowed content;
- Encounter Recipes;
- Sector Conditions;
- Elite Affixes;
- bosses;
- route events;
- Choose-1-of-3 build rewards.

Features:

- run-local relic choices;
- score;
- personal best;
- deterministic seed;
- Daily Seed;
- final run summary.

Expedition must reuse production combat logic.

It must **not** fork a fake duplicate combat implementation.

### Expedition acceptance rules

- same seed + same choices produces deterministic encounter structure where practical;
- campaign save is not corrupted;
- Expedition state has explicit save ownership;
- abandoning an Expedition cannot alter campaign stage position;
- build rewards reset as designed at end of run;
- score is deterministic enough for personal comparison.

---

# 9. LEARNING PROGRESSION — MAKE VOCABULARY PART OF THE RPG

## 9.1 Wanted Words

Words repeatedly missed or recalled poorly may become Wanted Words.

Example:

```text
environment
→ repeated failures
→ WANTED status
→ appears later on a marked elite
→ successful clears reduce weakness
→ mastery eventually achieved
```

Rules:

- never shame the player;
- do not increase difficulty simply because a word is weak;
- re-exposure is the learning mechanism;
- reward improvement.

## 9.2 Mastery Constellation

Mastered words may light stars / nodes in a collection.

This is primarily meta progression and visual motivation.

## 9.3 Lexicon Boss

At selected World milestones, a Lexicon Boss may draw from:

- recently weak words;
- recently improved words;
- World thematic vocabulary;
- Recall history.

It must still follow boss readability rules and controlled sentence/phrase length.

## 9.4 Vocabulary Codex

Track as available:

- English word;
- IPA;
- Vietnamese meaning;
- part of speech when reliable;
- times seen;
- typing accuracy;
- Recall accuracy;
- mastery state;
- last seen / review priority.

---

# 10. NEMESIS AND GHOST — OPTIONAL HIGH-VALUE EXTENSIONS

## 10.1 Nemesis

A special elite that defeats the player may become a named rival and reappear later.

Use mainly in Expedition first.

Rules:

- max active Nemesis chain count is bounded;
- return interval is not annoying;
- Nemesis receives a readable identity;
- progression adds a controlled affix / behavior, not arbitrary stat inflation;
- defeating it grants a meaningful reward.

## 10.2 Personal Ghost

Replay a prior stage/run against a non-interactive ghost representing the player’s previous best timing.

Purpose:

- self-comparison;
- typing improvement motivation;
- low art cost.

Ghost must never affect collision or gameplay state.

---

# 11. DETERMINISTIC COMBAT EVENT PIPELINE — PHASE 0 FOUNDATION

A shared gameplay-event layer is approved, but it must be:

- typed;
- synchronous;
- deterministic;
- ordered;
- bounded;
- command-returning rather than state-owning.

Do **not** implement an asynchronous global event bus.

Representative event types:

```text
LETTER_TYPED
WORD_STARTED
WORD_COMPLETED
WORD_FAILED
PERFECT_WORD
STREAK_CHANGED
ENEMY_SPAWNED
ENEMY_KILLED
PLAYER_HIT
SKILL_USED
BOSS_PHASE
RECALL_RESULT
PROJECTILE_INTERCEPTED
STAGE_STARTED
STAGE_ENDED
```

Representative processing order:

```text
statistics
→ ship passive
→ relic
→ perk
→ synergy
→ Flow
→ Threat / Adaptive Pressure
→ Meta / Mastery
```

Listeners do not mutate authoritative combat state directly.

They return commands such as:

```text
strike(target, amount)
restoreEnergy(value)
blockDamage()
applyStatus(...)
spawnFx(...)
playSound(...)
modifyFlow(...)
```

`Game` applies commands and remains the authoritative combat owner.

Recursive event generation must have a strict depth/budget limit.

## Migration rule

Do not migrate every existing trigger in one risky patch.

### Phase 0B

Migrate:

- WORD_COMPLETED;
- PERFECT_WORD;
- STREAK_CHANGED.

Run full regression.

### Phase 0C

Migrate:

- ENEMY_KILLED;
- PLAYER_HIT;
- SKILL_USED.

Run full regression.

### Phase 0D

Migrate:

- boss;
- Recall;
- stage lifecycle;
- remaining compatible triggers.

Run full regression.

Behavior should remain unchanged during migration.

---

# 12. STATE OWNERSHIP

One state → one authoritative owner.

| State | Owner |
|---|---|
| combat, targets, enemies, boss, projectiles, active skills | `Game` |
| active Sector Condition | `Game` after configuration is resolved |
| Elite Affixes | enemy state / elite system under `Game` |
| Flow tier | combat state derived from existing streak/combo |
| Threat | adaptive/pressure state consumed by `Game` |
| boss parts | enemy-like targets owned by boss/combat state |
| background cinematic timeline | background/stage renderer |
| audio layers | `MusicController` / SFX layer |
| graphics quality | settings → `qualityProfile()` |
| persistent campaign/meta | persistence modules / main orchestration |
| event-chain flags | persistent expansion/meta section |
| discovered synergies | persistent expansion/meta section |
| mastery / vocabulary progress | learning/meta persistence |
| Expedition run state | dedicated Expedition save/run state |

Rules:

- `Game` must not directly parse persistent save structures;
- main/orchestration resolves configuration and injects it through explicit setters/services;
- no duplicate copy of state in DOM;
- rendering reads state; rendering does not become the owner of gameplay logic.

---

# 13. COMPATIBILITY MODEL

Every composable system should use tags/costs/constraints rather than giant scattered conditionals.

Relevant dimensions:

```text
World
Encounter Recipe
Sector Condition
Objective
Enemy Kind
Elite Affix
Typing Pattern
Boss Mechanic
Route Event
Build
Threat Envelope
```

Compatibility examples:

```text
Cloaked enemy
+ visibility-hiding condition
→ reject

Summoning enemy
+ entity-multiplying affix
+ swarm recipe
→ reject or heavily cost

Boss sentence phase
+ text-obscuring effect
→ reject

Gravity Well
+ Anchored affix
→ valid, because Anchored provides a readable counter-identity
```

Use data-driven compatibility where feasible.

Complex runtime behavior remains code-driven.

---

# 14. VISUAL / AUDIO COMMUNICATION RULES

Every gameplay modifier must teach itself through presentation.

Examples:

- Guardian → protective link / field;
- Chrono → temporal echo;
- Anchored → heavy stabilizer ring;
- Solar Storm → energy pulse;
- Gravity Well → directional pull cues;
- Flow tier → ship/trail/audio escalation.

Rules:

- required text renders on top of VFX;
- no long bright flash directly behind active text;
- avoid expensive per-frame blur paths already known to be problematic;
- use `qualityProfile()` for quality scaling;
- High/Ultra can add secondary layers but not gameplay information unavailable on Low;
- audio cue must not mask pronunciation audio.

---

# 15. PERFORMANCE GATES

Use the latest profiling data as the baseline, not as permanent truth.

From the Claude review baseline, High quality targeted approximately:

- p95 frame time ≤ 20 ms in a representative heavy encounter;
- bounded combat particles;
- bounded smoke particles;
- bounded skill FX particles;
- Sector Condition particle budget;
- at most one full-screen distortion/lensing pass;
- bounded concurrent audio voices;
- no DOM writes every frame;
- HUD updates throttled rather than frame-bound.

Before scaling effects:

1. fix the known performance problems equivalent to P2 / P6;
2. re-profile;
3. fix the remaining background issues equivalent to P3 / P4 before cinematic scaling;
4. establish current budgets in code/tests.

Do not blindly preserve stale numeric budgets if hardware/test harness changes. Preserve the **budget discipline**.

---

# 16. TEST LAB REQUIREMENTS

Every major feature must be testable without playing hundreds of stages.

Required controls over time:

### Sector Condition

- exact condition;
- intensity where supported;
- enable/disable.

### Elite

- enemy kind;
- elite variant;
- exact affix set.

### Typing Pattern

- force pattern;
- force length/category where deterministic.

### Flow

- set streak;
- jump tier.

### Threat

- fake WPM;
- fake accuracy;
- force/freeze threat.

### Build

- equip relic;
- trigger event;
- trigger synergy.

### Boss

- select boss;
- spawn part;
- jump phase;
- trigger ultimate.

### Encounter Recipe

- select recipe;
- seed;
- preview generated encounter.

### Macro Pacing

- simulate N stages;
- inspect selected slot types.

### Expedition

- seed;
- stage index;
- reward choice;
- boss route;
- abandon/reload.

### Cinematic

- play reference sequence;
- replay repeatedly;
- stop/cleanup;
- quality tier comparison.

Test Lab must call production logic with configuration overrides. It must not become a separate fake implementation.

---

# 17. SAVE / MIGRATION RULES

Persistent expansion data should go into a new tolerant section with safe defaults.

Possible long-lived data:

```text
eventChainFlags
discoveredSynergies
mastery
vocabularyMeta
nemesisRecords
expeditionRecords
dailySeedRecord
secrets
```

Avoid validators that require an exact fixed count of IDs.

Every new persistent field must support:

- old saves;
- missing fields;
- checkpoint;
- crash recovery;
- death protection where relevant;
- export/backup;
- migration tests.

Stage-local state generally should not persist across normal reload unless current game design explicitly requires it.

Expedition is the exception: it may need dedicated resumable run state.

---

# 18. VARIETY AUDIT — REQUIRED AUTOMATED QUALITY TOOL

Create a deterministic simulation of the campaign.

Minimum report windows:

```text
last 5 stages
last 10 stages
last 25 stages
last 50 stages
100-stage blocks
full 1000 stages
```

Metrics:

- exact Encounter Recipe repeat distance;
- Sector Condition repeat distance;
- Typing Pattern streak length;
- enemy-role distribution;
- Elite Affix pair repeats;
- high-complexity encounter spacing;
- recovery-stage spacing;
- boss mechanic repeats;
- objective repeats;
- World-theme distribution;
- reward-choice frequency;
- milestone frequency.

Example failure output:

```text
Same Sector Condition repeated within 3 stages: FAIL
Same Typing Pattern 4 stages consecutively: FAIL
Same boss mechanic combination within 40 stages: FAIL
Recovery gap > configured maximum: FAIL
```

Do not optimize purely for maximum entropy. Curated rhythm is more important than random uniqueness.

---

# 19. 1000-STAGE COMPLEXITY CURVE

The campaign should unlock complexity in layers.

Suggested conceptual bands:

## Stage 1–100

- fundamentals;
- visible Flow;
- basic elite readability;
- simple Typing Pattern variation.

## 101–250

- first Sector Conditions;
- first new affixes;
- simple Encounter Recipes;
- Choose-1-of-3 introduction.

## 251–400

- build identity;
- synergy discovery;
- broader recipe pool;
- early mastery hooks.

## 401–600

- 2–3-system combinations;
- boss parts on selected bosses;
- stronger Macro Pacing variation.

## 601–800

- advanced event chains;
- advanced recipes;
- selected Lexicon Boss encounters;
- more elaborate boss combinations.

## 801–950

- high-complexity curated combinations;
- rare Nemesis/champion content;
- mastery-heavy encounters.

## 951–1000

- curated endgame gauntlet;
- deliberate callbacks to prior mechanics;
- final mastery / boss culmination.

Late game must **not** mean every system active simultaneously.

---

# 20. ROADMAP — FINAL IMPLEMENTATION PHASES

## PHASE 0A — PERFORMANCE + BASELINE AUDIT

### Scope

- fix the known critical performance items equivalent to P2/P6;
- capture new performance baseline;
- implement Variety Audit baseline against current content;
- document current repeat behavior before gameplay changes.

### Acceptance criteria

- no behavior change intended;
- current regression suite passes;
- baseline report committed;
- profiling script reproducible;
- rollback is a clean commit revert.

---

## PHASE 0B — COMBAT EVENT PIPELINE: WORD / STREAK

### Scope

- typed synchronous event definitions;
- deterministic queue/processing point;
- migrate word/streak triggers only;
- command-return pattern.

### Acceptance criteria

- no gameplay behavior regression;
- listener ordering has tests;
- recursion depth/budget tested;
- old and new behavior produce equivalent results for migrated triggers;
- no asynchronous hidden dependency.

---

## PHASE 0C — COMBAT EVENT PIPELINE: ENEMY / SKILL

### Scope

- `ENEMY_KILLED`;
- `PLAYER_HIT`;
- `SKILL_USED`;
- compatible relic/perk/synergy triggers.

### Acceptance criteria

- no typing lock after skill use;
- targeting regression passes;
- reward/drop behavior unchanged;
- full suite passes.

---

## PHASE 0D — COMBAT EVENT PIPELINE: BOSS / RECALL / STAGE

### Scope

- boss phase events;
- Recall result;
- stage lifecycle;
- remaining compatible triggers.

### Acceptance criteria

- boss phase transition cannot soft-lock typing;
- Recall remains behaviorally equivalent;
- pause/restart/stage transition pass;
- full suite passes twice on clean runs.

---

## PHASE 1A — MAKE EXISTING VARIETY VISIBLE

### Scope

- pre-stage briefing card;
- improved visual language for existing elite variants;
- Flow tiers;
- Flow-driven music layer;
- visible Threat indicator;
- post-stage highlight summary if small enough.

### Acceptance criteria

- player can tell why a stage feels different without opening debug UI;
- existing elite variants are visually distinguishable at gameplay scale;
- Flow change is visible and audible;
- Threat is informative, not distracting;
- no new major gameplay logic required.

---

## PHASE 1B — GAMEPLAY VARIETY VERTICAL SLICE

### Scope

- 2 Sector Conditions first;
- 2 new Elite Affixes first;
- 3 Typing Patterns first;
- Encounter Recipe framework;
- 3 initial recipes.

Suggested first slice:

```text
Conditions:
- Solar Storm
- Meteor Shower

Affixes:
- Chrono
- Guardian

Typing:
- NORMAL_WORD
- SHORT_BURST
- LONG_WORD

Recipes:
- Swarm Assault
- Sniper Ambush
- Fortress Siege
```

### Acceptance criteria

- every feature can be forced in Test Lab;
- compatibility rules prevent invalid stacks;
- Variety Audit shows measurable improvement;
- performance remains inside budget;
- target readability passes manual review;
- no feature requires duplicated target/state systems.

---

## PHASE 1C — VARIETY EXPANSION

### Scope

- Gravity Well;
- Time Fracture;
- Berserker;
- Phase;
- Anchored;
- PHRASE / SHARED_TARGET / CHAIN;
- remaining initial Encounter Recipes;
- anti-repeat scheduler tuning.

### Acceptance criteria

- no 4-stage typing-pattern monotony under normal seeded simulations;
- no immediate Sector Condition repetition unless curated;
- entity cap remains bounded;
- all affix visual language is distinct;
- learning text remains authentic.

---

## PHASE 2A — PLAYER CHOICE / BUILD VERTICAL SLICE

### Scope

- Choose 1 of 3;
- 12 core relic target;
- 4 build families;
- 3–4 initial cross-system synergies;
- discovery presentation.

### Acceptance criteria

- two runs with different choices feel mechanically different;
- no build requires impossible absolute WPM;
- no single relic dominates every family in balance simulation;
- synergy trigger has clear explanation/feedback;
- build choices are seedable in Expedition context.

---

## PHASE 2B — RAGE AWAKENING + PROJECTILE EVOLUTION

### Scope

- presentation upgrade for existing Rage;
- selected projectile-evolution milestones;
- dynamic climax audio hook;
- High/Ultra presentation differentiation.

### Acceptance criteria

- no second Rage/Awakening resource;
- target readability never drops below standard;
- Low tier receives all gameplay information;
- repeated activation leaks no resources;
- cleanup passes pause/stage transition/restart.

---

## PHASE 3 — BOSS 2.0 REFERENCE IMPLEMENTATION

### Scope

- one reference Tyrant;
- 2 targetable boss parts;
- interruptible ultimate;
- rage phase;
- selected Typing Pattern variation.

### Acceptance criteria

- boss parts reuse target/typing pipeline;
- boss parts cannot drop normal loot or count as unrelated objectives;
- skill use during phase transition cannot lock input;
- Test Lab can jump directly to each phase;
- cleanup is deterministic.

---

## PHASE 3.5 — MACRO PACING

### Scope

- pacing slots / arcs;
- recovery constraints;
- milestone override;
- integrate Encounter Recipe selection with pacing role;
- extend Variety Audit.

### Acceptance criteria

- simulation shows deliberate recovery and climax spacing;
- no sustained high-complexity wall unless curated;
- World transitions remain coherent;
- pacing is seed-reproducible.

---

## PHASE 4 — EXPEDITION + ROUTE EVENTS

### Scope

- ~20-stage Expedition;
- Daily Seed;
- scoring;
- Choose-1-of-3 run build;
- event route node;
- initial event chains;
- optional Nemesis v1.

### Acceptance criteria

- campaign state remains isolated;
- save/resume works;
- deterministic seed structure works;
- abandoning a run is safe;
- rewards reset correctly;
- repeated runs reuse production systems rather than copies.

---

## PHASE 5 — LEARNING PROGRESSION / META

### Scope

- Wanted Words;
- mastery;
- Vocabulary Codex;
- Mastery Constellation presentation;
- Lexicon Boss prototype;
- optional personal Ghost.

### Acceptance criteria

- weak words are reintroduced, not unfairly punished;
- mastery calculation is deterministic;
- old saves default safely;
- learning information remains correct;
- Lexicon Boss never creates unreadable typing load.

---

## PHASE 6 — CINEMATIC MILESTONES / DEEP SECRETS

### Prerequisite

Background performance issues equivalent to P3/P4 resolve