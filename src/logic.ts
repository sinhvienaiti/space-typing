import type { Enemy } from "./types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeWord(word: string): string {
  return word.trim().toLocaleLowerCase("en-US");
}

export function typingText(text: string): string {
  return normalizeWord(text).replace(/[^a-z]/g, "");
}

export function splitDisplayByTypedLetters(
  text: string,
  typedLetters: number,
): { typed: string; remaining: string } {
  if (typedLetters <= 0) {
    return { typed: "", remaining: text };
  }

  let letters = 0;
  let splitIndex = 0;

  for (let index = 0; index < text.length; index += 1) {
    if (/[a-z]/i.test(text[index] ?? "")) {
      letters += 1;
    }

    splitIndex = index + 1;
    if (letters >= typedLetters) break;
  }

  return {
    typed: text.slice(0, splitIndex),
    remaining: text.slice(splitIndex),
  };
}

export function multiplierForStreak(streak: number): number {
  if (streak >= 100) return 4;
  if (streak >= 50) return 3;
  if (streak >= 25) return 2;
  return 1;
}

export function chooseTarget(
  enemies: Enemy[],
  key: string,
  playerX: number,
  playerY: number,
): Enemy | null {
  const candidates = enemies.filter((enemy) => {
    const word = typingText(enemy.entry.en);
    return enemy.typed === 0 && word[0] === key;
  });

  candidates.sort((a, b) => {
    const distanceA = Math.hypot(a.x - playerX, a.y - playerY);
    const distanceB = Math.hypot(b.x - playerX, b.y - playerY);
    const distanceDelta = distanceA - distanceB;
    if (Math.abs(distanceDelta) > 0.01) return distanceDelta;

    // When two targets are effectively the same distance away, the lower
    // target is the more immediate contact. Remaining ties are deterministic
    // so fast typing never feels random.
    const verticalDelta = b.y - a.y;
    if (Math.abs(verticalDelta) > 0.01) return verticalDelta;

    const idDelta = a.id - b.id;
    if (idDelta !== 0) return idDelta;

    return (
      typingText(a.entry.en).length -
      typingText(b.entry.en).length
    );
  });

  return candidates[0] ?? null;
}

export function accuracyPercent(hits: number, misses: number): number {
  const total = hits + misses;
  return total === 0 ? 100 : (hits / total) * 100;
}

export function waveForKills(kills: number): number {
  return Math.floor(Math.max(0, kills) / 8) + 1;
}


export function stageWordsPerMinute(
  hitCharacters: number,
  activeSeconds: number,
): number {
  const hits = Math.max(
    0,
    Number.isFinite(hitCharacters) ? hitCharacters : 0,
  );
  const seconds = Math.max(
    1,
    Number.isFinite(activeSeconds) ? activeSeconds : 1,
  );
  return (hits / 5) / (seconds / 60);
}
