# Pre-M22 RPG HUD / Unified Hotbar Plan

Status: PLANNED

This slice is approved before the remaining M22 real-browser/audio/visual gate. Its purpose is to make the combat UI read like a compact RPG HUD without reducing battlefield visibility.

## Core UX rules

- Keep the center combat lane clear. No large permanent panel may be added over enemies or typing targets.
- Replace duplicated quick-control groups instead of stacking more UI on top of them.
- Use a compact player-status cluster plus one unified 1-9 hotbar.
- The hotbar is a real gameplay loadout, not a cosmetic-only setting.
- Space remains the dedicated Overdrive action.
- Existing hard-coded item/skill/support hotkeys are transitional and are replaced by the unified 1-9 slot mapping once H02-H04 are complete.
- Do not create parallel inventory, skill or persistence systems.
- Any persistent hotbar loadout must extend PlayerSave through an explicit schema bump and backward migration.
- M22 manual QA must be performed only after H01-H06 are complete and merged.

## Tasks

### H01 — Compact Player Status HUD
- Add a compact lower-corner player-status cluster.
- Show selected character identity, character level and the three primary combat resources:
  - Hull/HP;
  - Shield;
  - Energy.
- Use thin bars with restrained numeric labels rather than large panels.
- Add subtle state feedback:
  - trailing Hull damage;
  - Shield-break flash;
  - low-Hull pulse;
  - Energy depletion state.
- Keep Score/Streak/Accuracy/Kills available without duplicating Hull/Shield as oversized top metrics.
- Preserve the existing player combat position and hit logic.

### H02 — Unified 1-9 Combat Hotbar
- Replace the separate `quickItems`, `quickSkills` and `quickSupport` combat strips with one compact 9-slot hotbar.
- Slots map to keyboard keys `1` through `9`.
- A slot may hold:
  - consumable item;
  - defensive skill;
  - offensive skill;
  - support skill;
  - character active skill.
- Show only compact information inside each slot:
  - key number;
  - icon/short visual identity;
  - item count where relevant;
  - cooldown overlay/time;
  - unavailable/energy-blocked state;
  - active-state highlight.
- Unassigned slots remain visually quiet.
- Do not increase the permanent bottom combat footprint versus the current combined quick-control UI.
- Keep `Space` as Overdrive.

### H03 — Hotbar Assignment / Loadout UI
- Add assignment controls to existing Inventory/Equipment/Skills/Support/Character interfaces rather than creating a new full-screen combat menu.
- Support a simple first implementation:
  - choose an action;
  - choose slot 1-9;
  - replace/clear the existing assignment if needed.
- Prevent duplicate assignment of the same unique skill unless the underlying gameplay explicitly permits it.
- Consumable slots reference existing inventory counts; they do not copy inventory state.
- Show the current key assignment alongside skills/items in their existing management UI.
- Hotbar configuration cannot be edited while an unsafe modal/combat transition is in progress.

### H04 — Persistent Hotbar Loadout / PlayerSave Migration
- Add the unified hotbar loadout to the canonical persistent player state.
- Bump PlayerSave from v25 to the next schema version.
- Add deterministic backward migration:
  - preserve all v25 data;
  - construct a sensible default 1-9 layout from the current item/skill bindings;
  - do not lose equipment, route, shop, relic, Codex, Ascension, checkpoint or recovery state.
- Update validation, recovery mirror, backup/import and migration tests.
- Do not use a parallel localStorage gameplay-state key.

### H05 — Responsive / Visual Polish
- Desktop: keep the player-status cluster and 1-9 hotbar visually separated but aligned as one HUD system.
- Narrow screens:
  - reduce label density before reducing vital information;
  - keep Hull/Shield visible;
  - keep all 1-9 slots reachable/legible without covering the central typing lane.
- Add compact tooltip/help text outside active combat where necessary.
- Re-check Boss HUD, Recall Bonus, learning echo, notices and world transitions against the new lower HUD.
- Avoid excessive glow, animation or large icons that compete with enemy words.

### H06 — Regression / M22 Integration Gate
- Add unit tests for hotbar assignment, conflicts, activation and migration defaults.
- Add Game/Test Lab coverage for:
  - item activation through assigned slots;
  - skill activation through assigned slots;
  - cooldown/unavailable states;
  - inventory depletion;
  - character/support skill assignment;
  - persistence round trip and v25 migration.
- Run full tests, TypeScript, production build and bundle budget.
- Update `docs/M22_MANUAL_PLAYTEST_MATRIX.md` with explicit visual checks for:
  - player-status readability;
  - Hull/Shield/Energy feedback;
  - 1-9 hotbar readability;
  - no battlefield obstruction at desktop and narrow widths.
- Keep M22 status PENDING until the real browser/audio/human-paced matrix is completed.

## Intended final combat layout

- Top: compact Stage / Boss / event information.
- Center: battlefield and typing targets remain visually dominant.
- Lower corner: compact Character + Lv + Hull / Shield / Energy status.
- Bottom center: one 1-9 hotbar.
- No separate permanent Item / Skill / Support button walls.
