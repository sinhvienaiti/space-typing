# Pre-M22 Recall Mode V1 Plan

Status: APPROVED / IMPLEMENTATION IN PROGRESS  
Source branch: `feature/recall-mode-v1`  
Base main: `d28ccd927166dfa2fb98fb3f67e7916a6b89dad4`

## Goal

Add a first-class **Recall Mode** to Space Typing without creating a parallel game. Recall reuses the existing 1000-stage Campaign, World map, stage selection, vocabulary sources, ships/characters, equipment, skills, items, rewards, bosses, persistence and audio mix.

The learning loop changes from:

```
see English -> type -> shoot
```

to:

```
hear English -> recall -> type hidden word -> destroy enemy before contact
```

## Non-negotiable gameplay rules

- Enemies arrive **one at a time** in Recall Mode.
- A new recall word is pronounced when its enemy/layer/boss prompt becomes active.
- Normal enemy projectile and shooting pressure is disabled in Recall Mode.
- Failure pressure is physical approach: an unresolved enemy reaches the ship and causes Hull/Shield damage through the existing collision/damage path.
- English is hidden behind an animated recall-slot presentation.
- Vietnamese translation is an independent player toggle.
- Recall difficulty is independent from Campaign progression and controls enemy approach speed, initial hints, replay allowance and assist pressure.
- Existing Class / Topic / Word Type / Grammar / Custom vocabulary sources remain the source of words.
- Bosses, map stages, rewards and existing RPG systems are reused. Incompatible projectile-only mechanics are suppressed instead of forking those systems.
- Pronunciation uses the existing `speech.ts` pipeline so parent speech signals and MusicController ducking remain correct.
- No per-frame vocabulary/memory scans.

## Recall difficulty presets

| Preset | Enemy speed | Initial hint ratio | Replay budget | Default learning intent |
|---|---:|---:|---:|---|
| Beginner | 0.52x | 45% | unlimited | listen + meaning + strong clues |
| Easy | 0.68x | 28% | 4 | assisted recall |
| Normal | 0.86x | 12% | 2 | listening-first recall |
| Hard | 1.05x | 0% | 1 | low-assist recall |
| Extreme | 1.22x | 0% | 0 | audio-first mastery |

Translation remains user-controlled regardless of preset.

## V1 vertical slices

### R00 — Architecture + contracts
- Add `src/recall/model.ts`.
- Add sanitized Recall settings and difficulty profiles.
- Add pure helpers for hidden slot masks and deterministic initial hints.
- Add learning-memory result contracts.
- Unit tests first.

### R01 — Runtime rules
- Add Game gameplay mode `combat | recall`.
- Sequential spawn cap = 1.
- Disable formations and enemy projectile/action execution in Recall.
- Preserve enemy movement and existing collision damage.
- Auto-lock the single Recall enemy so a wrong first key is a real miss rather than target-selection ambiguity.
- Suppress boss projectile fire in Recall.

### R02 — Recall prompt lifecycle + pronunciation
- Emit a hook when enemy/layer/boss recall prompt becomes active.
- Main runtime speaks the prompt immediately with the existing pronunciation pipeline.
- Completion pronunciation remains Combat-only.
- Add replay action with preset replay budget and no stale TTS queue.

### R03 — Recall Core visual
- Replace visible English target with glowing character slots in Recall.
- Correctly typed letters and hint letters illuminate progressively.
- Vietnamese translation appears beneath the Recall Core only when enabled.
- Boss word rendering uses the same Recall presentation.
- Wrong input keeps existing miss feedback and adds no artificial input delay.

### R04 — Assist actions
- Add Reveal Letter action using bounded per-target hint state.
- Add Replay Audio action.
- Expose both as compact Recall-only HUD controls.
- Existing combat skills/items continue to work where semantically valid; incompatible projectile-only enemy behavior stays disabled.

### R05 — Mode/setup UX
- Add title-screen mode selector: Combat / Recall.
- Add Recall Setup dialog:
  - difficulty preset;
  - translation on/off;
  - IPA on/off;
  - auto-pronounce on/off.
- Persist Recall settings in a separate local preference key; do not migrate PlayerSave just for UI preferences.
- Keep Campaign Stage Select / Route Map / vocabulary dialogs shared.

### R06 — Learning memory baseline
- Persist per-word attempts, clears, perfect clears, failures, hint/replay use and response-time aggregate in a Recall learning store.
- Learning memory is meta-learning data and is not rolled back by Campaign checkpoint/death recovery.
- Do not put it on the hot frame path.

### R07 — Follow-up adaptive repetition
- After V1 is stable, use R06 strength/weakness data to bias future word selection without starving unseen words.
- Add Mistake Review and post-stage Recall metrics.
- This is deliberately after the playable V1 gate so word-selection changes can be tested independently.

## Boss behavior

V1 keeps existing boss identity, HP, phases, art, rewards and word/layer progression. Projectile emission is suppressed in Recall. Boss words are hidden and pronounced at activation. Future R07+ may add explicit Recall boss mechanics such as multi-word memory chains, replay lock, delayed translation and audio interference, but V1 must not introduce fake listening difficulty by making speech unintelligible.

## Performance constraints

- One normal enemy active at a time reduces normal Recall scene pressure.
- Hint state is keyed by active enemy id and reset on layer/target completion.
- Recall rendering derives one short mask per visible target only.
- Learning memory writes occur on word resolution, not every frame or key.
- No DOM write is added to the Canvas simulation loop.

## Acceptance gates

1. Combat Mode behavior remains unchanged.
2. Recall spawns no more than one normal enemy at a time.
3. Recall enemies and bosses do not create hostile projectiles.
4. Each new Recall prompt can trigger English pronunciation through existing speech ducking.
5. Enemy text is hidden while typed/hinted letters are visible.
6. Translation toggle works independently of difficulty.
7. Replay limits and Reveal Letter operate deterministically.
8. Enemy collision still damages the player.
9. Class / Topic / Custom and existing Campaign map continue to work.
10. New pure Recall tests pass.
11. Full test suite passes.
12. TypeScript, production build and bundle budgets pass in CI.
13. Manual Recall audio/readability checks are added to the existing M22 manual gate before M23.

## Roadmap placement

This is an approved **pre-M22 user-facing learning-mode slice**. It does not mark M22 manual validation complete and does not begin M23. After Recall V1 is merged, M22 manual browser/audio/visual validation must cover both Combat and Recall on the final build.
