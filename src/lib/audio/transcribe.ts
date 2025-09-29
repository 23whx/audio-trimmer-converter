import type { TranscriptSegment } from './types';
import { transcribeAudioFallback, isWhisperAvailable } from './transcribe-fallback';
import { transcribeWithApi, validateApiConfig, type TranscriptionResult as ApiTranscriptionResult } from './transcribe-api';
import { transcribeLocally, detectAvailableLocalMethods } from './transcribe-local';
import type { ApiConfig } from '../../components/editor/ApiConfig';

export interface TranscriptionOptions {
  locale?: string;
  chunkLengthSeconds?: number;
  model?: 'tiny' | 'small' | 'base';
  apiConfig?: ApiConfig; // 新增API配置选项
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
}

export async function transcribeAudio(
  file: File,
  options: TranscriptionOptions = {},
): Promise<TranscriptionResult> {
  console.log('[transcribe] Start transcribeAudio for file:', file?.name, 'options:', options);
  
  // 优先使用API服务（如果配置了）
  if (options.apiConfig && options.apiConfig.provider !== 'none') {
    const validation = validateApiConfig(options.apiConfig);
    if (validation.valid) {
      console.log('[transcribe] Using API provider:', options.apiConfig.provider);
      try {
        return await transcribeWithApi(file, options.apiConfig, {
          locale: options.locale,
          chunkLengthSeconds: options.chunkLengthSeconds,
          model: options.apiConfig.model,
        });
      } catch (error) {
        console.error('[transcribe] API transcription failed, falling back:', error);
        // API失败时回退到本地方法
      }
    } else {
      console.warn('[transcribe] Invalid API config:', validation.error);
    }
  }
  
  // 尝试本地转录方法
  const localMethods = detectAvailableLocalMethods();
  if (localMethods.length > 0) {
    console.log('[transcribe] Trying local transcription methods:', localMethods);
    try {
      return await transcribeLocally(file, {
        locale: options.locale,
        chunkLengthSeconds: options.chunkLengthSeconds,
        model: options.model,
      });
    } catch (error) {
      console.error('[transcribe] Local transcription failed, falling back:', error);
    }
  }

  // 最后的回退方案
  console.warn('[transcribe] All methods failed, using basic fallback');
  return transcribeAudioFallback(file, options);
}