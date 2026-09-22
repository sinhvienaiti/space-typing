# M13 — Formation System

M13 adds authored multi-enemy encounter packages on top of the M12 Active Typing Pressure scheduler.

A formation is one atomic encounter package. Its members are not independently admitted and then combined after the fact.

## Authored packages

The initial registry contains:

- Bulwark Recovery — Tank + Healer;
- Command Wing — Commander + two Scouts;
- Guarded Marksman — Shield + Sniper;
- Lock and Strike — Jammer + Cloaker;
- Summoner Screen — Carrier + two Scouts.

Each definition has:

- stable formation id;
- display name;
- minimum Campaign stage;
- minimum difficulty formation-complexity tier;
- weighted selection value;
- coordination pressure overhead;
- urgent-threat reserve;
- authored member kinds;
- relative spawn offsets.

## Availability

A formation may be considered only when:

- all authored members fit inside remaining Campaign enemy budget;
- the current stage is at/after the formation minimum stage;
- the current M12 formation complexity reaches the authored minimum;
- the stage role allows random formations.

Random formations are disabled for:

- Elite stages;
- Mini Boss stages;
- World Boss stages;
- Galaxy Major Boss stages.

Normal, Special, Hazard and Gauntlet stages may use them, with a bounded role bonus for Gauntlet/Special/Hazard.

Relax currently has formation complexity 1 and therefore receives no authored formation packages.

## Aggregate admission

M13 extends the M12 admission layer rather than creating a second scheduler.

Before any member is spawned, the complete package is checked against:

- active enemy count + full formation size;
- M12 max-enemy cap;
- current Active Typing Pressure;
- sum of member pressure reserves;
- formation coordination overhead;
- current urgent-threat count;
- authored formation urgent reserve;
- M12 urgent-threat cap;
- current controller/support count;
- number of controller/support members in the full formation;
- M12 controller/support cap;
- M12 formation complexity.

If any check fails, the entire formation is denied.

## Atomic spawn

Production flow is:

```text
spawn timer ready
-> optionally roll formation attempt
-> resolve one authored package
-> validate complete aggregate package
-> spawn all members
-> decrement Campaign enemy budget by package size
```

If package creation fails unexpectedly after it begins, newly created formation enemies are rolled back as a group.

A denied or failed formation does not consume Campaign enemy budget.

If no formation is selected or admitted, the existing M12 solo spawn path runs normally.

## Member behavior

Formation members reuse the production enemy path:

- existing EnemyKind mechanics;
- M09 World enemy visual/definition mapping;
- M10 Rank + WordDifficultyScore + semantic typing layers;
- M11 skill resolution + Threat Budget;
- M12 word-score bias and difficulty timing.

Formation members are intentionally not silently converted into random Elite or Golden enemies. Package pressure must stay predictable.

The regular Elite/Golden solo systems remain unchanged outside formation-member spawning.

## World compatibility

M13 does not create a second World roster.

Each formation member still resolves its production visual definition through the M09 World roster mapper, so the visible enemy family remains valid for the current World.

The mechanic kind remains the shared EnemyKind contract already used by solo spawns.

## Selection

Eligible packages use bounded weighted random selection.

The resolver accepts an injectable RNG callback for deterministic tests.

Runtime uses Math.random through that callback contract.

## Difficulty interaction

Formation frequency is intentionally bounded.

Base chance rises with M12 formation complexity and is capped. Special/Hazard/Gauntlet roles may add a small bounded bonus.

Difficulty changes how often/complex a formation can be; it does not bypass aggregate pressure feasibility.

Even Impossible mode must still pass the pressure, urgent, support-density and active-enemy caps.

## Performance

Formation evaluation occurs only at spawn-attempt boundaries.

The registry is small and static.

Aggregate cost is proportional to the authored package size (currently 2–3 members), not the number of all possible combinations.

No formation registry scan is added to the frame/render loop.

## Persistence

No PlayerSave schema change is required.

Formation selection and live membership are encounter-runtime state.

Checkpoint/death/crash semantics continue to persist the existing Campaign domains only.

## Validation

Automated coverage verifies:

- registry structural validity;
- stable formation ids;
- every package has 2–4 members;
- member availability at the formation minimum stage;
- stage/complexity unlock behavior;
- remaining enemy-budget filtering;
- deterministic weighted selection through injected RNG;
- boss/Elite-stage formation disablement;
- Relax formation disablement;
- bounded role-based formation attempt chance;
- aggregate pressure rejection;
- full-package max-enemy rejection;
- urgent-threat rejection;
- controller/support-density rejection;
- complexity rejection;
- each authored package is feasible in an empty encounter at its intended difficulty tier.

CI #242 passes Test + Build after fixing the RNG callback/signature issue found by CI #240/#241.

M14 owns Branching Route Map + Station and persisted route/shop state. It must preserve the current Campaign/checkpoint/crash-recovery model rather than creating an independent save domain.
