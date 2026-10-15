# Credit Crystal FINAL V3 — 1000-Stage Economy Reference Audit (2026-10-01)

Branch: `feat/bgv-integration-current`

## Scope

This closes the measurement part of FINAL V3 Phase F without inventing an owner-approved economy target.

Reference assumptions are intentionally simple and reproducible:

- Campaign stage configuration from the current 1–1000 stage runtime.
- 94% accuracy.
- 0 Salvage.
- 1.0x Credits multiplier.
- Every regular enemy is sampled as a Common crystal source.
- Boss stages include the real Mini Boss / Boss / Major Boss weight.
- Performance, objective, checkpoint and other non-overlapping bonus rewards are excluded.
- The sample measures only the interaction between the old stage-base Credits target and the new per-kill Combat Credit layer.

This is a reference model, not a claim that every live stage has only Common enemies.

## FINAL V3 invariants verified

Across stages 1–1000:

1. Every expected eligible combat kill can still receive at least 1 Credit.
2. Combat reward values remain finite and non-negative.
3. Stage settlement never reduces the combined overlapping base below the old stage-base target.
4. From stage 111 onward, the sampled Combat Credit layer fits inside the stage-base target and settlement exactly restores the old target instead of double-paying it.
5. No gameplay enemy count, visual effect, High/Ultra quality feature, or reward pickup effect was cut to satisfy the economy check.

Automated coverage: `tests/combat-credit-economy-sampling.test.ts`.

## Required FINAL V3 sample windows

| Stage window | Old base total | Sampled combat Credits | Settlement Credits | Combined overlapping total | Combined / old base |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1–20 | 658 | 969 | 0 | 969 | 1.4726x |
| 100–120 | 2,271 | 2,199 | 92 | 2,291 | 1.0088x |
| 250–270 | 4,652 | 2,389 | 2,263 | 4,652 | 1.0000x |
| 500–520 | 8,621 | 4,133 | 4,488 | 8,621 | 1.0000x |
| 750–770 | 12,590 | 6,029 | 6,561 | 12,590 | 1.0000x |
| 980–1000 | 16,240 | 8,106 | 8,134 | 16,240 | 1.0000x |

## Important finding: early-stage floor pressure

Stages 1–110 can have more expected eligible kills than the old stage-base Credits target.

Because FINAL V3 explicitly requires every eligible kill to grant at least 1 Credit, the old base cannot always be preserved exactly in those stages without changing another approved rule.

In the requested 1–20 sample window:

- old stage-base total: 658;
- expected eligible kills / sampled minimum combat Credits: 969;
- combined overlapping total: 969;
- reference increase: about 47.3%.

The highest single-stage reference ratio in this window is about 1.6585x.

This is not a performance bug and should not be "fixed" by cutting enemies or crystal VFX. It is an economy-policy decision caused by the minimum-one-per-kill rule versus the old early-stage base.

## Decision boundary

No economy tuning constant is changed by this audit because FINAL V3 does not define an approved acceptable inflation band.

If the early-stage increase is accepted, the current implementation can remain unchanged.

If it is not accepted, the owner must choose which economy contract changes. The code should then be tuned explicitly rather than silently reducing enemy count, suppressing eligible kills, or removing visual effects.

## Remaining manual acceptance

The remaining Credit Crystal acceptance item is browser High/Ultra visual-performance capture with the existing 50-drop stress controls. The automated performance and bounded-pickup gates remain in place; this manual capture is for real rendered quality/input-latency confirmation.
