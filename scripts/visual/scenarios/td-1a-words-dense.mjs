// Typing Defense 1A.4 (docs/td/BUILD_NOW.md §6.2, TK 23.14): four buildings
// within 20 m, each assisted at a 1 s tempo, words piling up to their caps. Two
// phases of 20 s: E = 12 on easy (a 5-letter word lives 7.5 s) and E = 35 on
// normal; the typist takes a word now and then, so locked cards (×1.2, slid
// right) are in the mix. Every sample measures the cards on screen: no two
// overlap, a building's column is at most 240 px tall, all cards together
// cover at most 6 % of the screen, text ≥ 18 px, inside the viewport. Must pass.
// Since the 1A.4 review it also reports how much of a card lies over each HUD
// panel (cards draw over the HUD, docs/td/BUILD_NOTES.md 1.9): at zoom 1 none may.
// Pictures td-1a-dense-easy and td-1a-dense-normal, at the most cards seen.
//   URL=http://127.0.0.1:3110/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-words-dense.mjs --width=1280 --height=720
import { DEV_URL, out } from "./common.mjs";

const td = (code) => "(() => { const t = window.__td; if (!t) return null; " + code + " })()";
/** Three by the merge (the 4-slot preset's), the fourth searched for within 20 m of their middle. */
const NEAR = [["cannon", 7, 12], ["archer", -8, 12], ["barracks", 3, 18]];
const PHASES = [["easy", 12, 20], ["normal", 35, 35]];
const PHASE_MS = 20000;

const LOOK = td(`
  const words = t.liveWords();
  const live = new Map(words.map((w) => [w.text, w]));
  const cards = [...document.querySelectorAll(".td-card")]
    .filter((el) => Number(el.style.opacity) > 0.05 && !el.classList.contains("is-ash") && live.has(el.children[1].textContent))
    .map((el) => { const r = el.getBoundingClientRect(); return { text: el.children[1].textContent, building: live.get(el.children[1].textContent).building, left: r.left, top: r.top, right: r.right, bottom: r.bottom, font: parseFloat(getComputedStyle(el).fontSize) }; });
  const panels = [...document.querySelectorAll(".td-panel")].map((el) => [el.className.replace("td-panel ", ""), el.getBoundingClientRect()])
    .filter(([, r]) => r.width > 0 && r.height > 0).map(([name, r]) => ({ name, left: r.left, top: r.top, right: r.right, bottom: r.bottom }));
  return { words, cards, panels, width: innerWidth, height: innerHeight };`);

async function letter(page, ch) {
  const vk = ch.toUpperCase().charCodeAt(0);
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: ch, code: "Key" + ch.toUpperCase(), text: ch, unmodifiedText: ch, windowsVirtualKeyCode: vk });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: ch, code: "Key" + ch.toUpperCase(), windowsVirtualKeyCode: vk });
}

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const size = page.width + "x" + page.height;
  await page.goto(base + "/td.html?sandbox=1", { settle: 300 });
  let ready = false;
  for (let wait = 0; wait < 80 && !ready; wait += 1) {
    ready = (await page.eval(td("return t.ready();"))) === true;
    if (!ready) await page.sleep(250);
  }
  await page.eval(td(`
    t.send({ t: "sandbox", op: { op: "keepLevel", value: 4 } });
    t.send({ t: "sandbox", op: { op: "gold", value: 2000 } });
    for (const [id, x, z] of ${JSON.stringify(NEAR)}) t.send({ t: "build", def: t.defs().indexOf(id), qx: x * 4, qz: z * 4 });
    return true;`));
  await page.sleep(200);
  // The fourth: an archer on the nearest free half-metre point to the three's middle, all four then within 20 m.
  const fourth = await page.eval(td(`
    const spots = [];
    for (let x = -10; x <= 10; x += 0.5) for (let z = 4; z <= 26; z += 0.5) if (t.canPlace("archer", x, z).ok) spots.push([x, z]);
    spots.sort((a, b) => (a[0] - 0.7) ** 2 + (a[1] - 14) ** 2 - (b[0] - 0.7) ** 2 - (b[1] - 14) ** 2);
    const [x, z] = spots[0];
    t.send({ t: "build", def: t.defs().indexOf("archer"), qx: x * 4, qz: z * 4 });
    return [x, z];`));
  await page.sleep(1800);
  const ids = await page.eval(td(`
    const built = t.state().buildings.filter((b) => b.def !== "keep");
    built.forEach((b, agent) => t.send({ t: "assignUnit", agent, building: b.id }));
    return built.map((b) => ({ id: b.id, def: b.def, x: b.x, z: b.z }));`));
  const span = Math.max(...ids.flatMap((a) => ids.map((b) => Math.hypot(a.x - b.x, a.z - b.z))));
  for (let wait = 0; wait < 60; wait += 1) {
    if ((await page.eval(td("return t.state().agents.every((a) => a.at >= 0);"))) === true) break;
    await page.sleep(250);
  }
  await page.eval(td(`for (const b of ${JSON.stringify(ids)}) t.send({ t: "setTempo", building: b.id, idx: 6 }); return true;`));

  const problems = [];
  const shots = [];
  const phases = [];
  let samples = 0;
  /** Per HUD panel: the largest card area over it (px²), and in how many looks. */
  const overHud = {};
  for (const [difficulty, expected, wpm] of PHASES) {
    await page.eval(td(`t.send({ t: "sandbox", op: { op: "difficulty", value: "${difficulty}" } }); t.send({ t: "sandbox", op: { op: "expected", value: ${expected} } }); return true;`));
    const keyMs = 60000 / (wpm * 5);
    const ends = Date.now() + PHASE_MS;
    let most = 0;
    let shot = null;
    let tallest = 0;
    let area = 0;
    let minFont = Infinity;
    let typing = 0;
    while (Date.now() < ends) {
      const tickAt = Date.now();
      const look = await page.eval(LOOK);
      if (look === null) break;
      samples += 1;
      const { cards, words } = look;
      for (let i = 0; i < cards.length; i += 1) {
        for (let j = i + 1; j < cards.length; j += 1) {
          const [a, b] = [cards[i], cards[j]];
          if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1 && problems.length < 12) problems.push(difficulty + " overlap: " + a.text + " / " + b.text);
        }
      }
      for (const card of cards) {
        minFont = Math.min(minFont, card.font);
        if ((card.left < 0 || card.top < 0 || card.right > look.width || card.bottom > look.height) && problems.length < 12) problems.push(difficulty + " off screen: " + card.text);
        for (const panel of look.panels) {
          const area = Math.max(0, Math.min(card.right, panel.right) - Math.max(card.left, panel.left)) * Math.max(0, Math.min(card.bottom, panel.bottom) - Math.max(card.top, panel.top));
          if (area <= 0) continue;
          overHud[panel.name] = { px2: Math.max(overHud[panel.name]?.px2 ?? 0, Math.round(area)), looks: (overHud[panel.name]?.looks ?? 0) + 1 };
        }
      }
      for (const id of new Set(cards.map((card) => card.building))) {
        const column = cards.filter((card) => card.building === id);
        tallest = Math.max(tallest, Math.max(...column.map((c) => c.bottom)) - Math.min(...column.map((c) => c.top)));
      }
      const share = cards.reduce((sum, c) => sum + (c.right - c.left) * (c.bottom - c.top), 0) / (look.width * look.height);
      area = Math.max(area, share);
      if (cards.length > most) {
        most = cards.length;
        if (Date.now() > ends - PHASE_MS + 6000) shot = await page.shot(out("td-1a-dense-" + difficulty + "-" + size + ".png"));
      }
      // Every third look the typist works on a word: a locked card in the mix, the others left to pile up.
      const locked = words.find((word) => word.locked);
      if (locked !== undefined || samples % 3 === 0) {
        const target = locked ?? words.slice().sort((a, b) => a.left - b.left)[0];
        if (target !== undefined && !words.some((word) => word !== target && word.text[0] === target.text[0] && !locked)) {
          await letter(page, locked ? target.text[target.typed] : target.text[0]);
          typing += 1;
        }
      }
      await page.sleep(Math.max(0, keyMs - (Date.now() - tickAt)));
    }
    if (shot === null) shot = await page.shot(out("td-1a-dense-" + difficulty + "-" + size + ".png"));
    shots.push(shot);
    phases.push({ difficulty, expected, mostCards: most, tallestColumnPx: Math.round(tallest), cardAreaPct: +(area * 100).toFixed(2), minFontPx: minFont, keys: typing });
  }
  const checks = {
    ready,
    fourWithin20m: ids.length === 4 && span <= 20,
    cardsPiledUp: phases.every((phase) => phase.mostCards >= 8),
    noOverlap: problems.filter((p) => p.includes("overlap")).length === 0,
    insideScreen: problems.filter((p) => p.includes("off screen")).length === 0,
    columnsAtMost240px: phases.every((phase) => phase.tallestColumnPx <= 240),
    cardsAtMost6PctOfScreen: phases.every((phase) => phase.cardAreaPct <= 6),
    cardText18px: phases.every((phase) => phase.minFontPx >= 18),
    cardsClearOfHudPanels: Object.keys(overHud).length === 0,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, fourth, buildings: ids, spanM: +span.toFixed(1), samples, phases, cardsOverHud: overHud, problems, shots };
}
