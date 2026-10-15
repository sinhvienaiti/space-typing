# SPACE TYPING — TIERED CREDIT CRYSTAL DROP / MAGNET PICKUP MASTER PLAN — FINAL V3

**Status:** FINAL V3 — implementation specification; economy/architecture review findings incorporated  
**Repo:** `sinhvienaiti/space-typing`  
**Target branch / source of truth:** `feat/bgv-integration-current`  
**Observed branch head while this plan was prepared:** `66ee6a0896450ffc56bc0b6216e756c45cf5aafc`  
**Primary goal:** make every real combat enemy kill feel materially rewarding through a tiered crystal-drop → magnet → ship-absorption loop, while preserving the existing Credits economy and avoiding HUD / battlefield clutter.

---


## FINAL V3 DECISION REGISTRY — OVERRIDES OLDER CONFLICTING TEXT

If a later example or recommendation conflicts with this registry, **this section wins**.

### C-FINAL-01 — Every eligible combat enemy is worth at least 1 Credit

Keep the product requirement:

```text
eligible combat kill
→ amount >= 1 Credit
```

Do not introduce:

- zero-value fake crystals;
- negative reward;
- fractional/sub-credit currency solely to preserve the old curve.

This means the old Credit curve may need measured rebalance.

The goal is to preserve overall progression quality, **not** to mathematically freeze every old stage payout.

### C-FINAL-02 — Combat spawning is not globally reduced just to preserve the old Credit budget

Do not make normal combat less rich merely because a fixed Credit budget would be exceeded.

Default policy:

```text
combat design decides valid enemy/summon behavior
→ eligible kills receive >= 1 Credit
→ measure Credits/minute and stage income
→ rebalance stage-clear base / affordability where necessary
```

If a specific summoner/splitter can create unbounded farm behavior, add a **mechanic-specific finite reward/admission rule** for that exploit.

Do not globally stop normal spawns only to make accounting easier.

### C-FINAL-03 — Economy claim and VFX presentation are separate

Use two explicit operations:

```text
claimKillReward(attemptId, sourceInstanceId, cause)
    → idempotent reward receipt

presentKillReward(receipt, deathPosition)
    → transient pickup presentation
```

A particle is never the authority for money.

`sourceInstanceId` refers to the specific enemy/boss instance, not merely its definition.

Receipt identity must include enough scope to reject:

- duplicate callbacks;
- synchronous + delayed impact duplication;
- stale impacts from an older attempt;
- boss/enemy namespace collision.

### C-FINAL-04 — Guarantee semantics

“Guaranteed” has two levels.

#### Gameplay/session guarantee

Once an eligible kill is authoritatively claimed:

- VFX culling cannot lose reward;
- stage transition cannot lose reward;
- pickup animation interruption cannot lose reward;
- a duplicate callback cannot grant again.

#### Persistence guarantee

Durability follows the game's persistence/recovery policy.

Do not claim that a reward is absolutely crash-proof before storage commits.

Recommended production behavior:

- claim into canonical in-run economy ledger immediately;
- coalesce persistence work;
- persist at existing safe/autosave boundaries and important transitions;
- best-effort lifecycle flush where existing persistence architecture supports it;
- do **not** serialize/flush the full player save synchronously for every individual kill.

If a stronger mid-stage durable guarantee is later required, implement it inside the existing persistence/recovery system with attempt/receipt identity; do not create a parallel wallet.

### C-FINAL-05 — Mode ownership is checked before wallet mutation

Default mode matrix:

```text
Campaign / approved Ascension
→ real canonical Credits

Hidden encounter
→ explicit dedicated rule; prevent double settlement

Recall
→ no automatic Combat Credit drops unless separately approved

Expedition
→ no Campaign Credit minting by default

Preview / Test Lab
→ VFX/simulated wallet only; never production save

Duel
→ no PvE kill-Credit system
```

Mode isolation is checked **before** canonical balance changes.

### C-FINAL-06 — Kill/removal audit is mandatory

Before integration is complete, audit every path that:

```text
filter()
splice()
clear()
despawn()
replace enemy arrays
defeat boss
resolve skill kill
complete layered enemy
```

Classify each removal:

```text
rewarded kill
escape
cleanup
despawn
scripted conversion
non-kill clear
```

Do not assume `completeWord`, `resolveSkillEnemyKill`, and `defeatBoss` cover every removal.

Layer completion grants only on the actual final death.

### C-FINAL-07 — `credits-x2` compatibility policy

FINAL V3 preserves existing stage-settlement semantics by default.

The combat drop receipt records **base combat Credit amount**.

Stage settlement may calculate the existing eligible `credits-x2` bonus against the defined Credit base and grant only the unpaid bonus portion.

Rules:

- combat pickup is not multiplied again at visual collection time;
- no double-pay;
- no retroactive clawback;
- rounding is specified at ledger level, not independently per decorative fragment;
- existing Prism Archon stage-clear-friendly behavior is preserved unless a later explicit economy redesign changes it.

If the project later chooses true kill-time x2, that is a deliberate economy change and must update Prism Archon/reward tests.

### C-FINAL-08 — Economy ledger tracks nominal vs applied wallet delta

Receipt should conceptually distinguish:

```text
nominalEarned
walletDeltaApplied
```

because the wallet has a maximum cap.

HUD animation uses actual applied wallet delta for wallet count-up.

Menus/shops always read canonical wallet.

A pending HUD animation may never overwrite a newer balance after:

- spend;
- import;
- reset;
- mode switch.

Use a presentation epoch/sync mechanism.

### C-FINAL-09 — Visual overload may coalesce representation, never value

Logical reward receipts can outnumber visual sprites.

When scene capacity is saturated:

1. drop/merge decorative satellites first;
2. cluster low-tier anchors into representative streams;
3. compactly synchronize remaining HUD presentation if necessary;
4. reserve capacity for Boss/Major Boss hero crystals.

This does **not** delete economy value.

Boss/Major Boss hero crystals must retain their premium identity.

### C-FINAL-10 — Exhaustive tier mapping

Use the real rarity enum:

```text
common
uncommon
rare
elite
boss
```

Resolution priority:

```text
bonus/reward-only target
→ no Combat Credit drop

major boss
→ major-boss

boss
→ boss

mini-boss
→ mini-boss

golden
→ elite tier + golden visual variant

elite flag OR rarity=elite
→ elite

rarity=rare OR Rank IV–VI
→ refined unless a higher rule wins

Rank VII–X
→ high unless elite/boss rule wins

common/uncommon Rank I–III
→ common
```

If a rare Rank I–III definition exists, `rare` upgrades it to Refined.

If Rank VII–X is `rare`, High wins over Refined.

Role/boss overrides always win over rank/rarity.

### C-FINAL-11 — Boss premium beat timing

Use one timing source:

```text
essential premium boss crystal beat:
~0.9–1.4 seconds
```

Do not keep the older 1.2–1.8s recommendation as a conflicting requirement.

The sequence may continue with lightweight decoration, but must not impose a long repetitive blocking cinematic.

### C-FINAL-12 — Bonus/reward targets remain excluded

Do not classify an enemy as excluded merely because it has some reward effect field.

Exclusion is based on the explicit combat-credit eligibility policy.

Known bonus/reward-only target families remain excluded unless product design explicitly changes them.

---

## 0. CRITICAL PRODUCT DECISIONS

These are hard requirements for this plan.

1. **Do not create a new persistent currency called Diamond.**
   - The game already has Credits, Alloy, Star Crystal, Quantum Core.
   - `Diamond` already exists as an equipment grade.
   - The new crystals are a **physical / visual representation of Credits in combat**.
   - Internal names may use `credit-crystal`, `credit-shard`, etc., but the persistent balance remains `credits`.

2. **Every real combat enemy can drop Credit Crystals, except bonus/reward-only targets.**
   - Normal enemy → normal crystal tier.
   - Higher-rank / rarer enemy → higher crystal tier.
   - Elite / Golden → large premium-looking tier.
   - Mini Boss → very large boss-tier crystal burst.
   - Boss / Major Boss → extremely large, highly polished, sparkling crystal presentation.
   - The system must visually communicate enemy value before the player even reads a number.

3. **Do not show floating Score text on enemy kill anymore.**
   - Remove the current `+score` popup near the dead enemy.
   - Keep Score calculations, multiplier logic, stage result score and the top Score HUD.
   - The battlefield kill reward feedback should be the crystal drop, not `+250`, `+430`, etc.
   - This change is specifically intended to reduce visual clutter.

4. **The pickup loop must be beautiful.**
   - Kill.
   - Explosion / breakup.
   - Mixed-size crystals burst out.
   - Brief scatter / hover.
   - Smooth curved magnet pull toward the ship.
   - Increasing speed near the ship.
   - Absorption flash / spark / pulse at the hull/core.
   - Credits HUD reacts when the collection arrives.
   - Boss pickups must feel significantly more spectacular than ordinary pickups.

5. **Do not make visual crystal count equal to currency value 1:1.**
   - A late-game kill may be worth many Credits.
   - The game should still render a controlled number of beautiful pieces.
   - Economy value and VFX object count must remain separate.

---

# 1. CURRENT CODE / SYSTEM FINDINGS

Claude should re-read the current branch before coding because the branch may move after this plan. The following paths are the important current integration points.

## 1.1 Existing currencies

Current player-facing currencies are defined around:

- `src/ui/currency.ts`
  - Credits
  - Alloy
  - Star Crystal
  - Quantum Core

Expansion currencies are stored in:

- `src/economy/currencies.ts`

Credits are stored separately in:

- `src/economy/credits.ts`

Do **not** add another persistent wallet/state for combat crystals.

---

## 1.2 Enemy rank / rarity already exists

Useful current inputs:

- `src/enemies/rank.ts`
  - Enemy ranks I → X.
  - Rank visual intensity already exists.
- `src/enemies/registry.ts`
  - Rarity values:
    - `common`
    - `uncommon`
    - `rare`
    - `elite`
    - `boss`
  - Enemy roles include normal combat roles, elites, mini-bosses and reward-oriented enemies.
- Runtime `Enemy` already contains:
  - `rank`
  - `elite`
  - `golden`
  - `definitionId`
  - `kind`
  - position / radius / etc.

Use these existing dimensions. Do not invent a parallel enemy-value hierarchy.

---

## 1.3 Existing normal typed kill path

Normal typed enemy completion currently resolves in `src/Game.ts::completeWord()`.

Current flow already includes:

- score reward;
- power;
- translation;
- firing the final player shot;
- delayed visual death through `ShotImpact.kind === "enemy-kill"`;
- equipment drop roll;
- enemy reward effect;
- death traits;
- objective update.

Important:

The enemy is logically removed before the final travelling projectile visually lands.

Actual death presentation happens later in:

- `src/Game.ts::applyShotImpact()`
- branch `case "enemy-kill"`

This is the correct VFX timing point for normal typed kills.

**Crystal burst must visually begin when the kill shot lands / death FX begins, not when the word is merely completed.**

---

## 1.4 Skill / consumable kill path

Skill kills use:

- `src/Game.ts::resolveSkillEnemyKill()`

This is a separate kill path.

The new credit drop system must work for:

- typed kills;
- Word Bomb;
- Chain Lightning-like kills;
- missiles / perk kills;
- AoE / plasma;
- future skill kills.

Do not implement crystals only in `completeWord()`.

Create one shared kill reward/drop request API and call it from every eligible kill path.

---

## 1.5 Boss defeat path

Boss death currently uses:

- `src/Game.ts::defeatBoss()`

This already triggers:

- boss score;
- power;
- boss death FX;
- equipment reward;
- boss reward choice / stage completion flow.

Boss crystal presentation belongs here, but the crystal burst must be coordinated with the existing boss death VFX.

Boss reward choice remains a separate reward system.

---

## 1.6 Existing floating kill Score popup

The current battlefield `+score` popup is implemented by:

- `src/combat/score-popup.ts`
- `killScorePopups` in `src/Game.ts`
- `spawnKillScorePopup()`
- `advanceKillScorePopups()`
- `drawKillScorePopup()`
- `drawKillScorePopups()`

Current observed normal kill caller:

```ts
this.spawnKillScorePopup(...)
```

inside the normal enemy kill flow.

### Required change

Remove floating kill score presentation.

Keep:

- score value;
- streak;
- multiplier;
- stage result score;
- top Score HUD.

After implementation, grep all `spawnKillScorePopup`, `killScorePopups`, `drawKillScorePopup`, `advanceKillScorePopups`.

If there are no other legitimate users, delete the dead runtime/state/module/tests rather than leaving an unused system behind.

---

# 2. WHAT COUNTS AS A BONUS TARGET — NO CREDIT CRYSTAL DROP

The user requirement is:

> every enemy drops the tier appropriate to it, **except bonus enemies / bonus targets**.

Explicit exclusions must include current non-standard bonus entities:

- Supply Pod
- Treasure Drone
- Recall Bonus target
- Reward Choice Crate
- Anomaly Crate
- any future target using the `BonusAim` / bonus-target flow instead of a normal `Enemy`

Additionally, current enemy definitions can have `role: "reward"`.

Examples observed in the registry include reward-oriented enemies such as:

- Lucky Rainbow
- Angel Blesser
- Treasure Prism
- Bloom Puff
- Star Core

### Recommended rule

Create one centralized function:

```ts
isCombatCreditDropEligible(...)
```

and make the exclusion explicit.

Recommended default:

- normal combat Enemy: eligible;
- elite/golden: eligible;
- boss: eligible;
- `role === "reward"`: **not eligible** because it already exists specifically as a reward carrier;
- all non-Enemy bonus entities listed above: not eligible.

Claude should verify every current reward-role definition before implementation.

Do not scatter hardcoded exclusions across kill paths.

---

# 3. CRYSTAL DROP TIER MODEL

The tiers below are **visual/value tiers of Credits**, not new currencies.

Recommended internal type:

```ts
type CreditCrystalTier =
  | "common"
  | "refined"
  | "high"
  | "elite"
  | "mini-boss"
  | "boss"
  | "major-boss";
```

A `golden` enemy is not a new currency tier; it can use an elite/high tier with a special golden visual variant.

---

# 4. TIER RESOLUTION PRIORITY

Tier resolution should be deterministic and centralized.

Recommended order:

```text
1. excluded / bonus target          -> no drop
2. Major Boss                       -> major-boss
3. Boss                             -> boss
4. Mini Boss                        -> mini-boss
5. Golden enemy                     -> elite + golden variant
6. Elite flag / elite rarity        -> elite
7. Rank VII-X / high rarity         -> high
8. Rank IV-VI / rare definition     -> refined
9. Rank I-III common/uncommon       -> common
```

Pseudo API:

```ts
resolveCreditCrystalTier({
  rank,
  elite,
  golden,
  definitionRarity,
  definitionRole,
  bossRole,
}): CreditCrystalTier | null
```

Do not determine tier only from stage number.

The actual enemy rank/rarity/role should control the visible reward.

---

# 5. VISUAL LANGUAGE PER TIER

The player should immediately understand that stronger enemies drop better crystal bundles.

The visuals must differ by:

- silhouette;
- size;
- facet complexity;
- core color;
- rim color;
- highlight strength;
- number of satellite fragments;
- trail quality;
- sparkle frequency;
- absorption intensity.

Do not differentiate tiers by color alone.

---

## 5.1 COMMON — Amethyst Shard

Typical source:

- Rank I-III
- common / uncommon normal enemy

Visual:

- compact rhombus / cut shard;
- mostly violet / amethyst;
- strong white facet on one edge;
- thin dark outer contour;
- low-intensity lavender glow;
- small mixed fragments.

Approx screen sizes:

- satellites: 4-6 px
- anchor: 7-9 px

Burst:

- 2-4 visible pieces.

Motion:

- short scatter;
- quick pickup;
- modest trail.

Purpose:

- frequent;
- readable;
- never visually noisy.

---

## 5.2 REFINED — Violet-Cyan Prism

Typical source:

- Rank IV-VI
- rare normal enemy / stronger normal archetype

Visual:

- longer faceted prism;
- violet body;
- cyan / ice-white edge refraction;
- brighter core;
- visibly richer than Common.

Approx sizes:

- satellites: 5-8 px
- anchor: 10-12 px

Burst:

- 3-5 visible pieces.

FX:

- 1-2 small sparkle flashes during scatter;
- slightly longer light trail during magnet.

---

## 5.3 HIGH — Royal Crystal

Typical source:

- Rank VII-X non-elite
- high-rank late-game enemy

Visual:

- multi-facet hex / crown-like crystal;
- royal purple + magenta interior;
- ice-white highlights;
- subtle cyan spectral edge;
- sharper twinkle.

Approx sizes:

- satellites: 6-9 px
- anchor: 13-16 px

Burst:

- 4-7 pieces.

FX:

- clearly visible caustic/specular sweep;
- slightly wider scatter;
- stronger homing tail.

---

## 5.4 ELITE — Imperial Crystal

Typical source:

- `enemy.elite`
- registry rarity `elite`
- Golden enemy can use this tier with a Golden variant

Visual:

- larger, more complex cut;
- strong white central reflection;
- violet-magenta body;
- pale-gold or cyan outer rim depending on variant;
- very clear sparkle without becoming a flat glowing blob.

Approx sizes:

- satellites: 7-11 px
- anchor: 17-21 px

Burst:

- 5-9 pieces;
- always at least one visibly larger anchor.

Golden variant:

- warm white / gold edge;
- violet core may remain so the whole drop system still feels related;
- do not turn it into a plain yellow coin.

Pickup:

- stronger ship absorption ring;
- HUD pulse stronger than Common/Refined.

---

## 5.5 MINI BOSS — Grand Crystal

Visual:

- obvious jump in scale;
- large central crystal + satellites;
- complex facets;
- bright inner caustic;
- violet + white + cyan prismatic split.

Approx:

- satellites: 8-13 px
- anchor: 22-28 px

Burst:

- 7-12 pieces.

Timing:

- bigger initial explosion;
- larger scatter radius;
- longer visual pause before magnet begins;
- satellites start homing first;
- anchor follows slightly later.

---

## 5.6 BOSS — Crown Crystal

This must be a hero effect, not just “more Common crystals”.

Visual:

- one **very large** polished hero crystal;
- 8-16 smaller fragments / satellites;
- strong white diamond-like highlights;
- violet / magenta internal depth;
- cyan spectral edge;
- occasional star-shaped lens glints;
- rotating light sweep across facets;
- thin dark silhouette so it remains readable on bright Worlds.

Approx anchor:

- 30-40 px on desktop at 1x CSS size;
- adapt for canvas size / mobile.

The anchor must look huge compared with normal enemy drops.

Boss sequence:

```text
boss death burst
    ↓
small fragments explode outward
    ↓
hero crystal emerges / hangs for a short readable beat
    ↓
satellite wave 1 homes to ship
    ↓
satellite wave 2 homes to ship
    ↓
hero crystal accelerates last
    ↓
large ship absorption pulse + strong HUD reward pulse
```

Do not immediately vacuum the huge crystal away. The player must have time to see it.

---

## 5.7 MAJOR BOSS — Sovereign / Galaxy Crystal

Use the same Credits currency but the most premium presentation.

Visual:

- enormous central crystal;
- more intricate cut than normal Boss;
- inner white core;
- violet / cyan / spectral highlights;
- subtle gold crown edge allowed;
- multiple twinkle points;
- slow rotation during the hold phase.

Approx anchor:

- 38-50 px desktop;
- quality / viewport adaptive.

Burst:

- 12-20 controlled fragments;
- 2-3 pickup waves;
- very large final absorption effect.

Important:

A major-boss drop should feel like an event.

Do not use 50 tiny particles to fake value.

Use a small number of high-quality pieces plus layered sparkle / light FX.

---

# 6. BACKGROUND READABILITY RULES

The game has very different Worlds:

- dark galaxy;
- bright Heaven;
- fire / Hell;
- frost;
- nebula;
- asteroid / cosmic maps;
- violet-heavy maps.

A pure purple additive sprite can disappear on some of these.

Every crystal must use three readability layers:

```text
1. opaque / source-over crystal body
2. light specular / rim
3. soft glow behind it
```

Recommended:

- body: opaque enough to keep shape;
- highlight: white / ice;
- rim: cyan-lavender;
- outer contour: very thin dark blue/purple;
- halo: additive but restrained.

Do **not** render the entire crystal only with `lighter` / additive blending.

On bright backgrounds:

- slightly darker violet body;
- stronger dark contour;
- smaller glow.

On dark backgrounds:

- stronger white/cyan highlight;
- glow can be brighter.

If the project already exposes background luminance / theme information, use it.

Otherwise create one conservative visual that reads on both rather than introducing expensive background sampling.

---

# 7. ART ASSET STRATEGY

Do not make the final production pickup look like:

- emoji;
- Unicode diamond;
- raw CSS polygon;
- flat triangle;
- programmer placeholder.

Recommended production approach:

### Authored transparent art per tier

Proposed source path:

```text
art-src/pickups/credits/
  common.png
  refined.png
  high.png
  elite.png
  elite-golden.png
  mini-boss.png
  boss.png
  major-boss.png
```

Runtime path:

```text
src/assets/pickups/credits/
  common.webp
  refined.webp
  ...
```

Add an explicit preparation command.

Example:

```text
pnpm pickups:prepare
```

Do not repeat the previous icon problem where assets existed under `art-src` but no runtime conversion path existed.

The script must:

- verify expected files;
- preserve alpha;
- reject suspicious non-transparent source where appropriate;
- output runtime WebP;
- print every generated target;
- optionally produce 2 sizes only if profiling proves necessary.

Because on-screen pickup size is small, do not generate unnecessary multi-megabyte textures.

Boss / Major Boss source can be higher resolution than Common.

---

## 7.1 Runtime asset validation / fallback policy

Production builds should not silently fall back to emoji or flat placeholder diamonds.

Recommended:

- development: clear missing-asset warning + diagnostic fallback;
- CI / asset validation: fail if a required production tier asset is missing;
- production: use validated packaged assets.

The prepare step should also verify alpha, dimensions, output path, duplicate filename and suspiciously tiny sources.

---

# 8. RUNTIME DATA MODEL

Recommended new pure runtime model:
```ts
type CreditDropBurst = {
  id: number;
  tier: CreditCrystalTier;
  value: number;

  x: number;
  y: number;

  age: number;
  phase:
    | "scatter"
    | "hover"
    | "magnet"
    | "collected";

  anchor: CreditCrystalPiece;
  satellites: CreditCrystalPiece[];

  collectCommitted: boolean;
  seed: number;
};
```

Each visual piece:

```ts
type CreditCrystalPiece = {
  x: number;
  y: number;

  vx: number;
  vy: number;

  size: number;
  rotation: number;
  spin: number;

  homingDelay: number;
  homingBias: number;

  trailPhase: number;
  decorative: boolean;
};
```

Important:

**One burst has one economic value.**

Satellites are visual fragments of that reward.

Do not make every visible fragment a separate persistent currency transaction.

---

# 9. AUTHORITY VS PRESENTATION — DO NOT LOSE REWARDS

This requires careful handling.

The visual object flying to the ship must **not** be the sole authority for whether the player earned Credits.

Problems otherwise:

- stage ends before the final crystal reaches the ship;
- player pauses / resizes / transitions;
- boss reward dialog opens;
- canvas is reset;
- app is closed after the kill;
- a future performance fallback skips VFX.

Recommended model:

## 9.1 Reward becomes guaranteed when the eligible kill is confirmed

At the kill event:

```text
kill confirmed
→ calculate Credit value
→ mark economic reward guaranteed
→ spawn visual CreditDropBurst
```

The visual flight is presentation.

Do not let a missing frame or effect cause lost currency.

---

## 9.2 HUD display can wait for visual collection

For satisfying feedback:

- authoritative amount can be queued immediately;
- visible combat Credits counter should animate the amount when the anchor reaches the ship;
- if a transition occurs before collection, flush remaining visual pickups and synchronize the displayed number immediately.

This prevents:

- lost currency;
- stage-clear waiting;
- invisible pending pickup bugs.

---

## 9.3 Reward transaction contract

The combat system and canonical Credits state need an explicit one-time transaction contract.

Recommended event:

```ts
type CombatCreditRewardEvent = {
  rewardId: string;
  sourceKind: "enemy" | "elite" | "golden" | "mini-boss" | "boss" | "major-boss";
  sourceId: string;
  tier: CreditCrystalTier;
  amount: number;
  x: number;
  y: number;
};
```

Rules:

1. `rewardId` is unique.
2. Canonical Credits commit once.
3. VFX references the same `rewardId`.
4. Delayed shot impact may delay visuals but cannot duplicate economy.
5. Skill/direct kills use the same transaction API.
6. `flush()` completes presentation only; it never grants the same reward again.

Recommended separation:

```text
Game/combat
→ onCombatCreditReward(event)
→ main/economy grants canonical Credits once

VFX
→ spawn(event)
→ onCombatCreditPickupPresented(event)
→ HUD animation only
```

If canonical Credits are committed before visual arrival, menus/purchases always read canonical Credits while the combat HUD may animate a separate displayed value toward it.

---

# 10. CREDIT VALUE / ECONOMY MODEL

Do not blindly add a large new income stream.

Current Credits already come from:

- stage clear;
- performance;
- checkpoints;
- missions / other rewards;
- boss reward paths;
- shops consume Credits.

If every kill adds new Credits while existing stage-clear Credits are untouched, 1000-stage economy can inflate heavily.

### Recommended strategy: move part of existing stage income into combat drops

Think of this feature as:

```text
OLD:
mostly end-of-stage Credits

NEW:
part of Credits becomes visible kill drops
+
remaining completion/performance reward stays at stage clear
```

Preserve the expected Credits-per-stage curve as closely as practical.

---

## 10.1 Do not remove performance rewards

Keep end-of-stage bonuses such as:

- accuracy;
- flawless / performance;
- objective;
- checkpoint;
- difficulty multiplier.

Those are rewards for stage performance, not enemy loot.

---

## 10.2 Combat drop budget

Create a pure economy function in a new module such as:

```text
src/rewards/combat-credit-drops.ts
```

Responsibilities:

- eligibility;
- tier resolution;
- weight / value;
- stage scaling;
- elite/golden/boss multiplier;
- optional Salvage interaction;
- deterministic clamp.

Avoid putting this logic inside VFX code.

---

## 10.2.1 Budget algorithm — avoid hidden inflation

Do not hardcode a percentage of the old stage-clear reward before measuring actual eligible kill counts.

Required process:

```text
1. inspect expected eligible kills
2. compute weighted enemy value
3. compute minimum payout required by "every eligible enemy drops"
4. choose combatCreditBudget
5. distribute by weight
6. reserve boss/elite minimums
7. subtract only overlapping base stage-clear Credits
8. simulate economy
```

Minimum-drop constraint:

```text
each eligible kill amount >= 1 Credit
```

If the existing economy is too small for that at high enemy density, do not create zero-value visual crystals. Explicitly rebalance the stage Credit curve/shop economy after simulation.

Track:

```text
combatCreditsGrantedThisStage
combatCreditBudget
```

This also protects against duplicate callbacks, farmable future summons and scripted-target duplication. Boss/required encounters may use a reserved budget portion.

---

## 10.3 Suggested relative weights

These are tuning starting points, not final hardcoded economy.

```text
Common       1.00x
Refined      1.35x
High         1.75x
Elite        2.50x
Golden       3.25x
Mini Boss    5.00x
Boss         8.00x
Major Boss  12.00x+
```

The actual integer Credits should be derived from the stage economy budget, not directly from these multipliers.

---

## 10.4 Credits x2 reward

The game already has `credits-x2`.

The new combat drop loop is an ideal presentation surface for it.

When Credits x2 is active:

- actual combat Credit value follows the existing multiplier;
- crystal tint can receive a slightly brighter white edge;
- collection HUD can show the doubled delta;
- do not double the number of VFX objects;
- do not make the scene noisier just because value doubled.

---

# 11. CRYSTAL PIECE COUNT != CREDIT VALUE

This is mandatory for performance and art quality.

Example:

```text
Enemy reward value = 14 Credits

Visual:
1 anchor crystal
4 satellite fragments
```

The player sees 5 beautiful pieces, not 14 tiny objects.

For a Boss:

```text
Boss reward value = 80 Credits

Visual:
1 huge hero crystal
10 satellites
2 sparkle waves
```

Do not spawn 80 objects.

---

# 12. DROP MOTION — THREE / FOUR PHASE MODEL

The motion quality is one of the main goals.

A basic:

```ts
x += (targetX - x) * 0.1;
y += (targetY - y) * 0.1;
```

is not acceptable as the final effect.

---

## 12.1 Phase A — Death Burst / Scatter

Starts at the real death impact point.

Each piece:

- gets seeded angle;
- gets seeded initial velocity;
- large pieces move slightly heavier/slower;
- small fragments can travel farther;
- slight spin;
- optional very light gravity/downward bias.

Duration:

- Common: ~0.12-0.20s
- High/Elite: ~0.16-0.28s
- Boss: ~0.28-0.45s

The player must see the reward physically leave the enemy.

---

## 12.2 Phase B — Hover / Read Beat

The pieces decelerate.

Purpose:

- allow visual recognition;
- prevent instant disappearance;
- emphasize large / boss crystal.

Duration:

- Common: extremely short, ~0.05-0.10s
- Refined/High: ~0.08-0.16s
- Elite: ~0.12-0.20s
- Boss: ~0.25-0.45s
- Major Boss: ~0.35-0.60s

Boss hero crystal should visibly “hang” after the death burst.

---

## 12.3 Phase C — Magnet Acquisition

Target every frame:

```ts
shipCenter()
```

Do not capture the ship position only at spawn time.

The ship moves / animates.

Homing should use steering acceleration:

```text
desired direction to ship
+ seeded lateral curvature
+ increasing magnet strength
```

A simple stable option:

```ts
desiredV = normalize(target - pos) * desiredSpeed
velocity += (desiredV - velocity) * steering * dt
```

Add a perpendicular curve bias that fades as distance becomes small.

This gives:

- smooth arc;
- no sharp teleport turn;
- natural convergence.

---

## 12.4 Phase D — Snap / Absorb

When inside a collect radius:

- accelerate the final few pixels;
- shrink slightly;
- brighten;
- disappear into the ship core / hull.

Do not simply delete at a fixed distance with no contact feedback.

---

# 13. MULTIPLE KILLS / MASS-KILL PRESENTATION

This must look good with:

- Chain Lightning;
- Missile Swarm;
- Ultimate;
- AoE skills;
- multi-kill perks.

Avoid all crystals beginning magnet motion on the same frame.

Each burst receives deterministic stagger:

```text
base homing delay
+ per-piece delay
+ small seeded jitter
```

This creates multiple curved streams into the ship.

For mass kills:

- preserve tier identity;
- clamp object count;
- merge low-tier bursts if necessary;
- never merge Boss / Major Boss hero crystals into ordinary shards.

---

# 14. BOSS MULTI-WAVE PICKUP

Boss pickup needs custom sequencing.

Recommended:

### Wave 0
Death explosion / existing boss sequence.

### Wave 1
Small fragments begin homing.

### Wave 2
Medium satellites begin homing 100-180 ms later.

### Wave 3
Huge anchor begins homing last.

The final anchor collection triggers:

- strongest ship pulse;
- strongest HUD pulse;
- strongest pickup chime;
- short prismatic ring;
- optional 1-frame / very short white highlight, not a full-screen flash that hurts readability.

Major Boss can use one additional inner sparkle burst before the hero crystal moves.

---

# 15. SHIP ABSORPTION FX

Every pickup must visibly connect to the ship.

Recommended layers:

1. contact spark;
2. small inward light streak;
3. local ring around ship;
4. short hull/core glow;
5. trailing particles collapse inward;
6. HUD counter reaction.

Common pickup:

- tiny spark + minimal ring.

High/Elite:

- stronger ring + short violet/cyan pulse.

Boss:

- large but brief prismatic absorption ring;
- 2-3 directional streaks;
- ship core brightens;
- no long screen obstruction.

---

# 16. PICKUP AUDIO

Pickup audio is important but must not mask pronunciation.

Requirements:

- extremely short sample/synth click/chime;
- low enough volume;
- separate from English pronunciation priority;
- pitch variation by tier;
- rate-limit during mass pickup.

Recommended progression:

```text
Common      light glass ping
Refined     brighter ping
High        ping + tiny shimmer
Elite       richer crystal chime
Boss        low chime + crystalline high sparkle
Major Boss  short layered resolution chord
```

For many Common pickups:

- do not play one loud sample per shard;
- coalesce sounds within ~60-90 ms;
- increase pitch/brightness slightly with collection streak.

---

## 16.1 Audio priority

Crystal pickup sounds must sit below pronunciation / learning voice priority.

- pronunciation is never ducked by Common pickup pings;
- Common pickup sounds coalesce in a short window;
- Elite/Boss may add a richer but short layer;
- mass pickup audio is rate-limited;
- muting SFX mutes pickup audio without affecting the reward transaction.

---

# 17. HUD CHANGE

Current combat header includes Score, Streak, Multiplier, Accuracy and Kills.

Add a Credits crystal metric near Score.

Example:

```text
SCORE       185,420
◆ CREDITS    12,480
STREAK           31
MULTI            x4
```

The icon should visually match the crystal system.

Do not label it Diamond.

Accessible name:

```text
Credits
```

---

## 17.1 HUD collection reaction

When an anchor is absorbed:

```text
12,480
   ↓
12,483
```

Animation:

- number interpolation / count-up;
- `+3` small delta near the Credits metric;
- 1.0 → 1.10/1.12 → 1.0 scale pulse;
- violet-white highlight sweep;
- stronger pulse for higher tier.

Do not create a large central popup.

---

# 18. SCORE DISPLAY CLEANUP

User explicitly requested less clutter.

### Remove:

```text
+250
+430
+780
```

floating near killed enemies.

### Keep:

- top Score metric;
- score calculation;
- multiplier;
- score-based progression;
- stage clear score;
- Result screen;
- all tests for score calculation.

### New visual hierarchy on enemy death

```text
Enemy explosion
+ Crystal reward
+ Optional translation
```

Not:

```text
Enemy explosion
+ Score popup
+ Crystal popup
+ Translation
+ Reward text
```

The crystal must become the main reward visual.

---

# 19. TRANSLATION / IPA COEXISTENCE

Current kill translation can appear near the enemy death location.

The crystal system must not make the translation unreadable.

Rules:

- crystal scatter can happen around the corpse;
- the anchor should not hover directly over translation text;
- bias initial scatter away from the translation safe strip if necessary;
- once magnet begins, crystals leave the area quickly;
- no numeric Credit popup at the corpse.

Removing kill Score popup already helps substantially.

---

# 20. RECOMMENDED MODULE ARCHITECTURE

Do not put the whole system into `Game.ts`.

Recommended files:

```text
src/rewards/combat-credit-drops.ts
src/vfx/credit-crystal-pickups.ts
src/vfx/credit-crystal-renderer.ts
```

Optional if renderer remains small:

```text
src/vfx/credit-crystal-pickups.ts
```

can own update + draw.

---

## 20.1 `combat-credit-drops.ts`

Pure logic only.

Suggested exports:

```ts
isCombatCreditDropEligible(...)
resolveCreditCrystalTier(...)
combatCreditWeight(...)
combatCreditReward(...)
creditCrystalVisualProfile(...)
```

Must be unit-testable without Canvas.

---

## 20.2 `credit-crystal-pickups.ts`

Owns transient VFX state.

Suggested class:

```ts
class CreditCrystalPickupSystem {
  spawn(input): void;
  update(dt, shipTarget): CreditCollectionEvent[];
  draw(context, quality): void;
  flush(): CreditCollectionEvent[];
  clear(): void;
}
```

No save state.

No persistent Credits state.

---

## 20.3 Game integration

`Game.ts` owns one pickup system instance.

On eligible kill:

```text
resolve reward
→ guarantee/queue economic amount
→ spawn CreditDropBurst
```

On frame update:

```text
creditPickups.update(dt, shipCenter())
```

On draw:

```text
creditPickups.draw(...)
```

Draw order should be selected so crystals are visible but do not cover typing prompts.

Recommended:

- after background/enemy body layer;
- after death FX or integrated just above it;
- before critical text / typing UI;
- trails behind crystal body;
- pickup spark can be above ship.

---

## 20.4 Hook contract

Recommended hooks:

```ts
onCombatCreditReward?(event: CombatCreditRewardEvent): void;
onCombatCreditPickupPresented?(event: CombatCreditRewardEvent): void;
```

Names may change, but **economy commit** and **visual arrival** must stay semantically separate. The VFX module must not import save/persistence state directly.

---

# 21. SHARED KILL INTEGRATION FUNCTION

Create a single function to prevent typed kills and skill kills diverging.

Concept:

```ts
private spawnCombatCreditDrop(
  source: CombatCreditDropSource,
  x: number,
  y: number,
): void
```

`CombatCreditDropSource` contains enough data to resolve tier/value.

Call from:

- normal enemy death;
- skill enemy death;
- boss defeat.

Do not call for:

- bonus targets;
- projectiles;
- supply / reward crates;
- Recall Bonus.

---

# 22. NORMAL KILL TIMING

For travelling player shot:

```text
word completed
→ kill is logically secured
→ player projectile travels
→ applyShotImpact("enemy-kill")
→ death FX
→ crystal VFX appears
```

This keeps the picture synchronized.

Do not visually spawn crystals at `completeWord()` before the final projectile lands.

Economic reward can already be guaranteed internally when kill is secured.

---

# 23. SKILL KILL TIMING

Some skill kills do not wait for a travelling shot.

For `resolveSkillEnemyKill()`:

- use the same central credit reward profile;
- spawn crystal VFX at actual skill kill/death FX position;
- if `playDeathFx === false`, still permit the crystal drop unless the caller explicitly says the kill is non-rewarding;
- do not accidentally double-spawn if a skill later routes through normal `enemy-kill` impact.

Add a kill reward transaction guard / unique enemy-id protection if necessary.

---

# 24. BOSS TIMING

In `defeatBoss()`:

- determine boss tier from role;
- coordinate crystal burst with `combatFx.bossDeath`;
- satellites can spawn at death start;
- hero crystal may become visible after a short delay;
- final hero crystal should begin magnet after the death flash has cleared enough to be readable.

Do not allow boss reward-choice dialog / stage transition to delete the effect immediately.

Options:

1. let pickup presentation continue behind the reward UI only if visually appropriate; or
2. force-complete / fast-forward boss pickup before opening reward dialog.

Recommended:

- preserve the visible boss hero-crystal beat;
- do not hard-block the player for a long fixed cinematic every boss kill;
- target roughly `0.9–1.4s` for the essential premium beat;
- allow input/fast-transition to accelerate remaining decorative satellites after that beat;
- if reward choice must open immediately, continue only non-obscuring pickup/HUD presentation or force-flush cleanly.

Claude should review current boss reward dialog timing before final implementation.

---

# 25. QUALITY LEVELS

The feature must scale by visual quality without changing economy.

Suggested maximum live visual pieces:

```text
Low       28
Medium    44
High      68
Ultra     92
```

These are starting caps.

When cap is reached:

- merge Common / Refined satellite fragments;
- keep anchor pieces;
- never discard economic reward;
- never remove Boss/Major Boss hero crystal.

---

## Low

- crystal body;
- minimal trail;
- low sparkle count;
- no extra refraction pass.

## Medium

- body + glow;
- short trail;
- small sparkle.

## High

- cleaner highlight;
- better trail;
- absorption ring;
- more sparkle;
- authored crystal art at full intended resolution.

## Ultra

- highest-quality facet highlight;
- richer but controlled trail;
- additional tiny specular glints;
- boss crystal light sweep;
- still capped.

Do not use visual quality to change Credit value.

---

# 25.1 READABILITY / REDUCED-MOTION CONTRACT

- translation / IPA has higher readability priority than decorative trails;
- crystal trails must not cover current typing text;
- screen-shake setting remains respected;
- reduced-motion may shorten scatter, reduce curvature/orbiting and repeated sparkle while preserving a quick readable magnet motion;
- Low quality must still communicate tier identity;
- quality settings never change Credit amount.

---


# NON-DESTRUCTIVE PERFORMANCE OPTIMIZATION POLICY

Performance work must optimize implementation, not cut approved reward spectacle.

## Preserve

Do not remove or materially weaken approved:

- crystal tier identity;
- mixed-size burst;
- scatter;
- hover/read beat;
- curved magnet motion;
- ship absorption;
- premium Boss/Major Boss hero crystal;
- sparkle/refraction identity;
- High/Ultra visual intent;
- economy amount.

Do not solve performance by:

```text
"too many drops"
→ hide most rewards

"Ultra is expensive"
→ silently render Medium

"boss crystal is expensive"
→ replace with small common shard
```

## Optimize first

Profile and optimize:

1. object pooling;
2. receipt vs sprite separation;
3. cached glow/light sprites;
4. shared finite palettes;
5. reused arrays;
6. draw ordering / overdraw;
7. sprite right-sizing;
8. lazy asset loading;
9. coalesced trails;
10. grouped/clustered low-tier presentation;11. DOM HUD update cadence;
12. audio voice coalescing;
13. off-screen culling;
14. redundant calculations and allocations.

## Visual cap means representation cap, not reward deletion

The cap controls expensive visual representation.

Example:

```text
30 logical low-tier receipts
→ fewer individual expensive anchors
→ several dense crystal streams/clusters
→ same total Credit value
→ same "reward shower" impression
```

Boss/Major Boss hero crystals keep reserved presentation capacity.

## High/Ultra acceptance

Measure together:

- frame p95/p99;
- slow-frame ratio;
- input latency;
- draw/update cost;
- allocation/GC;
- effective DPR/adaptive scale;
- visual sharpness;
- combined load with shots/death FX/background.

A candidate that keeps FPS only by silently collapsing DPR/visual quality is not accepted.

If a material approved visual reduction is ever proposed after profiling/optimization, it requires explicit owner approval.

---

# 26. PERFORMANCE RULES

1. No unbounded arrays.
2. No one-object-per-Credit rule.
3. Avoid `shadowBlur` per crystal every frame.
4. Prefer cached glow sprite / existing light helpers.
5. Reuse arrays / compact dead entries where practical.
6. Avoid allocating gradients for every tiny piece every frame if a cached sprite can do it.
7. Use deterministic seed rather than many `Math.random()` calls during draw.
8. Draw satellites in batches if possible.
9. Profile High and Ultra with simultaneous multi-kills.
10. Boss hero crystal may have more expensive rendering because only one exists at once.

---

# 27. COLLECTION FAILSAFES

A visual pickup must never remain forever.

Each burst needs:

- max lifetime;
- off-screen correction;
- resize-safe coordinates;
- forced magnet after timeout;
- flush behavior on:
  - stage clear;
  - boss reward transition;
  - game over;
  - back to title;
  - Test Lab reset.

If force-flushed:

- preserve economic reward;
- avoid huge delayed sound spam;
- perform a compact HUD sync.

---

# 28. TEST LAB SUPPORT

This feature needs dedicated Test Lab controls before economy balancing.

Recommended debug/test actions:

```text
Spawn Common Drop
Spawn Refined Drop
Spawn High Drop
Spawn Elite Drop
Spawn Golden Drop
Spawn Mini Boss Drop
Spawn Boss Drop
Spawn Major Boss Drop

Spawn 10 Mixed Drops
Spawn 50 Stress Drops
Collect All / Force Magnet
Clear Pickup FX
```

Allow testing with:

- all Visual Quality modes;
- different ships;
- bright / dark Worlds;
- moving ship pose;
- background effects enabled.

---

# 29. AUTOMATED TESTS

Recommended new tests:

```text
tests/combat-credit-drops.test.ts
tests/credit-crystal-pickups.test.ts
```

Coverage:

### Eligibility
- normal combat enemy → true
- elite → true
- golden → true
- boss → true
- reward-role bonus enemy → false
- SupplyPod / bonus entities never enter this path

### Tier mapping
- Rank I → Common
- Rank IV → Refined
- Rank VII → High
- elite overrides rank
- golden overrides ordinary tier
- mini-boss overrides elite
- boss overrides mini-boss
- major-boss highest

### Economy
- non-negative integer Credits
- stage scaling bounded
- multiplier applied once
- x2 does not double twice
- no duplicate reward for one enemy id

### Runtime
- scatter → hover → magnet → collected
- target follows moving ship
- max lifetime flushes
- collection event emitted once
- object cap does not lose value

### Score cleanup
- killing an enemy still raises score
- no kill-score popup state is created

---

# 30. VISUAL ACCEPTANCE CRITERIA

Do not mark complete only because the numbers work.

### Common enemy

PASS only if:

- death visibly releases multiple mixed-size purple crystals;
- crystals can be distinguished from death particles;
- there is a visible scatter beat;
- homing path is curved and smooth;
- collection contact is readable;
- no floating `+score` appears.

### High-rank enemy

PASS only if:

- crystal shape / color / size is clearly more premium than Common;
- the player can recognize the tier without reading text.

### Elite / Golden

PASS only if:

- at least one large anchor is obvious;
- collection effect is stronger;
- Golden variation does not look like a plain coin.

### Boss

PASS only if:

- one crystal is dramatically larger than ordinary drops;
- the hero crystal is visible long enough to appreciate;
- satellites and hero crystal arrive in waves;
- final absorption is visibly special;
- it remains readable on at least one bright and one dark background.

### Major Boss

PASS only if:

- visually exceeds ordinary Boss;
- does not look like simply `boss.png` scaled 1.2x;
- final collection is a memorable event without covering typing UI for too long.

---

# 31. UX / CLUTTER ACCEPTANCE

At a normal combat kill, the battlefield should show roughly:

```text
death FX
credit crystals
translation / IPA if enabled
```

It should NOT show:

```text
death FX
+score
+credits text at corpse
reward label
translation
multiple overlapping particle messages
```

Top HUD handles numbers.

Combat space handles physical reward motion.

---

# 32. PROPOSED IMPLEMENTATION ORDER

## Phase A — Code audit and contracts

1. Refresh branch.
2. Confirm every kill path.
3. Confirm current bonus-target paths.
4. Confirm every `role: "reward"` enemy.
5. Confirm Score popup has no other required caller.
6. Define pure drop tier/value API.

No VFX yet.

---

## Phase B — Visual prototype in Test Lab

1. Implement pickup runtime.
2. Use temporary procedural crystal only for motion validation.
3. Implement:
   - scatter;
   - hover;
   - magnet;
   - curve;
   - absorb.
4. Add stress test.

Do not tune economy from a bad visual prototype.

---

## Phase C — Production crystal art

1. Prepare authored art by tier.
2. Add `pnpm pickups:prepare`.
3. Add runtime mapping.
4. Replace prototype geometry.
5. Test bright/dark Worlds.

---

## Phase D — Integrate real enemy kills

1. Typed kill impact.
2. Skill kills.
3. Elite / Golden.
4. Mini Boss.
5. Boss / Major Boss.
6. Bonus exclusions.

---

## Phase E — HUD and Score cleanup

1. Add Credits crystal metric beside Score.
2. Add collection count/pulse.
3. Remove floating kill Score popup.
4. Keep top Score.
5. Confirm translation no longer overlaps score text.

---

## Phase F — Economy rebalancing

1. Measure current Credits per stage.
2. Measure new combat Credits per stage.
3. Reduce only the overlapping base stage-clear portion.
4. Preserve performance / objective / checkpoint incentives.
5. Run 1000-stage economy simulation / sample bands.

Recommended sampling:

```text
Stages 1-20
100-120
250-270
500-520
750-770
980-1000
```

---

## Phase G — High / Ultra polish

1. Refraction / specular quality.
2. Better boss hero crystal.
3. Pickup sound mix.
4. Max simultaneous kill stress.
5. No regression to FPS / typing input latency.

---

# 32.1 IMPLEMENTATION ACCEPTANCE GATES

### Economy gate
- one eligible kill creates one authoritative transaction;
- duplicate callbacks cannot duplicate Credits;
- every eligible kill grants at least 1 Credit;
- stage economy remains inside an approved tuning range after simulation.

### VFX gate
- Common / High / Elite / Boss are recognizable without reading text;
- Boss hero crystal is not only a scaled Common asset;
- homing is curved and smooth;
- ship absorption is visible.

### UI gate
- floating kill Score is gone;
- top Score remains correct;
- Credits HUD updates cleanly;
- translation / IPA remains readable.

### Performance gate
- mass-kill stress passes on High/Ultra;
- cap merging never loses Credit value;
- typing input latency does not regress.

### Transition gate
- stage clear, game over, pause, resize and boss reward UI never lose or duplicate rewards.

---

# 33. FILES LIKELY TO CHANGE

Expected existing files:

```text
src/Game.ts
src/main.ts
index.html
src/styles.css
package.json
```

Likely new files:

```text
src/rewards/combat-credit-drops.ts
src/vfx/credit-crystal-pickups.ts
src/vfx/credit-crystal-renderer.ts   # optional if worth splitting
scripts/.../prepare-credit-pickups.mjs
tests/combat-credit-drops.test.ts
tests/credit-crystal-pickups.test.ts
```

Source art:

```text
art-src/pickups/credits/*
```

Runtime assets:

```text
src/assets/pickups/credits/*
```

Potential removal after confirming no other callers:

```text
src/combat/score-popup.ts
```

Do not delete until grep/tests confirm it is now fully unused.

---

# 34. DO NOT DO

Do not:

- add a new `diamondCurrency`;
- rename Credits to Diamond;
- make equipment Diamond grade and currency share the same meaning;
- drop crystals from bonus/reward-only targets;
- show floating kill Score beside the new pickup FX;
- render one crystal for every Credit;
- make all tiers the same shape with only a color swap;
- make boss drop just 10 tiny Common crystals;
- use a flat emoji;
- immediately teleport drops to ship;
- move in a straight constant-speed line;
- wait indefinitely for pickups before stage clear;
- let VFX loss cause economy loss;
- let x2 multipliers apply twice;
- use Ultra as justification for unlimited particles;
- introduce a second Credits save state;
- break existing boss reward-choice / equipment-drop systems.

---

# 35. CLAUDE REVIEW QUESTIONS

Claude should explicitly answer these before implementation.

1. Are all current combat enemy kill paths covered by one centralized drop request?
2. Are `role: "reward"` enemies correctly treated as bonus/no-credit-drop targets?
3. Is persistent Credits accounting guaranteed even if the VFX is interrupted?
4. Where is the best authoritative transaction point for combat Credits in the current save/checkpoint architecture?
5. How should existing stage-clear base Credits be reduced so total expected economy remains close to current?
6. Can `credits-x2` reuse the same multiplier without duplication?
7. Can the current light-sprite helpers be reused for crystal glow/trails?
8. Is a separate renderer file justified or is one VFX module enough?
9. Does the boss reward dialog currently open too quickly for a 1.2-1.8s boss crystal sequence?
10. Can the kill Score popup module be completely removed after this change?
11. What hard cap gives stable High/Ultra performance during mass kills?
12. Is an authored PNG/WebP set per tier preferable to a tiny sprite sheet in the current Vite pipeline?

---

# 36. FINAL TARGET EXPERIENCE

Normal kill:

```text
typing completes
→ final projectile lands
→ enemy explodes
→ 2-4 purple faceted crystals scatter
→ short hover
→ curved magnet pull to ship
→ tiny absorption spark
→ Credits HUD pulses / counts
```

High-rank kill:

```text
larger / brighter / differently shaped crystal bundle
→ richer trail
→ stronger collection pulse
```

Elite / Golden:

```text
large anchor + satellites
→ premium color treatment
→ stronger chime / absorption
```

Boss:

```text
large boss death
→ crystal shower
→ giant polished hero crystal appears
→ satellites home in waves
→ giant crystal accelerates toward ship
→ prismatic absorption pulse
→ Credits HUD receives strong premium pulse
```

Major Boss:

```text
everything above
+ largest hero crystal
+ richer facet / sparkle treatment
+ multiple collection waves
+ strongest final ship absorption signature
```

The desired feeling is:

> **The player does not merely see a number increase. The player sees the reward physically explode out of the enemy, travel through the battlefield, and become absorbed by the ship.**

That physical reward loop should become one of Space Typing's signature combat feedback systems.