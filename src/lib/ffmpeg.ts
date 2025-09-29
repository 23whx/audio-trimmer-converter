// 动态导入，避免 SSR 阶段解析浏览器专用包

let ffmpegInstance: FFmpeg | null = null;

export async function initFFmpeg(): Promise<FFmpeg | null> {
  console.log('🎬 [FFmpeg] 开始初始化FFmpeg...');

  if (ffmpegInstance) {
    console.log('🎬 [FFmpeg] 使用已存在的FFmpeg实例');
    return ffmpegInstance;
  }

  try {
    console.log('🎬 [FFmpeg] 创建FFmpeg实例...');
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');
    ffmpegInstance = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    console.log('🎬 [FFmpeg] 使用CDN URL:', baseURL);

    console.log('🎬 [FFmpeg] 开始加载FFmpeg核心文件...');
    await ffmpegInstance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    console.log('🎬 [FFmpeg] FFmpeg核心文件加载完成');

    console.log('🎬 [FFmpeg] FFmpeg初始化成功');
    return ffmpegInstance;
  } catch (error) {
    console.error('❌ [FFmpeg] FFmpeg初始化失败', error);
    console.error('❌ [FFmpeg] 错误详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return null;
  }
}

export async function extractAudioFromVideo(videoFile: File): Promise<File> {
  console.log('🎬 [Extract] 开始视频音频提取流程...');
  console.log('🎬 [Extract] 输入视频信息:', {
    name: videoFile.name,
    type: videoFile.type,
    size: `${(videoFile.size / 1024 / 1024).toFixed(2)} MB`
  });

  try {
    console.log('🎬 [Extract] 调用FFmpeg初始化...');
    const ffmpeg = await initFFmpeg();
    if (!ffmpeg) {
      throw new Error('FFmpeg initialization failed');
    }
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
    await ffmpeg.writeFile(inputFileName, videoData);
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
}