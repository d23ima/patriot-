/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VideoProject, Scene, AmbientSoundtrack } from './types/video';
import { PRESET_PROJECTS, STOCK_DOCUMENTARY_IMAGES } from './utils/presets';
import { audioEngine } from './utils/audioSynthesizer';
import { TopNav } from './components/TopNav';
import { VideoCanvas } from './components/VideoCanvas';
import { Timeline } from './components/Timeline';
import { SceneInspector } from './components/SceneInspector';
import { ScriptPanel } from './components/ScriptPanel';
import { MediaBin } from './components/MediaBin';
import { ExportModal } from './components/ExportModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { TypographyModal } from './components/TypographyModal';
import {
  SlidersHorizontal,
  Layers,
  Sparkles,
  Volume2,
  VolumeX,
  Type,
  Maximize2,
  RotateCcw,
  AlignLeft,
  Settings,
} from 'lucide-react';

export default function App() {
  const [project, setProject] = useState<VideoProject>(PRESET_PROJECTS[0]);
  const [currentSecond, setCurrentSecond] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    PRESET_PROJECTS[0].scenes[0]?.id || 'scene_1'
  );
  const [activeTab, setActiveTab] = useState<'studio' | 'script' | 'media'>('studio');
  const [userImages, setUserImages] = useState<{ id: string; title: string; url: string }[]>([]);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState<boolean>(false);
  const [isTypographyOpen, setIsTypographyOpen] = useState<boolean>(false);
  const [showLivePrompter, setShowLivePrompter] = useState<boolean>(true);
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const animationFrameRef = useRef<number | null>(null);

  const totalDurationSec = project.scenes.reduce(
    (acc, s) => acc + s.estimatedDurationSec,
    0
  );

  const selectedScene =
    project.scenes.find((s) => s.id === selectedSceneId) || project.scenes[0];
  const selectedSceneIndex = project.scenes.findIndex((s) => s.id === selectedSceneId);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audioEngine.stopMusic();
      return;
    }

    lastTimeRef.current = performance.now();
    audioEngine.init();
    if (!isMuted) {
      audioEngine.playTrack(project.soundtrack);
    }

    const tick = (now: number) => {
      const deltaSec = ((now - lastTimeRef.current) / 1000) * playbackRate;
      lastTimeRef.current = now;

      setCurrentSecond((prev) => {
        const next = prev + deltaSec;
        if (next >= totalDurationSec) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackRate, totalDurationSec, isMuted, project.soundtrack]);

  // Keyboard transport controls (Spacebar, Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return; // Don't intercept typing in inputs
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentSecond((s) => Math.max(0, s - 10));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentSecond((s) => Math.min(totalDurationSec, s + 10));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalDurationSec]);

  // Keep selectedSceneId in sync with playhead during playback
  useEffect(() => {
    let acc = 0;
    for (let i = 0; i < project.scenes.length; i++) {
      const s = project.scenes[i];
      if (currentSecond >= acc && currentSecond < acc + s.estimatedDurationSec) {
        if (s.id !== selectedSceneId && isPlaying) {
          setSelectedSceneId(s.id);
        }
        break;
      }
      acc += s.estimatedDurationSec;
    }
  }, [currentSecond, project.scenes, selectedSceneId, isPlaying]);

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleSeek = (seconds: number) => {
    setCurrentSecond(Math.max(0, Math.min(totalDurationSec, seconds)));
  };

  const handleUpdateScene = (updated: Scene) => {
    setProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => (s.id === updated.id ? updated : s)),
    }));
  };

  const handleAddScene = () => {
    const newId = `scene_${Date.now()}`;
    const lastScene = project.scenes[project.scenes.length - 1];
    const newScene: Scene = {
      id: newId,
      chapterNumber: lastScene?.chapterNumber || 1,
      chapterTitle: lastScene?.chapterTitle || 'Chapter 1: The Origin',
      sceneTitle: `Shot ${project.scenes.length + 1}`,
      narrationText: 'New narrative shot description.',
      estimatedDurationSec: 30,
      kenBurnsEffect: 'zoom-in',
      transition: 'crossfade',
      imageUrl: STOCK_DOCUMENTARY_IMAGES[0].url,
      subtitleHeadline: 'CONTINUED NARRATIVE EXPLORATION',
    };
    setProject((prev) => ({
      ...prev,
      scenes: [...prev.scenes, newScene],
    }));
    setSelectedSceneId(newId);
  };

  const handleDeleteScene = (sceneId: string) => {
    if (project.scenes.length <= 1) return;
    const remaining = project.scenes.filter((s) => s.id !== sceneId);
    setProject((prev) => ({
      ...prev,
      scenes: remaining,
    }));
    setSelectedSceneId(remaining[0].id);
  };

  const handleSplitScene = (sceneId: string) => {
    const idx = project.scenes.findIndex((s) => s.id === sceneId);
    if (idx === -1) return;
    const target = project.scenes[idx];
    const half = Math.max(10, Math.round(target.estimatedDurationSec / 2));

    const updatedCurrent: Scene = {
      ...target,
      estimatedDurationSec: half,
    };
    const newPart: Scene = {
      ...target,
      id: `scene_${Date.now()}`,
      sceneTitle: `${target.sceneTitle} (Part 2)`,
      estimatedDurationSec: half,
      kenBurnsEffect: target.kenBurnsEffect === 'zoom-in' ? 'zoom-out' : 'zoom-in',
    };

    const newScenes = [...project.scenes];
    newScenes.splice(idx, 1, updatedCurrent, newPart);

    setProject((prev) => ({
      ...prev,
      scenes: newScenes,
    }));
    setSelectedSceneId(newPart.id);
  };

  const handleAutoDistributeImages = (
    images: { id: string; title: string; url: string }[]
  ) => {
    if (images.length === 0) return;
    setProject((prev) => {
      const updatedScenes = prev.scenes.map((scene, i) => {
        const assignedImg = images[i % images.length];
        return {
          ...scene,
          imageUrl: assignedImg.url,
        };
      });
      return {
        ...prev,
        scenes: updatedScenes,
      };
    });
  };

  const handleGenerateScenesFromScript = async (
    script: string,
    targetMin: number,
    wpm: number
  ) => {
    setIsGeneratingScript(true);
    try {
      const res = await fetch('/api/gemini/parse-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          targetMinutes: targetMin,
          wordsPerMinute: wpm,
        }),
      });
      const data = await res.json();
      if (data.scenes && data.scenes.length > 0) {
        // Map images to newly generated scenes
        const availableImgList = [...userImages, ...STOCK_DOCUMENTARY_IMAGES];
        const hydratedScenes: Scene[] = data.scenes.map((s: any, idx: number) => ({
          ...s,
          imageUrl: availableImgList[idx % availableImgList.length].url,
        }));

        setProject((prev) => ({
          ...prev,
          script,
          targetMinutes: targetMin,
          wordsPerMinute: wpm,
          scenes: hydratedScenes,
        }));
        setSelectedSceneId(hydratedScenes[0].id);
        setCurrentSecond(0);
        setActiveTab('studio');
      }
    } catch (err) {
      console.error('Error generating scenes:', err);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      {/* Top Bar adhering to Top Bar Contract */}
      <TopNav
        onOpenExport={() => setIsExportOpen(true)}
        onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
        onOpenTypography={() => setIsTypographyOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        targetMinutes={project.targetMinutes}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 flex overflow-hidden relative">
        {activeTab === 'studio' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Upper Workstation Split: Canvas Preview + Scene Inspector */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden border-b border-neutral-800">
              {/* Canvas Viewport Center */}
              <div className="flex-1 flex flex-col p-4 md:p-6 bg-neutral-950/70 overflow-hidden justify-center items-center">
                {/* Secondary Canvas Controls Strip */}
                <div className="w-full max-w-4xl flex items-center justify-between mb-3 text-xs text-neutral-400">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-neutral-200 truncate">
                      {project.title}
                    </span>
                    <span className="text-neutral-600">·</span>
                    <span className="font-mono text-amber-400">
                      {Math.round(totalDurationSec / 60)}m Timeline
                    </span>
                    <span className="text-neutral-600">·</span>
                    <span className="text-neutral-400">
                      {project.scenes.length} Scenes
                    </span>
                  </div>

                  {/* Overlays Toggle */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsTypographyOpen(true)}
                      className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-amber-300 font-medium"
                      title="Select Subtitle Font & Synchronization Mode"
                    >
                      <Type className="w-3.5 h-3.5 text-amber-400" />
                      <span>Font: {project.subtitleFont}</span>
                    </button>
                    <button
                      onClick={() =>
                        setProject((prev) => ({
                          ...prev,
                          showSubtitles: !prev.showSubtitles,
                        }))
                      }
                      className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1 ${
                        project.showSubtitles ? 'text-amber-400 font-medium' : 'text-neutral-500'
                      }`}
                      title="Toggle On-screen Subtitles"
                    >
                      <span>Subtitles</span>
                    </button>
                    <button
                      onClick={() =>
                        setProject((prev) => ({
                          ...prev,
                          showChapterCards: !prev.showChapterCards,
                        }))
                      }
                      className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1 ${
                        project.showChapterCards ? 'text-amber-400 font-medium' : 'text-neutral-500'
                      }`}
                      title="Toggle Chapter Intro Banners"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Chapters</span>
                    </button>
                    <button
                      onClick={() => setIsMuted((m) => !m)}
                      className="hover:text-white transition-colors cursor-pointer text-neutral-400"
                      title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-neutral-300" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 16:9 Canvas Player */}
                <div className="w-full max-w-4xl">
                  <VideoCanvas
                    currentSecond={currentSecond}
                    scenes={project.scenes}
                    isPlaying={isPlaying}
                    onTogglePlay={handleTogglePlay}
                    aspectRatio={project.aspectRatio}
                    showSubtitles={project.showSubtitles}
                    subtitleFont={project.subtitleFont}
                    subtitleFontSize={project.subtitleFontSize}
                    subtitleSyncMode={project.subtitleSyncMode}
                    subtitleHighlightColor={project.subtitleHighlightColor}
                    subtitlePosition={project.subtitlePosition}
                    showChapterCards={project.showChapterCards}
                    showTimecodeOverlay={project.showTimecodeOverlay}
                    onCanvasRef={(c) => {
                      canvasRef.current = c;
                    }}
                  />
                </div>

                {/* Live Synchronized Script Teleprompter Card */}
                {selectedScene && (
                  <div className="w-full max-w-4xl mt-3 p-3 bg-neutral-900/90 rounded-xl border border-neutral-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 max-w-[82%]">
                      <AlignLeft className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="truncate text-neutral-300">
                        <span className="font-semibold text-white mr-1.5">Live Sync:</span>
                        <span className="text-neutral-400 italic font-mono text-[11px] mr-2">
                          [{project.voiceTone.replace('-', ' ')}]
                        </span>
                        <span>{selectedScene.narrationText}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsTypographyOpen(true)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-mono flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-950 border border-neutral-800 cursor-pointer whitespace-nowrap"
                    >
                      <span>Sync: {project.subtitleSyncMode}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Side Scene Inspector Panel */}
              {selectedScene && (
                <div className="w-full lg:w-96 h-auto lg:h-full shrink-0">
                  <SceneInspector
                    scene={selectedScene}
                    sceneIndex={selectedSceneIndex}
                    totalScenes={project.scenes.length}
                    availableImages={[...userImages, ...STOCK_DOCUMENTARY_IMAGES]}
                    onUpdateScene={handleUpdateScene}
                    voiceName={project.voiceName}
                    voiceTone={project.voiceTone}
                    voiceToneCustomPrompt={project.voiceToneCustomPrompt}
                    audioPostEffect={project.audioPostEffect}
                  />
                </div>
              )}
            </div>

            {/* Bottom 20-30 Minute Master Timeline */}
            <Timeline
              currentSecond={currentSecond}
              totalDurationSec={totalDurationSec}
              scenes={project.scenes}
              selectedSceneId={selectedSceneId}
              isPlaying={isPlaying}
              playbackRate={playbackRate}
              onSeek={handleSeek}
              onTogglePlay={handleTogglePlay}
              onSelectScene={(id) => setSelectedSceneId(id)}
              onChangePlaybackRate={(r) => setPlaybackRate(r)}
              onAddScene={handleAddScene}
              onDeleteScene={handleDeleteScene}
              onSplitScene={handleSplitScene}
            />
          </div>
        )}

        {/* Script & Pacing Studio Tab */}
        {activeTab === 'script' && (
          <ScriptPanel
            project={project}
            onUpdateProject={(up) => setProject((prev) => ({ ...prev, ...up }))}
            onGenerateScenesFromScript={handleGenerateScenesFromScript}
            isGenerating={isGeneratingScript}
            onLoadPreset={(p) => {
              setProject(p);
              setSelectedSceneId(p.scenes[0].id);
              setCurrentSecond(0);
            }}
          />
        )}

        {/* Media Asset Bin Tab */}
        {activeTab === 'media' && (
          <MediaBin
            userImages={userImages}
            onAddUserImages={(imgs) => setUserImages((prev) => [...prev, ...imgs])}
            onRemoveImage={(id) =>
              setUserImages((prev) => prev.filter((u) => u.id !== id))
            }
            onDistributeImagesToScenes={handleAutoDistributeImages}
            selectedSceneImageUrl={selectedScene?.imageUrl}
            onAssignToSelectedScene={(url) => {
              if (selectedScene) {
                handleUpdateScene({ ...selectedScene, imageUrl: url });
              }
            }}
          />
        )}
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        project={project}
        canvasElement={canvasRef.current}
      />

      {/* Audio Settings Modal */}
      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
        currentSoundtrack={project.soundtrack}
        soundtrackVolume={project.soundtrackVolume}
        voiceName={project.voiceName}
        voiceTone={project.voiceTone}
        voiceToneCustomPrompt={project.voiceToneCustomPrompt}
        audioPostEffect={project.audioPostEffect}
        onUpdateAudio={(settings) => {
          setProject((prev) => ({
            ...prev,
            ...settings,
          }));
        }}
      />

      {/* Typography & Subtitle Synchronization Modal */}
      <TypographyModal
        isOpen={isTypographyOpen}
        onClose={() => setIsTypographyOpen(false)}
        currentFont={project.subtitleFont}
        currentFontSize={project.subtitleFontSize}
        currentSyncMode={project.subtitleSyncMode}
        currentHighlightColor={project.subtitleHighlightColor}
        currentPosition={project.subtitlePosition}
        onUpdateTypography={(typo) => {
          setProject((prev) => ({
            ...prev,
            ...typo,
          }));
        }}
      />
    </div>
  );
}
