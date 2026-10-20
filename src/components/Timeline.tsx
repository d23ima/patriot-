import React, { useRef, useState } from 'react';
import { Scene } from '../types/video';
import { formatTimecode } from '../utils/srtExporter';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  FastForward,
  Plus,
  Scissors,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface TimelineProps {
  currentSecond: number;
  totalDurationSec: number;
  scenes: Scene[];
  selectedSceneId: string;
  isPlaying: boolean;
  playbackRate: number;
  onSeek: (seconds: number) => void;
  onTogglePlay: () => void;
  onSelectScene: (sceneId: string) => void;
  onChangePlaybackRate: (rate: number) => void;
  onAddScene: () => void;
  onDeleteScene: (sceneId: string) => void;
  onSplitScene: (sceneId: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  currentSecond,
  totalDurationSec,
  scenes,
  selectedSceneId,
  isPlaying,
  playbackRate,
  onSeek,
  onTogglePlay,
  onSelectScene,
  onChangePlaybackRate,
  onAddScene,
  onDeleteScene,
  onSplitScene,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1 = full fit, 2 = 2x, 4 = 4x

  // Calculate cumulative start time for each scene
  let accumulated = 0;
  const sceneTimeMap = scenes.map((s) => {
    const start = accumulated;
    accumulated += s.estimatedDurationSec;
    return {
      scene: s,
      start,
      end: accumulated,
      duration: s.estimatedDurationSec,
    };
  });

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSec = percentage * totalDurationSec;
    onSeek(targetSec);
  };

  const handleSkip = (deltaSeconds: number) => {
    const next = Math.max(0, Math.min(totalDurationSec, currentSecond + deltaSeconds));
    onSeek(next);
  };

  const handlePrevScene = () => {
    const currentIndex = scenes.findIndex((s) => s.id === selectedSceneId);
    if (currentIndex > 0) {
      const prev = sceneTimeMap[currentIndex - 1];
      onSelectScene(prev.scene.id);
      onSeek(prev.start);
    } else {
      onSeek(0);
    }
  };

  const handleNextScene = () => {
    const currentIndex = scenes.findIndex((s) => s.id === selectedSceneId);
    if (currentIndex >= 0 && currentIndex < scenes.length - 1) {
      const next = sceneTimeMap[currentIndex + 1];
      onSelectScene(next.scene.id);
      onSeek(next.start);
    }
  };

  const progressPercent = totalDurationSec > 0 ? (currentSecond / totalDurationSec) * 100 : 0;

  return (
    <div className="flex flex-col bg-neutral-900 border-t border-neutral-800 select-none">
      {/* Control Strip & Timecode Zone */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-neutral-800/80 bg-neutral-950/60 text-xs">
        {/* Left: Transport Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSkip(-15)}
            title="Rewind 15 seconds"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handlePrevScene}
            title="Previous Scene"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onTogglePlay}
            className="px-3 py-1.5 rounded-lg bg-amber-400 text-neutral-950 font-semibold hover:bg-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>
          <button
            onClick={handleNextScene}
            title="Next Scene"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSkip(15)}
            title="Forward 15 seconds"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <FastForward className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-neutral-800 mx-1" />

          {/* Review Speed Selector */}
          <div className="flex items-center gap-1 bg-neutral-900 rounded-lg p-0.5 border border-neutral-800">
            {[1, 1.5, 2, 4].map((rate) => (
              <button
                key={rate}
                onClick={() => onChangePlaybackRate(rate)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  playbackRate === rate
                    ? 'bg-neutral-700 text-amber-300 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Center: Running Master Timecode */}
        <div className="flex items-center gap-2 font-mono text-sm tracking-wide">
          <span className="text-amber-400 font-semibold tabular-nums">
            {formatTimecode(currentSecond, true, false)}
          </span>
          <span className="text-neutral-600">/</span>
          <span className="text-neutral-400 tabular-nums">
            {formatTimecode(totalDurationSec, true, false)}
          </span>
          <span className="text-neutral-500 text-xs ml-2">
            ({Math.round(totalDurationSec / 60)} min long-form)
          </span>
        </div>

        {/* Right: Scene Actions & Timeline Zoom */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSplitScene(selectedSceneId)}
            title="Split selected scene into two at playhead"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 transition-colors cursor-pointer border border-neutral-700/50"
          >
            <Scissors className="w-3 h-3 text-neutral-400" />
            <span>Split Shot</span>
          </button>
          <button
            onClick={onAddScene}
            title="Append new scene to timeline"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 transition-colors cursor-pointer border border-neutral-700/50"
          >
            <Plus className="w-3 h-3 text-amber-400" />
            <span>Add Shot</span>
          </button>
          {scenes.length > 1 && (
            <button
              onClick={() => onDeleteScene(selectedSceneId)}
              title="Delete selected scene"
              className="p-1 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="h-4 w-px bg-neutral-800 mx-1" />

          {/* Zoom controls */}
          <button
            onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
            disabled={zoomLevel <= 1}
            title="Zoom out timeline"
            className="p-1 rounded text-neutral-400 hover:text-neutral-200 disabled:opacity-30 cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] text-neutral-400">{zoomLevel}x</span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(4, z + 0.5))}
            disabled={zoomLevel >= 4}
            title="Zoom in timeline"
            className="p-1 rounded text-neutral-400 hover:text-neutral-200 disabled:opacity-30 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Timeline Track Scroller */}
      <div className="overflow-x-auto p-4 bg-neutral-950/80">
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          style={{ width: `${zoomLevel * 100}%`, minWidth: '100%' }}
          className="relative h-28 bg-neutral-900 rounded-lg border border-neutral-800 cursor-pointer overflow-hidden group shadow-inner"
        >
          {/* Timeline Time Ruler Markers */}
          <div className="absolute top-0 inset-x-0 h-5 bg-neutral-950/80 border-b border-neutral-800/80 flex items-center justify-between px-2 text-[10px] font-mono text-neutral-500 pointer-events-none">
            <span>00:00</span>
            <span>05:00</span>
            <span>10:00</span>
            <span>15:00</span>
            <span>20:00</span>
            <span>25:00</span>
            <span>30:00</span>
          </div>

          {/* Scene Blocks Container */}
          <div className="absolute inset-x-0 top-5 bottom-0 flex">
            {sceneTimeMap.map(({ scene, start, end, duration }, idx) => {
              const widthPct = (duration / totalDurationSec) * 100;
              const isSelected = scene.id === selectedSceneId;
              const isCurrent = currentSecond >= start && currentSecond < end;

              // Chapter color accents
              const chapterHues = [
                'border-amber-500/40 bg-amber-500/10',
                'border-blue-500/40 bg-blue-500/10',
                'border-emerald-500/40 bg-emerald-500/10',
                'border-purple-500/40 bg-purple-500/10',
                'border-rose-500/40 bg-rose-500/10',
              ];
              const hueClass = chapterHues[(scene.chapterNumber - 1) % chapterHues.length];

              return (
                <div
                  key={scene.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectScene(scene.id);
                    onSeek(start);
                  }}
                  style={{ width: `${widthPct}%` }}
                  className={`relative h-full border-r border-neutral-800/90 flex flex-col justify-between p-1.5 transition-all overflow-hidden ${
                    isSelected
                      ? 'ring-2 ring-amber-400 bg-amber-400/20 z-10'
                      : isCurrent
                      ? 'bg-neutral-800/90'
                      : 'hover:bg-neutral-800/50'
                  } ${hueClass}`}
                >
                  {/* Top info in scene block */}
                  <div className="flex items-center justify-between text-[11px] leading-tight text-neutral-300 font-medium">
                    <span className="truncate font-mono text-neutral-400">
                      #{idx + 1}
                    </span>
                    <span className="font-mono text-[10px] text-amber-300/90 tabular-nums">
                      {duration}s
                    </span>
                  </div>

                  {/* Scene Title / Narration snippet */}
                  <div className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
                    {scene.sceneTitle || scene.narrationText}
                  </div>

                  {/* Bottom Thumbnail preview & Ken Burns badge */}
                  <div className="flex items-center justify-between mt-1 text-[9px] text-neutral-400">
                    <span className="truncate max-w-[80px] bg-black/40 px-1 py-0.5 rounded">
                      Ch.{scene.chapterNumber}
                    </span>
                    <span className="font-mono text-neutral-500 uppercase">
                      {scene.kenBurnsEffect.replace('pan-', '').replace('center-', '')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Running Red Playhead Cursor */}
          <div
            style={{ left: `${progressPercent}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-30 pointer-events-none shadow-[0_0_8px_rgba(251,191,36,0.8)]"
          >
            <div className="w-3 h-3 bg-amber-400 -translate-x-[5px] -translate-y-0.5 rotate-45 shadow" />
          </div>
        </div>
      </div>
    </div>
  );
};
