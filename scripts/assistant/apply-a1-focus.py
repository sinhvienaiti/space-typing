from pathlib import Path

root = Path(".")

music = root / "src/audio/MusicController.ts"
text = music.read_text()
old = '''  private readonly onAnnouncer = (event: Event): void => {\n    const active =\n      (event as CustomEvent<{ active?: unknown }>).detail?.active === true;\n    if (active) this.duck("announcer");\n    else this.releaseDuck("announcer");\n  };\n'''
new = '''  private readonly onPronunciation = (event: Event): void => {\n    const active =\n      (event as CustomEvent<{ active?: unknown }>).detail?.active === true;\n    if (active) this.duck("pronunciation");\n    else this.releaseDuck("pronunciation");\n  };\n\n''' + old
if text.count(old) != 1:
    raise SystemExit(f"MusicController onAnnouncer anchor count={text.count(old)}")
text = text.replace(old, new, 1)
old = '''    if (typeof window !== "undefined") {\n      // Spoken vocabulary intentionally does not lower music. The voice mix is\n      // already clear, while warnings and announcer cues still duck for safety.\n      window.addEventListener(\n        "space-typing:announcer",\n        this.onAnnouncer,\n      );\n'''
new = '''    if (typeof window !== "undefined") {\n      // Pronunciation owns its own focus reason so it composes safely with an\n      // announcer or warning instead of releasing another cue's duck early.\n      window.addEventListener(\n        "space-typing:pronunciation",\n        this.onPronunciation,\n      );\n      window.addEventListener(\n        "space-typing:announcer",\n        this.onAnnouncer,\n      );\n'''
if text.count(old) != 1:
    raise SystemExit(f"MusicController constructor anchor count={text.count(old)}")
text = text.replace(old, new, 1)
old = '''    if (typeof window !== "undefined") {\n      window.removeEventListener(\n        "space-typing:announcer",\n        this.onAnnouncer,\n      );\n'''
new = '''    if (typeof window !== "undefined") {\n      window.removeEventListener(\n        "space-typing:pronunciation",\n        this.onPronunciation,\n      );\n      window.removeEventListener(\n        "space-typing:announcer",\n        this.onAnnouncer,\n      );\n'''
if text.count(old) != 1:
    raise SystemExit(f"MusicController destroy anchor count={text.count(old)}")
text = text.replace(old, new, 1)
music.write_text(text)

sfx = root / "src/audio/Sfx.ts"
text = sfx.read_text()
old = '''  private readonly onPronunciation = (event: Event): void => {\n    const detail = (event as CustomEvent<{ active?: unknown }>).detail;\n    this.pronunciationActive = detail?.active === true;\n  };\n'''
new = '''  private readonly onPronunciation = (event: Event): void => {\n    const detail = (event as CustomEvent<{ active?: unknown }>).detail;\n    this.pronunciationActive = detail?.active === true;\n    // An announcer line may already be playing when TTS begins. Re-apply the\n    // warning-bus gain immediately so its tail cannot mask pronunciation.\n    if (this.announcerAudio !== null) {\n      this.announcerAudio.volume = this.announcerVolume();\n    }\n  };\n'''
if text.count(old) != 1:
    raise SystemExit(f"Sfx pronunciation anchor count={text.count(old)}")
text = text.replace(old, new, 1)
sfx.write_text(text)
