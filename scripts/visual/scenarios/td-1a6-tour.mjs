// Typing Defense 1A.6 "Lời Gọi" (docs/td/BUILD_1A6.md §12 gate 8): the owner's picture set, one run on the
// real vocabulary with real keys and clicks, the sandbox panel hidden (F9) but in its own last picture.
// The preset village with a site by the Bastion and one far north (its builder calls from afar), Chấm by
// the farm, the hero by the south-east trees, five trees by the stream marked with real clicks. Pictures
// (td-1a6-tour-NN-<name>-<size>.png), each checked to show its state:
//   01 village by day (zoom 1)          02 the village at 2× (wheel): far calls are arrows at the edge
//   03 bright calls, a word being typed  04 dim bubbles (the hero flown off)
//   05 Tab on a dim call: its card       06 the farm's card        07 the Bastion's card
//   08 the learn mode: meanings on the cards                       09 a quiz (meaning, first letter, blanks)
//   10 the tactical pause (learn)        11 the night: a power call up
//   12 the night: charge dots on a tower  13 the merge at 2× at night (charges, a power call)
//   14 the sandbox panel
// Every look's cards are measured and gated (cardsClean: no overlap, clear of the HUD, ≥ 18 px); no console error.
//   URL=http://127.0.0.1:3140/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a6-tour.mjs --width=1280 --height=720
import {
  KIND, arrows, boot, cardStats, cardSummary, cardsClean, click, consoleChecks, finish, key, letter, look, out, sandbox, send, sizeOf, state, td, typeFor, until, wheel,
} from "./td-1a6-common.mjs";

const q = (m) => Math.round(m * 4);
const ZOOM = 5; // wheel steps: 1.15^5 ≈ 2×

export default async function (page) {
  const size = sizeOf(page);
  const shots = [];
  const shown = {};
  const cards = cardStats();
  const shot = async (name) => {
    const file = await page.shot(out("td-1a6-tour-" + name + "-" + size + ".png"));
    shots.push(file);
    return file;
  };
  const ready = await boot(page);
  await key(page, "F9");
  await sandbox(page, "preset");
  await sandbox(page, "gold", 900);
  await sandbox(page, "wood", 300);
  await page.sleep(300);
  const sites = await page.eval(td(`
    const near = (cx, cz, r) => {
      const spots = [];
      for (let x = cx - r; x <= cx + r; x += 0.5) for (let z = cz - r; z <= cz + r; z += 0.5) if (t.canPlace("archer", x, z).ok) spots.push([x, z]);
      return spots.sort((a, b) => (a[0] - cx) ** 2 + (a[1] - cz) ** 2 - (b[0] - cx) ** 2 - (b[1] - cz) ** 2)[0] ?? null;
    };
    return [near(-6, 29, 5), near(-16, -2, 6)];`));
  const archer = (await page.eval(td("return t.defs();"))).indexOf("archer");
  const farm = (await state(page)).buildings.find((b) => b.def === "farm");
  await send(page,
    ...sites.filter((spot) => spot !== null).map(([x, z]) => ({ t: "build", def: archer, qx: q(x), qz: q(z) })),
    { t: "assignUnit", agent: 1, building: farm.id },
    { t: "move", agent: 0, qx: q(12), qz: q(36) });
  for (const [x, z] of [[-19.5, -31], [-20, -27], [-18.5, -23], [-16.5, -29], [-19.5, -19]]) await click(page, x, z);
  await page.sleep(4500);

  // 01, 02: the village, at zoom 1 and at 2×; far calls show as arrows at the edge.
  const v1 = await look(page, cards);
  await shot("01-village");
  const s1 = await state(page);
  const village = { buildings: s1.buildings.length, npcs: s1.npcs.length, marked: s1.trees.filter((tree) => tree.marked).length, calls: s1.calls.length, cards: v1.cards.length };
  shown.village = village.buildings >= 7 && village.npcs >= 9 && village.marked >= 10 && village.calls >= 2;
  const at = await wheel(page, 0, 36, -ZOOM);
  let edge = [];
  for (let k = 0; k < 40 && !edge.some((a) => a.edge && a.match); k += 1) {
    await page.sleep(500);
    edge = (await page.eval(arrows(ZOOM, at))) ?? [];
  }
  await shot("02-village-zoom");
  shown.zoomArrows = edge.some((a) => a.edge && a.match);
  await wheel(page, 0, 36, ZOOM);

  // 03: bright calls, a word half typed (two words typed sloppy on the way: the review book for the quiz).
  const sloppy = { left: 2, wrongs: 0 };
  const day0 = Date.now();
  while (Date.now() - day0 < 25000 && !shown.bright) {
    await typeFor(page, 500, { wpm: 45, sloppy });
    const v = await look(page, cards);
    const locked = v.words.find((w) => w.locked && w.typed >= 2 && w.typed < w.text.length - 1);
    if (sloppy.left === 0 && v.bright >= 2 && v.cards.length >= 2 && locked) {
      await shot("03-bright-calls");
      shown.bright = true;
    }
  }
  if (!shown.bright) await shot("03-bright-calls");
  if ((await page.eval(td("return t.typing().lock;"))) >= 0) await key(page, "Escape");

  // 04: the hero flies north; the village's calls dim.
  await send(page, { t: "move", agent: 0, qx: 0, qz: q(10) });
  const dim = await until(page, "const s = t.state(); return s.calls.filter((c) => c.open && !c.bright).length >= 2 ? s.calls.filter((c) => c.open && !c.bright).length : null;", 25000, 400);
  await look(page, cards);
  await shot("04-dim-bubbles");
  shown.dim = dim !== null;

  // 05: Tab to a dim call; its card; Enter sends the hero.
  let tabbed = null;
  for (let k = 0; k < 24 && tabbed === null; k += 1) {
    await key(page, "Tab");
    const u = await page.eval(td("return t.ui();"));
    if (u.call >= 0) tabbed = u;
  }
  const callCard = (await page.eval(`document.querySelector(".td-dock")?.textContent ?? ""`)) ?? "";
  await shot("05-tab-dim-call");
  shown.tabCall = tabbed !== null && /đang mờ/.test(callCard);
  await key(page, "Enter");
  await key(page, "Escape");

  // 06, 07: the farm's and the Bastion's cards.
  await click(page, farm.x + 2.3, farm.z);
  await page.sleep(300);
  const farmCard = (await page.eval(`document.querySelector(".td-dock")?.textContent ?? ""`)) ?? "";
  await shot("06-farm-card");
  shown.farmCard = /Chín|Lớn|Trống/.test(farmCard) && /Mua 4 hạt/.test(farmCard);
  await click(page, 0, 43.5);
  await page.sleep(300);
  const keepCard = (await page.eval(`document.querySelector(".td-dock")?.textContent ?? ""`)) ?? "";
  await shot("07-keep-card");
  shown.keepCard = /Dân/.test(keepCard) && /Bán 10 Lúa/.test(keepCard);
  await key(page, "Escape");

  // 08: the learn mode, the hero back in the village: meanings on the cards as they light.
  await sandbox(page, "mode", "learn");
  await send(page, { t: "move", agent: 0, qx: q(12), qz: q(36) });
  const learn0 = Date.now();
  while (Date.now() - learn0 < 20000 && !shown.learn) {
    await page.sleep(300);
    const v = await look(page, cards);
    if (v.cards.filter((c) => c.mean.trim() !== "" && !c.cls.includes("is-mean")).length >= 1) {
      await shot("08-learn");
      shown.learn = true;
    }
  }
  if (!shown.learn) await shot("08-learn");

  // 09: a quiz, the hero off the village again; two letters typed, then the rest.
  await send(page, { t: "move", agent: 0, qx: 0, qz: q(14) });
  const quiz = await until(page, `
    const s = t.state();
    const ids = s.calls.filter((c) => c.kind === ${KIND.quiz} && c.bright).map((c) => c.id);
    const word = t.liveWords().find((w) => ids.includes(w.call));
    return word ? { word, knowledge: s.knowledge } : null;`, 40000, 300);
  let quizCard = "";
  if (quiz !== null) {
    await page.sleep(300);
    await letter(page, quiz.word.text[0]);
    await page.sleep(120);
    await letter(page, quiz.word.text[1]);
    await page.sleep(300);
    await look(page, cards);
    quizCard = (await page.eval(`[...document.querySelectorAll(".td-card.is-quiz")].find((el) => Number(el.style.opacity) > 0.5)?.textContent ?? ""`)) ?? "";
    await shot("09-quiz");
    for (const ch of quiz.word.text.slice(2)) {
      await letter(page, ch);
      await page.sleep(100);
    }
  } else await shot("09-quiz");
  const learned = await until(page, `const s = t.state(); return s.knowledge > ${quiz?.knowledge ?? 1e9} ? s.knowledge : null;`, 4000, 200);
  shown.quiz = quiz !== null && quizCard.includes("_") && learned !== null;

  // 10: the tactical pause (a Space within 0.8 s of a typed letter is a word gap, swallowed: review R2).
  await page.sleep(1000);
  await key(page, "Space", { pause: 300 });
  const paused = await page.eval(td("const a = t.state().tick; return new Promise((r) => setTimeout(() => r({ a, b: t.state().tick, tactical: t.ui().tactical }), 500));"));
  await shot("10-tactical-pause");
  shown.pause = paused?.a === paused?.b && paused?.tactical === true;
  await key(page, "Space", { pause: 300 });

  // 11–13: the night at the merge: power calls typed, charge dots, the merge at 2×.
  await sandbox(page, "mode", "balanced");
  await send(page, { t: "move", agent: 0, qx: 0, qz: q(13) });
  await page.sleep(2500);
  await key(page, "Enter", { shift: true });
  const night0 = Date.now();
  while (Date.now() - night0 < 90000) {
    const s = await state(page);
    const power = s.calls.filter((c) => c.kind === KIND.power && c.bright).map((c) => c.id);
    const words = await page.eval(td("return t.liveWords();"));
    if (!shown.power && words.some((w) => power.includes(w.call) && w.typed === 0)) {
      await page.sleep(120);
      await look(page, cards);
      await shot("11-night-power");
      shown.power = true;
    }
    await typeFor(page, 600, { wpm: 50, kinds: [KIND.power] });
    const after = await state(page);
    if (!shown.charges && after.phase === "night" && after.buildings.some((b) => b.def !== "keep" && b.charges >= 2)) {
      await look(page, cards);
      await shot("12-night-charges");
      shown.charges = true;
    }
    if (shown.charges && !shown.nightZoom && after.phase === "night" && (after.buildings.some((b) => b.charges >= 1) || after.calls.some((c) => c.kind === KIND.power))) {
      await wheel(page, 0, 13, -ZOOM);
      await shot("13-night-zoom");
      const z = await state(page);
      shown.nightZoom = z.phase === "night" && (z.buildings.some((b) => b.charges >= 1) || z.calls.some((c) => c.kind === KIND.power));
      await wheel(page, 0, 13, ZOOM);
    }
    if (shown.power && shown.charges && shown.nightZoom) break;
    if (after.phase !== "night" && Date.now() - night0 > 4000) await sandbox(page, "night");
  }
  for (const [flag, name] of [["power", "11-night-power"], ["charges", "12-night-charges"], ["nightZoom", "13-night-zoom"]]) if (!shown[flag]) await shot(name);

  // 14: the sandbox panel.
  await key(page, "F9");
  await page.sleep(300);
  const panel = (await page.eval(`document.querySelector(".td-sandbox")?.textContent ?? ""`)) ?? "";
  await shot("14-sandbox");
  shown.sandbox = /Hộp cát/.test(panel) && /Chế độ/.test(panel) && /Đặt sẵn/.test(panel);

  const checks = {
    ready,
    // Live cards never overlap, sit clear of the HUD panels, ≥ 18 px, on screen (the locked card's ×1.2 included, review R3).
    cardsClean: cardsClean(cards),
    sitesPlaced: sites.every((spot) => spot !== null),
    ...Object.fromEntries(["village", "zoomArrows", "bright", "dim", "tabCall", "farmCard", "keepCard", "learn", "quiz", "pause", "power", "charges", "nightZoom", "sandbox"].map((name) => [name, shown[name] === true])),
    ...consoleChecks(page),
  };
  return finish(page, checks, {
    sites, village, arrows: edge.filter((a) => a.edge), callCard, farmCard, keepCard, quiz: quiz?.word?.text ?? null, quizCard, paused, cards: { clean: cardsClean(cards), ...cardSummary(cards) }, shots,
  });
}
