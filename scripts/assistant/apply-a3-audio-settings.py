from pathlib import Path

ROOT = Path('.')


def replace_once(path: str, old: str, new: str) -> None:
    p = ROOT / path
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: anchor count={count} for {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


def write_new(path: str, content: str) -> None:
    p = ROOT / path
    if p.exists():
        raise SystemExit(f"{path}: already exists")
    p.write_text(content)

# ---------------------------------------------------------------------------
# Settings contracts + pure helpers.
# ---------------------------------------------------------------------------
replace_once(
    'src/types.ts',
    '''export type GameSettings = {\n  sfxVolume: number;\n''',
    '''export type AudioCategoryVolumes = {\n  typing: number;\n  combat: number;\n  warnings: number;\n  ui: number;\n  rewards: number;\n};\n\nexport type GameSettings = {\n  /** Top-level player audio gain. 1 preserves the legacy mix. */\n  masterVolume: number;\n  sfxVolume: number;\n''',
)
replace_once(
    'src/types.ts',
    '''  pronunciationVolume: number;\n  killTranslation?: KillTranslationSettings;\n''',
    '''  pronunciationVolume: number;\n  /** Announcer is independent of the SFX parent but still follows Master/focus. */\n  announcerVolume: number;\n  /** Advanced player-facing category trims. Missing legacy values resolve to 1. */\n  audioCategoryVolumes?: AudioCategoryVolumes;\n  killTranslation?: KillTranslationSettings;\n''',
)

write_new(
    'src/audio/player-settings.ts',
    '''import { clamp } from "../logic";\nimport type { AudioCategoryVolumes, GameSettings } from "../types";\nimport type { AudioGroup } from "./mix";\n\nexport const DEFAULT_AUDIO_CATEGORY_VOLUMES: AudioCategoryVolumes = {\n  typing: 1,\n  combat: 1,\n  warnings: 1,\n  ui: 1,\n  rewards: 1,\n};\n\n/** Recommended is the shipped quality target, not a repair preset. */\nexport const RECOMMENDED_AUDIO = {\n  masterVolume: 1,\n  pronunciationVolume: 1,\n  musicVolume: 0.26,\n  ambientVolume: 0.08,\n  sfxVolume: 0.5,\n  creditVolume: 1,\n  announcerVolume: 0.85,\n  audioCategoryVolumes: DEFAULT_AUDIO_CATEGORY_VOLUMES,\n} as const;\n\nexport function sanitizeAudioLevel(value: unknown, fallback = 1, max = 1): number {\n  return typeof value === "number" && Number.isFinite(value)\n    ? clamp(value, 0, max)\n    : clamp(fallback, 0, max);\n}\n\nexport function sanitizeAudioCategoryVolumes(value: unknown): AudioCategoryVolumes {\n  const source = value !== null && typeof value === "object"\n    ? value as Partial<AudioCategoryVolumes>\n    : {};\n  return {\n    typing: sanitizeAudioLevel(source.typing, 1),\n    combat: sanitizeAudioLevel(source.combat, 1),\n    warnings: sanitizeAudioLevel(source.warnings, 1),\n    ui: sanitizeAudioLevel(source.ui, 1),\n    rewards: sanitizeAudioLevel(source.rewards, 1),\n  };\n}\n\nexport function audioCategoryVolume(\n  settings: Pick<GameSettings, "audioCategoryVolumes">,\n  group: AudioGroup,\n): number {\n  return sanitizeAudioCategoryVolumes(settings.audioCategoryVolumes)[group];\n}\n\nexport function recommendedAudioSettings(settings: GameSettings): GameSettings {\n  return {\n    ...settings,\n    masterVolume: RECOMMENDED_AUDIO.masterVolume,\n    pronunciationVolume: RECOMMENDED_AUDIO.pronunciationVolume,\n    musicVolume: RECOMMENDED_AUDIO.musicVolume,\n    ambientVolume: RECOMMENDED_AUDIO.ambientVolume,\n    sfxVolume: RECOMMENDED_AUDIO.sfxVolume,\n    creditVolume: RECOMMENDED_AUDIO.creditVolume,\n    announcerVolume: RECOMMENDED_AUDIO.announcerVolume,\n    audioCategoryVolumes: { ...DEFAULT_AUDIO_CATEGORY_VOLUMES },\n  };\n}\n''',
)

# ---------------------------------------------------------------------------
# Shared bus math + pooled sample tails.
# ---------------------------------------------------------------------------
replace_once(
    'src/audio/mix.ts',
    '''export function sfxGroupBusGain(\n  master: number,\n  group: AudioGroup,\n  pronunciationActive = false,\n): number {\n  return clamp(master, 0, 1) * AUDIO_GROUP_GAIN[group] * sfxFocusGain(group, pronunciationActive);\n}\n''',
    '''export function sfxGroupBusGain(\n  master: number,\n  group: AudioGroup,\n  pronunciationActive = false,\n  categoryPreference = 1,\n): number {\n  return (\n    clamp(master, 0, 1) *\n    AUDIO_GROUP_GAIN[group] *\n    sfxFocusGain(group, pronunciationActive) *\n    clamp(categoryPreference, 0, 1)\n  );\n}\n''',
)
replace_once(
    'src/audio/mix.ts',
    '''export function mixedSfxGain(\n  master: number,\n  group: AudioGroup,\n  eventGain: number,\n  pronunciationActive = false,\n): number {\n  return sfxGroupBusGain(master, group, pronunciationActive) * baseSfxEventGain(eventGain);\n}\n''',
    '''export function mixedSfxGain(\n  master: number,\n  group: AudioGroup,\n  eventGain: number,\n  pronunciationActive = false,\n  categoryPreference = 1,\n): number {\n  return (\n    sfxGroupBusGain(master, group, pronunciationActive, categoryPreference) *\n    baseSfxEventGain(eventGain)\n  );\n}\n''',
)

replace_once(
    'src/audio/sample-bank.ts',
    '''  private mixMaster = 1;\n  private mixPronunciationActive = false;\n''',
    '''  private mixMaster = 1;\n  private mixPronunciationActive = false;\n  private mixCategories: Partial<Record<AudioGroup, number>> = {};\n''',
)
replace_once(
    'src/audio/sample-bank.ts',
    '''  setMix(masterVolume: number, pronunciationActive: boolean): void {\n    this.mixMaster = Number.isFinite(masterVolume) ? Math.min(1, Math.max(0, masterVolume)) : 0;\n    this.mixPronunciationActive = pronunciationActive;\n''',
    '''  setMix(\n    masterVolume: number,\n    pronunciationActive: boolean,\n    categories: Partial<Record<AudioGroup, number>> = this.mixCategories,\n  ): void {\n    this.mixMaster = Number.isFinite(masterVolume) ? Math.min(1, Math.max(0, masterVolume)) : 0;\n    this.mixPronunciationActive = pronunciationActive;\n    this.mixCategories = { ...categories };\n''',
)
replace_once(
    'src/audio/sample-bank.ts',
    '''        this.mixPronunciationActive,\n      );\n''',
    '''        this.mixPronunciationActive,\n        this.mixCategories[definition.group] ?? 1,\n      );\n''',
)
replace_once(
    'src/audio/sample-bank.ts',
    '''  play(\n    id: SampleSfxId,\n    masterVolume: number,\n    pronunciationActive: boolean,\n    playbackRate = 1,\n  ): boolean {\n    this.mixMaster = Number.isFinite(masterVolume) ? Math.min(1, Math.max(0, masterVolume)) : 0;\n    this.mixPronunciationActive = pronunciationActive;\n''',
    '''  play(\n    id: SampleSfxId,\n    masterVolume: number,\n    pronunciationActive: boolean,\n    playbackRate = 1,\n    categories: Partial<Record<AudioGroup, number>> = this.mixCategories,\n  ): boolean {\n    this.mixMaster = Number.isFinite(masterVolume) ? Math.min(1, Math.max(0, masterVolume)) : 0;\n    this.mixPronunciationActive = pronunciationActive;\n    this.mixCategories = { ...categories };\n''',
)
replace_once(
    'src/audio/sample-bank.ts',
    '''      pronunciationActive,\n    );\n    if (gain <= 0) return false;\n''',
    '''      pronunciationActive,\n      this.mixCategories[definition.group] ?? 1,\n    );\n    if (gain <= 0) return false;\n''',
)

# ---------------------------------------------------------------------------
# Sfx: Master, SFX parent, announcer, and real A2 group preferences.
# ---------------------------------------------------------------------------
replace_once(
    'src/audio/Sfx.ts',
    '''  private readonly samples = new SampleSfxBank();\n  private volume = 0.5;\n  private pronunciationActive = false;\n''',
    '''  private readonly samples = new SampleSfxBank();\n  /** SFX parent preference; Master is stored independently. */\n  private volume = 0.5;\n  private masterPreference = 1;\n  private announcerPreference = 1;\n  private groupPreferences: Record<AudioGroup, number> = {\n    typing: 1, combat: 1, warnings: 1, ui: 1, rewards: 1,\n  };\n  private pronunciationActive = false;\n''',
)
replace_once(
    'src/audio/Sfx.ts',
    '''    this.applyGroupBusGains();\n    this.samples.setMix(this.volume, this.pronunciationActive);\n''',
    '''    this.applyGroupBusGains();\n    this.samples.setMix(\n      this.effectiveSfxVolume(),\n      this.pronunciationActive,\n      this.groupPreferences,\n    );\n''',
)
replace_once(
    'src/audio/Sfx.ts',
    '''  setVolume(volume: number): void {\n    this.volume = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.5;\n    this.applyGroupBusGains();\n    this.samples.setMix(this.volume, this.pronunciationActive);\n    if (this.announcerAudio !== null) {\n      this.announcerAudio.volume = this.announcerVolume();\n    }\n  }\n''',
    '''  setVolume(volume: number): void {\n    this.volume = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.5;\n    this.refreshPlayerMix();\n  }\n\n  setMasterVolume(volume: number): void {\n    this.masterPreference = Number.isFinite(volume)\n      ? Math.min(1, Math.max(0, volume))\n      : 1;\n    this.refreshPlayerMix();\n  }\n\n  setAnnouncerVolume(volume: number): void {\n    this.announcerPreference = Number.isFinite(volume)\n      ? Math.min(1, Math.max(0, volume))\n      : 1;\n    if (this.announcerAudio !== null) {\n      this.announcerAudio.volume = this.announcerVolume();\n    }\n  }\n\n  setCategoryVolumes(volumes: Partial<Record<AudioGroup, number>>): void {\n    for (const group of AUDIO_GROUPS) {\n      const value = volumes[group];\n      this.groupPreferences[group] =\n        typeof value === "number" && Number.isFinite(value)\n          ? Math.min(1, Math.max(0, value))\n          : 1;\n    }\n    this.refreshPlayerMix();\n  }\n\n  private effectiveSfxVolume(): number {\n    return Math.min(1, Math.max(0, this.masterPreference * this.volume));\n  }\n\n  private refreshPlayerMix(): void {\n    this.applyGroupBusGains();\n    this.samples.setMix(\n      this.effectiveSfxVolume(),\n      this.pronunciationActive,\n      this.groupPreferences,\n    );\n    if (this.announcerAudio !== null) {\n      this.announcerAudio.volume = this.announcerVolume();\n    }\n  }\n''',
)
replace_once(
    'src/audio/Sfx.ts',
    '''  masterVolume(): number {\n    return this.volume;\n  }\n''',
    '''  masterVolume(): number {\n    return this.effectiveSfxVolume();\n  }\n''',
)
replace_once(
    'src/audio/Sfx.ts',
    '''      id,\n      this.volume,\n      this.pronunciationActive,\n      playbackRate,\n    );\n''',
    '''      id,\n      this.effectiveSfxVolume(),\n      this.pronunciationActive,\n      playbackRate,\n      this.groupPreferences,\n    );\n''',
)
replace_once(
    'src/audio/Sfx.ts',
    '''        this.volume,\n        "warnings",\n        1,\n        this.pronunciationActive,\n      ) * 1.08,\n''',
    '''        this.masterPreference,\n        "warnings",\n        this.announcerPreference,\n        this.pronunciationActive,\n      ) * 1.08,\n''',
)
text = (ROOT / 'src/audio/Sfx.ts').read_text()
text = text.replace('if (gainLevel <= 0 || this.volume <= 0) return;', 'if (gainLevel <= 0 || this.effectiveSfxVolume() <= 0) return;')
if text.count('if (gainLevel <= 0 || this.effectiveSfxVolume() <= 0) return;') != 2:
    raise SystemExit('src/audio/Sfx.ts: expected two synthesized voice volume guards')
(ROOT / 'src/audio/Sfx.ts').write_text(text)
replace_once(
    'src/audio/Sfx.ts',
    '''    bus.gain.value = sfxGroupBusGain(this.volume, group, this.pronunciationActive);\n''',
    '''    bus.gain.value = sfxGroupBusGain(\n      this.effectiveSfxVolume(),\n      group,\n      this.pronunciationActive,\n      this.groupPreferences[group],\n    );\n''',
)
replace_once(
    'src/audio/Sfx.ts',
    '''      const target = sfxGroupBusGain(this.volume, group, this.pronunciationActive);\n''',
    '''      const target = sfxGroupBusGain(\n        this.effectiveSfxVolume(),\n        group,\n        this.pronunciationActive,\n        this.groupPreferences[group],\n      );\n''',
)
# Credit engine reads level lazily; route it through the same real Rewards bus preference.
replace_once(
    'src/audio/Sfx.ts',
    '''              this.volume,\n              "rewards",\n              gain,\n              this.pronunciationActive,\n            ) * this.creditVolume,\n''',
    '''              this.effectiveSfxVolume(),\n              "rewards",\n              gain,\n              this.pronunciationActive,\n              this.groupPreferences.rewards,\n            ) * this.creditVolume,\n''',
)

# ---------------------------------------------------------------------------
# Game + speech: apply new hierarchy without changing non-audio settings.
# ---------------------------------------------------------------------------
replace_once(
    'src/Game.ts',
    '''    this.refreshSkillDefinitions();\n    this.sfx.setVolume(settings.sfxVolume);\n    this.sfx.setCreditVolume(settings.creditVolume ?? 1);\n''',
    '''    this.refreshSkillDefinitions();\n    this.applyPlayerAudioSettings(settings);\n''',
)
replace_once(
    'src/Game.ts',
    '''  updateSettings(settings: GameSettings): void {\n    const qualityChanged =\n      this.settings.visualQuality !== settings.visualQuality;\n    this.settings = settings;\n    this.sfx.setVolume(settings.sfxVolume);\n    this.sfx.setCreditVolume(settings.creditVolume ?? 1);\n''',
    '''  updateSettings(settings: GameSettings): void {\n    const qualityChanged =\n      this.settings.visualQuality !== settings.visualQuality;\n    this.settings = settings;\n    this.applyPlayerAudioSettings(settings);\n''',
)
replace_once(
    'src/Game.ts',
    '''  startStage(\n    stage: StageConfig,\n''',
    '''  private applyPlayerAudioSettings(settings: GameSettings): void {\n    this.sfx.setMasterVolume(settings.masterVolume ?? 1);\n    this.sfx.setVolume(settings.sfxVolume);\n    this.sfx.setCreditVolume(settings.creditVolume ?? 1);\n    this.sfx.setAnnouncerVolume(settings.announcerVolume ?? 1);\n    this.sfx.setCategoryVolumes(settings.audioCategoryVolumes ?? {});\n  }\n\n  startStage(\n    stage: StageConfig,\n''',
)
replace_once(
    'src/speech.ts',
    '''    utterance.volume = settings.pronunciationVolume;\n''',
    '''    utterance.volume = Math.min(\n      1,\n      Math.max(0, (settings.masterVolume ?? 1) * settings.pronunciationVolume),\n    );\n''',
)

# ---------------------------------------------------------------------------
# Main settings persistence, Recommended preset, and runtime preview.
# ---------------------------------------------------------------------------
replace_once(
    'src/main.ts',
    '''import { speakEnglish, stopSpeech, setSpeechGate } from "./speech";\n''',
    '''import { speakEnglish, stopSpeech, setSpeechGate } from "./speech";\nimport {\n  DEFAULT_AUDIO_CATEGORY_VOLUMES,\n  RECOMMENDED_AUDIO,\n  recommendedAudioSettings,\n  sanitizeAudioCategoryVolumes,\n  sanitizeAudioLevel,\n} from "./audio/player-settings";\n''',
)
replace_once(
    'src/main.ts',
    '''const defaultSettings: GameSettings = {\n  sfxVolume: 0.5,\n''',
    '''const defaultSettings: GameSettings = {\n  masterVolume: RECOMMENDED_AUDIO.masterVolume,\n  sfxVolume: RECOMMENDED_AUDIO.sfxVolume,\n''',
)
replace_once(
    'src/main.ts',
    '''  pronunciationVolume: 1,\n  killTranslation: { ...DEFAULT_KILL_TRANSLATION_SETTINGS },\n''',
    '''  pronunciationVolume: RECOMMENDED_AUDIO.pronunciationVolume,\n  announcerVolume: RECOMMENDED_AUDIO.announcerVolume,\n  audioCategoryVolumes: { ...DEFAULT_AUDIO_CATEGORY_VOLUMES },\n  killTranslation: { ...DEFAULT_KILL_TRANSLATION_SETTINGS },\n''',
)
replace_once(
    'src/main.ts',
    '''    return {\n      sfxVolume:\n''',
    '''    return {\n      // Existing saves predate Master/Announcer/category controls. Missing\n      // fields intentionally resolve to neutral 1.0 so migration never changes\n      // a returning player's established mix. Fresh installs use Recommended.\n      masterVolume: sanitizeAudioLevel(parsed.masterVolume, 1),\n      sfxVolume:\n''',
)
replace_once(
    'src/main.ts',
    '''      pronunciationVolume:\n        typeof parsed.pronunciationVolume === "number"\n          ? Math.min(1, Math.max(0, parsed.pronunciationVolume))\n          : defaultSettings.pronunciationVolume,\n      killTranslation: sanitizeKillTranslationSettings(parsed.killTranslation),\n''',
    '''      pronunciationVolume:\n        typeof parsed.pronunciationVolume === "number"\n          ? Math.min(1, Math.max(0, parsed.pronunciationVolume))\n          : defaultSettings.pronunciationVolume,\n      announcerVolume: sanitizeAudioLevel(parsed.announcerVolume, 1),\n      audioCategoryVolumes: sanitizeAudioCategoryVolumes(parsed.audioCategoryVolumes),\n      killTranslation: sanitizeKillTranslationSettings(parsed.killTranslation),\n''',
)
replace_once(
    'src/main.ts',
    '''let settingsDraft: GameSettings | null = null;\nlet difficultySettingsDraft: DifficultySettings | null = null;\n''',
    '''let settingsDraft: GameSettings | null = null;\nlet quickAudioDraft: GameSettings | null = null;\nlet quickAudioCommitted = false;\nlet difficultySettingsDraft: DifficultySettings | null = null;\n''',
)
replace_once(
    'src/main.ts',
    '''const settingsDialog = byId<HTMLDialogElement>("settingsDialog");\n''',
    '''const settingsDialog = byId<HTMLDialogElement>("settingsDialog");\nconst quickAudioDialog = byId<HTMLDialogElement>("quickAudioDialog");\n''',
)
replace_once(
    'src/main.ts',
    '''function saveSettings(): void {\n  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));\n  game.updateSettings(settings);\n  musicController.setMusicVolume(settings.musicVolume);\n  musicController.setAmbientVolume(settings.ambientVolume);\n''',
    '''function applyRuntimeAudio(next: GameSettings): void {\n  game.updateSettings(next);\n  const master = sanitizeAudioLevel(next.masterVolume, 1);\n  musicController.setMusicVolume(master * next.musicVolume);\n  musicController.setAmbientVolume(master * next.ambientVolume);\n}\n\nfunction saveSettings(): void {\n  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));\n  applyRuntimeAudio(settings);\n''',
)
replace_once(
    'src/main.ts',
    '''  const volume = byId<HTMLInputElement>("sfxVolume");\n''',
    '''  const masterVolume = sanitizeAudioLevel(renderedSettings.masterVolume, 1);\n  byId<HTMLInputElement>("masterVolume").value = String(masterVolume);\n  byId<HTMLOutputElement>("masterVolumeValue").value =\n    String(Math.round(masterVolume * 100)) + "%";\n\n  const volume = byId<HTMLInputElement>("sfxVolume");\n''',
)
replace_once(
    'src/main.ts',
    '''  const voiceVolume = byId<HTMLInputElement>("pronunciationVolume");\n  voiceVolume.value = String(renderedSettings.pronunciationVolume);\n  byId<HTMLOutputElement>("pronunciationVolumeValue").value =\n    String(Math.round(renderedSettings.pronunciationVolume * 100)) + "%";\n\n  const difficultyMode = byId<HTMLSelectElement>("difficultyMode");\n''',
    '''  const voiceVolume = byId<HTMLInputElement>("pronunciationVolume");\n  voiceVolume.value = String(renderedSettings.pronunciationVolume);\n  byId<HTMLOutputElement>("pronunciationVolumeValue").value =\n    String(Math.round(renderedSettings.pronunciationVolume * 100)) + "%";\n\n  const announcerVolume = sanitizeAudioLevel(renderedSettings.announcerVolume, 1);\n  byId<HTMLInputElement>("announcerVolume").value = String(announcerVolume);\n  byId<HTMLOutputElement>("announcerVolumeValue").value =\n    String(Math.round(announcerVolume * 100)) + "%";\n\n  const categories = sanitizeAudioCategoryVolumes(renderedSettings.audioCategoryVolumes);\n  for (const group of ["typing", "combat", "warnings", "ui", "rewards"] as const) {\n    byId<HTMLInputElement>("audioCategory-" + group).value = String(categories[group]);\n    byId<HTMLOutputElement>("audioCategory-" + group + "Value").value =\n      String(Math.round(categories[group] * 100)) + "%";\n  }\n\n  const difficultyMode = byId<HTMLSelectElement>("difficultyMode");\n''',
)
# Add quick panel functions before openSettings.
replace_once(
    'src/main.ts',
    '''function openSettings(): void {\n''',
    '''const QUICK_AUDIO_FIELDS = [\n  ["quickMaster", "masterVolume"],\n  ["quickPronunciation", "pronunciationVolume"],\n  ["quickMusicParent", "musicVolume"],\n  ["quickSfxParent", "sfxVolume"],\n  ["quickAnnouncer", "announcerVolume"],\n] as const;\n\nfunction renderQuickAudio(): void {\n  const draft = quickAudioDraft ?? settings;\n  for (const [id, field] of QUICK_AUDIO_FIELDS) {\n    const fallback = field === "announcerVolume" || field === "masterVolume" ? 1 : 0;\n    const value = sanitizeAudioLevel(draft[field], fallback);\n    byId<HTMLInputElement>(id).value = String(value);\n    byId<HTMLOutputElement>(id + "Value").value =\n      String(Math.round(value * 100)) + "%";\n  }\n}\n\nfunction openQuickAudio(): void {\n  if (quickAudioDialog.open) return;\n  quickAudioDraft = structuredClone(settings);\n  quickAudioCommitted = false;\n  renderQuickAudio();\n  byId("quickAudioStatus").textContent =\n    "Preview is local only · the Duel opponent and match clock keep running.";\n  quickAudioDialog.show();\n}\n\nfunction closeQuickAudio(commit: boolean): void {\n  if (commit && quickAudioDraft !== null) {\n    settings = structuredClone(quickAudioDraft);\n    quickAudioCommitted = true;\n    saveSettings();\n    titleHub?.render();\n    showNotice("✓ Audio settings applied");\n  } else {\n    applyRuntimeAudio(settings);\n  }\n  quickAudioDialog.close();\n}\n\nfunction openSettings(): void {\n''',
)
# Full settings scalar fields.
replace_once(
    'src/main.ts',
    '''for (const [id, field] of [\n  ["musicVolume", "musicVolume"],\n''',
    '''for (const [id, field] of [\n  ["masterVolume", "masterVolume"],\n  ["musicVolume", "musicVolume"],\n''',
)
replace_once(
    'src/main.ts',
    '''  ["pronunciationVolume", "pronunciationVolume"],\n] as const) {\n''',
    '''  ["pronunciationVolume", "pronunciationVolume"],\n  ["announcerVolume", "announcerVolume"],\n] as const) {\n''',
)
# Category listeners + recommended full settings.
replace_once(
    'src/main.ts',
    '''byId<HTMLSelectElement>("musicMode").addEventListener("change", (event) => {\n''',
    '''for (const group of ["typing", "combat", "warnings", "ui", "rewards"] as const) {\n  byId<HTMLInputElement>("audioCategory-" + group).addEventListener("input", (event) => {\n    const current = settingsDraft ?? settings;\n    const categories = sanitizeAudioCategoryVolumes(current.audioCategoryVolumes);\n    settingsDraft = {\n      ...current,\n      audioCategoryVolumes: {\n        ...categories,\n        [group]: sanitizeAudioLevel(Number((event.currentTarget as HTMLInputElement).value), 1),\n      },\n    };\n    markSettingsDirty();\n    renderSettings();\n  });\n}\n\nbyId("recommendedAudioButton").addEventListener("click", () => {\n  settingsDraft = recommendedAudioSettings(settingsDraft ?? settings);\n  markSettingsDirty();\n  renderSettings();\n});\n\nbyId<HTMLSelectElement>("musicMode").addEventListener("change", (event) => {\n''',
)
# Quick panel listeners before full settings cancel/save listeners.
replace_once(
    'src/main.ts',
    '''byId("settingsCancelButton").addEventListener("click", () => {\n''',
    '''byId("quickAudioButton").addEventListener("click", openQuickAudio);\nfor (const [id, field] of QUICK_AUDIO_FIELDS) {\n  byId<HTMLInputElement>(id).addEventListener("input", (event) => {\n    const current = quickAudioDraft ?? structuredClone(settings);\n    quickAudioDraft = {\n      ...current,\n      [field]: sanitizeAudioLevel(Number((event.currentTarget as HTMLInputElement).value), 1),\n    };\n    applyRuntimeAudio(quickAudioDraft);\n    renderQuickAudio();\n    byId("quickAudioStatus").textContent = "Previewing · Apply to save or Cancel to restore.";\n  });\n}\nbyId("quickAudioRecommended").addEventListener("click", () => {\n  quickAudioDraft = recommendedAudioSettings(quickAudioDraft ?? settings);\n  applyRuntimeAudio(quickAudioDraft);\n  renderQuickAudio();\n  byId("quickAudioStatus").textContent = "Recommended mix previewing.";\n});\nbyId("quickAudioCancel").addEventListener("click", () => closeQuickAudio(false));\nbyId("quickAudioApply").addEventListener("click", () => closeQuickAudio(true));\nbyId("quickAudioMore").addEventListener("click", () => {\n  closeQuickAudio(false);\n  openSettings();\n  window.requestAnimationFrame(() =>\n    byId("masterVolume").closest(".settings-section")?.scrollIntoView({ block: "start" }),\n  );\n});\nquickAudioDialog.addEventListener("close", () => {\n  if (!quickAudioCommitted) applyRuntimeAudio(settings);\n  quickAudioDraft = null;\n  quickAudioCommitted = false;\n});\n\nbyId("settingsCancelButton").addEventListener("click", () => {\n''',
)

# ---------------------------------------------------------------------------
# Title hub Quick Audio gains Master + Announcer while retaining useful extras.
# ---------------------------------------------------------------------------
replace_once(
    'src/ui/title-hub.ts',
    '''type VolumeField =\n  | "musicVolume"\n''',
    '''type VolumeField =\n  | "masterVolume"\n  | "musicVolume"\n''',
)
replace_once(
    'src/ui/title-hub.ts',
    '''  | "creditVolume"\n  | "pronunciationVolume";\n''',
    '''  | "creditVolume"\n  | "pronunciationVolume"\n  | "announcerVolume";\n''',
)
replace_once(
    'src/ui/title-hub.ts',
    '''}> = [\n  { field: "musicVolume", input: "quickMusicVolume", fallback: 0.26 },\n''',
    '''}> = [\n  { field: "masterVolume", input: "quickMasterVolume", fallback: 1 },\n  { field: "musicVolume", input: "quickMusicVolume", fallback: 0.26 },\n''',
)
replace_once(
    'src/ui/title-hub.ts',
    '''  { field: "pronunciationVolume", input: "quickVoiceVolume", fallback: 1 },\n];\n''',
    '''  { field: "pronunciationVolume", input: "quickVoiceVolume", fallback: 1 },\n  { field: "announcerVolume", input: "quickAnnouncerVolume", fallback: 1 },\n];\n''',
)
replace_once(
    'src/ui/title-hub.ts',
    '''    byId("titleSoundButton")?.classList.toggle("is-off", settings.sfxVolume <= 0);\n''',
    '''    byId("titleSoundButton")?.classList.toggle(\n      "is-off",\n      (settings.masterVolume ?? 1) <= 0 || settings.sfxVolume <= 0,\n    );\n''',
)

# ---------------------------------------------------------------------------
# DOM: always-available in-game Quick Audio + Advanced controls.
# ---------------------------------------------------------------------------
replace_once(
    'index.html',
    '''      <div><select id="voiceInputMode" aria-label="Input mode"><option value="typing">⌨ Typing</option><option value="voice">🎙 Voice</option><option value="hybrid">⌨ + 🎙 Hybrid</option></select><button id="voiceMicToggle" type="button" aria-label="Enable or stop microphone" aria-pressed="false">🎙 Mic</button></div>\n''',
    '''      <div><select id="voiceInputMode" aria-label="Input mode"><option value="typing">⌨ Typing</option><option value="voice">🎙 Voice</option><option value="hybrid">⌨ + 🎙 Hybrid</option></select><button id="voiceMicToggle" type="button" aria-label="Enable or stop microphone" aria-pressed="false">🎙 Mic</button><button id="quickAudioButton" type="button" aria-label="Quick audio settings">♫ Audio</button></div>\n''',
)
# Title popover additions.
replace_once(
    'index.html',
    '''              <h4 data-icon="sliders">Sound</h4>\n              <div class="holo-slider">\n                <button type="button" class="holo-slider-icon" data-icon="music" data-mute="musicVolume" aria-label="Mute music"></button>\n''',
    '''              <h4 data-icon="sliders">Sound</h4>\n              <div class="holo-slider">\n                <button type="button" class="holo-slider-icon" data-icon="volume" data-mute="masterVolume" aria-label="Mute all audio"></button>\n                <span><small>Master</small><input id="quickMasterVolume" type="range" min="0" max="1" step="0.05" /></span>\n                <output id="quickMasterVolumeValue">100%</output>\n              </div>\n              <div class="holo-slider">\n                <button type="button" class="holo-slider-icon" data-icon="music" data-mute="musicVolume" aria-label="Mute music"></button>\n''',
)
replace_once(
    'index.html',
    '''              <div class="holo-popover-foot">\n                <span>Tap an icon to mute</span>\n''',
    '''              <div class="holo-slider">\n                <button type="button" class="holo-slider-icon" data-icon="voice" data-mute="announcerVolume" aria-label="Mute announcer"></button>\n                <span><small>Announcer</small><input id="quickAnnouncerVolume" type="range" min="0" max="1" step="0.05" /></span>\n                <output id="quickAnnouncerVolumeValue">100%</output>\n              </div>\n              <div class="holo-popover-foot">\n                <span>Tap an icon to mute</span>\n''',
)
# Add non-modal quick panel just before warp dialog.
replace_once(
    'index.html',
    '''    <dialog id="warpDialog" class="settings-dialog warp-dialog" aria-labelledby="warpDialogTitle">\n''',
    '''    <dialog id="quickAudioDialog" class="settings-dialog quick-audio-dialog" aria-labelledby="quickAudioTitle">\n      <div class="dialog-head">\n        <div><p class="eyebrow">live mix</p><h2 id="quickAudioTitle">Quick Audio</h2></div>\n        <button id="quickAudioCancel" class="icon-button" type="button" aria-label="Cancel audio changes">×</button>\n      </div>\n      <p id="quickAudioStatus" class="data-status" aria-live="polite"></p>\n      <div class="quick-audio-grid">\n        <label class="setting-row"><span><strong>Master</strong><small>All game audio</small></span><span class="setting-control range-control"><input id="quickMaster" type="range" min="0" max="1" step="0.05"/><output id="quickMasterValue">100%</output></span></label>\n        <label class="setting-row"><span><strong>Pronunciation</strong><small>Learning voice stays highest priority</small></span><span class="setting-control range-control"><input id="quickPronunciation" type="range" min="0" max="1" step="0.05"/><output id="quickPronunciationValue">100%</output></span></label>\n        <label class="setting-row"><span><strong>Music Parent</strong><small>World, boss, shop and station music</small></span><span class="setting-control range-control"><input id="quickMusicParent" type="range" min="0" max="1" step="0.05"/><output id="quickMusicParentValue">26%</output></span></label>\n        <label class="setting-row"><span><strong>SFX Parent</strong><small>Typing and combat effects</small></span><span class="setting-control range-control"><input id="quickSfxParent" type="range" min="0" max="1" step="0.05"/><output id="quickSfxParentValue">50%</output></span></label>\n        <label class="setting-row"><span><strong>Announcer</strong><small>Milestones and combat calls</small></span><span class="setting-control range-control"><input id="quickAnnouncer" type="range" min="0" max="1" step="0.05"/><output id="quickAnnouncerValue">85%</output></span></label>\n      </div>\n      <div class="dialog-actions quick-audio-actions">\n        <button id="quickAudioRecommended" type="button">Recommended</button>\n        <button id="quickAudioMore" type="button">More Audio Settings</button>\n        <button id="quickAudioApply" class="primary" type="button">Apply</button>\n      </div>\n    </dialog>\n\n    <dialog id="warpDialog" class="settings-dialog warp-dialog" aria-labelledby="warpDialogTitle">\n''',
)
# Full settings: Master/Recommended at top.
replace_once(
    'index.html',
    '''      <div class="settings-section">\n        <h3>sound</h3>\n        <label class="setting-row">\n          <span>\n            <strong>Music volume</strong>\n''',
    '''      <div class="settings-section">\n        <h3>audio</h3>\n        <div class="setting-row">\n          <span><strong>Recommended mix</strong><small>Quality baseline tuned so pronunciation stays clear without manual repair.</small></span>\n          <span class="setting-control"><button id="recommendedAudioButton" type="button">Use Recommended</button></span>\n        </div>\n        <label class="setting-row">\n          <span><strong>Master volume</strong><small>Top-level gain for music, SFX, announcer and pronunciation</small></span>\n          <span class="setting-control range-control"><input id="masterVolume" type="range" min="0" max="1" step="0.05"/><output id="masterVolumeValue">100%</output></span>\n        </label>\n        <label class="setting-row">\n          <span>\n            <strong>Music volume</strong>\n''',
)
# Announcer + advanced categories after pronunciation volume.
replace_once(
    'index.html',
    '''        <label class="setting-row">\n          <span>\n            <strong>Pronunciation volume</strong>\n            <small>Parent music ducks while pronunciation is active</small>\n          </span>\n          <span class="setting-control range-control">\n            <input id="pronunciationVolume" type="range" min="0" max="1" step="0.05" />\n            <output id="pronunciationVolumeValue">100%</output>\n          </span>\n        </label>\n      </div>\n''',
    '''        <label class="setting-row">\n          <span>\n            <strong>Pronunciation volume</strong>\n            <small>Parent music ducks while pronunciation is active</small>\n          </span>\n          <span class="setting-control range-control">\n            <input id="pronunciationVolume" type="range" min="0" max="1" step="0.05" />\n            <output id="pronunciationVolumeValue">100%</output>\n          </span>\n        </label>\n        <label class="setting-row">\n          <span><strong>Announcer volume</strong><small>Independent voice/learning control; still yields to pronunciation focus</small></span>\n          <span class="setting-control range-control"><input id="announcerVolume" type="range" min="0" max="1" step="0.05"/><output id="announcerVolumeValue">85%</output></span>\n        </label>\n\n        <details class="audio-advanced">\n          <summary>More Audio Settings · Advanced categories</summary>\n          <p class="equipment-note">These are the real A2 runtime buses: no decorative sliders. UI includes shop purchase/confirm; Rewards includes Credits.</p>\n          <label class="setting-row"><span><strong>Typing / Word Feedback</strong><small>Keystrokes, misses and word completion</small></span><span class="setting-control range-control"><input id="audioCategory-typing" type="range" min="0" max="1" step="0.05"/><output id="audioCategory-typingValue">100%</output></span></label>\n          <label class="setting-row"><span><strong>Combat</strong><small>Weapons, skills, enemy attacks, explosions, damage and shields</small></span><span class="setting-control range-control"><input id="audioCategory-combat" type="range" min="0" max="1" step="0.05"/><output id="audioCategory-combatValue">100%</output></span></label>\n          <label class="setting-row"><span><strong>Warnings</strong><small>Telegraphs and critical combat cues</small></span><span class="setting-control range-control"><input id="audioCategory-warnings" type="range" min="0" max="1" step="0.05"/><output id="audioCategory-warningsValue">100%</output></span></label>\n          <label class="setting-row"><span><strong>UI / Shop Confirm</strong><small>Interface, purchase and confirmation cues</small></span><span class="setting-control range-control"><input id="audioCategory-ui" type="range" min="0" max="1" step="0.05"/><output id="audioCategory-uiValue">100%</output></span></label>\n          <label class="setting-row"><span><strong>Rewards / Credits</strong><small>Reward drops, pickups and economy feedback</small></span><span class="setting-control range-control"><input id="audioCategory-rewards" type="range" min="0" max="1" step="0.05"/><output id="audioCategory-rewardsValue">100%</output></span></label>\n        </details>\n      </div>\n''',
)

# Styling is isolated to A3 rather than widening generic dialog rules.
write_new(
    'src/ui/audio-settings.css',
    '''.voice-input-controls > div { flex-wrap: wrap; }\n.voice-input-controls #quickAudioButton { flex: 0 0 auto; }\n.quick-audio-dialog[open] {\n  position: fixed;\n  z-index: 90;\n  inset: auto 18px 18px auto;\n  width: min(470px, calc(100vw - 36px));\n  max-height: min(78vh, 680px);\n  margin: 0;\n  overflow: auto;\n}\n.quick-audio-grid { display: grid; gap: 0.35rem; }\n.quick-audio-dialog .setting-row { padding-block: 0.55rem; }\n.quick-audio-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.5rem; margin-top: 0.8rem; }\n.audio-advanced { margin-top: 0.8rem; border-top: 1px solid rgba(111, 231, 255, 0.12); padding-top: 0.7rem; }\n.audio-advanced > summary { cursor: pointer; color: var(--holo-accent); font-weight: 700; letter-spacing: 0.04em; }\n@media (max-width: 640px) {\n  .quick-audio-dialog[open] { inset: auto 8px 8px 8px; width: auto; }\n}\n''',
)
replace_once(
    'src/main.ts',
    '''import "./ui/voice-feedback.css";\n''',
    '''import "./ui/voice-feedback.css";\nimport "./ui/audio-settings.css";\n''',
)

# ---------------------------------------------------------------------------
# Regression tests: sanitizer/preset, UI contract, PvP-safe no-pause quick panel.
# ---------------------------------------------------------------------------
write_new(
    'tests/player-audio-settings.test.ts',
    '''import { describe, expect, it } from "vitest";\nimport {\n  DEFAULT_AUDIO_CATEGORY_VOLUMES,\n  RECOMMENDED_AUDIO,\n  recommendedAudioSettings,\n  sanitizeAudioCategoryVolumes,\n} from "../src/audio/player-settings";\nimport type { GameSettings } from "../src/types";\n\nconst base: GameSettings = {\n  masterVolume: 0.4,\n  sfxVolume: 0.2,\n  creditVolume: 1.4,\n  musicVolume: 0.7,\n  ambientVolume: 0.4,\n  screenShake: true,\n  visualQuality: "high",\n  pronunciationEnabled: true,\n  pronunciationRate: 1,\n  pronunciationVolume: 0.5,\n  announcerVolume: 0.25,\n  audioCategoryVolumes: { typing: 0.2, combat: 0.3, warnings: 0.4, ui: 0.5, rewards: 0.6 },\n};\n\ndescribe("player audio settings", () => {\n  it("migrates missing category values to neutral gain", () => {\n    expect(sanitizeAudioCategoryVolumes({ combat: 0.35 })).toEqual({\n      ...DEFAULT_AUDIO_CATEGORY_VOLUMES,\n      combat: 0.35,\n    });\n  });\n\n  it("clamps malformed category values", () => {\n    expect(sanitizeAudioCategoryVolumes({ typing: -3, combat: 9, ui: Number.NaN })).toEqual({\n      typing: 0, combat: 1, warnings: 1, ui: 1, rewards: 1,\n    });\n  });\n\n  it("Recommended only replaces audio fields", () => {\n    const result = recommendedAudioSettings(base);\n    expect(result.screenShake).toBe(true);\n    expect(result.visualQuality).toBe("high");\n    expect(result.masterVolume).toBe(RECOMMENDED_AUDIO.masterVolume);\n    expect(result.announcerVolume).toBe(RECOMMENDED_AUDIO.announcerVolume);\n    expect(result.pronunciationVolume).toBe(1);\n    expect(result.audioCategoryVolumes).toEqual(DEFAULT_AUDIO_CATEGORY_VOLUMES);\n  });\n});\n''',
)
write_new(
    'tests/audio-settings-ui-contract.test.ts',
    '''import { readFileSync } from "node:fs";\nimport { describe, expect, it } from "vitest";\n\nconst html = readFileSync(new URL("../index.html", import.meta.url), "utf8");\nconst main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");\n\ndescribe("A3 player audio UI contract", () => {\n  it("exposes the five mandatory Quick Audio controls and advanced access", () => {\n    for (const id of [\n      "quickMaster",\n      "quickPronunciation",\n      "quickMusicParent",\n      "quickSfxParent",\n      "quickAnnouncer",\n      "quickAudioMore",\n    ]) {\n      expect(html).toContain(`id="${id}"`);\n    }\n  });\n\n  it("exposes real separated A2 runtime category buses", () => {\n    for (const group of ["typing", "combat", "warnings", "ui", "rewards"]) {\n      expect(html).toContain(`id="audioCategory-${group}"`);\n    }\n  });\n\n  it("keeps Quick Audio PvP-safe by protecting local input without pausing the game", () => {\n    const openStart = main.indexOf("function openQuickAudio");\n    const openEnd = main.indexOf("function closeQuickAudio", openStart);\n    const body = main.slice(openStart, openEnd);\n    expect(body).toContain("quickAudioDialog.show()");\n    expect(body).not.toContain("game.pause(");\n    expect(main).toContain('if (document.querySelector("dialog[open]") !== null) return;');\n  });\n});\n''',
)
