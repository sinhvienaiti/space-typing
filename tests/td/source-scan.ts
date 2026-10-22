/**
 * Reading source text for Typing Defense's boundary checks
 * (tests/td-boundary.test.ts, tests/mode-isolation.test.ts) without a parser:
 * comments and string contents are blanked in place, so a pattern never
 * matches inside them and every offset still points into the original text.
 */

/**
 * Blanks comments and, with `strings`, what string and template literals
 * hold (not a template's `${…}` code), keeping every offset and line break.
 */
export function blank(text: string, strings: boolean): string {
  const out = text.split("");
  const hide = (from: number, to: number) => {
    for (let index = from; index < to; index += 1) if (out[index] !== "\n") out[index] = " ";
  };
  const open: number[] = [];
  let inTemplate = false;
  let index = 0;
  while (index < text.length) {
    const char = text[index]!;
    const next = text[index + 1];
    if (inTemplate) {
      if (char === "`") inTemplate = false;
      else if (char === "$" && next === "{") {
        open.push(0);
        inTemplate = false;
        index += 2;
        continue;
      } else if (strings) hide(index, char === "\\" ? index + 2 : index + 1);
      index += char === "\\" ? 2 : 1;
      continue;
    }
    if (char === "/" && (next === "/" || next === "*")) {
      const end = next === "/" ? text.indexOf("\n", index) : text.indexOf("*/", index + 2);
      const stop = end < 0 ? text.length : next === "/" ? end : end + 2;
      hide(index, stop);
      index = stop;
      continue;
    }
    if (char === '"' || char === "'") {
      let end = index + 1;
      while (end < text.length && text[end] !== char && text[end] !== "\n") end += text[end] === "\\" ? 2 : 1;
      if (strings) hide(index + 1, end);
      index = end + 1;
      continue;
    }
    if (char === "`") inTemplate = true;
    else if (open.length > 0 && char === "{") open[open.length - 1]! += 1;
    else if (open.length > 0 && char === "}") {
      if (open[open.length - 1] === 0) {
        open.pop();
        inTemplate = true;
      } else open[open.length - 1]! -= 1;
    }
    index += 1;
  }
  return out.join("");
}

/**
 * SafeStorage's methods (src/platform/safe-storage.ts). Each names its key in
 * its first argument; setItems names its keys in an object literal.
 */
export const STORAGE_METHODS = ["getItem", "readItem", "readJson", "setItem", "setItems", "writeJson", "commitItem", "removeItem"] as const;

/** One key a storage call reads or writes; null when the scan cannot tell which. */
export type StorageKey = { method: string; key: string | null };

const METHOD = STORAGE_METHODS.join("|");
const CONSTANT = /\bconst\s+([\w$]+)\s*(?::\s*string\s*)?=\s*(?:"([^"\\\n]*)"|'([^'\\\n]*)'|`([^`\\]*)`)/g;

/** Where a string or template literal that opens at `start` ends (just past its closing quote). */
function literalEnd(code: string, start: number): number {
  const quote = code[start];
  let depth = 0;
  for (let index = start + 1; index < code.length; index += code[index] === "\\" ? 2 : 1) {
    const char = code[index];
    if (quote === "`" && char === "$" && code[index + 1] === "{") depth += 1;
    else if (depth > 0 && char === "}") depth -= 1;
    else if (depth === 0 && char === quote) return index + 1;
  }
  return code.length;
}

/** Where the bracket that opens at `start` closes, in code whose strings are blanked. */
function closing(bare: string, start: number): number {
  let depth = 0;
  for (let index = start; index < bare.length; index += 1) {
    if ("([{".includes(bare[index]!)) depth += 1;
    else if (")]}".includes(bare[index]!) && --depth === 0) return index;
  }
  return bare.length;
}

/**
 * Every storage key a file reads or writes, in source order. A key is a
 * string literal, a template (its `${…}` kept as written) or a
 * `const NAME = "…"` of the same file. Anything else is null, so a check on
 * the keys fails closed: a parameter, a concatenation, an object passed to
 * setItems whole, a method taken off the storage (`const { setItem } = s`,
 * `s.setItem.call`) or named in brackets (`s["setItem"]`).
 */
export function storageKeys(text: string): StorageKey[] {
  const code = blank(text, false);
  const bare = blank(text, true);
  const constants = new Map<string, string>();
  for (const match of code.matchAll(CONSTANT)) constants.set(match[1]!, match[2] ?? match[3] ?? match[4]!);

  /** The key an argument starting at `from` and ending before `to` names. */
  const keyOf = (from: number, to: number): string | null => {
    const argument = code.slice(from, to).trim();
    const start = from + code.slice(from, to).indexOf(argument);
    if (/^["'`]/.test(argument)) {
      const end = literalEnd(code, start);
      return code.slice(end, to).trim() === "" ? code.slice(start + 1, end - 1) : null;
    }
    return /^[\w$]+$/.test(argument) ? (constants.get(argument) ?? null) : null;
  };

  /** The keys of the object literal whose braces are at `open` and `close`. */
  const objectKeys = (open: number, close: number): (string | null)[] => {
    const keys: (string | null)[] = [];
    let from = open + 1;
    for (let index = open + 1; index <= close; index += 1) {
      const char = bare[index]!;
      if ("([{".includes(char)) index = closing(bare, index);
      else if (char === "," || index === close) {
        const entry = code.slice(from, index);
        const name = entry.trim();
        const at = from + entry.indexOf(name);
        if (name !== "") {
          const colon = bare.indexOf(":", at);
          const label = colon < 0 || colon >= index ? name : code.slice(at, colon).trim();
          if (/^["']/.test(label)) keys.push(keyOf(at, at + label.length));
          else if (/^\[.*\]$/s.test(label)) keys.push(keyOf(at + 1, at + label.length - 1));
          else keys.push(/^[\w$]+$/.test(label) ? label : null);
        }
        from = index + 1;
      }
    }
    return keys;
  };

  const found: { at: number; method: string; key: string | null }[] = [];
  for (const match of bare.matchAll(new RegExp("(?<![\\w$])(" + METHOD + ")(?![\\w$])", "g"))) {
    const method = match[1]!;
    const paren = match.index + method.length + (/^\s*/.exec(bare.slice(match.index + method.length))?.[0].length ?? 0);
    if (bare[paren] !== "(") {
      found.push({ at: match.index, method, key: null });
      continue;
    }
    const end = closing(bare, paren);
    let comma = paren + 1;
    while (comma < end && bare[comma] !== ",") comma = "([{".includes(bare[comma]!) ? closing(bare, comma) + 1 : comma + 1;
    const argument = bare.slice(paren + 1, comma).trim();
    if (method !== "setItems") found.push({ at: match.index, method, key: keyOf(paren + 1, comma) });
    else if (argument.startsWith("{") && argument.endsWith("}")) {
      const open = bare.indexOf("{", paren);
      for (const key of objectKeys(open, closing(bare, open))) found.push({ at: match.index, method, key });
    } else found.push({ at: match.index, method, key: null });
  }
  for (const match of code.matchAll(new RegExp("\\[\\s*([\"'`])(" + METHOD + ")\\1\\s*\\]", "g"))) found.push({ at: match.index, method: match[2]!, key: null });
  return found.sort((a, b) => a.at - b.at).map(({ method, key }) => ({ method, key }));
}
