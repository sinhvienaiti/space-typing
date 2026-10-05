from pathlib import Path
import re

root = Path('.')

# 1) Every sampled SFX event must use the same Master × SFX production path.
sfx_path = root / 'src/audio/Sfx.ts'
sfx = sfx_path.read_text()
pattern = re.compile(
    r'this\.samples\.play\(\n\s*"([^"]+)",\n\s*this\.volume,\n\s*this\.pronunciationActive,\n\s*([^\n]+),\n\s*\);'
)

matches = list(pattern.finditer(sfx))
if len(matches) < 10:
    raise SystemExit(f'expected >=10 direct sampled SFX calls, found {len(matches)}')

sfx = pattern.sub(lambda m: f'this.playSample(\n      "{m.group(1)}",\n      {m.group(2).strip()},\n    );', sfx)
if 'this.samples.play(\n      "enemy-shot",\n      this.volume' in sfx:
    raise SystemExit('enemy-shot still bypasses playSample')
sfx_path.write_text(sfx)

# 2) Test Lab gets explicit production-path pronunciation stress scenarios.
controller_path = root / 'src/test-lab/controller.ts'
controller = controller_path.read_text()
button_anchor = '''            <button type="button" data-action="trigger-pronunciation">Trigger Pronunciation</button>\n            <button type="button" data-action="trigger-warning">Trigger Warning</button>'''
button_replacement = '''            <button type="button" data-action="trigger-pronunciation">Trigger Pronunciation</button>\n            <button type="button" data-action="pronunciation-stress">Pronunciation Stress Mix</button>\n            <button type="button" data-action="rapid-pronunciation">Rapid Pronunciation ×3</button>\n            <button type="button" data-action="trigger-warning">Trigger Warning</button>'''
if controller.count(button_anchor) != 1:
    raise SystemExit(f'button anchor count={controller.count(button_anchor)}')
controller = controller.replace(button_anchor, button_replacement, 1)

handler_anchor = '''    if (action === "trigger-warning") {\n      ensureGame()?.testLabTriggerWarning();\n      renderInspector();\n      return;\n    }'''
handler_replacement = '''    if (action === "pronunciation-stress") {\n      if (music === null || game === null) createRuntime();\n      audioQa?.stopTrack();\n      const settings = {\n        ...options.getSettings(),\n        pronunciationEnabled: true,\n        pronunciationVolume: Math.max(\n          0,\n          Math.min(\n            1,\n            numberValue(dialog, '[data-field="pronunciation-volume"]', 1),\n          ),\n        ),\n      };\n      music?.setWorldProfile(musicProfileForWorld(worldForStage(session.stage)));\n      music?.transitionTo(musicStateSelect.value as MusicState, 0.12);\n      ensureGame()?.testLabTriggerWarning();\n      ensureGame()?.testLabTriggerAnnouncer(announcerSelect.value as AnnouncerEvent);\n      qaAudioRuntime().playSfx("enemy-shot");\n      speakEnglish(\n        inputValue(dialog, '[data-field="pronunciation-text"]'),\n        settings,\n      );\n      notice("A4 production pronunciation stress · music + warning + announcer + combat SFX");\n      renderInspector();\n      return;\n    }\n    if (action === "rapid-pronunciation") {\n      const settings = {\n        ...options.getSettings(),\n        pronunciationEnabled: true,\n        pronunciationVolume: Math.max(\n          0,\n          Math.min(\n            1,\n            numberValue(dialog, '[data-field="pronunciation-volume"]', 1),\n          ),\n        ),\n      };\n      const first = inputValue(dialog, '[data-field="pronunciation-text"]') || "checkpoint";\n      [first, "shield", "reactor"].forEach((text, index) => {\n        window.setTimeout(() => speakEnglish(text, settings), index * 120);\n      });\n      notice("A4 rapid pronunciation ×3 · latest speech must win without stale focus release");\n      renderInspector();\n      return;\n    }\n    if (action === "trigger-warning") {\n      ensureGame()?.testLabTriggerWarning();\n      renderInspector();\n      return;\n    }'''
if controller.count(handler_anchor) != 1:
    raise SystemExit(f'handler anchor count={controller.count(handler_anchor)}')
controller = controller.replace(handler_anchor, handler_replacement, 1)
controller_path.write_text(controller)
