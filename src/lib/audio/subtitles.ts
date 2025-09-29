import type { SubtitleFile, TranscriptSegment } from './types';

function normalizeSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  if (!segments || segments.length === 0) return [];
  const MIN_DURATION = 0.02;
  const SAFE_GAP = 0.02;
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const start = Math.max(0, Number.isFinite(s.start) ? s.start : 0);
    let end = Math.max(0, Number.isFinite(s.end) ? s.end : start);
    if (end < start + MIN_DURATION) end = start + MIN_DURATION;
    sorted[i] = { ...s, start, end, text: s.text ?? '' };
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i];
    const next = sorted[i + 1];
    const maxEnd = Math.max(cur.start + MIN_DURATION, next.start - SAFE_GAP);
    if (cur.end > maxEnd) sorted[i] = { ...cur, end: maxEnd };
    if (next.start < sorted[i].end) {
      const adjustedStart = Math.max(sorted[i].end + SAFE_GAP, next.start);
      const adjustedEnd = Math.max(adjustedStart + MIN_DURATION, next.end);
      sorted[i + 1] = { ...next, start: adjustedStart, end: adjustedEnd };
    }
  }
  return sorted;
}

function formatTimeSrt(seconds: number): string {
  const date = new Date(Math.max(seconds, 0) * 1000);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const secs = String(date.getUTCSeconds()).padStart(2, '0');
  const millis = String(date.getUTCMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${secs},${millis}`;
}

function formatTimeVtt(seconds: number): string {
  const date = new Date(Math.max(seconds, 0) * 1000);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const secs = String(date.getUTCSeconds()).padStart(2, '0');
  const millis = String(date.getUTCMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${secs}.${millis}`;
}

export function buildSrt(segments: TranscriptSegment[]): string {
  const segs = normalizeSegments(segments);
  return segs
    .map((segment, index) => {
      const start = formatTimeSrt(segment.start);
      const end = formatTimeSrt(segment.end);
      return `${index + 1}\n${start} --> ${end}\n${segment.text}\n`;
    })
    .join('\n');
}

export function buildVtt(segments: TranscriptSegment[]): string {
  const cues = normalizeSegments(segments)
    .map((segment) => {
      const start = formatTimeVtt(segment.start);
      const end = formatTimeVtt(segment.end);
      return `${start} --> ${end}\n${segment.text}`;
    })
    .join('\n\n');
  return `WEBVTT\n\n${cues}`;
}

export function asSubtitleFiles(segments: TranscriptSegment[]): SubtitleFile[] {
  return [
    { format: 'srt', content: buildSrt(segments) },
    { format: 'vtt', content: buildVtt(segments) },
  ];
}
