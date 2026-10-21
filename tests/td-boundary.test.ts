import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Typing Defense's boundary (docs/td/TYPING_DEFENSE_DESIGN.md 25.3,
 * docs/td/BUILD_NOW.md §2). src/td is a new game beside Rift Defense V4: it
 * loads itself, src/platform, three, @fontsource and a short list of Space
 * Typing modules; its rules (sim/, typing/, content/) are deterministic
 * TypeScript that a replay on Node and in Chrome steps to the same hash.
 */
const ROOT = join(__dirname, "..");

type Source = { path: string; text: string };

function sources(dir: string): Source[] {
  const absolute = join(ROOT, dir);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute).flatMap((name) => {
    const path = dir + "/" + name;
    if (statSync(join(ROOT, path)).isDirectory()) return sources(path);
    return /\.(ts|tsx|js|mjs|css)$/.test(name) ? [{ path, text: readFileSync(join(ROOT, path), "utf8") }] : [];
  });
}

/**
 * Space Typing modules src/td may still load, by whom and which exports
 * (BUILD_NOW §2). Only app/, view/ and legacy/ hold them, and the list may only
 * get shorter. @fontsource/be-vietnam-pro, also named there, is a package
 * that rule 1 allows everywhere, so it needs no entry.
 */
const LEGACY_IMPORTS: readonly { module: string; names: readonly string[]; from: readonly string[] }[] = [
  { module: "src/scene3d/keys", names: ["typedLetter", "isComposingKey", "vietnameseInputSign"], from: ["src/td/app/input.ts"] },
  { module: "src/logic", names: ["typingText"], from: ["src/td/app/vocab.ts"] },
  { module: "src/vocabulary", names: ["loadVocabularyIndex", "loadVocabularyLevel"], from: ["src/td/app/vocab.ts"] },
];
const PACKAGES = /^(three|three\/examples\/jsm\/.+|@fontsource\/.+)$/;
const PURE_ROOTS = ["src/td/sim/", "src/td/typing/", "src/td/content/"];
const PURE_PLATFORM = ["src/platform/rng"];
const ALLOWED_MATH = ["sqrt", "floor", "ceil", "round", "trunc", "abs", "min", "max", "sign", "imul", "clz32"];
const FORBIDDEN_GLOBALS = [
  "window", "document", "performance", "Date", "localStorage", "sessionStorage", "requestAnimationFrame",
  "setTimeout", "setInterval", "globalThis", "navigator", "crypto",
];

/**
 * Blanks comments and, with `strings`, what string and template literals
 * hold (not a template's `${…}` code), keeping every offset and line break.
 */
function blank(text: string, strings: boolean): string {
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

type Import = { spec: string; names: string[] };

function namesOf(clause: string): string[] {
  const names: string[] = [];
  const braces = /\{([^}]*)\}/.exec(clause);
  for (const part of braces?.[1]?.split(",") ?? []) {
    const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]!.trim();
    if (name !== "") names.push(name);
  }
  const outside = clause.replace(/\{[^}]*\}/, "").replace(/^\s*type\s+/, "");
  if (outside.includes("*")) names.push("*");
  if (/^\s*[\w$]+\s*(,|$)/.test(outside)) names.push("default");
  return names;
}

function importsOf(source: Source): Import[] {
  if (source.path.endsWith(".css")) {
    const code = source.text.replace(/\/\*[\s\S]*?\*\//g, "");
    return [...code.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g)].map((match) => ({ spec: match[1]!, names: [] }));
  }
  const code = blank(source.text, false);
  const found: Import[] = [];
  // An import clause holds no quote, semicolon, parenthesis or "=": the match cannot run on from an `export const`.
  for (const match of code.matchAll(/\b(?:import|export)\s+(?!["'(])([^"';()=]*?)\s*from\s*["']([^"']+)["']/g)) found.push({ spec: match[2]!, names: namesOf(match[1]!) });
  for (const match of code.matchAll(/\bimport\s*["']([^"']+)["']/g)) found.push({ spec: match[1]!, names: [] });
  for (const match of code.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) found.push({ spec: match[1]!, names: ["*"] });
  return found;
}

/** A relative import as a repo path without its extension ("src/scene3d/keys"); a package as written. */
function target(file: string, spec: string): string {
  const bare = spec.split("?")[0]!;
  if (!bare.startsWith(".")) return bare;
  return relative(ROOT, resolve(ROOT, dirname(file), bare)).split(sep).join("/").replace(/\.(ts|tsx|js|mjs)$/, "");
}

function purityProblems(text: string): string[] {
  const code = blank(text, true);
  const problems: string[] = [];
  const globals = new RegExp("(?<![\\w$.])(" + FORBIDDEN_GLOBALS.join("|") + ")(?![\\w$])", "g");
  for (const match of code.matchAll(globals)) problems.push(match[1]!);
  const math = new RegExp("\\bMath\\b(?!\\s*\\.\\s*(?:" + ALLOWED_MATH.join("|") + ")\\b)(\\s*\\.\\s*\\w+)?", "g");
  for (const match of code.matchAll(math)) problems.push(match[0].replace(/\s/g, ""));
  if (code.includes("**")) problems.push("**");
  return problems;
}

const isPure = (path: string) => PURE_ROOTS.some((root) => path.startsWith(root)) || PURE_PLATFORM.some((module) => path.replace(/\.ts$/, "") === module);

const td = sources("src/td");
const platform = sources("src/platform");
const pure = [...td, ...platform].filter((source) => isPure(source.path));

describe("Typing Defense boundary (TK 25.3)", () => {
  it("td.html boots src/td/main.ts and is a build input", () => {
    expect(readFileSync(join(ROOT, "td.html"), "utf8")).toMatch(/<script type="module" src="\/src\/td\/main\.ts"><\/script>/);
    expect(readFileSync(join(ROOT, "vite.config.ts"), "utf8")).toMatch(/\btd: resolve\(projectRoot, "td\.html"\)/);
    expect(td.map((source) => source.path)).toContain("src/td/main.ts");
  });

  it("src/td loads only itself, src/platform, three, @fontsource and LEGACY_IMPORTS", () => {
    const crossing = td.flatMap((source) =>
      importsOf(source)
        .filter(({ spec, names }) => {
          const path = target(source.path, spec);
          if (path.startsWith("src/td/") || path.startsWith("src/platform/") || PACKAGES.test(path)) return false;
          const legacy = LEGACY_IMPORTS.find((entry) => entry.module === path && entry.from.includes(source.path));
          return legacy === undefined || names.length === 0 || names.some((name) => !legacy.names.includes(name));
        })
        .map(({ spec }) => source.path + " → " + spec),
    );
    expect(crossing).toEqual([]);
  });

  it("holds LEGACY_IMPORTS only in app/, view/, legacy/, for exports that exist", () => {
    for (const entry of LEGACY_IMPORTS) {
      expect(entry.module, entry.module).toMatch(/^src\/(?!td\/|platform\/|defense\/)/);
      for (const holder of entry.from) expect(holder).toMatch(/^src\/td\/(app|view|legacy)\//);
      const text = readFileSync(join(ROOT, entry.module + ".ts"), "utf8");
      for (const name of entry.names) expect(text, entry.module + " " + name).toMatch(new RegExp("export\\s+(?:async\\s+)?(?:function|const|class)\\s+" + name + "\\b"));
    }
  });

  it("src/td never loads Rift Defense V4 (src/defense)", () => {
    const crossing = td.flatMap((source) =>
      importsOf(source)
        .filter(({ spec }) => target(source.path, spec).startsWith("src/defense/") || /(^|\/)defense\//.test(spec))
        .map(({ spec }) => source.path + " → " + spec),
    );
    expect(crossing).toEqual([]);
  });

  it("the rules (sim/, typing/, content/) load only the rules and src/platform/rng", () => {
    expect(pure.map((source) => source.path)).toContain("src/platform/rng.ts");
    const crossing = pure.flatMap((source) =>
      importsOf(source)
        .filter(({ spec }) => {
          const path = target(source.path, spec);
          return !PURE_ROOTS.some((root) => path.startsWith(root)) && !PURE_PLATFORM.includes(path);
        })
        .map(({ spec }) => source.path + " → " + spec),
    );
    expect(crossing).toEqual([]);
  });

  it("the rules use no clock, DOM, storage, Math.random, trigonometry, powers or logarithms", () => {
    const found = pure.flatMap((source) => purityProblems(source.text).map((problem) => source.path + ": " + problem));
    expect(found).toEqual([]);
  });

  it("asset URLs stay under /assets/td/ or /assets/shared/ (legacy/ aside)", () => {
    const found = td
      .filter((source) => !source.path.startsWith("src/td/legacy/"))
      .flatMap((source) => [...blank(source.text, false).matchAll(/\/assets\/(?!td\/|shared\/)[^\s"'`)]*/g)].map((match) => source.path + ": " + match[0]));
    expect(found).toEqual([]);
  });

  it("src/platform loads nothing from Space Typing", () => {
    expect(platform.length).toBeGreaterThan(0);
    const crossing = platform.flatMap((source) =>
      importsOf(source)
        .filter(({ spec }) => spec.startsWith(".") && !target(source.path, spec).startsWith("src/platform/"))
        .map(({ spec }) => source.path + " → " + spec),
    );
    expect(crossing).toEqual([]);
  });
});

describe("the boundary checks themselves", () => {
  it("find banned calls in code, not in comments or strings", () => {
    expect(purityProblems("const a = Math.random();")).toEqual(["Math.random"]);
    expect(purityProblems("const a = Math.hypot(x, y) + Math.sin(t);")).toEqual(["Math.hypot", "Math.sin"]);
    expect(purityProblems("const { cos } = Math;")).toEqual(["Math"]);
    expect(purityProblems("let a = b ** 2; a **= 2;")).toEqual(["**"]);
    expect(purityProblems("const now = Date.now(); window.x = performance.now();")).toEqual(["Date", "window", "performance"]);
    expect(purityProblems("const label = `${Math.cos(a)}`;")).toEqual(["Math.cos"]);
    expect(purityProblems("const r = Math.sqrt(x * x + y * y) + Math.imul(a, b) + Math.floor(c);")).toEqual([]);
    expect(purityProblems("// Math.random() and a ** b\n/** Date.now() */\nconst s = \"window Math.sin\" + `Date ${x}`;\nconst t = point.window;")).toEqual([]);
  });

  it("read every kind of import", () => {
    const source = (text: string, path = "src/td/app/a.ts") => importsOf({ path, text });
    expect(source('import { a, type B as C } from "../x";')).toEqual([{ spec: "../x", names: ["a", "B"] }]);
    expect(source('import D, * as E from "y";\nexport * from "./z";\nimport F from "w";')).toEqual([
      { spec: "y", names: ["*", "default"] },
      { spec: "./z", names: ["*"] },
      { spec: "w", names: ["default"] },
    ]);
    expect(source('export function f() { return a }\nexport const g = { b: 1 }\nimport { h } from "../v";')).toEqual([{ spec: "../v", names: ["h"] }]);
    expect(source('import "./td.css";\nconst m = await import("../../defense/main");\n// import { x } from "../../scene3d/hero";')).toEqual([
      { spec: "./td.css", names: [] },
      { spec: "../../defense/main", names: ["*"] },
    ]);
    expect(source('@import "@fontsource/be-vietnam-pro/700.css";\n/* @import "x.css"; */', "src/td/ui/td.css")).toEqual([{ spec: "@fontsource/be-vietnam-pro/700.css", names: [] }]);
    expect(target("src/td/app/input.ts", "../../scene3d/keys")).toBe("src/scene3d/keys");
    expect(target("src/td/sim/world.ts", "../../platform/rng.ts")).toBe("src/platform/rng");
  });
});
