// 注意：避免在 SSR 阶段顶层导入浏览器专用依赖。
// 改为在运行时（客户端）动态导入 @ffmpeg/ffmpeg 与 @ffmpeg/util。

let ffmpegInstance: FFmpeg | null = null;
let loadingPromise: Promise<FFmpeg> | null = null;

export interface LoadFfmpegOptions {
  /**
   * Optional logger to surface ffmpeg output.
   */
  logger?: (message: string) => void;
  /**
   * Called while ffmpeg wasm bundle downloads.
   */
  onProgress?: (ratio: number) => void;
}

/**
 * Lazily load a shared ffmpeg.wasm instance. We keep it singleton-scoped so
 * subsequent operations reuse initialized memory and worker context.
 */
export async function getFfmpeg(options: LoadFfmpegOptions = {}): Promise<FFmpeg> {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  if (!loadingPromise) {
    const { logger, onProgress } = options;
    // 动态导入，防止 SSR 解析浏览器专用包
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import('@ffmpeg/ffmpeg'),
      import('@ffmpeg/util'),
    ]);
    const ffmpeg = new FFmpeg();

    // 设置日志回调
    if (logger) {
      ffmpeg.on('log', ({ message }) => logger(message));
    }

    // 设置进度回调
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => onProgress(progress));
    }

    loadingPromise = (async () => {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })().catch((error) => {
      loadingPromise = null;
      throw error;
    });
  }

  return loadingPromise;
}

export function resetFfmpeg(): void {
  ffmpegInstance = null;
  loadingPromise = null;
}
