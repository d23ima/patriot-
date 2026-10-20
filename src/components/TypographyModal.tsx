import React from 'react';
import {
  SubtitleFontFamily,
  SubtitleSyncMode,
  SubtitlePosition,
} from '../types/video';
import { X, Type, Check, Sparkles, Sliders, Palette, AlignVerticalJustifyCenter } from 'lucide-react';

interface TypographyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFont: SubtitleFontFamily;
  currentFontSize: number;
  currentSyncMode: SubtitleSyncMode;
  currentHighlightColor: string;
  currentPosition: SubtitlePosition;
  onUpdateTypography: (settings: {
    subtitleFont: SubtitleFontFamily;
    subtitleFontSize: number;
    subtitleSyncMode: SubtitleSyncMode;
    subtitleHighlightColor: string;
    subtitlePosition: SubtitlePosition;
  }) => void;
}

export const TypographyModal: React.FC<TypographyModalProps> = ({
  isOpen,
  onClose,
  currentFont,
  currentFontSize,
  currentSyncMode,
  currentHighlightColor,
  currentPosition,
  onUpdateTypography,
}) => {
  if (!isOpen) return null;

  const fontOptions: {
    id: SubtitleFontFamily;
    name: string;
    category: string;
    sampleText: string;
    cssFamily: string;
  }[] = [
    {
      id: 'Playfair Display',
      name: 'Playfair Display',
      category: 'Archival Editorial Serif',
      sampleText: 'Before symbols were carved into stone',
      cssFamily: "'Playfair Display', serif",
    },
    {
      id: 'Cinzel',
      name: 'Cinzel',
      category: 'Epic Classical Inscription',
      sampleText: 'THE CELESTIAL HORIZON OF KNOWLEDGE',
      cssFamily: "'Cinzel', serif",
    },
    {
      id: 'Syne',
      name: 'Syne',
      category: 'Avant-Garde Architectural Sans',
      sampleText: 'Silicon pathways pulsating with electricity',
      cssFamily: "'Syne', sans-serif",
    },
    {
      id: 'Bricolage Grotesque',
      name: 'Bricolage Grotesque',
      category: 'Expressive Modern Editorial',
      sampleText: 'Miniature metropolises of copper traces',
      cssFamily: "'Bricolage Grotesque', sans-serif",
    },
    {
      id: 'Oswald',
      name: 'Oswald',
      category: 'Cinematic Condensed Headline',
      sampleText: 'TRANSISTORS SHRINKING TO NANOMETERS',
      cssFamily: "'Oswald', sans-serif",
    },
    {
      id: 'Plus Jakarta Sans',
      name: 'Plus Jakarta Sans',
      category: 'Crisp Contemporary Geometric',
      sampleText: 'A collaborative inquiry into physical laws',
      cssFamily: "'Plus Jakarta Sans', sans-serif",
    },
    {
      id: 'JetBrains Mono',
      name: 'JetBrains Mono',
      category: 'Technical Telemetry & Code',
      sampleText: 'CRYOGENIC_LATTICE // QUBIT_STATE: COHERENT',
      cssFamily: "'JetBrains Mono', monospace",
    },
    {
      id: 'Space Mono',
      name: 'Space Mono',
      category: 'Sci-Fi Archive Monospace',
      sampleText: 'EPOCH 2030 // OBSERVATION COMPLETE',
      cssFamily: "'Space Mono', monospace",
    },
  ];

  const colors = [
    { label: 'Amber Gold', hex: '#fbbf24' },
    { label: 'Emerald Jade', hex: '#34d399' },
    { label: 'Cyber Cyan', hex: '#38bdf8' },
    { label: 'Sunset Rose', hex: '#fb7185' },
    { label: 'Pristine White', hex: '#ffffff' },
  ];

  const syncModes: { id: SubtitleSyncMode; title: string; desc: string }[] = [
    {
      id: 'karaoke-word',
      title: 'Word-by-Word Karaoke Sync',
      desc: 'Active spoken word illuminates with custom accent glow while upcoming words stay softly dimmed',
    },
    {
      id: 'progressive-phrase',
      title: 'Progressive Phrase Reveal',
      desc: 'Reveals and focuses on the active sentence or line in sync with voice delivery',
    },
    {
      id: 'full-block',
      title: 'Classic Full Caption',
      desc: 'Displays the complete shot caption with highlighted active word',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <Type className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">Subtitle Typography & Synchronization</h3>
              <p className="text-xs text-neutral-400">
                Choose custom fonts and configure live voiceover-synchronized text tracking.
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
          {/* Subtitle Font Family Selector */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-3">
              On-Screen Subtitle Font Family
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {fontOptions.map((f) => (
                <div
                  key={f.id}
                  onClick={() =>
                    onUpdateTypography({
                      subtitleFont: f.id,
                      subtitleFontSize: currentFontSize,
                      subtitleSyncMode: currentSyncMode,
                      subtitleHighlightColor: currentHighlightColor,
                      subtitlePosition: currentPosition,
                    })
                  }
                  className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    currentFont === f.id
                      ? 'bg-amber-400/10 border-amber-400 text-white ring-1 ring-amber-400/50'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-100">{f.name}</span>
                    <span className="text-[10px] text-neutral-500 font-mono">{f.category}</span>
                  </div>
                  <div
                    style={{ fontFamily: f.cssFamily }}
                    className="text-sm mt-2 text-neutral-200 line-clamp-1"
                  >
                    {f.sampleText}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Synchronization Mode */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-3">
              Script & Speech Sync Mode
            </label>
            <div className="space-y-2">
              {syncModes.map((m) => (
                <div
                  key={m.id}
                  onClick={() =>
                    onUpdateTypography({
                      subtitleFont: currentFont,
                      subtitleFontSize: currentFontSize,
                      subtitleSyncMode: m.id,
                      subtitleHighlightColor: currentHighlightColor,
                      subtitlePosition: currentPosition,
                    })
                  }
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    currentSyncMode === m.id
                      ? 'bg-amber-400/10 border-amber-400 text-white ring-1 ring-amber-400/40'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-neutral-200">{m.title}</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">{m.desc}</div>
                  </div>
                  {currentSyncMode === m.id && (
                    <span className="p-1 rounded-full bg-amber-400 text-neutral-950">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Highlight Color & Font Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Highlight Accent Color */}
            <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800">
              <label className="text-xs font-medium text-neutral-300 block mb-2.5">
                Spoken Word Accent Color
              </label>
              <div className="flex items-center gap-2">
                {colors.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() =>
                      onUpdateTypography({
                        subtitleFont: currentFont,
                        subtitleFontSize: currentFontSize,
                        subtitleSyncMode: currentSyncMode,
                        subtitleHighlightColor: c.hex,
                        subtitlePosition: currentPosition,
                      })
                    }
                    style={{ backgroundColor: c.hex }}
                    className={`w-7 h-7 rounded-full transition-transform cursor-pointer border ${
                      currentHighlightColor === c.hex
                        ? 'scale-110 ring-2 ring-white border-transparent'
                        : 'border-white/20 hover:scale-105'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Font Size Slider */}
            <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800">
              <div className="flex items-center justify-between text-xs text-neutral-300 mb-2">
                <span>Subtitle Size</span>
                <span className="font-mono text-amber-300 font-semibold">{currentFontSize}px</span>
              </div>
              <input
                type="range"
                min={18}
                max={36}
                value={currentFontSize}
                onChange={(e) =>
                  onUpdateTypography({
                    subtitleFont: currentFont,
                    subtitleFontSize: parseInt(e.target.value, 10),
                    subtitleSyncMode: currentSyncMode,
                    subtitleHighlightColor: currentHighlightColor,
                    subtitlePosition: currentPosition,
                  })
                }
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1">
                <span>18px (Compact)</span>
                <span>24px (Balanced)</span>
                <span>36px (Cinematic)</span>
              </div>
            </div>
          </div>

          {/* Subtitle Screen Position */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2.5">
              Screen Placement
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'lower-third', label: 'Lower-Third', desc: 'Standard documentary position' },
                { id: 'center', label: 'Center Cinematic', desc: 'Central dramatic focus' },
                { id: 'bottom-bar', label: 'Bottom Edge', desc: 'Flush baseline' },
              ].map((pos) => (
                <button
                  key={pos.id}
                  onClick={() =>
                    onUpdateTypography({
                      subtitleFont: currentFont,
                      subtitleFontSize: currentFontSize,
                      subtitleSyncMode: currentSyncMode,
                      subtitleHighlightColor: currentHighlightColor,
                      subtitlePosition: pos.id as SubtitlePosition,
                    })
                  }
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    currentPosition === pos.id
                      ? 'bg-amber-400/10 border-amber-400 text-white'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="text-xs font-bold text-neutral-200">{pos.label}</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">{pos.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-neutral-800 bg-neutral-950">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer shadow"
          >
            Apply Typography Settings
          </button>
        </div>
      </div>
    </div>
  );
};
