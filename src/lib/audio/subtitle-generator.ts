import type { TranscriptSegment, SubtitleFile } from './types';

function normalizeSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  if (!segments || segments.length === 0) return [];
  const MIN_DURATION = 0.02; // 20ms 避免 0 长度
  const SAFE_GAP = 0.02; // 相邻段最小间隔

  const sorted = [...segments].sort((a, b) => a.start - b.start);

  // 先做基本规范化：非负、保证 end >= start + MIN_DURATION
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const start = Math.max(0, Number.isFinite(s.start) ? s.start : 0);
    let end = Math.max(0, Number.isFinite(s.end) ? s.end : start);
    if (end < start + MIN_DURATION) end = start + MIN_DURATION;
    sorted[i] = { ...s, start, end, text: s.text ?? '' };
  }

  // 再次遍历，避免重叠：当前段的结束不超过下一段开始 - SAFE_GAP
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i];
    const next = sorted[i + 1];
    const maxEnd = Math.max(cur.start + MIN_DURATION, next.start - SAFE_GAP);
    if (cur.end > maxEnd) {
      sorted[i] = { ...cur, end: maxEnd };
    }
    // 确保下一段不早于当前段结束
    if (next.start < sorted[i].end) {
      const adjustedStart = Math.max(sorted[i].end + SAFE_GAP, next.start);
      const adjustedEnd = Math.max(adjustedStart + MIN_DURATION, next.end);
      sorted[i + 1] = { ...next, start: adjustedStart, end: adjustedEnd };
    }
  }

  return sorted;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis
    .toString()
    .padStart(3, '0')}`;
}

function formatTimeVTT(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis
    .toString()
    .padStart(3, '0')}`;
}

function formatTimeHHMMSS(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function generateSRT(segments: TranscriptSegment[]): string {
  const segs = normalizeSegments(segments);
  if (!segs.length) return '';

  return segs
    .map((segment, index) => {
      const startTime = formatTime(segment.start);
      const endTime = formatTime(segment.end);
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
    })
    .join('\n');
}

export function generateVTT(segments: TranscriptSegment[]): string {
  const segs = normalizeSegments(segments);
  if (!segs.length) return 'WEBVTT\n\n';

  const vttContent = segs
    .map((segment) => {
      const startTime = formatTimeVTT(segment.start);
      const endTime = formatTimeVTT(segment.end);
      return `${startTime} --> ${endTime}\n${segment.text}\n`;
    })
    .join('\n');

  return `WEBVTT\n\n${vttContent}`;
}

export function generateTXT(segments: TranscriptSegment[]): string {
  const segs = normalizeSegments(segments);
  if (!segs.length) return '';

  return segs
    .map((segment) => {
      const startTime = formatTimeHHMMSS(segment.start);
      const endTime = formatTimeHHMMSS(segment.end);
      return `[${startTime} - ${endTime}] ${segment.text}`;
    })
    .join('\n');
}

export function generateJSON(segments: TranscriptSegment[]): string {
  const segs = normalizeSegments(segments);
  const items = segs.map((segment) => ({
    start: formatTimeVTT(segment.start),
    end: formatTimeVTT(segment.end),
    text: segment.text,
  }));
  return JSON.stringify(items, null, 2);
}

export function generateSubtitleFiles(segments: TranscriptSegment[]): SubtitleFile[] {
  const segs = normalizeSegments(segments);
  if (!segs.length) return [];

  return [
    {
      format: 'srt',
      content: generateSRT(segs)
    },
    {
      format: 'vtt',
      content: generateVTT(segs)
    },
    {
      format: 'txt',
      content: generateTXT(segs)
    },
    {
      format: 'json',
      content: generateJSON(segs)
    }
  ];
}

export function downloadSubtitleFile(file: SubtitleFile, baseName: string = 'subtitles'): void {
  const mimeTypes: Record<string, string> = {
    srt: 'text/plain',
    vtt: 'text/vtt',
    txt: 'text/plain',
    json: 'application/json'
  };

  const blob = new Blob([file.content], { type: mimeTypes[file.format] || 'text/plain' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${baseName}.${file.format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}