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
- avoid one universally dominant 