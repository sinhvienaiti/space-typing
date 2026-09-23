# Pre-M22 Stage Transition Polish Plan

Status: COMPLETE

This slice is approved before the remaining M22 real-browser/audio/visual gate. It upgrades the existing Stage Clear -> Next Stage handoff into a short, skippable transition without consuming combat-screen space.

## Guardrails

- The transition only runs before gameplay starts; enemy timers, attacks and typing targets must never advance behind it.
- Every normal stage gets a short transition; World/Galaxy/Boss/Hidden encounters get stronger variants.
- Keep routine transitions fast. The player can skip with Enter, Space, Escape or pointer/touch.
- Respect reduced-motion preferences.
- Reuse existing World/StageRole data and music state. Do not create a second campaign/navigation system.
- No PlayerSave schema change is required.
- M22 manual QA must run on the transition-polished build before M23.

Implementation checkpoint:

- T01-T06 complete on PR #70.
- Every normal stage gets a short deterministic briefing; World/Galaxy entries and Mini/World/Galaxy bosses escalate visually; Hidden encounters use the optional-signal variant.
- The transition is awaited before `game.startStage()`, so no enemy/projectile/typing timer advances behind the overlay.
- Enter / Space / Escape / pointer/touch skip the transition; reduced-motion shortens it.
- CI #455 PASS · 121/121 test files · 613/613 tests · TypeScript + production build + M22 bundle budget PASS.
- Bundle checkpoint: JS gzip 138.05 KiB · CSS gzip 9.74 KiB · total gzip 165.97 KiB.

## Tasks

### T01 — Transition presentation model
- Add a pure transition-spec module driven by StageRole, Galaxy/World boundary and hidden-encounter context.
- Distinguish regular, elite/special, World Entry, Galaxy Entry, Mini Boss, World Boss, Galaxy Major Boss and Hidden encounter presentations.
- Keep deterministic durations and labels.

### T02 — Full-screen between-stage transition
- Replace the small World-only floating panel with a short full-screen warp/briefing layer.
- Display Galaxy/World, Stage, encounter class and World name.
- Add restrained warp lines/core flare/scan effects using CSS only.
- Do not display the transition during active combat.

### T03 — Stage-start sequencing
- Await the transition after vocabulary/save/music preparation but before `game.startStage()`.
- Regular stages remain fast; boss/boundary transitions are slightly stronger.
- Skip input must cleanly resolve the pending transition once.

### T04 — Hidden/Boss variants
- Hidden Challenge/Hidden World/Champion Hunt receive a distinct hidden-signal presentation.
- Mini Boss, World Boss and Galaxy Major Boss receive escalating visual treatment.
- No gameplay stats, pressure or rewards change.

### T05 — Accessibility / responsive polish
- Honor `prefers-reduced-motion`.
- Keep text legible on narrow screens.
- Pointer/touch and keyboard skip are supported.
- Ensure the overlay sits above Stage Clear/Route UI only during the handoff and disappears before combat begins.

### T06 — Regression / M22 integration
- Unit-test transition classification, labels and duration hierarchy.
- Run full Test + TypeScript + production build + bundle budget.
- Update M22 manual matrix to verify regular, World/Galaxy and boss/hidden transitions for clipping, pacing and skip behavior.
- Keep M22 manual status PENDING.
