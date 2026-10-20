import React, { useState } from 'react';
import { AmbientSoundtrack, VoiceTonePreset, AudioPostEffect } from '../types/video';
import { audioEngine } from '../utils/audioSynthesizer';
import { X, Music, Volume2, Mic, Play, Check, Sparkles, Radio } from 'lucide-react';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSoundtrack: AmbientSoundtrack;
  soundtrackVolume: number;
  voiceName: string;
  voiceTone: VoiceTonePreset;
  voiceToneCustomPrompt?: string;
  audioPostEffect: AudioPostEffect;
  onUpdateAudio: (settings: {
    soundtrack: AmbientSoundtrack;
    soundtrackVolume: number;
    voiceName: any;
    voiceTone: VoiceTonePreset;
    voiceToneCustomPrompt?: string;
    audioPostEffect: AudioPostEffect;
  }) => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  currentSoundtrack,
  soundtrackVolume,
  voiceName,
  voiceTone,
  voiceToneCustomPrompt = '',
  audioPostEffect,
  onUpdateAudio,
}) => {
  if (!isOpen) return null;

  const [track, setTrack] = useState<AmbientSoundtrack>(currentSoundtrack);
  const [vol, setVol] = useState<number>(soundtrackVolume);
  const [voice, setVoice] = useState<string>(voiceName);
  const [tone, setTone] = useState<VoiceTonePreset>(voiceTone);
  const [customPrompt, setCustomPrompt] = useState<string>(voiceToneCustomPrompt);
  const [postFx, setPostFx] = useState<AudioPostEffect>(audioPostEffect);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  const soundtracks: { id: AmbientSoundtrack; title: string; desc: string }[] = [
    {
      id: 'documentary-pulse',
      title: 'Documentary Pulse',
      desc: 'Thoughtful acoustic resonance with subtle rhythmic contemplation',
    },
    {
      id: 'cosmic-drone',
      title: 'Cosmic Drone',
      desc: 'Sub-bass celestial warmth and deep space harmonics',
    },
    {
      id: 'historical-warmth',
      title: 'Historical Warmth',
      desc: 'Rich archival organ swells and contemplative resonance',
    },
    {
      id: 'cinematic-strings',
      title: 'Cinematic Strings',
      desc: 'Broad orchestral pads for epic technological and natural narratives',
    },
    {
      id: 'silence',
      title: 'Voice Only (Silent Soundbed)',
      desc: 'No ambient background music, pure dialogue focus',
    },
  ];

  const uniqueTones: {
    id: VoiceTonePreset;
    title: string;
    tagline: string;
    description: string;
  }[] = [
    {
      id: 'archival-historian',
      title: 'Archival Historian (1940s Vintage)',
      tagline: 'Distinctive vintage documentary warmth',
      description:
        'Slow, measured British/Mid-Atlantic cadence with deep scholarly gravitas, reminiscent of vintage BBC broadcasts and Ken Burns archives.',
    },
    {
      id: 'cosmic-philosopher',
      title: 'Cosmic Oracle / Mystic Philosopher',
      tagline: 'Hypnotic, spacious, contemplative',
      description:
        'Slow hypnotic delivery with resonant low-register timbre, spacious philosophical pauses, and ethereal depth.',
    },
    {
      id: 'noir-monologue',
      title: '1950s Cinematic Noir Detective',
      tagline: 'Smoky, syncopated, rhythmic gravel',
      description:
        'Smoky low-frequency register, cynical dry timing, rhythmic syncopated pacing, and intimate vintage microphone proximity.',
    },
    {
      id: 'warm-poetic',
      title: 'Intimate Poetic Storyteller',
      tagline: 'Close-mic warmth & nuanced breath',
      description:
        'Warm acoustic storytelling, tender human nuances, delicate phrasing, and authentic unhurried reflection.',
    },
    {
      id: 'cybernetic-scholar',
      title: 'Cybernetic Polymath Lecturer',
      tagline: 'Crystal diction & analytical gravity',
      description:
        'Calm hyper-articulate polymath professor, razor-sharp articulation, and measured intellectual gravity.',
    },
    {
      id: 'custom',
      title: 'Custom Persona Prompt',
      tagline: 'Design your own bespoke vocal style',
      description: 'Enter your custom speech style instructions directly to Gemini TTS.',
    },
  ];

  const voices = [
    { name: 'Charon', gender: 'Male', desc: 'Grounded, gravitas-laden, historic chronicle' },
    { name: 'Fenrir', gender: 'Male', desc: 'Deep, resonant, authoritative archival voice' },
    { name: 'Kore', gender: 'Female', desc: 'Warm, clear, balanced documentary narrator' },
    { name: 'Zephyr', gender: 'Female', desc: 'Soft, airy, atmospheric philosophical tone' },
    { name: 'Puck', gender: 'Male', desc: 'Engaging, modern, crisp educational delivery' },
  ];

  const postEffects: { id: AudioPostEffect; title: string; desc: string }[] = [
    { id: 'none', title: 'Studio Flat', desc: 'Clean uncolored master output' },
    { id: 'vintage-radio', title: 'Vintage Gramophone / Radio EQ', desc: '1940s bandpass filter (360Hz - 3.5kHz) with analogue presence' },
    { id: 'warm-analog', title: 'Warm Analogue Tape', desc: 'Subtle bass warmth (+4.5dB low shelf) with tube compressor punch' },
    { id: 'ethereal-reverb', title: 'Cosmic Space Reverb', desc: 'Atmospheric feedback delay with high-frequency shimmer' },
  ];

  const handleSave = () => {
    onUpdateAudio({
      soundtrack: track,
      soundtrackVolume: vol,
      voiceName: voice,
      voiceTone: tone,
      voiceToneCustomPrompt: customPrompt,
      audioPostEffect: postFx,
    });
    audioEngine.setVolume(vol);
    audioEngine.playTrack(track);
    onClose();
  };

  const handleTestMusic = (selectedTrack: AmbientSoundtrack) => {
    setTrack(selectedTrack);
    audioEngine.setVolume(vol);
    audioEngine.playTrack(selectedTrack);
  };

  const handleTestVoice = async () => {
    setIsPlayingTest(true);

    try {
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Welcome to the Chronicle 30 archive. Testing the ${voice} voice in our ${tone} vocal delivery.`,
          voice,
          tonePreset: tone,
          customPrompt,
        }),
      });
      const data = await res.json();
      if (data.audioBase64) {
        const source = await audioEngine.playWavAudio(data.audioBase64, postFx);
        if (source) {
          source.onended = () => setIsPlayingTest(false);
        }
      } else {
        setIsPlayingTest(false);
      }
    } catch {
      setIsPlayingTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <Mic className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">Unique Voice Tone & Acoustic Studio</h3>
              <p className="text-xs text-neutral-400">
                Non-trend documentary vocal styling, Gemini TTS personas, and ambient music soundbeds.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Distinctive Voice Tone Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Unique Voice Tone (Non-Trend Delivery)</span>
              </label>
              <button
                onClick={handleTestVoice}
                disabled={isPlayingTest}
                className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-amber-300 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-40 transition-colors"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{isPlayingTest ? 'Playing Sample...' : 'Sample Tone Audio'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {uniqueTones.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    tone === t.id
                      ? 'bg-amber-400/10 border-amber-400 text-white ring-1 ring-amber-400/50'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-100">{t.title}</span>
                    {tone === t.id && (
                      <span className="p-0.5 rounded-full bg-amber-400 text-neutral-950">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-medium text-amber-400/90 mt-1">
                    {t.tagline}
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1 line-clamp-2">
                    {t.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Custom Tone Prompt input if 'custom' selected */}
            {tone === 'custom' && (
              <div className="mt-3 p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                  Custom Vocal Persona Instruction:
                </label>
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Victorian era naturalist speaking with soft antique cadence, reflective pauses, and low gravel..."
                  className="w-full text-xs px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-400"
                />
              </div>
            )}
          </div>

          {/* Voice Actor & Audio Post-Processing Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Gemini Prebuilt Voice Actor */}
            <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2.5">
                Gemini Voice Actor
              </label>
              <div className="space-y-1.5">
                {voices.map((v) => (
                  <button
                    key={v.name}
                    onClick={() => setVoice(v.name)}
                    className={`w-full p-2 rounded-lg text-left text-xs flex items-center justify-between transition-all cursor-pointer ${
                      voice === v.name
                        ? 'bg-amber-400/10 text-amber-200 border border-amber-400/60 font-medium'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{v.name}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">({v.gender})</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 truncate max-w-[130px]">
                      {v.desc.split(',')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Post-Processing DSP Hardware Filter */}
            <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>Voice Acoustic Filter</span>
              </label>
              <div className="space-y-1.5">
                {postEffects.map((pe) => (
                  <button
                    key={pe.id}
                    onClick={() => setPostFx(pe.id)}
                    className={`w-full p-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                      postFx === pe.id
                        ? 'bg-amber-400/10 text-amber-200 border border-amber-400/60 font-medium'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    <div className="font-semibold text-neutral-200">{pe.title}</div>
                    <div className="text-[10px] text-neutral-500 line-clamp-1">{pe.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ambient Music Soundbed */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2.5">
              Cinematic Ambient Soundbed
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {soundtracks.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleTestMusic(s.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    track === s.id
                      ? 'bg-amber-400/10 border-amber-400 text-white'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-neutral-200">{s.title}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">{s.desc}</div>
                  </div>
                  {track === s.id && (
                    <span className="p-1 rounded-full bg-amber-400 text-neutral-950">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Soundbed Volume Slider */}
            <div className="mt-3 p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-neutral-300 shrink-0">
                <Volume2 className="w-4 h-4 text-neutral-400" />
                <span>Music Level: {Math.round(vol * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={vol}
                onChange={(e) => {
                  const newVol = parseFloat(e.target.value);
                  setVol(newVol);
                  audioEngine.setVolume(newVol);
                }}
                className="flex-1 accent-amber-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-800 bg-neutral-950">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-lg text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer shadow"
          >
            Apply Tone & Audio Settings
          </button>
        </div>
      </div>
    </div>
  );
};
