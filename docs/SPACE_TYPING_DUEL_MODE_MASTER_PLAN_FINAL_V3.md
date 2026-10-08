# SPACE TYPING — DUEL MODE MASTER PLAN — FINAL V3

**Status:** FINAL V3 — implementation specification; architecture review findings incorporated  
**Project:** `sinhvienaiti/space-typing`  
**Source of truth branch:** `feat/bgv-integration-current`  
**Verified branch head during self-review:** `66ee6a0896450ffc56bc0b6216e756c45cf5aafc`  
**Primary goal:** add a complete 1v1 typing-combat mode with Human vs Human and Human vs Bot, room setup, map-specific hazards, strategic word drafting, escalating battlefield intensity, controlled luck, mystery events, and cinematic late-game comeback potential.

---


## FINAL V3 DECISION REGISTRY — OVERRIDES OLDER CONFLICTING TEXT

If any later example, recommendation, timing, percentage, or implementation note conflicts with this registry, **this section wins**.

### D-FINAL-01 — Full approved scope, implemented by dependency

Duel is a full production mode, not a disposable prototype.

The implementation order exists to control dependency and rework:

```text
contracts
→ deterministic DuelEngine
→ actions + Human-vs-Bot
→ strategy systems
→ maps/director/Fate/Mystery
→ rooms + authoritative online service
→ matchmaking/ranked
→ final presentation/polish
```

Do not stop after Bot, one map, or only Attack/Defense/Support and call Duel complete.

### D-FINAL-02 — Match is simultaneous, not turn-based

Both sides type continuously.

Typing speed creates natural action-rate advantage, but **WPM is not multiplied into damage again**.

### D-FINAL-03 — Regular Duel input grammar

Regular combat/action words use one deterministic parser:

```text
displayLabel: human-readable fantasy label
answerToken: normalized a-z typing token
```

Examples:

```text
displayLabel = "BLACK HOLE"
answerToken  = "blackhole"

displayLabel = "LOCK-ON"
answerToken  = "lockon"
```

Rules:

- regular Duel action tokens are `a-z`;
- Space keeps its existing combat binding unless a future approved control remap changes it;
- wrong key does not advance the token;
- wrong key counts as a typing mistake for Duel accuracy;
- regular action typing does not require Backspace correction;
- paste/autofill does not count as legitimate competitive typing;
- IME/composition/repeat/modifier behavior must have deterministic tests;
- an acquired target never silently changes its answer while locked.

Sentence/grammar/question-answer interfaces, if approved as a separate feature later, require a separate input owner and are **not** routed through this regular action parser.

### D-FINAL-04 — Target ownership

Visible selectable targets must be prefix-safe where practical.

Target lifecycle:

```text
offer
→ available
→ prefix acquisition
→ locked
→ completed | expired | destroyed | cancelled
```

Once locked:

- input stays on that target;
- renderer clearly marks ownership;
- hazard destruction releases the lock;
- hazard-forced loss is not a miss/streak reset;
- voluntary cancel does not receive hazard compensation.

If vocabulary cannot provide a prefix-safe set, use deterministic slot selection/fallback instead of indefinite rerolls.

### D-FINAL-05 — ActionDefinition is the gameplay contract

Every Duel word action must resolve from one versioned definition.

Minimum conceptual fields:

```ts
type DuelActionDefinition = {
  id: string;
  category:
    | "attack"
    | "defense"
    | "support"
    | "tactical"
    | "fate"
    | "mystery";

  displayLabel: string;
  answerToken: string;
  typingCostBand: string;

  resolveMode: "instant" | "banked";
  targetPolicy: string;
  capacityPolicy: string;

  energyCost: number;
  cooldownSeconds: number;

  effectId: string;
  counterTags: string[];
  mapPresentationId?: string;
  contentVersion: string;
};
```

Word length / typing effort must not accidentally be rewarded twice through both base power and another hidden length multiplier.

### D-FINAL-06 — Offer/action economy

Default production model:

```text
5 private action offers per player
+ 1 shared/neutral objective lane when the Director schedules one
```

The five private slots refill from the current phase/map distribution.

Rules:

- completed instant action: resolves, then slot refills;
- completed banked action: enters the appropriate inventory if capacity exists;
- if inventory is full, UI must show the consequence before completion where possible;
- expiring offers use category-specific lifetimes;
- an offer already locked by the player does not expire underneath active typing unless an explicit hazard destroys it;
- refill RNG is authoritative and deterministic.

Default combat inventory budget:

```text
Weapon / Attack bank: 3 slots
Defense reserve:      2 slots
Tactical reserve:     2 slots
```

Exact individual action stack limits are defined per action.

### D-FINAL-07 — Strong attacks carry their own response opportunity

A major telegraphed attack must not rely on random Defense spawn luck.

For attacks requiring counterplay, the threat itself exposes a deterministic response channel, for example:

```text
incoming heavy missile
→ attached counter token / intercept prompt
```

or guarantees an equivalent defensive action window.

Therefore:

```text
"No counter because I spent my resources badly"
= valid outcome

"No counter because RNG refused to spawn any possible response"
= invalid standard-mode outcome
```

Counter windows must be sized using real typing cost and target skill band.

### D-FINAL-08 — Regulation scales by percentage

All 3/4/5-minute rooms use the same normalized pacing schedule:

```text
0–25%    BUILD / CALM
25–50%   SKIRMISH
50–80%   WAR / ESCALATION
80–100%  CRISIS
100%+    CATACLYSM / OVERTIME
```

The old minute examples are illustrative only.

Default hard overtime ceiling:

```text
45 seconds
```

At hard overtime expiry, use the ruleset's published terminal rule.

Standard recommended terminal behavior:

- Hull <= 0 resolves knockout;
- terminal state is checked after the full same-tick resolution batch;
- both Hull <= 0 in the same authoritative tick = drawn round;
- no slot/player-order tie break;
- Bo3/Bo5 series handles a drawn round explicitly and cannot extend forever.

### D-FINAL-09 — Competitive normalization

Ranked/competitive Duel does not import permanent PvE power.

Ranked uses:

- normalized base stats;
- normalized equipment/loadout budget;
- Duel-specific skill coefficients;
- round-local Duel pity;
- no permanent PvE Salvage/XP/equipment-stat scaling;
- no persisted PvE Luck/Pity advantage;
- roster/loadout availability rules explicitly defined for competitive play.

Friendly/Custom may optionally permit owned PvE loadouts, but that ruleset is clearly separated from normalized competitive results.

### D-FINAL-10 — Duel does not mint PvE economy by default

Default Duel results do **not** directly grant Campaign:

- kill Credits;
- PvE equipment drops;
- PvE pity changes;
- campaign progression side effects.

Cross-mode progression rewards require a separate explicit contract.

### D-FINAL-11 — Authoritative online command protocol

The client never sends authoritative claims such as:

```text
KEY_OK
WORD_COMPLETE
ANSWER_CORRECT
DAMAGE_APPLIED
```

as trusted facts.

Client sends intents, conceptually:

```text
TYPE_CHAR
CANCEL_TARGET
USE_ITEM
ACTIVATE_SKILL
SELECT_TARGET
```

with:

```text
matchId
roundId
sequence
targetInstanceId
minimal payload
```

Server/Duel authority derives:

- correct/miss;
- token completion;
- action resolution;
- resource spending;
- damage;
- terminal result.

Client prediction is presentation only.

### D-FINAL-12 — Determinism is more than one public seed

Authoritative simulation defines:

- fixed/update tick policy;
- stable event ordering;
- stable instance IDs;
- content/config version;
- accepted input log;
- deterministic resolution order;
- separated RNG domains.

Recommended RNG domains:

```text
word offers
hazards
Fate
Mystery
Bot behavior
cosmetic-only
```

Hidden authoritative outcomes stay server-private during live online play.

Do not expose a seed/state that lets clients derive future Mystery/Fate outcomes.

High/Ultra, sound settings, dropped render frames, or reduced-motion settings must not alter authoritative state.

### D-FINAL-13 — Friend Room needs a real service

Online room scope requires an authoritative service, not only `protocol.ts`.

Before public Friend Room launch:

- WSS;
- session-bound authentication;
- room authorization;
- Origin allowlist;
- schema/size/rate limits;
- heartbeat;
- room expiry/cleanup;
- version handshake;
- reconnect identity;
- filtered snapshot restore;
- stale/duplicate sequence rejection;
- defined server-restart behavior.

Do not add Redis/multi-region infrastructure unless measured operational requirements actually need it.

### D-FINAL-14 — Mystery/Fate are bounded

Mystery and Fate can create powerful reversals, terrain changes, hazard escalation and unusual opportunities.

They must not create standard competitive outcomes such as:

- random instant kill;
- unavoidable massive Hull deletion;
- long keyboard lock;
- hidden one-sided catastrophic punishment without a contest/symmetric rule.

Luck creates opportunity and volatility, not an automatic winner.

### D-FINAL-15 — Map identity changes gameplay

Every approved Duel map owns:

```text
visual identity
word affinity
hazard table
Mystery/Fate pool
map-control objective
escalation profile
Cataclysm event
audio/FX profile
```

Map reskins must not silently change typing difficulty for an equivalent action unless that difference is explicitly balanced in the action definition.

### D-FINAL-16 — Bot uses the same command path

Bot does not teleport to `WORD_COMPLETE`.

It simulates:

- reaction delay;
- per-character timing;
- mistakes;
- correction/recovery delay where applicable;
- target switching;
- decision delay;
- tactical preference.

Bot receives a player-equivalent observation projection and cannot inspect hidden Mystery outcomes, future RNG, or secret opponent inventory.

### D-FINAL-17 — Question Chest is NOT merged into Duel V3 yet

The separate implementation review contains a detailed language-question chest proposal.

It is **not part of this FINAL V3 Duel scope unless the project owner explicitly approves it as a separate feature**.

If approved later, integrate through:

```text
shared QuestionEngine
+ Combat adapter
+ Duel neutral/tactical adapter
```

Do not quietly fold it into Duel while implementing this specification.

---

# 0. PRODUCT VISION

Duel Mode must not become:

- a TypeRacer clone with spaceship skins;
- a pure WPM race;
- a turn-based mode where one player waits for the other;
- a random-chaos mode where luck decides the winner;
- a stat-check mode where whoever entered with better permanent gear always wins.

The intended experience is:

> Two ships fight in real time. Both players type simultaneously. Every word can represent an attack, defense, support action, tactical play, fate event, or mystery event. Early game is controlled and strategic. Mid game becomes aggressive and adaptive. Late game becomes chaotic, destructive, and capable of dramatic reversals.

The player should feel:

- “I am piloting a ship through typing.”
- “The words I choose matter, not only how fast I type.”
- “I can build a plan during the match.”
- “I can read and counter the opponent.”
- “The map itself is alive.”
- “Luck creates opportunities, not guaranteed wins.”
- “Even if I am behind, I can still make a high-risk comeback.”
- “Even if I am ahead, I still need to close the game correctly.”

---

## 0.1 SOURCE-OF-TRUTH / IMPLEMENTATION GUARDRAILS

Before coding, refresh the branch and re-read the latest project docs and current runtime contracts.

Important current architectural facts verified during self-review:

- the current project is PvE-first;
- there is no existing WebSocket / WebRTC / multiplayer runtime in the branch;
- current `Game.ts` is already large and should **not** become the multiplayer/session/network owner;
- current project already has reusable systems for characters/ships, projectiles, skills, equipment, status effects, visual quality, enemy projectile interception, Luck/Pity, World presentation and staged encounter pacing;
- authoritative Duel randomness still needs a match-seeded deterministic RNG.

Implementation rule:

```text
shared combat primitives
        ↑
PvE Game        DuelEngine
                   ↑
             Room / Bot / Network
```

Do not implement networking first. First prove:

```text
Human vs Bot
+
DuelEngine
+
word strategy
+
map escalation
```

then add online synchronization.

---

# 1. CORE MATCH FORMAT

## 1.1 Main mode

Default Duel is:

```text
REAL-TIME SIMULTANEOUS TYPING
```

Both players type at the same time.

Do not use strict alternating turns as the main mode.

Reasons:

- typing feels best when continuous;
- both players remain engaged;
- existing projectile / skill / shield / ship FX can be reused;
- simultaneous pressure creates meaningful attack/defense decisions;
- it supports map hazards, neutral objectives, counters and comeback play.

## 1.2 Recommended match length

Target:

```text
3–5 minutes
```

Recommended standard:

```text
4-minute regulation
+ Cataclysm / overtime if needed
```

Optional room settings:

```text
3 min
4 min
5 min
```

Round formats:

```text
Bo1
Bo3
Bo5
```

---

## 1.3 Victory, round reset and progression normalization

Default round victory:

```text
opponent Hull reaches 0
```

If regulation expires without a knockout, enter Cataclysm / hard overtime rather than deciding the standard match purely by current HP.

At the beginning of every round, reset temporary Duel state: Hull/Shield to the Duel profile, Energy, stored weapons, Tactical inventory, temporary buffs/debuffs, combo progress, Initiative, round-local Fate/Mystery pity and map-control ownership unless a custom ruleset explicitly persists it.

### Ranked fairness rule

Ranked should use a **normalized Duel combat profile**. Permanent PvE progression must not create a direct stat-check advantage.

Recommended:

```text
Ranked:
normalized base stats
normalized equipment budget
PvP-specific skill coefficients

Friendly / Custom:
host may allow owned PvE loadout
```

This distinction must be explicit in UI and protocol/save contracts.

---

# 2. MATCH ESCALATION CURVE

The match must have clear pacing phases.

Do not use one flat spawn table from start to finish.

Recommended phases:

```text
PHASE 1 — BUILD / CALM
0:00 → ~1:00

PHASE 2 — SKIRMISH
~1:00 → ~2:00

PHASE 3 — WAR / ESCALATION
~2:00 → ~3:15

PHASE 4 — CRISIS
~3:15 → ~4:15

PHASE 5 — CATACLYSM / OVERTIME
~4:15+
```

---

# 3. PHASE 1 — BUILD / CALM

## Goal

Let players:

- read the map;
- establish rhythm;
- collect resources;
- build defensive reserves;
- acquire weapons;
- bank Energy;
- choose a strategic direction.

The opening should not immediately overwhelm the player.

## 3.1 Early word distribution

Suggested starting bias:

```text
Attack      25%
Defense     34%
Support     34%
Tactical     5%
Fate         0%
Mystery      2%
```

This is a tuning baseline, not a hard final value.

## 3.2 Things players can build early

Players should be able to type words that grant:

- Hull repair;
- Shield;
- Armor;
- temporary resistance;
- Energy;
- ammo;
- weapon charges;
- bombs;
- drones;
- cooldown reduction;
- stored utility;
- combo ingredients.

Example battlefield:

```text
SHIELD        MISSILE        REPAIR

ENERGY        ARMOR          LASER
```

The player cannot take everything.

The first strategic layer begins immediately:

> “Do I prepare to survive, or do I arm early aggression?”

---

# 4. PHASE 2 — SKIRMISH

At around minute 1:

- Attack word ratio rises;
- first meaningful Tactical words appear;
- first Fate objective may appear;
- map hazards become visible;
- active skills begin to matter;
- players start spending what they banked.

Suggested distribution:

```text
Attack      35%
Defense     25%
Support     25%
Tactical    10%
Fate         3%
Mystery      2%
```

The battlefield should still be readable.

---

# 5. PHASE 3 — WAR / ESCALATION

This is where the match should become noticeably more intense.

Suggested distribution:

```text
Attack      42%
Defense     20%
Support     18%
Tactical    13%
Fate         4%
Mystery      3%
```

New behaviors:

- stronger weapons;
- combo recipes;
- strategic counters;
- neutral objectives;
- map-control opportunities;
- stronger environmental events;
- multi-projectile pressure;
- stored-resource power spikes.

---

# 6. PHASE 4 — CRISIS

Around minute 3+ the match should feel dangerous.

Suggested changes:

- Attack word quality rises;
- high-tier Tactical words rise;
- Defense remains available but less common;
- strong healing becomes less efficient;
- strong weapons become more frequent;
- destructive map hazards happen more often;
- Fate / Mystery words can meaningfully reshape the state.

Suggested distribution:

```text
Attack      47%
Defense     13%
Support     12%
Tactical    17%
Fate         6%
Mystery      5%
```

This creates natural anti-stall pressure.

---

# 7. PHASE 5 — CATACLYSM / OVERTIME

If no winner exists near the regulation end:

```text
CATACLYSM
```

Changes:

- healing effectiveness reduced;
- passive shield regeneration reduced or disabled;
- strong Attack / Fate / Mystery words appear more often;
- environmental hazard budget rises;
- map-specific ultimate event may trigger;
- BGM and background intensity rise;
- defensive turtling becomes harder.

Suggested Cataclysm spawn distribution:

```text
Attack      52%
Defense      8%
Support      8%
Tactical    18%
Fate         8%
Mystery      6%
```

These percentages describe **spawn opportunity**, not final damage contribution.

The game should end through pressure, not an arbitrary timer winner if possible.

---

# 8. WORD CATEGORY SYSTEM

The mode uses three regular categories and three special categories.

Regular:

```text
ATTACK
DEFENSE
SUPPORT
```

Special:

```text
TACTICAL
FATE
MYSTERY
```

---

# 8.1 TARGET ACQUISITION / WORD OWNERSHIP RULES

This is a critical typing-specific contract and must be resolved before content expansion.

1. A target is acquired by the first unambiguous typed prefix.
2. Once acquired, input remains locked to that target until completion, explicit cancel/switch, hazard invalidation or target removal.
3. The renderer must clearly show current target ownership.
4. Neutral objectives use a separate contest state so both players can type mirrored instances without client-side ambiguity.
5. The word spawner should prefer prefix-diverse candidates.
6. If two choices remain ambiguous for too long, re-roll one candidate instead of making the player guess.

Hazard-forced target loss:

```text
NO miss
NO streak reset
clear targeting lock
grant configured partial effort compensation
```

---

# 9. ATTACK WORDS

Purpose:

- damage Hull;
- break Shield;
- break Armor;
- launch projectiles;
- create burst pressure;
- force a response.

Examples:

```text
LASER
MISSILE
RAILGUN
PLASMA
BOMB
ANNIHILATION
SIEGE
EXECUTE
```

## 9.1 Attack subtypes

- Rapid — short, low damage, fast pressure.
- Heavy — longer word, larger projectile, high impact.
- Shield Break — high Shield pressure.
- Armor Break — reduces resistance.
- Burst — several projectiles.
- Delayed — bomb / mine / meteor / charge.
- Finisher — rare high-risk late-game attack.

---

# 10. DEFENSE WORDS

Purpose:

- survive;
- protect against spikes;
- counter committed aggression.

Examples:

```text
BARRIER
REPAIR
ARMOR
FORTIFY
MIRROR
AEGIS
LAST STAND
```

Defense subtypes:

- Shield;
- Hull Repair;
- Armor;
- Reflect;
- Phase;
- Emergency;
- Anti-burst.

---

# 11. SUPPORT WORDS

Purpose:

- generate long-term advantage;
- prepare combos;
- improve resource efficiency.

Examples:

```text
ENERGY
RELOAD
BOOST
OVERDRIVE
AMPLIFY
DRONE
COOLDOWN
LOCK-ON
```

Support can grant:

- Energy;
- ammo;
- weapon charge;
- attack amplification;
- cooldown reduction;
- repair drone;
- interceptor drone;
- resource conversion;
- combo components.

---

# 12. TACTICAL WORDS

This category must create decisions beyond “damage vs heal”.

Purpose:

- disrupt opponent plans;
- manipulate battlefield;
- alter timing;
- control map space;
- create counterplay.

Examples:

```text
DISRUPT
INTERFERENCE
CRYOSTASIS
DISTORTION
SINGULARITY
SCAN
EMP
MIRAGE
ANCHOR
```

## 12.1 Tactical safety rules

Avoid:

- keyboard disabled;
- black screen;
- reversed controls;
- forced long typing lock;
- unavoidable invisible damage.

Prefer:

- hide a few letters temporarily;
- freeze one target;
- move a target;
- slow projectile;
- create decoy;
- disable one stored weapon briefly;
- expose enemy banked resources;
- alter map control;
- change target priority.

---

# 13. FATE / POWER WORDS

Rare and dramatic, often contested.

Examples:

```text
SUPERNOVA
BLACK HOLE
PHOENIX
DIVINE SHIELD
STARFALL
DOOM CANNON
```

Properties:

- rare spawn;
- highly visible;
- often central;
- both players may race for them;
- strong effect;
- not guaranteed win.

---

# 14. MYSTERY / HIDDEN WORDS

Mystery is its own special category.

The player does not know exactly what will happen.

Possible visual forms:

```text
???
ANOMALY
UNKNOWN SIGNAL
HIDDEN CORERELIC
RIFT
```

Mystery can affect:

- the player;
- the opponent;
- both players;
- the map;
- environmental hazard intensity;
- word distribution;
- terrain / battlefield layout.

---

# 15. MYSTERY INFORMATION MODEL

Mystery must not be pure unfair randomness.

## 15.1 Visual risk hint

Example:

```text
blue mystery   → likely defensive/support
violet mystery → tactical/chaos
red-black      → dangerous/high-risk
white/prism    → rare/high-impact
```

Exact effect remains hidden.

## 15.2 Mystery rarity

```text
Minor Mystery
Chaotic Mystery
Cataclysm Mystery
```

## 15.3 Information tools

Examples:

```text
SCAN
→ reveal category

DEEP SCAN
→ reveal exact effect

ANALYZE
→ reveal risk level
```

Information becomes a strategic resource.

---

# 16. MYSTERY EFFECT POOLS

Beneficial:

- large Energy gain;
- rare weapon;
- emergency shield;
- repair burst;
- cooldown reset;
- extra combo token.

Harmful:

- shield overload;
- temporary Energy drain;
- target glitch;
- armor corrosion;
- unstable weapon.

Shared / Chaos:

- weather shift;
- gravity reversal;
- battlefield re-layout;
- word table reshuffle;
- hazard intensity spike;
- temporary map transformation.

Cataclysm:

- World Fracture;
- Storm Throne;
- Ancient Relic event;
- Cataclysm Seed;
- Reality Break.

---

## 16.1 Mystery safety envelope

Mystery should surprise the player without making standard competitive play arbitrary.

A neutral Mystery event should not:

- instantly kill a healthy player;
- remove an unbounded share of Hull;
- permanently delete all stored resources;
- create an unavoidable keyboard lock;
- choose only one player for a catastrophic penalty without a symmetric/contest rule.

For Ranked, use bounded effect budgets:

```text
Minor Mystery      low swing
Chaotic Mystery    medium swing
Cataclysm Mystery  large map swing, not direct guaranteed lethal
```

The strongest Mystery outcomes should usually reshape **opportunity and battlefield conditions**, not directly decide the winner. Chaos/Custom rooms may opt into a more extreme table.

---

# 17. STRATEGIC SYSTEMS

Duel Mode should support multiple strategic layers.

## 17.1 Combo / Recipe

Examples:

```text
ENERGY + MISSILE + LOCK-ON
→ HOMING BARRAGE

SHIELD + REFLECT
→ MIRROR BARRIER

GRAVITY + BOMB
→ GRAVITY BOMB

DRONE + REPAIR
→ REPAIR DRONE

AMPLIFY + RAILGUN
→ OVERCHARGED RAILGUN
```

Core decision:

> use now, or bank for a stronger recipe later?

## 17.2 Resource Banking

Resources can include:

- Energy;
- ammo;
- weapon charges;
- combo components;
- Defense charges;
- Tactical charges.

Banking creates power, but also exposes the player to pressure while preparing.

## 17.3 Counter / Response

Large attacks should telegraph.

Example:

```text
DOOM CANNON
Impact in 4.0s
```

Defender options:

```text
BARRIER
REFLECT
PHASE
EMP
COUNTERSHOT
```

One threat, multiple valid responses.

## 17.4 Neutral Objectives

Examples:

```text
ANCIENT CORE
FATE CRYSTAL
WEAPON CACHE
STORM NODE
RELIC BEACON
```

Both players can compete for them.

Rewards may be:

- resource;
- choice;
- map control;
- rare weapon;
- Fate roll.

## 17.5 Map Control

Each map can contain control objects.

Storm example:

```text
WEST TOWER
STORM CORE
EAST TOWER
```

Typing `OVERRIDE` may claim a node.

Possible effects:

- reduce hazard on your side;
- redirect lightning;
- alter projectile path;
- improve word opportunities;
- weaken map event.

Map-specific examples:

```text
Frost   → HEAT GENERATOR
Hell    → LAVA GATE
Ocean   → TIDAL ENGINE
Earth   → SEISMIC CORE
Cosmic  → GRAVITY NODE
```

## 17.6 Trap / Setup

Examples:

```text
MINEFIELD
MIRROR TRAP
STATIC SNARE
DECOY
COUNTER BATTERY
```

Opponent should receive a readable hint that a trap exists.

## 17.7 Information Strategy

Possible tools:

```text
SCAN
DEEP SCAN
SPY
REVEAL
SCRAMBLE
```

Can reveal:

- Mystery category;
- enemy stored weapon;
- enemy recipe progress;
- next hazard;
- neutral objective outcome range.

## 17.8 Sacrifice / Conversion

Examples:

```text
SACRIFICE
Hull → Energy

OVERLOAD
Shield → Attack multiplier

REACTOR DUMP
Energy → Shield

BERSERK
Armor ↓ / Attack ↑
```

High-risk comeback tool, not free power.

## 17.9 Initiative / Tempo

Possible gains:

```text
Perfect word
Successful counter
Neutral objective
Map control
Long combo
```

Initiative can grant light tempo advantages such as:

- projectile speed;
- Tactical positioning;
- better option placement.

Avoid huge raw damage bonus.

## 17.10 Adaptive Strategy Path

Player choices can form a temporary path.

Examples:

```text
MISSILE + OVERDRIVE + AMPLIFY
→ ARSENAL PATH

BARRIER + ARMOR + REPAIR
→ FORTRESS PATH

SCAN + DISRUPT + MIRROR
→ TACTICIAN PATH

MYSTERY + FATE + LUCK
→ CHAOS PATH
```

A path can increase appearance of compatible synergy words without locking the player.

---

# 18. WORD LENGTH AS CAST TIME

Typing length itself should balance power.

Examples:

```text
HEAL
→ small heal

REGENERATION
→ stronger heal

GUN
→ light attack

MISSILE
→ medium attack

ANNIHILATION
→ heavy attack
```

Do not add artificial cast bars where typing already provides one.

---

# 19. ACCURACY QUALITY

Accuracy should affect effect quality.

Example:

```text
perfect word
→ full power + small bonus

1 correction
→ slightly reduced power

several corrections
→ reduced effect
```

Do not cancel every imperfect word.

---

# 20. STORED COMBAT INVENTORY

Allow some rewards to be banked.

Example:

```text
MISSILE ×2
BOMB ×1
RAILGUN ×1
```

Storage must be limited.

Suggested starting point:

```text
Attack slots     3
Defense reserve  2
Tactical slots   2
```

Purpose:

- prevent hoarding;
- force decisions;
- keep HUD manageable.

---

# 21. COMEBACK DESIGN

The player who is behind should have options, not free bonuses.

Possible low-health words:

```text
LAST STAND
REVIVAL
DESPERATE STRIKE
BERSERK
FINAL BARRIER
```

Tradeoffs required.

Example:

```text
BERSERK
Damage +35%
Armor -25%
```

Avoid hidden rubber-banding like “losing player automatically +50% damage”.

---

# 22. FINISHER DESIGN

Leading player can receive high-risk finishers.

Examples:

```text
EXECUTE
SIEGE
OVERWHELM
ANNIHILATION
```

They are:

- powerful;
- long;
- telegraphed;
- vulnerable to counters;
- risky to cast while opponent acts.

---

# 23. BATTLEFIELD ESCALATION DIRECTOR

Do not trigger hazards using unstructured random calls.

Director inputs:

```text
matchTime
intensity
eventBudget
cooldowns
compatibility
playerPressure
mapProfile
seed
```

Example costs:

```text
Light Wind        1
Fog               1
Lightning         2
Meteor            2
Vortex            3
Black Hole        5
Reality Break     5
```

Budget rises over time.

---

# 24. HAZARD FAIRNESS

Hazards may destroy or alter words.

If a hazard destroys the current typing target:

- do not count a miss;
- do not reset streak;
- compensate some typed effort;
- clearly telegraph the threat;
- enforce target protection cooldown.

Possible compensation:

```text
partial Energy
partial Pressure
partial Initiative
```

---

# 25. TARGET PROTECTION WINDOW

After a word is strongly affected by an environment event:

```text
hazardProtection ≈ 1.5–2.5s
```

It should not be hit immediately by another destructive hazard.

---

# 26. ENVIRONMENT RANDOMNESS TYPES

Use three explicit classes.

## Symmetric Environment RNG
Both players face equivalent hazard pressure.

## Contest RNG
Both race for Fate / Mystery / neutral objective.

## Player-Induced Chaos
A player uses Tactical actions to alter the opponent/map.

Do not blur these into invisible arbitrary punishment.

---

# 27. WORLD INSTABILITY

Optional global meter:

```text
WORLD INSTABILITY
██████░░ 72%
```

Grows from:

- heavy attacks;
- ultimates;
- Fate effects;
- strong Tactical actions;
- major map events.

Thresholds increase hazard tier.

Fantasy:

> The players are fighting so hard that the world itself is breaking.

---

# 28. MAP SYSTEM

Maps are not only backgrounds.

Each map defines:

```text
visual theme
hazard table
word affinity
word category bias
Mystery pool
Fate pool
control objective
escalation curve
BGM layers
ambient FX
late-game Cataclysm
```

---

# 29. FROST WASTES

Hazards:

- Blizzard;
- Ice Shatter;
- Whiteout;
- Freeze Lock;
- Frozen Meteor.

Word bias:

- Defense;
- Tactical control.

Map control:

```text
HEAT GENERATOR
```

Mystery:

```text
FROZEN RELIC
ANCIENT ICE CORE
```

Cataclysm:

```text
ABSOLUTE ZERO
```

---

# 30. INFERNO RIFT

Hazards:

- Fire Tornado;
- Lava Burst;
- Ember Rain;
- Magma Crack;
- Infernal Surge.

Word bias:

- Attack;
- burst;
- risky conversion.

Control:

```text
LAVA GATE
```

Mystery:

```text
INFERNAL RELIC
MOLTEN CROWN
```

Cataclysm:

```text
WORLD BURN
```

---

# 31. TEMPEST PRIME

Hazards:

- Lightning Storm;
- Cyclone;
- Static Field;
- Thunderfall;
- Tempest Wall.

Word bias:

- Tactical;
- Attack.

Control:

```text
STORM CORE
```

Mystery:

```text
SKY FRACTURE
TEMPEST CORE
```

Cataclysm:

```text
EYE OF THE STORM
```

---

# 32. OCEAN ABYSS

Hazards:

- Whirlpool;
- Tidal Surge;
- Deep Fog;
- Pressure Crush;
- Bubble Field.

Word bias:

- Support;
- Defense;
- positional control.

Control:

```text
TIDAL ENGINE
```

Mystery:

```text
ABYSSAL PEARL
LEVIATHAN ECHO
```

Cataclysm:

```text
ABYSS RISE
```

---

# 33. TERRA CORE

Hazards:

- Quake;
- Rockfall;
- Dust Storm;
- Fault Line;
- Spike Ridge.

Word bias:

- Defense;
- siege;
- heavy attack.

Control:

```text
SEISMIC CORE
```

Mystery:

```text
ANCIENT MONOLITH
CORE FRAGMENT
```

Cataclysm:

```text
PLANET BREAK
```

---

# 34. CELESTIAL VOID

Hazards:

- Black Hole;
- Gravity Vortex;
- Time Fracture;
- Star Collapse;
- Void Wave.

Word bias:

- Fate;
- Mystery;
- Tactical.

Control:

```text
GRAVITY NODE
```

Mystery:

```text
UNKNOWN SIGNAL
REALITY RIFT
VOID RELIC
CATACLYSM SEED
```

Cataclysm:

```text
REALITY COLLAPSE
```

---

# 35. MAP WORD AFFINITY

The same underlying mechanic can have map-specific words and art.

Defense examples:

Frost:

```text
ICE WALL
GLACIER
FROST SHIELD
```

Inferno:

```text
ASHEN GUARD
FIRE WARD
MAGMA SKIN
```

Ocean:

```text
TIDAL SHIELD
WATER VEIL
DEEP RECOVER
```

This makes maps feel mechanically authored, not reskinned.

---

# 36. NATURAL DISASTER WORD EFFECTS

## Tornado / Vortex

- rotates word positions;
- bends projectile paths;
- adds spiral particles;
- keeps logical targeting stable.

## Lightning

- temporarily hides letters;
- can destroy a target after telegraph;
- may chain to nearby words at high intensity.

## Meteor

- telegraphs target zone;
- player can finish the word before impact;
- otherwise target is destroyed.

## Blizzard

- freezes words;
- obscures some letters;
- adds movement resistance to visual target drift.

## Fog

- reduces information, not keyboard control.

## Earthquake

- shifts rows / word positions;
- can temporarily create blocked zones.

## Black Hole

- curves words and projectiles;
- creates positional chaos;
- should remain readable.

---

# 37. PROJECTILES AND ENVIRONMENT

Hazards may affect projectiles:

- wind curves missile;
- gravity bends projectiles;
- meteor destroys projectile;
- lightning supercharges / destabilizes projectile;
- black hole alters trajectory.

Logical collision must remain deterministic.

Visual distortion must not become the sole gameplay hitbox.

---

# 38. FATE SYSTEM

Central example:

```text
FATE CRYSTAL
```

Both players race to complete it.

Result model:

```text
skill decides ownership
luck decides outcome
```

---

# 39. FATE OUTCOMES

Examples:

- Shield Blessing;
- Energy Surge;
- Prism Barrage;
- Critical Core;
- Cooldown Spark;
- Mirror Crystal;
- Fortune Jackpot.

Avoid:

- instant kill;
- random 50% HP loss;
- long keyboard disable;
- guaranteed match-winning effects.

---

# 40. PITY SYSTEM

Use bounded pity.

If repeated low-tier outcomes occur:

- strong-outcome chance rises slightly;
- jackpot chance rises slightly;
- success resets relevant pity.

All values capped.

---

# 41. FORTUNE CHARACTER

Fortune can interact with:

- Fate;
- Mystery;
- pity;
- reveal mechanics.

Possible PvP-specific effects:

- faster pity growth;
- one weak-roll reroll per round;
- preview one Mystery risk tag;
- small Fate resource gain bonus.

Do not guarantee best outcomes.

---

# 42. BOT MODE

Room slot can be:

```text
Human
Bot
```

Supported:
```text
Human vs Human
Human vs Bot
Bot vs Bot (debug/test)
```

---

# 43. BOT DIFFICULTY

Simple presets:

```text
Easy
Normal
Hard
Expert
Master
Nightmare
```

Advanced parameters:

```text
WPM
Accuracy
ReactionDelay
Aggression
DefensePreference
SupportPreference
TacticalPreference
MysteryPreference
RiskAppetite
CounterSkill
ObjectivePriority
```

Bot difficulty must not be only WPM.

---

## 43.1 Bot must simulate typing, not cheat

A Bot must generate a human-like action timeline rather than instantly calling `WORD_COMPLETE`.

Model at least:

- per-character timing;
- target acquisition reaction delay;
- accuracy roll;
- typo and correction delay;
- target-switch delay;
- decision delay;
- difficulty-dependent lookahead.

Bot knowledge must respect information rules:

- it cannot know hidden Mystery outcomes without a Scan-equivalent effect;
- it cannot know future seeded events before reveal;
- it cannot inspect hidden opponent inventory without an information effect.

---

# 44. BOT PERSONALITIES

### Turtle
Defense-heavy, late-game.

### Aggro
Attack-heavy.

### Tactician
Counter / map-control focus.

### Trickster
Mystery / Tactical heavy.

### Fortune
Luck-heavy.

### Sniper
Banks heavy weapons.

### Balanced
General-purpose.

---

# 45. ROOM SYSTEM

Create Room settings:

```text
Room Name
Public / Private
Password
Match Length
Rounds
Map
Random Map
Map Vote
Hazard Level
Mystery Frequency
Fate Frequency
Bot Allowed
Seed Mode
```

---

# 46. ROOM FLOW

```text
DUEL MODE
    ↓
Quick Match
Create Room
Join Room
Practice vs Bot
```

In Room:

```text
Player Slot 1
Player Slot 2

Ship
Character
Bot / Human
Ready
```

---

# 47. CUSTOM RULE MODIFIERS

Examples:

```text
Standard
High Hazard
Mystery Storm
Weapon Frenzy
Support Rich
Sudden Death
Cataclysm Rush
```

---

# 48. NETWORK ARCHITECTURE

Do not embed networking into the current PvE `Game` class.

Recommended separation:

```text
PvE Game
    │
shared combat primitives
    │
DuelEngine
```

Suggested files:

```text
src/duel/
  model.ts
  engine.ts
  typing.ts
  combat.ts
  words.ts
  strategy.ts
  hazards.ts
  director.ts
  maps.ts
  luck.ts
  mystery.ts
  bots.ts
  room.ts
  protocol.ts
  renderer.ts
```

---

# 49. ONLINE MODEL

Recommended:

```text
Client A
  │
WebSocket
  │
Duel Server
  │
WebSocket
  │
Client B
```

Server authoritative for:

```text
HP
Shield
Energy
stored items
cooldowns
RNG seed
Fate results
Mystery results
hazards
match timer
winner
```

Client predicts presentation and renders FX.

---

# 50. NETWORK EVENTS

Client sends semantic events such as:

```text
KEY_OK
KEY_MISS
WORD_COMPLETE
TARGET_SWITCH
SKILL_ACTIVATE
ITEM_USE
COUNTER_COMPLETE
FATE_COMPLETE
MYSTERY_COMPLETE
OBJECTIVE_COMPLETE
```

Do not stream whole frames.

---

## 50.1 Latency, anti-cheat and reconnect contract

Before Friend Room goes online, define these rules.

### Server-authoritative validation

Validate assigned word, expected character sequence, target id, timestamps, skill/resource availability, cooldown, match phase and authoritative RNG outcome. Reject impossible input rates and impossible state transitions.

### Latency handling

Do not make normal typing wait for a network round trip.

```text
client predicts local typing presentation
server validates semantic progression
server owns combat outcome
```

Use bounded timestamp tolerance for legitimate latency.

### Disconnect

Friend Room should support a short reconnect grace window. Pause or bot takeover can be a room setting. Ranked disconnect/forfeit rules should be defined before Ranked launch.

---

# 51. DETERMINISTIC RNG

Authoritative PvP randomness must be seeded.

Use:

```text
matchSeed
+ eventSequence
```

For:

- map hazards;
- Fate;
- Mystery;
- word distribution;
- neutral objectives.

---

# 52. FAIRNESS BETWEEN PLAYERS

Symmetric events should use equivalent pressure:

```text
same event class
similar word difficulty
equivalent target index / threat
```

Do not give one side a trivial event and the other an extreme event from the same roll.

---

# 53. MATCHMAKING / SKILL

Future rating can combine:

```text
Typing Rating
+
Duel Rating
```

Typing signals:

- WPM;
- accuracy;
- consistency;
- word difficulty.

Duel signals:

- win/loss;
- counter skill;
- objective play;
- strategic efficiency.

---

# 54. DAMAGE MODEL PRINCIPLE

Conceptually:

```text
Base effect
× word difficulty
× accuracy quality
× streak / flow modifier
× skill / item modifier
```

WPM already gives natural advantage through action frequency.

Do not multiply raw damage again directly by WPM.

---

# 55. ULTIMATE CLASH

If both Ultimates overlap closely:

```text
ULTIMATE CLASH
```

A short phrase appears.

Both type simultaneously.

Example progress:

```text
A ███████░░
B █████░░░░
```

Winner gets clash advantage.

Keep rare.

---

# 56. AUDIOVISUAL ESCALATION

Mid-game:

- BGM gains layer;
- projectile intensity rises;
- ship aura becomes stronger;
- background motion increases.

Late-game:

- danger percussion;
- environmental FX;
- weapon heat;
- stronger particles;
- instability visuals.

Avoid excessive full-screen flashes.

---

# 57. UI / HUD

Recommended information:

```text
Player HP
Shield
Energy
Stored weapons
Stored Defense
Tactical slots
Combo progress
Opponent HP / Shield
Match timer
Current phase
World instability
Current neutral objective
```

Clarity above decoration.

---

# 58. HIGH / ULTRA VISUAL TARGET

High / Ultra enhance:

- projectile trails;
- shield refraction;
- word special effects;
- map hazard particles;
- Fate / Mystery glints;
- ship aura;
- Cataclysm events.

They must not change gameplay values.

---

# 58.1 READABILITY / ACCESSIBILITY / PERFORMANCE CONTRACT

Duel intentionally becomes visually intense, so readability is a hard requirement.

- current target has highest text-readability priority;
- decorative FX should pass behind words unless hiding letters is the explicit hazard mechanic;
- telegraphs must read on bright and dark maps;
- special categories need shape/icon cues in addition to color;
- reduced-motion behavior should reduce vortex/camera/distortion intensity while preserving gameplay information;
- screen-shake setting remains respected;
- High/Ultra add presentation, never hidden gameplay information;
- logical hit/target state must never depend on visual distortion.

Add explicit performance budgets for live projectiles, word FX, hazard particles, map distortion and neutral-objective FX. Stress-test the final Cataclysm minute, not only the opening.

---


# NON-DESTRUCTIVE PERFORMANCE OPTIMIZATION POLICY

This is an architecture requirement.

The project must optimize **how approved effects are implemented**, not remove approved gameplay/presentation simply to make the profiler green.

## Preserve

Performance work must preserve approved:

- hazards;
- map identity;
- projectiles;
- counters;
- ship effects;
- Fate/Mystery presentation;
- strategic word behavior;
- Cataclysm intensity;
- High/Ultra visual intent;
- gameplay outcomes and timing windows.

Do not silently solve performance by:

- deleting effects;
- disabling weather;
- reducing approved hazard behavior;
- removing projectile interactions;
- making High look like Medium;
- making Ultra secretly behave as Low;
- reducing counter windows;
- changing damage/economy by quality mode.

## Optimize first

Profile root cause, then optimize:

1. algorithmic complexity;
2. object pooling;
3. allocations / GC churn;
4. cached sprites/glows/geometry;
5. draw ordering and overdraw;
6. grouped/batched presentation;
7. culling;
8. interpolation of decorative motion;
9. precomputed paths / seeded tables;
10. asset right-sizing;
11. lazy scene/map loading;
12. DOM churn;
13. audio voice count;
14. teardown/listener/resource leaks.

## One Duel scene, not two PvE games

Do not run two full `Game` instances.

Use:

```text
DuelEngine
→ one authoritative/shared logical match
→ one renderer
→ two ships + two sides
```

## Global scene budget

Per-system caps alone are not enough.

Measure combined late-match load:

```text
ships
+ action words
+ projectiles
+ shield/hit FX
+ hazards
+ moving/distorted words
+ neutral objectives
+ Fate/Mystery
+ background
+ Cataclysm
```

## High/Ultra acceptance

Measure at least:

- frame p95 / p99;
- slow-frame ratio;
- input-to-visible-feedback latency;
- update/draw time;
- allocation/GC spikes;
- effective DPR/adaptive scale;
- visual sharpness;
- audio voice count where relevant.

A stable FPS achieved only by silently collapsing resolution/visual quality is **not** a pass.

If an approved effect truly cannot meet the target after profiling and implementation optimization, any material visual/gameplay reduction requires explicit owner approval.

---

# 59. IMPLEMENTATION ROADMAP

## M-DUEL-00 — Contracts

- data model;
- categories;
- match phases;
- word actions;
- tests.

## M-DUEL-01 — Local Duel Simulation

- two logical players;
- simultaneous typing state;
- no networking.

## M-DUEL-02 — Bot Opponent

- WPM;
- accuracy;
- reaction delay;
- behavior profiles.

## M-DUEL-03 — Core Word Draft

- Attack;
- Defense;
- Support.

## M-DUEL-04 — Tactical Layer

- counters;
- map effects;
- storage.

## M-DUEL-05 — Fate + Mystery

- deterministic roll;
- pity;
- reveal tools.

## M-DUEL-06 — Map Director

- hazard profiles;
- escalation phases.

## M-DUEL-07 — Neutral Objectives

- Fate Crystal;
- control nodes;
- caches.

## M-DUEL-08 — Strategy Systems

- combo;
- banking;
- traps;
- information;
- conversion;
- Initiative.

## M-DUEL-09 — Room UI

- create / join;
- human / bot;
- rule settings.

## M-DUEL-10 — Network Protocol

- WebSocket;
- authoritative state.

## M-DUEL-11 — Online Friend Room

## M-DUEL-12 — Matchmaking / Ranked

## M-DUEL-13 — High / Ultra Polish

---

# 59.1 MILESTONE ACCEPTANCE GATES

### Duel core gate
- simultaneous logical players work;
- target acquisition is deterministic;
- win/reset rules are correct.

### Bot gate
- observed WPM/accuracy match configured ranges over timed samples;
- bot cannot access hidden information.

### Strategy gate
At least three materially different plans are viable: aggression, defense/banking and tactical/control.

### Escalation gate
The first minute is visibly calmer than minute 3+, while late-game words remain readable.

### Map gate
Changing map changes gameplay rules, not only the background.

### Fate/Mystery gate
Seeded replay reproduces authoritative event order and neutral RNG cannot directly decide a healthy standard Ranked match.

### Network gate
Local prediction is responsive, invalid actions are rejected and reconnect restores authoritative state.

---

# 60. TEST LAB

Add Duel Test Lab controls:

```text
Spawn Attack Word
Spawn Defense Word
Spawn Support Word
Spawn Tactical Word
Spawn Fate
Spawn Mystery

Force Phase 1
Force Phase 2
Force Phase 3
Force Crisis
Force Cataclysm

Trigger Tornado
Trigger Lightning
Trigger Meteor
Trigger Black Hole

Set Bot WPM
Set Bot Accuracy
Set Bot Personality

Set Player HP / Shield / Energy
Give Weapon
Give Tactical
Force Combo
```

---

# 61. AUTOMATED TESTS

Cover:

- word category resolution;
- phase distribution;
- combo recipes;
- resource banking;
- counter resolution;
- hazard fairness;
- Mystery deterministic seed;
- Fate pity;
- bot timing;
- room settings;
- state transitions;
- overtime;
- no duplicate actions;
- deterministic sync;
- WPM does not directly multiply damage twice.

---

# 62. NON-GOALS FOR FIRST VERSION

Do not start with:

- ranked matchmaking;
- spectator;
- clans;
- tournaments;
- voice chat;
- 2v2;
- 3v3;
- many regions;
- dozens of maps.

First prove:

```text
Human vs Bot
+
excellent Duel gameplay
```

Then add networking.

---

# 63. FINAL TARGET EXPERIENCE

A strong match might look like:

```text
0:00
Both players build Energy / Shield / weapons.

0:40
One starts light aggression.

1:10
First Tactical words and Fate objective.

1:50
Map hazard begins.

2:20
Player A banks Homing Barrage.
Player B scans and prepares EMP.

2:50
A attacks.
B counters.

3:15
Crisis.
Mystery appears.
Storm intensifies.

3:40
Player B is behind but claims Annihilator.
Player A still has stronger defenses.

4:00
Cataclysm.
Map transforms.
High-tier weapons and Tactical effects rise.

4:20
A tries finisher.
B uses sacrifice conversion + counter + Fate effect.

4:28
Match ends through player decisions inside a chaotic battlefield.
```

The core identity is:

> **typing + tactical combat + resource drafting + map control + controlled luck + cinematic escalation.**