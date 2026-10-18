/**
 * What the title guide (Draconis) says. A visit opens with a greeting for the
 * moment (a first visit, a return after days, the time of day) followed by
 * the next tip in the rotation, so every visit reads differently; each click
 * plays an action with a line of its own. Pure: tests drive it with fixed
 * dates and a fake storage.
 */
export type GuideAction = "wave" | "flap" | "hop" | "bow" | "talk";

export type GuideMemory = {
  version: 1;
  visits: number;
  /** Local date of the last visit (YYYY-MM-DD). */
  lastDay: string;
  /** Next tip to show. */
  tip: number;
  /** Next click reaction. */
  click: number;
};

export const GUIDE_MEMORY_KEY = "spaceTypingGuideV1";

export const GUIDE_TIPS: readonly string[] = [
  "Type a word's first letter to lock on, then finish it. Clean letters keep your combo climbing!",
  "Daily Lessons bring new words every day. Five minutes keeps your streak alive.",
  "Every tenth stage hides a boss. Watch its health bar and keep typing!",
  "In Campaign 3D I fly with you and breathe fire. Try it from the Campaign card!",
  "Recall mode: you hear a word, then type it from memory. Great for spelling!",
  "Duel a friend with a join code and see who types faster.",
  "Upgrade your ship in the Hangar to fly farther into the galaxy.",
  "Say a word out loud while you type it. It sticks better!",
  "Accuracy beats speed. Slow and clean wins more stars.",
  "Expedition is a long run with a fresh route each day. How far can you go?",
];

const CLICK_LINES: readonly { action: GuideAction; line: string }[] = [
  { action: "wave", line: "Hello, pilot! Nice to see you." },
  { action: "flap", line: "Look at my wings! Ready to fly?" },
  { action: "hop", line: "Wheee! That was fun." },
  { action: "bow", line: "At your service, pilot." },
  { action: "talk", line: "" },
  { action: "hop", line: "Hehe, that tickles!" },
  { action: "flap", line: "Fire and feathers, all set!" },
  { action: "wave", line: "Let's beat your best stage today!" },
];

export function emptyGuideMemory(): GuideMemory {
  return { version: 1, visits: 0, lastDay: "", tip: 0, click: 0 };
}

export function loadGuideMemory(storage: Pick<Storage, "getItem"> | null): GuideMemory {
  try {
    const raw = JSON.parse(storage?.getItem(GUIDE_MEMORY_KEY) ?? "null") as Partial<GuideMemory> | null;
    if (raw === null || typeof raw !== "object") return emptyGuideMemory();
    const count = (value: unknown): number => (Number.isInteger(value) && (value as number) >= 0 ? (value as number) : 0);
    return {
      version: 1,
      visits: count(raw.visits),
      lastDay: typeof raw.lastDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.lastDay) ? raw.lastDay : "",
      tip: count(raw.tip),
      click: count(raw.click),
    };
  } catch {
    return emptyGuideMemory();
  }
}

export function saveGuideMemory(storage: Pick<Storage, "setItem"> | null, memory: GuideMemory): void {
  try {
    storage?.setItem(GUIDE_MEMORY_KEY, JSON.stringify(memory));
  } catch {
    /* Not remembered: the next visit greets as new. */
  }
}

function localDay(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}

function daysBetween(from: string, to: string): number {
  const [a, b] = [from, to].map((day) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))));
  return Math.round((b! - a!) / 86_400_000);
}

function timeGreeting(hour: number): string {
  if (hour >= 5 && hour < 11) return "Good morning, pilot! A few words now keep your streak warm.";
  if (hour >= 11 && hour < 17) return "Good afternoon, pilot! Ready for a quick mission?";
  if (hour >= 17 && hour < 22) return "Good evening, pilot! One more stage before the stars sleep?";
  return "It's late, pilot. A short practice, then rest your eyes!";
}

/**
 * The lines for this visit (greeting, then a tip) and the memory to save.
 * The visit counts once per call; call it once per page load.
 */
export function visitLines(memory: GuideMemory, now: Date): { lines: string[]; memory: GuideMemory } {
  const today = localDay(now);
  let greeting: string;
  if (memory.visits === 0) {
    greeting = "Hi, I'm Draconis, your guide! Type the words to blast the enemies. I'll cheer you on.";
  } else if (memory.lastDay !== "" && daysBetween(memory.lastDay, today) >= 2) {
    greeting = "I missed you, pilot! " + daysBetween(memory.lastDay, today) + " days away. Your words are waiting.";
  } else if (memory.lastDay === today && memory.visits >= 2) {
    greeting = "Back again? Love it. Let's go one stage further!";
  } else {
    greeting = timeGreeting(now.getHours());
  }
  const tip = GUIDE_TIPS[memory.tip % GUIDE_TIPS.length]!;
  return {
    lines: [greeting, tip],
    memory: { ...memory, visits: memory.visits + 1, lastDay: today, tip: (memory.tip + 1) % GUIDE_TIPS.length },
  };
}

/** The next click: an action and its line ("talk" says the next tip). */
export function clickReaction(memory: GuideMemory): { action: GuideAction; line: string; memory: GuideMemory } {
  const pick = CLICK_LINES[memory.click % CLICK_LINES.length]!;
  if (pick.action === "talk") {
    const tip = GUIDE_TIPS[memory.tip % GUIDE_TIPS.length]!;
    return { action: "talk", line: tip, memory: { ...memory, click: memory.click + 1, tip: (memory.tip + 1) % GUIDE_TIPS.length } };
  }
  return { action: pick.action, line: pick.line, memory: { ...memory, click: memory.click + 1 } };
}
