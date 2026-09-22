# M11 — Enemy Skill / Effect Framework + Threat Budget

M11 adds one bounded enemy-skill layer on top of the existing Game, EnemyKind, M09 World roster, M10 Rank/layers, status engine and existing projectile/support behaviors.

It does not create a second combat engine or a second status system.

## Enemy skill categories

The shared enemy skill registry uses four categories:

- Attack
- Defense
- Control
- Support

Current reusable contracts include:

Attack:
- Pulse Shot;
- Burst Volley;
- Sniper Shot;
- Drain Pulse.

Defense:
- Barrier Shell.

Control:
- Signal Jam;
- Frost Lock;
- Silence Field;
- Curse Mark;
- Bind Field.

Support:
- Repair Wave;
- Summon Scout.

These contracts resolve once when the enemy spawns.

## World-specific skill language

World skill pools derive from the canonical M07 World families.

Examples:

- Rainbow -> Pulse Shot / Barrier Shell;
- Angel -> Barrier / Repair / Silence;
- Devil -> Burst / Curse / Drain;
- Frost -> Frost Lock / Barrier / Bind;
- Prism -> Pulse / Jam / Barrier;
- Nature -> Repair / Bind / Summon;
- Shadow -> Jam / Silence / Curse;
- Cosmic -> Sniper / Drain / Silence.

No second World registry is introduced.

## Archetype signature skills

M11 preserves the mechanic identity already present in EnemyKind.

Examples:

- Carrier -> Summon Scout;
- Jammer -> Signal Jam;
- Healer -> Repair Wave;
- Sniper -> Sniper Shot;
- Leech -> Drain Pulse;
- Tank / Shield -> Barrier Shell.

The resolver keeps the archetype signature first when it is Rank-eligible, then adds World-authored skills only while the Threat Budget remains valid.

## Runtime resolution

Each enemy may carry:

- resolved skill ids;
- next skill index;
- pending telegraphed skill;
- telegraph timer;
- resolved Threat Budget.

M11 reuses the M10 Rank, WordDifficultyScore and layer count as inputs.

The runtime profile is resolved at enemy spawn and consumed cheaply during combat.

Carrier children and Splitter fragments use the same path.

## Telegraph lifecycle

Enemy skill execution is:

```text
cooldown
-> choose resolved skill
-> visible telegraph
-> execute
-> cooldown
```

The enemy word UI shows the pending skill name while the telegraph is active.

Warning SFX uses the existing warning path.

Strong control skills therefore do not appear without warning.

## Fair control behavior

M11 uses the existing status engine.

### Freeze

- short visible typing lock;
- no fake keyboard latency;
- no dropped-key miss penalty;
- explicit FROZEN overlay and timer;
- Ward may resist application;
- hard-CC guard prevents overlap;
- post-Freeze immunity prevents chain locking.

### Silence

- ordinary typing remains available;
- only player skill activation is blocked;
- UI returns an explicit Silenced reason;
- visible SILENCED overlay and timer;
- Ward may resist application;
- hard-CC anti-chain and post-effect immunity apply.

### Jam / Bind

These use the existing readable Jam presentation rather than corrupting the actual answer.

### Curse / Drain

These reuse existing status/resource behavior.

## Hard-CC anti-chain

The hard-CC guard tracks:

- one active hard CC at a time;
- remaining duration;
- per-effect immunity timers after expiration.

Current hard CC ids:

- Freeze;
- Silence.

Rules:

- Freeze and Silence cannot overlap;
- the same effect cannot immediately reapply after expiration;
- immunity timers never become negative;
- resisted CC does not consume the guard;
- cleanses do not enable immediate chain abuse because the guard remains conservative until its bounded window expires.

## Difficulty interaction

M11 does not replace the current global difficulty framework; M12 owns that work.

Current safety behavior already scales from the existing DifficultyProfile:

- lower combat pressure -> longer enemy skill cooldowns;
- lower combat pressure -> longer telegraphs;
- lower combat pressure -> shorter CC duration;
- higher pressure remains bounded.

M12 may replace the global mode vocabulary and pressure scheduler but must keep these fairness invariants.

## Threat Budget

Each runtime enemy profile receives a bounded budget distributed across:

- Attack;
- Defense;
- Speed;
- Control;
- Support;
- Typing Difficulty;
- Layer Count;
- Urgency.

Inputs include:

- EnemyKind;
- M10 Rank;
- Elite state;
- WordDifficultyScore;
- typing layers;
- selected skills.

Skill selection is greedy and bounded:

1. start with archetype + M10 pressure;
2. consider signature / World skills;
3. calculate candidate budget;
4. reject a candidate if the audit fails;
5. keep at most the Rank-appropriate bounded skill count.

Normal enemies receive stricter multi-axis checks than Elite enemies.

## Threat audit

The audit rejects:

- total used budget above cap;
- normal enemies with too many simultaneous high-threat axes;
- high Control combined with both high Speed and high Defense.

Automated tests sweep representative Worlds, all EnemyKinds and all Rank I-X values and require the production resolver to stay inside budget.

Bosses remain on the existing BossState path and may exceed normal-enemy budgets by authored phase design.

## Existing mechanic reuse

Skill effects call existing Game behaviors where possible:

- projectile firing;
- support reinforcement;
- Carrier child spawning;
- Leech drain;
- status application;
- M10 semantic layer reinforcement;
- SFX/VFX.

This keeps the skill framework as orchestration/contracts rather than duplicate mechanics.

## Persistence

No PlayerSave schema change is required.

Enemy skill/threat/CC state is encounter runtime state.

Checkpoint, crash recovery and death rollback continue to persist only the existing safe persistent domains.

## Performance

M11 follows the resolve-once rule:

At spawn:
- resolve skill set;
- calculate Threat Budget.

During combat:
- decrement bounded cooldown/telegraph numbers;
- execute an already-resolved skill;
- do not scan World/skill registries per frame.

## Validation

Automated coverage verifies:

- all four skill categories exist;
- skill cooldown/telegraph/Rank contracts are valid;
- World pools vary by canonical World families;
- archetype signature mappings remain stable;
- Freeze/Silence are marked hard CC with immunity;
- all required Threat Budget axes exist;
- obvious impossible normal combinations fail audit;
- production runtime profiles remain inside budget across representative Worlds, all EnemyKinds and Rank I-X;
- Elite profiles remain bounded;
- hard CC cannot overlap;
- post-effect immunity blocks immediate reapplication;
- CC timers remain non-negative.

M12 owns Active Typing Pressure, urgent-threat caps and the expanded global difficulty scheduler.
