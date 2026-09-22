# M10 — Enemy Rank I–X, WordDifficultyScore and Typing Layers

M10 adds the first combat layer that combines authored World progression, vocabulary difficulty and enemy mechanics into a visible Enemy Rank.

The implementation reuses the existing M09 World roster, EnemyKind mechanics, vocabulary source, rendering pipeline and enemy typing flow. It does not create a second enemy runtime or a second vocabulary source.

## Enemy Rank I–X

The runtime ranks are:

- Rank I
- Rank II
- Rank III
- Rank IV
- Rank V
- Rank VI
- Rank VII
- Rank VIII
- Rank IX
- Rank X

The authoritative World band comes from:

```text
WorldProfile.rankDistribution
```

M09 already exposes that distribution through `worldRankDistributionForStage(stage)`.

M10 samples that authored band and then adjusts the final Rank using:

- actual WordDifficultyScore;
- EnemyKind mechanical pressure;
- Elite state;
- minimum typing-layer pressure.

This means Rank is not a disguise for HP and is not derived from word length alone.

## Rank resolution

The authored World band is dominant.

The final resolver combines:

```text
World rank band
+ word difficulty pressure
+ EnemyKind pressure
+ Elite pressure
+ typing-layer floor
```

A 3-layer enemy must resolve to at least Rank VII.

A 2-layer enemy must resolve to at least Rank IV.

The final value is clamped to Rank I–X.

## WordDifficultyScore

`src/enemies/word-difficulty.ts` computes a deterministic score in the 0–100 range.

Current inputs are only fields/data the project actually has:

- selected vocabulary level;
- normalized character count;
- token count;
- spelling-pattern pressure;
- awkward letter-transition pressure.

The current `VocabularyEntry` schema contains:

```text
id
en
vi
ipa
```

It does not contain frequency metadata. M10 therefore does not invent or fake a frequency score. If corpus frequency data is added later, it can extend WordDifficultyScore explicitly.

Word selection remains inside the current configured vocabulary source. M10 never switches to a hidden vocabulary list.

## Rank-aware word selection

Each Rank maps to a target difficulty band.

When an enemy is created:

1. sample the current World's rank distribution;
2. combine the sampled band with mechanical pressure;
3. pick a nearby word from the current configured vocabulary;
4. compute the real WordDifficultyScore;
5. resolve the final Rank;
6. if needed, repick once from the final Rank band.

The repick is bounded to avoid spawn-time search loops.

## Semantic typing layers

M10 formalizes the existing `layersRemaining` mechanic.

Layer identities are:

- Shield
- Armor
- Ward
- Spell Barrier
- Core

The default Rank bands are:

```text
Rank I–III  -> 1 layer
Rank IV–VI  -> 2 layers
Rank VII–X  -> 3 layers
```

Existing Elite/event mechanics can impose a higher minimum layer count, capped at three.

Layer plans vary by EnemyKind.

Examples:

```text
Scout, 1 layer:
Core

Tank, 2 layers:
Shield -> Core

Jammer, 3 layers:
Ward -> Armor -> Core

Healer, 3 layers:
Spell Barrier -> Armor -> Core
```

## One complete word per layer

A layer is not one segment of a word.

The runtime contract is:

```text
Layer 1 -> complete word A
Layer 2 -> complete word B
Layer 3 -> complete word C
```

When the player finishes the current word and more layers remain:

- exactly one layer is cleared;
- typing progress resets to zero;
- a new complete vocabulary entry is selected from the same configured source;
- the new entry is selected near the enemy's Rank difficulty target;
- the enemy remains alive until the final Core word is completed.

This preserves the existing target-lock typing flow while making 2/3-layer enemies materially different.

## Layer reinforcement

The existing Healer reinforcement system remains active.

M10 makes reinforcement layer-aware:

- a one-layer target can gain an appropriate outer layer;
- a two-layer target can be reinforced up to three active layers;
- the layer plan never exceeds three;
- semantic layer identity remains coherent.

## Runtime Enemy state

Encounter enemies may now carry:

- `rank`;
- `wordDifficultyScore`;
- `layerPlan`;
- existing `layersRemaining`.

These are encounter-runtime fields only.

No PlayerSave schema change is required.

## Child spawns

M10 also closes an M09 integration gap.

Carrier children and Splitter fragments previously hardcoded:

```text
rainbow-scout
```

They now resolve through:

- the current M09 World roster;
- the M10 Rank/word/layer pipeline.

This prevents child spawns from escaping the current World's visual identity.

## Enemy typing UI

The existing enemy word panel now also renders:

- Rank label;
- current semantic layer name;
- a fixed three-segment layer indicator.

Segment states distinguish:

- inactive;
- cleared;
- current;
- pending.

The indicator is drawn inside the existing Canvas path. It does not add per-enemy DOM nodes.

## Performance

M10 avoids hot-loop corpus scans.

Rank/word/layer composition happens when an enemy or child enemy spawns, and once per completed layer when a new word is needed.

The word selector sorts only the current configured vocabulary source at those discrete transition points and selects from a small nearest-score band.

The frame renderer consumes already-resolved Rank/layer state.

## Compatibility

M10 preserves:

- M09 World enemy identity;
- existing EnemyKind movement/action mechanics;
- Elite modifiers;
- reward-enemy effects;
- target lock;
- pronunciation hooks;
- SFX/VFX;
- enemy renderer;
- Campaign persistence.

Legacy enemies created by tests or older runtime helpers without M10 metadata still render safely through fallback Rank I / inferred layer plans.

## Validation

Automated coverage verifies:

- exactly ten ordered ranks;
- World-authored rank distributions across Campaign stages;
- World band + word + archetype + Elite + layer-floor Rank resolution;
- Rank I–III / IV–VI / VII–X layer bands;
- semantic layer plans by EnemyKind;
- layer segment progression;
- reinforcement without exceeding the three-layer cap;
- deterministic bounded WordDifficultyScore;
- vocabulary-level influence;
- character/token/spelling pressure;
- rank-aware selection staying inside the configured vocabulary source;
- spawn-time EnemyTypingProfile composition.

M11 is the next milestone and should consume the M10 Rank/layer runtime instead of introducing another enemy difficulty axis.
