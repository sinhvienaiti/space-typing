// Typing Defense 1A.6 "Lời Gọi" (docs/td/BUILD_1A6.md §7, §8, §12 gate 8): the learn mode.
// "Học" set before the sandbox preset, the hero by the south-east trees the villagers chop, a site by
// him. For 12 s every live word card (a bright call's bubble) must show its Vietnamese meaning from the
// moment it lights, before any key; the word strip shows the locked word's meaning and IPA. Two words
// are typed sloppy (two wrong keys each): they go into the review book. The hero flies off to the empty
// merge, so a helper's quiz lights: its card shows the meaning and the first letter with blanks
// ("… · g _ _ _"); it is typed (real keys): knowledge rises and the word leaves the book. Space pauses
// the learn mode tactically (the tick stands still, the HUD says so) and Space runs it again. Cards are
// checked at zoom 1 (no overlap, none over the HUD, ≥ 18 px); the log replays on Node to the page's
// hash. Pictures td-1a6-learn-meaning, td-1a6-learn-quiz, td-1a6-learn-pause. Exits 1 on a failed check.
//   URL=http://127.0.0.1:3140/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a6-learn.mjs --width=1280 --height=720
import { KIND, Seen, boot, cardStats, cardSummary, cardsClean, consoleChecks, finish, key, letter, look, out, replayOnNode, sandbox, send, sizeOf, state, td, typeFor, until } from "./td-1a6-common.mjs";

const q = (m) => Math.round(m * 4);

export default async function (page) {
  const size = sizeOf(page);
  const shots = [];
  const seen = new Seen();
  const cards = cardStats();
  const ready = await boot(page);
  const vocabulary = (await page.eval(td("return t.flags().vocabulary;"))) === "vocabulary";
  await sandbox(page, "mode", "learn");
  await sandbox(page, "preset");
  await sandbox(page, "gold", 800);
  await sandbox(page, "wood", 300);
  await page.sleep(200);
  const site = await page.eval(td(`
    const spots = [];
    for (let x = 4; x <= 14; x += 0.5) for (let z = 26; z <= 34; z += 0.5) if (t.canPlace("archer", x, z).ok) spots.push([x, z]);
    spots.sort((a, b) => (a[0] - 10) ** 2 + (a[1] - 31) ** 2 - (b[0] - 10) ** 2 - (b[1] - 31) ** 2);
    return spots[0] ?? null;`));
  if (site !== null) await send(page, { t: "build", def: (await page.eval(td("return t.defs();"))).indexOf("archer"), qx: q(site[0]), qz: q(site[1]) });
  await send(page, { t: "move", agent: 0, qx: q(13), qz: q(35) });

  // 1. Meanings first: every live call card shows its meaning as it lights (4 s without a key, then slow typing, two words sloppy).
  let wordCards = 0;
  let withoutMeaning = [];
  let stripMeaning = "";
  let meaningShot = false;
  const sloppy = { left: 2, wrongs: 0 };
  const learn0 = Date.now();
  while (Date.now() - learn0 < 14000) {
    const typing = Date.now() - learn0 > 4000;
    if (typing) await typeFor(page, 300, { wpm: 35, sloppy, seen });
    else await page.sleep(150);
    const v = await look(page, cards);
    for (const card of v.cards.filter((c) => !c.cls.includes("is-mean") && !c.cls.includes("is-quiz"))) {
      wordCards += 1;
      if (card.mean.trim() === "") withoutMeaning.push(card.text);
    }
    if (stripMeaning === "" && v.words.some((w) => w.locked)) stripMeaning = (await page.eval(`document.querySelector(".td-strip .td-mean")?.textContent ?? ""`)) ?? "";
    if (!meaningShot && !typing && v.cards.length >= 2) {
      meaningShot = true;
      shots.push(await page.shot(out("td-1a6-learn-meaning-" + size + ".png")));
    }
  }
  if (!meaningShot) shots.push(await page.shot(out("td-1a6-learn-meaning-" + size + ".png")));
  // Release any half-typed word, so the quiz can be locked.
  if ((await page.eval(td("return t.typing().lock;"))) >= 0) await send(page, { t: "unlock" });
  const book = (await state(page)).review;

  // 2. The quiz: the hero away from the village; a helper asks a word of the book.
  await send(page, { t: "move", agent: 0, qx: q(0), qz: q(14) });
  const quiz = await until(page, `
    const s = t.state();
    const ids = s.calls.filter((c) => c.kind === ${KIND.quiz} && c.bright).map((c) => c.id);
    const word = t.liveWords().find((w) => ids.includes(w.call));
    const card = [...document.querySelectorAll(".td-card.is-quiz")].find((el) => Number(el.style.opacity) > 0.5);
    return word && card ? { word, card: card.textContent, mean: card.querySelector(".m")?.textContent ?? "", review: s.review, knowledge: s.knowledge } : null;`, 45000, 300);
  let quizDone = null;
  if (quiz !== null) {
    await page.sleep(300);
    await look(page, cards);
    shots.push(await page.shot(out("td-1a6-learn-quiz-" + size + ".png")));
    for (const ch of quiz.word.text) {
      await letter(page, ch);
      await page.sleep(140);
    }
    quizDone = await until(page, `const s = t.state(); return s.knowledge > ${quiz.knowledge} ? { knowledge: s.knowledge, review: s.review } : null;`, 5000, 150);
  }

  // 3. Space: the tactical pause of the learn mode, and on again. A Space within 0.8 s of a typed letter is a word
  // gap, swallowed (review R2: WORD_SPACE_MS), so the hands rest first.
  await page.sleep(1000);
  await key(page, "Space", { pause: 300 });
  const paused = await page.eval(td("const a = t.state().tick; return new Promise((r) => setTimeout(() => r({ a, b: t.state().tick, tactical: t.ui().tactical, chip: document.querySelector('.td-chip')?.textContent ?? '' }), 600));"));
  shots.push(await page.shot(out("td-1a6-learn-pause-" + size + ".png")));
  await key(page, "Space", { pause: 400 });
  const resumed = await page.eval(td("return { tick: t.state().tick, tactical: t.ui().tactical };"));

  await seen.poll(page);
  const replay = await replayOnNode(page, "td-1a6-learn");
  const checks = {
    ready,
    realVocabulary: vocabulary,
    learnMode: (await state(page)).mode === "learn",
    cardsSeen: wordCards >= 5,
    meaningsFirst: withoutMeaning.length === 0,
    stripShowsMeaning: stripMeaning.trim().length > 0,
    sloppyIntoBook: book.length >= 1,
    quizLit: quiz !== null,
    quizShowsMeaningAndBlanks: quiz !== null && quiz.mean.trim().length > 0 && quiz.card.includes("_") && quiz.card.includes(quiz.word.text[0]) && !quiz.card.includes(quiz.word.text),
    quizFromBook: quiz !== null && quiz.review.includes(quiz.word.text),
    quizRaisesKnowledge: quizDone !== null,
    quizLeavesBook: quizDone !== null && !quizDone.review.includes(quiz.word.text),
    tacticalPause: paused?.a === paused?.b && paused?.tactical === true && /Tạm dừng chiến thuật/.test(paused?.chip ?? ""),
    spaceResumes: resumed?.tactical === false && resumed.tick > (paused?.b ?? Infinity),
    cardsClean: cardsClean(cards),
    nodeReplaysToBrowserHash: replay.match === true,
    ...consoleChecks(page),
  };
  return finish(page, checks, {
    wordCards, withoutMeaning: withoutMeaning.slice(0, 5), stripMeaning, book, quiz: quiz && { word: quiz.word.text, card: quiz.card, mean: quiz.mean }, quizDone, paused, resumed,
    sloppy: seen.of("wordHit").filter((e) => e.grade === "sloppy").length, cards: cardSummary(cards), replay, shots,
  });
}
