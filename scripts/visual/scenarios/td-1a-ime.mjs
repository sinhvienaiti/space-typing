// Typing Defense 1A.4 (docs/td/BUILD_NOW.md §6.2; kept for 1A.6, BUILD_1A6 §8), after campaign3d-ime.mjs:
// what a Vietnamese input method sends must never act as a command. UniKey /
// EVKey rewrite in place: Telex "aa", "dd", "ee" and VNI "a1", "o6" reach the
// page as the first letter, a Backspace and the accented letter (no key code;
// VNI's digit never arrives). An OS input method composes: "Process" presses,
// keyCode 229, a digit among them. Then plain keys: Digit2 / Digit4 / Digit1
// pick an agent, Backquote steps through them, Tab and Enter send one; "-"
// and "=" (the 1A tempo keys, gone in 1A.6 "Lời Gọi", BUILD_1A6 §8) make no
// command. Checks: the Vietnamese and
// composing presses made only key and backspace commands and moved no
// selection; the HUD asked to switch the input method off; digits pick, and
// Backquote is safe right after them. Picture td-1a-ime with the notice up.
//   URL=http://127.0.0.1:3140/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-ime.mjs --width=1280 --height=720
import { DEV_URL, out } from "./common.mjs";

const td = (code) => "(() => { const t = window.__td; if (!t) return null; " + code + " })()";
const KEYS = {
  Digit1: ["1", 49], Digit2: ["2", 50], Digit4: ["4", 52], Backquote: ["`", 192], Tab: ["Tab", 9], Enter: ["Enter", 13],
  Minus: ["-", 189], Equal: ["=", 187], Backspace: ["Backspace", 8], Escape: ["Escape", 27],
};

async function command(page, code) {
  const [key, vk] = KEYS[code];
  await page.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code, windowsVirtualKeyCode: vk });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk });
  await page.sleep(80);
}

/** A plain letter, or what UniKey sends in its place: an accented letter with no key code. */
async function letter(page, ch) {
  const plain = /^[a-z]$/.test(ch);
  const code = plain ? "Key" + ch.toUpperCase() : "";
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: ch, code, text: ch, unmodifiedText: ch, windowsVirtualKeyCode: plain ? ch.toUpperCase().charCodeAt(0) : 0 });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: ch, code });
  await page.sleep(80);
}

/** An OS input method's composing press of `code`. */
async function composing(page, code) {
  await page.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Process", code, windowsVirtualKeyCode: 229 });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Process", code, windowsVirtualKeyCode: 229 });
  await page.sleep(80);
}

const ui = (page) => page.eval(td("const u = t.ui(); return { agent: u.agent, focus: u.focus, building: u.building, logLength: t.log().length };"));

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const size = page.width + "x" + page.height;
  await page.goto(base + "/td.html?sandbox=1", { settle: 300 });
  let ready = false;
  for (let wait = 0; wait < 80 && !ready; wait += 1) {
    ready = (await page.eval(td("return t.ready();"))) === true;
    if (!ready) await page.sleep(250);
  }
  // Four slots and an archer's site to focus (set up through the dev handle; what is tested is the keys).
  await page.eval(td(`t.send({ t: "sandbox", op: { op: "keepLevel", value: 4 } }); t.send({ t: "build", def: t.defs().indexOf("archer"), qx: -32, qz: 48 }); return true;`));
  await page.sleep(600);
  const before = await ui(page);

  // Telex through UniKey: "aa" → â, "dd" → đ, "viet" + "ee" → ê; VNI: "a1" → á, "o6" → ô (the digit never arrives).
  for (const [first, accented] of [["a", "â"], ["d", "đ"], ["e", "ê"], ["a", "á"], ["o", "ô"]]) {
    await letter(page, first);
    await command(page, "Backspace");
    await letter(page, accented);
  }
  // An OS input method composing "việt" and a VNI digit: Process presses with keyCode 229.
  for (const code of ["KeyV", "KeyI", "KeyE", "Digit6", "KeyJ", "KeyT", "Digit1"]) await composing(page, code);
  await page.sleep(300);
  const afterVietnamese = await ui(page);
  const shot = await page.shot(out("td-1a-ime-" + size + ".png"));
  const notice = await page.eval("document.querySelector('.td-chip').textContent.includes('Tắt bộ gõ tiếng Việt')");

  // Plain keys: digits pick, Backquote steps, Tab + Enter send, "-" "=" do nothing (no tempo since 1A.6).
  const picked = [];
  for (const code of ["Digit2", "Digit4", "Digit1"]) {
    await command(page, code);
    picked.push((await ui(page)).agent);
  }
  await letter(page, "a");
  await command(page, "Backspace");
  await letter(page, "á");
  await command(page, "Backquote");
  const cycled1 = (await ui(page)).agent;
  await command(page, "Backquote");
  const cycled2 = (await ui(page)).agent;
  await command(page, "Digit1");
  const tabbed = [];
  for (let k = 0; k < 2; k += 1) {
    await command(page, "Tab");
    tabbed.push((await ui(page)).focus);
  }
  const beforeTempoKeys = (await ui(page)).logLength;
  await command(page, "Equal");
  await command(page, "Minus");
  await page.sleep(100);
  const afterTempoKeys = (await ui(page)).logLength;
  await command(page, "Enter");
  await command(page, "Escape");
  await page.sleep(300);

  const final = await page.eval(td("return { log: t.log(), state: t.state() };"));
  const log = final?.log ?? [];
  const vietnamese = log.slice(before.logLength, afterVietnamese.logLength);
  const archer = final?.state?.buildings?.find((b) => b.def === "archer");
  const after = log.slice(afterVietnamese.logLength);
  const checks = {
    ready,
    vietnameseMadeOnlyKeys: vietnamese.length > 0 && vietnamese.every((c) => c.t === "key" || c.t === "backspace"),
    accentedLettersNotTyped: vietnamese.filter((c) => c.t === "key").length === 5,
    composingIgnored: vietnamese.length === 10,
    selectionUnmoved: afterVietnamese.agent === before.agent && afterVietnamese.focus === before.focus && afterVietnamese.building === before.building,
    hudAsksToSwitchOff: notice === true,
    digitsPickAgents: JSON.stringify(picked) === JSON.stringify([1, 3, 0]),
    backquoteSteps: cycled1 === 1 && cycled2 === 2,
    backquoteTypesNothing: after.filter((c) => c.t === "key").length === 1,
    tabFocuses: tabbed.length === 2 && tabbed[1] === archer?.id,
    minusEqualMakeNoCommand: afterTempoKeys === beforeTempoKeys,
    enterSends: after.some((c) => c.t === "assignUnit" && c.agent === 0 && c.building === archer?.id),
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, vietnameseCommands: vietnamese.map((c) => c.t + (c.t === "key" ? ":" + String.fromCharCode(97 + c.letter) : "")), picked, cycled: [cycled1, cycled2], tabbed, afterCommands: after.map((c) => c.t), shots: [shot] };
}
