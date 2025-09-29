import { useState, useEffect } from 'react';
import type { AudioSegment, TranscriptSegment, SubtitleFile } from '../../lib/audio/types';
import { generateSubtitleFiles, downloadSubtitleFile } from '../../lib/audio/subtitle-generator';
import { getCurrentLocale } from '../../lib/i18n/language-manager';
import { translations } from '../../lib/i18n/translations';
import { useEditorStore } from '../../lib/stores/editorStore';
import { ApiConfigComponent, loadApiConfig, saveApiConfig, type ApiConfig } from './ApiConfig';

interface SubtitleExporterProps {
  language?: string;
  className?: string;
}

type ExportStatus = 'idle' | 'processing' | 'ready' | 'error';

export function SubtitleExporter({ language = 'en-US', className = '' }: SubtitleExporterProps) {
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [subtitleFiles, setSubtitleFiles] = useState<SubtitleFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<'tiny' | 'small' | 'base'>('tiny');
  const [apiConfig, setApiConfig] = useState<ApiConfig>(loadApiConfig());

  const locale = getCurrentLocale();
  const t = translations[locale] || translations.en;
  
  // 从 store 获取已有的转录数据
  const transcript = useEditorStore((s) => s.transcript);
  const transcribe = useEditorStore((s) => s.transcribe);
  const sourceFile = useEditorStore((s) => s.sourceFile);
  const storeStatus = useEditorStore((s) => s.status);

  // 保存API配置到本地存储
  useEffect(() => {
    saveApiConfig(apiConfig);
  }, [apiConfig]);

  const handleApiConfigChange = (newConfig: ApiConfig) => {
    setApiConfig(newConfig);
    saveApiConfig(newConfig);
  };

  const handleGenerateSubtitles = async () => {
    if (!sourceFile) {
      setError('No audio file found. Please upload a file first.');
      setStatus('error');
      return;
    }

    setStatus('processing');
    setError(null);

    try {
      console.log('[SubtitleExporter] ===== START =====');
      console.log('[SubtitleExporter] File:', sourceFile.name, 'size:', sourceFile.size);
      console.log('[SubtitleExporter] Locale:', locale, 'Model:', selectedModel);
      console.log('[SubtitleExporter] Store status before:', storeStatus, 'Current transcript len:', transcript.length);
      
      // 如果store正在处理文件，等待完成
      if (storeStatus !== 'idle' && storeStatus !== 'ready' && storeStatus !== 'error') {
        console.log('[SubtitleExporter] Store is processing, waiting...', storeStatus);
        
        // 等待处理完成
        await new Promise((resolve, reject) => {
          const checkStatus = () => {
            const currentStatus = useEditorStore.getState().status;
            console.log('[SubtitleExporter] Checking status:', currentStatus);
            
            if (currentStatus === 'ready') {
              console.log('[SubtitleExporter] Processing completed successfully');
              resolve(undefined);
            } else if (currentStatus === 'error') {
              console.log('[SubtitleExporter] Processing failed');
              reject(new Error('Audio processing failed'));
            } else {
              // 继续等待
              setTimeout(checkStatus, 1000);
            }
          };
          checkStatus();
        });
      } else if (transcript.length === 0) {
        // 若没有转录且 store 空闲，仅执行"转录"步骤
        console.log('[SubtitleExporter] No existing transcript, transcribing now...');
        const transcriptSegments = await transcribe({ 
          model: selectedModel, 
          locale: locale === 'zh' ? 'zh' : locale === 'ja' ? 'ja' : 'en',
          apiConfig: apiConfig // 传递API配置
        });
        console.log('[SubtitleExporter] transcribe() resolved. segments length =', transcriptSegments?.length);
        if (transcriptSegments && transcriptSegments[0]) {
          console.log('[SubtitleExporter] First segment sample:', {
            start: transcriptSegments[0].start,
            end: transcriptSegments[0].end,
            text: transcriptSegments[0].text?.slice(0, 80)
          });
        }
        
        if (!transcriptSegments || transcriptSegments.length === 0) {
          const latestState = useEditorStore.getState();
          console.warn('[SubtitleExporter] segments empty after transcribe(). Store snapshot:', {
            status: latestState.status,
            transcriptLen: latestState.transcript.length,
            error: latestState.error,
          });
          throw new Error('Failed to generate transcript from audio');
        }

        console.log('[SubtitleExporter] Generated transcript with', transcriptSegments.length, 'segments');

        // 生成字幕文件
        const files = generateSubtitleFiles(transcriptSegments);
        setSubtitleFiles(files);
        setStatus('ready');
        
        console.log('[SubtitleExporter] Generated subtitle files:', files.map(f => f.format));
        return;
      }
      
      // 如果已有转录数据，直接使用
      console.log('[SubtitleExporter] Using existing transcript with', transcript.length, 'segments');

      // 生成字幕文件
      const files = generateSubtitleFiles(transcript);
      setSubtitleFiles(files);
      setStatus('ready');
      
      console.log('[SubtitleExporter] Generated subtitle files:', files.map(f => f.format));
    } catch (err) {
      console.error('[SubtitleExporter] Subtitle generation failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStatus('error');
    } finally {
      console.log('[SubtitleExporter] ===== END =====');
    }
  };

  const handleDownload = (format: string) => {
    const file = subtitleFiles.find(f => f.format === format);
    if (file) {
      downloadSubtitleFile(file, 'audio-subtitles');
    }
  };

  const getStatusText = () => {
    // 如果store正在处理，显示相应状态
    if (storeStatus !== 'idle' && storeStatus !== 'ready' && storeStatus !== 'error') {
      const statusTexts = {
        'loading': locale === 'zh' ? '准备工作区...' : locale === 'ja' ? 'ワークスペースを準備中...' : 'Preparing workspace...',
        'splitting': locale === 'zh' ? '分割大文件...' : locale === 'ja' ? '大容量ファイルを分割中...' : 'Splitting large file...',
        'compressing': locale === 'zh' ? '应用无损压缩...' : locale === 'ja' ? 'ロスレス圧縮を適用中...' : 'Applying lossless compression...',
        'detecting-silence': locale === 'zh' ? '检测停顿...' : locale === 'ja' ? '無音区間を検出中...' : 'Detecting pauses...',
        'transcribing': locale === 'zh' ? '转录音频...' : locale === 'ja' ? '音声を書き起こし中...' : 'Transcribing audio...'
      };
      return statusTexts[storeStatus] || storeStatus;
    }
    
    // 如果已经有转录数据，可以直接生成字幕
    if (transcript.length > 0 && status === 'idle') {
      const segmentText = locale === 'zh' ? '个片段' : locale === 'ja' ? 'セグメント' : 'segments found';
      return `${t.subtitlesReady} (${transcript.length} ${segmentText})`;
    }
    
    switch (status) {
      case 'processing':
        return t.generatingSubtitles;
      case 'ready':
        const formatText = locale === 'zh' ? '种格式可用' : locale === 'ja' ? 'フォーマット利用可能' : 'formats available';
        return `${t.subtitlesReady} - ${subtitleFiles.length} ${formatText}`;
      case 'error':
        const errorText = locale === 'zh' ? '错误' : locale === 'ja' ? 'エラー' : 'Error';
        return `${errorText}: ${error}`;
      default:
        const needTranscribeText = locale === 'zh' ? '需要先转录音频' : locale === 'ja' ? '音声の書き起こしが必要' : 'transcription required';
        return transcript.length > 0 ? t.generateSubtitles : `${t.generateSubtitles} (${needTranscribeText})`;
    }
  };

  // 无源文件时仍显示组件，但以禁用/提醒的方式呈现，避免“看不见”
  if (!sourceFile) {
    return (
      <div className={`rounded-lg border border-neutral-dark/20 bg-neutral-light/50 p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-success-dark">{t.subtitleExport}</h3>
          <span className="text-sm text-neutral-dark/60">0 {locale === 'zh' ? '个片段可用' : locale === 'ja' ? 'セグメント利用可能' : 'segments available'}</span>
        </div>
        <p className="mt-2 text-sm text-neutral-dark/70">{t.noAudioSegmentsDesc}</p>
        <div className="mt-3">
          <button
            type="button"
            disabled
            className="rounded-full bg-neutral-dark/20 px-6 py-2 text-sm font-medium text-neutral-dark shadow-sm cursor-not-allowed"
          >
            {locale === 'zh' ? '生成字幕' : locale === 'ja' ? '字幕を生成' : 'Generate Subtitles'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-success/30 bg-success-light/20 p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-success-dark">{t.subtitleExport}</h3>
        <span className="text-sm text-neutral-dark/60">
          {transcript.length > 0 ? (
            `${transcript.length} ${
              locale === 'zh' ? '个转录片段' :
              locale === 'ja' ? '転写セグメント' :
              `transcript segment${transcript.length !== 1 ? 's' : ''}`
            }`
          ) : (
            locale === 'zh' ? '需要转录' :
            locale === 'ja' ? '転写が必要' :
            'Transcription needed'
          )}
        </span>
      </div>

      <p className="mt-2 text-sm text-neutral-dark/70">
        {getStatusText()}
      </p>

      {/* API配置 */}
      <div className="mt-4">
        <ApiConfigComponent 
          config={apiConfig} 
          onChange={handleApiConfigChange}
        />
      </div>

      {/* 模型选择器 */}
      {transcript.length === 0 && apiConfig.provider === 'none' && (
        <div className="mt-3 rounded-lg bg-neutral-light/50 p-3">
          <label className="block text-sm font-medium text-neutral-dark mb-2">
            {locale === 'zh' ? '转录模型 (速度 vs 精度)' :
             locale === 'ja' ? '転写モデル (速度 vs 精度)' :
             'Transcription Model (Speed vs Accuracy)'}
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as 'tiny' | 'small' | 'base')}
            className="w-full rounded-lg border border-neutral-dark/20 bg-primary px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            <option value="tiny">
              {locale === 'zh' ? 'Tiny - 最快 (精度略低)' :
               locale === 'ja' ? 'Tiny - 最速 (精度やや低)' :
               'Tiny - Fastest (Lower accuracy)'}
            </option>
            <option value="small">
              {locale === 'zh' ? 'Small - 平衡' :
               locale === 'ja' ? 'Small - バランス' :
               'Small - Balanced'}
            </option>
            <option value="base">
              {locale === 'zh' ? 'Base - 较慢 (精度更高)' :
               locale === 'ja' ? 'Base - やや遅い (高精度)' :
               'Base - Slower (Higher accuracy)'}
            </option>
          </select>
        </div>
      )}

      {(status === 'processing' || (storeStatus !== 'idle' && storeStatus !== 'ready' && storeStatus !== 'error')) ? (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-neutral-light">
            <div className="h-full bg-success-dark transition-all duration-300 ease-out animate-pulse w-full" />
          </div>
          <p className="mt-1 text-xs text-neutral-dark/60">
            {storeStatus === 'transcribing' ? (
              locale === 'zh' ? '正在使用 Whisper 转录音频...' :
              locale === 'ja' ? 'Whisperで音声を書き起こし中...' :
              'Transcribing audio with Whisper...'
            ) : storeStatus !== 'idle' && storeStatus !== 'ready' && storeStatus !== 'error' ? (
              locale === 'zh' ? '正在处理音频文件...' :
              locale === 'ja' ? '音声ファイルを処理中...' :
              'Processing audio file...'
            ) : (
              locale === 'zh' ? '正在生成字幕文件...' :
              locale === 'ja' ? '字幕ファイルを生成中...' :
              'Generating subtitle files...'
            )}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        {/* 主要生成字幕按钮 - 始终显示，根据状态调整文本和行为 */}
        {(status === 'idle' || status === 'error') && (
          <button
            type="button"
            onClick={transcript.length > 0 ? () => {
              // 已有转录数据，直接生成字幕文件
              setStatus('processing');
              const files = generateSubtitleFiles(transcript);
              setSubtitleFiles(files);
              setStatus('ready');
            } : () => handleGenerateSubtitles()}
            disabled={!sourceFile || status === 'processing' || (storeStatus !== 'idle' && storeStatus !== 'ready' && storeStatus !== 'error')}
            className="rounded-full bg-accent-dark px-6 py-2 text-sm font-medium text-primary shadow-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {transcript.length > 0 ? (
              locale === 'zh' ? '生成字幕文件' :
              locale === 'ja' ? '字幕ファイルを生成' :
              'Generate Subtitle Files'
            ) : (
              locale === 'zh' ? '生成字幕' :
              locale === 'ja' ? '字幕を生成' :
              'Generate Subtitles'
            )}
          </button>
        )}


        {status === 'ready' && subtitleFiles.length > 0 ? (
          <>
            {subtitleFiles.map((file) => (
              <button
                key={file.format}
                type="button"
                onClick={() => handleDownload(file.format)}
                className="rounded-full bg-accent-dark px-4 py-2 text-sm font-medium text-primary shadow-sm transition hover:bg-accent"
              >
                {locale === 'zh' ? '下载' :
                 locale === 'ja' ? 'ダウンロード' :
                 'Download'} {file.format.toUpperCase()}
              </button>
            ))}
          </>
        ) : null}
      </div>

      {transcript.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-success-dark">
            {t.previewTranscript} ({transcript.length} segments)
          </summary>
          <div className="mt-2 max-h-32 overflow-y-auto rounded-lg bg-primary/50 p-3 text-xs">
            {transcript.map((segment) => (
              <div key={segment.id} className="mb-2 border-b border-neutral-dark/10 pb-1">
                <span className="font-medium text-accent-dark">
                  {segment.start.toFixed(1)}-{segment.end.toFixed(1)}s:
                </span>{' '}
                <span className="text-neutral-dark">{segment.text}</span>
                {segment.confidence !== undefined && (
                  <span className="ml-2 text-xs text-neutral-dark/50">
                    ({(segment.confidence * 100).toFixed(1)}%)
                  </span>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}