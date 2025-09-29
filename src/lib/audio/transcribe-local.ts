import type { TranscriptSegment } from './types';

export interface LocalTranscriptionOptions {
  locale?: string;
  chunkLengthSeconds?: number;
  model?: string;
}

export interface LocalTranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
}

/**
 * 尝试使用本地开源Whisper实现
 * 这里提供几种可能的本地转录方案
 */

/**
 * 方案1: 使用 Web Speech API (浏览器原生，但需要网络连接)
 */
export async function transcribeWithWebSpeech(
  file: File,
  options: LocalTranscriptionOptions = {},
): Promise<LocalTranscriptionResult> {
  return new Promise((resolve, reject) => {
    // 检查浏览器支持
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      reject(new Error('Web Speech API not supported in this browser'));
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // 配置识别器
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = options.locale || 'zh-CN';

    let finalTranscript = '';
    const segments: TranscriptSegment[] = [];
    let segmentStartTime = 0;

    recognition.onstart = () => {
      console.log('[transcribe-local] Web Speech Recognition started');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          
          // 创建一个新的段落
          segments.push({
            id: crypto.randomUUID(),
            text: transcript.trim(),
            start: segmentStartTime,
            end: segmentStartTime + 5, // 估计每个段落5秒
            confidence: event.results[i][0].confidence,
          });
          
          segmentStartTime += 5;
        } else {
          interimTranscript += transcript;
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[transcribe-local] Speech recognition error:', event.error);
      reject(new Error(`Speech recognition failed: ${event.error}`));
    };

    recognition.onend = () => {
      console.log('[transcribe-local] Speech recognition ended');
      resolve({
        text: finalTranscript,
        segments: segments.length > 0 ? segments : [{
          id: crypto.randomUUID(),
          text: finalTranscript || '无法识别音频内容',
          start: 0,
          end: 30,
          confidence: 0.5,
        }],
      });
    };

    // Web Speech API 通常用于实时语音识别，不适合文件转录
    // 我们直接启动识别，但不播放音频
    console.warn('[transcribe-local] Web Speech API is designed for live speech, not file transcription');
    recognition.start();
    
    // 设置超时
    setTimeout(() => {
      recognition.stop();
    }, 10000); // 10秒超时，因为没有音频播放
  });
}

/**
 * 方案2: 简化的音频分析 + 占位符文本
 * 分析音频特征（音量、频率等）生成更智能的时间分段
 */
export async function transcribeWithAudioAnalysis(
  file: File,
  options: LocalTranscriptionOptions = {},
): Promise<LocalTranscriptionResult> {
  try {
    console.log('[transcribe-local] Starting audio analysis transcription');
    
    // 使用Web Audio API分析音频
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const duration = audioBuffer.duration;
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0); // 获取第一个声道
    
    console.log(`[transcribe-local] Audio analysis: duration=${duration}s, sampleRate=${sampleRate}`);
    
    // 分析音频特征，找出可能的语音段落
    const segments = analyzeAudioForSpeechSegments(channelData, sampleRate, duration, options.chunkLengthSeconds || 30);
    
    const text = segments.map(s => s.text).join('\n');
    
    return {
      text,
      segments,
    };
  } catch (error) {
    console.error('[transcribe-local] Audio analysis failed:', error);
    throw error;
  }
}

/**
 * 分析音频数据，生成智能的语音段落
 */
function analyzeAudioForSpeechSegments(
  channelData: Float32Array,
  sampleRate: number,
  duration: number,
  maxSegmentLength: number,
): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const windowSize = sampleRate * 0.1; // 100ms窗口
  const silenceThreshold = 0.01; // 静音阈值
  
  let currentSegmentStart = 0;
  let inSpeech = false;
  let speechStartTime = 0;
  let segmentIndex = 1;
  
  // 分析音频，检测语音和静音
  for (let i = 0; i < channelData.length; i += windowSize) {
    const windowEnd = Math.min(i + windowSize, channelData.length);
    const currentTime = i / sampleRate;
    
    // 计算当前窗口的平均音量
    let sum = 0;
    for (let j = i; j < windowEnd; j++) {
      sum += Math.abs(channelData[j]);
    }
    const avgVolume = sum / (windowEnd - i);
    
    // 判断是否为语音
    const isSpeech = avgVolume > silenceThreshold;
    
    if (isSpeech && !inSpeech) {
      // 检测到语音开始
      speechStartTime = currentTime;
      inSpeech = true;
    } else if (!isSpeech && inSpeech) {
      // 检测到语音结束
      const segmentDuration = currentTime - speechStartTime;
      
      if (segmentDuration > 0.5) { // 只保留超过0.5秒的语音段
        segments.push({
          id: crypto.randomUUID(),
          text: generatePlaceholderText(segmentIndex, speechStartTime, currentTime),
          start: speechStartTime,
          end: currentTime,
          confidence: 0.8, // 基于音频分析的置信度
        });
        segmentIndex++;
      }
      
      inSpeech = false;
    }
    
    // 处理超长段落
    if (inSpeech && (currentTime - speechStartTime) > maxSegmentLength) {
      segments.push({
        id: crypto.randomUUID(),
        text: generatePlaceholderText(segmentIndex, speechStartTime, speechStartTime + maxSegmentLength),
        start: speechStartTime,
        end: speechStartTime + maxSegmentLength,
        confidence: 0.8,
      });
      segmentIndex++;
      speechStartTime = speechStartTime + maxSegmentLength;
    }
  }
  
  // 处理最后一个段落
  if (inSpeech) {
    segments.push({
      id: crypto.randomUUID(),
      text: generatePlaceholderText(segmentIndex, speechStartTime, duration),
      start: speechStartTime,
      end: duration,
      confidence: 0.8,
    });
  }
  
  // 如果没有检测到语音段落，创建一个默认段落
  if (segments.length === 0) {
    segments.push({
      id: crypto.randomUUID(),
      text: '检测到音频内容，但无法识别具体语音。请手动编辑此处内容。',
      start: 0,
      end: duration,
      confidence: 0.3,
    });
  }
  
  console.log(`[transcribe-local] Generated ${segments.length} speech segments from audio analysis`);
  return segments;
}

/**
 * 生成占位符文本
 */
function generatePlaceholderText(index: number, start: number, end: number): string {
  const startTime = formatTime(start);
  const endTime = formatTime(end);
  const duration = end - start;
  
  if (duration < 2) {
    return `[短语音 ${index}] ${startTime}-${endTime} - 短促发言`;
  } else if (duration < 10) {
    return `[语音片段 ${index}] ${startTime}-${endTime} - 中等长度发言内容`;
  } else {
    return `[长语音 ${index}] ${startTime}-${endTime} - 较长的发言或说明内容`;
  }
}

/**
 * 格式化时间为 MM:SS 格式
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 检测可用的本地转录方法
 */
export function detectAvailableLocalMethods(): string[] {
  const methods: string[] = [];
  
  // 暂时禁用 Web Speech API，因为它不适合文件转录且会自动播放音频
  // if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  //   methods.push('web-speech');
  // }
  
  // 检查 Web Audio API
  if ('AudioContext' in window || 'webkitAudioContext' in window) {
    methods.push('audio-analysis');
  }
  
  return methods;
}

/**
 * 主要的本地转录函数
 */
export async function transcribeLocally(
  file: File,
  options: LocalTranscriptionOptions = {},
): Promise<LocalTranscriptionResult> {
  const availableMethods = detectAvailableLocalMethods();
  console.log('[transcribe-local] Available methods:', availableMethods);
  
  // 优先尝试Web Speech API（质量更好但需要网络）
  if (availableMethods.includes('web-speech')) {
    try {
      console.log('[transcribe-local] Trying Web Speech API');
      return await transcribeWithWebSpeech(file, options);
    } catch (error) {
      console.warn('[transcribe-local] Web Speech API failed, falling back to audio analysis:', error);
    }
  }
  
  // 回退到音频分析
  if (availableMethods.includes('audio-analysis')) {
    console.log('[transcribe-local] Using audio analysis method');
    return await transcribeWithAudioAnalysis(file, options);
  }
  
  // 最后的回退方案
  throw new Error('No local transcription methods available');
}
