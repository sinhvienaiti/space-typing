# Space Typing — UI/UX, Itemization, Character XP & Skill Progression Master Plan

> Status: **DESIGN / EXECUTION PLAN — NOT A CLAIM OF IMPLEMENTATION.**
> Updated 2026-09-24. Newer GitHub `main` and actual CI results are the implementation source of truth.
> Read with `docs/PROJECT_CONTEXT.md`, `docs/GAMEPLAY_EXPANSION_MASTER_PLAN.md`,
> `docs/CHARACTERS_AND_COMBAT.md`, `docs/M17_UPGRADE_EXPANSION.md`,
> `docs/STAGE_PACING_WORD_VARIETY_RESULTS_V2_PLAN.md`,
> `docs/BONUS_RAGE_RENDER_POLISH.md`, and the current PlayerSave migration/tests.
> This document consolidates outstanding player-requested work. Some underlying
> functionality already exists; inspect current code before changing it.
> **Do not mark an item COMPLETE until code, tests, CI and manual browser QA support it.**
>
> **Execution checkpoint — 2026-09-24:** P0 and Batches A–E are merged. Batch F automated/support work is validated on PR #98 / CI #597 (144 files, 717/717 tests, TypeScript + production build + bundle/art budgets). Developer Test Lab now records paired baseline/candidate browser performance with strict context matching and exports frame/draw p95, FPS, slow-frame ratio, effective DPR, Canvas pixels and sprite-cache evidence; the M22 recorder capture is enriched with the same render diagnostics. Batch F adds no stylesheet rules; CI measured JS raw 609.77 KiB / gzip 163.33 KiB and CSS raw 59.60 KiB / gzip 13.57 KiB under unchanged limits. See `docs/UI_UX_BATCH_F_BROWSER_QA.md`. **Batch F is still PENDING REAL-BROWSER ACCEPTANCE** until paired real-hardware captures plus visual/audio manual QA are performed and accepted; CI alone is not a COMPLETE claim.

## 0. Non-negotiable design and integration rules

- GitHub `sinhvienaiti/space-typing` `main` is the sole repository state. Parent `sinhvienaiti/typing-game` integrates via its existing git submodule; update the parent's pin after tested child merges.
- Typing remains the main combat skill. Player movement is not added.
- Build on **existing** CharacterProgress/XP/Mastery/Talents, M17 UpgradeState, SkillEngine, effective-stat calculation, character-specific abilities, Support Spell loadout, Hotbar, Currency, Equipment, ShopState and PlayerSave/checkpoint architecture. Do not create parallel XP, skill, attribute, economy or save systems.
- **Prioritize the progression foundation before expanding skills, item art and shop stock.** Levels, learnable basic skills, auto attributes and the reward feedback loop must work as one coherent system.
- Respect existing permanent-vs-run segment/checkpoint rollback rules. Preserve older saves and inventory, paid upgrades, mission/Codex unlocks, support loadouts and character progress. Add explicit migrations and replay/resurrection tests when schemas change.
- Visual clarity, English-learning and steady framerate outrank decorative effects. Reuse local assets, use licenses correctly, never download or load hundreds of image assets at runtime.
- **Reuse before adding:** inspect existing components/helpers/renderers/state/CSS first and extend or refactor the authoritative path when the responsibility already exists. Do not create a parallel implementation simply to avoid touching existing code.
- **Remove dead code immediately when safe:** obsolete selectors, superseded helpers/renderers, unused imports/assets, temporary debug code and duplicate mappings must not be left behind after a replacement is accepted. Git history is the backup; commented-out production code is not.
- Static JS/CSS/dist/audio/image byte counts are **reporting metrics, not hard implementation ceilings**. Do not reduce code quality, UX or maintainability merely to fit a historical KiB/MiB threshold. Follow `docs/CODE_QUALITY_AND_PERFORMANCE_RULES.md`.
- Avoid regressions to existing games in the parent typing-game platform.

## 1. HIGH PRIORITY — Character XP, level-up and automatic stat progression

### 1.1 Player-approved requirements

- Character EXP/XP must be a **well-designed first-class progression system**, not just a level number in the corner. Character XP, level-up feedback, auto attributes and Basic Skill Points are connected.
- Each character has its **own** level, current XP, required XP and mastery progression. Use the implemented CharacterProgress (`src/characters/progression.ts`, currently max Lv50) rather than introducing an unconnected global level.
- Award XP through the current documented stage-clear / performance paths. Show earned XP and a clearly animated before/after XP bar on the post-stage report; on reaching a threshold, handle **multiple level-ups from a single reward** safely. Surface character level and available skill points on the title/character/skill panels.
- **Every character level-up grants Basic Skill Points**. The player manually chooses which eligible Basic skills to learn and which to improve. Unspent points persist and are visible. Base design proposal: **1 point per level-up**, subject to balance review before runtime implementation. Skill unlock/rank costs and level gates must be data-driven and shown before purchase.
- **Each level-up automatically and evenly distributes base stat growth across the existing core attributes**; users do not manually assign the level-up stat points. Every existing attribute receives its authored per-level contribution (Hull, Shield, Firepower, Armor, Energy, Reactor, Focus, Ward, Luck, Salvage). Show each actual numerical gain in a level-up summary.
- "Evenly" means every attribute participates consistently, not identical raw numerical combat bonuses across different units. Economy-sensitive Luck/Salvage need small bounded increments and caps so level farming cannot break rewards.
- Keep character class identity: same distributed baseline for all, plus existing class-specific base stats/passives. Do not make all ships identical, do not break typing-based skill mechanics.

### 1.2 Existing code to integrate (verified against main at time of plan)

- `src/characters/progression.ts`: level, XP, Mastery, Mastery XP, talent ranks, `awardCharacterProgress`, `characterProgressStatBonus`. The current level stat bonus does **not yet include all 10** core attributes; extend carefully and avoid double-granting existing six fields to migrated players.
- `src/characters/state.ts`: independent progression for every character; existing milestone unlocks and persistence.
- `src/characters/talents.ts`: existing branch talent points. **Do not silently relabel or consume talent points as Basic Skill Points.** They are distinct unless an explicit migration/product decision says otherwise.
- `src/skills/progression.ts`: SkillEngine's Lv1–Lv5 compiler and eligible offensive/defensive skill IDs.
- `src/progression/upgrades.ts`: current M17 currency-paid Skill Lv1–Lv5 and separate paid permanent attribute upgrades; integrate or migrate rather than adding contradictory duplicate skill ranks.
- Existing `stats/core` effective stat pipeline and saved RunPersistentState/checkpoint/crash recovery are authoritative.

### 1.3 Skill Point economy and compatibility — mandatory design gate

- Show `earned`, `spent` and `available` Basic Skill Points per character; define validated caps and prevent negative balances, overflow, replay double-awards and duplicate transactions.
- Existing M17 currency-based skill upgrades must **not** become a second uncontrolled path that upgrades the same Lv1–Lv5 ranks for free. Before writing code, document and test one explicit migration path. Candidate: Basic Skill Points own learning/ranks; existing purchases are mapped to equivalent learned ranks with historical spending respected, while any retained Station service provides **material enhancement only if it has a distinct capped purpose**. Do not automatically commit to this candidate without checking current paid purchases/checkpoint semantics and migration safety.
- If earlier saves have Lv1 unlocked for all skills, specify grandfathered learned status and how their existing levels affect initial unspent points, so old players neither lose skills nor gain exploitative extra points. Do not reset old purchases or grant retroactive XP twice.
- Distinguish **automatic per-level base stat growth** from M17 **separate, manually purchased permanent attribute upgrades**; never count a numerical bonus twice.
- Character-specific levels, mastery/talents, learned skills and hotbar selections must survive restart; ensure expected checkpoint rollback behavior for newly earned but uncommitted segment XP/points, plus death-protection and crash-recovery rules.

### 1.4 EXP pace and level-up UX

- Review `xpNeededForLevel` and `stageClearCharacterXp` against 1,000 stages, repeated replay and different typing speeds. Publish a level curve table and simulation for early/mid/late game; avoid level flooding in the first ten stages and impossible end-game grind.
- Define and test repeat-clear XP and hidden-stage XP policy; no reward duplication on rapid buttons/reload. Proposed replay anti-farming rules must be explicitly reviewed rather than silently imposed.
- Make level-up feedback easy to read but never interrupt urgent typing mid-encounter. Suggested sequence: stage clear -> earned XP bar animation -> level-up cards (possibly multiple) -> auto stat gains -> available skill point count -> link to Basic Skill Tree.
- Level-up report shows `previous level -> new level`, XP gain/current XP/next target, every auto stat increment, new Basic Skill Points and any Mastery/Talent gains separately. Support accessible reduced-motion/static alternatives.

### 1.5 Test and acceptance gate

- XP awards at boundaries and max level, simultaneous/multiple level-ups, mastery/talent coexistence; deterministic stat increments at each level and exact one-time application after reload.
- Skill points: earn/spend/unspent, invalid rank/locked skill rejection, old-save migration, no duplicate skill rank path, all class IDs, hotbar learned-state restrictions.
- Checkpoint/death/revive/replay/crash recovery must not duplicate or lose XP/points/auto stats.
- QA: new character Level 1, veteran legacy save, full XP bar, multiple level-ups, max level, different classes, locale/large text, reload and stage replay.

## 2. Two kinds of skills — Basic is approved; second type is NOT yet specified

### Type A — Basic Skills (player-approved)

- Each character has a level-up-driven **Basic Skill Tree/Library**. Spend Basic Skill Points earned on level-up to unlock or raise skills the player wants to use. Show lock reason, prerequisites, current rank, next-rank effect, point cost, remaining balance and whether learned/equippable.
- Group skills clearly: offense, defense, control, utility (only categories backed by actual skills; do not create placeholder buttons). Respect class-specific limits, energy, cooldown, charges, typing conditions, skill level caps and hotbar restrictions.
- Skill ranks from the existing M17 compiler (Lv1–Lv5) should be reused after the compatibility gate in §1.3. Some top-tier ranks should improve behavior, not just percentages.
- Display per-skill **distinct small artwork**, rarity/tier frame when meaningful, current skill rank and next unlock. An XP-earned point is not a shop currency: don't charge both point and duplicate unapproved price for the identical rank.
- New players should get an immediately understandable starter loadout, with enough locked skills to give level-up points meaningful choices. Existing players keep earned/unlocked content through migration.

### Type B — Second category (definition explicitly pending user confirmation)

- The player specified **two types of skills**, but only defined the Basic type. **Do not invent the second category as an approved requirement.**
- Existing Support Spells and character-specific active/ultimate abilities already exist and must remain usable. Before implementing Type B, present a short compatible proposal (e.g. equippable support/special skills from progression or drops) and ask for confirmation of unlock, leveling and slot rules. Do not delete or duplicate existing systems.
- The UI must make clear which systems are Basic, existing character abilities, existing Support Spells and (once approved) the second new skill type.

## 3. Shared icon-first currency, prices and rewards — everywhere

- Reusable local visual/icon component or sprite atlas for **Credits**, **Alloy**, **Star Crystal** and **Quantum Core**; consistent color, size, accessible name and tooltip.
- Replace long text currency/price rows across Station/Normal/Hidden Shop, character/skill upgrades, repair/evolution, inventory, results, rewards, missions, Codex where relevant and all headers. Example: `[Credits icon] 256 [Alloy icon] 5`, not "256 Credits + 5 Alloy".
- Keep full readable labels in tooltip/accessible text, not inside every chip. Don't use confusing glyphs shared by two currencies. Handle zero, unavailable and insufficient-cost states consistently.
- Stage Clear reward amounts, purchased item cost and resource changes use the same icon source. Regression audit ALL code paths that generate currency labels, not just the example screenshot.

## 4. Skill, inventory, equipment and shop visual + content overhaul

- Shops currently look like plain text cards, and item counts/visual diversity are weak. Build reusable **ItemCard / SkillCard / CurrencyChips / RarityFrame / ItemTooltip** patterns; avoid separate incompatible card variants.
- Every real skill/item/equipment asset: **distinct local small icon**, readable name, type, meaningful rarity/grade color frame, short effect text, costs via currency icons, stock/owned/equipped/locked state, upgrade/enhance level, disabled-state reason and long tooltip.
- Rarity-grade semantics must follow actual M17/M06 equipment system; review real Aluminum/Copper/Silver/Gold/Diamond grades and optional Relic/rare tiers rather than inventing a duplicate conflicting common/legendary enum. Define a central palette and verify contrast/colorblind distinguishability by icon/label as well as color.
- Add meaningful variety (real data and balanced effects) to shop rotations, consumables, equipment, active/defensive/support skills, modifiers. Seed candidates for design review: Nova Bomb, Time Crystal, Pulse Battery, Repair Nanites, Shield Capsule, Stasis Charge; Reactor, Targeting Module, Cooling Unit, Memory Lattice, Luck Module; Barrier, EMP, Gravity Well, Repair Pulse, Reflect Field and relevant passives. **First deduplicate against the existing catalog**; do not silently add fake effects, duplicate IDs or text-only no-op items.
- Author icon manifest and local art plan; avoid runtime HTTP sprite fetching and license violations. Reuse the existing stat pipeline, ShopState, price/stock generation and asset loaders. No stock reroll exploit across checkpoint/reload/route changes.
- Improve card hierarchy and grids at desktop and laptop widths: icon area, short effect, grade badge, price chips, buy/equip button. Long descriptions live in details/tooltip. QA insufficient funds, sold out, equipped, upgrade unavailable, old inventory.

## 5. Learning feedback after killing enemies

- Kill popup must emphasize large, bold **IPA + Vietnamese meaning only**. Do NOT redundantly show the English word again; it already appears above the enemy.
- Stable placement away from next enemies, projectile text, ship, hotbar and score. Accessible contrast, readable line height, restrained background pill, no overlapping stacked popups or giant Canvas shadows.
- Add explicit persistent Settings: show kill translation on/off, show IPA, show VN, display duration (suggest 0.8–5.0 seconds), display size (Small/Medium/Large). Default should be legible for language learning (review ~2.4 s / Large).
- When several words are killed quickly, define a predictable queue/latest behavior and prevent stale text or overdraw. Keep English speech independent from VN display. Test kill/bonus/boss/rapid typing, resizing and reduced motion.

## 6. Stage Results V2 and Game Over

- The current results modal is incomplete. Redesign as a proper clear hierarchy, responsive at desktop and smaller windows, with summary and collapsible panels if needed. **Use measured/source-backed counters, never invented values.**
- **Summary:** stage/World, actual duration, score, accuracy, WPM, max streak, star rating and explicit thresholds.
- **Combat:** regular/Elite/Boss kills, bonus collected/missed, fastest and average kill/word time where available, damage/hits, skills used, Nova/ultimate used, key effects.
- **Typing:** correct keys, wrong keys, corrected errors, words completed, per-word timing and accuracy if measured, best streak/perfect chain; use existing typing ledger and add bounded telemetry only when justified.
- **XP/progression:** earned XP, level before/after and next level progress, number of level-ups, automatic stat gains, available Basic Skill Points and any Mastery/Talent rewards. This section cannot be delivered convincingly before §1.
- **Rewards:** consistent currency icon chips, loot item artwork/rarity, star/performance bonus breakdown, no long overflowing text cells.
- **Actions:** Next stage, correctly replay JUST-cleared stage, select unlocked stage, return to title. Game Over must still support already implemented automatic checkpoint rollback with clear wording, not force a second restore button.
- Tests on Stage Clear, repeat-clear, death at next stage, checkpoint rollback, high-volume metrics, missing counters/migration, localization, keyboard and screen reader. Do not show statistics not actually recorded.

## 7. Combat battlefield HUD cleanup

- Split existing hotbar **1–4 to the left** of the player ship and **5–8 to the right**, leave a true clear center region; preserve actual bindings and ensure 1–8 work with keyboard/mouse. Existing persistence currently has legacy 1–9 slots: explicitly handle slot 9 (move to separate utility menu/optional binding or an approved migration) **without silently destroying a user's configured slot**.
- Dock Hull/Shield/Energy/Rage/class/level info flush against lower-left viewport edge with safe-area padding. Remove redundant ship thumbnail; ship is already visible in the center.
- Enemy head labels: eliminate redundant rank text; express strength via progressively thicker/stronger glow/halo/border, palettes and elite/boss markers. Keep actual **English target word** and urgent typing/projectile warnings readable; visual priority must not rely on color alone.
- Keep Rage/Nova power bar legible, explain activation/cooldown; no HUD or popup may cover the ship or target words at normal resolutions. Profile HUD CPU/DOM changes during combat.

## 8. Custom difficulty minimum 0.10× and learning-first controls

- Lower the minimum of **Enemy movement**, **Hostile bullet speed**, **Enemy fire/skill rate** and **Enemy spawn rate** to **0.10×**. Keep appropriate maximum and step, show live numeric value, document that changes apply to the NEXT encounter only.
- Update slider UI **and every matching** data sanitizer, difficulty clamp, runtime projectile path (including boss/special bullets), spawn interval guard, persistence and tests. Do not change saved values on mode switch or silently snap user values upward.
- Check that 0.10× never causes zero/negative interval, infinite stage, untargetable opponent, indefinite bonus countdown or projectile timeout. Do not let typing difficulty alter player skill/accuracy statistics.

## 9. Mission / Codex / objective visual semantics

- Distinct icon and color-coded yet accessible frame per actual rarity/importance for mission, challenge, Codex and objective cards, reusing the same central rarity/importance tokens when appropriate.
- Keep discovery vs locked status legible without spoiling hidden content. Clear progress, claim state, level rewards and concise tooltips.

## 9.5 Real-browser correction batch — 2026-09-25

The following five UI/UX issues were confirmed from real-browser screenshots and are now explicit acceptance requirements for the current polish pass. These are corrective changes to existing systems, not new gameplay features.

1. **Top learning strip must not visually dominate enemies or target names.**
   - Keep enemy readability as the priority.
   - Reduce the strip height substantially (approximately half of the previous 92px desktop row).
   - Use a more transparent/glass treatment instead of an opaque full-width block.
   - Preserve a dedicated non-overlap layout so enemy/nameplate rendering is never intentionally hidden behind the learning strip.
   - Reflow/rescale the battlefield only when the strip is enabled/disabled, not per kill.

2. **Equipment/item visual icons must be large enough to read at a glance.**
   - Existing distinct local icons remain the source of truth.
   - Increase actual glyph/SVG visual size, not only the empty icon container height.
   - Equipment-card icons must read as a primary visual element rather than a tiny symbol floating in a large card.
   - Preserve accessible labels and grade identity.

3. **Menu help must have exactly one tooltip and it must belong to the info icon.**
   - Hovering/focusing the normal action text (for example `Characters`) must not open the custom help popup.
   - Do not attach a native `title` tooltip to the action button when a dedicated info icon exists.
   - Hover/focus/click on the info icon may open the single custom tooltip; Escape/outside click closes it.
   - Keep action button IDs and existing action handlers unchanged.

4. **The `IPA · NGHĨA TIẾNG VIỆT` top rail must be much thinner.**
   - Target roughly half the previous desktop height while preserving readability.
   - Reduce vertical padding and label/text footprint.
   - Mobile may be slightly taller for wrapping, but must remain compact.

5. **Kill-position learning feedback must use a clean, borderless hierarchy.**
   - Vietnamese meaning appears first as the primary line.
   - IPA appears second as the supporting pronunciation line.
   - Remove the hard rectangle/border around this local feedback.
   - A restrained text shadow/fade is allowed for contrast; do not reintroduce a heavy card.
   - English target text is still not repeated.

**Acceptance gate:** code + automated CI must pass, and the next real-browser review must confirm the thinner strip, readable enlarged icons, one-tooltip behavior, and borderless VN-first kill feedback before this corrective batch is considered visually accepted.

## 10. Performance profiling AFTER each UI/VFX batch

- Latest known child main already has bounded static glossy enemy-body cache, adaptive High/Ultra resolution and frame/draw diagnostics; check current `main` before proposing another renderer.
- Suspected costs, not independently confirmed on user hardware: full-screen HiDPI Canvas pixels and compositing, per-enemy shadowBlur/glow/additive passes, un-cached text layout/drawing, explosion particles/Nova effects, animated starfield/grid, DOM layout from overlays. Measure before asserting a definitive bottleneck.
- Record per-quality FPS, frame p95, draw p95, effective DPR/adaptive resolution, Canvas size, sprite-cache occupancy, active enemies/projectiles, CPU/GPU/browser context and effects settings under comparable Stage 001, Stage 051, 6 targets, boss and Nova Pulse.
- Performance pass after every visually rich batch: cache/reuse icons and text metrics; keep expensive paths off frame loop; make gradients, aura and particles adjustable without reducing typing readability. Record before/after measurements and visual regressions; maintain graceful High/Ultra behavior.
- Explicitly rank the **measured** current worst costly render paths, with profiling method and limits; don't claim real-world FPS from green CI.

## 10A. Score, Streak and combat-HUD update frequency — measured optimization gate

**Decision: preserve per-correct-key scoring and combat streak in the authoritative Game simulation; optimize how and when the HUD displays them.** Do not replace all internal calculations with once-per-word updates merely on the assumption that per-key arithmetic is slow. The current `Game.ts` awards key score, advances streak/multiplier and invokes passives as correct letters arrive; additional word-completion/kill rewards are awarded separately. `main.ts` currently handles `onStats` by reassigning score, streak, multiplier, accuracy, kills, stage badge and resource HUD text/styles on every stats event, often every typed key. The arithmetic is minimal; **repeated DOM writes/layout** are the relevant area to measure, while full-screen Canvas effects may still dominate frame cost.

### Preserve current authoritative semantics

- Key streak and score remain **per correct key** so `multiplierForStreak` thresholds (currently 25/50/100), character passives (e.g. Vanguard 20-key Shield rhythm, Wraith 30-key Cloak), SkillEngine typing conditions, Power/Rage gain, boss partial-word damage and enemy-projectile interception continue to work unchanged.
- Retain current separate **word-completion/kill bonus** and special-target rewards. Do not award a full-word bonus for every key, double-count a multi-layer enemy, count an expired Bonus target as a completed word, or make score depend on language word length in a surprising way.
- `streak` remains consecutive correct typing actions unless a separately approved gameplay redesign changes it; on an actual mistake preserve immediate streak/multiplier reset and its existing guard rules. Never hide a correctness or danger state behind delayed display.
- If players want a word-oriented achievement, add a **separate Perfect Word Chain / Words Completed** metric in the Stage Results V2 and optionally a small secondary HUD indicator. The semantics of what counts as a completed word must cover boss multi-word attacks, shield layers, regular kills, bonus targets and projectile single-letter interceptions; choose/document consistent inclusion rather than changing the current key streak implicitly.
- Score may **visually animate in word-sized increments** if desired, but its authoritative total must continue to include all earned key, word, kill and special rewards with no lost points. Label any optional per-word floating score as a summary/animation, not as a new score calculation rule.

### Proposed display optimization (implement only if profiling justifies it)

1. Keep lightweight O(1) numeric counters in simulation on each correct key. Do not introduce extra objects, timers or per-key allocations merely to avoid a few integer additions.
2. Cache previous HUD values and update only text/style fields that actually changed. Avoid reassigning every stat element on each keystroke.
3. Consider batching **cosmetic score text animation and noncritical progress labels** into one `requestAnimationFrame`-coalesced HUD update or a measured limit around 10–15 updates/second; keep reactive input feedback, target-letter highlights, typing accuracy, skill-ready thresholds, Rage-ready, fatal Hull/Shield changes and streak reset prompt and accurate. Handle `pause`, `stageclear`, `gameover`, `title`, dialog opening and destruction with a synchronous final flush.
4. UI update batching must not throttle typing input or delay simulation, skill activation, score rewards or audible feedback. Avoid independent repeating timers; reuse the existing frame clock/event coalescing where practical.
5. Add an optional **Performance diagnostics** counter for stats callbacks, actual HUD mutations/updates and time spent updating the HUD; compare against measured Canvas draw/frame p95 rather than claim a performance win before testing.

### Required QA

- Test rapid typing at 30/60/120 WPM, wrong keys, shielded/guarded misses, projectile interceptions, boss per-key attacks, multi-layer enemies, bonus word completion, passives at 20/30 and multipliers at 25/50/100.
- Assert identical final score, streak, max streak, multiplier, XP/performance bonus and Stage Results metrics **before and after HUD optimization**; only visual refresh cadence may change.
- With browser profiling, compare keypress-to-feedback latency, per-keystroke main-thread cost, HUD mutation count, FPS and frame/draw p95 for score/streak unbatched vs coalesced. If HUD time is negligible compared with Canvas/glow work, keep the simple key-based implementation instead of overengineering.
- Display user-facing units explicitly: `Key streak` / `Perfect word chain`, `Score`, `Correct keys` and `Words completed`; do not silently rename key streak to word streak or mix their max records.

## 11. Delivery order and merge gates

1. **Foundation P0:** this plan + XP curve/Basic Skill Point/auto-stat model, second skill type scope check, legacy save/migration design and tests; implement core progression before large skill/item content expansion.
2. **Batch A:** kill translation readability, EN removal, display settings.
3. **Batch B:** battlefield HUD split/layout, enemy rank visual cleanup, difficulty slider 0.10× (prefer early if quick), and score/streak HUD-update profiling with change-only writes / measured coalescing when warranted. **Preserve per-key gameplay counters.**
4. **Batch C:** Results V2 backed by real typing/combat/XP/skill-point counters; correct replay and reward visuals; explicit key streak, correct keys, words completed and (if implemented) separate perfect-word chain.
5. **Batch D:** icon-first currencies in every UI, item/spell/equipment artwork and rarity cards, shop UX and meaningful content variety. Progression-aware learn/upgrade interfaces belong here after P0 foundation.
6. **Batch E:** mission/Codex/objective frame and icon consistency.
7. **Batch F:** per-batch UI QA + measured performance comparison; final integration and browser acceptance.

For EVERY batch: reconstruct latest child `main`, check open PRs for overlapping work, implement code rather than only docs, add/update meaningful tests, run Test/TypeScript/Build + CI, inspect failed logs and FIX (do not delete tests/files to evade failures), update docs/checkpoints, merge only when green and reviewable, update the parent git submodule pin with its own CI. Report completed vs planned explicitly. Do not overwrite unrelated ongoing work or force-push shared branches.

## 12. Acceptance checklist

- Each level-up earns visible spendable **Basic Skill Points** and deterministically applies gains to **all 10 core attributes** without manual stat-point allocation or duplicate bonuses. Skills learned/upgraded by points integrate with existing M17 ranks and the SkillEngine, with old-save migration and recovery QA.
- XP screen visibly explains earned progress, next threshold, class level, Mastery/Talent and multiple level-ups; the second skill category is not silently invented.
- Every key currency/price/reward UI uses consistent small icons with accessible labels; items/skills/equipment are distinctive, icon-backed, properly graded and materially more varied.
- IPA and VN kill feedback is easy to see, configurable and excludes redundant EN; HUD is balanced around the ship and not cluttered by rank text.
- Stage report displays **real** stage, combat, typing, XP, star, skill point and reward data; all replay/checkpoint buttons behave correctly.
- Custom settings reach 0.10× without runtime safety issues; mission/Codex cards have meaningful tier/importance presentation.
- Core score/streak semantics and skill/passive thresholds remain correct on every keystroke; HUD writes are measured and optimized only where beneficial. A separate word-chain statistic is allowed but must never silently replace key streak.
- CI passes, older saves load, parent games remain unaffected and real-browser QA plus quantitative performance comparison has been performed. Until then status remains partial.
