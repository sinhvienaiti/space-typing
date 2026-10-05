from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: anchor count={count} for {old[:80]!r}")
    p.write_text(text.replace(old, new, 1))

replace_once(
    "src/audio/Sfx.ts",
    '    for (const bus of this.groupBuses.values()) bus.disconnect();\n',
    '    for (const bus of this.groupBuses.values()) {\n'
    '      (bus as GainNode & { disconnect?: () => void }).disconnect?.();\n'
    '    }\n',
)

replace_once(
    "tests/audio-focus-manager.test.ts",
    '    })).toBeCloseTo(0.015);\n',
    '    })).toBeCloseTo(0.0075);\n',
)

replace_once(
    "tests/pronunciation-mix-focus.test.ts",
    '''    controller.destroy();\n    expect(events.removeEventListener).toHaveBeenCalledWith(\n      "space-typing:pronunciation",\n      expect.any(Function),\n    );\n''',
    '''    controller.destroy();\n    // The shared focus manager owns the pronunciation bridge. A controller\n    // only owns and removes its three gesture listeners.\n    expect(events.removeEventListener).not.toHaveBeenCalledWith(\n      "space-typing:pronunciation",\n      expect.any(Function),\n    );\n    for (const type of ["pointerdown", "keydown", "touchstart"]) {\n      expect(events.removeEventListener).toHaveBeenCalledWith(\n        type,\n        expect.any(Function),\n        true,\n      );\n    }\n''',
)

replace_once(
    "tests/m22-audio-audit.test.ts",
    '''    // Destroy must detach every global listener that this controller registered.\n    // Keep the assertion tied to registration count so adding/removing a mix\n    // event cannot leave this lifecycle test stale again.\n    expect(removeEventListener).toHaveBeenCalledTimes(\n      addEventListener.mock.calls.length,\n    );\n''',
    '''    // The shared focus manager owns its long-lived bridge listeners. The\n    // controller itself owns only the three gesture listeners and must detach\n    // those on destroy.\n    expect(removeEventListener).toHaveBeenCalledTimes(3);\n    for (const type of ["pointerdown", "keydown", "touchstart"]) {\n      expect(removeEventListener).toHaveBeenCalledWith(\n        type,\n        expect.any(Function),\n        true,\n      );\n    }\n''',
)

p = Path("tests/announcer-sfx.test.ts")
text = p.read_text()
text = text.replace(
    'it("plays the mapped announcer asset and interrupts the previous call", async () => {',
    'it("queues an equal-priority milestone and plays it after the current call ends", async () => {',
    1,
)
old_class = '''    class FakeAudio {\n      preload = "";\n      volume = 1;\n      currentTime = 0;\n      readonly pause = vi.fn();\n      readonly play = vi.fn(() => Promise.resolve());\n\n      constructor(readonly src: string) {\n        instances.push(this);\n      }\n    }\n'''
new_class = '''    class FakeAudio {\n      preload = "";\n      volume = 1;\n      currentTime = 0;\n      readonly pause = vi.fn();\n      readonly play = vi.fn(() => Promise.resolve());\n      private readonly listeners = new Map<string, Set<EventListener>>();\n\n      constructor(readonly src: string) {\n        instances.push(this);\n      }\n\n      addEventListener(type: string, listener: EventListener): void {\n        const set = this.listeners.get(type) ?? new Set<EventListener>();\n        set.add(listener);\n        this.listeners.set(type, set);\n      }\n\n      emit(type: string): void {\n        for (const listener of [...(this.listeners.get(type) ?? [])]) {\n          listener(new Event(type));\n        }\n      }\n    }\n'''
if text.count(old_class) != 1:
    raise SystemExit("tests/announcer-sfx.test.ts: FakeAudio anchor mismatch")
text = text.replace(old_class, new_class, 1)
old_assert = '''    expect(instances).toHaveLength(2);\n    expect(instances[0]!.src).toBe(DEFAULT_ANNOUNCER_ASSET);\n    expect(instances[1]!.src).toBe(DEFAULT_ANNOUNCER_ASSET);\n    expect(instances[0]!.pause).toHaveBeenCalledOnce();\n    expect(instances[1]!.play).toHaveBeenCalledOnce();\n    expect(instances[1]!.volume).toBeGreaterThan(0);\n\n    sfx.destroy();\n    expect(instances[1]!.pause).toHaveBeenCalledOnce();\n'''
new_assert = '''    expect(instances).toHaveLength(1);\n    expect(instances[0]!.src).toBe(DEFAULT_ANNOUNCER_ASSET);\n    expect(instances[0]!.pause).not.toHaveBeenCalled();\n\n    instances[0]!.emit("ended");\n    await Promise.resolve();\n\n    expect(instances).toHaveLength(2);\n    expect(instances[1]!.src).toBe(DEFAULT_ANNOUNCER_ASSET);\n    expect(instances[1]!.play).toHaveBeenCalledOnce();\n    expect(instances[1]!.volume).toBeGreaterThan(0);\n\n    sfx.destroy();\n    expect(instances[1]!.pause).toHaveBeenCalledOnce();\n'''
if text.count(old_assert) != 1:
    raise SystemExit("tests/announcer-sfx.test.ts: assertion anchor mismatch")
p.write_text(text.replace(old_assert, new_assert, 1))
