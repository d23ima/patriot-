import React from 'react';
import { Film, Download, Sparkles, Sliders, Music } from 'lucide-react';

interface TopNavProps {
  onOpenExport: () => void;
  onOpenAudioSettings: () => void;
  onOpenTypography: () => void;
  activeTab: 'studio' | 'script' | 'media';
  setActiveTab: (tab: 'studio' | 'script' | 'media') => void;
  targetMinutes: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenExport,
  onOpenAudioSettings,
  onOpenTypography,
  activeTab,
  setActiveTab,
  targetMinutes,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <a href="/" className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-neutral-100 whitespace-nowrap shrink-0 hover:text-white transition-colors">
        <Film className="w-5 h-5 text-amber-400" />
        <span>Chronicle30 Studio</span>
      </a>

      {/* Zone 2: 4-5 concise single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-400">
        <button
          onClick={() => setActiveTab('studio')}
          className={`hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'studio' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Timeline & Canvas
        </button>
        <button
          onClick={() => setActiveTab('script')}
          className={`hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'script' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Script & Pacing
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'media' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Image Asset Bin
        </button>
        <button
          onClick={onOpenAudioSettings}
          className="hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Music className="w-4 h-4 text-neutral-500" />
          <span>Audio & Voice</span>
        </button>
        <button
          onClick={onOpenTypography}
          className="hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <span>Typography & Fonts</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenExport}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 rounded-lg hover:bg-amber-300 active:scale-95 transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-sm shadow-amber-400/20"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export {targetMinutes}m Video</span>
        </button>
      </div>
    </header>
  );
};
