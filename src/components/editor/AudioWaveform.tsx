import { useEffect, useRef, useState, useCallback } from 'react';
import { type SupportedLocale } from '../../lib/i18n/translations';
import { useLocale } from '../../lib/i18n/useLocale';

interface AudioWaveformProps {
  audioFile: File;
  onRegionChange?: (segments: { start: number; end: number }[]) => void;
  onLoadComplete?: (duration: number) => void;
  externalSegments?: { start: number; end: number }[]; // 外部传入的segments，用于同步锚定点
  selectedSegmentIndex?: number | null; // 选中的segment索引
  locale?: SupportedLocale;
}

export default function AudioWaveform({
  audioFile,
  onRegionChange,
  onLoadComplete,
  externalSegments,
  selectedSegmentIndex
}: AudioWaveformProps) {
  // 使用useLocale Hook监听语言变化
  const { locale, t } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const regionsRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anchors, setAnchors] = useState<number[]>([0]); // 锚定点时间数组，默认包含开头点
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState(-1);
  const dragStartPosRef = useRef<{ x: number; time: number }>({ x: 0, time: 0 });

  // 生成音频分段区间
  const generateSegments = (anchorPoints: number[], totalDuration: number) => {
    // 不重复添加totalDuration，因为anchors数组已经包含了结尾点
    const sortedAnchors = [...anchorPoints].sort((a, b) => a - b);

    // 确保最后一个锚定点是结尾时间
    if (sortedAnchors.length === 0 || sortedAnchors[sortedAnchors.length - 1] !== totalDuration) {
      sortedAnchors.push(totalDuration);
    }

    const segments: { start: number; end: number }[] = [];

    for (let i = 0; i < sortedAnchors.length - 1; i++) {
      segments.push({
        start: sortedAnchors[i],
        end: sortedAnchors[i + 1]
      });
    }

    return segments;
  };


  // 添加锚定点
  const addAnchor = (time: number) => {
    const newAnchors = [...anchors, time].sort((a, b) => a - b);
    setAnchors(newAnchors);
  };

  // 删除锚定点
  const removeAnchor = (index: number) => {
    if (anchors.length > 1) { // 至少保留一个锚定点
      const newAnchors = anchors.filter((_, i) => i !== index);
      setAnchors(newAnchors);
    }
  };

  // 开始拖拽锚定点
  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startTime = anchors[index];

    console.log('拖拽开始:', { index, startX, startTime, rect: rect.width });

    setIsDragging(true);
    setDragIndex(index);
    dragStartPosRef.current = { x: startX, time: startTime };
  };

  // 使用useEffect管理全局事件监听器
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || dragIndex === -1 || !containerRef.current || duration <= 0) return;

      const rect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const deltaX = currentX - dragStartPosRef.current.x;
      const deltaTime = (deltaX / rect.width) * duration;
      const newTime = Math.max(0, Math.min(duration, dragStartPosRef.current.time + deltaTime));

      console.log('拖拽中:', { currentX, deltaX, deltaTime, newTime });

      // 简化拖拽范围限制 - 直接基于dragIndex确定相邻锚定点
      const currentAnchors = [...anchors];
      let minTime = 0;
      let maxTime = duration;

      // 查找相邻锚定点的限制
      for (let i = 0; i < currentAnchors.length; i++) {
        if (i !== dragIndex) {
          if (currentAnchors[i] < anchors[dragIndex] && currentAnchors[i] > minTime) {
            minTime = currentAnchors[i] + 0.1; // 左边最近的锚定点
          }
          if (currentAnchors[i] > anchors[dragIndex] && currentAnchors[i] < maxTime) {
            maxTime = currentAnchors[i] - 0.1; // 右边最近的锚定点
          }
        }
      }

      const clampedTime = Math.max(minTime, Math.min(maxTime, newTime));

      // 更新锚定点位置
      setAnchors(prev => {
        const newAnchors = [...prev];
        newAnchors[dragIndex] = clampedTime;
        return newAnchors;
      });
    };

    const handleMouseUp = () => {
      console.log('拖拽结束');
      setIsDragging(false);
      setDragIndex(-1);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragIndex, duration, anchors]);

  // 从外部segments同步锚定点位置
  const syncAnchorsFromSegments = (segments: { start: number; end: number }[]) => {
    if (!segments || segments.length === 0 || !duration) return;

    const newAnchors: number[] = [0]; // 开始点
    segments.forEach((segment, index) => {
      if (index > 0) {
        newAnchors.push(segment.start); // 添加除第一个segment外所有的start点作为锚定点
      }
    });
    // 添加结束点
    newAnchors.push(duration);

    // 只在锚定点真正发生变化时才更新，避免循环
    const anchorsChanged = newAnchors.length !== anchors.length ||
      newAnchors.some((anchor, index) => Math.abs(anchor - anchors[index]) > 0.01);

    if (anchorsChanged) {
      setAnchors(newAnchors);
    }
  };

  // 监听外部segments变化，同步锚定点位置
  useEffect(() => {
    if (externalSegments && externalSegments.length > 0 && !isDragging) {
      syncAnchorsFromSegments(externalSegments);
    }
  }, [externalSegments, isDragging]);

  // 监听锚定点变化，更新区间
  useEffect(() => {
    if (duration > 0) {
      const segments = generateSegments(anchors, duration);
      onRegionChange?.(segments);
    }
  }, [anchors, duration]); // 不包含onRegionChange，避免无限循环

  useEffect(() => {
    if (!containerRef.current || !audioFile) return;

    const initWaveSurfer = async () => {
      try {
        console.log('Starting WaveSurfer initialization...');
        setIsLoading(true);
        setError(null);

        // 清理之前的实例
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
        }

        // 动态导入 WaveSurfer 和插件
        const WaveSurfer = (await import('wavesurfer.js')).default;
        const RegionsPlugin = (await import('wavesurfer.js/dist/plugins/regions.js')).default;

        console.log('WaveSurfer modules loaded successfully');

        // 创建 regions 插件
        const regions = RegionsPlugin.create();
        regionsRef.current = regions;

        // 创建 WaveSurfer 实例
        const wavesurfer = WaveSurfer.create({
          container: containerRef.current!,
          waveColor: '#3b82f6', // blue-500
          progressColor: '#1d4ed8', // blue-700
          cursorColor: '#1e40af', // blue-800
          barWidth: 2,
          barRadius: 1,
          responsive: true,
          height: 120,
          normalize: true,
          plugins: [regions],
        });

        wavesurferRef.current = wavesurfer;

        console.log('WaveSurfer instance created, setting up event listeners...');

        // 先注册所有事件监听器，再加载音频
        wavesurfer.on('ready', () => {
          console.log('WaveSurfer ready');
          const audioDuration = wavesurfer.getDuration();
          setDuration(audioDuration);
          setIsLoading(false);
          onLoadComplete?.(audioDuration);

          // 初始化锚定点（开头和结尾）
          setAnchors([0, audioDuration]);

          console.log('Audio ready, anchors initialized');
        });

        wavesurfer.on('error', (err: any) => {
          console.error('WaveSurfer error:', err);
          setError('Failed to load audio file');
          setIsLoading(false);
        });

        console.log('Event listeners registered, loading audio...');

        // 加载音频文件并等待完成
        await wavesurfer.loadBlob(audioFile);

        console.log('Audio loaded successfully, checking if ready event was triggered...');

        // 检查是否已经ready，如果是则手动触发ready处理
        setTimeout(() => {
          if (wavesurfer && wavesurfer.getDuration && wavesurfer.getDuration() > 0) {
            console.log('Audio appears ready, checking loading state...');
            if (isLoading) {
              console.log('Force triggering ready state due to missing event');
              const audioDuration = wavesurfer.getDuration();
              setDuration(audioDuration);
              setIsLoading(false);
              onLoadComplete?.(audioDuration);

              // 初始化锚定点
              setAnchors([0, audioDuration]);
              console.log('Manual fallback: Anchors initialized');
            }
          }
        }, 100); // 短暂延迟确保状态已同步

        wavesurfer.on('timeupdate', (time: number) => {
          setCurrentTime(time);
        });

        wavesurfer.on('play', () => setIsPlaying(true));
        wavesurfer.on('pause', () => setIsPlaying(false));

      } catch (error) {
        console.error('WaveSurfer initialization failed:', error);
        setError('Failed to initialize audio editor. Please try refreshing the page.');
        setIsLoading(false);
      }
    };

    initWaveSurfer();

    // 清理函数
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [audioFile]); // 只依赖audioFile，避免函数引用导致的无限循环

  // 播放/暂停控制
  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      if (isPlaying) {
        wavesurferRef.current.pause();
      } else {
        wavesurferRef.current.play();
      }
    }
  };

  // 跳转到指定时间
  const seekTo = (time: number) => {
    if (wavesurferRef.current) {
      const seekTime = Math.max(0, Math.min(time, duration));
      wavesurferRef.current.seekTo(seekTime / duration);
    }
  };

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 暴露控制方法给父组件
  useEffect(() => {
    if (wavesurferRef.current) {
      (window as any).audioWaveformControls = {
        play: () => wavesurferRef.current?.play(),
        pause: () => wavesurferRef.current?.pause(),
        seekTo,
        getDuration: () => duration,
        getCurrentTime: () => currentTime,
        isPlaying: () => isPlaying,
      };
    }
  }, [duration, currentTime, isPlaying]);

  return (
    <div className="w-full bg-primary rounded-lg border border-neutral-dark/20 p-4">
      {/* 波形显示区域 */}
      <div className="mb-4">
        {isLoading && !error && (
          <div className="flex items-center justify-center h-32 bg-neutral-light/50 rounded border-2 border-dashed border-neutral-dark/20">
            <div className="text-center">
              <div className="animate-spin text-2xl mb-2">⚙️</div>
              <p className="text-sm text-neutral-dark/80">{t.loadingWaveform}</p>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-32 bg-error-light/50 rounded border-2 border-dashed border-error-dark/20">
            <div className="text-center">
              <div className="text-2xl mb-2">⚠️</div>
              <p className="text-sm text-error-dark">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-3 py-1 text-xs bg-error-dark text-primary rounded hover:bg-error transition-colors"
              >
                {t.refreshPage}
              </button>
            </div>
          </div>
        )}
        <div className={isLoading || error ? 'hidden' : 'relative'}>
          <div ref={containerRef} />

          {/* 锚定点覆盖层 */}
          {!isLoading && !error && containerRef.current && (
            <div className="relative -mt-32 h-32 pointer-events-none">
              {anchors.map((anchor, index) => {
                const percentage = duration > 0 ? (anchor / duration) * 100 : 0;
                return (
                  <div
                    key={`anchor-${index}-${anchor}`}
                    className="absolute top-0 h-full pointer-events-auto group"
                    style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}
                  >
                    {/* 锚定点线条 */}
                    <div
                      className={`w-0.5 h-full bg-red-500 relative cursor-move ${isDragging && dragIndex === index ? 'bg-red-700' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, index)}
                      title={t.dragAnchor}
                    >
                      {/* 三角形标记 */}
                      <div
                        className="absolute -top-2 left-1/2 transform -translate-x-1/2 cursor-move"
                        onMouseDown={(e) => handleMouseDown(e, index)}
                      >
                        <div className={`w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent ${isDragging && dragIndex === index ? 'border-b-red-700' : 'border-b-red-500'}`}></div>
                      </div>

                      {/* 删除按钮 */}
                      {anchors.length > 2 && ( // 至少保留开头和结尾两个锚定点
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAnchor(index);
                          }}
                          className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                          title={t.deleteAnchor}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 选中区域高亮覆盖层 */}
          {!isLoading && !error && containerRef.current && selectedSegmentIndex !== null && externalSegments && (
            <div className="relative -mt-32 h-32 pointer-events-none">
              {(() => {
                const selectedSegment = externalSegments[selectedSegmentIndex];
                if (!selectedSegment || duration <= 0) return null;

                const startPercentage = (selectedSegment.start / duration) * 100;
                const endPercentage = (selectedSegment.end / duration) * 100;
                const width = endPercentage - startPercentage;

                return (
                  <div
                    className="absolute top-0 h-full bg-green-200 opacity-30"
                    style={{
                      left: `${startPercentage}%`,
                      width: `${width}%`
                    }}
                  />
                );
              })()}
            </div>
          )}

          {/* 添加锚定点按钮 */}
          {!isLoading && !error && (
            <div className="mt-2 flex justify-center">
              <button
                onClick={() => {
                  // 在当前播放位置添加锚定点，如果没有播放则在中间位置添加
                  const newAnchorTime = currentTime > 0 ? currentTime : duration / 2;
                  addAnchor(newAnchorTime);
                }}
                className="px-3 py-1 bg-red-500 text-white rounded-full text-sm hover:bg-red-600 transition-colors flex items-center gap-1"
              >
                <span>+</span>
                <span>{t.addAnchor}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 播放控制 */}
      {!isLoading && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlayPause}
              className="flex items-center justify-center w-10 h-10 rounded-full text-white hover:opacity-80 transition-opacity"
              style={{ backgroundColor: 'rgb(0, 166, 237)' }}
              title={isPlaying ? (locale === 'zh' ? '暂停' : locale === 'ja' ? '一時停止' : 'Pause') : (locale === 'zh' ? '播放' : locale === 'ja' ? '再生' : 'Play')}
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>

            <div className="text-sm text-neutral-dark">
              <span className="font-mono">{formatTime(currentTime)}</span>
              <span className="mx-2">/</span>
              <span className="font-mono text-neutral-dark/70">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="text-xs text-neutral-dark/60">
            {locale === 'zh' ? '拖拽高亮区域来选择音频范围' : locale === 'ja' ? 'ハイライト表示された領域をドラッグしてオーディオ範囲を選択' : 'Drag the highlighted region to select audio range'}
          </div>
        </div>
      )}
    </div>
  );
}