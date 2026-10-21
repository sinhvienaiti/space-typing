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

## Build flags

`pnpm build` makes a player build: no Developer Test Lab and none of the
private `public/local-assets` audio (DotA announcer lines, personal music;
see [local assets](./docs/LOCAL_ASSETS_README.md)). `pnpm dev` has both.
Two environment switches, read by `vite.config.ts` at build time, change that:

| Flag | Build |
| --- | --- |
| `SPACE_LOCAL_ASSETS=1` | Copies `public/local-assets` into `dist` and plays it before the bundled audio. For the owner's local Play mode only; never for a build that leaves this machine. |
| `SPACE_TEST_LAB=1` | Internal QA build: keeps the Developer Test Lab, in its own chunk loaded after the game starts (`?testLab=1` opens it). |

~~~bash
SPACE_LOCAL_ASSETS=1 pnpm build
~~~

The parent repository's local Play mode builds this game through its root
`build:space` script (`pnpm --dir games/space-typing build`, run by `play.sh`
and `build:local`). To keep the private audio there, that script has to pass
the flag (`SPACE_LOCAL_ASSETS=1 pnpm --dir games/space-typing build`). `play.sh`
rebuilds only when sources change, so delete `dist` once after changing a flag.

The Admin QA Sandbox embeds `https://space.typing-game.local/?testLab=1`. In
local Play mode Nginx serves that host from `dist`
(`infra/nginx/typing-game.local.play.conf`), so the Sandbox works there only
when `build:space` also passes `SPACE_TEST_LAB=1`; otherwise use dev mode
(`typing-game.local.dev.conf` proxies the host to Vite, which always has the
Test Lab). Whether local Play builds keep the Test Lab is the owner's call. A
build without it answers `?testLab=1` with a notice instead of opening nothing.

## Platform integration

Parent integration is now enabled through the `sinhvienaiti/typing-game` platform as a Git submodule.

Platform URLs:

~~~text
https://typing-game.local/space-typing
https://space.typing-game.local
~~~

Voice/Hybrid and Warp Charge are implemented on `feat/bgv-integration-current`,
with Portal hosting on parent `feat/space-voice-platform`. Enable Voice/Hybrid and
Mic in the bottom-right controls through `https://typing-game.local/space-typing`.
Use Practice for free microphone testing; Campaign deployment costs 10 Warp.

- [Voice implementation and acceptance status](./docs/VOICE_FINAL_V2_IMPLEMENTATION_STATUS.md)
- [Warp Charge implementation and economy bounds](./docs/WARP_CHARGE_IMPLEMENTATION_STATUS.md)


## Next implementation checkpoint

~~~text
Step 39
Character registry + Character Select

Then:
Step 40 Vanguard
Step 41 Stage-100 milestone unlock framework
Step 42 remaining milestone characters
~~~
