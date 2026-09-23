# Pre-M22 UI / Recall Bonus / Character Polish Plan

Status: ACTIVE

This slice is intentionally inserted before the remaining M22 real-browser/audio/visual gate because the user-facing layout, learning feedback and player-character rendering are changing. The manual M22 matrix must be executed against the polished build, not the older UI.

## Guardrails

- Keep the combat field visually open. New gameplay UI must not consume a large permanent central area.
- Prefer consolidation/removal over adding more panels.
- Preserve existing gameplay systems and persistence contracts unless a task explicitly requires a schema change.
- Recall Bonus targets are non-hostile: no damage, projectiles, CC, urgent pressure or fail penalty.
- Do not start M23 until M22 manual gate is complete.

## Tasks

### P00 — Plan checkpoint
- Record this implementation slice and sequencing.
- Update the expansion roadmap so M22 manual testing happens after these polish tasks.
- No gameplay behavior change.

### P01 — Title / navigation hierarchy
- Replace the flat title-button wall with clear Play / Build / Progress / System groups.
- Keep Continue as the dominant CTA.
- Put shops/services behind one compact expandable group while preserving every existing button/action.
- Move Developer Test Lab out of the normal player action list into a Developer disclosure.
- Preserve all existing element IDs and event wiring.

### P02 — Learning feedback cleanup
- Remove the large central EN/IPA/VI learning toast.
- Preserve English pronunciation.
- Show a short, enemy-local kill echo with English, IPA and Vietnamese near the defeated target.
- Do not show a large persistent panel or cover the center combat lane.

### P03 — Combat HUD density cleanup
- Replace separately positioned top badges with one compact top-center information rail/stack.
- Prevent boss/event/objective/status/typing notices from overlapping.
- Re-space bottom quick controls and the Ultimate/Energy bar so they do not occupy the same area.
- Preserve important Hull/Shield visibility on narrow screens.
- Do not increase the permanent combat footprint.

### P04 — Recall Bonus target rules
- Add a pure domain module for spawn chance, hint masking and reward scaling.
- Recall Bonus target is optional and non-hostile.
- It displays Vietnamese plus a masked English answer.
- Hint count scales gently with word difficulty/length.
- Missing the target only loses the optional reward.

### P05 — Recall Bonus runtime / visual / reward
- Integrate at most one Recall Bonus target into a stage when selected by the stage roll.
- Exclude it from enemy admission, hostile pressure, kill requirements and damage systems.
- Give it a distinct treasure/prism/rainbow visual identity.
- Award a meaningful bonus through existing reward/economy hooks without creating a second inventory/reward architecture.
- Add deterministic Test Lab support and regression tests.

### P06 — Player character visual profiles
- Replace the one-shape-for-all player renderer with reusable character visual profiles.
- Each character gets a distinct silhouette/accent/core/engine treatment while staying within the same compact combat footprint.
- Add subtle idle/engine motion and restrained glow; no screen-obscuring effects.
- Keep gameplay hit position unchanged.

### P07 — Character selection presentation
- Add lightweight character visual previews to the existing character cards.
- Improve selected/locked hierarchy and role readability.
- Reuse P06 visual profile data rather than duplicating character art rules.

### P08 — Polish integration audit
- Re-run tests, TypeScript, production build and bundle budget.
- Update M22 manual matrix notes for the new UI/Recall Bonus/character visuals.
- Keep M22 status pending until the real browser/audio/human-paced matrix is recorded.
