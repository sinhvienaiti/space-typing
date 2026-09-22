# M12 — Difficulty + Active Typing Pressure Scheduler

M12 replaces the old count-first difficulty model with six explicit player-facing difficulty modes and a bounded Active Typing Pressure admission layer.

The implementation extends the existing Campaign difficulty, Game spawn path, M10 Rank/word layers and M11 Threat Budget. It does not create a second combat scheduler or another enemy runtime.

## Primary difficulty modes

The six fixed modes are:

| Mode | Recommended WPM |
| --- | ---: |
| Relax | 10–30 |
| Balanced | 40–70 |
| Hard | 70–100 |
| Extreme | 100–140 |
| Nightmare | 150–200 |
| Impossible | 250–300 |

Adaptive and Custom remain available.

Recommended WPM is guidance, not Campaign access control.

## Legacy settings migration

Difficulty settings remain a local runtime preference rather than PlayerSave data.

Old stored ids migrate as:

```text
relaxed -> relax
normal  -> balanced
expert  -> extreme
hard    -> hard
```

Adaptive/Custom WPM sanitization now supports the complete 10–300 WPM design range.

No PlayerSave schema change is required.

## Multi-dimensional difficulty

Each resolved mode supplies explicit bounds/contracts for:

- max active enemies;
- urgent-threat cap;
- pressure budget;
- spawn interval;
- enemy attack interval;
- projectile pressure;
- word-score offset inside the current Rank band;
- controller/support density;
- hard-CC duration;
- post-CC immunity;
- boss aggression;
- Hidden Challenge multiplier contract;
- reward multiplier;
- minimum reaction window;
- formation complexity.

Difficulty is therefore not one speed/HP multiplier.

## Rank and vocabulary compatibility

M09 World roster and M10 World Rank distribution remain authoritative.

Difficulty does not unlock or remove enemy families or Ranks.

A lower mode may still encounter a late Rank X enemy. It reduces pressure through:

- fewer simultaneous threats;
- lower urgent-threat cap;
- longer attack intervals;
- longer reaction windows;
- shorter hard CC;
- longer CC immunity;
- easier word selection inside the same configured vocabulary source and Rank band.

The word-score offset is applied only after Rank resolution so changing difficulty cannot silently rewrite authored World Rank access.

## Active Typing Pressure

Enemy count alone is no longer sufficient for regular spawn admission.

`src/campaign/active-pressure.ts` estimates pressure from:

- remaining required characters;
- remaining layers;
- target WPM;
- fair reaction window;
- time-to-impact;
- pending skill cast/telegraph deadline;
- projectile urgency;
- CC severity;
- support/controller priority;
- M11 Threat Budget usage.

The standard project typing-time approximation remains:

```text
typing seconds ~= character count * 12 / WPM
```

M12 adds layer overhead and reaction/acquisition pressure around that estimate.

## Urgent threats

A threat becomes urgent when its typing workload/cast/impact window approaches or exceeds the available reaction time, or when strong CC/projectile pressure is already imminent.

Each difficulty has an explicit urgent-threat cap.

The scheduler refuses new regular spawns while that cap is reached.

## Controller/support density

Controller/support archetypes are counted separately from total enemies.

Current bounded kinds include:

- Oppressor;
- Carrier;
- Jammer;
- Healer;
- Leech;
- Commander.

Each mode defines a maximum simultaneous controller/support density.

A denied controller roll may safely fall back to Scout only if the Scout also passes the same total pressure and urgent-threat gates.

## Spawn admission

Regular Campaign spawn flow is now:

```text
spawn timer ready
-> choose intended EnemyKind
-> snapshot live Active Typing Pressure
-> project new-spawn reserve
-> check pressure budget
-> check urgent-threat cap
-> check controller/support cap
-> admit or deny
```

If denied:

- `spawnRemaining` is not decremented;
- no stage enemy is silently skipped;
- the scheduler waits a short bounded retry interval;
- admission is re-evaluated after live pressure changes.

This keeps stage enemy budgets deterministic while preventing impossible piles.

## Child/summoned enemies

Carrier children and Splitter fragments also pass through pressure admission.

They do not bypass:

- total Active Typing Pressure;
- urgent-threat cap;
- controller/support cap.

M13 formation packages must reuse the same aggregate admission contracts.

## Live pressure snapshot

The Game snapshot is computed only at spawn/admission boundaries, not every animation frame.

It reads already-resolved encounter state:

- current enemy word progress;
- M10 layer count;
- enemy position/speed;
- M11 pending skill/telegraph;
- M11 Threat Budget;
- active projectile owner/count and time-to-impact;
- current boss phase/action deadline.

The active collections are already hard bounded by gameplay limits.

## M11 interaction

Enemy skill cadence now consumes M12 dimensions:

- attack interval factor;
- reaction-window telegraph floor;
- hard-CC duration factor;
- CC immunity factor.

M11 hard-CC anti-chain remains authoritative.

No fake keyboard lag, dropped keys or invisible input rejection is introduced.

## Difficulty screen

Settings now shows:

- recommended WPM;
- enemy density;
- CC pressure;
- reaction window;
- formation complexity;
- reward multiplier.

The screen also keeps:

- Adaptive profile;
- Custom target WPM;
- Custom pressure.

## Rewards

The stage-start DifficultyProfile is frozen for the encounter.

On stage clear, its reward multiplier applies to:

- Credits;
- Alloy;
- Star Crystal;
- Quantum Core.

Positive rare-currency rewards remain at least one unit when the multiplier is below 1 so Relax does not erase a legitimate boss reward.

The multiplier is taken from the actual stage-start profile, not a newly updated Adaptive profile after clear.

## Performance

M12 avoids a new per-frame scheduler scan.

Active pressure is evaluated at:

- regular spawn attempts;
- Carrier summon attempts;
- Splitter fragment attempts.

The combat frame loop continues to consume already-resolved enemy state.

## Validation

Automated coverage verifies:

- exactly six primary fixed modes;
- documented WPM bands;
- increasing bounded pressure/reward dimensions;
- Adaptive/Custom remain within global caps;
- legacy mode-id migration;
- Adaptive WPM sanitization through 300 WPM;
- all difficulty-screen presentation fields;
- Active Typing Pressure grows as typing work exceeds impact/cast windows;
- low-pressure admission succeeds;
- urgent-threat cap blocks new spawns;
- controller/support cap blocks unsafe density;
- projected pressure can block spawn before raw max-enemy count;
- higher modes receive larger but still bounded pressure budgets;
- in-Rank word bias stays inside the configured vocabulary source;
- all 1000 Campaign difficulty values remain finite and clamped;
- early/later balance audits use Balanced as the reference mode.

CI #235 passes Test + Build.

M13 owns authored formation packages and aggregate formation-budget validation. It must reuse M12 pressure admission rather than independently spawning formation members.
