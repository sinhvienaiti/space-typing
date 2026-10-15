# SPACE TYPING — COMBAT REWARD + VICTORY CELEBRATION POLISH PLAN

**Date:** 2026-10-01  
**Status:** IMPLEMENTATION IN PROGRESS — core VFX/audio/result celebration implemented; browser/audio acceptance remains  
**Repo:** `sinhvienaiti/space-typing`  
**Branch:** `feat/bgv-integration-current`

This plan covers two presentation gaps discovered after the Combat Credit Crystal system became playable:

1. Credit Crystal drop / magnet / collection feels too quiet and visually understated above Low quality.
2. Stage Complete currently uses a weak/ominous clear cue and does not celebrate strong performance enough.

The existing economy, progression, scoring and Stage Results telemetry remain authoritative. This is a presentation/audio polish slice.

---

## A. Credit Crystal drop / pickup polish

### A1. Quality contract

Low is the restrained baseline.

Medium and above must add visible/audio richness instead of merely rendering more pieces:

- stronger bloom around the burst;
- short radial release ring when crystals spawn;
- sparkle/glint accents;
- brighter magnet trails;
- visible absorption pulse at the ship;
- layered drop and pickup sound;
- stronger tier identity for Elite / Mini Boss / Boss / Major Boss.

High and Ultra add additional secondary sparkle/rings/trails. Core crystal readability must not depend on those optional secondary effects.

### A2. Drop audio

When a kill reward is presented:

```text
enemy death impact
-> credit crystal burst
-> short crystalline drop chime
```

The sound must scale by:

- visual quality;
- crystal tier;
- Golden variant;
- hero/boss tier.

Low: one restrained cue.  
Medium: cue + bright harmonic.  
High: richer glass/chime layer.  
Ultra: strongest shimmer, still bounded and non-clipping.

Rapid kills must be throttled/coalesced so audio remains satisfying instead of noisy.

### A3. Collection audio

When the crystal bundle reaches the ship:

```text
magnet acceleration
-> ship absorption flash
-> bright pickup confirmation
-> Credit HUD pulse
```

Collection must sound more rewarding than the spawn/drop cue.

Higher tiers use a lower body + brighter high-frequency sparkle. Boss/hero pickup gets an unmistakable premium accent.

### A4. Collection VFX

At ship absorption:

- Low: current burst is acceptable;
- Medium: larger burst + one pulse ring;
- High: larger burst + pulse + secondary spark;
- Ultra: stronger pulse, extra spark/ring, small screen accent for hero pickup.

Do not block gameplay and do not tie wallet authority to animation completion.

### A5. Stage transition flush

If Stage Clear starts while pickups remain alive, compact-syncing them may not silently skip presentation.

Flush must still route through the same pickup presentation path so collection audio/HUD/VFX are not lost.

---

## B. Stage Complete celebration

### B1. Audio direction

Replace the current sparse/ominous clear cue with a bright victory sound.

Use the existing local victory stinger asset and layer a short consonant major/pentatonic-style synth flourish.

Do not reuse warning/error timbre.

### B2. Celebration intensity

Celebration is graded from Level 1 to Level 5.

Stars are the main baseline:

- 1 star -> restrained clear;
- 2 stars -> stronger clear;
- 3 stars -> clearly celebratory.

Strong performance can increase the result by up to two extra celebration levels.

Performance signals:

- accuracy;
- WPM;
- score;
- score pace / stage performance.

Therefore a strong 3-star result can reach Level 5, while a weak 1-star clear cannot visually look better than an elite 3-star clear.

### B3. Visual celebration

Stage Results gains a non-interactive celebration layer:

- star flare;
- radial rings;
- confetti/spark shards;
- header glow;
- result-card pulse.

Particle count and secondary glow scale by both celebration level and visual quality:

- Low: minimal;
- Medium: clearly visible;
- High: rich;
- Ultra: maximum bounded celebration.

No unbounded DOM creation.

### B4. Accuracy / speed highlights

Very high accuracy and WPM add specific accents:

- >=97% accuracy: precision sparkle;
- >=99% accuracy: premium precision burst;
- strong WPM: faster upward streaks;
- exceptional combined result: strongest header flare.

The celebration does not alter rewards unless an existing reward system already does so.

---

## C. Acceptance criteria

1. Common Credit drops remain readable but lightweight on Low.
2. Medium/High/Ultra Credit drops have visibly stronger bloom/spark/trail treatment.
3. Credit spawn has a distinct crystalline sound.
4. Ship collection has a stronger, more satisfying sound than spawn.
5. Hero/boss collection is audibly and visually premium.
6. Rapid kill streams remain bounded and do not create clipping/polyphony spam.
7. Stage-clear flush does not bypass pickup presentation.
8. Stage Complete no longer uses the old two-tone-only clear cue.
9. Victory audio is bright and recognizably positive.
10. 3-star clears are visibly more celebratory than 1-star clears.
11. High accuracy, high WPM and high score can further increase celebration.
12. Medium/High/Ultra receive progressively richer effects; Low stays restrained.
13. Celebration DOM/particles remain bounded and disposable.
14. Existing Stage Results metric IDs and progression behavior remain unchanged.
15. Automated tests cover deterministic celebration grading and critical presentation contracts.


---

## D. Implementation checkpoint — 2026-10-01

Implemented on `feat/bgv-integration-current`:

- Credit spawn now triggers a tier/quality-aware crystalline drop cue.
- Credit collection now uses a stronger tier/quality-aware pickup cue with premium Hero/Boss accents.
- Medium+ crystal presentation now adds release rings/rays and brighter magnet trails.
- High/Ultra add sparkle/glint treatment; Ultra Hero pickup adds a small flash/shake accent.
- Stage-clear flush now routes pending pickups through the same collection presentation path, so HUD/VFX/audio feedback is not silently skipped.
- Stage Complete now uses the existing local `victory.ogg` stinger plus a bright layered synth flourish instead of the previous sparse two-tone cue.
- Celebration grading is deterministic Level 1–5 using stars as the baseline plus accuracy/WPM/score performance bonuses.
- Stage Results now has a bounded celebration layer with quality-scaled bloom/rings/star shards/confetti and stronger 3–5 level header/star/card accents.
- Reduced-motion remains supported.
- Automated grading/layout/sample-bank contracts are covered by tests.

Remaining acceptance work:

- listen in a real browser on headphones and speakers and tune drop/pickup loudness if needed;
- verify Medium/High/Ultra visually against Low in live combat;
- verify dense late-stage kill streams do not become sonically tiring;
- tune Level 4/5 victory density after real 3-star high-WPM/high-accuracy clears.
