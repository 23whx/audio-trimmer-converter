import { describe, expect, it } from 'vitest';
import { asSubtitleFiles, buildSrt, buildVtt } from '../subtitles';

describe('subtitle builders', () => {
  const segments = [
    { id: '1', text: 'Hello world', start: 0, end: 2, confidence: 0.9 },
    { id: '2', text: 'Audio trimming made easy', start: 2, end: 6.5, confidence: 0.8 },
  ];

  it('creates valid SRT output', () => {
    const srt = buildSrt(segments);
    expect(srt).toContain('1');
    expect(srt).toContain('00:00:00,000 --> 00:00:02,000');
    expect(srt).toContain('Hello world');
  });

  it('creates valid VTT output', () => {
    const vtt = buildVtt(segments);
    expect(vtt.startsWith('WEBVTT')).toBe(true);
    expect(vtt).toContain('00:00:00.000 --> 00:00:02.000');
  });

  it('returns both formats', () => {
    const files = asSubtitleFiles(segments);
    expect(files.map((f) => f.format)).toEqual(['srt', 'vtt']);
  });
});
