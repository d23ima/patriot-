import React, { useState } from 'react';
import {
  Scene,
  KenBurnsEffect,
  TransitionStyle,
  VoiceTonePreset,
  AudioPostEffect,
} from '../types/video';
import { STOCK_DOCUMENTARY_IMAGES } from '../utils/presets';
import {
  Sparkles,
  Volume2,
  Clock,
  Compass,
  Layers,
  Image as ImageIcon,
  Type,
  Check,
  RefreshCw,
  Play,
  Square,
} from 'lucide-react';
import { audioEngine } from '../utils/audioSynthesizer';

interface SceneInspectorProps {
  scene: Scene;
  sceneIndex: number;
  totalScenes: number;
  availableImages: { id: string; title: string; url: string }[];
  onUpdateScene: (updated: Scene) => void;
  voiceName: string;
  voiceTone: VoiceTonePreset;
  voiceToneCustomPrompt?: string;
  audioPostEffect: AudioPostEffect;
}

export const SceneInspector: React.FC<SceneInspectorProps> = ({
  scene,
  sceneIndex,
  totalScenes,
  availableImages,
  onUpdateScene,
  voiceName,
  voiceTone,
  voiceToneCustomPrompt,
  audioPostEffect,
}) => {
  const [isSynthesizingTTS, setIsSynthesizingTTS] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [promptInput, setPromptInput] = useState(scene.visualPrompt || '');

  const effects: { id: KenBurnsEffect; label: string }[] = [
    { id: 'zoom-in', label: 'Slow Zoom In' },
    { id: 'zoom-out', label: 'Slow Zoom Out' },
    { id: 'pan-left', label: 'Pan Left to Right' },
    { id: 'pan-right', label: 'Pan Right to Left' },
    { id: 'pan-top-down', label: 'Vertical Tilt Down' },
    { id: 'center-drift', label: 'Ambient Drift' },
  ];

  const transitions: { id: TransitionStyle; label: string }[] = [
    { id: 'crossfade', label: 'Crossfade Dissolve' },
    { id: 'fade-black', label: 'Fade to Black' },
    { id: 'subtle-slide', label: 'Subtle Cinematic Slide' },
    { id: 'cut', label: 'Hard Cut' },
  ];

  // Synthesize TTS via Gemini API with unique voice tone
  const handleSynthesizeTTS = async () => {
    if (!scene.narrationText) return;
    setIsSynthesizingTTS(true);

    try {
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scene.narrationText,
          voice: voiceName,
          tonePreset: voiceTone,
          customPrompt: voiceToneCustomPrompt,
        }),
      });

      const data = await res.json();
      if (data.audioBase64) {
        onUpdateScene({
          ...scene,
          audioUrl: data.audioBase64,
        });
        // Test play with chosen DSP post effect
        setIsPlayingTTS(true);
        const source = await audioEngine.playWavAudio(data.audioBase64, audioPostEffect);
        if (source) {
          source.onended = () => setIsPlayingTTS(false);
        }
      } else {
        // Fallback to browser SpeechSynthesis
        fallbackSpeak(scene.narrationText);
      }
    } catch {
      fallbackSpeak(scene.narrationText);
    } finally {
      setIsSynthesizingTTS(false);
    }
  };

  const fallbackSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 0.98;
      utterance.onstart = () => {
        setIsPlayingTTS(true);
        audioEngine.duckMusic(true);
      };
      utterance.onend = () => {
        setIsPlayingTTS(false);
        audioEngine.duckMusic(false);
      };
      utterance.onerror = () => {
        setIsPlayingTTS(false);
        audioEngine.duckMusic(false);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    audioEngine.duckMusic(false);
    setIsPlayingTTS(false);
  };

  // Generate Image for Scene via Gemini API
  const handleGenerateAIImage = async () => {
    if (!promptInput) return;
    setIsGeneratingImage(true);

    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptInput,
          aspectRatio: '16:9',
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        onUpdateScene({
          ...scene,
          imageUrl: data.imageUrl,
          visualPrompt: promptInput,
        });
      }
    } catch (err) {
      console.error('Failed to generate image:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900/90 border-l border-neutral-800 p-5 overflow-y-auto text-sm text-neutral-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
        <div>
          <span className="text-xs font-mono text-amber-400">
            SHOT {sceneIndex + 1} OF {totalScenes}
          </span>
          <h3 className="text-base font-semibold text-neutral-100 truncate mt-0.5">
            {scene.sceneTitle || `Scene ${sceneIndex + 1}`}
          </h3>
        </div>
        <div className="text-xs font-mono text-neutral-400 bg-neutral-800 px-2 py-1 rounded">
          Ch. {scene.chapterNumber}
        </div>
      </div>

      {/* Visual Image Preview & Quick Assignment */}
      <div className="mt-5">
        <label className="text-xs font-medium text-neutral-400 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
            <span>Assigned Visual Still</span>
          </span>
          <button
            onClick={() => setShowImagePicker(!showImagePicker)}
            className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer"
          >
            {showImagePicker ? 'Close Library' : 'Change Visual'}
          </button>
        </label>

        <div className="relative aspect-video rounded-lg overflow-hidden border border-neutral-800 group bg-neutral-950">
          <img
            src={scene.imageUrl}
            alt={scene.sceneTitle}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
            <span className="text-[11px] text-neutral-300 font-mono truncate">
              {scene.kenBurnsEffect} · {scene.transition}
            </span>
          </div>
        </div>

        {/* Quick Image Picker Tray */}
        {showImagePicker && (
          <div className="mt-2.5 p-2 bg-neutral-950 rounded-lg border border-neutral-800 max-h-48 overflow-y-auto grid grid-cols-2 gap-2">
            {[...availableImages, ...STOCK_DOCUMENTARY_IMAGES].map((img, i) => (
              <button
                key={`${img.id}_${i}`}
                onClick={() => {
                  onUpdateScene({ ...scene, imageUrl: img.url });
                  setShowImagePicker(false);
                }}
                className={`relative aspect-video rounded overflow-hidden border text-left cursor-pointer transition-all ${
                  scene.imageUrl === img.url
                    ? 'border-amber-400 ring-1 ring-amber-400'
                    : 'border-neutral-800 hover:border-neutral-600'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-neutral-300 px-1 truncate">
                  {img.title}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* AI Image Generator Mini Prompt */}
        <div className="mt-2.5 flex items-center gap-1.5">
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="AI visual prompt (e.g. vintage electron microscope)..."
            className="flex-1 text-xs px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={handleGenerateAIImage}
            disabled={isGeneratingImage || !promptInput}
            className="px-2.5 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-amber-300 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-40 whitespace-nowrap transition-colors"
          >
            {isGeneratingImage ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            <span>Generate</span>
          </button>
        </div>
      </div>

      {/* Narration Script & Subtitles */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-neutral-400 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-neutral-400" />
            <span>Spoken Narration Script</span>
          </label>
          <span className="text-[11px] font-mono text-neutral-500">
            {scene.narrationText.split(/\s+/).filter(Boolean).length} words
          </span>
        </div>

        <textarea
          rows={4}
          value={scene.narrationText}
          onChange={(e) => onUpdateScene({ ...scene, narrationText: e.target.value })}
          className="w-full p-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-amber-400 leading-relaxed resize-none"
          placeholder="Enter the narration script for this scene..."
        />

        {/* Voiceover preview & synthesis actions */}
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={handleSynthesizeTTS}
            disabled={isSynthesizingTTS}
            className="flex-1 py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            {isSynthesizingTTS ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Generating Speech...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Synthesize ({voiceName} · {voiceTone.replace('-', ' ')})</span>
              </>
            )}
          </button>

          {isPlayingTTS ? (
            <button
              onClick={handleStopAudio}
              className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-rose-400 rounded-lg cursor-pointer"
              title="Stop playback"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={() => {
                if (scene.audioUrl) {
                  audioEngine.playWavAudio(scene.audioUrl, audioPostEffect).then((src) => {
                    if (src) {
                      setIsPlayingTTS(true);
                      src.onended = () => setIsPlayingTTS(false);
                    }
                  });
                } else {
                  fallbackSpeak(scene.narrationText);
                }
              }}
              className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg cursor-pointer"
              title="Play voiceover preview"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          )}
        </div>
      </div>

      {/* Duration Slider */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-neutral-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span>Shot Duration</span>
          </label>
          <span className="font-mono text-xs text-amber-300 font-semibold tabular-nums">
            {scene.estimatedDurationSec} seconds
          </span>
        </div>
        <input
          type="range"
          min={10}
          max={90}
          step={1}
          value={scene.estimatedDurationSec}
          onChange={(e) =>
            onUpdateScene({
              ...scene,
              estimatedDurationSec: parseInt(e.target.value, 10),
            })
          }
          className="w-full accent-amber-400 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1">
          <span>10s (Fast cut)</span>
          <span>35s (Standard)</span>
          <span>90s (Long linger)</span>
        </div>
      </div>

      {/* Ken Burns Cinematics */}
      <div className="mt-5">
        <label className="text-xs font-medium text-neutral-400 flex items-center gap-1.5 mb-2">
          <Compass className="w-3.5 h-3.5 text-neutral-400" />
          <span>Ken Burns Camera Path</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {effects.map((eff) => (
            <button
              key={eff.id}
              onClick={() => onUpdateScene({ ...scene, kenBurnsEffect: eff.id })}
              className={`p-2 rounded-lg text-left text-xs transition-colors cursor-pointer border ${
                scene.kenBurnsEffect === eff.id
                  ? 'bg-amber-400/10 border-amber-400/60 text-amber-200'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              {eff.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transition Style */}
      <div className="mt-5">
        <label className="text-xs font-medium text-neutral-400 flex items-center gap-1.5 mb-2">
          <Layers className="w-3.5 h-3.5 text-neutral-400" />
          <span>Incoming Transition</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {transitions.map((trans) => (
            <button
              key={trans.id}
              onClick={() => onUpdateScene({ ...scene, transition: trans.id })}
              className={`p-2 rounded-lg text-left text-xs transition-colors cursor-pointer border ${
                scene.transition === trans.id
                  ? 'bg-amber-400/10 border-amber-400/60 text-amber-200'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              {trans.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subtitle Lower-Third Headline */}
      <div className="mt-5 mb-4">
        <label className="text-xs font-medium text-neutral-400 flex items-center gap-1.5 mb-1.5">
          <span>Lower-Third Caption Kicker</span>
        </label>
        <input
          type="text"
          value={scene.subtitleHeadline || ''}
          onChange={(e) => onUpdateScene({ ...scene, subtitleHeadline: e.target.value })}
          placeholder="e.g. THE EMERGENCE OF ABSTRACT SYMBOLS"
          className="w-full text-xs px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-amber-400"
        />
      </div>
    </div>
  );
};
