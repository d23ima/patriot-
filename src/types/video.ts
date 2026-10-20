export type KenBurnsEffect =
  | 'zoom-in'
  | 'zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'pan-top-down'
  | 'center-drift';

export type TransitionStyle =
  | 'crossfade'
  | 'fade-black'
  | 'cut'
  | 'subtle-slide';

export type AmbientSoundtrack =
  | 'cosmic-drone'
  | 'historical-warmth'
  | 'documentary-pulse'
  | 'cinematic-strings'
  | 'silence';

export interface Scene {
  id: string;
  chapterNumber: number;
  chapterTitle: string;
  sceneTitle: string;
  narrationText: string;
  estimatedDurationSec: number;
  kenBurnsEffect: KenBurnsEffect;
  transition: TransitionStyle;
  visualPrompt?: string;
  subtitleHeadline?: string;
  imageUrl: string;
  audioUrl?: string; // base64 or blob URL of pre-synthesized TTS
  audioBuffer?: AudioBuffer;
}

export interface Chapter {
  number: number;
  title: string;
  sceneIds: string[];
  startSec: number;
  durationSec: number;
}

export type VoiceTonePreset =
  | 'archival-historian'
  | 'cosmic-philosopher'
  | 'noir-monologue'
  | 'warm-poetic'
  | 'cybernetic-scholar'
  | 'custom';

export type SubtitleFontFamily =
  | 'Plus Jakarta Sans'
  | 'Playfair Display'
  | 'Cinzel'
  | 'Syne'
  | 'Bricolage Grotesque'
  | 'Oswald'
  | 'JetBrains Mono'
  | 'Space Mono';

export type SubtitleSyncMode =
  | 'karaoke-word'
  | 'progressive-phrase'
  | 'full-block';

export type SubtitlePosition =
  | 'lower-third'
  | 'center'
  | 'bottom-bar';

export type AudioPostEffect =
  | 'none'
  | 'vintage-radio'
  | 'warm-analog'
  | 'ethereal-reverb';

export interface VideoProject {
  id: string;
  title: string;
  targetMinutes: number; // 20 to 30
  wordsPerMinute: number;
  script: string;
  aspectRatio: '16:9' | '9:16';
  scenes: Scene[];
  soundtrack: AmbientSoundtrack;
  soundtrackVolume: number; // 0 to 1
  voiceName: 'Kore' | 'Fenrir' | 'Puck' | 'Zephyr' | 'Charon';
  voiceTone: VoiceTonePreset;
  voiceToneCustomPrompt?: string;
  audioPostEffect: AudioPostEffect;
  showSubtitles: boolean;
  subtitleFont: SubtitleFontFamily;
  subtitleFontSize: number;
  subtitleSyncMode: SubtitleSyncMode;
  subtitleHighlightColor: string;
  subtitlePosition: SubtitlePosition;
  showChapterCards: boolean;
  showTimecodeOverlay: boolean;
  createdAt: number;
}

export interface ExportProgress {
  isExporting: boolean;
  progressPercent: number;
  currentSecond: number;
  totalSeconds: number;
  currentFrame: number;
  totalFrames: number;
  statusText: string;
  downloadUrl?: string;
  fileSizeMb?: number;
}
