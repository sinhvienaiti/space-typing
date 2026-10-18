/**
 * Daily Lessons dialog: pick a CEFR level and a topic, then play today's
 * five lessons in order; rewards at 3 and 5. Rules in src/lessons/chain.ts,
 * launching and saving in main.ts (deps).
 */
import { CHAIN_LENGTH, LESSON_LEVELS, LESSON_LEVEL_LABELS, LESSON_REWARDS, lessonSteps, nextLesson, type LessonKind, type LessonLevel, type LessonSettings, type LessonState } from "../lessons/chain";
import type { VocabularyTopicIndex } from "../vocabulary";
import { iconSvg, type IconName } from "./icons";

export type DailyLessonsDeps = {
  /** Today's state (already rolled to the current day). */
  state(): LessonState;
  topics(): Promise<VocabularyTopicIndex | null>;
  hasPassages(level: LessonLevel): Promise<boolean>;
  setSettings(settings: LessonSettings): Promise<void>;
  start(index: number): Promise<string | null>;
  claim(tier: "three" | "five"): Promise<string | null>;
  blocker(): string | null;
  sound: { tab(): void; error(): void; reveal(big: boolean): void };
  notice(message: string): void;
};

const KIND_ICON: Readonly<Record<LessonKind, IconName>> = {
  warmup: "flame",
  recall: "headphones",
  reading: "book",
  stretch: "zap",
  review: "refresh",
  exam: "crown",
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function installDailyLessons(deps: DailyLessonsDeps): { open(): void; refresh(): void } {
  const dialog = el("dialog", "settings-dialog dl-dialog");
  dialog.id = "dailyLessonsDialog";
  dialog.setAttribute("aria-labelledby", "dailyLessonsTitle");
  const form = el("form", "dl-shell");
  form.method = "dialog";
  dialog.append(form);
  document.body.append(dialog);

  let topics: VocabularyTopicIndex | null = null;
  let passages = new Map<LessonLevel, boolean>();
  let busy = false;

  async function run(action: () => Promise<string | null>): Promise<void> {
    if (busy) return;
    const blocked = deps.blocker();
    if (blocked !== null) {
      deps.sound.error();
      deps.notice(blocked);
      return;
    }
    busy = true;
    render();
    try {
      const error = await action();
      if (error !== null) {
        deps.sound.error();
        deps.notice(error);
      }
    } finally {
      busy = false;
      if (dialog.open) render();
    }
  }

  function header(state: LessonState): HTMLElement {
    const head = el("header", "dl-head");
    const title = el("div", "dl-title");
    title.append(el("p", "eyebrow", "Learn English · a new chain every day (UTC)"));
    const h2 = el("h2", "", "Daily Lessons");
    h2.id = "dailyLessonsTitle";
    title.append(h2);
    const streak = el("div", "dl-streak" + (state.streak > 0 ? " on" : ""));
    streak.innerHTML = iconSvg("flame", "dl-streak-icon");
    streak.append(el("strong", "", String(state.streak)), el("span", "", state.streak === 1 ? "day streak" : "days streak"), el("small", "", "best " + state.best));
    const close = el("button", "dl-close", "×");
    close.type = "submit";
    close.value = "close";
    close.setAttribute("aria-label", "Close Daily Lessons");
    head.append(title, streak, close);
    return head;
  }

  function settingsBar(state: LessonState): HTMLElement {
    const bar = el("section", "dl-settings");
    const levelBox = el("div", "dl-field");
    levelBox.append(el("span", "dl-label", "English level"));
    const levels = el("div", "dl-levels");
    levels.setAttribute("role", "radiogroup");
    for (const level of LESSON_LEVELS) {
      const button = el("button", "dl-level" + (state.settings.level === level ? " on" : ""), level === "starter" ? "Starter" : level);
      button.type = "button";
      button.title = LESSON_LEVEL_LABELS[level];
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", String(state.settings.level === level));
      button.addEventListener("click", () => {
        if (state.settings.level === level) return;
        deps.sound.tab();
        void deps.setSettings({ ...state.settings, level }).then(render);
      });
      levels.append(button);
    }
    levelBox.append(levels);

    const topicBox = el("label", "dl-field");
    topicBox.append(el("span", "dl-label", "Topic"));
    const select = el("select", "dl-topic");
    select.append(new Option("Any topic · mixed words", ""));
    if (topics !== null) {
      const groups = new Map<string, HTMLOptGroupElement>();
      for (const topic of topics.topics) {
        const key = topic.groupLabel ?? topic.group;
        let group = groups.get(key);
        if (group === undefined) {
          group = document.createElement("optgroup");
          group.label = key;
          groups.set(key, group);
          select.append(group);
        }
        group.append(new Option(topic.label + " · " + topic.levels.join("/"), topic.id));
      }
    }
    select.value = state.settings.topicId ?? "";
    select.addEventListener("change", () => {
      deps.sound.tab();
      void deps.setSettings({ ...state.settings, topicId: select.value === "" ? null : select.value }).then(render);
    });
    topicBox.append(select);
    bar.append(levelBox, topicBox);
    bar.append(el("p", "dl-hint", "Changing level or topic changes the words of the lessons you have not played yet. Topics add their words first, then words of your level."));
    return bar;
  }

  function chain(state: LessonState): HTMLElement {
    const steps = lessonSteps(state.settings.level, passages.get(state.settings.level) ?? false);
    const next = nextLesson(state);
    const path = el("ol", "dl-path");
    for (const step of steps) {
      const done = state.done.includes(step.index);
      const current = next === step.index;
      const node = el("li", "dl-node" + (done ? " done" : current ? " current" : " locked"));
      const badge = el("span", "dl-badge");
      badge.innerHTML = done ? iconSvg("check", "dl-badge-icon") : iconSvg(KIND_ICON[step.kind], "dl-badge-icon");
      const number = el("span", "dl-number", String(step.index + 1));
      const text = el("div", "dl-node-text");
      text.append(el("strong", "", step.title), el("small", "", step.detail), el("span", "dl-mode", (step.gameplay === "recall" ? "Recall" : "Combat") + (step.words > 0 ? " · " + step.words + " words" : " · story words")));
      node.append(number, badge, text);
      if (current) {
        const start = el("button", "dl-start holo-cta", busy ? "Loading…" : "Start lesson");
        start.type = "button";
        start.disabled = busy;
        start.addEventListener("click", () => void run(() => deps.start(step.index)));
        node.append(start);
      } else if (done) {
        node.append(el("span", "dl-state", "Done"));
      } else {
        node.append(el("span", "dl-state", "After lesson " + step.index));
      }
      path.append(node);
    }
    return path;
  }

  function rewards(state: LessonState): HTMLElement {
    const box = el("section", "dl-rewards");
    for (const tier of ["three", "five"] as const) {
      const need = tier === "three" ? 3 : CHAIN_LENGTH;
      const reward = LESSON_REWARDS[tier];
      const ready = state.done.length >= need && !state.claimed[tier];
      const card = el("div", "dl-chest" + (ready ? " ready" : "") + (state.claimed[tier] ? " claimed" : ""));
      const icon = el("span", "dl-chest-icon");
      icon.innerHTML = iconSvg(tier === "three" ? "gift" : "trophy", "dl-chest-svg");
      const text = el("div", "dl-chest-text");
      text.append(
        el("strong", "", need + " lessons"),
        el("small", "", reward.credits + " Credits" + (reward.starCrystal > 0 ? " + " + reward.starCrystal + " Star Crystals" : "")),
      );
      const progress = el("span", "dl-chest-bar");
      const fill = el("i");
      fill.style.transform = "scaleX(" + Math.min(1, state.done.length / need) + ")";
      progress.append(fill);
      text.append(progress);
      const claim = el("button", "dl-claim", state.claimed[tier] ? "Claimed" : ready ? "Claim" : Math.min(state.done.length, need) + " / " + need);
      claim.type = "button";
      claim.disabled = !ready || busy;
      claim.addEventListener("click", () =>
        void run(async () => {
          const error = await deps.claim(tier);
          if (error === null) deps.sound.reveal(tier === "five");
          return error;
        }),
      );
      card.append(icon, text, claim);
      box.append(card);
    }
    return box;
  }

  function render(): void {
    const state = deps.state();
    form.replaceChildren(
      header(state),
      settingsBar(state),
      chain(state),
      rewards(state),
      el("p", "dl-foot", "Lessons are free practice: no Warp, Campaign progress stays as it is. Word mastery and Recall memory are saved, so tomorrow's review knows what you found hard."),
    );
  }

  async function prepare(): Promise<void> {
    topics ??= await deps.topics();
    const level = deps.state().settings.level;
    if (!passages.has(level)) passages = new Map(passages).set(level, await deps.hasPassages(level));
  }

  return {
    open() {
      render();
      if (!dialog.open) dialog.showModal();
      void prepare().then(() => {
        if (dialog.open) render();
      });
    },
    refresh() {
      if (!dialog.open) return;
      void prepare().then(() => {
        if (dialog.open) render();
      });
    },
  };
}
