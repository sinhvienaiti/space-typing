# Campaign Map, Checkpoint Services and Auto-Discovered Hidden Stops

Status: approved product direction; **design checkpoint only, not implemented**.

This proposal supersedes the player-facing normal-stage Combat/Shop/Station lane choice in M14 when implemented. M14 and M15 currently describe the *existing* shipped systems; do not mark this redesign complete until code, persistence, tests, CI and manual UX checks pass.

## 1. Campaign rules

- Keep the existing sequential Stage 001-1000, 50 Worlds / 10 Galaxies, mandatory bosses, and ten-stage checkpoint sectors.
- Normal numbered stages are combat encounters. Do not offer Normal Shop or Station as an alternative lane at every ordinary stage. In particular, remove the current 2-3 normal route choices that suggest a shop/station can be selected before almost every encounter.
- After clearing Stage 010, 020, 030, ... (every tenth stage), **automatically present one checkpoint rest hub** containing both the existing Normal Shop and maintenance services. The player may use neither, either or both before choosing Continue to the next numbered stage. Do not require a choice between Shop versus Station.
- The tenth-stage mandatory boss/encounter is fought and cleared *before* the rest hub appears. Rest services must not bypass a boss or a numbered stage.
- Existing checkpoint commit/recovery order must remain authoritative: stage-clear and checkpoint state are safely persisted before new rest-hub interactions may modify inventory, stock or equipment.
- A rest hub is not a numbered stage, extra encounter or replayable resource farm. Opening/closing its panels never advances progression or generates new stock.

## 2. Hidden Shop and Hidden Station

- Hidden Shop and Hidden Station are rare deterministic, seeded, random **post-stage discoveries** rather than selectable route lanes.
- After an eligible numbered-stage clear, if either stop is discovered, automatically transfer the player to a short arrival screen for that stop, followed by its existing shop or station UI. Clearly show the discovery type and a visible Leave/Continue option; entry is automatic, purchase and service use are optional.
- Roll and persist at most once for each eligible stage/sector context. Reloading, replaying a cleared stage, switching dialogs or restarting after a technical crash must not reroll/duplicate the event, stock, purchases or rewards.
- Define explicit rarity, eligibility and mutual-exclusion/queue rules in the implementation rather than hiding constants in UI handlers. If an automatic event coincides with a tenth-stage checkpoint, preserve both: show the discovered hidden stop and the guaranteed checkpoint hub in deterministic order, with safe persistence between transitions.
- Random stops must not break the current death rollback, stage-entry or crash-recovery semantics. Keep random stock finite and use existing merchant/service/economy systems; do not create a second shop inventory or currency path.
- Hidden Challenge, Hidden World and Champion Hunt are distinct optional combat activities described by M15. This change to **automatic hidden Shop/Station arrival** does not silently remove their currently documented risk-tier/skip choices.

## 3. Unified Campaign Map UI

- Replace the plain 100-cell Stage Select grid with a polished scrollable journey map: a winding road, circular numbered stage nodes, current playable character/ship marker, completed/current/locked states, and recognizable Elite/Boss/hidden-event decorations.
- Default viewport: current World (20 stages); allow World/Galaxy navigation over the existing 50 Worlds / 10 Galaxies. Auto-scroll/focus current frontier. Preserve legitimate already-unlocked replay behavior and checkpoint anti-skip rules.
- The Route Map becomes the current ten-stage sector detail on this same Campaign Map instead of a competing full-screen grid: display the current path, milestone boss, guaranteed rest hub at the end, and *discovered* hidden stops. Do not present ordinary Shop/Station as selectable numbered-stage alternatives.
- Clicking a numbered combat node displays compact stage preview and Start/Replay only when access rules permit. Clicking the checkpoint rest hub displays Shop, Repair/Upgrade, Support Loadout, and Continue in a clearly labeled rest-hub panel. Hidden-stop arrival uses a separate brief card/panel rather than unexplained buttons under the map.
- Illustrative motion should be cosmetic only. Space Typing still has no manual movement controls; the marker moves along the map only as stage progress advances.

## 4. Contextual icon/help UX

- Use a consistent small recognizable icon plus compact `ⓘ` tooltip for major title, Build, Progress, System and Campaign Map actions. Tooltip content should explain what an action does in one or two short sentences, in the project's existing UI language.
- Cover at least Characters, Equipment, Support Spells, Hotbar, Vocabulary, Route/Campaign Map, Stage Select/replay, Shop, Repair/Upgrade, Support Loadout, Missions, Codex, Settings, Data, and the major currencies/resources when visible.
- Support hover, keyboard focus and tap; do not make game-critical help depend on hover only. Tooltip positioning must not cover other controls or combat typing targets.
- Keep title/menu hierarchy compact and readable. Preserve existing element IDs/event wiring where practical; avoid a second set of menu actions.

## 5. Implementation and save compatibility

- Current M14 RouteState v1 persists 2-3 lanes on ordinary stages and choice records, including Shop/Station. Changing the generator alone is insufficient: design an explicit migration or a safe transition rule for already-saved in-progress ten-stage sectors. Never corrupt or silently skip a saved frontier, purchase or chosen route.
- Decide and test how an old in-progress sector finishes: compatible legacy display until next checkpoint, or deliberate migration preserving frontier/visited choices and economy. Do not leave inaccessible old route nodes or orphaned dialogs.
- Reuse existing ShopState, service shops, Stage 10 checkpoint flow, M15 discovery persistence, player-save/backups, and all death/crash protection mechanics.
- Keep the map primarily DOM/static or low-frequency animation; no additional 60 FPS render loop for an idle map.
- Update M14/M15 docs and the expansion plan's status notes **after** implementation, not before.

## 6. Acceptance checklist

1. Stages 001-009 show no normal Shop/Station route selection; Stage 010 remains its mandatory fight.
2. Clearing 010/020/... produces exactly one checkpoint hub with both buying and maintenance available, then Continue advances through normal access rules.
3. Hidden Shop/Station arrival triggers automatically only on eligible seeded post-clear discovery; no player route selection is needed. Leave is always available.
4. Discovery, finite stock and purchases cannot reroll or duplicate through reload, cleared-stage replay, crash recovery or death rollback.
5. Old valid saves/backups, current saves and mid-sector progress are covered by explicit migration/transition tests.
6. The 20-stage World journey map has numbered path nodes, player/ship position, visually distinct state, Boss and checkpoint landmarks, keyboard navigation and responsive layout.
7. The Route detail panel no longer implies 2-3 shop/station alternatives at ordinary stages or places unexplained Shop/Station/Start actions beneath unrelated map rows.
8. Tooltip help works with mouse, keyboard and touch and does not overlap gameplay text.
9. Child Test/TypeScript/Build/CI pass; final real-browser desktop/mobile manual QA confirms the flow and readable visual hierarchy.
