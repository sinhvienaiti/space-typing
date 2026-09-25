# Space Typing — Batch F Browser QA & Performance Gate

> Status: **AUTOMATED SUPPORT IMPLEMENTED / REAL-BROWSER EXECUTION PENDING**
>
> This document is a measurement procedure, not evidence that browser QA has passed.
> The authoritative implementation source is GitHub `main`; final completion still
> requires real-browser observation and accepted exported evidence.

## Purpose

Batch F closes the UI/UX roadmap without pretending that unit tests or CI can
measure a user's browser/GPU/audio experience. Developer Test Lab provides a
QA-only **Batch F Browser Performance Baseline** panel that stores a baseline
and a candidate in localStorage and exports the comparison as Markdown.

The comparator does not touch PlayerSave, Campaign, checkpoints, inventory,
currency, equipment, route, shops or recovery state.

## Required baseline and candidate

For the current UI/UX roadmap comparison:

- baseline code: merged Batch E `8381d50518829b08aa78cfbb22a983d0b60467c8`;
- candidate code: the tested/merged Batch F commit;
- use the same physical machine, browser build/profile, window size and display;
- use the same Stage/Test Lab setup and the same visual quality;
- do not compare captures with different device DPR;
- let each run accumulate **at least 120 frame samples** before capture.

The tool intentionally returns **NOT COMPARABLE** when browser/device, Stage,
quality, viewport, device DPR or minimum sample count do not match.

## Quantitative gate

The exported comparison records:

- average FPS;
- frame p95;
- Canvas draw p95;
- slow-frame ratio;
- adaptive render scale;
- effective DPR;
- Canvas pixel count;
- static enemy-body sprite-cache occupancy.

Candidate acceptance requires:

- frame p95 regression <= **+1.00 ms**;
- Canvas draw p95 regression <= **+1.00 ms**;
- slow-frame-ratio regression <= **+0.020**;
- no context mismatch and at least 120 frame samples in both captures.

These limits are regression guards, not a claim that a particular FPS is
universally acceptable across hardware.

## Browser scenarios

Run comparable baseline/candidate pairs for at least:

1. Stage 001 reference combat;
2. Stage 051 reference combat;
3. six-target / formation pressure;
4. boss encounter;
5. Nova Pulse / visually heavy combat.

Repeat the visually heavy cases on **High** and **Ultra** where the device can
run them. Keep the exact same Test Lab preset/inputs between baseline and
candidate.

## UI/UX acceptance focus

Alongside the quantitative capture, manually verify the merged A-E work:

- kill learning feedback: IPA + Vietnamese are readable, English is not
  redundantly repeated, and the popup does not cover the active typing lane;
- battlefield HUD: left/right hotbar layout, status rail and objective text do
  not cover the ship or target words;
- Stage Results V2: measured stats, XP before/after, rewards and replay actions
  remain readable at desktop and smaller windows;
- icon-first economy: Credits/Alloy/Star Crystal/Quantum Core remain visually
  distinct and readable without relying on color alone;
- equipment/shop/Station cards: icon, grade, effect, price/owned state and
  disabled reason are understandable;
- Mission/Achievement/Codex/Objective: icon + explicit text state remains
  readable; undiscovered Codex content must not reveal hidden category identity;
- tactical consumables: existing shop consumables are usable from the hotbar
  and do not produce text-only/no-op purchases.

Record failures with reproduction steps and re-run the same comparison after
the fix.

## Relationship to M22 recorder

The existing **M22 Manual Gate Recorder** remains the broader 43-row browser,
audio and visual gate. Batch F enriches its captured evidence with:

- Canvas draw p95;
- adaptive render scale;
- effective DPR;
- Canvas pixels;
- static enemy-body sprite cache.

Use **Capture Runtime Evidence** on relevant M22 rows and **Copy Markdown
Report** for the broader manual gate. Use the Batch F panel's **Copy
Comparison** for paired before/after performance evidence.

## Completion rule

Batch F can be marked complete only when:

1. child Test + TypeScript + production Build are green; bundle sizes are reported and asset integrity checks pass;
2. parent `typing-game` integration CI is green;
3. required browser baseline/candidate pairs are comparable and accepted;
4. A-E visual checks above are observed on a real browser;
5. relevant audio scenarios are heard on a real output device;
6. any FAIL has a linked code/content fix and successful re-test.

Until those conditions are met, report Batch F as **PENDING REAL-BROWSER
ACCEPTANCE**, even if all automated CI is green.
