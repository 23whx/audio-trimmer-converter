import { useEffect, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

interface AudioUploaderProps {
  onFileReady: (file: File, isExtracted?: boolean) => void;
  onError: (message: string) => void;
  locale: string;
  translations: any;
}

export default function AudioUploader({ onFileReady, onError, locale, translations }: AudioUploaderProps) {
  const ffmpegRef = useRef<FFmpeg>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);

  const initFFmpeg = async (): Promise<FFmpeg> => {
    console.log('🎬 [FFmpeg] 开始初始化FFmpeg实例...');

    if (ffmpegRef.current) {
      console.log('🎬 [FFmpeg] 复用现有FFmpeg实例');
      return ffmpegRef.current;
    }

    if (ffmpegLoading) {
      console.log('🎬 [FFmpeg] 等待正在进行的初始化...');
      while (ffmpegLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return ffmpegRef.current!;
    }

    setFfmpegLoading(true);

    try {
      console.log('🔄 [FFmpeg] 加载模块...');

      const ffmpeg = new FFmpeg();

      // 设置日志回调
      ffmpeg.on('log', ({ message }) => {
        console.log('📋 [FFmpeg-Log]', message);
      });

      // 设置进度回调
      ffmpeg.on('progress', ({ progress, time }) => {
        console.log('⏳ [FFmpeg-Progress]', `${(progress * 100).toFixed(1)}% | ${time}ms`);
      });

      console.log('🌐 [FFmpeg] 加载同源核心文件...');

      // 使用 toBlobURL 创建所有资源的 blob URL，避免路径解析问题
      const baseURL = '/ffmpeg';
      console.log('📦 [FFmpeg] 创建 Blob URLs...');

      const workerURL = await toBlobURL(`${baseURL}/worker.js`, 'text/javascript');
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

      const loadConfig = {
        workerURL,
        coreURL,
        wasmURL,
      };

      console.log('🔧 [FFmpeg] Blob URLs 配置:', {
        workerURL: workerURL.substring(0, 50) + '...',
        coreURL: coreURL.substring(0, 50) + '...',
        wasmURL: wasmURL.substring(0, 50) + '...'
      });

      await ffmpeg.load(loadConfig);

      ffmpegRef.current = ffmpeg;
      console.log('✅ [FFmpeg] 初始化完成!');

      return ffmpeg;
    } catch (error) {
      console.error('❌ [FFmpeg] 初始化失败:', error);
      throw error;
    } finally {
      setFfmpegLoading(false);
    }
  };

  const isVideoFile = (file: File): boolean => {
    return file.type.startsWith('video/');
  };

  const isAudioFile = (file: File): boolean => {
    return file.type.startsWith('audio/');
  };

  const extractAudioFromVideo = async (videoFile: File): Promise<File> => {
    console.log('🎬 [Extract] 开始视频音频提取流程...');
    console.log('🎬 [Extract] 输入视频信息:', {
      name: videoFile.name,
      type: videoFile.type,
      size: `${(videoFile.size / 1024 / 1024).toFixed(2)} MB`
    });

    try {
      console.log('🎬 [Extract] 初始化FFmpeg...');
      const ffmpeg = await initFFmpeg();
      console.log('🎬 [Extract] FFmpeg初始化成功');

      const inputFileName = 'input.' + videoFile.name.split('.').pop();
      const outputFileName = 'output.mp3';
      console.log('🎬 [Extract] 文件名设置:', { inputFileName, outputFileName });

      // 写入视频文件
      console.log('🎬 [Extract] 开始读取视频文件数据...');
      const startTime = performance.now();
      const videoData = new Uint8Array(await videoFile.arrayBuffer());
      const readTime = performance.now() - startTime;
      console.log('🎬 [Extract] 视频文件读取完成:', {
        dataSize: `${(videoData.length / 1024 / 1024).toFixed(2)} MB`,
        readTime: `${readTime.toFixed(2)}ms`
      });

      console.log('🎬 [Extract] 写入视频数据到FFmpeg...');
      await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));
      console.log('🎬 [Extract] 视频数据写入完成');

      // 执行音频提取
      const ffmpegCommand = ['-i', inputFileName, '-q:a', '2', '-map', 'a', outputFileName];
      console.log('🎬 [Extract] 开始执行FFmpeg命令:', ffmpegCommand.join(' '));
      const extractStartTime = performance.now();

      await ffmpeg.exec(ffmpegCommand);

      const extractTime = performance.now() - extractStartTime;
      console.log('🎬 [Extract] FFmpeg音频提取完成:', {
        extractTime: `${extractTime.toFixed(2)}ms`
      });

      // 读取输出音频文件
      console.log('🎬 [Extract] 开始读取提取的音频文件...');
      const audioData = await ffmpeg.readFile(outputFileName);
      console.log('🎬 [Extract] 音频文件读取完成:', {
        audioDataSize: `${(audioData.length / 1024 / 1024).toFixed(2)} MB`,
        compressionRatio: `${((1 - audioData.length / videoData.length) * 100).toFixed(1)}%`
      });

      // 创建音频Blob
      console.log('🎬 [Extract] 创建音频Blob对象...');
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      console.log('🎬 [Extract] Blob创建成功:', {
        blobSize: `${(audioBlob.size / 1024 / 1024).toFixed(2)} MB`,
        blobType: audioBlob.type
      });

      // 创建File对象
      const outputName = videoFile.name.replace(/\.[^/.]+$/, ".mp3");
      console.log('🎬 [Extract] 创建File对象，输出文件名:', outputName);
      const extractedAudioFile = new File([audioBlob], outputName, { type: 'audio/mpeg' });

      console.log('🎬 [Extract] File对象创建成功:', {
        name: extractedAudioFile.name,
        type: extractedAudioFile.type,
        size: `${(extractedAudioFile.size / 1024 / 1024).toFixed(2)} MB`,
        lastModified: new Date(extractedAudioFile.lastModified).toISOString()
      });

      // 清理FFmpeg文件
      console.log('🎬 [Extract] 开始清理临时文件...');
      try {
        await ffmpeg.deleteFile(inputFileName);
        await ffmpeg.deleteFile(outputFileName);
        console.log('🎬 [Extract] 临时文件清理完成');
      } catch (e) {
        console.warn('⚠️ [Extract] 清理临时文件失败:', e);
      }

      const totalTime = performance.now() - startTime;
      console.log('🎬 [Extract] 音频提取流程完成!', {
        totalTime: `${totalTime.toFixed(2)}ms`,
        originalSize: `${(videoFile.size / 1024 / 1024).toFixed(2)} MB`,
        extractedSize: `${(extractedAudioFile.size / 1024 / 1024).toFixed(2)} MB`
      });

      return extractedAudioFile;
    } catch (error) {
      console.error('❌ [Extract] 音频提取失败:', error);
      console.error('❌ [Extract] 错误详情:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        videoFileName: videoFile.name,
        videoFileSize: videoFile.size
      });
      throw error;
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📁 [Upload] 开始处理文件选择...');

    if (isProcessing) {
      console.log('⏸️ [Upload] 文件正在处理中，跳过本次选择');
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      console.log('⚠️ [Upload] 没有选择文件');
      return;
    }

    console.log('📁 [Upload] 文件信息:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      sizeBytes: file.size,
      lastModified: new Date(file.lastModified).toISOString()
    });

    // 检查文件类型
    const isAudio = isAudioFile(file);
    const isVideo = isVideoFile(file);
    console.log('📁 [Upload] 文件类型检查:', { isAudio, isVideo });

    if (!isAudio && !isVideo) {
      console.error('❌ [Upload] 不支持的文件类型:', file.type);
      onError('Please select an audio or video file.');
      return;
    }

    // 检查原始文件大小（30MB限制）
    const maxSizeBytes = 30 * 1024 * 1024; // 30MB
    if (file.size > maxSizeBytes) {
      console.error('❌ [Upload] 文件超过大小限制:', {
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        maxSize: '30 MB'
      });
      onError(`File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds the 30MB limit.`);
      return;
    }

    console.log('✅ [Upload] 文件验证通过，开始处理...');
    setIsProcessing(true);
    let finalFile = file;
    let isExtracted = false;

    try {
      // 如果是视频文件，提取音频
      if (isVideo) {
        console.log('🎬 [Video] 检测到视频文件，开始音频提取流程...');
        finalFile = await extractAudioFromVideo(file);
        isExtracted = true;
        console.log('🎬 [Video] 音频提取完成，新文件信息:', {
          name: finalFile.name,
          type: finalFile.type,
          size: `${(finalFile.size / 1024 / 1024).toFixed(2)} MB`,
          sizeBytes: finalFile.size
        });

        // 检查提取后的音频大小
        if (finalFile.size > maxSizeBytes) {
          console.error('❌ [Video] 提取的音频文件超过大小限制:', {
            audioSize: `${(finalFile.size / 1024 / 1024).toFixed(2)} MB`,
            maxSize: '30 MB'
          });
          onError(`Extracted audio size (${(finalFile.size / 1024 / 1024).toFixed(2)} MB) exceeds the 30MB limit.`);
          return;
        }
      } else {
        console.log('🎵 [Audio] 检测到音频文件，直接使用');
      }

      // 通知父组件文件已准备好
      console.log('✅ [Upload] 文件处理完成，通知父组件');
      onFileReady(finalFile, isExtracted);

    } catch (error) {
      console.error('❌ [Upload] 文件处理失败:', error);
      console.error('❌ [Upload] 错误详情:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      onError('Failed to process the file. Please try again.');
    } finally {
      console.log('🏁 [Upload] 文件处理流程结束');
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const event = {
        target: { files: [files[0]] }
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(event);
    }
  };

  return (
    <section
      className="rounded-xl border-2 border-dashed border-neutral-dark/20 bg-primary p-8 text-center"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        <h2 className="text-2xl font-semibold text-success-dark">
          {translations.uploadHeading}
        </h2>
        <p className="text-sm text-neutral-dark/80">
          {translations.description}
        </p>
        <button
          type="button"
          onClick={() => document.getElementById('fileInput')?.click()}
          className="rounded-full bg-success-dark px-6 py-3 text-sm font-semibold text-primary shadow hover:bg-success transition-colors"
          disabled={isProcessing}
        >
          {isProcessing ? (translations.processing || 'Processing...') : translations.uploadButton}
        </button>
        <input
          id="fileInput"
          type="file"
          accept="audio/*,video/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>
    </section>
  );
}