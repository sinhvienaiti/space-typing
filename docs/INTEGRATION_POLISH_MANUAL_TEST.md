# Integration Polish — Manual Acceptance

Automated coverage already verifies the underlying contracts. Use this checklist only for browser/OS behavior that benefits from a human pass.

## 1. Expedition ownership release

1. Open Space Typing from the normal portal route.
2. Start an Expedition and enter gameplay.
3. Use **Back** to return to the title hub.
4. Start **Campaign**. Confirm it starts normally.
5. Return to title and start **Recall**. Confirm it starts normally.
6. Resume Expedition and confirm the resumable Expedition run is still available.
7. While Expedition still owns the active session, attempt a Campaign stage launch and confirm an actionable message tells the player to use Back or Resume Expedition rather than silently ignoring the click.

## 2. Long-word diversity

1. Start or QA-force an Expedition encounter using the `long-word` typing pattern.
2. Observe several enemy words.
3. Confirm the encounter does not collapse into repeating only one or two long words when the strict long-word subset is small.
4. Confirm fallback words come from the existing encounter vocabulary and remain sensible longer candidates.

## 3. WARP countdown

1. Stay on a screen where the WARP regeneration countdown is visible.
2. Confirm the displayed countdown advances once per second rather than every five seconds.
3. Leave/re-enter the page or navigate away and back. Confirm there are no visibly accelerated/doubled ticks.
4. Confirm WARP balance/regeneration remains timestamp-authoritative after a reload.

## 4. Stage Select vs Mission Briefing

1. Open **Stage Select** and confirm it remains the interactive stage/navigation chooser.
2. Open **Briefing** from the route/briefing action.
3. Confirm Briefing shows stage/sector mission information, objective, and committed route information instead of duplicating the stage-selection map.

## 5. Output audio HUD

1. On the title HUD, confirm there is one speaker/output-audio entry rather than separate music/voice output shortcuts.
2. Open the speaker panel and confirm it contains **BGM**, **SFX**, and **Voice / Pronunciation** controls.
3. Confirm the waveform/microphone input control still exists separately when Voice input is available.
4. Verify keyboard focus, tooltip/title/ARIA behavior, and responsive layout remain usable.

## 6. Pronunciation audibility

1. Set **Voice / Pronunciation** to 100%.
2. Trigger several English pronunciations in Chrome.
3. Confirm the selected English system/browser voice is clearly audible compared with the previous behavior.
4. Change BGM and SFX independently and confirm pronunciation volume changes do not alter those channels.
5. Because Web Speech volume is capped at `1.0`, judge actual perceived loudness on the target OS/browser. If a particular installed voice remains unusually quiet, record its browser/OS voice name for follow-up tuning.
