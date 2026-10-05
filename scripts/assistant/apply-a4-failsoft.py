from pathlib import Path

path = Path('src/audio/Sfx.ts')
text = path.read_text()
old = '''  unlock(): void {\n    if (this.destroyed) return;\n    if (this.context === null) {\n      this.context = new AudioContext();\n    }\n    if (this.context.state === "suspended") {\n      void this.context.resume();\n    }\n    this.samples.preload();\n    this.loadLocalAnnouncer();\n  }\n'''
new = '''  unlock(): void {\n    if (this.destroyed) return;\n    // Sample-backed HTMLAudio cues remain usable in environments where the\n    // Web Audio API is unavailable (tests, restricted browsers, fail-soft\n    // runtime). Synthesized voices simply remain disabled until AudioContext\n    // becomes available.\n    if (typeof AudioContext !== "undefined") {\n      if (this.context === null) {\n        this.context = new AudioContext();\n      }\n      if (this.context.state === "suspended") {\n        void this.context.resume();\n      }\n    }\n    this.samples.preload();\n    this.loadLocalAnnouncer();\n  }\n'''
if text.count(old) != 1:
    raise SystemExit(f'unlock anchor count={text.count(old)}')
path.write_text(text.replace(old, new, 1))
