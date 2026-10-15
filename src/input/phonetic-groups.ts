/** Explicit lexical facts, not guesses from spelling or common first letters. */
const groups = [
  ["right", "write"],
  ["sea", "see"],
  ["for", "four"],
  ["no", "know"],
  ["night", "knight"],
  ["pair", "pear"],
  ["to", "two", "too"],
  ["here", "hear"],
  ["one", "won"],
  ["sun", "son"],
];
const index = new Map(
  groups.flatMap((words, i) =>
    words.map((word) => [word, `homophone:${i}`] as const),
  ),
);
export function phoneticGroups(word: string): string[] {
  const group = index.get(word.trim().toLowerCase());
  return group ? [group] : [];
}
