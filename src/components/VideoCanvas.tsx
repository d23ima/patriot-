import React, { useEffect, useRef, useState } from 'react';
import {
  Scene,
  KenBurnsEffect,
  TransitionStyle,
  SubtitleFontFamily,
  SubtitleSyncMode,
  SubtitlePosition,
} from '../types/video';
import { formatTimecode } from '../utils/srtExporter';
import { Maximize2, Minimize2, Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface VideoCanvasProps {
  currentSecond: number;
  scenes: Scene[];
  isPlaying: boolean;
  onTogglePlay: () => void;
  aspectRatio?: '16:9' | '9:16';
  showSubtitles?: boolean;
  subtitleFont?: SubtitleFontFamily;
  subtitleFontSize?: number;
  subtitleSyncMode?: SubtitleSyncMode;
  subtitleHighlightColor?: string;
  subtitlePosition?: SubtitlePosition;
  showChapterCards?: boolean;
  showTimecodeOverlay?: boolean;
  onCanvasRef?: (canvas: HTMLCanvasElement | null) => void;
}

export const VideoCanvas: React.FC<VideoCanvasProps> = ({
  currentSecond,
  scenes,
  isPlaying,
  onTogglePlay,
  aspectRatio = '16:9',
  showSubtitles = true,
  subtitleFont = 'Playfair Display',
  subtitleFontSize = 24,
  subtitleSyncMode = 'karaoke-word',
  subtitleHighlightColor = '#fbbf24',
  subtitlePosition = 'lower-third',
  showChapterCards = true,
  showTimecodeOverlay = false,
  onCanvasRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Determine current active scene and time within scene
  let accumulatedTime = 0;
  let activeSceneIndex = 0;
  let timeInScene = 0;

  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    if (currentSecond >= accumulatedTime && currentSecond < accumulatedTime + s.estimatedDurationSec) {
      activeSceneIndex = i;
      timeInScene = currentSecond - accumulatedTime;
      break;
    }
    accumulatedTime += s.estimatedDurationSec;
    if (i === scenes.length - 1) {
      activeSceneIndex = i;
      timeInScene = s.estimatedDurationSec;
    }
  }

  const activeScene = scenes[activeSceneIndex] || scenes[0];
  const prevScene = activeSceneIndex > 0 ? scenes[activeSceneIndex - 1] : null;

  // Preload scene images
  useEffect(() => {
    scenes.forEach((s) => {
      if (s.imageUrl && !imageCacheRef.current.has(s.imageUrl)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = s.imageUrl;
        img.onload = () => {
          imageCacheRef.current.set(s.imageUrl, img);
        };
      }
    });
  }, [scenes]);

  // Main canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (onCanvasRef) {
      onCanvasRef(canvas);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = aspectRatio === '16:9' ? 1280 : 720;
    const height = aspectRatio === '16:9' ? 720 : 1280;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Clear background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    if (!activeScene) return;

    const sceneDuration = Math.max(1, activeScene.estimatedDurationSec);
    const progress = Math.max(0, Math.min(1, timeInScene / sceneDuration));

    const currentImg = imageCacheRef.current.get(activeScene.imageUrl);
    const prevImg = prevScene ? imageCacheRef.current.get(prevScene.imageUrl) : null;

    // Helper: Draw image with Ken Burns transform
    const drawKenBurns = (
      img: HTMLImageElement | null | undefined,
      effect: KenBurnsEffect,
      prog: number,
      alpha = 1.0
    ) => {
      ctx.save();
      ctx.globalAlpha = alpha;

      let scale = 1.1;
      let offsetX = 0;
      let offsetY = 0;

      // Easing curve: smooth cubic
      const ease = prog < 0.5 ? 2 * prog * prog : 1 - Math.pow(-2 * prog + 2, 2) / 2;

      switch (effect) {
        case 'zoom-in':
          scale = 1.05 + 0.22 * ease;
          break;
        case 'zoom-out':
          scale = 1.27 - 0.20 * ease;
          break;
        case 'pan-left':
          scale = 1.18;
          offsetX = (0.07 - 0.14 * ease) * width;
          break;
        case 'pan-right':
          scale = 1.18;
          offsetX = (-0.07 + 0.14 * ease) * width;
          break;
        case 'pan-top-down':
          scale = 1.2;
          offsetY = (-0.06 + 0.12 * ease) * height;
          break;
        case 'center-drift':
        default:
          scale = 1.08 + 0.08 * Math.sin(prog * Math.PI);
          offsetX = Math.sin(prog * Math.PI * 0.8) * (width * 0.02);
          break;
      }

      ctx.translate(width / 2 + offsetX, height / 2 + offsetY);
      ctx.scale(scale, scale);

      if (img && img.complete && img.naturalWidth > 0) {
        // Draw image keeping cover aspect ratio
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const canvasAspect = width / height;

        let drawW = width;
        let drawH = height;

        if (imgAspect > canvasAspect) {
          drawH = height;
          drawW = height * imgAspect;
        } else {
          drawW = width;
          drawH = width / imgAspect;
        }

        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        // Fallback procedural visual plate if image hasn't finished loading yet
        const grad = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
        grad.addColorStop(0, '#18181b');
        grad.addColorStop(0.5, '#27272a');
        grad.addColorStop(1, '#09090b');
        ctx.fillStyle = grad;
        ctx.fillRect(-width / 2, -height / 2, width, height);

        ctx.fillStyle = '#a1a1aa';
        ctx.font = '24px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(activeScene.sceneTitle || 'Cinematic Documentary Frame', 0, 0);
      }

      ctx.restore();
    };

    // Handle Transition during first 1.4 seconds of scene
    const transitionDuration = 1.4;
    const transitionStyle: TransitionStyle = activeScene.transition || 'crossfade';

    if (timeInScene < transitionDuration && prevScene && activeSceneIndex > 0) {
      const transProg = timeInScene / transitionDuration;

      if (transitionStyle === 'fade-black') {
        if (transProg < 0.5) {
          const fadeOut = 1 - transProg * 2;
          drawKenBurns(prevImg, prevScene.kenBurnsEffect, 1.0, fadeOut);
        } else {
          const fadeIn = (transProg - 0.5) * 2;
          drawKenBurns(currentImg, activeScene.kenBurnsEffect, progress, fadeIn);
        }
      } else if (transitionStyle === 'subtle-slide') {
        drawKenBurns(prevImg, prevScene.kenBurnsEffect, 1.0, 1 - transProg);
        ctx.save();
        ctx.translate((1 - transProg) * width * 0.15, 0);
        drawKenBurns(currentImg, activeScene.kenBurnsEffect, progress, transProg);
        ctx.restore();
      } else {
        // Default crossfade
        drawKenBurns(prevImg, prevScene.kenBurnsEffect, 1.0, 1 - transProg);
        drawKenBurns(currentImg, activeScene.kenBurnsEffect, progress, transProg);
      }
    } else {
      drawKenBurns(currentImg, activeScene.kenBurnsEffect, progress, 1.0);
    }

    // Measured contrast scrim at the bottom for subtitles and lower thirds
    const scrimHeight = height * 0.38;
    const scrimGrad = ctx.createLinearGradient(0, height - scrimHeight, 0, height);
    scrimGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    scrimGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.45)');
    scrimGrad.addColorStop(1, 'rgba(0, 0, 0, 0.90)');
    ctx.fillStyle = scrimGrad;
    ctx.fillRect(0, height - scrimHeight, width, scrimHeight);

    // Subtle top vignette scrim
    const topScrim = ctx.createLinearGradient(0, 0, 0, height * 0.18);
    topScrim.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    topScrim.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topScrim;
    ctx.fillRect(0, 0, width, height * 0.18);

    // Chapter Title Card (rendered in first 3.5 seconds of a chapter scene)
    const isChapterIntro = (activeSceneIndex === 0 || scenes[activeSceneIndex - 1]?.chapterNumber !== activeScene.chapterNumber) && timeInScene < 3.8;
    if (showChapterCards && isChapterIntro) {
      const cardAlpha = timeInScene < 0.6 ? timeInScene / 0.6 : timeInScene > 3.0 ? (3.8 - timeInScene) / 0.8 : 1.0;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, cardAlpha));

      // Quiet editorial chapter kicker
      ctx.fillStyle = '#fbbf24'; // amber-400
      ctx.font = '600 14px "JetBrains Mono", monospace';
      ctx.letterSpacing = '2px';
      ctx.textAlign = 'left';
      ctx.fillText(`CHAPTER ${activeScene.chapterNumber}`.toUpperCase(), 48, 56);

      // Chapter title
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '-0.5px';
      ctx.fillText(activeScene.chapterTitle, 48, 92);

      ctx.restore();
    }

    // Subtitle & Lower-Third Narrative Caption with Word-Level Audio Sync
    if (showSubtitles && activeScene.narrationText) {
      ctx.save();

      // Resolve Font Family from user selection
      const fontFamilies: Record<string, string> = {
        'Playfair Display': '"Playfair Display", Georgia, serif',
        'Cinzel': '"Cinzel", Trajan, serif',
        'Syne': '"Syne", "Plus Jakarta Sans", sans-serif',
        'Bricolage Grotesque': '"Bricolage Grotesque", "Plus Jakarta Sans", sans-serif',
        'Oswald': '"Oswald", Impact, sans-serif',
        'Plus Jakarta Sans': '"Plus Jakarta Sans", system-ui, sans-serif',
        'JetBrains Mono': '"JetBrains Mono", monospace',
        'Space Mono': '"Space Mono", monospace',
      };
      const chosenFont = fontFamilies[subtitleFont] || fontFamilies['Playfair Display'];
      const fontSize = subtitleFontSize || 24;

      // Topic / lower third kicker
      if (activeScene.subtitleHeadline) {
        ctx.fillStyle = subtitleHighlightColor || 'rgba(251, 191, 36, 0.9)';
        ctx.font = `600 13px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(activeScene.subtitleHeadline.toUpperCase(), width / 2, height - (subtitlePosition === 'center' ? height * 0.45 : 95));
      }

      // Configure Subtitle Font
      ctx.font = `600 ${fontSize}px ${chosenFont}`;
      const words = activeScene.narrationText.trim().split(/\s+/).filter(Boolean);
      const totalWords = words.length;

      // Word-level sync tracking: current spoken word index
      const currentWordIndex = Math.min(
        totalWords - 1,
        Math.floor((timeInScene / sceneDuration) * totalWords)
      );

      // Break words into wrapped lines
      const maxLineWidth = width * 0.84;
      const spaceWidth = ctx.measureText(' ').width;

      interface WordMeta {
        word: string;
        index: number;
        width: number;
      }
      interface LineMeta {
        words: WordMeta[];
        totalWidth: number;
      }

      const lines: LineMeta[] = [];
      let curLineWords: WordMeta[] = [];
      let curLineWidth = 0;

      words.forEach((w, idx) => {
        const wWidth = ctx.measureText(w).width;
        if (curLineWidth + wWidth + (curLineWords.length > 0 ? spaceWidth : 0) > maxLineWidth && curLineWords.length > 0) {
          lines.push({ words: curLineWords, totalWidth: curLineWidth });
          curLineWords = [{ word: w, index: idx, width: wWidth }];
          curLineWidth = wWidth;
        } else {
          curLineWidth += (curLineWords.length > 0 ? spaceWidth : 0) + wWidth;
          curLineWords.push({ word: w, index: idx, width: wWidth });
        }
      });
      if (curLineWords.length > 0) {
        lines.push({ words: curLineWords, totalWidth: curLineWidth });
      }

      // Identify which line contains the active word
      const activeLineIdx = lines.findIndex((l) =>
        l.words.some((wm) => wm.index === currentWordIndex)
      );

      // Determine lines to display based on mode
      let displayLines = lines;
      if (subtitleSyncMode === 'progressive-phrase' && lines.length > 2) {
        const startLine = Math.max(0, Math.min(lines.length - 2, activeLineIdx >= 0 ? activeLineIdx : 0));
        displayLines = lines.slice(startLine, startLine + 2);
      } else if (lines.length > 3) {
        const startLine = Math.max(0, Math.min(lines.length - 3, activeLineIdx >= 0 ? activeLineIdx - 1 : 0));
        displayLines = lines.slice(startLine, startLine + 3);
      }

      const lineHeight = fontSize * 1.42;
      let startY = height - 48 - (displayLines.length - 1) * lineHeight;
      if (subtitlePosition === 'center') {
        startY = (height / 2) - ((displayLines.length * lineHeight) / 2);
      } else if (subtitlePosition === 'bottom-bar') {
        startY = height - 28 - (displayLines.length - 1) * lineHeight;
      }

      // Draw each word with audio-synchronized highlighting
      displayLines.forEach((line, lIdx) => {
        let curX = (width - line.totalWidth) / 2;
        const lineY = startY + lIdx * lineHeight;

        line.words.forEach((wm) => {
          const isSpoken = wm.index < currentWordIndex;
          const isCurrent = wm.index === currentWordIndex;
          const isUpcoming = wm.index > currentWordIndex;

          ctx.save();
          if (subtitleSyncMode === 'karaoke-word') {
            if (isCurrent) {
              // Active currently spoken word: Vibrant glowing accent
              ctx.fillStyle = subtitleHighlightColor || '#fbbf24';
              ctx.shadowColor = subtitleHighlightColor || '#fbbf24';
              ctx.shadowBlur = 14;

              // Subtle backdrop glow pill for active word
              ctx.fillStyle = subtitleHighlightColor || '#fbbf24';
              ctx.fillText(wm.word, curX, lineY);
            } else if (isSpoken) {
              // Past spoken words: Bright crisp white
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
              ctx.shadowBlur = 6;
              ctx.fillText(wm.word, curX, lineY);
            } else {
              // Upcoming words: Softly dimmed for focus
              ctx.fillStyle = 'rgba(241, 245, 249, 0.40)';
              ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
              ctx.shadowBlur = 4;
              ctx.fillText(wm.word, curX, lineY);
            }
          } else {
            // Progressive / clean style
            if (wm.index === currentWordIndex) {
              ctx.fillStyle = subtitleHighlightColor || '#fbbf24';
            } else {
              ctx.fillStyle = isUpcoming ? 'rgba(255, 255, 255, 0.65)' : '#ffffff';
            }
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 6;
            ctx.fillText(wm.word, curX, lineY);
          }
          ctx.restore();

          curX += wm.width + spaceWidth;
        });
      });

      ctx.restore();
    }

    // Timecode & Scene Index Overlay
    if (showTimecodeOverlay) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(width - 170, 24, 146, 32);

      ctx.fillStyle = '#fbbf24';
      ctx.font = '500 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(formatTimecode(currentSecond, true, false), width - 97, 45);
      ctx.restore();
    }
  }, [
    currentSecond,
    scenes,
    activeScene,
    prevScene,
    timeInScene,
    activeSceneIndex,
    aspectRatio,
    showSubtitles,
    subtitleFont,
    subtitleFontSize,
    subtitleSyncMode,
    subtitleHighlightColor,
    subtitlePosition,
    showChapterCards,
    showTimecodeOverlay,
    onCanvasRef,
  ]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800 shadow-2xl group"
    >
      <div className={`w-full relative ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] max-w-sm'} bg-black flex items-center justify-center`}>
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain block"
        />

        {/* Quick Canvas Play/Pause Overlay Hit Target */}
        <button
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
          className="absolute inset-0 w-full h-full flex items-center justify-center cursor-pointer bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="w-14 h-14 rounded-full bg-neutral-950/80 border border-neutral-700/80 backdrop-blur-md flex items-center justify-center text-white shadow-xl hover:scale-105 transition-transform">
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5 text-amber-400" />}
          </div>
        </button>

        {/* Bottom Right Fullscreen Toggle */}
        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white backdrop-blur border border-neutral-700/60 transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Scene Info Banner on Hover */}
        <div className="absolute top-4 left-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
          <div className="px-3 py-1.5 rounded-lg bg-neutral-950/80 backdrop-blur border border-neutral-800 text-xs text-neutral-300 flex items-center gap-2">
            <span className="text-amber-400 font-mono">Ch. {activeScene?.chapterNumber || 1}</span>
            <span className="text-neutral-600">·</span>
            <span className="truncate max-w-xs">{activeScene?.sceneTitle || 'Scene'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
