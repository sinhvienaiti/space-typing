import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { blank } from "./td/source-scan";

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

type LegacyImport = { module: string; names: readonly string[]; from: readonly string[] };

/**
 * Space Typing modules src/td may still load, by whom and which exports: the
 * list in BUILD_NOW §2. Only app/, view/ and legacy/ hold them. Fonts are no
 * entry: rule 1 allows @fontsource/* everywhere.
 */
const LEGACY_IMPORTS: readonly LegacyImport[] = [
  { module: "src/scene3d/keys", names: ["typedLetter", "isComposingKey", "vietnameseInputSign"], from: ["src/td/app/input.ts"] },
  { module: "src/logic", names: ["typingText"], from: ["src/td/app/vocab.ts"] },
  { module: "src/vocabulary", names: ["loadVocabularyIndex", "loadVocabularyLevel"], from: ["src/td/app/vocab.ts"] },
];

/**
 * The 1A list, the most LEGACY_IMPORTS may ever hold: TK 25.3 rule 1 lets it
 * only get shorter. Delete what goes away; never add here, since a new
 * exception is a design change (TK 25.3), not a fix.
 */
const LEGACY_CEILING: readonly LegacyImport[] = [
  { module: "src/scene3d/keys", names: ["typedLetter", "isComposingKey", "vietnameseInputSign"], from: ["src/td/app/input.ts"] },
  { module: "src/logic", names: ["typingText"], from: ["src/td/app/vocab.ts"] },
  { module: "src/vocabulary", names: ["loadVocabularyIndex", "loadVocabularyLevel"], from: ["src/td/app/vocab.ts"] },
];

const legacyKey = (entry: LegacyImport) => entry.module + " (" + entry.names.join(", ") + ") ← " + entry.from.join(", ");

/** BUILD_NOW §2's "Ngoại lệ import cho 1A" bullets; one the pattern cannot read throws. */
function documentedLegacy(markdown: string): LegacyImport[] {
  const block = markdown.split("**Ngoại lệ import cho 1A**")[1]?.split(/\n\s*\n/)[0] ?? "";
  return block
    .split("\n")
    .filter((line) => line.startsWith("- "))
    .map((line) => {
      const match = /^- `(src\/[^`]+)\.ts` \(([^)]*)\) — dùng ở `([^`]+)`/.exec(line);
      if (match === null) throw new Error("BUILD_NOW §2: unreadable exception: " + line);
      return { module: match[1]!, names: [...match[2]!.matchAll(/`([^`]+)`/g)].map((name) => name[1]!), from: ["src/td/" + match[3]!] };
    });
}

const PACKAGES = /^(three|three\/examples\/jsm\/.+|@fontsource\/.+)$/;
const PURE_ROOTS = ["src/td/sim/", "src/td/typing/", "src/td/content/"];
const PURE_PLATFORM = ["src/platform/rng"];
const ALLOWED_MATH = ["sqrt", "floor", "ceil", "round", "trunc", "abs", "min", "max", "sign", "imul", "clz32"];
/**
 * Globals the rules may not name. After a dot a name is a property
 * (`point.window`), so `self.Date` is caught by `self`. The ES library's
 * clock, random, locale, code-from-strings and garbage-collector hooks, plus
 * host names that are rarely a local's. Every other host global (top,
 * parent, frames, name, console…) is caught by compiling the rules without
 * the DOM and Node libraries (hostProblems).
 */
const FORBIDDEN_GLOBALS = [
  "window", "self", "document", "performance", "Date", "localStorage", "sessionStorage", "requestAnimationFrame",
  "setTimeout", "setInterval", "setImmediate", "queueMicrotask", "structuredClone", "globalThis", "navigator", "crypto",
  "process", "require", "Intl", "eval", "Function", "WeakRef", "FinalizationRegistry",
];
/** ICU- and locale-dependent: Node and Chrome may sort or print differently. Banned on any object. */
const FORBIDDEN_METHODS = ["localeCompare", "toLocaleString", "toLocaleUpperCase", "toLocaleLowerCase", "toLocaleDateString", "toLocaleTimeString"];

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
  const globals = new RegExp("(?<![\\w$.])(" + FORBIDDEN_GLOBALS.join("|") + ")(?![\\w$])|(?<![\\w$])(" + FORBIDDEN_METHODS.join("|") + ")(?![\\w$])", "g");
  for (const match of code.matchAll(globals)) problems.push(match[1] ?? match[2]!);
  const math = new RegExp("\\bMath\\b(?!\\s*\\.\\s*(?:" + ALLOWED_MATH.join("|") + ")\\b)(\\s*\\.\\s*\\w+)?", "g");
  for (const match of code.matchAll(math)) problems.push(match[0].replace(/\s/g, ""));
  if (code.includes("**")) problems.push("**");
  return problems;
}

const configured = ts.parseJsonConfigFileContent(ts.readConfigFile(join(ROOT, "tsconfig.json"), ts.sys.readFile).config, ts.sys, ROOT).options;
/** tsconfig.json without the DOM libraries and with no @types: what a browser or Node supplies is undeclared. */
const HOSTLESS: ts.CompilerOptions = { ...configured, lib: (configured.lib ?? []).filter((lib) => !/dom|webworker|scripthost/i.test(lib)), types: [], noEmit: true };
const libraries = new Map<string, ts.SourceFile | undefined>();

/**
 * Compiles the given files with HOSTLESS. A host global (window, self, top,
 * parent, frames, name, performance, process, structuredClone, console…)
 * then fails as an undeclared name, while a local of the same name (an A*
 * `parent` array) still compiles. Reports the name, or the message of any
 * other error.
 */
function hostProblems(files: readonly Source[]): { path: string; problem: string }[] {
  const own = new Map(files.map((file) => [join(ROOT, file.path), file]));
  const host = ts.createCompilerHost(HOSTLESS);
  const read = host.getSourceFile.bind(host);
  const exists = host.fileExists.bind(host);
  host.fileExists = (name) => own.has(name) || exists(name);
  host.getSourceFile = (name, language, ...rest) => {
    const file = own.get(name);
    if (file !== undefined) return ts.createSourceFile(name, file.text, language);
    if (!libraries.has(name)) libraries.set(name, read(name, language, ...rest));
    return libraries.get(name);
  };
  const program = ts.createProgram({ rootNames: [...own.keys()], options: HOSTLESS, host });
  return [...own].flatMap(([name, file]) => {
    const source = program.getSourceFile(name)!;
    return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)].map((diagnostic) => {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
      const start = diagnostic.start ?? 0;
      return { path: file.path, problem: message.startsWith("Cannot find name") ? source.text.slice(start, start + (diagnostic.length ?? 0)) : message };
    });
  });
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

  it("LEGACY_IMPORTS is BUILD_NOW §2's list and never outgrows the 1A ceiling", () => {
    const documented = documentedLegacy(readFileSync(join(ROOT, "docs/td/BUILD_NOW.md"), "utf8"));
    expect(LEGACY_IMPORTS.map(legacyKey)).toEqual(documented.map(legacyKey));
    for (const entry of LEGACY_IMPORTS) {
      const ceiling = LEGACY_CEILING.find((bound) => bound.module === entry.module);
      expect(ceiling, entry.module).toBeDefined();
      expect(entry.names.filter((name) => !ceiling!.names.includes(name)), entry.module).toEqual([]);
      expect(entry.from.filter((path) => !ceiling!.from.includes(path)), entry.module).toEqual([]);
    }
    expect(LEGACY_CEILING.map(legacyKey)).toEqual([
      "src/scene3d/keys (typedLetter, isComposingKey, vietnameseInputSign) ← src/td/app/input.ts",
      "src/logic (typingText) ← src/td/app/vocab.ts",
      "src/vocabulary (loadVocabularyIndex, loadVocabularyLevel) ← src/td/app/vocab.ts",
    ]);
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

  it("the rules use no clock, host global, storage, locale, Math.random, trigonometry, powers or logarithms", () => {
    const found = pure.flatMap((source) => purityProblems(source.text).map((problem) => source.path + ": " + problem));
    expect(found).toEqual([]);
    const typescript = pure.filter((source) => source.path.endsWith(".ts"));
    expect(hostProblems(typescript).map(({ path, problem }) => path + ": " + problem)).toEqual([]);
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

  it("find the ways around a banned name", () => {
    expect(purityProblems("const t = self.performance.now() + self.Date.now();")).toEqual(["self", "self"]);
    expect(purityProblems('const r = Reflect.get(self, "Math").random();')).toEqual(["self"]);
    expect(purityProblems("globalThis.Math.random();")).toEqual(["globalThis", "Math.random"]);
    expect(purityProblems("queueMicrotask(step); setImmediate(step); const c = structuredClone(state);")).toEqual(["queueMicrotask", "setImmediate", "structuredClone"]);
    expect(purityProblems('const f = new Function("return Math.random()"); eval("Date.now()"); require("perf_hooks");')).toEqual(["Function", "eval", "require"]);
    expect(purityProblems("const t = process.hrtime(); const n = new Intl.NumberFormat(); const w = new WeakRef(o); new FinalizationRegistry(f);")).toEqual(["process", "Intl", "WeakRef", "FinalizationRegistry"]);
    expect(purityProblems("words.sort((a, b) => a.localeCompare(b)); const { localeCompare } = String.prototype;")).toEqual(["localeCompare", "localeCompare"]);
    expect(purityProblems("n.toLocaleString(); s?.toLocaleUpperCase(); s.toLocaleLowerCase(); d.toLocaleDateString(); d.toLocaleTimeString();")).toEqual([
      "toLocaleString", "toLocaleUpperCase", "toLocaleLowerCase", "toLocaleDateString", "toLocaleTimeString",
    ]);
    expect(purityProblems("words.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)); const s = word.normalize(\"NFC\").toLowerCase();")).toEqual([]);
  });

  it("find every host global by compiling without the DOM and Node libraries", () => {
    const names = (text: string) => hostProblems([{ path: "src/td/sim/probe.ts", text }]).map(({ problem }) => problem);
    expect(names("export const t = top.length + parent.x + frames + name + status + origin;")).toEqual(["top", "parent", "frames", "name", "status", "origin"]);
    expect(names("export const t = self.Date.now() + performance.now() + structuredClone(1) + process.hrtime()[0]; console.log(t);")).toEqual([
      "self", "performance", "structuredClone", "process", "console",
    ]);
    expect(names("const parent = new Int32Array(4);\nconst top = parent[0]!;\nexport const step = (frames: number) => frames + top;")).toEqual([]);
    expect(names('import { createRng } from "../../platform/rng";\nexport const draw = createRng(1).spawn.next();')).toEqual([]);
    expect(names("export const n: number = \"x\";")).toEqual(["Type 'string' is not assignable to type 'number'."]);
  });

  it("read BUILD_NOW §2's exception list", () => {
    const markdown = "**Ngoại lệ import cho 1A** (…):\n- `src/logic.ts` (`typingText`) — dùng ở `app/vocab.ts`.\n- `src/a/b.ts` (`x`, `y`) — dùng ở `view/c.ts`.\n\nPhông theo luật `@fontsource/*`.";
    expect(documentedLegacy(markdown)).toEqual([
      { module: "src/logic", names: ["typingText"], from: ["src/td/app/vocab.ts"] },
      { module: "src/a/b", names: ["x", "y"], from: ["src/td/view/c.ts"] },
    ]);
    expect(() => documentedLegacy("**Ngoại lệ import cho 1A**:\n- `@fontsource/be-vietnam-pro` — ở `ui/td.css`.")).toThrow(/unreadable/);
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
