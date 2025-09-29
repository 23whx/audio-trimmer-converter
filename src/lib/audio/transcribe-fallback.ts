import type { TranscriptSegment } from './types';

/**
 * 备用转录实现，当 @xenova/transformers 出现兼容性问题时使用
 * 这里实现一个基于浏览器原生功能的简化版本
 */

export interface TranscriptionOptions {
  locale?: string;
  chunkLengthSeconds?: number;
  model?: 'tiny' | 'small' | 'base';
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
}

/**
 * 使用基于时间分段的备用转录实现
 * 提供一个有意义的占位符，让用户知道这是备用方案
 */
export async function transcribeAudioFallback(
  file: File,
  options: TranscriptionOptions = {},
): Promise<TranscriptionResult> {
  console.log('[transcribe-fallback] Starting fallback transcription for:', file.name);
  
  try {
    // 创建音频元素来获取元数据
    const audioUrl = URL.createObjectURL(file);
    const audio = new Audio(audioUrl);
    
    // 等待音频元数据加载
    await new Promise((resolve, reject) => {
      audio.addEventListener('loadedmetadata', resolve);
      audio.addEventListener('error', reject);
      audio.load();
    });
    
    const duration = audio.duration;
    console.log('[transcribe-fallback] Audio duration:', duration, 'seconds');
    
    // 创建有意义的时间分段，让用户能够理解音频结构
    const chunkLength = options.chunkLengthSeconds || 30; // 每30秒一段
    const segments: TranscriptSegment[] = [];
    
    let currentTime = 0;
    let segmentIndex = 1;
    
    while (currentTime < duration) {
      const endTime = Math.min(currentTime + chunkLength, duration);
      const timeRange = `${formatTime(currentTime)} - ${formatTime(endTime)}`;
      
      segments.push({
        id: crypto.randomUUID(),
        text: `[片段 ${segmentIndex}] ${timeRange} - 此处为音频内容（需要AI转录服务）`,
        start: currentTime,
        end: endTime,
        confidence: 0.1, // 很低的置信度，表示这不是真实转录
      });
      
      currentTime = endTime;
      segmentIndex++;
    }
    
    const fullText = segments.map(s => s.text).join('\n');
    
    // 清理资源
    URL.revokeObjectURL(audioUrl);
    
    console.log(`[transcribe-fallback] Created ${segments.length} placeholder segments`);
    
    return {
      text: fullText,
      segments,
    };
    
  } catch (error) {
    console.error('[transcribe-fallback] Fallback transcription failed:', error);
    
    // 如果连备用方案都失败了，返回一个基本的错误消息
    const errorText = "无法处理音频文件，请检查文件格式";
    const errorSegment: TranscriptSegment = {
      id: crypto.randomUUID(),
      text: errorText,
      start: 0,
      end: 30, // 假设 30 秒的音频
      confidence: 0,
    };
    
    return {
      text: errorText,
      segments: [errorSegment],
    };
  }
}

/**
 * 格式化时间为 HH:MM:SS 格式
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * 检查是否可以使用高质量的 Whisper 转录
 * 现在优先使用API服务，本地Whisper作为备选
 */
export function isWhisperAvailable(): boolean {
  try {
    // 检查是否支持本地转录方法
    return typeof window !== 'undefined' && 
           ('webkitSpeechRecognition' in window || 
            'SpeechRecognition' in window ||
            'AudioContext' in window ||
            'webkitAudioContext' in window);
  } catch {
    return false;
  }
}
