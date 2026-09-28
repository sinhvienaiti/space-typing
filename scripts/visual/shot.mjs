#!/usr/bin/env node
/**
 * Visual check: opens a page in headless Chrome through the Chrome DevTools
 * Protocol, optionally clicks a button, waits, evaluates a JS expression and
 * saves a PNG screenshot for an AI agent (or a person) to look at.
 * Guide: docs/VISUAL_TESTING.md.
 *
 *   pnpm visual:shot <url> <out.png> [--wait=6000] [--width=1642] [--height=799]
 *     [--dpr=2] [--click=#startButton] [--click-delay=4000]
 *     [--eval="<js expression>"] [--eval-file=scripts/visual/evals/<name>.js]
 *
 * Prints one JSON line: the eval result, console warnings/errors and page
 * exceptions. Needs Chrome (CHROME_PATH overrides the default path) and
 * Node 22+ (built-in WebSocket).
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const DEFAULT_CHROME = {
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "/usr/bin/google-chrome",
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
};

function flag(name, fallback) {
  const prefix = "--" + name + "=";
  const match = process.argv.find((argument) => argument.startsWith(prefix));
  return match === undefined ? fallback : match.slice(prefix.length);
}

const [url, out] = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
if (url === undefined || out === undefined) {
  console.error(
    "Usage: pnpm visual:shot <url> <out.png> [--wait=ms] [--width=px] [--height=px] [--dpr=n]\n" +
      "       [--click=<css selector>] [--click-delay=ms] [--eval=<js>] [--eval-file=<path>]",
  );
  process.exit(2);
}
if (typeof WebSocket === "undefined") {
  console.error("Node 22+ is required (built-in WebSocket).");
  process.exit(2);
}

const chrome = process.env.CHROME_PATH ?? DEFAULT_CHROME[process.platform];
if (chrome === undefined || !existsSync(chrome)) {
  console.error("Chrome not found at " + chrome + "; set CHROME_PATH.");
  process.exit(2);
}

const width = Number(flag("width", "1642"));
const height = Number(flag("height", "799"));
const dpr = Number(flag("dpr", "2"));
const waitMs = Number(flag("wait", "6000"));
const clickSelector = flag("click", null);
const clickDelay = Number(flag("click-delay", "4000"));
const evalFile = flag("eval-file", null);
const expression = evalFile !== null ? readFileSync(resolve(evalFile), "utf8") : flag("eval", "null");

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const port = 9300 + Math.floor(Math.random() * 600);
const profile = mkdtempSync(join(tmpdir(), "space-typing-shot-"));
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--remote-debugging-port=" + port,
    "--window-size=" + width + "," + height,
    "--hide-scrollbars",
    // Real GPU (WebGL2 backgrounds); headless otherwise may fall back to software.
    "--ignore-gpu-blocklist",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=" + profile,
    "about:blank",
  ],
  { stdio: "ignore" },
);

function cleanup() {
  try {
    browser.kill("SIGKILL");
  } catch {
    // already gone
  }
  rmSync(profile, { recursive: true, force: true });
}

async function main() {
  let pages = [];
  for (let attempt = 0; attempt < 80 && pages.length === 0; attempt += 1) {
    try {
      pages = (await (await fetch("http://127.0.0.1:" + port + "/json/list")).json()).filter(
        (page) => page.type === "page",
      );
    } catch {
      // Chrome still starting
    }
    if (pages.length === 0) await sleep(250);
  }
  if (pages.length === 0) throw new Error("Chrome DevTools endpoint did not come up.");

  const socket = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise((done, fail) => {
    socket.addEventListener("open", done, { once: true });
    socket.addEventListener("error", fail, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  const logs = [];
  const exceptions = [];
  let loaded = false;
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== undefined && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
      return;
    }
    if (message.method === "Page.loadEventFired") loaded = true;
    if (message.method === "Runtime.consoleAPICalled" && ["warning", "error"].includes(message.params.type)) {
      logs.push(
        message.params.type + ": " +
          message.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" ").slice(0, 300),
      );
    }
    if (message.method === "Runtime.exceptionThrown") {
      const details = message.params.exceptionDetails;
      exceptions.push((details.exception?.description ?? details.text ?? "").slice(0, 400));
    }
  });
  const send = (method, params = {}) =>
    new Promise((done) => {
      const id = ++nextId;
      pending.set(id, done);
      socket.send(JSON.stringify({ id, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: dpr,
    mobile: false,
  });
  await send("Page.navigate", { url });
  for (let waited = 0; !loaded && waited < 20000; waited += 100) await sleep(100);

  if (clickSelector !== null) {
    await sleep(clickDelay);
    const clicked = await send("Runtime.evaluate", {
      expression:
        "(() => { const el = document.querySelector(" + JSON.stringify(clickSelector) +
        "); if (!el) return false; el.click(); return true; })()",
      returnByValue: true,
    });
    if (clicked.result?.result?.value !== true) logs.push("warning: click target not found: " + clickSelector);
  }
  await sleep(waitMs);

  const evaluated = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  const result =
    evaluated.result?.exceptionDetails !== undefined
      ? { evalError: evaluated.result.exceptionDetails.exception?.description ?? evaluated.result.exceptionDetails.text }
      : evaluated.result?.result?.value ?? null;

  const shot = await send("Page.captureScreenshot", { format: "png" });
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(resolve(out), Buffer.from(shot.result.data, "base64"));
  socket.close();
  console.log(
    JSON.stringify({
      out,
      viewport: width + "x" + height + "@" + dpr,
      png: width * dpr + "x" + height * dpr,
      eval: result,
      logs,
      exceptions,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(cleanup);
