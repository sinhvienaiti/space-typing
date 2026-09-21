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
- effect quality options.

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
