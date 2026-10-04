# Voice Final V2 — implementation and verification

Updated: 2026-10-04. Child branch: `feat/bgv-integration-current`.
Portal and canonical Voice contract: `typing-game`, branch `feat/space-voice-platform`.
This replaces the earlier foundation-only checkpoint in this file.

## Current behavior

Voice and Hybrid are implemented and available for local acceptance testing through
Portal. The bottom-right control contains Typing / Voice / Hybrid and a Mic button.
Select Voice or Hybrid, enable Mic, allow microphone access, and wait for Listening.
The existing pronunciation button controls speech output; the new Mic button controls
recognition. Deploy requires input preparation before charging Warp. Practice is free.

A compact feedback panel above the bottom-right controls shows what was heard,
Checking, Accepted, No match, Retry, or a technical error. Only a successful game
resolution shows Accepted. Text is rendered with `textContent`, is not persisted,
and returns to Listening after four seconds. ResizeObserver positions it above the
hotbar/player HUD; maximum width is 224 px.

Recognition uses pinned English streaming ASR on the device. Typing loads neither
weights nor inference Worker and requests no microphone. Portal owns audio capture;
raw PCM stays out of iframe messages. Use the Portal route, not the child origin
alone, to test Voice.

## Implemented coverage

| Area | Behavior |
| --- | --- |
| Recognition | Continuous Vosk WASM Worker; no recognizer restart when targets change; final word confidence and timestamps matched against the capture-time snapshot. |
| Capture | AudioWorklet, 16 kHz anti-aliasing resampler, 100 ms blocks, bounded credits/backpressure and technical failure on overflow. |
| Lifecycle | Permission cancellation, late stream/decoder disposal, single-origin mic lock, abortable preparation, ready ACK, session/epoch fences, pause, route exit, reconnect and timeout feedback. |
| Speech output | Recognition gated before TTS; fresh audio epoch and resume ACK required after output. Voice world pauses until ready; Hybrid retains keyboard play. |
| Targets | Normal/layered/carrier/splitter/formation/wanted/bonus targets, boss words and counters, projectiles and meteors. Projectile/meteor voice forms use NATO words. |
| Admission | Exact/full-prefix, explicit homophone metadata and alias conflicts checked globally, including keyboard-owned and pending reservations. Unsafe spawns defer without spending their resources. Variety selection remains in place. |
| Hybrid ownership | Typing A can continue while speaking B. Accepted keyboard input latches ownership even if typed progress later resets; completing B preserves A's keyboard lock. |
| Completion | Semantic completion by input source. Voice uses remaining `U = min(8, remaining)` for score `10U` and power `1.8U`, with multiplier 1; no fabricated key presses, hits, WPM or typing streak. |
| Passives | At most one proc per passive per utterance; bounded remainder, reset at encounter/missed-target boundaries rather than mic retry. |
| Learning | Speaking and Recall speaking recorded separately, including assists. Speaking events do not enter spelling Mixed Review segments. |
| Profiles | Typing / Voice / Hybrid bests, adaptive difficulty history and run metadata separated; restored Expedition input mode must match its run. |
| Performance | Worker/weights lazy-loaded; one persistent model cache; conflict pairs recomputed only when reservation words change; bounded history, queues and receipts. High/Ultra graphics preserved. |

Voice-only boss counters use a 3.5 s window and meteors use 2.8 s flight / 1.2 s
stagger as candidate balance settings. They have automated coverage but have not
been calibrated with human microphone sessions. Typing/Hybrid timings are preserved.

## Pinned artifacts

The complete checksums, byte sizes and Apache-2.0 attribution are versioned in
`typing-game/shared/voice/model-manifest.json` and `shared/voice/vendor/`.

- Engine: `vosk-browser-0.0.8-memoryfs-v1-asr`, package `vosk-browser@0.0.8`.
- Model: `vosk-small-en-us-0.15-space-endpoint-v1`; English, 16 kHz,
  confidence floor 0.85, primary endpoint silence 0.25 s.
- Prepared model: 41,116,554 bytes, SHA-256
  `45237278eca199c8d4d3040e95b59cf2d9c0cc388727f65bcd0b2352719057f6`.
- Prepared vocabulary: 1,613,636 bytes, 152,211 lexical symbols, SHA-256
  `49868bed00de849088524e97fa1f674cf5903273ebc34b09b182b3ffbd48950c`.
- `pnpm voice:prepare` verifies the upstream ZIP, deterministically repacks the
  endpoint configuration, verifies the browser artifacts and publishes the manifest
  last. Generated model files are ignored by Git. `dev.sh space` and `play.sh`
  prepare them automatically. First preparation requires network and Python 3.
- The Vite plugin emits the pinned Worker separately, uses MEMFS instead of a
  second model store in IDBFS, and adds a recognizer-ready ACK.

## Verification completed

Final checks on 2026-10-04:

| Check | Result |
| --- | --- |
| Space Typing `pnpm test` | 253 files / 1,623 tests passed. Includes Voice, Warp and existing gameplay regressions. |
| Space Typing `pnpm build` | Passed: TypeScript client/server, Vite and asset integrity checks. |
| Parent shared Voice + Learning | 105 tests passed. Includes actual host-factory permission cancellation/ownership tests. |
| Portal build | Passed. |
| Canonical six-file Voice contract | Verified against the child copy. |
| Real Worker/WASM/model smoke | Decoded the pinned official WAV fixture into final timed word results. |

The final Node smoke reported decoder-block median 2.50 ms / p95 132.24 ms. These
are Node inference-block measurements with a file, excluding microphone, browser,
endpoint delay, iframe messaging and game frames. They are not end-to-end latency.
Run it with `node scripts/voice-worker-smoke.mjs /absolute/path/to/16khz-mono.wav`
in the parent after model preparation.

## Acceptance still required on a real browser

Automated tests and real WASM decoding pass. This environment blocked local browser
access, so no real microphone session, screenshot acceptance, device matrix, full
recognition corpus or game-under-load benchmark has been completed. Do not mark the
Final V2 release gates passed from the smoke results.

Outstanding measured gates: at least 95% acceptance across at least 1,000 human
readings, zero false gameplay commits across at least 3 h of negative audio,
end-to-end median <= 250 ms / p95 <= 450 ms, frame p95 increase <= 2 ms,
plus browser/device, reconnect and soak coverage.

Local acceptance should cover:

1. Mic permission granted, denied and cancelled while loading; Mic off before ready;
   device unplug, reconnect, route exit and a second tab competing for the mic.
2. Voice targets of every listed type, wrong/quiet words, TTS echo isolation,
   pause/resume and long speech across target churn.
3. Hybrid typing A / speaking B; old audio cannot hit a later same-word target;
   feedback Accepted only when the game accepted the completion.
4. Separate results/learning and assists; Voice reward/passive limits; no WPM or
   typing-streak credit from speech; reloads and Expedition mode guards.
5. Desktop and narrow viewport placement, long transcript, music toast, hotbar
   overlap and High/Ultra game load.
