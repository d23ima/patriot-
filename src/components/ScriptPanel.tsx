import React, { useState } from 'react';
import { VideoProject, Scene } from '../types/video';
import { PRESET_PROJECTS } from '../utils/presets';
import {
  Sparkles,
  FileText,
  Clock,
  Gauge,
  Upload,
  RefreshCw,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

interface ScriptPanelProps {
  project: VideoProject;
  onUpdateProject: (updated: Partial<VideoProject>) => void;
  onGenerateScenesFromScript: (script: string, targetMinutes: number, wpm: number) => Promise<void>;
  isGenerating: boolean;
  onLoadPreset: (preset: VideoProject) => void;
}

export const ScriptPanel: React.FC<ScriptPanelProps> = ({
  project,
  onUpdateProject,
  onGenerateScenesFromScript,
  isGenerating,
  onLoadPreset,
}) => {
  const [scriptText, setScriptText] = useState(project.script);
  const [targetMin, setTargetMin] = useState(project.targetMinutes || 25);
  const [wpm, setWpm] = useState(project.wordsPerMinute || 135);

  const wordCount = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  const rawEstimatedSec = Math.round((wordCount / wpm) * 60);
  const rawEstimatedMin = Math.round(rawEstimatedSec / 60);
  const targetSec = targetMin * 60;

  // Recommended word target for 20-30 minute range
  const targetWords = targetMin * wpm;
  const pacingRatio = Math.min(1.5, wordCount / Math.max(1, targetWords));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setScriptText(content);
        onUpdateProject({ script: content });
      }
    };
    reader.readAsText(file);
  };

  const handleApplyScript = async () => {
    onUpdateProject({
      script: scriptText,
      targetMinutes: targetMin,
      wordsPerMinute: wpm,
    });
    await onGenerateScenesFromScript(scriptText, targetMin, wpm);
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-5xl mx-auto w-full space-y-6 overflow-y-auto">
      {/* Top Header & Presets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <span>Documentary Script & Pacing Studio</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Target a calibrated 20 to 30-minute long-form runtime with automated chapter breakdown and shot pacing.
          </p>
        </div>

        {/* Load Preset Scripts Dropdown */}
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-neutral-500" />
          <span className="text-xs text-neutral-400">Presets:</span>
          {PRESET_PROJECTS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onLoadPreset(p);
                setScriptText(p.script);
                setTargetMin(p.targetMinutes);
              }}
              className="text-xs px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              {p.targetMinutes}m Odyssey
            </button>
          ))}
        </div>
      </div>

      {/* Target Runtime & Pacing Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-neutral-900/80 border border-neutral-800">
        {/* Target Runtime Selector */}
        <div>
          <label className="text-xs font-medium text-neutral-400 flex items-center gap-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Target Video Runtime</span>
          </label>
          <div className="flex items-center gap-1.5">
            {[20, 22, 25, 28, 30].map((mins) => (
              <button
                key={mins}
                onClick={() => setTargetMin(mins)}
                className={`flex-1 py-1.5 text-xs font-mono rounded-lg border transition-all cursor-pointer ${
                  targetMin === mins
                    ? 'bg-amber-400 text-neutral-950 font-bold border-amber-400 shadow-sm'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
          <div className="text-[11px] text-neutral-500 font-mono mt-1.5">
            Exact: {targetMin * 60} seconds total duration
          </div>
        </div>

        {/* Reading Cadence / Speech Pace */}
        <div>
          <label className="text-xs font-medium text-neutral-400 flex items-center gap-1.5 mb-2">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span>Narration Pace (WPM)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={115}
              max={165}
              value={wpm}
              onChange={(e) => setWpm(parseInt(e.target.value, 10))}
              className="flex-1 accent-amber-400 cursor-pointer"
            />
            <span className="font-mono text-xs text-amber-300 font-bold w-12 text-right">
              {wpm}
            </span>
          </div>
          <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1">
            <span>120 (Reflective)</span>
            <span>135 (Doc Standard)</span>
            <span>160 (Brisk)</span>
          </div>
        </div>

        {/* Pacing Analytics Metric */}
        <div className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Word Count Target:</span>
            <span className="font-mono text-neutral-200">
              {wordCount.toLocaleString()} / ~{targetWords.toLocaleString()} words
            </span>
          </div>

          <div className="w-full bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-800 my-2">
            <div
              style={{ width: `${Math.min(100, (pacingRatio * 100))}%` }}
              className={`h-full transition-all ${
                pacingRatio >= 0.8 && pacingRatio <= 1.2
                  ? 'bg-emerald-500'
                  : 'bg-amber-400'
              }`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>Estimated Speech Time:</span>
            <span className="font-mono text-amber-400 font-semibold">
              {rawEstimatedMin} min ({Math.round(pacingRatio * 100)}% of {targetMin}m goal)
            </span>
          </div>
        </div>
      </div>

      {/* Main Script Textarea */}
      <div className="flex flex-col flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-neutral-300 flex items-center gap-2">
            <span>Full Script Content</span>
            <span className="text-xs font-normal text-neutral-500">
              (Use Markdown headers like # Chapter 1 or blank lines between paragraphs)
            </span>
          </label>

          <label className="text-xs flex items-center gap-1.5 px-3 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-300 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-neutral-400" />
            <span>Import .txt / .md</span>
            <input
              type="file"
              accept=".txt,.md,.doc"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        <textarea
          rows={14}
          value={scriptText}
          onChange={(e) => setScriptText(e.target.value)}
          placeholder={`Paste your long script or documentary outline here...

Chapter 1: The First Frontier
Deep space exploration represents humanity's longest ongoing pursuit...

Chapter 2: The Physical Instruments
Lenses, radiotelescopes, and spectrographs opened the invisible spectrum...`}
          className="w-full p-4 text-xs font-mono bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-100 focus:outline-none focus:border-amber-400 leading-relaxed resize-y"
        />
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-neutral-400">
          Clicking generate will calculate scene pacing, allocate visual pauses, and assign Ken Burns camera moves.
        </div>

        <button
          onClick={handleApplyScript}
          disabled={isGenerating || !scriptText.trim()}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-400 text-neutral-950 font-bold hover:bg-amber-300 active:scale-95 transition-all cursor-pointer shadow-md disabled:opacity-40"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing & Chapterizing ({targetMin}m)...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate {targetMin}-Minute Sequence</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
