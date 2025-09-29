import { useState, useRef, useCallback } from 'react';
import AudioWaveform from './AudioWaveform';
// import { SubtitleExporter } from './SubtitleExporter'; // 暂时隐藏字幕导出功能
import { type SupportedLocale } from '../../lib/i18n/translations';
import { useLocale } from '../../lib/i18n/useLocale';
import { useEditorStore } from '../../lib/stores/editorStore';

interface AudioEditorProps {
  audioFile: File;
  onClose?: () => void;
  locale?: SupportedLocale;
}

interface ExportFormat {
  value: string;
  label: string;
  extension: string;
  mimeType: string;
}

const EXPORT_FORMATS: ExportFormat[] = [
  { value: 'mp3', label: 'MP3', extension: '.mp3', mimeType: 'audio/mpeg' },
  { value: 'wav', label: 'WAV', extension: '.wav', mimeType: 'audio/wav' },
  { value: 'aac', label: 'AAC', extension: '.aac', mimeType: 'audio/aac' },
  { value: 'flac', label: 'FLAC', extension: '.flac', mimeType: 'audio/flac' },
];

interface HistoryEntry {
  id: string;
  timestamp: number;
  action: string;
  segments: { start: number; end: number }[];
}

export default function AudioEditor({ audioFile, onClose }: AudioEditorProps) {
  // 使用新的useLocale Hook来监听语言变化
  const { locale, t } = useLocale();
  const [segments, setSegments] = useState<{ start: number; end: number }[]>([]);
  const [duration, setDuration] = useState(0);
  
  // 从 store 获取状态与片段，用于字幕导出显隐
  const status = useEditorStore((s) => s.status);
  const storeSegments = useEditorStore((s) => s.segments);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(EXPORT_FORMATS[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);
  const ffmpegRef = useRef<any>(null);

  // 添加历史记录
  const addToHistory = useCallback((action: string, newSegments: { start: number; end: number }[]) => {
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      action,
      segments: [...newSegments]
    };

    setHistory(prev => {
      // 移除当前位置之后的历史记录（如果用户在历史中间位置进行了新操作）
      const newHistory = prev.slice(0, currentHistoryIndex + 1);
      newHistory.push(entry);

      // 限制历史记录数量（最多保存20条）
      if (newHistory.length > 20) {
        newHistory.shift();
      }

      return newHistory;
    });

    setCurrentHistoryIndex(prev => {
      const newIndex = Math.min(prev + 1, 19); // 最多19个索引（20条记录）
      return newIndex;
    });
  }, [currentHistoryIndex]);

  // 回退到历史记录
  const revertToHistory = (index: number) => {
    if (index >= 0 && index < history.length && index !== currentHistoryIndex) {
      const entry = history[index];
      setSegments([...entry.segments]);
      setCurrentHistoryIndex(index);

      // 清除当前索引之后的所有历史记录
      setHistory(prev => prev.slice(0, index + 1));
    }
  };

  // 初始化 FFmpeg（复用之前的逻辑）
  const initFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;

    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL } = await import('@ffmpeg/util');

      const ffmpeg = new FFmpeg();
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      // 监听进度
      ffmpeg.on('progress', ({ progress }) => {
        setExportProgress(Math.round(progress * 100));
      });

      ffmpegRef.current = ffmpeg;
      return ffmpeg;
    } catch (error) {
      console.error('FFmpeg initialization failed:', error);
      throw error;
    }
  };

  // 处理波形加载完成
  const handleLoadComplete = useCallback((audioDuration: number) => {
    setDuration(audioDuration);
  }, []);

  // 处理区域选择变化
  const handleRegionChange = useCallback((newSegments: { start: number; end: number }[]) => {
    setSegments(prev => {
      // 只有当segments真正变化时才添加到历史记录
      if (prev.length !== newSegments.length ||
          !prev.every((seg, i) => newSegments[i] &&
            Math.abs(seg.start - newSegments[i].start) < 0.01 &&
            Math.abs(seg.end - newSegments[i].end) < 0.01)) {

        let action = t.updatedSegments;
        if (newSegments.length > prev.length) {
          action = t.addedAnchorPoint;
        } else if (newSegments.length < prev.length) {
          action = t.removedAnchorPoint;
        }

        addToHistory(action, newSegments);
      }
      return newSegments;
    });
  }, [addToHistory, t]);

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  // 处理时间输入变化
  const handleTimeInputChange = (segmentIndex: number, type: 'start' | 'end', value: string) => {
    const [minutes, rest] = value.split(':');
    const [seconds, milliseconds = '0'] = rest?.split('.') || ['0', '0'];

    const totalSeconds =
      parseInt(minutes || '0') * 60 +
      parseInt(seconds || '0') +
      parseInt(milliseconds || '0') / 1000;

    const newSegments = [...segments];
    if (type === 'start') {
      const maxStart = newSegments[segmentIndex].end - 0.1;
      newSegments[segmentIndex].start = Math.max(0, Math.min(totalSeconds, maxStart));
    } else {
      const minEnd = newSegments[segmentIndex].start + 0.1;
      newSegments[segmentIndex].end = Math.max(minEnd, Math.min(totalSeconds, duration));
    }

    setSegments(newSegments);
    // 只有在时间真正改变时才添加历史记录
    if (Math.abs(segments[segmentIndex][type] - totalSeconds) > 0.01) {
      addToHistory(`${t.manualTimeAdjustment} - ${type}`, newSegments);
    }
  };

  // 删除选中的Segment
  const deleteSegment = useCallback((segmentIndex: number) => {
    if (segments.length <= 1) {
      alert('Cannot delete the last segment');
      return;
    }

    const newSegments = segments.filter((_, index) => index !== segmentIndex);
    setSegments(newSegments);
    addToHistory(t.deletedSegment, newSegments);

    // 清除选中状态
    setSelectedSegmentIndex(null);
  }, [segments, addToHistory, t]);

  // 导出音频
  const handleExport = async () => {
    if (!audioFile || segments.length === 0) return;

    try {
      setIsExporting(true);
      setExportProgress(0);

      const ffmpeg = await initFFmpeg();
      const inputFileName = `input.${audioFile.name.split('.').pop()}`;

      // 写入音频文件
      const audioData = new Uint8Array(await audioFile.arrayBuffer());
      await ffmpeg.writeFile(inputFileName, audioData);

      const baseFileName = audioFile.name.replace(/\.[^/.]+$/, '');

      // 导出每个片段
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const outputFileName = `${baseFileName}_segment_${i + 1}${selectedFormat.extension}`;

        // 构建 FFmpeg 命令
        const args = [
          '-i', inputFileName,
          '-ss', segment.start.toString(),
          '-t', (segment.end - segment.start).toString(),
          '-c:a', getAudioCodec(selectedFormat.value),
          '-avoid_negative_ts', 'make_zero',
          outputFileName
        ];

        // 执行裁剪
        await ffmpeg.exec(args);

        // 读取输出文件
        const outputData = await ffmpeg.readFile(outputFileName);

        // 创建下载链接
        const outputBlob = new Blob([outputData], { type: selectedFormat.mimeType });
        const downloadUrl = URL.createObjectURL(outputBlob);

        // 触发下载
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = outputFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 清理资源
        URL.revokeObjectURL(downloadUrl);
        await ffmpeg.deleteFile(outputFileName);

        // 更新进度
        setExportProgress(Math.round(((i + 1) / segments.length) * 100));
      }

      // 清理输入文件
      await ffmpeg.deleteFile(inputFileName);

      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
      setExportProgress(0);
      alert(`Export failed. Please try again.`);
    }
  };

  // 获取音频编码器
  const getAudioCodec = (format: string) => {
    switch (format) {
      case 'mp3': return 'libmp3lame';
      case 'wav': return 'pcm_s16le';
      case 'aac': return 'aac';
      case 'flac': return 'flac';
      default: return 'libmp3lame';
    }
  };

  // 计算总的选择时长
  const totalSelectedDuration = segments.reduce((total, segment) => total + (segment.end - segment.start), 0);

  return (
    <div className="min-h-screen bg-neutral-light p-4">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-dark">{t.audioEditor}</h1>
            <p className="text-sm text-neutral-dark/70 mt-1">
              {t.editingFile} <span className="font-medium">{audioFile.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-dark hover:text-neutral-dark/80 transition-colors"
          >
            {t.backToUpload}
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* 主编辑区域 - 波形 */}
          <div className="xl:col-span-3">
            <AudioWaveform
              audioFile={audioFile}
              onRegionChange={handleRegionChange}
              onLoadComplete={handleLoadComplete}
              externalSegments={segments}
              selectedSegmentIndex={selectedSegmentIndex}
              locale={locale}
            />

            {/* 时间精确控制 */}
            <div className="mt-4 bg-primary rounded-lg border border-neutral-dark/20 p-4">
              <h3 className="text-sm font-semibold text-neutral-dark mb-3">{t.preciseTimeControl}</h3>
              <div className="space-y-4">
                {segments.map((segment, index) => (
                  <div
                    key={`segment-${index}`}
                    className={`relative rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedSegmentIndex === index
                        ? 'bg-green-200 border-2 border-green-400'
                        : 'bg-neutral-light/30 hover:bg-neutral-light/50'
                    }`}
                    onClick={() => setSelectedSegmentIndex(selectedSegmentIndex === index ? null : index)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-neutral-dark/80">
                        {t.segment} {index + 1}
                      </h4>
                      {segments.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSegment(index);
                          }}
                          className="w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors flex items-center justify-center"
                          title={t.deleteSegmentTooltip}
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-neutral-dark/70 mb-1">{t.startTime}</label>
                        <input
                          type="text"
                          value={formatTime(segment.start)}
                          onChange={(e) => handleTimeInputChange(index, 'start', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-neutral-dark/20 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-accent-dark focus:border-transparent"
                          placeholder="00:00.000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-dark/70 mb-1">{t.endTime}</label>
                        <input
                          type="text"
                          value={formatTime(segment.end)}
                          onChange={(e) => handleTimeInputChange(index, 'end', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-neutral-dark/20 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-accent-dark focus:border-transparent"
                          placeholder="00:00.000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-dark/70 mb-1">{t.duration}</label>
                        <div className="px-2 py-1.5 text-xs border border-neutral-dark/20 rounded-md bg-neutral-light/50 font-mono text-neutral-dark/70">
                          {formatTime(segment.end - segment.start)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {segments.length > 0 && (
                  <div className="text-xs text-neutral-dark/70 border-t border-neutral-dark/10 pt-2">
                    {t.totalSegments} {segments.length} | {t.totalDuration} {formatTime(totalSelectedDuration)}
                  </div>
                )}
              </div>

              {/* 历史记录下拉面板 */}
              <div className="mt-4 border-t border-neutral-dark/10 pt-4">
                <button
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-neutral-dark hover:text-neutral-dark/80 transition-colors"
                >
                  <span>{t.history} ({history.length})</span>
                  <span className={`transform transition-transform ${isHistoryOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                {isHistoryOpen && (
                  <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                    {history.length === 0 ? (
                      <p className="text-xs text-neutral-dark/60">{t.noHistory}</p>
                    ) : (
                      history.map((entry, index) => {
                        const isCurrentStep = index === currentHistoryIndex;
                        const isLatestStep = index === history.length - 1;

                        return (
                          <div
                            key={entry.id}
                            className={`p-2 rounded text-xs transition-colors ${
                              isCurrentStep
                                ? 'bg-blue-100 border border-blue-300'
                                : 'bg-neutral-light/50 hover:bg-neutral-light/70'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 cursor-pointer" onClick={() => revertToHistory(index)}>
                                <div className="font-medium text-neutral-dark">{entry.action}</div>
                                <div className="text-neutral-dark/60 mt-1">
                                  {new Date(entry.timestamp).toLocaleTimeString()}
                                </div>
                                <div className="text-neutral-dark/60 mt-1">
                                  {entry.segments.length} {entry.segments.length === 1 ? t.segment : t.segments}
                                </div>
                              </div>
                              {!isLatestStep && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    revertToHistory(index);
                                  }}
                                  className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors flex-shrink-0"
                                  title={t.revertToStep}
                                >
                                  {locale === 'zh' ? '回溯' : locale === 'ja' ? '戻す' : 'Revert'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 侧边栏 - 导出设置 */}
          <div className="xl:col-span-1">
            <div className="bg-primary rounded-lg border border-neutral-dark/20 p-4 sticky top-4">
              <h3 className="text-sm font-semibold text-neutral-dark mb-4">{t.exportSettings}</h3>

              {/* 格式选择 */}
              <div className="mb-4">
                <label className="block text-xs text-neutral-dark/70 mb-2">{t.outputFormat}</label>
                <select
                  value={selectedFormat.value}
                  onChange={(e) => {
                    const format = EXPORT_FORMATS.find(f => f.value === e.target.value);
                    if (format) setSelectedFormat(format);
                  }}
                  className="w-full px-3 py-2 text-sm border border-neutral-dark/20 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-dark focus:border-transparent"
                >
                  {EXPORT_FORMATS.map((format) => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 选择信息 */}
              <div className="mb-6 p-3 bg-neutral-light/30 rounded-md">
                <div className="text-xs text-neutral-dark/70 space-y-1">
                  <div>{t.segments}: {segments.length}</div>
                  <div>{t.totalSelected} {formatTime(totalSelectedDuration)}</div>
                  <div>{t.outputFormat}: {selectedFormat.label}</div>
                  <div>{t.original} {formatTime(duration)}</div>
                </div>
              </div>

              {/* 导出按钮 */}
              <button
                onClick={handleExport}
                disabled={isExporting || segments.length === 0 || totalSelectedDuration <= 0}
                className="w-full px-4 py-3 bg-success-dark text-primary font-semibold rounded-md hover:bg-success transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin text-sm">⚙️</div>
                    <span>{t.exporting.replace('{{progress}}', exportProgress.toString())}</span>
                  </div>
                ) : (
                  segments.length === 1 ? t.exportSegments.replace('{{count}}', '1') : t.exportSegments_plural.replace('{{count}}', segments.length.toString())
                )}
              </button>

              {/* 直达字幕导出入口（处理完成后显示）*/}
              {/* 暂时隐藏字幕导出跳转链接 */}
              {/* status === 'ready' && (
                <div className="mt-4">
                  <a
                    href="#subtitle-export"
                    className="inline-block rounded-full border border-success-dark px-4 py-2 text-xs font-semibold text-success-dark hover:bg-success-light/60 transition-colors"
                  >
                    {t.subtitleExport}
                  </a>
                </div>
              ) */}

              {/* 键盘快捷键提示 */}
              <div className="mt-4 pt-4 border-t border-neutral-dark/10">
                <h4 className="text-xs font-semibold text-neutral-dark/70 mb-2">{t.keyboardShortcuts}</h4>
                <div className="text-xs text-neutral-dark/60 space-y-1">
                  <div><kbd className="px-1 py-0.5 bg-neutral-dark/10 rounded text-xs">Space</kbd> {t.playPause}</div>
                  <div><kbd className="px-1 py-0.5 bg-neutral-dark/10 rounded text-xs">[</kbd><kbd className="px-1 py-0.5 bg-neutral-dark/10 rounded text-xs">]</kbd> {t.adjustMarkers}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 字幕导出功能 - 暂时隐藏 */}
        {/* 
          <div id="subtitle-export" className="xl:col-span-4 mt-6">
            <SubtitleExporter
              language={locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US'}
              className=""
            />
          </div>
        */}
      </div>
    </div>
  );
}