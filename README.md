# Space Typing

Space Typing is an independent wide-screen typing combat game for the local `typing-game` platform.

The game is designed around typing decisions rather than movement.

## Current checkpoint

Implemented foundation + first core typing-combat prototype:

- Vite + TypeScript + Vitest;
- GitHub Actions CI;
- wide responsive high-DPI Canvas;
- stationary player ship;
- first-letter target locking;
- per-key laser/hit feedback;
- enemy recoil and particle effects;
- score, streak, multiplier and Power;
- Overdrive on Space at 100%;
- progressive prototype waves;
- pause/resume;
- game-over/result overlay;
- SFX feedback;
- clean dark HUD/settings UI;
- effect quality options;
- parent shared vocabulary loader;
- Class/Custom explicit vocabulary source flow;
- English + Vietnamese + IPA completion feedback;
- queued English pronunciation;
- parent shared-music ducking signal;
- 1000-stage deterministic Campaign model;
- 10 Galaxies and milestone stage roles;
- Campaign progress with highest unlocked stage;
- Continue / Retry / Stage Select;
- stage-clear unlock/save flow;
- WPM/accuracy/Vocabulary-aware difficulty model.

The full project plan and source of truth is:

~~~text
docs/PROJECT_CONTEXT.md
~~~

## Development

~~~bash
pnpm install
pnpm dev
~~~

Local dev server:

~~~text
http://127.0.0.1:3004
~~~

## Checks

~~~bash
pnpm test
pnpm build
~~~

## Platform integration

Parent integration is intentionally deferred until the child game reaches the stable milestone defined in `docs/PROJECT_CONTEXT.md`.

Target platform URLs:

~~~text
https://typing-game.local/space-typing
https://space.typing-game.local
~~~


## Next implementation checkpoint

~~~text
Step 17 Mine + Tank
Step 18 Destroyer + letter projectile typing
Step 19 Oppressor + multi-projectile pressure
Step 20 remaining enemy families
~~~
