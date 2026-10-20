import React, { useState, useRef, useEffect } from 'react';
import { Scene, VideoProject } from '../types/video';
import { formatTimecode, downloadSrtFile, generateSrtContent } from '../utils/srtExporter';
import { audioEngine } from '../utils/audioSynthesizer';
import {
  X,
  Download,
  Film,
  FileText,
  Save,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Play,
  Square,
  Sparkles,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: VideoProject;
  canvasElement: HTMLCanvasElement | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  canvasElement,
}) => {
  if (!isOpen) return null;

  const [exportMode, setExportMode] = useState<'full' | 'preview_teaser'>('full');
  const [isRecording, setIsRecording] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0); // 0 to 100
  const [currentRenderSec, setCurrentRenderSec] = useState(0);
  const [downloadBlobUrl, setDownloadBlobUrl] = useState<string | null>(null);
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(0);
  const [recordedMimeType, setRecordedMimeType] = useState<string>('video/webm');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const totalProjectSec = project.scenes.reduce(
    (acc, s) => acc + s.estimatedDurationSec,
    0
  );
  // If preview teaser mode is selected, record first 60 seconds or full
  const targetRenderSec = exportMode === 'preview_teaser' ? Math.min(60, totalProjectSec) : totalProjectSec;

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      if (downloadBlobUrl) {
        URL.revokeObjectURL(downloadBlobUrl);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [downloadBlobUrl]);

  const handleStartExport = async () => {
    if (!canvasElement) {
      alert('Video canvas is not initialized yet. Please wait a moment.');
      return;
    }

    chunksRef.current = [];
    setDownloadBlobUrl(null);
    setIsRecording(true);
    setRenderProgress(0);
    setCurrentRenderSec(0);

    // Audio setup
    audioEngine.init();
    audioEngine.playTrack(project.soundtrack);

    // Combine canvas video stream + Web Audio stream
    const canvasStream = canvasElement.captureStream(30);
    const audioStream = audioEngine.getMediaStream();

    const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
    if (audioStream) {
      combinedTracks.push(...audioStream.getAudioTracks());
    }
    const combinedStream = new MediaStream(combinedTracks);

    // Check supported MIME type
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
    setRecordedMimeType(mimeType);

    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 6000000, // 6 Mbps high quality
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      audioEngine.stopMusic();
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setDownloadBlobUrl(url);
      setFileSizeBytes(blob.size);
      setIsRecording(false);
      setRenderProgress(100);
    };

    mediaRecorderRef.current = recorder;
    recorder.start(1000); // 1-second chunks

    const startTime = performance.now();

    // Loop until targetRenderSec reached
    const checkProgress = () => {
      const elapsedSec = (performance.now() - startTime) / 1000;
      setCurrentRenderSec(elapsedSec);
      const prog = Math.min(100, (elapsedSec / targetRenderSec) * 100);
      setRenderProgress(prog);

      if (elapsedSec >= targetRenderSec) {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      } else {
        animationFrameRef.current = requestAnimationFrame(checkProgress);
      }
    };

    animationFrameRef.current = requestAnimationFrame(checkProgress);
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    audioEngine.stopMusic();
    setIsRecording(false);
  };

  // Export Project JSON
  const handleExportProjectJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${project.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_project.json`);
    dlAnchor.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <Film className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">Video Exporter & Master Delivery</h3>
              <p className="text-xs text-neutral-400">
                {project.title} · {Math.round(totalProjectSec / 60)} minutes total runtime
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isRecording) handleStopRecording();
              onClose();
            }}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Export Mode Selection */}
          {!isRecording && !downloadBlobUrl && (
            <div>
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2.5">
                Select Render Scope
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setExportMode('full')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    exportMode === 'full'
                      ? 'bg-amber-400/10 border-amber-400 text-white ring-1 ring-amber-400/50'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="text-xs font-bold text-neutral-100 flex items-center justify-between">
                    <span>Full Long-Form Video</span>
                    <span className="font-mono text-amber-400">{Math.round(totalProjectSec / 60)} min</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Records the full calibrated {Math.round(totalProjectSec / 60)}-minute documentary with all {project.scenes.length} scenes.
                  </p>
                </div>

                <div
                  onClick={() => setExportMode('preview_teaser')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    exportMode === 'preview_teaser'
                      ? 'bg-amber-400/10 border-amber-400 text-white ring-1 ring-amber-400/50'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="text-xs font-bold text-neutral-100 flex items-center justify-between">
                    <span>60-Second Teaser Preview</span>
                    <span className="font-mono text-amber-400">01:00</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Fast test encode of the introductory opening sequence to verify resolution and audio sync.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Active Encoding Progress State */}
          {isRecording && (
            <div className="p-5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                  <span className="text-xs font-bold text-white">
                    Encoding Video Stream (30 FPS)...
                  </span>
                </div>
                <span className="font-mono text-xs text-amber-300 font-semibold tabular-nums">
                  {formatTimecode(currentRenderSec, false)} / {formatTimecode(targetRenderSec, false)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-neutral-900 rounded-full h-3 overflow-hidden border border-neutral-800">
                <div
                  style={{ width: `${renderProgress}%` }}
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-200"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span>Progress: {Math.round(renderProgress)}%</span>
                <span>Bitrate: 6.0 Mbps WebM VP9</span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleStopRecording}
                  className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-rose-400 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop & Finalize File</span>
                </button>
              </div>
            </div>
          )}

          {/* Completed Download State */}
          {downloadBlobUrl && (
            <div className="p-5 bg-neutral-950 rounded-xl border border-amber-400/40 space-y-4">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-bold text-white">Video Ready for Download!</span>
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-300 font-mono bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                <span>Format: {recordedMimeType}</span>
                <span>Size: {(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                <span>Duration: {formatTimecode(currentRenderSec, false)}</span>
              </div>

              <a
                href={downloadBlobUrl}
                download={`${project.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_master.webm`}
                className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-400/20"
              >
                <Download className="w-4 h-4" />
                <span>Download Master Video (.webm)</span>
              </a>
            </div>
          )}

          {/* Subtitles & Project Backup Row */}
          <div className="p-4 bg-neutral-950/70 rounded-xl border border-neutral-800 space-y-3">
            <span className="text-xs font-semibold text-neutral-300 block">
              Additional Production Deliverables
            </span>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() =>
                  downloadSrtFile(
                    project.scenes,
                    `${project.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_subtitles.srt`
                  )
                }
                className="flex-1 py-2 px-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs font-medium text-neutral-200 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Download SubRip (.SRT)</span>
              </button>

              <button
                onClick={handleExportProjectJson}
                className="flex-1 py-2 px-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs font-medium text-neutral-200 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Save className="w-3.5 h-3.5 text-amber-400" />
                <span>Save Project File (.json)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950">
          <div className="text-xs text-neutral-500">
            Rendered at 1280x720 30fps with synchronized Web Audio soundbed.
          </div>

          {!isRecording && !downloadBlobUrl && (
            <button
              onClick={handleStartExport}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-400 text-neutral-950 font-bold hover:bg-amber-300 active:scale-95 transition-all cursor-pointer shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Rendering Video</span>
            </button>
          )}

          {downloadBlobUrl && (
            <button
              onClick={() => {
                setDownloadBlobUrl(null);
                setRenderProgress(0);
              }}
              className="text-xs text-neutral-400 hover:text-white cursor-pointer"
            >
              Render Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
