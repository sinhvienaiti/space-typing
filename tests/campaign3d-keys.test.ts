import { describe, expect, it } from "vitest";
import { isComposingKey, typedLetter, vietnameseInputSign } from "../src/scene3d/keys";

describe("Campaign 3D keys", () => {
  it("types plain letters, lower-cased", () => {
    expect(typedLetter({ key: "a", code: "KeyA", keyCode: 65 })).toBe("a");
    expect(typedLetter({ key: "W", code: "KeyW", keyCode: 87 })).toBe("w");
  });

  it("skips shortcuts, held keys and anything that is not a letter", () => {
    expect(typedLetter({ key: "a", ctrlKey: true })).toBeNull();
    expect(typedLetter({ key: "a", altKey: true })).toBeNull();
    expect(typedLetter({ key: "a", metaKey: true })).toBeNull();
    expect(typedLetter({ key: "a", repeat: true })).toBeNull();
    expect(typedLetter({ key: "1" })).toBeNull();
    expect(typedLetter({ key: "Enter" })).toBeNull();
    expect(typedLetter({ key: " " })).toBeNull();
  });

  it("never scores an input method's composing presses (Windows / macOS Vietnamese keyboard, IMEs)", () => {
    // The press that turns "a" into "â" under Telex, as Chrome reports it.
    expect(typedLetter({ key: "a", code: "KeyA", keyCode: 229, isComposing: true })).toBeNull();
    expect(typedLetter({ key: "Process", code: "KeyA", keyCode: 229 })).toBeNull();
    expect(isComposingKey({ key: "Enter", isComposing: true })).toBe(true);
    expect(isComposingKey({ key: "Enter", keyCode: 13 })).toBe(false);
  });

  it("does not score the accented letters UniKey / EVKey send in place of a key", () => {
    for (const key of ["ô", "í", "ơ", "ư", "đ", "Ă", "ữ"]) expect(typedLetter({ key, code: "" })).toBeNull();
  });

  it("recognizes a Vietnamese input method at work, and nothing else", () => {
    for (const key of ["ô", "í", "ơ", "ư", "đ", "Đ", "Ằ", "ữ", "ẹ"]) expect(vietnameseInputSign({ key })).toBe(true);
    expect(vietnameseInputSign({ key: "Process" })).toBe(true);
    expect(vietnameseInputSign({ key: "a", isComposing: true })).toBe(true);
    for (const key of ["a", "z", "Enter", "Backspace", "ç", "ñ", "ß"]) {
      expect(vietnameseInputSign({ key })).toBe(false);
    }
  });
});
