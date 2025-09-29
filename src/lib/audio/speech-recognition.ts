import type { AudioSegment, TranscriptSegment } from './types';

export interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

interface CustomSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

interface CustomWindow extends Window {
  SpeechRecognition?: new () => CustomSpeechRecognition;
  webkitSpeechRecognition?: new () => CustomSpeechRecognition;
}

export function isSpeechRecognitionSupported(): boolean {
  const win = window as CustomWindow;
  return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
}

export async function recognizeSpeechFromAudio(
  audioData: Uint8Array,
  options: SpeechRecognitionOptions = {}
): Promise<string> {
  if (!isSpeechRecognitionSupported()) {
    throw new Error('Speech recognition is not supported in this browser');
  }

  const win = window as CustomWindow;
  const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    throw new Error('Speech recognition is not available');
  }

  const audioBlob = new Blob([audioData], { type: 'audio/wav' });
  const audioUrl = URL.createObjectURL(audioBlob);

  try {
    const audio = new Audio(audioUrl);

    return new Promise((resolve, reject) => {
      const recognition = new SpeechRecognition();
      recognition.continuous = options.continuous ?? true;
      recognition.interimResults = options.interimResults ?? false;
      recognition.lang = options.language ?? 'en-US';

      let finalTranscript = '';

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          }
        }
      };

      recognition.onerror = (event) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.onend = () => {
        resolve(finalTranscript.trim());
      };

      audio.onplay = () => {
        recognition.start();
      };

      audio.onended = () => {
        recognition.stop();
      };

      audio.play().catch(reject);
    });
  } finally {
    URL.revokeObjectURL(audioUrl);
  }
}

export async function recognizeSegments(
  segments: AudioSegment[],
  options: SpeechRecognitionOptions = {}
): Promise<TranscriptSegment[]> {
  const transcripts: TranscriptSegment[] = [];

  for (const segment of segments) {
    try {
      const text = await recognizeSpeechFromAudio(segment.data, options);

      if (text.trim()) {
        transcripts.push({
          id: `transcript-${segment.id}`,
          text: text.trim(),
          start: segment.start,
          end: segment.end,
          confidence: 0.8
        });
      }
    } catch (error) {
      console.warn(`Failed to recognize speech for segment ${segment.id}:`, error);
      transcripts.push({
        id: `transcript-${segment.id}`,
        text: '[Recognition failed]',
        start: segment.start,
        end: segment.end,
        confidence: 0.0
      });
    }
  }

  return transcripts;
}