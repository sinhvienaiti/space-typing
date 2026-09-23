# Bonus stage-clear gating, Rage Nova Pulse and render-budget polish

Status: **implementation review branch**. GitHub Test/Build must pass; real-browser
High/Ultra FPS, visual and sound playtesting remain necessary.

## Stage clear
- Stage clears only when queued ordinary enemies are exhausted, existing enemies
  are resolved, all *visible* Supply Pods, Treasure Drones, Recall targets, Reward
  Choice Crates and Anomaly Crates have been typed or expired, and anomaly/boss
  decisions are resolved. Hostile projectiles do NOT hold the stage open.
- Do not wait for a bonus that has not spawned. Boss enters only after previous
  targets resolve. Player may allow a visible bonus to expire by its normal
  timer; never silently delete it on defeating the final ordinary enemy.
- Tests: `tests/stage-clear-gate.test.ts` and real-Game Test Lab regression.

## Rage / Overdrive
- Charge remains 0–100 and is built from typed keys/word completions with 0.42
  of the previous routine typed gain. Authored explicit reward/pickup Power
  values still work. Wrong-key and Leech drain retain their existing meaning.
- Widen the legibility of the HUD Rage meter. At 100%, SPACE still activates the
  selected character's **existing** ultimate but ALSO releases Nova Pulse:
  screen-wide cyan/purple shockwave, clears all currently visible ordinary and
  elite enemy bodies and hostile bullets, awards appropriate kill/objective
  bookkeeping and limited elite/golden loot, but does **not** fabricate typed
  word completions or explode more child enemies. Visible bonus items remain
  available; bosses take a bounded 12% maximum-HP pulse only while unshielded,
  retaining their phases, shields and reward-choice rules.
- Large radial visuals are short-lived with minimal shadows and capped spark
  bursts. No new global render pass or persistent texture is created per pulse.

## Rendering bottlenecks and approach
- The previous 2D Canvas redraws the full large HiDPI battlefield every frame,
  including dozens of glossy-body paths/shadows per enemy. Quality profiles
  reduce static DPR/pixel budgets but cannot respond to specific GPU/compositor
  conditions on the user's device.
- Keep **dynamic** wings, aura, telegraphs, head animation and English text
  at full frame rate, but rasterize each glossy static body+face once and reuse
  it with a strict 54-entry LRU cap. Clear cached canvases on visual quality
  change and Game destruction.
- Measure both rAF frame p95 (includes browser/compositor lag) and CPU Canvas
  draw p95. High/Ultra only adapt physical DPR under sustained frame/draw
  pressure (minimum 72% of their already-capped baseline) and recover
  gradually after sustained smooth frames; never change enemy positions,
  skill cadence or typing simulation timings. Medium/Low remain untouched.
- Data -> Live render diagnostics exposes average FPS, frame/draw p95, current
  adaptive resolution, effective DPR, pixel count and cache occupancy. A high
  frame p95 with low draw p95 suggests compositor/GPU work; high draw p95
  suggests repeated Canvas drawing cost. Other likely factors to inspect are
  browser throttling, energy settings, multi-game apps running simultaneously,
  external HiDPI monitors and high-frequency background re-renders.
- **Browser acceptance still required**: compare Medium, High and Ultra at
  identical 1280x720 and the user's full monitor resolution for Stage 001,
  Stage 051, 6 simultaneous enemies, boss, Nova Pulse and parent BGM/voice;
  log warm and cold sprite-cache FPS/p95 and check ghosting/art changes.
  Passing CI does not prove smoothness or identify hardware-specific causes.
