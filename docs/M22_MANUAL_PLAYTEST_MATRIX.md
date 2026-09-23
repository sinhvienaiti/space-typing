# M22 — Manual Browser / Audio / Visual Playtest Matrix

Status: **PENDING REAL BROWSER / AUDIO DEVICE EXECUTION**.

This matrix is the final non-automatable gate for M22.

Use the M21 **Developer Test Lab** whenever possible so testing stays isolated from PlayerSave.

## General recording rule

For each row record:

- PASS / FAIL;
- browser/device;
- stage / World / difficulty;
- WPM/accuracy target if applicable;
- observed issue;
- reproducible steps;
- screenshot/video/audio note when useful.

A failed row must become a code/content fix and be re-tested before M22 is marked COMPLETE.

## Difficulty and typing pace

| Scenario | Setup | Pass criteria | Status |
| --- | --- | --- | --- |
| Relax | early + late World, 10-30 WPM | readable, enough reaction time, no pressure pile that feels unavoidable | PENDING |
| Balanced | early/mid/late, 40-70 WPM | normal reference experience, clear prioritization | PENDING |
| Hard | mid/late, 70-100 WPM | meaningfully harder without input unfairness | PENDING |
| Extreme | late World, 100-140 WPM | strong pressure but threats remain readable | PENDING |
| Nightmare | late World, 150-200 WPM | high density remains understandable | PENDING |
| Impossible | Stage 900+, 250-300 WPM | intentionally extreme but still obeys visible rules/caps | PENDING |
| Adaptive low | ~25 WPM / ~88% | visibly backs pressure down | PENDING |
| Adaptive mid | ~60 WPM / ~96% | centered pressure | PENDING |
| Adaptive high | 100+ WPM / 99%+ | increases pressure without impossible overlap | PENDING |

## World / enemy composition

| Scenario | Setup | Pass criteria | Status |
| --- | --- | --- | --- |
| Early World | World 01-05 | target text and visuals clear | PENDING |
| Mid World | World 20-30 | distinct identity from early game | PENDING |
| Late World | World 46-50 | dense visuals remain readable | PENDING |
| Controller-heavy | spawn Jammer/Controller mix | player understands CC source and duration | PENDING |
| Support-heavy | Healer/Carrier/Commander mix | support relationships are understandable | PENDING |
| Rank VII-X | Rank X + 3 layers preset | Rank/layer progression visually obvious | PENDING |
| Formation pressure | formation stress preset | package creates decisions, not unreadable overlap | PENDING |

## Bosses / special encounters

| Scenario | Setup | Pass criteria | Status |
| --- | --- | --- | --- |
| Mini Boss | any World Stage +10 | mechanic and phase pressure readable | PENDING |
| World Boss | any World Stage +20 | boss identity matches World | PENDING |
| Galaxy Major Boss | Stage 100/200/.../1000 | multi-phase pressure readable | PENDING |
| Hidden Challenge | discovered/forced hidden encounter | optional risk/reward is clear | PENDING |
| Hidden World | force hidden-world route | theme/roster/music visibly distinct | PENDING |
| Champion Hunt | priority-target chain | announcer chain and target priority understandable | PENDING |

## Death / recovery

| Scenario | Setup | Pass criteria | Status |
| --- | --- | --- | --- |
| Ordinary death | checkpoint 181, die at 190 | clearly returns to committed checkpoint/economy | PENDING |
| Salvage Anchor | built-in preset | economy preservation vs frontier rollback understandable | PENDING |
| Stage Revival Core | built-in preset | stage-entry restart is visually clear | PENDING |
| Phoenix Core | boss-phase preset | same encounter resumes with grace/resources | PENDING |
| Technical crash | Test Lab crash snapshot | recovery does not look like a gameplay death | PENDING |

## Shops / route

| Scenario | Setup | Pass criteria | Status |
| --- | --- | --- | --- |
| Normal shop | route/shop | finite stock and prices readable | PENDING |
| Hidden / black market | force rare shop | rare identity and stock clear | PENDING |
| Station | route Station | repair/upgrade/support service flow clear | PENDING |
| Branching Route Map | fresh ten-stage sector | choices understandable, mandatory bosses obvious | PENDING |

## Visual quality / performance

| Scenario | Setup | Pass criteria | Status |
| --- | --- | --- | --- |
| High quality | 1920x1080+ | no text obscured by glow/particles | PENDING |
| Ultra quality | high-DPI display | acceptable frame pacing; no runaway particles | PENDING |
| Max pressure | M21 formation/max-pressure preset | no visible freeze/stutter from bounded runtime collections | PENDING |
| Long session | 15+ minutes mixed combat | no accumulating audio/visual artifacts | PENDING |

## Audio

| Scenario | Setup | Pass criteria | Status |
| --- | --- | --- | --- |
| World -> intense | regular combat pressure | transition smooth; no duplicate tracks | PENDING |
| World -> boss | boss transition preset | crossfade feels intentional | PENDING |
| Boss phase | phase 1 -> 2 -> 3 | pressure/music boost does not clip or overwhelm typing | PENDING |
| Pronunciation + combat | enable English pronunciation | word remains intelligible | PENDING |
| Announcer + pronunciation | trigger together | strongest duck keeps speech intelligible | PENDING |
| Warning + speech | warning during speech | warning remains noticeable without masking word | PENDING |
| Shop / Station | transition in/out | music state clearly changes and restores | PENDING |
| Victory / defeat | complete/fail encounter | stinger does not leave looping track behind | PENDING |

## Completion rule

M22 manual gate is complete only when:

1. every required row above is PASS;
2. every FAIL has a linked fix/checkpoint;
3. audio has been heard on a real output device;
4. High and Ultra have been observed in a real browser;
5. at least one low-, mid- and high-WPM human-paced run has been performed;
6. the final post-fix CI is green.
