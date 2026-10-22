/**
 * The 1A vocabulary (docs/td/BUILD_NOW.md §3.5): shared levels 1–5, every
 * word "known" (d = 1). One deck holds them all with their level, and the
 * sandbox's choice (level 1, 1–3, 1–5) picks the words up to it, so a change
 * mid-run needs no load. Meanings and IPA come along for the view (BUILD_1A6 §7). Without the shared files (a dev server that does
 * not serve /vocabulary/) a short built-in list keeps the stream playable.
 */
import { typingText } from "../../logic";
import { loadVocabularyIndex, loadVocabularyLevel } from "../../vocabulary";
import { compileDeck, type Deck } from "../typing/decks";

export const VOCAB_LEVELS = 5;
export type VocabSource = "vocabulary" | "fallback";

// Common words of levels 1–3, a few for each usable first letter.
const FALLBACK = `about also away art answer already actually bad big book baby before brother believe cold child car city change company
country day drink date dirty decide easy eat early empty enough evening explain food find feel first family further finally good game group get
happy hot hard home health history hospital idea issue inside instead internet kind know keep key kitchen look like love learn listen language
man money music make mother morning message new night name news number national old open only once office outside original place phone play
point please problem possible right room road read really remember receive small sad story see school special station time today team take
thanks together thought use very visit video view wrong week work woman window website weekend young year`;

/** Levels in order (level 1 first), each its words in file order: the deck order Node replays too. */
export function deckFromLevels(levels: readonly (readonly { id: string; en: string; vi?: string; ipa?: string }[])[]): Deck {
  return compileDeck(levels.flatMap((entries, index) => entries.map((entry) => ({ id: entry.id, text: typingText(entry.en), level: index + 1, vi: entry.vi, ipa: entry.ipa }))));
}

export const fallbackDeck = (): Deck => deckFromLevels([FALLBACK.split(/\s+/).map((en, index) => ({ id: "td-fallback-" + index, en }))]);

export async function loadDeck(): Promise<{ deck: Deck; source: VocabSource }> {
  try {
    const index = await loadVocabularyIndex();
    const levels = await Promise.all(Array.from({ length: VOCAB_LEVELS }, (_, level) => loadVocabularyLevel(level + 1, index)));
    return { deck: deckFromLevels(levels), source: "vocabulary" };
  } catch {
    return { deck: fallbackDeck(), source: "fallback" };
  }
}
