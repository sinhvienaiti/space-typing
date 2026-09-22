# Enemy System Master Plan

## 1. Purpose

This document is the source of truth for the next enemy visual, behavior, reward and boss expansion of Space Typing.

The goal is not to replace the existing combat systems. The goal is to give the current typing-combat foundation a strong visual identity and a richer enemy ecosystem.

The visual identity should become one of the strongest parts of the game.

Core direction:

```text
cute fantasy
+
glossy water-orb / rainbow blob creatures
+
wings
+
angel / devil / frost / prism / nature / shadow / cosmic families
+
clear typing targets
+
high-impact kill rewards
```

The design must remain readable as a typing game first.

---

# 2. Product goals

The enemy system must achieve all of these goals:

1. Make Space Typing recognizable from a screenshot.
2. Make enemies visually appealing enough that seeing new variants feels rewarding.
3. Let the player understand enemy danger or reward value quickly.
4. Give enemy kills satisfying gameplay consequences beyond score only.
5. Reuse modular art parts so many variants can be produced without drawing every enemy from zero.
6. Keep words, IPA/VI UI, projectiles and boss telegraphs readable.
7. Reuse current combat, status, loot, event and boss systems instead of creating parallel systems.
8. Scale cleanly across the 1000-stage Campaign.

---

# 3. Core art direction

## 3.1 Main mascot body

The default enemy body is a glossy floating orb that feels like:

- a water balloon;
- a soft slime;
- a magical bubble;
- a translucent energy creature.

The body should be:

- round or slightly squashed;
- glossy;
- soft;
- colorful;
- simple in silhouette;
- large enough to display a typing word clearly;
- cute rather than realistic.

The most common base family uses a rainbow or iridescent gradient.

## 3.2 Signature feature: wings

Most core enemies should have a visible wing set.

Wing types:

- small feather wings;
- long feather wings;
- bat wings;
- fairy wings;
- crystal wings;
- leaf/petal wings;
- shadow wings;
- cosmic energy wings.

The wing animation should be light and readable:

```text
idle
-> gentle floating

wing loop
-> small flap
-> small vertical movement

movement
-> subtle trail
```

Do not use large wing motion that crosses the target word.

## 3.3 Cute-first rule

Even Devil, Shadow and late-game creatures should stay within the same game language.

Avoid:

- horror realism;
- gore;
- overly detailed monster anatomy;
- noisy textures;
- complex armor that hides the word.

Danger should come from shape, color, aura, horns, eyes and effects, not from graphic imagery.

---

# 4. Readability rules

Typing readability has higher priority than visual spectacle.

Mandatory rules:

1. Enemy word must remain the highest-contrast foreground element.
2. Body detail behind the word must stay simple.
3. Wings must not cover the text area.
4. Aura must stay outside the main word zone.
5. Reward markers must be small and placed above/beside the enemy.
6. Spawn effects must end quickly.
7. Death effects may be stronger but must not hide another active target.
8. Boss effects must never hide the boss word, HP bar or dangerous projectile word.
9. Rare reward enemies must be distinguishable in less than one second.
10. The player must be able to identify Normal / Reward / Elite / Boss silhouettes without reading labels.

---

# 5. Modular enemy art system

Do not produce every enemy as one completely unique full sprite.

Use a modular composition model.

## 5.1 Visual layers

Each enemy may be assembled from:

```text
body
face
wings
head accessory
side accessory
aura
orbit layer
reward marker
spawn FX
hit FX
death FX
```

## 5.2 Body modules

Initial body set:

- rainbow-water-orb;
- holy-orb;
- infernal-orb;
- frost-orb;
- prism-crystal-orb;
- nature-puff;
- shadow-wisp;
- cosmic-core.

## 5.3 Wing modules

Initial wing set:

- feather-small;
- feather-large;
- bat-small;
- bat-large;
- fairy;
- crystal;
- petal;
- shadow;
- cosmic.

## 5.4 Head/accessory modules

Initial accessory set:

- single halo;
- double halo;
- triple halo;
- small horns;
- large horns;
- demon crown;
- holy crown;
- ice crown;
- prism ring;
- leaf crown;
- star ring;
- void eye ring;
- orbital rings.

## 5.5 Aura modules

Initial aura set:

- rainbow sparkle;
- holy glow;
- infernal flame;
- frost mist;
- prism sparkle;
- nature pollen;
- shadow smoke;
- cosmic stars;
- lightning crackle.

---

# 6. Gameplay architecture

An enemy definition should not mix every concern into one monolithic class.

Use four composition layers:

```text
Combat Role
+
Visual Family
+
Affinity
+
Reward/Death Effect
```

Example:

```text
Angel Healer
=
Support role
+
Angel family
+
Holy affinity
+
Heal Burst reward
```

Example:

```text
Freeze Burst Sprite
=
Reward role
+
Frost family
+
Frost affinity
+
Freeze Nearby reward
```

This allows one visual family to support several gameplay roles without duplicating combat code.

---

# 7. Combat roles

The initial role system should support these roles.

## 7.1 Normal

Purpose:
basic target.

Properties:

- standard speed;
- standard durability;
- no large special effect.

## 7.2 Swift

Purpose:
reaction-pressure target.

Properties:

- smaller body;
- faster movement;
- usually lower durability;
- narrow wings / faster wing animation.

## 7.3 Tank

Purpose:
longer typing commitment.

Properties:

- larger body;
- more layers or durability;
- slower movement;
- thicker glow or shell.

## 7.4 Support

Purpose:
changes battlefield priority.

Possible behavior:

- buffs nearby enemies;
- protects another enemy;
- periodically heals or reinforces enemies;
- may become a high-priority typing target.

## 7.5 Burst

Purpose:
creates an on-death battlefield effect.

Examples:

- explosion;
- chain lightning;
- projectile clear;
- nearby damage.

## 7.6 Control

Purpose:
creates crowd-control benefit when defeated.

Examples:

- freeze nearby enemies;
- slow enemies;
- slow projectiles;
- temporary chill field.

## 7.7 Reward

Purpose:
rare high-value target.

Examples:

- x2 Score;
- x2 Credits;
- Luck boost;
- Supply spawn;
- skill charge.

## 7.8 Elite

Purpose:
higher-pressure version of a normal family.

Properties:

- stronger aura;
- larger scale;
- one extra mechanic or modifier;
- better reward.

## 7.9 Mini Boss

Purpose:
stage checkpoint.

Properties:

- unique silhouette;
- HP / multi-word combat;
- larger reward;
- stronger death effect.

## 7.10 Boss

Purpose:
major stage identity.

Properties:

- unique composition;
- boss HP;
- phase transitions;
- unique reward package;
- intro and death sequence.

---

# 8. Enemy visual families

## 8.1 Rainbow Blob

### Identity

The main mascot family of Space Typing.

### Visual

- glossy water-like body;
- rainbow/iridescent gradient;
- round cute eyes;
- small pastel wings;
- rainbow sparkle trail.

### Gameplay theme

- basic enemies;
- balanced variants;
- Score / Credits / Luck rewards.

### Initial variants

#### Rainbow Scout
Role: Normal

Reward:
normal score/credit reward.

#### Rainbow Dart
Role: Swift

Visual:
smaller body, longer wings, faster flap.

#### Rainbow Bubble
Role: Tank

Visual:
large bubble body, thick translucent shell.

#### Lucky Rainbow
Role: Reward

Visual:
star particles and brighter rainbow ring.

Reward:
Luck or Score burst.

---

## 8.2 Angel Blob

### Visual

- white/gold/cyan/pastel body;
- feather wings;
- halo;
- holy particles.

### Gameplay theme

- recovery;
- protection;
- positive buffs.

### Initial variants

#### Angel Healer
Role: Support / Reward

Kill effect:
Heal Burst.

#### Angel Guard
Role: Support / Reward

Kill effect:
Shield Gain.

#### Angel Blesser
Role: Reward

Kill effect:
temporary offensive or support Blessing.

#### Seraph Elite
Role: Elite

Visual:
large wings and double halo.

#### Archangel Core
Role: Boss

Visual:
multiple halos, 4 wings, strong holy core.

---

## 8.3 Devil Blob

### Visual

- red/purple/magenta body;
- horns;
- bat wings;
- tail;
- dark flame or ember trail.

### Gameplay theme

- offense;
- explosion;
- high-risk/high-reward.

### Initial variants

#### Imp Spark
Role: Normal

#### Rage Imp
Role: Swift

#### Bomb Imp
Role: Burst

Kill effect:
Explosion Burst.

#### Berserk Devil
Role: Elite

Kill effect:
temporary Damage or Fire Rate increase.

#### Demon Lord Orb
Role: Boss

Visual:
large horns, demon crown, dark-fire aura.

---

## 8.4 Frost Sprite

### Visual

- blue/cyan/white translucent body;
- crystal or fairy wings;
- frost mist;
- ice particles.

### Gameplay theme

- freeze;
- slow;
- projectile control.

### Initial variants

#### Snow Wisp
Role: Normal

#### Ice Sprite
Role: Control

#### Freeze Burst Sprite
Role: Reward / Burst

Kill effect:
Freeze Nearby.

#### Frost Keeper
Role: Elite

#### Glacier Queen
Role: Boss

Visual:
ice crown, crystal wings, snow halo.

---

## 8.5 Prism Orb

### Visual

- sharp iridescent color;
- crystal facets;
- rotating rune/prism ring;
- star trail.

### Gameplay theme

- score;
- Credits;
- Luck;
- loot.

### Initial variants

#### Prism Sprite
Role: Normal/Rare

#### Treasure Prism
Role: Reward

Kill effect:
Credits / Score reward.

#### Fortune Prism
Role: Elite

Kill effect:
Luck / loot-quality boost.

#### Prism Archon
Role: Boss

Kill effect:
large economy/reward burst.

---

## 8.6 Nature Puff

### Visual

- green/yellow/pink;
- soft cloud/orb body;
- leaf or flower-petal wings;
- pollen/leaf particles.

### Gameplay theme

- sustain;
- regeneration;
- resource recovery.

### Initial variants

#### Leaf Puff
Role: Normal

#### Bloom Puff
Role: Reward

Kill effect:
small regeneration.

#### Guardian Bloom
Role: Elite

#### Forest Halo
Role: Mini Boss / Boss

---

## 8.7 Shadow Wisp

### Visual

- dark violet/navy body;
- bright eyes;
- smoke edge;
- shadow wings.

### Gameplay theme

- risk/reward;
- cooldown;
- debuff interaction;
- hidden/rare encounters.

### Initial variants

#### Shade Wisp
Role: Normal/Rare

#### Night Wisp
Role: Control

#### Umbra Elite
Role: Elite

#### Void Eye
Role: Boss

---

## 8.8 Cosmic Core

### Visual

- star-field body;
- glowing core;
- orbital rings;
- cosmic wings;
- nebula particles.

### Gameplay theme

- late-game power;
- screen-wide effects;
- rare loot;
- major skill charge.

### Initial variants

#### Star Core
Role: Reward

#### Nova Core
Role: Burst

#### Nebula Elite
Role: Elite

#### Cosmic Emperor
Role: Boss

---

# 9. V1 enemy roster

The first art-production roster should target about 26 designs.

## Common / core

1. Rainbow Scout
2. Rainbow Dart
3. Rainbow Bubble
4. Imp Spark
5. Snow Wisp
6. Leaf Puff

## Reward / special

7. Lucky Rainbow
8. Angel Healer
9. Angel Guard
10. Angel Blesser
11. Bomb Imp
12. Freeze Burst Sprite
13. Treasure Prism
14. Star Core

## Elite

15. Seraph Elite
16. Berserk Devil
17. Frost Keeper
18. Fortune Prism

## Mini Boss

19. Halo Seraph
20. Crown Demon
21. Glacier Oracle
22. Prism Sentinel

## Boss

23. Archangel Core
24. Demon Lord Orb
25. Glacier Queen
26. Prism Archon

Later expansion:

- Void Eye;
- Cosmic Emperor;
- additional Shadow/Cosmic variants.

---

# 10. Reward and death-effect system

Enemy death effects should reuse the existing status, buff, inventory, score, Credits, loot, Power and skill systems where possible.

Do not create a second generic buff engine.

## 10.1 Reward categories

### Sustain

- Heal Burst;
- Shield Gain;
- temporary regeneration;
- Cleanse.

### Offensive

- Damage Up;
- Fire Rate Up;
- Chain Shot;
- Power gain;
- projectile amplification.

### Control

- Freeze Nearby;
- Slow Nearby;
- projectile slow;
- EMP-like silence;
- knockback/pulse if compatible with stationary combat.

### Burst

- Explosion;
- Chain Lightning;
- damage all normal enemies;
- clear normal enemies;
- clear enemy projectiles.

### Economy

- Score x2;
- Credits x2;
- Luck Up;
- temporary loot chance;
- Supply chance.

### Skill/resource

- Energy restore;
- skill cooldown recovery;
- Power/Overdrive charge;
- support-spell charge;
- item spawn.

---

# 11. Reward effect catalog

Initial catalog:

| ID | Effect | Default duration/power | Intended family |
|---|---|---:|---|
| heal-burst | Restore Hull | instant | Angel/Nature |
| shield-burst | Restore Shield | instant | Angel |
| damage-up | Firepower multiplier | 6-10 sec | Devil |
| fire-rate-up | attack cadence benefit | 6-10 sec | Devil |
| freeze-nearby | freeze nearby normal enemies | 2-4 sec | Frost |
| slow-nearby | slow enemy movement/projectiles | 4-8 sec | Frost |
| explosion-burst | AoE enemy damage | instant | Devil/Cosmic |
| chain-lightning | chained enemy damage | instant | Storm/Cosmic |
| clear-normal | destroy normal enemies | instant, rare | Cosmic |
| clear-projectiles | clear hostile projectiles | instant | Angel/Cosmic |
| score-x2 | score multiplier | 8-15 sec | Prism |
| credits-x2 | Credits multiplier | 8-15 sec | Prism |
| luck-up | Luck bonus | 10-20 sec | Rainbow/Prism |
| cooldown-charge | reduce skill cooldowns | instant | Shadow |
| energy-burst | restore Energy | instant | Nature/Cosmic |
| overdrive-charge | add Power | instant | Cosmic |

Exact values must be tuned after implementation.

---

# 12. Family-to-reward identity

| Family | Main rewards |
|---|---|
| Rainbow | Score, Credits, Luck |
| Angel | Heal, Shield, Cleanse, Bless |
| Devil | Damage, Fire Rate, Explosion |
| Frost | Freeze, Slow, projectile control |
| Prism | Score x2, Credits x2, Luck, loot |
| Nature | Regen, Energy, sustain |
| Shadow | cooldown, risk/reward utility |
| Cosmic | screen-wide burst, Power, rare loot |

The mapping is a theme guideline, not a hard rule.

---

# 13. Reward target readability

A reward enemy should communicate its reward before it dies.

Use a small marker:

- heart -> Heal;
- shield -> Shield;
- flame/sword -> Damage;
- lightning -> Fire Rate / Skill;
- snowflake -> Freeze;
- clock -> Slow / cooldown;
- star x2 -> Score;
- coin x2 -> Credits;
- four-leaf/rainbow star -> Luck;
- energy bolt -> Energy/Power.

Rules:

- marker cannot overlap the typing word;
- marker is always optional support information;
- color alone must not be the only identifier.

---

# 14. Boss visual system

Bosses must look like evolved members of the same world, not unrelated artwork.

## 14.1 Boss layers

A boss composition may contain:

```text
large core body
large wing set
crown / horns / halo
orbit objects
phase aura
boss word zone
boss HP UI
telegraph FX
death FX
```

## 14.2 Mini Boss rule

Mini Boss:

- about 1.4x-1.8x normal visual scale;
- one strong accessory;
- one strong aura;
- multi-word or increased durability;
- medium death reward.

## 14.3 Boss rule

Boss:

- about 2x-3x normal visual scale;
- unique silhouette;
- multiple visual layers;
- phase-specific aura;
- intro;
- major death sequence;
- clear reward moment.

---

# 15. Initial boss concepts

## 15.1 Archangel Core

Visual:

- pearl-white / gold / cyan core;
- four feather wings;
- three rotating halos;
- holy particles.

Gameplay theme:

- shield;
- light projectiles;
- support adds;
- defensive phases.

Death reward direction:

- heal;
- shield;
- Blessing.

## 15.2 Demon Lord Orb

Visual:

- red/purple glossy core;
- large horns;
- demon crown;
- bat wings;
- dark flame.

Gameplay theme:

- aggressive projectile patterns;
- rage phase;
- damage pressure.

Death reward direction:

- Damage Up;
- explosion;
- offensive loot.

## 15.3 Glacier Queen

Visual:

- translucent cyan core;
- crystal crown;
- large crystal wings;
- snow halo.

Gameplay theme:

- slow;
- freeze;
- projectile-control phase.

Death reward direction:

- Freeze All;
- Slow field;
- Frost reward.

## 15.4 Prism Archon

Visual:

- iridescent crystal core;
- several rotating prism shards;
- rune rings;
- rainbow refraction.

Gameplay theme:

- reward/risk mechanics;
- pattern changes;
- rare target summons.

Death reward direction:

- Score x2;
- Credits x2;
- Luck;
- high-quality drop.

## 15.5 Later bosses

Void Eye:

- Shadow family;
- cooldown/debuff identity.

Cosmic Emperor:

- Cosmic family;
- orbital rings;
- major late-game screen-wide reward.

---

# 16. Spawn progression

Do not expose every family immediately.

## Early Campaign

Primary:

- Rainbow;
- Nature;
- light Angel;
- light Frost.

Goals:

- teach silhouettes;
- teach reward markers;
- keep screen clean.

## Mid Campaign

Add:

- Devil;
- Prism;
- more Elite variants;
- stronger reward enemies;
- mixed family waves.

## Late Campaign

Add:

- Shadow;
- Cosmic;
- stronger family combinations;
- rare transformations;
- complex Boss variants.

---

# 17. Rarity and visual escalation

Visual escalation should follow rarity.

## Normal

- simple body;
- one wing set;
- light aura.

## Rare/Reward

- brighter aura;
- marker;
- more particles;
- small orbit effect.

## Elite

- 15%-25% larger;
- stronger outline;
- extra accessory;
- stronger aura;
- one gameplay modifier.

## Mini Boss

- major accessory;
- unique wing silhouette;
- layered aura.

## Boss

- unique composition;
- multiple orbit layers;
- phase visuals;
- custom death sequence.

---

# 18. Enemy data model

Recommended data contracts:

```ts
type EnemyFamilyId =
  | "rainbow"
  | "angel"
  | "devil"
  | "frost"
  | "prism"
  | "nature"
  | "shadow"
  | "cosmic";

type EnemyRoleId =
  | "normal"
  | "swift"
  | "tank"
  | "support"
  | "burst"
  | "control"
  | "reward"
  | "elite"
  | "mini-boss"
  | "boss";

type EnemyRewardId =
  | "heal-burst"
  | "shield-burst"
  | "damage-up"
  | "fire-rate-up"
  | "freeze-nearby"
  | "slow-nearby"
  | "explosion-burst"
  | "chain-lightning"
  | "clear-normal"
  | "clear-projectiles"
  | "score-x2"
  | "credits-x2"
  | "luck-up"
  | "cooldown-charge"
  | "energy-burst"
  | "overdrive-charge";

type EnemyVisualProfile = {
  body: string;
  face: string;
  wings: string;
  head?: string;
  side?: string;
  aura?: string;
  orbit?: string;
  rewardMarker?: string;
  spawnFx: string;
  hitFx: string;
  deathFx: string;
};

type EnemyDefinition = {
  id: string;
  name: string;
  family: EnemyFamilyId;
  role: EnemyRoleId;
  rarity: "common" | "uncommon" | "rare" | "elite" | "boss";
  minStage: number;
  spawnWeight: number;
  durabilityScale: number;
  speedScale: number;
  reward?: EnemyRewardId;
  rewardPower?: number;
  visual: EnemyVisualProfile;
};
```

Keep runtime combat state separate from static definitions.

---

# 19. Recommended code structure

Do not place the whole system in `Game.ts`.

Recommended modules:

```text
src/enemies/
  registry.ts
  families.ts
  roles.ts
  rewards.ts
  visuals.ts
  reward-effects.ts
  spawn-profile.ts

src/boss/
  ...
  visual-profile.ts

src/vfx/
  enemy-fx.ts
  reward-fx.ts

public/assets/space-typing/enemies/
  bodies/
  wings/
  accessories/
  auras/
  bosses/
  reward-icons/
```

The existing enemy/model classes may consume registry definitions gradually.

Do not rewrite all existing enemy classes in one pass.

---

# 20. Asset pipeline

The current procedural Canvas renderer must remain a fallback.

Every generated or third-party asset must follow `docs/ASSET_SOURCES.md`.

Asset metadata must record:

- asset ID;
- category;
- source;
- creator;
- license;
- attribution requirement;
- local runtime path.

Generated art should also be recorded as generated/original project art.

Loading failure must keep gameplay functional.

---

# 21. Art production workflow

Art is a gating concern for this feature.

Do not implement 26 gameplay variants before visual direction is approved.

## Phase A - Visual lock

Create concept sheets for:

1. Rainbow family;
2. Angel family;
3. Devil family;
4. Frost family.

Each concept sheet should show:

- front/gameplay view;
- idle silhouette;
- wing shape;
- word-safe zone;
- normal variant;
- reward variant;
- elite variant;
- boss evolution.

Decision gate:

- choose one final art language;
- confirm body proportions;
- confirm wing proportions;
- confirm text placement;
- confirm glow amount.

## Phase B - Expansion concepts

After the first four are accepted:

- Prism;
- Nature;
- Shadow;
- Cosmic.

## Phase C - Production asset set

Produce:

- body modules;
- wing modules;
- accessories;
- reward markers;
- auras;
- spawn FX;
- death FX.

## Phase D - Boss sheets

Produce separate boss sheets for:

- Archangel Core;
- Demon Lord Orb;
- Glacier Queen;
- Prism Archon.

---

# 22. Image-generation prompt baseline

Use one common style language for generated concepts.

Base prompt:

```text
cute fantasy typing-shooter enemy concept,
glossy magical water-orb creature,
soft rounded silhouette,
small animated wings,
clean central body area reserved for a readable word,
arcade-friendly proportions,
bright magical particles,
charming expression,
consistent game asset style,
clear silhouette,
no background clutter
```

Angel extension:

```text
pastel white, gold and cyan,
feathered wings,
glowing halo,
holy particles,
soft celestial light
```

Devil extension:

```text
red and purple glossy body,
small horns,
bat wings,
dark flame aura,
playful dangerous expression
```

Frost extension:

```text
blue-white translucent body,
crystal wings,
frost mist,
ice particles
```

Prism extension:

```text
iridescent crystal surface,
rotating prism ring,
rainbow refraction,
sparkling star trail
```

Boss extension:

```text
large evolved version of the same family,
multiple wing layers,
large halo/crown/orbit elements,
strong readable boss silhouette,
central safe area for typing text,
high-impact but uncluttered visual design
```

---

# 23. Animation plan

Keep animations lightweight.

## Normal enemy

- float;
- wing flap;
- small squash/stretch;
- hit flash;
- death pop.

## Reward enemy

Additionally:

- marker pulse;
- rare sparkle loop;
- stronger death burst.

## Elite

Additionally:

- aura pulse;
- accessory/orbit movement.

## Boss

Additionally:

- intro;
- breathing/core pulse;
- wing cycle;
- orbit cycle;
- phase transition;
- stagger;
- death sequence.

Avoid skeletal animation unless the art direction later requires it.

Sprite sheets, layered images or Canvas transformations should be preferred for simple orb creatures.

---

# 24. Kill feedback

A kill should communicate three things:

```text
enemy died
+
reward activated
+
battlefield changed
```

Example:

```text
Freeze Burst Sprite dies
-> body cracks into blue particles
-> frost ring expands
-> nearby enemies tint blue
-> "FREEZE" feedback appears briefly
-> frozen timers become visible through their animation
```

Example:

```text
Angel Healer dies
-> gold-white burst
-> green/holy energy travels to player
-> Hull UI pulses
-> small "+Hull" feedback
```

Example:

```text
Treasure Prism dies
-> prism shards scatter
-> x2 Score icon appears in buff HUD
-> score multiplier UI pulses
```

---

# 25. Reward balance rules

High-impact effects must be rare.

Suggested tiers:

## Minor

- small Heal;
- small Shield;
- Energy;
- short minor buff.

## Major

- Freeze Nearby;
- Damage Up;
- Score x2;
- Credits x2;
- large Shield.

## Epic

- Clear Normal Enemies;
- major screen freeze;
- large cooldown recharge;
- major loot burst.

Epic effects should normally come from:

- rare reward enemies;
- Elite;
- Mini Boss;
- Boss;
- hidden/event content.

Do not let common spawns trivialize stage difficulty.

---

# 26. Integration with existing systems

Reuse these existing systems.

## Status engine

Use for:

- Damage Up if represented as status;
- slow/freeze;
- temporary defensive effects;
- timed buffs/debuffs.

## Credits / score

Use existing counters and caps.

## Luck / pity

Reward enemies may temporarily affect Luck, but must not overwrite persistent pity state.

## Supply / rare events

Reward enemies should complement Supply Pods and rare crates rather than replace them.

## Skills

Cooldown/Power/Energy rewards must go through existing skill/resource APIs.

## Equipment

Enemy effects must not directly mutate permanent equipment definitions.

## Boss system

Boss visuals/phases extend existing boss mechanics.

---

# 27. Implementation roadmap

The feature should be implemented in controlled steps.

## Step E01 - Enemy visual/reward data contracts

Implement:

- family IDs;
- role IDs;
- reward IDs;
- visual profiles;
- registry definitions;
- validation tests.

No gameplay behavior changes yet.

## Step E02 - Reward effect engine

Implement a single dispatcher that maps enemy reward IDs into existing systems.

Cover:

- Heal;
- Shield;
- Damage Up;
- Freeze;
- Slow;
- Explosion;
- Score x2;
- Credits x2;
- Luck;
- Energy/Power/cooldown.

Add deterministic tests.

## Step E03 - Modular renderer

Add support for:

- body layer;
- wing layer;
- head/accessory layer;
- aura layer;
- reward marker.

Keep procedural fallback.

## Step E04 - Core four families

Implement visual/gameplay definitions for:

- Rainbow;
- Angel;
- Devil;
- Frost.

Do not add all families at once.

## Step E05 - Reward enemies

Add:

- Lucky Rainbow;
- Angel Healer;
- Angel Guard;
- Angel Blesser;
- Bomb Imp;
- Freeze Burst Sprite.

Verify reward clarity and balance.

## Step E06 - Elite variants

Add:

- Seraph Elite;
- Berserk Devil;
- Frost Keeper;
- Fortune Prism.

Reuse existing Elite modifier system where possible.

## Step E07 - Prism/Nature families

Add their normal and reward variants.

## Step E08 - First boss art conversion

Convert:

- Archangel Core;
- Demon Lord Orb.

Use existing boss HP/typing/phases.

Do not build a parallel boss framework.

## Step E09 - Remaining V1 bosses

Add:

- Glacier Queen;
- Prism Archon.

## Step E10 - Shadow/Cosmic expansion

Only after core V1 is visually stable.

## Step E11 - VFX/audio polish

Tune:

- spawn;
- hit;
- death;
- reward activation;
- boss intro;
- boss phase;
- boss death.

## Step E12 - Balance simulations

Measure:

- reward frequency;
- effective buff uptime;
- clear-screen frequency;
- Score/Credits multiplier uptime;
- control uptime;
- high-value reward contribution.

## Step E13 - Manual visual/playtest pass

Test:

- text readability;
- visual clutter;
- target priority;
- reward recognition;
- boss readability;
- performance.

## Step E14 - Review Pass #1

Review the whole enemy system and fix issues.

## Step E15 - Review Pass #2

Independent second review.

Only then mark the enemy-system milestone complete.

---

# 28. Recommended V1 implementation order

Do not begin with all 26 designs.

First playable art slice:

```text
Rainbow Scout
Rainbow Dart
Rainbow Bubble
Angel Healer
Bomb Imp
Freeze Burst Sprite
Seraph Elite
Berserk Devil
Archangel Core
Demon Lord Orb
```

This 10-enemy slice is enough to validate:

- core style;
- wing animation;
- reward marker;
- positive reward;
- offensive reward;
- control reward;
- Elite readability;
- Boss readability.

After this slice is approved, expand to the full V1 roster.

---

# 29. Definition of done for each enemy

An enemy is not complete just because it has an image.

Each enemy must have:

- registry definition;
- family;
- role;
- visual profile;
- target word readability check;
- spawn behavior;
- reward/death effect if applicable;
- hit feedback;
- death feedback;
- test coverage for special logic;
- asset source entry;
- performance check.

---

# 30. Definition of done for the enemy-system milestone

The milestone is complete only when:

1. Core visual language is approved.
2. V1 roster is implemented.
3. Reward effects reuse current systems safely.
4. Bosses use the same visual language.
5. Typing text remains readable.
6. Asset loading has procedural fallback.
7. Reward frequency has automated tests/simulations.
8. Child Test/Build CI passes.
9. Parent integration CI passes after final child pin.
10. Review Pass #1 is clean.
11. Review Pass #2 is clean.
12. Manual visual/browser playtest has no blocking readability issue.

---

# 31. Important implementation constraints

Do not:

- rewrite the entire current enemy system before the art slice is proven;
- add a second status engine;
- add a second loot system;
- add a second boss framework;
- make enemy art more important than typing readability;
- create large 4K assets for tiny on-screen targets;
- require all art assets for the game to boot;
- give common reward enemies screen-clear effects too frequently;
- make color the only way to identify enemy effects;
- let visual effects cover words.

Do:

- implement incrementally;
- keep data-driven definitions;
- use the current combat/status/loot/boss systems;
- keep procedural fallback;
- add tests before expanding the roster;
- review art and gameplay together.

---

# 32. Final direction

The target enemy identity for Space Typing is:

```text
cute magical flying orb creatures
with a strong rainbow-water-ball mascot style,
expanded through angel, devil, frost, prism,
nature, shadow and cosmic families.

Enemies are visually attractive collectibles/opponents,
but every visual decision supports typing readability.

Some enemies are worth prioritizing because defeating them
changes the battlefield through Heal, Shield, Freeze, Slow,
Explosion, x2 Score, x2 Credits, Luck, Energy, Power or
other bounded temporary effects.

Bosses are evolved forms of the same world,
not unrelated giant monsters.
```

This direction should become the visual foundation for the next major Space Typing milestone.
