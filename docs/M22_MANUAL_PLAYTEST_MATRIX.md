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

## In-game recording workflow

The M21 Developer Test Lab now includes an **M22 Manual Gate Recorder** that mirrors all 43 required rows in this document.

Use it only as a QA observation recorder:

1. open **Developer Test Lab** from the title screen;
2. open **M22 Manual Gate Recorder**;
3. record the real browser/device used;
4. run the matching Test Lab scenario and set the row to PASS or FAIL;
5. add reproducible notes for every FAIL and useful device/audio notes for PASS rows;
6. use **Copy Markdown Report** and preserve the report with the review/checkpoint.

The recorder stores only QA observations in localStorage under `spaceTypingM22ManualGateV2` and migrates the earlier V1 recorder state when present. It does **not** write PlayerSave, Campaign state, checkpoint state, crash recovery, rewards, equipment, Relics or other gameplay persistence.

For each scenario the recorder can also capture compact runtime evidence from the real Test Lab session: Campaign/Test Lab stage, checkpoint, visual quality, viewport/DPR, enemy/projectile/particle counts, boss identity, rolling FPS/frame-time metrics and current music/duck lifecycle state. This evidence is appended to the row notes and helps make performance/audio findings reproducible.

The recorder additionally requires three explicit human attestations before it can report a COMPLETE CANDIDATE:

- audio scenarios were actually heard on a real output device;
- High and Ultra were actually observed in a real browser;
- low-, mid- and high-WPM human-paced runs were actually performed.

The recorder cannot mark M22 complete by itself. Real browser observation, real audio output and human-paced typing are still mandatory, and final post-fix CI must still pass after the report is accepted.

## Pre-M22 polish focus inside the existing 43 rows

Do not add extra PASS rows for the P00-P08 polish slice. Verify these points while running the existing rows so the recorder remains exactly aligned with its 43 required scenarios:

- title screen: Continue is visually dominant; Play / Build / Progress / System grouping is understandable; Shops & Services and Developer stay compact/collapsed until opened;
- combat HUD: boss/event/objective/status/typing information does not overlap and the center typing lane remains visually dominant;
- RPG player status: selected character + Level and thin Hull/Shield/Energy bars remain readable without covering targets; verify trailing Hull damage, Shield-break flash and low-Hull/low-Energy feedback;
- unified hotbar: one 1-9 strip replaces the old Item/Core Skill/Support button walls; item counts, cooldowns/unavailable states and number-key labels remain legible; verify keyboard and click activation, reassignment from title/Pause, persistence after reload, and compact <=700px layout without overlap;
- stage transitions: verify a normal Stage-to-Stage handoff is short and skippable, World/Galaxy entry is visually stronger without feeling slow, Mini/World/Galaxy boss transitions clearly escalate, Hidden encounters read as optional, reduced-motion remains usable, and no enemy/projectile/typing state advances behind the transition;
- learning feedback: the old large center toast is gone; pronunciation still fires; the short EN/IPA/VI echo appears near a defeated enemy without masking the central combat lane;
- Recall Bonus: VI meaning + masked EN answer is readable; it looks distinct from hostile targets; wrong guesses/expiry do not feel punitive; correct completion clearly communicates an optional treasure reward;
- character visuals: the 11 player characters are visually distinguishable in combat and their selection-card previews match the in-game profile identity;
- typing prefix clarity: use Test Lab **Same-Prefix Scenario** (`morning / month / me`), type `m` quickly and confirm the nearest target locks consistently; then type normal stages and confirm same-initial/prefix piles are noticeably rarer without obvious vocabulary repetition;
- Ship Visual V2: verify all 11 illustrated ships are distinct at Character Select size and still readable at the smaller combat/HUD size; temporarily block/remove the asset once if useful to confirm procedural fallback remains usable;
- Ship Visual V3 when the reviewed binary is installed: read `document.documentElement.dataset.shipArt` in Test Lab; it must be `v3` for premium artwork and `v2` when absent. Compare identical Stage/quality/build scenarios for V2 and V3 with three 60-second runs per quality and record average/p95 frame ms. At native 64/78/128px review all 11 ships, two opposite equipment auras and fast-shot readability; reject the upgrade on >1ms p95 regression, obscured words or failed art load. Browser/human rows remain PENDING until observed on real hardware;
- equipment aura: compare defensive, offensive, precision/luck and late-game builds; aura color/theme should communicate the build without becoming a large permanent combat panel; Low/Medium must visibly reduce detail versus High/Ultra;
- player projectile VFX: compare several characters under rapid typing and boss words; tracer/muzzle/impact identity should be visibly different while enemy words and hostile projectile letters remain unobstructed;
- High/Ultra/max-pressure/long-session rows must specifically watch the new HUD rail, Recall Bonus prism effect, enemy-local learning echo and character engine/glow layers for clipping, text obstruction, particle buildup or frame-pacing regressions.

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
