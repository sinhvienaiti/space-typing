import { Sfx } from "../audio/Sfx";
import {
  MUSIC_TRACKS,
  type SongStem,
} from "../audio/music-library";
import type { PlayerImpactVariant } from "../characters/projectiles";
import type { EnemyMaterial } from "../enemies/identity";

export const AUDIO_QA_SFX = [
  {
    id: "shot",
    label: "Player Shot",
    category: "typing",
    usedWhen: "A normal player shot is emitted.",
  },
  {
    id: "word-perfect",
    label: "Perfect Word",
    category: "typing",
    usedWhen: "A word is completed without an error.",
  },
  {
    id: "word-normal",
    label: "Word Complete",
    category: "typing",
    usedWhen: "A word is completed after one or more mistakes.",
  },
  {
    id: "wrong",
    label: "Wrong Key",
    category: "typing",
    usedWhen: "The player presses an incorrect typing key.",
  },
  {
    id: "power",
    label: "Power / Skill Accent",
    category: "combat",
    usedWhen: "A power action or strong skill accent fires.",
  },
  {
    id: "damage",
    label: "Player Damage",
    category: "combat",
    usedWhen: "Damage reaches the player.",
  },
  {
    id: "enemy-shot",
    label: "Enemy Shot",
    category: "combat",
    usedWhen: "An enemy projectile is fired.",
  },
  {
    id: "projectile-intercept",
    label: "Projectile Intercept",
    category: "combat",
    usedWhen: "A hostile projectile is destroyed or intercepted.",
  },
  {
    id: "projectile-warning",
    label: "Projectile Warning / Duck",
    category: "warning",
    usedWhen: "An enemy telegraph asks the mix to duck briefly.",
  },
  {
    id: "shield-break",
    label: "Shield Break",
    category: "warning",
    usedWhen: "The player's shield reaches zero.",
  },
  {
    id: "support",
    label: "Support Skill",
    category: "combat",
    usedWhen: "A support or protection effect activates.",
  },
  {
    id: "drain",
    label: "Drain",
    category: "combat",
    usedWhen: "A draining enemy/system effect activates.",
  },
  {
    id: "command",
    label: "Command",
    category: "combat",
    usedWhen: "A command-type enemy/system effect activates.",
  },
  {
    id: "elite-warning",
    label: "Elite Warning",
    category: "warning",
    usedWhen: "An elite threat appears.",
  },
  {
    id: "rare-drop",
    label: "Rare Drop",
    category: "ui",
    usedWhen: "A rare reward/drop is produced.",
  },
  {
    id: "supply-arrival",
    label: "Supply Arrival",
    category: "ui",
    usedWhen: "A supply reward arrives.",
  },
  {
    id: "ui-confirm",
    label: "UI Confirm",
    category: "ui",
    usedWhen: "The game confirms a UI action.",
  },
  {
    id: "stage-clear",
    label: "Stage Clear",
    category: "ui",
    usedWhen: "A stage is completed.",
  },
  {
    id: "stage-fail",
    label: "Stage Fail",
    category: "ui",
    usedWhen: "A stage ends in failure.",
  },
  {
    id: "critical-hull",
    label: "Critical Hull",
    category: "warning",
    usedWhen: "Hull first crosses the critical-health threshold.",
  },
  {
    id: "boss-entrance",
    label: "Boss Entrance",
    category: "boss",
    usedWhen: "A boss enters the battlefield.",
  },
  {
    id: "boss-hit",
    label: "Boss Hit",
    category: "boss",
    usedWhen: "A generic boss hit accent is requested.",
  },
  {
    id: "boss-death",
    label: "Boss Death",
    category: "boss",
    usedWhen: "A boss is defeated.",
  },
  {
    id: "boss-phase",
    label: "Boss Phase",
    category: "boss",
    usedWhen: "A boss changes phase.",
  },
  {
    id: "boss-shield-break",
    label: "Boss Shield Break",
    category: "boss",
    usedWhen: "A boss shield breaks.",
  },
  {
    id: "boss-stagger",
    label: "Boss Stagger",
    category: "boss",
    usedWhen: "A boss enters a stagger window.",
  },
] as const;

export type AudioQaSfxId =
  (typeof AUDIO_QA_SFX)[number]["id"];

export const AUDIO_QA_MATERIAL_EVENTS = [
  "hit",
  "layer-break",
  "death",
] as const;

export type AudioQaMaterialEvent =
  (typeof AUDIO_QA_MATERIAL_EVENTS)[number];

export const AUDIO_QA_BOSS_EVENTS = [
  "impact",
  "roar",
] as const;

export type AudioQaBossEvent =
  (typeof AUDIO_QA_BOSS_EVENTS)[number];

export class TestLabAudioQa {
  private readonly sfx = new Sfx();
  private previewTrack: HTMLAudioElement | null = null;
  private volume = 0.7;

  constructor() {
    this.sfx.setVolume(this.volume);
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sfx.setVolume(this.volume);
    if (this.previewTrack !== null) {
      this.previewTrack.volume = this.volume;
    }
  }

  unlock(): void {
    this.sfx.unlock();
  }

  playSfx(id: AudioQaSfxId): void {
    this.unlock();
    switch (id) {
      case "shot":
        this.sfx.shot();
        break;
      case "word-perfect":
        this.sfx.wordComplete(true);
        break;
      case "word-normal":
        this.sfx.wordComplete(false);
        break;
      case "wrong":
        this.sfx.wrong();
        break;
      case "power":
        this.sfx.power();
        break;
      case "damage":
        this.sfx.damage();
        break;
      case "enemy-shot":
        this.sfx.enemyShot();
        break;
      case "projectile-intercept":
        this.sfx.projectileIntercept();
        break;
      case "projectile-warning":
        this.sfx.projectileWarning();
        break;
      case "shield-break":
        this.sfx.shieldBreak();
        break;
      case "support":
        this.sfx.support();
        break;
      case "drain":
        this.sfx.drain();
        break;
      case "command":
        this.sfx.command();
        break;
      case "elite-warning":
        this.sfx.eliteWarning();
        break;
      case "rare-drop":
        this.sfx.rareDrop();
        break;
      case "supply-arrival":
        this.sfx.supplyArrival();
        break;
      case "ui-confirm":
        this.sfx.uiConfirm();
        break;
      case "stage-clear":
        this.sfx.stageClear();
        break;
      case "stage-fail":
        this.sfx.stageFail();
        break;
      case "critical-hull":
        this.sfx.criticalHull();
        break;
      case "boss-entrance":
        this.sfx.bossEntrance();
        break;
      case "boss-hit":
        this.sfx.bossHit();
        break;
      case "boss-death":
        this.sfx.bossDeath();
        break;
      case "boss-phase":
        this.sfx.bossPhase();
        break;
      case "boss-shield-break":
        this.sfx.bossShieldBreak();
        break;
      case "boss-stagger":
        this.sfx.bossStagger();
        break;
    }
  }

  playEnemyMaterial(
    material: EnemyMaterial,
    event: AudioQaMaterialEvent,
  ): void {
    this.unlock();
    if (event === "hit") {
      this.sfx.enemyHit(material, 1, 0);
      return;
    }
    if (event === "layer-break") {
      this.sfx.layerBreak(material, 0);
      return;
    }
    this.sfx.enemyDeath(material, 1, 0);
  }

  playProjectileImpact(
    variant: PlayerImpactVariant,
    finisher = false,
  ): void {
    this.unlock();
    this.sfx.boltImpact(finisher ? 1.4 : 1, 0, variant);
  }

  playBossMaterial(
    event: AudioQaBossEvent,
    material: EnemyMaterial,
    voice: number,
  ): void {
    this.unlock();
    if (event === "impact") {
      this.sfx.bossImpact(material, voice, 0);
      return;
    }
    this.sfx.bossRoar(voice, material);
  }

  playTrack(trackId: string, stem: SongStem): boolean {
    if (typeof Audio === "undefined") return false;
    const track = MUSIC_TRACKS.find((candidate) => candidate.id === trackId);
    if (track === undefined) return false;

    this.stopTrack();
    const audio = new Audio(track.stems[stem]);
    audio.preload = "auto";
    audio.volume = this.volume;
    this.previewTrack = audio;
    const result = audio.play();
    if (
      result !== undefined &&
      typeof result.catch === "function"
    ) {
      void result.catch(() => undefined);
    }
    return true;
  }

  stopTrack(): void {
    if (this.previewTrack === null) return;
    try {
      this.previewTrack.pause();
      this.previewTrack.currentTime = 0;
    } catch {
      // QA preview must fail soft and never affect production audio.
    }
    this.previewTrack = null;
  }

  destroy(): void {
    this.stopTrack();
    this.sfx.destroy();
  }
}
