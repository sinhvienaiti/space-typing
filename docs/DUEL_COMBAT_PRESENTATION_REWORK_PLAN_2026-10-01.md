# SPACE TYPING — DUEL COMBAT PRESENTATION REWORK PLAN

**Date:** 2026-10-01  
**Status:** IMPLEMENTATION IN PROGRESS — Phases A/B/C/E substantially implemented; Phase D/F validation remains  
**Repo:** `sinhvienaiti/space-typing`  
**Branch:** `feat/bgv-integration-current`  
**Parent spec:** `docs/SPACE_TYPING_DUEL_MODE_MASTER_PLAN_FINAL_V3.md`

---

## 1. Why this rework exists

The current Duel runtime correctly models simultaneous typing combat, but the current battle presentation reads like a tactical/card dashboard: two small ships are placed in side cards while Action Offers, Counter Window, Strategy, Banked Actions and Intel dominate the screen.

That presentation is not the intended Space Typing PvP experience.

Duel must visually remain **Space Typing Combat**. The strategy systems remain, but they become compact HUD/support layers around a real-time combat arena.

This document is the mandatory presentation contract for Duel. When presentation guidance here conflicts with the existing Duel battle UI, this document wins.

---

## 2. Hard requirements

### PVP-UI-01 — Keep the existing Combat camera language

Duel uses the same vertical combat perspective as normal Combat:

- local player ship is always at the bottom;
- remote opponent is always at the top;
- attacks from the local player travel bottom -> top;
- attacks from the opponent travel top -> bottom;
- the arena is the main visual area.

Do **not** use a left-vs-right layout.

### PVP-UI-02 — Perspective is local on every client

There is no globally fixed "Player 1 is bottom" presentation rule.

Each client maps:

```text
localPlayer  -> bottom
remotePlayer -> top
```

Therefore:

```text
Machine A: B appears at top, A appears at bottom.
Machine B: A appears at top, B appears at bottom.
```

Network state remains player-id based. Screen coordinates are presentation-only.

### PVP-UI-03 — Duel is not visually turn-based

The following systems remain in the game:

- Action Offers;
- Counter Window;
- Shared Objective;
- Banked Actions;
- Strategy / combo / traps;
- Intel / Mystery / Fate.

However, they must not replace the combat arena.

They are compact overlays, strips, drawers or HUD panels around the arena.

### PVP-UI-04 — Reuse Combat visual language

Duel should reuse or adapt the same visual primitives already expected from Combat:

- player ship rendering;
- projectile muzzle flash;
- projectile trail;
- laser / beam;
- missile;
- railgun;
- bomb / meteor-like impact;
- shield bubble / shield impact;
- hull hit flash;
- explosion;
- repair / heal effect;
- energy charge;
- tactical targeting;
- skill/equipment presentation;
- High / Ultra quality behavior.

Do not optimize Duel by deleting visual effects. Optimize implementation and pooling/budgets instead.

---

## 3. Typing-to-combat contract

Typing is not merely a card-selection mechanism.

The required pipeline is:

```text
correct character
-> text hit feedback
-> micro weapon/charge feedback
-> continue typing
-> word/action complete
-> real combat action is launched
-> projectile/beam/bomb/defense/support effect resolves in arena
-> visible shield/hull/resource response
```

### PVP-TYPE-01 — Per-character micro feedback

For every accepted character that advances the current target:

- the accepted character becomes visually confirmed;
- the active target text receives a small hit/pulse/spark;
- the local ship emits a small muzzle/energy pulse;
- a lightweight typing bolt may travel from the local ship toward the active text;
- the ship charge state increases with typing progress.

Wrong keys:

- count as Duel typing mistakes;
- do not advance the token;
- do not receive a successful text-hit / successful micro-shot presentation.

This preserves the current Combat feeling that typing physically drives weapon feedback.

### PVP-TYPE-02 — Word completion produces macro combat

Completing an action must not only update numbers.

For attack actions:

```text
word complete
-> launch actual attack from local ship
-> attack travels through arena
-> impact on opponent ship/shield
-> state changes are shown with hit FX
```

For defense/support/tactical actions, completion produces the matching visual action instead of a fake generic projectile.

Examples:

- `MISSILE`: charge while typing, launch missile on completion;
- `LASER`: emitter charge while typing, beam/laser on completion;
- `RAILGUN`: stronger charge, heavy rail projectile on completion;
- `BOMB`: ordnance charge, bomb travel/impact on completion;
- `GLACIER/BARRIER`: shield build-up while typing, shield deploy on completion;
- `REPAIR`: repair/drone particles build, repair burst on completion;
- `ENERGY`: reactor glow build, energy pulse on completion;
- `LOCK-ON`: reticle tightens while typing, targeting lock on completion.

### PVP-TYPE-03 — No invisible damage as final presentation

Authoritative state can resolve immediately for deterministic simulation, but the client must present the corresponding combat event.

A completed attack must not feel like:

```text
type word -> HP number silently decreases
```

It must feel like:

```text
type word -> weapon fires -> attack reaches target -> shield/hull reacts
```

Presentation may be prediction/interpolation; authority remains unchanged.

### PVP-TYPE-04 — Opponent typing is readable, not fully exposed

Do not mirror the opponent's full raw input box by default.

Show readable public combat telegraph information such as:

- action family/icon when rules permit;
- charging state;
- threat/counter window;
- cast progress only when the gameplay contract exposes it;
- weapon charge animation on the remote ship.

Do not leak private offers, hidden inventory, Mystery/Fate outcomes or raw competitive input.

---

## 4. Arena layout contract

Desktop target:

```text
+------------------------------------------------------+
| Map / Phase / Time / Series / Hazard                 |
+------------------------------------------------------+
| Rival HUD: Hull / Shield / Energy / Strategy         |
|                         [RIVAL SHIP]                 |
|                              |                       |
|                    incoming attack FX                |
|                                                      |
|                    REAL COMBAT ARENA                 |
|                                                      |
|                    outgoing attack FX                |
|                              |                       |
|                         [LOCAL SHIP]                 |
| Local HUD: Hull / Shield / Energy / Initiative       |
+------------------------------------------------------+
| Counter / Objective alerts (compact contextual)      |
| Action offers (compact 5-slot command strip)         |
| ACTIVE WORD: typed + remaining                       |
| Bank / Strategy / Intel compact dock                 |
+------------------------------------------------------+
```

The combat arena should visually dominate the match. Strategy UI is subordinate.

---

## 5. Rendering and event mapping

### Local perspective adapter

Presentation code consumes `view.self` and `view.opponent`:

```ts
self     => bottom actor
opponent => top actor
```

This works identically for Practice, Friend Duel and Ranked because the server/client view already projects local self vs opponent.

### Event direction

```text
event source == view.self.playerId
-> bottom-to-top

event source != view.self.playerId
-> top-to-bottom
```

### Action presentation mapping

Initial production mapping:

| Effect | Presentation |
|---|---|
| rapid-laser | fast thin laser bolt |
| guided-missile | missile body + bright head + trail |
| heavy-railgun | long heavy rail streak |
| delayed-bomb | glowing bomb/orb + impact burst |
| siege-lance | charged beam/lance |
| shield-charge / barrier-charge | shield deploy pulse |
| hull-repair / repair-drone-charge | repair particles / heal pulse |
| energy-gain | reactor/energy pulse |
| lock-on | opponent reticle/scan |
| gravity-well / disrupt / scan | tactical field/overlay |
| combo attack | stronger multi-layer combat FX |

Unknown actions use a safe generic fallback, but must not silently disappear.

---

## 6. Implementation phases

### Phase A — Presentation contract and vertical arena

- add this plan;
- replace left/right player-card composition with local-bottom / rival-top arena;
- keep all existing battle node IDs needed by the controller;
- make projectile direction vertical;
- restore native ship orientation for local player and 180-degree rival orientation;
- compact Action Offers, Counter, Objective and bottom tactical HUD.

### Phase B — Typing micro-FX

- derive active target/token progress;
- track accepted prediction progress;
- spawn a lightweight local typing bolt only when prefix progress advances;
- pulse the accepted text;
- expose typing progress as a CSS variable on local ship;
- charge local ship while an action is being typed.

### Phase C — Action-specific macro FX

- map attack `effectId` to laser/missile/railgun/bomb/lance visuals;
- stop spawning generic attack projectiles for defense/support;
- render shield/repair/energy/tactical completion on the correct ship/target;
- preserve shield/hull impact feedback from authoritative state deltas.

### Phase D — Shared Combat renderer extraction

Current Duel may temporarily own CSS/DOM adapters, but the target architecture is:

```text
shared combat presentation primitives
          ^                  ^
       PvE Combat          Duel
```

Extract reusable projectile/impact/ship FX primitives only when doing so reduces duplication without destabilizing existing PvE Combat.

Do not perform a large risky renderer rewrite merely to satisfy abstraction purity.

### Phase E — Remote telegraph / counter polish

- remote charging animation;
- contextual counter token near arena;
- threat line/aim cue;
- counter success intercept explosion;
- threat failure impact;
- objective contest cue without taking over the arena.

### Phase F — High/Ultra and performance pass

- High/Ultra keep the richer FX;
- Low reduces secondary particles/shadows, not core readability;
- bounded DOM/pool counts;
- no gameplay-state dependency on render FPS or visual quality;
- reduced-motion remains supported.

---

## 7. Acceptance criteria

The rework is not complete until all of the following are true:

1. Local ship is visually at the bottom and rival ship at the top.
2. On every client, that client's own ship is the bottom ship.
3. Duel no longer reads as a left/right card or turn-based dashboard.
4. Arena is the primary visual area.
5. Accepted typing produces visible per-character text/weapon feedback.
6. Wrong keys do not produce successful-character feedback.
7. Completing an attack visibly launches a matching combat attack.
8. Opponent attacks visibly travel top -> bottom.
9. Shield damage, hull damage, repair and energy changes have visual responses.
10. Counter windows appear contextually over/near combat instead of dominating the screen.
11. Existing strategy systems remain usable.
12. Hidden competitive state is not leaked through presentation.
13. High/Ultra preserve rich effects.
14. Tests cover the vertical/local-perspective DOM contract and typing-progress feedback contract.
15. DuelEngine/network authority rules remain unchanged by presentation code.

---

## 8. Current implementation assessment

Keep:

- deterministic DuelEngine;
- action definitions;
- Bot/room/network authority;
- target locking;
- Action Offers;
- bank/strategy/tactical systems;
- shield/hull state delta handling;
- bounded FX node budgets;
- performance monitor.

Rework:

- left/right ship cards;
- horizontal projectile animation;
- oversized dashboard layout;
- generic projectile for every `action-fired`;
- typing presentation that does not clearly connect accepted characters to combat;
- strategy panels that visually overpower the battlefield.

The goal is **not** to rewrite Duel gameplay. The goal is to make the existing gameplay look and feel like the Space Typing combat system it was designed to be.


---

## 9. Implementation checkpoint — 2026-10-01

Implemented on `feat/bgv-integration-current`:

- Phase A: vertical local-perspective arena is implemented. Self is bottom, rival is top.
- Phase B: accepted-character typing bolt, text-hit pulse and local ship charge are implemented.
- Phase C: laser, missile, railgun, bomb and lance presentation is action-specific; shield/repair/energy actions no longer fake a generic projectile.
- PvE projectile identity profiles are reused for Duel projectile width, glow and ship color identity.
- Phase E: privacy-safe rival charge state, counter/contest telegraph, major-threat charge line, intercept burst and resolved-impact presentation are implemented.
- Tactical macro presentation now includes lock-on/scan target reticles and gravity/disrupt/amplify arena fields.
- Projectile travel now ends with a target-side arrival effect instead of disappearing silently.
- Competitive privacy is preserved: rival typing presentation exposes only generic state plus bucketed progress, not raw private offers/tokens.
- DOM/authority regression tests cover the above presentation/privacy contracts.

Still open before marking the rework complete:

- Phase D: extract more shared PvE/PvP visual primitives only where this lowers duplication without destabilizing Combat.
- Phase F: real-browser High/Ultra tuning, performance evidence, mobile sizing and final visual/audio acceptance.
- Final timing polish between authoritative damage-state updates and visual projectile arrival.
- Manual two-client Friend Duel validation so both clients confirm self-bottom/rival-top orientation simultaneously.
