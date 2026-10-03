/**
 * Every song in the game, in library order. Add a song: write its spec in
 * this folder, list it here, map it in src/audio/music-library.ts
 * (GALAXY_PLAYLISTS), then run `pnpm music:render --song=<id>`.
 */
import aurora from "./aurora-serenade.mjs";
import canopy from "./canopy-breeze.mjs";
import crystal from "./crystal-echoes.mjs";
import ember from "./ember-rush.mjs";
import eternity from "./eternity-gate.mjs";
import forge from "./forge-of-stars.mjs";
import glass from "./glass-solitude.mjs";
import hollow from "./hollow-roots.mjs";
import molten from "./molten-crown.mjs";
import requiem from "./requiem-of-light.mjs";
import signal from "./signal-in-the-void.mjs";
import starlit from "./starlit-lullaby.mjs";
import sunseed from "./sunseed-parade.mjs";

export const SONGS = [
  signal,
  starlit,
  ember,
  molten,
  glass,
  crystal,
  canopy,
  sunseed,
  hollow,
  forge,
  aurora,
  requiem,
  eternity,
];

// Duel PvP music (rendered with --set=duel into public/assets/audio/duel/
// music/songs; not part of the Campaign playlists or Random mode).
import neonDogfight from "./duel/neon-dogfight.mjs";
import afterburnerFinale from "./duel/afterburner-finale.mjs";

export const DUEL_SONGS = [neonDogfight, afterburnerFinale];
