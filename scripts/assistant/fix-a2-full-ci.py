from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: anchor count={count} for {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))

replace_once(
    "src/audio/Sfx.ts",
    '''  private groupOutput(context: AudioContext, group: AudioGroup): AudioNode {\n    let bus = this.groupBuses.get(group);\n''',
    '''  private groupOutput(context: AudioContext, group: AudioGroup): AudioNode {\n    // Browsers provide createGain(), but several isolated QA/test harnesses use\n    // a deliberately minimal AudioContext. Keep those paths functional by\n    // falling back to the shared output rather than crashing before audio can\n    // be skipped/simulated. Production Web Audio still gets per-group buses.\n    if (typeof context.createGain !== "function") {\n      return this.outputNode(context);\n    }\n    let bus = this.groupBuses.get(group);\n''',
)

replace_once(
    "tests/sfx-lifecycle.test.ts",
    '''    expect(contextsCreated).toBe(1);\n    expect(removeEventListener).toHaveBeenCalledOnce();\n''',
    '''    expect(contextsCreated).toBe(1);\n    // A2 moved pronunciation/warning/announcer bridge ownership into the\n    // shared focus runtime, so individual Sfx instances no longer register or\n    // remove that global listener.\n    expect(removeEventListener).not.toHaveBeenCalled();\n''',
)
