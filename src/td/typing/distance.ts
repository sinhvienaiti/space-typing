/**
 * "form" and "from" must not live together (TK 6.5): two words of the deck
 * at optimal-string-alignment distance ≤ 1, checked directly instead of with
 * a table, stopping at the first difference that rules it out. Words longer
 * than LETTERS.maxEditCheckLen are not compared.
 */
import { LETTERS } from "../content/rules";

/** Equal, one letter changed, one added or dropped, or two neighbours swapped. */
export function withinOneEdit(letters: Uint8Array, a: number, aLen: number, b: number, bLen: number): boolean {
  if (aLen > LETTERS.maxEditCheckLen || bLen > LETTERS.maxEditCheckLen) return false;
  if (aLen < bLen) return withinOneEdit(letters, b, bLen, a, aLen);
  if (aLen - bLen > 1) return false;
  let i = 0;
  while (i < bLen && letters[a + i] === letters[b + i]) i += 1;
  if (i === bLen) return true;
  const same = (from: number, shift: number) => {
    for (let k = from; k < bLen; k += 1) if (letters[a + k + shift] !== letters[b + k]) return false;
    return true;
  };
  if (aLen > bLen) return same(i, 1);
  if (i + 1 < aLen && letters[a + i] === letters[b + i + 1] && letters[a + i + 1] === letters[b + i] && same(i + 2, 0)) return true;
  return same(i + 1, 0);
}
