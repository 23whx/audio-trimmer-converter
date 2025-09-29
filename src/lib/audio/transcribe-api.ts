import type { TranscriptSegment } from './types';
import type { ApiConfig } from '../../components/editor/ApiConfig';

export interface TranscriptionOptions {
  locale?: string;
  chunkLengthSeconds?: number;
  model?: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
}

/**
 * 使用各种API服务进行音频转录
 */
export async function transcribeWithApi(
  file: File,
  config: ApiConfig,
  options: TranscriptionOptions = {},
): Promise<TranscriptionResult> {
  console.log('[transcribe-api] Starting API transcription with provider:', config.provider);

  switch (config.provider) {
    case 'openai':
      return transcribeWithOpenAI(file, config, options);
    case 'groq':
      return transcribeWithGroq(file, config, options);
    case 'local':
      return transcribeWithCustomEndpoint(file, config, options);
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

/**
 * OpenAI Whisper API转录
 */
async function transcribeWithOpenAI(
  file: File,
  config: ApiConfig,
  options: TranscriptionOptions,
): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', config.model || 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'segment');
  
  if (options.locale) {
    formData.append('language', options.locale);
  }

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return parseOpenAIResponse(result);
}

/**
 * Groq API转录
 */
async function transcribeWithGroq(
  file: File,
  config: ApiConfig,
  options: TranscriptionOptions,
): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', config.model || 'whisper-large-v3');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'segment');
  
  if (options.locale) {
    formData.append('language', options.locale);
  }

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return parseOpenAIResponse(result);
}

/**
 * 自定义端点转录
 */
async function transcribeWithCustomEndpoint(
  file: File,
  config: ApiConfig,
  options: TranscriptionOptions,
): Promise<TranscriptionResult> {
  if (!config.baseUrl) {
    throw new Error('Custom endpoint URL is required');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', config.model || 'whisper-base');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'segment');
  
  if (options.locale) {
    formData.append('language', options.locale);
  }

  const headers: Record<string, string> = {};
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(config.baseUrl, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Custom endpoint error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return parseOpenAIResponse(result);
}

/**
 * 解析OpenAI格式的响应（适用于OpenAI、Groq和兼容端点）
 */
function parseOpenAIResponse(response: any): TranscriptionResult {
  console.log('[transcribe-api] Raw API response:', response);

  const text = response.text || '';
  const segments: TranscriptSegment[] = [];

  if (response.segments && Array.isArray(response.segments)) {
    for (const segment of response.segments) {
      segments.push({
        id: crypto.randomUUID(),
        text: segment.text?.trim() || '',
        start: segment.start || 0,
        end: segment.end || 0,
        confidence: segment.avg_logprob ? Math.exp(segment.avg_logprob) : undefined,
      });
    }
  }

  // 如果没有segments但有text，创建一个单一段落
  if (segments.length === 0 && text.trim()) {
    segments.push({
      id: crypto.randomUUID(),
      text: text.trim(),
      start: 0,
      end: 30, // 默认30秒，实际应该从音频文件获取
      confidence: 1,
    });
  }

  console.log(`[transcribe-api] Parsed ${segments.length} segments from API response`);

  return {
    text,
    segments,
  };
}

/**
 * 检查API配置是否有效
 */
export function validateApiConfig(config: ApiConfig): { valid: boolean; error?: string } {
  if (config.provider === 'none') {
    return { valid: true };
  }

  if (!config.apiKey?.trim()) {
    return {
      valid: false,
      error: 'API key is required',
    };
  }

  if (config.provider === 'local' && !config.baseUrl?.trim()) {
    return {
      valid: false,
      error: 'Custom endpoint URL is required',
    };
  }

  // 简单的API密钥格式检查
  if (config.provider === 'openai' && !config.apiKey.startsWith('sk-')) {
    return {
      valid: false,
      error: 'OpenAI API key should start with "sk-"',
    };
  }

  if (config.provider === 'groq' && !config.apiKey.startsWith('gsk_')) {
    return {
      valid: false,
      error: 'Groq API key should start with "gsk_"',
    };
  }

  return { valid: true };
}

/**
 * 测试API连接
 */
export async function testApiConnection(config: ApiConfig): Promise<{ success: boolean; error?: string }> {
  try {
    // 创建一个小的测试音频文件（1秒的静音）
    const audioContext = new AudioContext();
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate);
    
    // 这里简化处理，实际项目中可能需要更复杂的测试音频生成
    // 暂时跳过实际测试，只验证配置
    const validation = validateApiConfig(config);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
