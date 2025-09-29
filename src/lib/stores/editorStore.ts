import { create } from 'zustand';
import type {
  AudioMetadata,
  AudioSegment,
  ProcessingStage,
  SilenceSegment,
  SubtitleFile,
  TranscriptSegment,
} from '../audio/types';
import { asSubtitleFiles } from '../audio/subtitles';

interface EditorState {
  sourceFile: File | null;
  metadata: AudioMetadata | null;
  segments: AudioSegment[];
  compressedSegments: AudioSegment[];
  silences: SilenceSegment[];
  transcript: TranscriptSegment[];
  subtitles: SubtitleFile[];
  status: ProcessingStage;
  error?: string;
  setStatus: (status: ProcessingStage) => void;
  reset: () => void;
  setSourceFile: (file: File) => void;
  processFile: (file: File) => Promise<void>;
  transcribe: (options?: { model?: 'tiny' | 'small' | 'base'; locale?: string }) => Promise<TranscriptSegment[]>;
}

const initialState: Omit<EditorState, 'setStatus' | 'reset' | 'processFile'> = {
  sourceFile: null,
  metadata: null,
  segments: [],
  compressedSegments: [],
  silences: [],
  transcript: [],
  subtitles: [],
  status: 'idle',
  error: undefined,
};

export const useEditorStore = create<EditorState>((set, get) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  reset: () => set({ ...initialState }),
  setSourceFile: (file: File) => {
    // 仅设置源文件，不触发任何重处理；由显式动作（如 transcribe/processFile）驱动
    set({ sourceFile: file, status: 'idle', error: undefined });
  },
  processFile: async (file: File) => {
    // 防抖：避免并发触发导致的状态震荡
    if (get().status !== 'idle' && get().status !== 'error') {
      console.log('[editorStore] processFile ignored, status =', get().status);
      return;
    }
    set({
      status: 'loading',
      sourceFile: file,
      error: undefined,
    });

    try {
      set({ status: 'splitting' });
      const { splitIfNeeded } = await import('../audio/splitter');
      const { segments, metadata } = await splitIfNeeded(file);
      set({ segments, metadata });

      set({ status: 'compressing' });
      const { compressSegmentsLossless } = await import('../audio/compress');
      const compressed = await compressSegmentsLossless(segments, 'flac');
      set({ compressedSegments: compressed });

      set({ status: 'detecting-silence' });
      const { detectSilences } = await import('../audio/silence');
      const silences = await detectSilences(file);
      set({ silences });

      set({ status: 'ready' });
    } catch (error) {
      console.error(error);
      set({ status: 'error', error: (error as Error).message });
    }
  },
  transcribe: async (options?: { model?: 'tiny' | 'small' | 'base'; locale?: string; apiConfig?: any }) => {
    const { sourceFile, status } = get();
    if (!sourceFile) {
      console.warn('[editorStore] transcribe ignored: no sourceFile');
      return [];
    }
    if (status === 'transcribing') {
      console.log('[editorStore] transcribe ignored: already transcribing');
      return [];
    }
    set({ status: 'transcribing', error: undefined });
    try {
      const { transcribeAudio } = await import('../audio/transcribe');
      const result = await transcribeAudio(sourceFile, { 
        locale: options?.locale ?? 'en',
        model: options?.model ?? 'tiny',
        apiConfig: options?.apiConfig
      });
      set({
        transcript: result.segments,
        subtitles: asSubtitleFiles(result.segments),
        status: 'ready',
      });
      console.log('[editorStore] Transcription completed with model:', options?.model ?? 'tiny');
      return result.segments;
    } catch (error) {
      console.error(error);
      set({ status: 'error', error: (error as Error).message });
      return [];
    }
  },
}));
