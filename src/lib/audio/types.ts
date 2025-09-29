export interface AudioSegment {
  id: string;
  start: number;
  end: number;
  fileName: string;
  format: string;
  data: Uint8Array;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface SubtitleFile {
  format: 'srt' | 'vtt' | 'txt' | 'json';
  content: string;
}

export interface SilenceSegment {
  start: number;
  end: number;
  duration: number;
}

export type ProcessingStage =
  | 'idle'
  | 'loading'
  | 'splitting'
  | 'compressing'
  | 'detecting-silence'
  | 'transcribing'
  | 'exporting'
  | 'error'
  | 'ready';

export interface AudioMetadata {
  duration: number;
  sampleRate: number;
  channels: number;
}
