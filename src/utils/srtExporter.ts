import { Scene } from '../types/video';

export function formatTimecode(seconds: number, includeHours = true, includeMillis = false): string {
  const totalMs = Math.max(0, Math.floor(seconds * 1000));
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);

  const pad = (n: number, len = 2) => String(n).padStart(len, '0');

  if (includeMillis) {
    return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
  }

  if (includeHours || h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

export function generateSrtContent(scenes: Scene[]): string {
  let currentTime = 0;
  const srtEntries: string[] = [];

  scenes.forEach((scene, index) => {
    const startSec = currentTime;
    const endSec = currentTime + scene.estimatedDurationSec;
    currentTime = endSec;

    const startFormatted = formatTimecode(startSec, true, true);
    const endFormatted = formatTimecode(endSec, true, true);

    const caption = scene.narrationText.trim() || scene.sceneTitle;

    srtEntries.push(
      `${index + 1}\n${startFormatted} --> ${endFormatted}\n[${scene.chapterTitle}] ${caption}\n`
    );
  });

  return srtEntries.join('\n');
}

export function downloadSrtFile(scenes: Scene[], fileName = 'video_subtitles.srt') {
  const srtText = generateSrtContent(scenes);
  const blob = new Blob([srtText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
